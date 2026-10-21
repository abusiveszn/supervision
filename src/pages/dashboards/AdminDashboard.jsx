import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, Building2, GitBranch, GraduationCap, Users,
  ArrowRight, ShieldCheck,
  BookOpen, Trash2, ArrowRightLeft
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getRegisteredStudents, getRegisteredSupervisors, getRegistryStats, clearAllSystemData } from '@/lib/user-registry';
import { toast } from '@/components/ui/use-toast';
import { StatusBadge } from '@/components/Shared';
import { getDepartmentName, UNIVERSITY_DEPARTMENTS } from '@/lib/departments';
import ReallocateDialog from '@/components/ReallocateDialog';

const adminAreas = [
  { to: '/students', label: 'Students Directory', description: 'Manage student records, matric numbers, and department allocations.', icon: GraduationCap, badge: 'Directory' },
  { to: '/supervisors', label: 'Supervisors Directory', description: 'Review academic faculty, staff IDs, and assigned workloads.', icon: Users, badge: 'Faculty' },
  { to: '/departments', label: 'Departments', description: 'Organize university faculties and academic units.', icon: Building2, badge: 'Structure' },
  { to: '/allocation', label: 'Project Allocation', description: 'Pair students with supervisors based on research topics.', icon: GitBranch, badge: 'Workflow' },
  { to: '/supervisor-performance', label: 'Supervisor Performance', description: 'Monitor feedback timelines, approvals, and meeting frequencies.', icon: BarChart3, badge: 'Analytics' },
  { to: '/reports', label: 'System Reports', description: 'Generate comprehensive supervision reports and audit logs.', icon: BookOpen, badge: 'Audits' },
];

