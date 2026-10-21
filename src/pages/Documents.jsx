import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, StatusBadge, Loading, EmptyState } from '@/components/Shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FolderUp, Upload, FileText, Download, Sparkles, Eye } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getRole } from '@/lib/role';

export default function Documents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = getRole(user);
  const [docs, setDocs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'chapter', chapter_number: 1, chapter_range: '', project_id: '', file: null });
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      let items;
      if (role === 'student') {
        items = await base44.entities.Document.filter({ student_id: user.id }, '-created_date');
        const projs = await base44.entities.Project.filter({ student_id: user.id });
        setProjects(projs);
      } else if (role === 'supervisor') {
        items = await base44.entities.Document.filter({ supervisor_id: user.id }, '-created_date', 100);
      } else {
        items = await base44.entities.Document.list('-created_date', 100);
      }
      setDocs(items);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user?.id, role]);

  const handleUpload = async () => {
    if (!form.title.trim() || !form.file) return toast({ title: 'Title and file are required', variant: 'destructive' });
    if (form.type === 'chapter_set' && !form.chapter_range) return toast({ title: 'Select a chapter range', variant: 'destructive' });
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: form.file });
      const project = projects[0];
      await base44.entities.Document.create({
        title: form.title,
        type: form.type,
        chapter_number: form.type === 'chapter' && form.chapter_number ? Number(form.chapter_number) : null,
        chapter_range: form.type === 'chapter_set' ? form.chapter_range : null,
        file_url,
        student_id: user.id,
        supervisor_id: project?.supervisor_id || null,
        project_id: project?.id || null,
        status: 'pending',
        version: 1,
      });
      if (project?.supervisor_id) {
        await base44.entities.Notification.create({
          user_id: project.supervisor_id,
          title: 'New submission',
          message: `${user.full_name} uploaded "${form.title}" for review.`,
          type: 'submission',
        });
      }
      toast({ title: 'Document uploaded successfully' });
      setOpen(false);
      setForm({ title: '', type: 'chapter', chapter_number: 1, chapter_range: '', project_id: '', file: null });
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (e) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title={role === 'student' ? 'My Documents' : role === 'supervisor' ? 'Review Submissions' : 'All Documents'}
        subtitle={role === 'student' ? 'Upload proposals, chapters, and track their review status.' : 'Review student uploads and provide feedback.'}
        action={role === 'student' && (
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Upload Document
          </Button>
        )}
      />

      {docs.length === 0 ? (
        <EmptyState icon={FolderUp} title="No documents" subtitle={role === 'student' ? 'Upload your first proposal or chapter.' : 'Submissions will appear here.'} />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {docs.map(d => (
            <div key={d.id} className="glass-card rounded-2xl p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold leading-snug truncate">{d.title}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{d.chapter_range ? `Chapters ${d.chapter_range}` : `${d.type}${d.chapter_number ? ` ${d.chapter_number}` : ''}`} · v{d.version}</p>
                </div>
              </div>
              <div className="mb-3"><StatusBadge status={d.status} /></div>
              {d.supervisor_comment && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 p-2 rounded-lg bg-secondary/50">{d.supervisor_comment}</p>
              )}
              <div className="mt-auto flex gap-2 pt-2">
                <a href={d.file_url} target="_blank" rel="noreferrer" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Download className="w-3.5 h-3.5" /> View
                  </Button>
                </a>
                {(role === 'supervisor' || role === 'admin') && (
                  <Button size="sm" className="flex-1 gap-2" onClick={() => navigate(`/review/${d.id}`)}>
                    <Sparkles className="w-3.5 h-3.5" /> Review
                  </Button>
                )}
                {role === 'student' && (
                  <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => navigate(`/review/${d.id}`)}>
                    <Eye className="w-3.5 h-3.5" /> Feedback
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Chapter One - Introduction" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="chapter">Chapter</SelectItem>
                    <SelectItem value="chapter_set">Chapter Set</SelectItem>
                    <SelectItem value="abstract">Abstract</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                {form.type === 'chapter_set' ? (
                  <>
                    <Label>Chapter Range</Label>
                    <Select value={form.chapter_range} onValueChange={v => setForm({ ...form, chapter_range: v })}>
                      <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-3">Chapters 1-3</SelectItem>
                        <SelectItem value="1-5">Chapters 1-5</SelectItem>
                        <SelectItem value="4-5">Chapters 4-5</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <Label>Chapter No.</Label>
                    <Input type="number" min={1} value={form.chapter_number} onChange={e => setForm({ ...form, chapter_number: e.target.value })} disabled={form.type !== 'chapter'} />
                  </>
                )}
              </div>
            </div>
            <div>
              <Label>File (PDF, DOCX)</Label>
              <Input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} />
              {form.file && <p className="text-xs text-muted-foreground mt-1">{form.file.name}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading} className="gap-2">
              <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}