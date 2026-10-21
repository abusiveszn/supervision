import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { PageHeader, Loading, EmptyState } from '@/components/Shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function Departments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', faculty: '', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      setItems(await base44.entities.Department.list('-created_date', 200));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) return toast({ title: 'Name and code are required', variant: 'destructive' });
    try {
      if (editing) {
        await base44.entities.Department.update(editing.id, form);
        toast({ title: 'Department updated' });
      } else {
        await base44.entities.Department.create(form);
        toast({ title: 'Department created' });
      }
      setOpen(false);
      setEditing(null);
      setForm({ name: '', code: '', faculty: '', description: '' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this department?')) return;
    try {
      await base44.entities.Department.delete(id);
      toast({ title: 'Department deleted' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Manage academic departments and faculties."
        action={
          <Button onClick={() => { setEditing(null); setForm({ name: '', code: '', faculty: '', description: '' }); setOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Department
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={Building2} title="No departments" subtitle="Add your first department to get started." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(d => (
            <div key={d.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(d); setForm({ name: d.name, code: d.code, faculty: d.faculty || '', description: d.description || '' }); setOpen(true); }} className="p-1.5 rounded-lg hover:bg-secondary">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => remove(d.id)} className="p-1.5 rounded-lg hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold">{d.name}</h3>
              <p className="text-xs text-muted-foreground">{d.code} · {d.faculty || 'No faculty'}</p>
              {d.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{d.description}</p>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Department' : 'Add Department'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Computer Science" />
              </div>
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="CSC" />
              </div>
            </div>
            <div>
              <Label>Faculty</Label>
              <Input value={form.faculty} onChange={e => setForm({ ...form, faculty: e.target.value })} placeholder="Faculty of Natural Sciences" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}