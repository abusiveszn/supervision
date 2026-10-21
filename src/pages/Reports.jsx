import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Loading, StatCard } from '@/components/Shared';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, GraduationCap, FolderUp, CheckCircle2 } from 'lucide-react';

const STATUS_COLORS = { approved: '#10b981', pending: '#f59e0b', rejected: '#ef4444', in_progress: '#3b82f6', completed: '#10b981', proposed: '#8b5cf6', under_review: '#3b82f6', revision: '#f97316' };

export default function Reports() {
  const { user } = useAuth();
  const role = user?.role || 'supervisor';
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        if (role === 'supervisor') {
          const [d, p] = await Promise.all([
            base44.entities.Document.filter({ supervisor_id: user.id }, '-created_date', 500),
            base44.entities.Project.filter({ supervisor_id: user.id }),
          ]);
          setDocs(d); setProjects(p);
          const stuIds = [...new Set(p.map(x => x.student_id).filter(Boolean))];
          setStudents(stuIds.length ? await base44.entities.User.filter({ id: { $in: stuIds } }) : []);
        } else {
          const [d, p, s] = await Promise.all([
            base44.entities.Document.list('-created_date', 500),
            base44.entities.Project.list('-created_date', 500),
            base44.entities.User.filter({ role: 'student' }, '-created_date', 500),
          ]);
          setDocs(d); setProjects(p); setStudents(s);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user?.id, role]);

  if (loading) return <Loading />;

  const byStatus = Object.entries(
    docs.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const byType = Object.entries(
    docs.reduce((acc, d) => { acc[d.type] = (acc[d.type] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle={role === 'supervisor' ? "Overview of your students' submissions." : 'System-wide submission analytics.'} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={GraduationCap} label="Students" value={students.length} accent="primary" />
        <StatCard icon={FolderUp} label="Total Submissions" value={docs.length} accent="blue" />
        <StatCard icon={CheckCircle2} label="Approved" value={docs.filter(d => d.status === 'approved').length} accent="green" />
        <StatCard icon={Users} label="Active Projects" value={projects.filter(p => p.status === 'in_progress' || p.status === 'approved').length} accent="violet" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Documents by Status</h2>
          {byStatus.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {byStatus.map((e, i) => <Cell key={i} fill={STATUS_COLORS[e.name] || '#94a3b8'} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Submissions by Type</h2>
          {byType.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byType}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}