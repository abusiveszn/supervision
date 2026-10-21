import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, StatCard, StatusBadge, Loading } from '@/components/Shared';
import {
  FolderUp, FileText, BookOpen, Clock, CalendarClock,
  ArrowRight, Upload, Mail, UserCheck
} from 'lucide-react';
import { getRegisteredSupervisors } from '@/lib/user-registry';

const ACCENT = 'text-blue-600 bg-blue-50';
const ACCENT_BTN = 'bg-blue-600 hover:bg-blue-700';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const uId = user?.id;
      const uEmail = (user?.email || '').toLowerCase().trim();

      const [allProjects, allDocuments, allTopics, allMeetings, allFeedback, allUsers] = await Promise.all([
        base44.entities.Project.list('-created_date', 100).catch(() => []),
        base44.entities.Document.list('-created_date', 100).catch(() => []),
        base44.entities.Topic.list('-created_date', 100).catch(() => []),
        base44.entities.Meeting.list('scheduled_time', 50).catch(() => []),
        base44.entities.Feedback.list('-created_date', 50).catch(() => []),
        base44.entities.User.list('-created_date', 200).catch(() => []),
      ]);

      const matchStudent = (item, idKey = 'student_id', emailKey = 'student_email') => {
        if (!item) return false;
        if (uId && item[idKey] === uId) return true;
        if (uEmail && item[emailKey] && item[emailKey].toLowerCase().trim() === uEmail) return true;
        return false;
      };

      const projects = (allProjects || []).filter(p => matchStudent(p));
      const documents = (allDocuments || []).filter(d => matchStudent(d));
      const topics = (allTopics || []).filter(t => matchStudent(t));
      const meetings = (allMeetings || []).filter(m => matchStudent(m));
      const feedback = (allFeedback || []).filter(f => matchStudent(f));

      // Also check if any approved topic has an allocated project
      let activeProject = projects[0];
      if (!activeProject && topics.some(t => t.project_id)) {
        const matchingTopic = topics.find(t => t.project_id);
        activeProject = (allProjects || []).find(p => p.id === matchingTopic.project_id);
      }

      setData({
        projects: activeProject ? [activeProject, ...projects.filter(p => p.id !== activeProject.id)] : projects,
        documents,
        topics,
        meetings,
        feedback,
        allSupervisors: allUsers.filter(u => u.role === 'supervisor' || u.portal === 'supervisor'),
      });
    } catch (e) {
      console.error('Failed to load student dashboard:', e);
      setData({ projects: [], documents: [], topics: [], meetings: [], feedback: [], allSupervisors: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const refresh = () => loadData();
    window.addEventListener('storage', refresh);
    window.addEventListener('smartsupervise_users_updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('smartsupervise_users_updated', refresh);
    };
  }, [user?.id, user?.email]);

  if (loading || !data) return <Loading />;

  const project = data.projects?.[0];
  const pendingDocs = data.documents?.filter(d => d.status === 'pending' || d.status === 'revision').length || 0;
  const approvedDocs = data.documents?.filter(d => d.status === 'approved').length || 0;
  const nextMeeting = data.meetings?.find(m => new Date(m.scheduled_time) > new Date() && m.status === 'scheduled');
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  // Resolve assigned supervisor
  const assignedSupervisor = (() => {
    if (!project?.supervisor_id && !project?.supervisor_name) return null;
    const supId = project?.supervisor_id;
    const supEmail = (project?.supervisor_email || '').toLowerCase().trim();

    const localList = getRegisteredSupervisors() || [];
    const found = localList.find(s => (supId && s.id === supId) || (supEmail && s.email?.toLowerCase().trim() === supEmail)) ||
                  (data.allSupervisors || []).find(s => (supId && s.id === supId) || (supEmail && s.email?.toLowerCase().trim() === supEmail));

    if (found) return found;
    if (project?.supervisor_name) {
      return {
        full_name: project.supervisor_name,
        email: project.supervisor_email || '',
        department: project.department || 'Academic Faculty',
        level: 'Faculty Supervisor',
      };
    }
    return null;
  })();

  return (
    <div>
      <PageHeader
        title={`Hello, ${user?.full_name?.split(' ')[0] || user?.first_name || 'Student'}`}
        subtitle="Track your research project progress, assigned supervisor, and document reviews."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={BookOpen}
          label="Project Status"
          value={project ? <span className="capitalize">{project.status.replace(/_/g, ' ')}</span> : 'No project'}
          hint={project?.title}
          accent="primary"
        />
        <StatCard
          icon={FolderUp}
          label="Documents"
          value={data.documents.length}
          hint={`${approvedDocs} approved`}
          accent="blue"
        />
        <StatCard icon={Clock} label="Pending Reviews" value={pendingDocs} accent="amber" />
        <StatCard icon={FileText} label="Feedback" value={data.feedback.length} accent="green" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Project Progress */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Project Progress</h2>
              {project && <StatusBadge status={project.status} />}
            </div>
            {project ? (
              <>
                <p className="text-lg font-medium">{project.title}</p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Completion</span>
                    <span className="font-semibold">{project.completion_percentage || 0}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${project.completion_percentage || 0}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <button
                    onClick={() => navigate('/topics')}
                    className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 text-sm font-medium transition-colors"
                  >
                    Manage Topic
                  </button>
                  <button
                    onClick={() => navigate('/documents')}
                    className={`px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors ${ACCENT_BTN}`}
                  >
                    Upload Document
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">You haven't submitted an approved project topic yet.</p>
                <button
                  onClick={() => navigate('/topics')}
                  className={`px-4 py-2.5 rounded-xl text-white text-sm font-medium ${ACCENT_BTN}`}
                >
                  Submit a Topic
                </button>
              </div>
            )}
          </div>

          {/* Assigned Supervisor Banner / Details */}
          <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" /> Assigned Faculty Supervisor
              </h2>
              {assignedSupervisor ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Allocated
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Allocation Pending
                </span>
              )}
            </div>

            {assignedSupervisor ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{assignedSupervisor.full_name}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {assignedSupervisor.level || 'Faculty Member'} · <span className="font-medium text-slate-800">{assignedSupervisor.department || project?.department || 'Department Faculty'}</span>
                    </p>
                    {assignedSupervisor.email && (
                      <p className="text-xs text-blue-700 font-mono mt-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> {assignedSupervisor.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="pt-2 flex flex-wrap gap-2.5">
                  <button
                    onClick={() => navigate('/meetings')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <CalendarClock className="w-3.5 h-3.5" /> Request Meeting
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-600 py-2">
                Your topic will be allocated to a faculty supervisor by the department administrator once approved.
              </div>
            )}
          </div>

          {/* Recent Documents */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Recent Documents</h2>
            {data.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {data.documents.slice(0, 5).map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2.5 border-b border-border/60 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{d.type} · v{d.version}</p>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Latest Feedback */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Latest Feedback
            </h2>
            {data.feedback.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No feedback yet.</p>
            ) : (
              <div className="space-y-3">
                {data.feedback.slice(0, 3).map(f => (
                  <div key={f.id} className="p-3 rounded-xl bg-blue-50/50">
                    <p className="text-sm line-clamp-3">{f.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next Meeting */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-blue-600" /> Next Meeting
            </h2>
            {nextMeeting ? (
              <div>
                <p className="font-medium">{nextMeeting.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{fmtDate(nextMeeting.scheduled_time)} · {nextMeeting.location || 'TBD'}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming meetings.</p>
            )}
          </div>

          {/* Quick Action */}
          <button onClick={() => navigate('/documents')} className="w-full flex items-center justify-between p-4 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
            <span className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <Upload className="w-4 h-4" /> Upload a new document
            </span>
            <ArrowRight className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </div>
    </div>
  );
}