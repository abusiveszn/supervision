import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Loading, EmptyState } from '@/components/Shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Megaphone } from 'lucide-react';
import { getRole } from '@/lib/role';
import { toast } from '@/components/ui/use-toast';

export default function Messages() {
  const { user } = useAuth();
  const role = getRole(user);
  const [contacts, setContacts] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [broadcast, setBroadcast] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const endRef = useRef(null);

  const loadContacts = async () => {
    try {
      let items;
      if (role === 'student') {
        const projects = await base44.entities.Project.filter({ student_id: user.id });
        const supIds = [...new Set(projects.map(p => p.supervisor_id).filter(Boolean))];
        items = supIds.length ? await base44.entities.User.filter({ id: { $in: supIds } }) : [];
      } else if (role === 'supervisor') {
        const projects = await base44.entities.Project.filter({ supervisor_id: user.id });
        const stuIds = [...new Set(projects.map(p => p.student_id).filter(Boolean))];
        items = stuIds.length ? await base44.entities.User.filter({ id: { $in: stuIds } }) : [];
      } else {
        items = await base44.entities.User.list('-created_date', 50);
      }
      setContacts(items);
      if (items.length && !active) setActive(items[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadMessages = async () => {
    if (!active) return;
    try {
      const sent = await base44.entities.Message.filter({ sender_id: user.id, receiver_id: active.id }, 'created_date', 200);
      const received = await base44.entities.Message.filter({ sender_id: active.id, receiver_id: user.id }, 'created_date', 200);
      const all = [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setMessages(all);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadContacts(); }, [user?.id, role]);
  useEffect(() => {
    loadMessages();
    const unsub = base44.entities.Message.subscribe(() => loadMessages());
    return unsub;
  }, [active?.id, user?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const send = async () => {
    if (!text.trim() || !active) return;
    setSending(true);
    try {
      await base44.entities.Message.create({ sender_id: user.id, receiver_id: active.id, content: text, read: false });
      setText('');
      loadMessages();
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const broadcastMessage = async () => {
    if (!broadcast.trim()) return;
    setBroadcasting(true);
    try {
      await base44.entities.Message.bulkCreate(contacts.map(c => ({ sender_id: user.id, receiver_id: c.id, content: broadcast, read: false })));
      await base44.entities.Notification.bulkCreate(contacts.map(c => ({ user_id: c.id, title: 'Announcement', message: broadcast.slice(0, 80), type: 'announcement' })));
      toast({ title: `Announcement sent to ${contacts.length} students` });
      setBroadcast('');
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setBroadcasting(false); }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Messages" subtitle="Chat with your supervisor or students." />
      {role === 'supervisor' && contacts.length > 0 && (
        <div className="glass-card rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Megaphone className="w-4 h-4" /></div>
            <div>
              <h2 className="font-semibold text-sm">Announce to all students</h2>
              <p className="text-xs text-muted-foreground">Send a message to all {contacts.length} students under you.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input value={broadcast} onChange={e => setBroadcast(e.target.value)} placeholder="Type an announcement..." disabled={broadcasting} />
            <Button onClick={broadcastMessage} disabled={broadcasting || !broadcast.trim()} className="gap-2 shrink-0"><Send className="w-4 h-4" /> Send</Button>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-4 h-[600px]">
        <div className="glass-card rounded-2xl p-3 overflow-y-auto scrollbar-thin">
          {contacts.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No contacts" subtitle="Contacts appear once a project is allocated." />
          ) : (
            contacts.map(c => (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors mb-1 ${active?.id === c.id ? 'bg-primary/10' : 'hover:bg-secondary/60'}`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {(c.full_name || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{c.role}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="md:col-span-2 glass-card rounded-2xl flex flex-col overflow-hidden">
          {active ? (
            <>
              <div className="px-5 py-3 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                  {(active.full_name || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{active.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{active.role}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${m.sender_id === user.id ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary rounded-bl-sm'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Type a message..."
                  disabled={sending}
                />
                <Button onClick={send} disabled={sending || !text.trim()} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <EmptyState icon={MessageSquare} title="Select a contact" />
          )}
        </div>
      </div>
    </div>
  );
}