import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Loading } from '@/components/Shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Mail, Phone, Building2, Hash, Save } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setForm({
          phone: me.phone || '',
          registration_number: me.registration_number || '',
          staff_id: me.staff_id || '',
          level: me.level || '',
          bio: me.bio || '',
          department_id: me.department_id || '',
        });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user?.id]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(form);
      toast({ title: 'Profile updated' });
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <Loading />;

  const role = user?.role || 'student';

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Manage your personal and academic information." />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold mx-auto mb-4">
            {(user?.full_name || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <h2 className="font-semibold text-lg">{user?.full_name}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-semibold capitalize bg-primary/10 text-primary">{role}</span>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="font-semibold mb-4">Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field icon={Mail} label="Email" value={user?.email} disabled />
            <Field icon={Phone} label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
            {role === 'student' ? (
              <>
                <Field icon={Hash} label="Registration No." value={form.registration_number} onChange={v => setForm({ ...form, registration_number: v })} />
                <Field icon={Building2} label="Level" value={form.level} onChange={v => setForm({ ...form, level: v })} placeholder="e.g. 400" />
              </>
            ) : (
              <Field icon={Hash} label="Staff ID" value={form.staff_id} onChange={v => setForm({ ...form, staff_id: v })} />
            )}
          </div>
          <div className="mt-4">
            <Label>Bio</Label>
            <Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} placeholder="Short bio..." />
          </div>
          <div className="mt-4">
            <Button onClick={save} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, disabled, placeholder }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          value={value || ''}
          onChange={e => onChange?.(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}