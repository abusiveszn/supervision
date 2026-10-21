import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Loading } from '@/components/Shared';
import {
  CheckCircle2, Circle, Clock, CalendarClock, FileText,
  BookOpen, FlaskConical, ShieldCheck, Flag, Target, ArrowRight,
} from 'lucide-react';

const STATUS_DONE = 'done';
const STATUS_ACTIVE = 'active';
const STATUS_PENDING = 'pending';

export default function Progress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [projects, documents, topics, meetings] = await Promise.all([
          base44.entities.Project.filter({ student_id: user.id }),
          base44.entities.Document.filter({ student_id: user.id }, '-created_date', 100),
          base44.entities.Topic.filter({ student_id: user.id }, '-created_date'),
          base44.entities.Meeting.filter({ student_id: user.id }, 'scheduled_time', 50),
        ]);
        setData({ projects, documents, topics, meetings });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const { milestones, project } = useMemo(() => {
    const project = data?.projects?.[0] || null;
    if (!data) return { milestones: [], project: null };

    const topicApproved = data.topics.some(t => t.status === 'approved');
    const proposalDoc = data.documents.find(d => d.type === 'proposal');
    const chapter = (n) => data.documents.find(d => d.type === 'chapter' && d.chapter_number === n);
    const isApproved = (doc) => doc && doc.status === 'approved';
    const isSubmitted = (doc) => doc && doc.status !== 'pending';

    const defs = [
      { key: 'topic', label: 'Topic Approval', icon: BookOpen, check: () => topicApproved },
      { key: 'proposal', label: 'Project Proposal', icon: FileText, check: () => isApproved(proposalDoc), partial: isSubmitted(proposalDoc) },
      { key: 'ch1', label: 'Chapter 1 - Introduction', icon: FileText, check: () => isApproved(chapter(1)), partial: isSubmitted(chapter(1)) },
      { key: 'ch2', label: 'Chapter 2 - Literature Review', icon: BookOpen, check: () => isApproved(chapter(2)), partial: isSubmitted(chapter(2)) },
      { key: 'ch3', label: 'Chapter 3 - Methodology', icon: FlaskConical, check: () => isApproved(chapter(3)), partial: isSubmitted(chapter(3)) },
      { key: 'ch4', label: 'Chapter 4 - Results', icon: FlaskConical, check: () => isApproved(chapter(4)), partial: isSubmitted(chapter(4)) },
      { key: 'final', label: 'Final Defense', icon: ShieldCheck, check: () => project?.status === 'completed' },
    ];

    let reachedActive = false;
    const milestones = defs.map((m, i) => {
      const done = m.check();
      let status = STATUS_PENDING;
      if (done) status = STATUS_DONE;
      else if (m.partial || !reachedActive) { status = STATUS_ACTIVE; reachedActive = true; }
      return { ...m, status };
    });

    return { milestones, project };
  }, [data]);

  if (loading) return <Loading />;

  const completedCount = milestones.filter(m => m.status === STATUS_DONE).length;
  const overallPct = project?.completion_percentage || Math.round((completedCount / Math.max(milestones.length, 1)) * 100);

  // Upcoming deadlines: future meetings + project end_date + revision docs
  const now = new Date();
  const deadlines = [];
  const upcomingMeetings = data.meetings.filter(m => new Date(m.scheduled_time) > now && m.status === 'scheduled');
  upcomingMeetings.slice(0, 3).forEach(m => {
    deadlines.push({ label: m.title, detail: `Meeting · ${m.location || 'TBD'}`, date: m.scheduled_time, tone: 'meeting' });
  });
  if (project?.end_date) {
    const days = Math.ceil((new Date(project.end_date) - now) / 86400000);
    if (days >= 0) deadlines.push({ label: 'Project final deadline', detail: project.title, date: project.end_date, tone: 'critical' });
  }
  data.documents.filter(d => d.status === 'revision').slice(0, 2).forEach(d => {
    deadlines.push({ label: `${d.title} needs revision`, detail: 'Resubmit for review', date: d.updated_date || d.created_date, tone: 'revision' });
  });
  deadlines.sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div>
      <PageHeader
        title="Progress Tracking"
        subtitle={project ? project.title : 'Track your project milestones and deadlines.'}
      />

      {/* Overall progress */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold">Overall Progress</h2>
              <p className="text-sm text-muted-foreground">{completedCount} of {milestones.length} milestones completed</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-primary">{overallPct}%</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
          <div className="p-2 rounded-lg bg-emerald-50">
            <p className="font-bold text-emerald-600 text-base">{completedCount}</p>
            <p className="text-emerald-700">Completed</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-50">
            <p className="font-bold text-amber-600 text-base">{milestones.filter(m => m.status === STATUS_ACTIVE).length}</p>
            <p className="text-amber-700">In Progress</p>
          </div>
          <div className="p-2 rounded-lg bg-secondary">
            <p className="font-bold text-muted-foreground text-base">{milestones.filter(m => m.status === STATUS_PENDING).length}</p>
            <p className="text-muted-foreground">Upcoming</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Milestones */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <Flag className="w-4 h-4 text-primary" /> Project Milestones
          </h2>
          <ol className="relative">
            {milestones.map((m, i) => (
              <li key={m.key} className="flex gap-4 pb-6 last:pb-0">
                {/* connector */}
                <div className="relative flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                    m.status === STATUS_DONE ? 'bg-emerald-500 border-emerald-500 text-white' :
                    m.status === STATUS_ACTIVE ? 'bg-primary/10 border-primary text-primary' :
                    'bg-secondary border-border text-muted-foreground'
                  }`}>
                    {m.status === STATUS_DONE ? <CheckCircle2 className="w-5 h-5" /> :
                      m.status === STATUS_ACTIVE ? <Clock className="w-4 h-4" /> :
                      <Circle className="w-4 h-4" />}
                  </div>
                  {i < milestones.length - 1 && (
                    <div className={`absolute top-9 w-0.5 h-full ${m.status === STATUS_DONE ? 'bg-emerald-500' : 'bg-border'}`} />
                  )}
                </div>
                <div className="flex-1 pt-1.5 -mt-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <m.icon className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium text-sm">{m.label}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.status === STATUS_DONE ? 'bg-emerald-50 text-emerald-700' :
                      m.status === STATUS_ACTIVE ? 'bg-primary/10 text-primary' :
                      'bg-secondary text-muted-foreground'
                    }`}>
                      {m.status === STATUS_DONE ? 'Done' : m.status === STATUS_ACTIVE ? 'In Progress' : 'Upcoming'}
                    </span>
                  </div>
                  {m.status === STATUS_ACTIVE && (
                    <button onClick={() => navigate('/documents')} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:gap-1.5 transition-all">
                      Upload <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Upcoming Deadlines */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" /> Upcoming Deadlines
          </h2>
          {deadlines.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deadlines.map((d, i) => {
                const days = Math.ceil((new Date(d.date) - now) / 86400000);
                const tone = d.tone === 'critical' ? 'border-red-200 bg-red-50' :
                  d.tone === 'revision' ? 'border-amber-200 bg-amber-50' : 'border-blue-100 bg-blue-50';
                const dot = d.tone === 'critical' ? 'bg-red-500' :
                  d.tone === 'revision' ? 'bg-amber-500' : 'bg-primary';
                return (
                  <div key={i} className={`p-3 rounded-xl border ${tone}`}>
                    <div className="flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full ${dot} mt-1.5 shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{d.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{d.detail}</p>
                        <p className="text-xs font-semibold mt-1 text-foreground">
                          {fmtDate(d.date)}
                          {days >= 0 && d.tone !== 'revision' && <span className="text-muted-foreground font-normal"> · in {days}d</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={() => navigate('/meetings')} className="w-full mt-4 text-xs font-semibold text-primary hover:underline">
            View all meetings
          </button>
        </div>
      </div>
    </div>
  );
}