export default function AdminDashboard() {
  const [students, setStudents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [reallocatingProject, setReallocatingProject] = useState(null);
  const [stats, setStats] = useState({ totalStudents: 0, totalSupervisors: 0, totalDepartments: 0 });

  const loadData = async () => {
    // 1. Get locally registered students and supervisors
    const localStudents = getRegisteredStudents() || [];
    const localSupervisors = getRegisteredSupervisors() || [];
    const registryStats = getRegistryStats() || {};

    // 2. Query entities via base44/localDb
    let dbUsers = [];
    let dbProjects = [];
    let dbDepts = [];
    try {
      [dbUsers, dbProjects, dbDepts] = await Promise.all([
        base44.entities.User.list('-created_date', 500).catch(() => []),
        base44.entities.Project.list('-created_date', 200).catch(() => []),
        base44.entities.Department.list('-created_date', 200).catch(() => []),
      ]);
    } catch {
      dbUsers = [];
      dbProjects = [];
      dbDepts = [];
    }

    // Also read raw localDb user store if present
    let rawLocalUsers = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('smartsupervise_db_user');
        if (raw) rawLocalUsers = JSON.parse(raw);
      } catch { rawLocalUsers = []; }
    }

    // 3. Collect and unify all students
    const studentMap = new Map();
    const addStudent = (s) => {
      if (!s) return;
      const key = (s.email || s.id || '').toLowerCase().trim();
      if (key && !studentMap.has(key)) {
        studentMap.set(key, {
          ...s,
          full_name: s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email || 'Student',
          registration_number: s.registration_number || s.matricNo || 'Matric Pending',
          department: s.department || s.department_id || 'General',
          created_date: s.created_date || new Date().toISOString(),
        });
      }
    };

    localStudents.forEach(addStudent);
    (dbUsers || []).filter(u => u.role === 'student' || u.portal === 'student').forEach(addStudent);
    (rawLocalUsers || []).filter(u => u.role === 'student' || u.portal === 'student').forEach(addStudent);

    // 4. Collect and unify all supervisors
    const supervisorMap = new Map();
    const addSupervisor = (sup) => {
      if (!sup) return;
      const key = (sup.email || sup.id || '').toLowerCase().trim();
      if (key && !supervisorMap.has(key)) {
        supervisorMap.set(key, {
          ...sup,
          full_name: sup.full_name || `${sup.first_name || ''} ${sup.last_name || ''}`.trim() || sup.email || 'Supervisor',
          staff_id: sup.staff_id || 'Staff ID Pending',
          department: sup.department || sup.department_id || 'General',
          level: sup.level || 'Faculty Member',
          created_date: sup.created_date || new Date().toISOString(),
        });
      }
    };

    localSupervisors.forEach(addSupervisor);
    (dbUsers || []).filter(u => u.role === 'supervisor' || u.portal === 'supervisor').forEach(addSupervisor);
    (rawLocalUsers || []).filter(u => u.role === 'supervisor' || u.portal === 'supervisor').forEach(addSupervisor);

    const mergedStudents = Array.from(studentMap.values());
    const mergedSupervisors = Array.from(supervisorMap.values());

    setStudents(mergedStudents);
    setSupervisors(mergedSupervisors);
    setProjects(dbProjects || []);
    setDepartments(dbDepts && dbDepts.length ? dbDepts : UNIVERSITY_DEPARTMENTS);
    setStats({
      totalStudents: mergedStudents.length,
      totalSupervisors: mergedSupervisors.length,
      totalDepartments: registryStats.totalDepartments || 4,
    });
  };

  useEffect(() => {
    loadData();

    const refresh = () => loadData();
    window.addEventListener('storage', refresh);
    window.addEventListener('smartsupervise_users_updated', refresh);
    window.addEventListener('smartsupervise_allocations_updated', refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('smartsupervise_users_updated', refresh);
      window.removeEventListener('smartsupervise_allocations_updated', refresh);
    };
  }, []);

  const handleClearData = () => {
    if (window.confirm('Clear all registered students and supervisors from the system? This gives you a completely clean slate to register new accounts.')) {
      clearAllSystemData();
      setStudents([]);
      setSupervisors([]);
      setStats({
        totalStudents: 0,
        totalSupervisors: 0,
        totalDepartments: 0,
      });
      toast({
        title: 'System Data Cleared',
        description: 'All student and supervisor records have been wiped. You can now register fresh accounts.',
      });
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const nameOf = (list, id) => list.find(x => x.id === id)?.full_name || '-';

  const deptDisplayName = (idOrName) => {
    if (!idOrName) return 'General';
    const found = departments.find(d => d.id === idOrName || d.name === idOrName);
    if (found) return found.name;
    return getDepartmentName(idOrName);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 lg:p-8 text-white shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Administrator Control Center
            </div>
            <h1 className="text-2xl lg:text-3xl font-heading font-bold tracking-tight text-white">
              System Overview & Registrations
            </h1>
            <p className="mt-1.5 text-sm text-slate-300 max-w-2xl">
              Real-time monitoring of registered students, supervisors, and academic project allocations across all university departments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/students"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <GraduationCap className="w-4 h-4" />
              Manage Students
            </Link>
            <Link
              to="/supervisors"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 transition-colors"
            >
              <Users className="w-4 h-4" />
              Faculty Members
            </Link>
            <button
              onClick={handleClearData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
              title="Wipe test data and reset counts"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-300" />
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered Students</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-bold text-foreground">{stats.totalStudents}</span>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Students</span>
          </div>
          <Link to="/students" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View student directory <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supervisors / Faculty</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-bold text-foreground">{stats.totalSupervisors}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Supervisors</span>
          </div>
          <Link to="/supervisors" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline">
            View supervisor faculty <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Departments</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-bold text-foreground">{stats.totalDepartments}</span>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Faculties</span>
          </div>
          <Link to="/departments" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline">
            Manage departments <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supervision Ratio</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <GitBranch className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-bold text-foreground">
              {stats.totalSupervisors > 0 ? (stats.totalStudents / stats.totalSupervisors).toFixed(1) : (stats.totalStudents > 0 ? stats.totalStudents : '0')}
            </span>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Students / Sup</span>
          </div>
          <Link to="/allocation" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:underline">
            Allocation status <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Active Project Allocations & Reallocation Section */}
      <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-base text-foreground">
                  Active Project Allocations
                </h3>
                <span className="text-[11px] font-semibold bg-amber-500/15 text-amber-700 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {projects.length} Assigned
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monitor student-supervisor pairings and reallocate faculty supervision in real time.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/allocation"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs"
            >
              <GitBranch className="w-3.5 h-3.5" />
              Manage All Allocations
            </Link>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <GitBranch className="w-6 h-6" />
            </div>
            <h4 className="font-heading font-semibold text-sm text-foreground">No Project Allocations Yet</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Once student project topics are approved, pair them with faculty supervisors.
            </p>
            <Link
              to="/allocation"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs"
            >
              Open Project Allocation →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 border-b border-border/60 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <tr className="text-left">
                  <th className="px-4 py-3">Project Title</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Assigned Supervisor</th>
                  <th className="px-4 py-3 hidden md:table-cell">Department</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {projects.slice(0, 6).map((p) => {
                  const studentName = p.student_name || nameOf(students, p.student_id);
                  const supervisorName = p.supervisor_name || nameOf(supervisors, p.supervisor_id);
                  const isReallocated = !!p.previous_supervisor_name || !!p.reallocated_date;

                  return (
                    <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="font-semibold text-foreground truncate">{p.title}</p>
                        {isReallocated && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded mt-0.5"
                            title={`Previously supervised by ${p.previous_supervisor_name || 'former faculty'}`}
                          >
                            <ArrowRightLeft className="w-2.5 h-2.5" /> Reallocated
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground truncate">{studentName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {p.registration_number || p.student_email || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {(supervisorName || 'Dr').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground truncate">{supervisorName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                        {deptDisplayName(p.department || p.department_id)}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setReallocatingProject(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary hover:text-white text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                          title="Reallocate student to another supervisor"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Reallocate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {projects.length > 6 && (
              <div className="p-3 border-t border-border/60 text-center bg-slate-50/30">
                <Link to="/allocation" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
                  View all {projects.length} project allocations in detail <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Registered Users Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recently Registered Students */}
        <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-base text-foreground">Registered Students</h3>
                <p className="text-xs text-muted-foreground">{students.length} student{students.length === 1 ? '' : 's'} registered in the system</p>
              </div>
            </div>
            {students.length > 0 && (
              <Link to="/students" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                View all ({students.length}) <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          <div className="divide-y divide-border/60 overflow-y-auto max-h-[380px]">
            {students.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h4 className="font-heading font-semibold text-sm text-foreground">No Students Registered Yet</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Newly registered students will immediately appear here in real time.
                </p>
                <Link
                  to="/register"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  Register New Student →
                </Link>
              </div>
            ) : (
              students.slice(0, 8).map((s) => (
                <div key={s.id || s.email} className="p-4 hover:bg-secondary/40 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs shrink-0">
                      {(s.full_name || s.email || 'S').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{s.full_name || 'Student'}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground font-medium">
                          {s.registration_number || s.matricNo || 'Matric Pending'}
                        </span>
                        <span>•</span>
                        <span>{s.department || s.department_id || 'General'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      Student
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatDate(s.created_date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Registered Supervisors */}
        <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-base text-foreground">Registered Supervisors</h3>
                <p className="text-xs text-muted-foreground">{supervisors.length} faculty member{supervisors.length === 1 ? '' : 's'} registered</p>
              </div>
            </div>
            {supervisors.length > 0 && (
              <Link to="/supervisors" className="text-xs font-medium text-emerald-600 hover:underline flex items-center gap-1">
                View all ({supervisors.length}) <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          <div className="divide-y divide-border/60 overflow-y-auto max-h-[380px]">
            {supervisors.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="font-heading font-semibold text-sm text-foreground">No Supervisors Registered Yet</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Register faculty with supervisor secret code <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">12345</span>.
                </p>
                <Link
                  to="/supervisor-register"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-2xs"
                >
                  Register New Supervisor →
                </Link>
              </div>
            ) : (
              supervisors.slice(0, 8).map((sup) => (
                <div key={sup.id || sup.email} className="p-4 hover:bg-secondary/40 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center justify-center text-xs shrink-0">
                      {(sup.full_name || sup.email || 'Dr').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{sup.full_name || 'Supervisor'}</p>
                      <p className="text-xs text-muted-foreground truncate">{sup.email}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                          {sup.staff_id || 'Staff ID Pending'}
                        </span>
                        <span>•</span>
                        <span>{sup.department || sup.department_id || 'General'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {sup.level || 'Faculty'}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatDate(sup.created_date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Administration Workflows & Management Links */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-heading font-bold text-foreground">Management Areas</h2>
          <p className="text-xs text-muted-foreground">Configure departments, assign student projects, and review academic performance.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminAreas.map(({ to, label, description, icon: Icon, badge }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-2xl border border-border bg-card p-5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-md">
                    {badge}
                  </span>
                </div>
                <h3 className="mt-4 font-heading font-semibold text-base text-foreground group-hover:text-primary transition-colors">{label}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-primary">
                <span>Access area</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
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
        onSuccess={loadData}
      />
    </div>
  );
}

