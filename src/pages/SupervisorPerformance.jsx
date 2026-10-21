import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { PageHeader, Loading, StatusBadge } from '@/components/Shared';
import {
  Users, Clock, Star, CalendarCheck, TrendingUp, Award,
  MessageSquare, FileCheck, Gauge,
} from 'lucide-react';

export default function SupervisorPerformance() {
  const [supervisors, setSupervisors] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sup, docs, fb, mtgs, projects] = await Promise.all([
          base44.entities.User.filter({ role: 'supervisor' }, '-created_date', 200),
          base44.entities.Document.list('-created_date', 1000),
          base44.entities.Feedback.list('-created_date', 1000),
          base44.entities.Meeting.list('-created_date', 1000),
          base44.entities.Project.list('-created_date', 500),
        ]);
        setSupervisors(sup);
        setDocuments(docs);
        setFeedback(fb);
        setMeetings(mtgs);
        setProjects(projects);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const [projects, setProjects] = useState([]);

  const metrics = useMemo(() => {
    const msPerDay = 86400000;
    return supervisors.map((sup) => {
      const supDocs = documents.filter(d => d.supervisor_id === sup.id);
      const reviewed = supDocs.filter(d => d.status !== 'pending');

      // Review turnaround (days from submission to action)
      const reviewTimes = reviewed
        .map((d) => {
          const end = d.approved_date ? new Date(d.approved_date) : new Date(d.updated_date || d.created_date);
          return (end - new Date(d.created_date)) / msPerDay;
        })
        .filter((t) => t >= 0);
      const avgReviewDays = reviewTimes.length
        ? Math.round((reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length) * 10) / 10
        : null;

      // Feedback quality
      const supFeedback = feedback.filter(f => f.supervisor_id === sup.id);
      const rated = supFeedback.filter(f => f.rating != null);
      const avgRating = rated.length
        ? Math.round((rated.reduce((a, f) => a + f.rating, 0) / rated.length) * 10) / 10
        : null;

      // Meeting attendance
      const supMeetings = meetings.filter(m => m.supervisor_id === sup.id);
      const completed = supMeetings.filter(m => m.status === 'completed').length;
      const cancelled = supMeetings.filter(m => m.status === 'cancelled').length;
      const attendanceRate = (completed + cancelled) > 0
        ? Math.round((completed / (completed + cancelled)) * 100)
        : null;

      // Students assigned
      const studentCount = projects.filter(p => p.supervisor_id === sup.id).length;

      // Composite score (0-100): responsiveness (40) + rating (35) + attendance (25)
      let score = null;
      if (avgReviewDays !== null || avgRating !== null || attendanceRate !== null) {
        const resp = avgReviewDays !== null ? Math.max(0, 100 - (avgReviewDays * 5)) : 50;
        const rt = avgRating !== null ? (avgRating / 5) * 100 : 50;
        const att = attendanceRate !== null ? attendanceRate : 50;
        score = Math.round(resp * 0.4 + rt * 0.35 + att * 0.25);
      }

      return {
        supervisor: sup,
        studentCount,
        docsReviewed: reviewed.length,
        avgReviewDays,
        avgRating,
        attendanceRate,
        completedMeetings: completed,
        totalMeetings: supMeetings.length,
        score,
      };
    });
  }, [supervisors, documents, feedback, meetings, projects]);

  if (loading) return <Loading />;

  // Aggregate stats
  const avgScore = metrics.filter(m => m.score !== null);
  const overallScore = avgScore.length ? Math.round(avgScore.reduce((a, m) => a + m.score, 0) / avgScore.length) : 0;
  const allReviewDays = metrics.filter(m => m.avgReviewDays !== null).map(m => m.avgReviewDays);
  const overallReview = allReviewDays.length ? Math.round((allReviewDays.reduce((a, b) => a + b, 0) / allReviewDays.length) * 10) / 10 : 0;
  const allRatings = metrics.filter(m => m.avgRating !== null).map(m => m.avgRating);
  const overallRating = allRatings.length ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10 : 0;
  const allAttendance = metrics.filter(m => m.attendanceRate !== null).map(m => m.attendanceRate);
  const overallAttendance = allAttendance.length ? Math.round(allAttendance.reduce((a, b) => a + b, 0) / allAttendance.length) : 0;

  const ranked = [...metrics].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div>
      <PageHeader
        title="Supervisor Performance"
        subtitle="Analytics on responsiveness, feedback quality, and meeting attendance."
      />

      {/* Overall stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryTile icon={Gauge} label="Avg Performance Score" value={`${overallScore}`} suffix="/100" accent="primary" />
        <SummaryTile icon={Clock} label="Avg Review Time" value={`${overallReview}`} suffix="d" accent="blue" />
        <SummaryTile icon={Star} label="Avg Feedback Rating" value={`${overallRating}`} suffix="/5" accent="amber" />
        <SummaryTile icon={CalendarCheck} label="Avg Attendance" value={`${overallAttendance}`} suffix="%" accent="green" />
      </div>

      {/* Supervisor cards */}
      {ranked.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No supervisors found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ranked.map((m, idx) => (
            <div key={m.supervisor.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                    idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary'
                  }`}>
                    {idx === 0 ? <Award className="w-5 h-5" /> : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{m.supervisor.full_name || m.supervisor.email}</p>
                    <p className="text-xs text-muted-foreground">{m.studentCount} students · {m.docsReviewed} docs reviewed</p>
                  </div>
                </div>
                {m.score !== null && (
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-primary">{m.score}</p>
                    <p className="text-xs text-muted-foreground">score</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-5">
                <Metric icon={Clock} label="Avg Review Time" value={m.avgReviewDays !== null ? `${m.avgReviewDays}d` : '-'}
                  sub={m.avgReviewDays !== null && m.avgReviewDays <= 3 ? 'Fast' : m.avgReviewDays !== null && m.avgReviewDays <= 7 ? 'Moderate' : m.avgReviewDays !== null ? 'Slow' : 'No data'} />
                <Metric icon={Star} label="Feedback Rating" value={m.avgRating !== null ? `${m.avgRating}/5` : '-'}
                  sub={m.avgRating !== null && m.avgRating >= 4 ? 'High' : m.avgRating !== null && m.avgRating >= 3 ? 'Good' : m.avgRating !== null ? 'Low' : 'No ratings'} />
                <Metric icon={CalendarCheck} label="Meeting Attendance" value={m.attendanceRate !== null ? `${m.attendanceRate}%` : '-'}
                  sub={m.totalMeetings > 0 ? `${m.completedMeetings}/${m.totalMeetings} meetings` : 'No meetings'} />
                <Metric icon={FileCheck} label="Docs Reviewed" value={`${m.docsReviewed}`} sub={`${m.studentCount} assigned students`} />
              </div>

              {/* Progress bars */}
              <div className="px-6 pb-5 space-y-2.5">
                <ProgressBar label="Responsiveness" pct={m.avgReviewDays !== null ? Math.max(5, 100 - (m.avgReviewDays * 5)) : 0} color="bg-blue-500" />
                <ProgressBar label="Feedback Quality" pct={m.avgRating !== null ? (m.avgRating / 5) * 100 : 0} color="bg-amber-500" />
                <ProgressBar label="Attendance" pct={m.attendanceRate !== null ? m.attendanceRate : 0} color="bg-emerald-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, suffix, accent }) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold">{value}<span className="text-sm text-muted-foreground font-medium">{suffix}</span></p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-sm">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
    </div>
  );
}

function ProgressBar({ label, pct, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}