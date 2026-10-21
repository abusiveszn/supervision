import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, StatusBadge, Loading } from '@/components/Shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Download, CheckCircle, XCircle, RefreshCw, Plus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getRole } from '@/lib/role';

export default function Review() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = getRole(user);
  const [doc, setDoc] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [existingFeedback, setExistingFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commentPart, setCommentPart] = useState('');
  const [commentText, setCommentText] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const d = await base44.entities.Document.get(id);
      setDoc(d);
      const fb = await base44.entities.Feedback.filter({ document_id: id }, '-created_date');
      setExistingFeedback(fb);
      if (d.supervisor_id === user.id && d.status === 'pending') {
        await base44.entities.Document.update(id, { status: 'under_review' });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const addComment = async () => {
    if (!commentText.trim()) return toast({ title: 'Comment is required', variant: 'destructive' });
    setAdding(true);
    try {
      const part = commentPart.trim();
      const content = part ? `[${part}] ${commentText.trim()}` : commentText.trim();
      await base44.entities.Feedback.create({
        document_id: id,
        student_id: doc.student_id,
        supervisor_id: user.id,
        content,
        status: 'submitted',
      });
      await base44.entities.Notification.create({
        user_id: doc.student_id,
        title: 'New review comment',
        message: `Supervisor commented on "${doc.title}"${part ? ` (${part})` : ''}.`,
        type: 'feedback',
      });
      toast({ title: 'Comment added' });
      setCommentPart('');
      setCommentText('');
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setAdding(false); }
  };

  const decide = async (status) => {
    setSaving(true);
    try {
      await base44.entities.Document.update(id, { status, supervisor_comment: feedback });
      if (feedback.trim()) {
        await base44.entities.Feedback.create({
          document_id: id,
          student_id: doc.student_id,
          supervisor_id: user.id,
          content: feedback,
          status: 'submitted',
        });
      }
      await base44.entities.Notification.create({
        user_id: doc.student_id,
        title: `Document ${status}`,
        message: `"${doc.title}" has been ${status.replace(/_/g, ' ')}.`,
        type: 'feedback',
      });
      toast({ title: `Document ${status}` });
      load();
      setFeedback('');
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <Loading />;
  if (!doc) return <p className="text-muted-foreground">Document not found.</p>;

  const isSupervisor = role === 'supervisor' || role === 'admin';
  const typeLabel = doc.chapter_range ? `Chapters ${doc.chapter_range}` : `${doc.type}${doc.chapter_number ? ` ${doc.chapter_number}` : ''}`;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <PageHeader
        title={doc.title}
        subtitle={<span className="capitalize">{typeLabel} · v{doc.version}</span>}
        action={<div className="flex items-center gap-2"><StatusBadge status={doc.status} /></div>}
      />

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Document Preview</h2>
            <a href={doc.file_url} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-2"><Download className="w-3.5 h-3.5" /> Download / View</Button>
            </a>
          </div>
          <iframe src={doc.file_url} className="w-full h-[520px] rounded-xl border border-border" title={doc.title} />
        </Card>

        {isSupervisor && (
          <Card className="p-6">
            <h2 className="font-semibold mb-1">Comment on a part to correct</h2>
            <p className="text-sm text-muted-foreground mb-3">Add targeted comments referencing specific sections the student should revise.</p>
            <div className="grid sm:grid-cols-4 gap-3 mb-3">
              <div className="sm:col-span-1">
                <Label>Part / Section</Label>
                <Input value={commentPart} onChange={e => setCommentPart(e.target.value)} placeholder="e.g. Section 2.3" />
              </div>
              <div className="sm:col-span-3">
                <Label>Comment</Label>
                <Input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="What needs correction..." />
              </div>
            </div>
            <Button variant="outline" onClick={addComment} disabled={adding} className="gap-2">
              <Plus className="w-4 h-4" /> {adding ? 'Adding...' : 'Add Comment'}
            </Button>
          </Card>
        )}

        {isSupervisor && (
          <Card className="p-6">
            <h2 className="font-semibold mb-3">Supervisor Feedback</h2>
            <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} placeholder="Write your overall feedback to the student..." />
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" onClick={() => decide('revision')} disabled={saving} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Request Revision
              </Button>
              <Button variant="destructive" onClick={() => decide('rejected')} disabled={saving} className="gap-2">
                <XCircle className="w-4 h-4" /> Reject
              </Button>
              <Button onClick={() => decide('approved')} disabled={saving} className="gap-2">
                <CheckCircle className="w-4 h-4" /> Approve
              </Button>
            </div>
          </Card>
        )}

        {doc.supervisor_comment && (
          <Card className="p-6">
            <h2 className="font-semibold mb-2">Supervisor Comment</h2>
            <p className="text-sm whitespace-pre-wrap">{doc.supervisor_comment}</p>
          </Card>
        )}

        {existingFeedback.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold mb-3">Comments &amp; Feedback History</h2>
            <div className="space-y-3">
              {existingFeedback.map(f => (
                <div key={f.id} className="p-4 rounded-xl bg-secondary/40">
                  <p className="text-sm whitespace-pre-wrap">{f.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(f.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}