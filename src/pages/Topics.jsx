import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, StatusBadge, Loading, EmptyState } from '@/components/Shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BookOpen, Plus, Send, CheckCircle, UploadCloud, FileText, Paperclip } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getRole } from '@/lib/role';

export default function Topics() {
  const { user } = useAuth();
  const role = getRole(user);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', objectives: '' });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [proposalFile, setProposalFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadTopic, setUploadTopic] = useState(null);
  const [attachFile, setAttachFile] = useState(null);

  const ACCEPTED = '.pdf,.doc,.docx';
  const validateFile = (file) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    return name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx');
  };

  const load = async () => {
    setLoading(true);
    try {
      let items;
      if (role === 'student') items = await base44.entities.Topic.filter({ student_id: user.id }, '-created_date');
      else items = await base44.entities.Topic.list('-created_date', 200);
      setTopics(items);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user?.id, role]);

  const submit = async () => {
    if (!form.title.trim()) return toast({ title: 'Please enter a topic title', variant: 'destructive' });
    setSubmitting(true);
    try {
      let file_url = null;
      if (proposalFile) {
        const res = await base44.integrations.Core.UploadFile({ file: proposalFile });
        file_url = res.file_url;
      }
      await base44.entities.Topic.create({
        ...form,
        student_id: user.id,
        student_name: user.full_name || 'Student',
        student_email: user.email || '',
        department: user.department || user.department_id || 'Computer Science',
        department_id: user.department_id || user.department || 'Computer Science',
        status: 'pending',
        file_url,
      });
      toast({ title: 'Topic submitted for approval' });
      setOpen(false);
      setForm({ title: '', description: '', objectives: '' });
      setProposalFile(null);
      load();
    } catch (e) {
      toast({ title: 'Failed to submit', description: e.message, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  const attachProposal = async () => {
    if (!validateFile(attachFile)) return toast({ title: 'Please select a PDF or DOC file', variant: 'destructive' });
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file: attachFile });
      await base44.entities.Topic.update(uploadTopic.id, { file_url: res.file_url });
      await base44.entities.Notification.create({
        user_id: uploadTopic.supervisor_id,
        title: 'Proposal uploaded',
        message: `A proposal has been uploaded for "${uploadTopic.title}".`,
        type: 'submission',
      });
      toast({ title: 'Proposal uploaded for review' });
      setUploadTopic(null);
      setAttachFile(null);
      load();
    } catch (e) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const review = async (status) => {
    setSubmitting(true);
    try {
      await base44.entities.Topic.update(reviewing.id, { status, supervisor_comment: comment });
      await base44.entities.Notification.create({
        user_id: reviewing.student_id,
        title: `Topic ${status}`,
        message: `Your topic "${reviewing.title}" has been ${status}.`,
        type: 'approval',
      });
      toast({ title: `Topic ${status}` });
      setReviewing(null);
      setComment('');
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Project Topics"
        subtitle={role === 'student' ? 'Submit and track your proposed project topics.' : role === 'supervisor' ? 'Review and approve student topic requests.' : 'All topic submissions across the system.'}
        action={role === 'student' && (
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Submit Topic
          </Button>
        )}
      />

      {topics.length === 0 ? (
        <EmptyState icon={BookOpen} title="No topics yet" subtitle={role === 'student' ? 'Submit your first project topic for supervisor approval.' : 'Topic requests will appear here.'} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {topics.map(t => (
            <div key={t.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold leading-snug">{t.title}</h3>
                <StatusBadge status={t.status} />
              </div>
              {t.description && <p className="text-sm text-muted-foreground line-clamp-3">{t.description}</p>}
              {t.objectives && <p className="text-xs text-muted-foreground mt-2 line-clamp-2"><span className="font-medium">Objectives:</span> {t.objectives}</p>}
              {t.supervisor_comment && (
                <div className="mt-3 p-3 rounded-xl bg-secondary/60">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Supervisor comment</p>
                  <p className="text-sm">{t.supervisor_comment}</p>
                </div>
              )}
              {t.file_url && (
                <a href={t.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary hover:underline">
                  <FileText className="w-3.5 h-3.5" /> View Proposal
                </a>
              )}
              {role === 'student' && !t.file_url && (
                <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => { setUploadTopic(t); setAttachFile(null); }}>
                  <UploadCloud className="w-4 h-4" /> Upload Proposal
                </Button>
              )}
              {role !== 'student' && t.status === 'pending' && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => { setReviewing(t); setComment(''); }}>
                  Review & Decide
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Project Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Topic Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. A Cloud-Based Intelligent Platform for Project Supervision" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Briefly describe the project..." />
            </div>
            <div>
              <Label>Objectives</Label>
              <Textarea value={form.objectives} onChange={e => setForm({ ...form, objectives: e.target.value })} rows={2} placeholder="Key objectives and goals..." />
            </div>
            <div>
              <Label>Proposal Document (optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">Attach a PDF or DOC proposal for supervisor and admin approval.</p>
              <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-input cursor-pointer hover:bg-accent transition-colors">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate flex-1">{proposalFile ? proposalFile.name : 'Choose a PDF or DOC file...'}</span>
                <input type="file" accept={ACCEPTED} className="hidden" onChange={e => setProposalFile(e.target.files[0])} />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting} className="gap-2">
              <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Topic</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="font-semibold">{reviewing.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{reviewing.description}</p>
              </div>
              {reviewing.file_url && (
                <a href={reviewing.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                  <FileText className="w-4 h-4" /> View Proposal Document
                </a>
              )}
              <div>
                <Label>Comment (optional)</Label>
                <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Feedback for the student..." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => review('rejected')} disabled={submitting}>Reject</Button>
            <Button onClick={() => review('approved')} disabled={submitting} className="gap-2">
              <CheckCircle /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!uploadTopic} onOpenChange={(o) => !o && setUploadTopic(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Proposal</DialogTitle>
          </DialogHeader>
          {uploadTopic && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="font-semibold text-sm">{uploadTopic.title}</p>
                <p className="text-xs text-muted-foreground mt-1">Upload your proposal PDF or DOC for supervisor and admin approval.</p>
              </div>
              <label className="flex items-center gap-2 p-4 rounded-xl border border-dashed border-input cursor-pointer hover:bg-accent transition-colors">
                <UploadCloud className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate flex-1">{attachFile ? attachFile.name : 'Choose a PDF or DOC file...'}</span>
                <input type="file" accept={ACCEPTED} className="hidden" onChange={e => setAttachFile(e.target.files[0])} />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadTopic(null)}>Cancel</Button>
            <Button onClick={attachProposal} disabled={uploading} className="gap-2">
              <UploadCloud className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload for Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}