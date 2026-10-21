import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Loading, StatusBadge } from '@/components/Shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { GitBranch, Plus, Link2, Building2, ArrowRightLeft, Search, Users, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getRegisteredStudents, getRegisteredSupervisors } from '@/lib/user-registry';
import { getDepartmentName, isDepartmentMatch, UNIVERSITY_DEPARTMENTS } from '@/lib/departments';
import ReallocateDialog from '@/components/ReallocateDialog';

export default function Allocation() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [students, setStudents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [reallocatingProject, setReallocatingProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ topic_id: '', supervisor_id: '', session: '' });

  const load = async () => {
    setLoading(true);
    try {
      const localStudents = getRegisteredStudents() || [];
      const localSupervisors = getRegisteredSupervisors() || [];

      const [projs, allTopics, b44Users, depts] = await Promise.all([
        base44.entities.Project.list('-created_date', 200).catch(() => []),
        base44.entities.Topic.list('-created_date', 200).catch(() => []),
        base44.entities.User.list('-created_date', 500).catch(() => []),
        base44.entities.Department.list('-created_date', 200).catch(() => []),
      ]);

      // Unify students
      const studentMap = new Map();
      const addStudent = (s) => {
        if (!s) return;
        const key = (s.id || s.email || '').toLowerCase().trim();
        if (key && !studentMap.has(key)) {
          studentMap.set(key, {
            ...s,
            full_name: s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email || 'Student',
            department: s.department || s.department_id || 'Computer Science',
            department_id: s.department_id || s.department || 'Computer Science',
          });
        }
      };
      localStudents.forEach(addStudent);
      (b44Users || []).filter(u => u.role === 'student' || u.portal === 'student').forEach(addStudent);

      // Unify supervisors
      const supervisorMap = new Map();
      const addSupervisor = (sup) => {
        if (!sup) return;
        const key = (sup.id || sup.email || '').toLowerCase().trim();
        if (key && !supervisorMap.has(key)) {
          supervisorMap.set(key, {
            ...sup,
            full_name: sup.full_name || `${sup.first_name || ''} ${sup.last_name || ''}`.trim() || sup.email || 'Supervisor',
            department: sup.department || sup.department_id || 'Computer Science',
            department_id: sup.department_id || sup.department || 'Computer Science',
            level: sup.level || 'Faculty Member',
          });
        }
      };
      localSupervisors.forEach(addSupervisor);
      (b44Users || []).filter(u => u.role === 'supervisor' || u.portal === 'supervisor').forEach(addSupervisor);

      setProjects(projs || []);
      setTopics(allTopics || []);
      setStudents(Array.from(studentMap.values()));
      setSupervisors(Array.from(supervisorMap.values()));
      setDepartments(depts && depts.length ? depts : UNIVERSITY_DEPARTMENTS);
    } catch (e) {
      console.error('Failed to load allocation data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('smartsupervise_users_updated', handleUpdate);
    window.addEventListener('smartsupervise_allocations_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('smartsupervise_users_updated', handleUpdate);
      window.removeEventListener('smartsupervise_allocations_updated', handleUpdate);
    };
  }, [user?.id]);

  const nameOf = (list, id) => list.find(x => x.id === id)?.full_name || '-';

  const deptName = (idOrName) => {
    if (!idOrName) return 'General';
    const found = departments.find(d => d.id === idOrName);
    if (found) return found.name;
    return getDepartmentName(idOrName);
  };

  // Approved topics that haven't been allocated to a project yet.
  const availableTopics = useMemo(
    () => topics.filter(t => t.status === 'approved' && !t.project_id),
    [topics]
  );

  const selectedTopic = topics.find(t => t.id === form.topic_id) || null;
  const selectedStudent = selectedTopic
    ? (students.find(s => s.id === selectedTopic.student_id || s.email === selectedTopic.student_email) || {
        id: selectedTopic.student_id,
        full_name: selectedTopic.student_name || 'Student',
        email: selectedTopic.student_email || '',
        department: selectedTopic.department || 'Computer Science',
        department_id: selectedTopic.department_id || 'Computer Science',
      })
    : null;

  const studentDept = selectedStudent?.department || selectedStudent?.department_id || selectedTopic?.department || selectedTopic?.department_id || 'Computer Science';

  // Supervisors matching student department; falls back to all supervisors to avoid deadlocks
  const matchedSupervisors = useMemo(() => {
    if (supervisors.length === 0) return [];
    if (!studentDept) return supervisors;

    const filtered = supervisors.filter(s => {
      const supDept = s.department || s.department_id || '';
      return isDepartmentMatch(supDept, studentDept);
    });

    return filtered.length > 0 ? filtered : supervisors;
  }, [supervisors, studentDept]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase().trim();
    return projects.filter(p => {
      const title = (p.title || '').toLowerCase();
      const student = (p.student_name || nameOf(students, p.student_id)).toLowerCase();
      const matric = (p.registration_number || '').toLowerCase();
      const supervisor = (p.supervisor_name || nameOf(supervisors, p.supervisor_id)).toLowerCase();
      const dept = deptName(p.department || p.department_id).toLowerCase();
      return title.includes(q) || student.includes(q) || matric.includes(q) || supervisor.includes(q) || dept.includes(q);
    });
  }, [projects, searchQuery, students, supervisors]);

  const onTopicChange = (topicId) => {
    setForm({ ...form, topic_id: topicId, supervisor_id: '' });
  };

  const allocate = async () => {
    if (!form.topic_id) return toast({ title: 'Select an approved topic', variant: 'destructive' });
    if (!form.supervisor_id) return toast({ title: 'Select a supervisor', variant: 'destructive' });
    try {
      const topic = topics.find(t => t.id === form.topic_id);
      const student = selectedStudent;
      const supervisor = supervisors.find(s => s.id === form.supervisor_id);
      const deptDisplayName = deptName(studentDept);

      const project = await base44.entities.Project.create({
        title: topic.title,
        description: topic.description || '',
        student_id: topic.student_id || student?.id,
        student_name: student?.full_name || topic.student_name || '',
        student_email: student?.email || topic.student_email || '',
        registration_number: student?.registration_number || student?.matricNo || '',
        level: student?.level || '',
        supervisor_id: form.supervisor_id,
        supervisor_name: supervisor?.full_name || '',
        supervisor_email: supervisor?.email || '',
        department: deptDisplayName,
        department_id: studentDept,
        session: form.session || '2025/2026',
        status: 'approved',
        completion_percentage: 0,
      });

      await base44.entities.Topic.update(topic.id, {
        project_id: project.id,
        supervisor_id: form.supervisor_id,
        supervisor_name: supervisor?.full_name || '',
        supervisor_email: supervisor?.email || '',
      });

      await base44.entities.Notification.create({
        user_id: form.supervisor_id,
        title: 'New student allocated',
        message: `${student?.full_name || 'A student'} has been allocated to you for "${topic.title}" (Department: ${deptDisplayName}).`,
        type: 'announcement',
      });

      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new Event('smartsupervise_allocations_updated'));
        } catch { /* ignore */ }
      }

      toast({ title: 'Project allocated successfully' });
      setOpen(false);
      setForm({ topic_id: '', supervisor_id: '', session: '' });
      load();
    } catch (e) {
      toast({ title: 'Allocation failed', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Project Allocation & Management"
        subtitle="Allocate approved student topics to supervisors, or reallocate existing projects across department faculty."
        action={
          <Button onClick={() => setOpen(true)} className="gap-2" disabled={availableTopics.length === 0}>
            <Plus className="w-4 h-4" /> New Allocation
          </Button>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Allocated Projects</span>
            <GitBranch className="w-4 h-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold font-heading text-foreground">{projects.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Active supervision pairs</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Available Topics</span>
            <Building2 className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-heading text-foreground">{availableTopics.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Approved & ready to allocate</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Faculty Supervisors</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-heading text-foreground">{supervisors.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Available for supervision</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Avg Load / Supervisor</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-heading text-foreground">
            {supervisors.length > 0 ? (projects.length / supervisors.length).toFixed(1) : 0}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Students per faculty</p>
        </div>
      </div>

      {availableTopics.length > 0 && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 shrink-0" />
            <span>
              <strong>{availableTopics.length} approved topic{availableTopics.length === 1 ? '' : 's'}</strong> waiting for supervisor assignment.
            </span>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="h-8 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Allocate Now
          </Button>
        </div>
      )}

      {/* Main Allocations Table with Search */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-border/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-sm text-foreground">
              Current Project Allocations ({filteredProjects.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by student, supervisor, project..."
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <GitBranch className="w-10 h-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-semibold text-foreground">
              {projects.length === 0 ? 'No allocations yet' : 'No matching allocations found'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {projects.length === 0
                ? 'Allocate an approved topic to a supervisor to get started.'
                : 'Try adjusting your search criteria.'}
            </p>
            {projects.length === 0 && availableTopics.length > 0 && (
              <Button size="sm" onClick={() => setOpen(true)} className="mt-4 gap-1.5">
                <Plus className="w-4 h-4" /> Create First Allocation
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40">
                <tr className="text-left text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3">Project Title</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Student</th>
                  <th className="px-4 py-3 hidden md:table-cell">Supervisor</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Department</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Session</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredProjects.map((p) => {
                  const studentDisplayName = p.student_name || nameOf(students, p.student_id);
                  const supervisorDisplayName = p.supervisor_name || nameOf(supervisors, p.supervisor_id);
                  const isReallocated = !!p.previous_supervisor_name || !!p.reallocated_date;

                  return (
                    <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 max-w-[260px]">
                        <p className="font-semibold text-foreground truncate">{p.title}</p>
                        {isReallocated && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded mt-0.5" title={`Previously supervised by ${p.previous_supervisor_name || 'former supervisor'}`}>
                            <ArrowRightLeft className="w-2.5 h-2.5" /> Reallocated
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="font-medium text-foreground truncate">{studentDisplayName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {p.registration_number || p.student_email || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {(supervisorDisplayName || 'Dr').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground truncate">{supervisorDisplayName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                        {deptName(p.department || p.department_id)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground font-mono text-xs">
                        {p.session || '2025/2026'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer shadow-2xs"
                          onClick={() => setReallocatingProject(p)}
                          title="Reallocate student to another supervisor"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Reallocate
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reallocation Dialog */}
      <ReallocateDialog
        open={!!reallocatingProject}
        onOpenChange={(isOpen) => {
          if (!isOpen) setReallocatingProject(null);
        }}
        project={reallocatingProject}
        supervisors={supervisors}
        allProjects={projects}
        departments={departments}
        onSuccess={load}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Project Allocation</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Approved Topic</Label>
              <select
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                value={form.topic_id}
                onChange={e => onTopicChange(e.target.value)}
              >
                <option value="">Select an approved topic...</option>
                {availableTopics.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.student_name || 'Student'})
                  </option>
                ))}
              </select>
            </div>

            {selectedTopic && (
              <div className="p-3.5 rounded-xl bg-secondary/50 space-y-1.5 border border-border/60">
                <p className="text-sm font-semibold">{selectedTopic.title}</p>
                {selectedTopic.description && <p className="text-xs text-muted-foreground">{selectedTopic.description}</p>}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Student: </span>
                    {selectedStudent?.full_name || selectedTopic.student_name || '-'}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Department: </span>
                    <span className="font-semibold text-primary">{deptName(studentDept)}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Supervisor</Label>
                {studentDept && (
                  <span className="text-xs text-muted-foreground">
                    Target: <strong className="text-foreground">{deptName(studentDept)}</strong>
                  </span>
                )}
              </div>

              {supervisors.length === 0 ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700">
                  No supervisors found in the system. Please register a supervisor with code <strong>12345</strong> first.
                </div>
              ) : (
                <select
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  value={form.supervisor_id}
                  onChange={e => setForm({ ...form, supervisor_id: e.target.value })}
                  disabled={!form.topic_id}
                >
                  <option value="">Select a supervisor...</option>
                  {matchedSupervisors.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} — {deptName(s.department || s.department_id)} ({s.level || 'Faculty'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <Label>Academic Session</Label>
              <Input
                value={form.session}
                onChange={e => setForm({ ...form, session: e.target.value })}
                placeholder="e.g. 2025/2026"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={allocate} className="gap-2"><Link2 className="w-4 h-4" /> Allocate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}