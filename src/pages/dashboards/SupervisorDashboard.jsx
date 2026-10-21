import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, StatCard, StatusBadge, Loading } from '@/components/Shared';
import {
  FolderUp, BookOpen, CalendarClock, Users, ArrowRight, FileSearch,
  GraduationCap
} from 'lucide-react';

const ACCENT_BTN = 'bg-emerald-600 hover:bg-emerald-700';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const uId = user?.id;
      const uEmail = (user?.email || '').toLowerCase().trim();

      const [allProjects, allDocuments, allTopics, allMeetings] = await Promise.all([
        base44.entities.Project.list('-created_date', 100).catch(() => []),
        base44.entities.Document.list('-created_date', 100).catch(() => []),
        base44.entities.Topic.list('-created_date', 100).catch(() => []),
        base44.entities.Meeting.list('scheduled_time', 50).catch(() => []),
      ]);

      const matchSupervisor = (item) => {
        if (!item) return false;
        if (uId && item.supervisor_id === uId) return true;
        if (uEmail && item.supervisor_email && item.supervisor_email.toLowerCase().trim() === uEmail) return true;
        return false;
      };

      const myProjects = (allProjects || []).filter(matchSupervisor);
      const myDocuments = (allDocuments || []).filter(d => matchSupervisor(d) && d.status === 'pending');
      const myTopics = (allTopics || []).filter(t => matchSupervisor(t) && t.status === 'pending');
      const myMeetings = (allMeetings || []).filter(matchSupervisor);

      setData({
        projects: myProjects,
        documents: myDocuments,
        topics: myTopics,
        meetings: myMeetings,
      });
    } catch (e) {
      console.error('Failed to load supervisor dashboard:', e);
      setData({ projects: [], documents: [], topics: [], meetings: [] });
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

  const pendingReviews = data.documents?.length || 0;
  const pendingTopics = data.topics?.length || 0;
  const upcomingMeetings = data.meetings?.filter(m => new Date(m.scheduled_time) > new Date() && m.status === 'scheduled') || [];
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.full_name?.split(' ')[0] || user?.first_name || 'Supervisor'}`}
        subtitle="Review your allocated students, evaluate topic proposals, and track submissions."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Assigned Students" value={data.projects.length} accent="primary" />
        <StatCard icon={FolderUp} label="Pending Reviews" value={pendingReviews} accent="amber" />
        <StatCard icon={BookOpen} label="Topic Requests" value={pendingTopics} accent="violet" />
        <StatCard icon={CalendarClock} label="Upcoming Meetings" value={upcomingMeetings.length} accent="green" />
      </div>

      {/* Review Queue Banner */}
      {(pendingReviews > 0 || pendingTopics > 0) && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900">{pendingReviews + pendingTopics} items awaiting your attention</p>
              <p className="text-sm text-emerald-700">Review submissions and evaluate student research topics</p>
            </div>
          </div>
          <button
            onClick={() => navigate(pendingReviews > 0 ? '/documents' : '/topics')}
            className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${ACCENT_BTN}`}
          >
            Go to Review
          </button>
        </div>
      )}

      {/* Allocated Students Section */}
      <div className="mb-8 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              Allocated Students & Projects ({data.projects.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Students assigned to your supervision</p>
          </div>
          <button
            onClick={() => navigate('/students')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            View Student Directory <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {data.projects.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <Users className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-700">No students allocated yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Students will automatically appear here once their approved project topics are allocated to you by the department administrator.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.projects.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{p.student_name || 'Allocated Student'}</p>
                    <p className="text-xs text-slate-500">
                      {p.registration_number ? `Matric: ${p.registration_number} · ` : ''}
                      {p.department || 'Computer Science'}
                    </p>
                  </div>
                  <StatusBadge status={p.status || 'approved'} />
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs font-medium text-slate-800 line-clamp-1">{p.title}</p>
                  {p.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{p.description}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Progress: {p.completion_percentage || 0}%</span>
                    <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${p.completion_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => navigate('/documents')}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium transition-colors text-center"
                  >
                    Review Documents
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Reviews */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Pending Document Reviews</h2>
            <button onClick={() => navigate('/documents')} className="text-xs font-semibold text-emerald-700">View all</button>
          </div>
          {data.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No submissions awaiting review.</p>
          ) : (
            <div className="space-y-2">
              {data.documents.slice(0, 5).map(d => (
                <button key={d.id} onClick={() => navigate('/documents')} className="w-full flex items-center justify-between py-2.5 border-b border-border/60 last:border-0 text-left">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{d.type}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Topic Approvals */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Topic Approvals</h2>
            <button onClick={() => navigate('/topics')} className="text-xs font-semibold text-emerald-700">View all</button>
          </div>
          {data.topics.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No topics pending approval.</p>
          ) : (
            <div className="space-y-2">
              {data.topics.slice(0, 5).map(t => (
                <button key={t.id} onClick={() => navigate('/topics')} className="w-full flex items-center justify-between py-2.5 border-b border-border/60 last:border-0 text-left">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <StatusBadge status={t.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><CalendarClock className="w-4 h-4 text-emerald-600" /> Upcoming Meetings</h2>
            <button onClick={() => navigate('/meetings')} className="text-xs font-semibold text-emerald-700">View all</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingMeetings.map(m => (
              <div key={m.id} className="p-3 rounded-xl bg-emerald-50/50">
                <p className="text-sm font-medium truncate">{m.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{fmtDate(m.scheduled_time)} · {m.location || 'TBD'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}