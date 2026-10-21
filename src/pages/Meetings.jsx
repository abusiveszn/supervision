import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, StatusBadge, Loading, EmptyState } from '@/components/Shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarClock, Plus, MapPin, Users } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getRole } from '@/lib/role';

export default function Meetings() {
  const { user } = useAuth();
  const role = getRole(user);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', scheduled_time: '', location: '', notes: '', student_id: '' });
  const [students, setStudents] = useState([]);
  const [supervisorId, setSupervisorId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      let items;
      if (role === 'student') {
        items = await base44.entities.Meeting.filter({ student_id: user.id }, 'scheduled_time');
        const projects = await base44.entities.Project.filter({ student_id: user.id });
        setSupervisorId(projects[0]?.supervisor_id || null);
      } else if (role === 'supervisor') {
        items = await base44.entities.Meeting.filter({ supervisor_id: user.id }, 'scheduled_time');
        const projects = await base44.entities.Project.filter({ supervisor_id: user.id });
        const seen = new Set();
        const stuList = [];
        projects.forEach(p => {
          if (p.student_id && !seen.has(p.student_id)) {
            seen.add(p.student_id);
            stuList.push({ id: p.student_id, full_name: p.student_name, email: p.student_email });
          }
        });
        setStudents(stuList);
      } else {
        items = await base44.entities.Meeting.list('scheduled_time', 100);
      }
      setMeetings(items);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user?.id, role]);

  const schedule = async () => {
    if (!form.title.trim() || !form.scheduled_time) return toast({ title: 'Title and time are required', variant: 'destructive' });
    try {
      const when = new Date(form.scheduled_time).toISOString();
      if (role === 'supervisor') {
        if (students.length === 0) return toast({ title: 'No students assigned', variant: 'destructive' });
        await base44.entities.Meeting.bulkCreate(students.map(s => ({
          title: form.title,
          student_id: s.id,
          supervisor_id: user.id,
          scheduled_time: when,
          location: form.location,
          notes: form.notes,
          status: 'scheduled',
        })));
        await base44.entities.Notification.bulkCreate(students.map(s => ({
          user_id: s.id,
          title: 'Meeting scheduled',
          message: `${form.title} - ${new Date(form.scheduled_time).toLocaleString('en-GB')}`,
          type: 'meeting',
        })));
      } else {
        await base44.entities.Meeting.create({
          title: form.title,
          student_id: user.id,
          supervisor_id: supervisorId,
          scheduled_time: when,
          location: form.location,
          notes: form.notes,
          status: 'scheduled',
        });
        if (supervisorId) {
          await base44.entities.Notification.create({
            user_id: supervisorId,
            title: 'Meeting scheduled',
            message: `${form.title} - ${new Date(form.scheduled_time).toLocaleString('en-GB')}`,
            type: 'meeting',
          });
        }
      }
      toast({ title: 'Meeting scheduled' });
      setOpen(false);
      setForm({ title: '', scheduled_time: '', location: '', notes: '' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <Loading />;

  const upcoming = meetings.filter(m => new Date(m.scheduled_time) >= new Date() && m.status === 'scheduled');
  const past = meetings.filter(m => new Date(m.scheduled_time) < new Date() || m.status !== 'scheduled');

  return (
    <div>
      <PageHeader
        title="Meetings"
        subtitle="Schedule and track supervision meetings."
        action={(role === 'supervisor' || role === 'student') && (
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Schedule
          </Button>
        )}
      />

      {meetings.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No meetings" subtitle="Scheduled meetings will appear here." />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h2>
            {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming meetings.</p> : (
              <div className="grid md:grid-cols-2 gap-4">
                {upcoming.map(m => <MeetingCard key={m.id} m={m} />)}
              </div>
            )}
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Past</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {past.map(m => <MeetingCard key={m.id} m={m} />)}
              </div>
            </section>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Meeting</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Chapter Two review" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date & Time</Label>
                <Input type="datetime-local" value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })} />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Office / Online" />
              </div>
            </div>
            {role === 'supervisor' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 border border-primary/15 rounded-lg p-3">
                <Users className="w-4 h-4 text-primary shrink-0" />
                This meeting will be announced to all {students.length} student{students.length === 1 ? '' : 's'} under you.
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={schedule}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MeetingCard({ m }) {
  const d = new Date(m.scheduled_time);
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold">{m.title}</h3>
        <StatusBadge status={m.status} />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        <CalendarClock className="w-4 h-4" />
        {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </div>
      {m.location && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" />{m.location}</div>}
      {m.notes && <p className="text-sm mt-2 p-2 rounded-lg bg-secondary/50">{m.notes}</p>}
    </div>
  );
}