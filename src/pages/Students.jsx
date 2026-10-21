import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Loading, EmptyState } from '@/components/Shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { GraduationCap, Search, Mail, Eye } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getRole } from '@/lib/role';

import { getRegisteredStudents } from '@/lib/user-registry';

export default function Students() {
  const { user } = useAuth();
  const role = getRole(user);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      let items = [];
      if (role === 'supervisor') {
        const projects = await base44.entities.Project.filter({ supervisor_id: user?.id }, '-created_date').catch(() => []);
        const byStudent = new Map();
        for (const p of projects) {
          if (p.student_id && !byStudent.has(p.student_id)) {
            byStudent.set(p.student_id, {
              id: p.student_id,
              full_name: p.student_name || 'Student',
              email: p.student_email || '-',
              registration_number: p.registration_number || '-',
              level: p.level || '-',
            });
          }
        }
        items = [...byStudent.values()];
      } else {
        let b44Students = [];
        try {
          b44Students = await base44.entities.User.list('-created_date', 500);
        } catch { b44Students = []; }

        const localStudents = getRegisteredStudents() || [];
        const studentMap = new Map();

        const addStudent = (s) => {
          if (!s) return;
          const key = (s.email || s.id || '').toLowerCase().trim();
          if (key && !studentMap.has(key)) {
            studentMap.set(key, s);
          }
        };

        localStudents.forEach(addStudent);
        (b44Students || []).filter(u => u.role === 'student' || u.portal === 'student' || (u.role === 'user' && u.portal !== 'supervisor')).forEach(addStudent);

        items = Array.from(studentMap.values());
      }
      setStudents(items);
    } catch (e) {
      console.error(e);
      setStudents(getRegisteredStudents() || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener('storage', refresh);
    window.addEventListener('smartsupervise_users_updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('smartsupervise_users_updated', refresh);
    };
  }, [user?.id, role]);

  const filtered = students.filter(s =>
    (s.full_name || '').toLowerCase().includes(query.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(query.toLowerCase()) ||
    (s.registration_number || '').toLowerCase().includes(query.toLowerCase())
  );

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await base44.users.inviteUser(inviteEmail.trim(), 'user');
      toast({ title: 'Invitation sent', description: inviteEmail });
      setInviteOpen(false);
      setInviteEmail('');
    } catch (e) {
      toast({ title: 'Invite failed', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title={role === 'supervisor' ? 'My Students' : 'Manage Students'}
        subtitle={role === 'supervisor' ? 'Students assigned to your supervision.' : 'All registered students in the system.'}
        action={role === 'admin' && (
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <Mail className="w-4 h-4" /> Invite Student
          </Button>
        )}
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name, email, or reg. no..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No students found" subtitle={role === 'supervisor' ? 'Students appear once allocated to you.' : 'Invite students to get started.'} />
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Email</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Reg. No.</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Level</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-t border-border/60 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {(s.full_name || 'U').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <span className="font-medium">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.email}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.registration_number || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{s.level || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {role === 'supervisor' && (
                        <Button variant="ghost" size="sm" className="gap-1.5">
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Student</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Send an invitation email. The student will be registered as a student role.</p>
          <Input type="email" placeholder="student@example.edu" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={invite} className="gap-2"><Mail className="w-4 h-4" /> Send Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}