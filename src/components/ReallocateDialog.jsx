import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  ArrowRightLeft,
  Users,
  Building2,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { isDepartmentMatch, getDepartmentName } from '@/lib/departments';

const REALLOCATION_REASONS = [
  { value: 'Workload Rebalancing', label: 'Workload Rebalancing / Capacity distribution' },
  { value: 'Supervisor Sabbatical / Leave', label: 'Supervisor Unavailability / Sabbatical / Academic Leave' },
  { value: 'Domain Specialization', label: 'Research Topic / Domain Specialization Alignment' },
  { value: 'Mutual Request', label: 'Student & Supervisor Mutual Agreement / Request' },
  { value: 'Department Reorganization', label: 'Department / Faculty Administrative Restructuring' },
  { value: 'Other', label: 'Other / Specific Administrative Reason' },
];

export default function ReallocateDialog({
  open,
  onOpenChange,
  project,
  supervisors = [],
  allProjects = [],
  departments = [],
  onSuccess,
}) {
  const [newSupervisorId, setNewSupervisorId] = useState('');
  const [reasonCategory, setReasonCategory] = useState('Workload Rebalancing');
  const [customReason, setCustomReason] = useState('');
  const [showAllDepts, setShowAllDepts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog opens with a new project
  useEffect(() => {
    if (open) {
      setNewSupervisorId('');
      setReasonCategory('Workload Rebalancing');
      setCustomReason('');
      setShowAllDepts(false);
    }
  }, [open, project?.id]);

  const studentDept = project?.department_id || project?.department || 'General';

  const deptDisplayName = (idOrName) => {
    if (!idOrName) return 'General';
    const found = departments.find(d => d.id === idOrName || d.name === idOrName);
    if (found) return found.name;
    return getDepartmentName(idOrName);
  };

  // Compute active workload count for each supervisor
  const workloadMap = useMemo(() => {
    const counts = new Map();
    for (const p of allProjects) {
      if (p.supervisor_id && p.status !== 'completed' && p.status !== 'cancelled') {
        counts.set(p.supervisor_id, (counts.get(p.supervisor_id) || 0) + 1);
      }
    }
    return counts;
  }, [allProjects]);

  // Supervisors available for reallocation (excluding currently assigned supervisor)
  const candidateSupervisors = useMemo(() => {
    if (!project) return [];
    return supervisors.filter(s => s.id !== project.supervisor_id);
  }, [supervisors, project?.supervisor_id]);

  // Supervisors matching student department
  const departmentMatchedSupervisors = useMemo(() => {
    if (!studentDept) return candidateSupervisors;
    return candidateSupervisors.filter(s => {
      const supDept = s.department || s.department_id || '';
      return isDepartmentMatch(supDept, studentDept);
    });
  }, [candidateSupervisors, studentDept]);

  // Supervisors to display in dropdown
  const displayedSupervisors = useMemo(() => {
    if (showAllDepts || departmentMatchedSupervisors.length === 0) {
      return candidateSupervisors;
    }
    return departmentMatchedSupervisors;
  }, [showAllDepts, departmentMatchedSupervisors, candidateSupervisors]);

  const selectedSupervisor = candidateSupervisors.find(s => s.id === newSupervisorId) || null;

  const handleReallocate = async () => {
    if (!newSupervisorId) {
      return toast({
        title: 'Select a new supervisor',
        description: 'Please choose the faculty member who will take over supervision.',
        variant: 'destructive',
      });
    }

    if (!selectedSupervisor) {
      return toast({
        title: 'Invalid supervisor selected',
        variant: 'destructive',
      });
    }

    setSubmitting(true);
    try {
      const effectiveReason = reasonCategory === 'Other' && customReason.trim()
        ? customReason.trim()
        : reasonCategory;

      const previousSupervisorName = project.supervisor_name || 'Unassigned';
      const previousSupervisorId = project.supervisor_id || null;

      // 1. Update Project entity with new supervisor & audit trail
      await base44.entities.Project.update(project.id, {
        supervisor_id: selectedSupervisor.id,
        supervisor_name: selectedSupervisor.full_name,
        supervisor_email: selectedSupervisor.email || '',
        previous_supervisor_id: previousSupervisorId,
        previous_supervisor_name: previousSupervisorName,
        reallocated_date: new Date().toISOString(),
        reallocation_reason: effectiveReason,
      });

      // 2. Update matching Topic entity if present
      try {
        const allTopics = await base44.entities.Topic.list('-created_date', 200).catch(() => []);
        const matchingTopic = allTopics.find(t =>
          t.project_id === project.id ||
          (t.student_id === project.student_id && t.title?.trim().toLowerCase() === project.title?.trim().toLowerCase())
        );

        if (matchingTopic) {
          await base44.entities.Topic.update(matchingTopic.id, {
            supervisor_id: selectedSupervisor.id,
            supervisor_name: selectedSupervisor.full_name,
            supervisor_email: selectedSupervisor.email || '',
          });
        }
      } catch (topicErr) {
        console.warn('Matching topic update note:', topicErr);
      }

      // 3. Automated notifications
      const studentDisplayName = project.student_name || 'Student';
      const projectTitle = project.title || 'Project';

      // Notify new supervisor
      try {
        await base44.entities.Notification.create({
          user_id: selectedSupervisor.id,
          title: 'Student Reallocated to You',
          message: `${studentDisplayName} has been reallocated to you as supervisee for "${projectTitle}" (Reason: ${effectiveReason}).`,
          type: 'announcement',
        });
      } catch { /* ignore */ }

      // Notify previous supervisor (if distinct)
      if (previousSupervisorId && previousSupervisorId !== selectedSupervisor.id) {
        try {
          await base44.entities.Notification.create({
            user_id: previousSupervisorId,
            title: 'Student Reassigned to Another Supervisor',
            message: `${studentDisplayName}'s project "${projectTitle}" has been reallocated to ${selectedSupervisor.full_name} by the administrator.`,
            type: 'announcement',
          });
        } catch { /* ignore */ }
      }

      // Notify student
      if (project.student_id) {
        try {
          await base44.entities.Notification.create({
            user_id: project.student_id,
            title: 'Project Supervisor Updated',
            message: `Your project supervisor for "${projectTitle}" has been reassigned to ${selectedSupervisor.full_name}.`,
            type: 'announcement',
          });
        } catch { /* ignore */ }
      }

      // 4. Dispatch global event to sync all open tabs/dashboards
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new Event('smartsupervise_allocations_updated'));
          window.dispatchEvent(new Event('smartsupervise_users_updated'));
        } catch { /* ignore */ }
      }

      toast({
        title: 'Student Reallocated Successfully',
        description: `${studentDisplayName} has been reassigned to ${selectedSupervisor.full_name}.`,
      });

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Reallocation error:', err);
      toast({
        title: 'Reallocation Failed',
        description: err?.message || 'An unexpected error occurred during reallocation.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!project) return null;

  const currentSupervisorWorkload = workloadMap.get(project.supervisor_id) || 1;
  const newSupervisorWorkload = selectedSupervisor ? (workloadMap.get(selectedSupervisor.id) || 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1 text-primary">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-primary" />
            </div>
            <DialogTitle className="text-xl font-heading font-bold">
              Reallocate Student Supervisor
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Reassign this student’s academic project to a different faculty supervisor. Both supervisors and the student will be notified automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Current Assignment Overview Card */}
          <div className="rounded-xl border border-border/80 bg-secondary/40 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                  Project Title
                </span>
                <h4 className="font-semibold text-foreground text-sm line-clamp-2 mt-0.5">
                  {project.title}
                </h4>
              </div>
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                {project.status || 'Active'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> Student
                </span>
                <p className="font-semibold text-foreground truncate">
                  {project.student_name || 'Student'}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {project.registration_number || project.student_email || 'No Matric'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Department
                </span>
                <p className="font-semibold text-foreground truncate">
                  {deptDisplayName(studentDept)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Session: {project.session || '2025/2026'}
                </p>
              </div>
            </div>

            {/* Current vs New Supervisor Transition Bar */}
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center justify-between text-xs bg-background/80 rounded-lg p-2.5 border border-border/60">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Current Supervisor</span>
                  <p className="font-semibold text-foreground truncate">
                    {project.supervisor_name || 'Unassigned'}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    ({currentSupervisorWorkload} active student{currentSupervisorWorkload === 1 ? '' : 's'})
                  </span>
                </div>

                <div className="px-3 flex items-center justify-center text-primary">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>

                <div className="min-w-0 text-right">
                  <span className="text-[10px] uppercase font-bold text-primary">Target Supervisor</span>
                  <p className="font-semibold text-foreground truncate">
                    {selectedSupervisor ? selectedSupervisor.full_name : 'Select below...'}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedSupervisor ? `(${newSupervisorWorkload + 1} students after)` : 'Pending selection'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* New Supervisor Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="new-supervisor" className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                Select New Supervisor <span className="text-rose-500">*</span>
              </Label>
              {departmentMatchedSupervisors.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllDepts(!showAllDepts)}
                  className="text-[11px] text-primary hover:underline cursor-pointer font-medium"
                >
                  {showAllDepts ? `Filter to ${deptDisplayName(studentDept)} only` : 'Show all departments'}
                </button>
              )}
            </div>

            {candidateSupervisors.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">No other supervisors found</p>
                  <p className="mt-0.5">
                    There are no other registered faculty members to reallocate to. Please register additional supervisors in the system first.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <select
                  id="new-supervisor"
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newSupervisorId}
                  onChange={(e) => setNewSupervisorId(e.target.value)}
                >
                  <option value="">Choose a replacement supervisor...</option>
                  {displayedSupervisors.map((s) => {
                    const count = workloadMap.get(s.id) || 0;
                    const dept = deptDisplayName(s.department || s.department_id);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.full_name} — {dept} ({s.level || 'Faculty'}) • Currently {count} student{count === 1 ? '' : 's'}
                      </option>
                    );
                  })}
                </select>
                {displayedSupervisors.length < candidateSupervisors.length && (
                  <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3 text-primary" />
                    Showing {displayedSupervisors.length} faculty matching {deptDisplayName(studentDept)}.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reallocation Reason */}
          <div className="space-y-2">
            <Label htmlFor="reallocation-reason" className="text-xs font-semibold">
              Reason for Reallocation <span className="text-muted-foreground font-normal">(Recorded in system audit log)</span>
            </Label>
            <select
              id="reallocation-reason"
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
            >
              {REALLOCATION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {reasonCategory === 'Other' && (
              <input
                type="text"
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 mt-2"
                placeholder="Enter specific administrative reason or notes..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            )}
          </div>

          {/* Notification Advisory Banner */}
          <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-3 text-xs text-blue-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-950">Automated Notification Dispatch</p>
              <p className="text-blue-800/90 mt-0.5">
                Upon confirmation, the system will immediately update the project assignment and send in-app notifications to the student, the previous supervisor, and the newly allocated supervisor.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleReallocate}
            disabled={!newSupervisorId || submitting}
            className="gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" />
            {submitting ? 'Reallocating...' : 'Confirm Reallocation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
