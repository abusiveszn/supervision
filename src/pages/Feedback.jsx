import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Loading, EmptyState } from '@/components/Shared';
import { Card } from '@/components/ui/card';
import { FileText, Eye } from 'lucide-react';

export default function Feedback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [fb, d] = await Promise.all([
          base44.entities.Feedback.filter({ student_id: user.id }, '-created_date'),
          base44.entities.Document.filter({ student_id: user.id }, '-created_date'),
        ]);
        setFeedback(fb);
        setDocs(d);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user?.id]);

  if (loading) return <Loading />;

  const docTitle = (id) => docs.find(d => d.id === id)?.title || 'Document';

  return (
    <div>
      <PageHeader title="Supervisor Feedback" subtitle="All feedback on your submitted documents." />

      {feedback.length === 0 ? (
        <EmptyState icon={FileText} title="No feedback yet" subtitle="Feedback from your supervisor will appear here once you submit documents." />
      ) : (
        <div className="space-y-4">
          {feedback.map(f => (
            <Card key={f.id} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{docTitle(f.document_id)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(f.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <button onClick={() => navigate(`/review/${f.document_id}`)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <Eye className="w-3.5 h-3.5" /> View document
                </button>
              </div>
              <p className="text-sm mt-2">{f.content}</p>
              {f.ai_suggestions && (
                <p className="text-xs text-muted-foreground mt-2 italic">AI-assisted feedback was used in this review.</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}