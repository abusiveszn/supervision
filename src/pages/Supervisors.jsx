import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Loading, EmptyState } from '@/components/Shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, Search, Mail, Shield } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

import { getRegisteredSupervisors } from '@/lib/user-registry';

export default function Supervisors() {
  const { user } = useAuth();
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      let b44Supervisors = [];
      try {
        b44Supervisors = await base44.entities.User.list('-created_date', 500);
      } catch { b44Supervisors = []; }

      const localSupervisors = getRegisteredSupervisors() || [];
      const supervisorMap = new Map();

      const addSupervisor = (sup) => {
        if (!sup) return;
        const key = (sup.email || sup.id || '').toLowerCase().trim();
        if (key && !supervisorMap.has(key)) {
          supervisorMap.set(key, sup);
        }
      };

      localSupervisors.forEach(addSupervisor);
      (b44Supervisors || []).filter(u => u.role === 'supervisor' || u.portal === 'supervisor').forEach(addSupervisor);

      setSupervisors(Array.from(supervisorMap.values()));
    } catch (e) {
      console.error(e);
      setSupervisors(getRegisteredSupervisors() || []);
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
  }, [user?.id]);

  const filtered = supervisors.filter(s =>
    (s.full_name || '').toLowerCase().includes(query.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(query.toLowerCase())
  );

  const promote = async (id) => {
    try {
      await base44.entities.User.update(id, { role: 'supervisor' });
      toast({ title: 'Role updated to Supervisor' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await base44.users.inviteUser(inviteEmail.trim(), 'admin');
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
        title="Manage Supervisors"
        subtitle="Supervisors registered in the system."
        action={
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <Mail className="w-4 h-4" /> Invite Supervisor
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search supervisors..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No supervisors" subtitle="Invite supervisors or promote existing users." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center font-semibold">
                  {(s.full_name || 'U').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Shield className="w-3.5 h-3.5" /> Staff ID: {s.staff_id || '-'}
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600">Supervisor</span>
            </div>
          ))}
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Supervisor</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Send an invitation. The user will be invited as an admin (can be set to supervisor after registration).</p>
          <Input type="email" placeholder="supervisor@example.edu" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={invite} className="gap-2"><Mail className="w-4 h-4" /> Send Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}