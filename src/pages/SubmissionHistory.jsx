import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Loading, StatusBadge } from '@/components/Shared';
import {
  FileText, GitCommit, Download, MessageSquare, Calendar,
  Layers, CheckCircle2, History,
} from 'lucide-react';

export default function SubmissionHistory() {
  const { user } = useAuth();
  const role = user?.role || 'student';
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let docs;
        if (role === 'student') {
          docs = await base44.entities.Document.filter({ student_id: user.id }, '-created_date', 200);
        } else if (role === 'supervisor') {
          docs = await base44.entities.Document.filter({ supervisor_id: user.id }, '-created_date', 200);
        } else {
          docs = await base44.entities.Document.list('-created_date', 500);
        }
        setDocuments(docs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, role]);

  // Group documents by chapter
  const groups = useMemo(() => {
    const map = new Map();
    documents.forEach((d) => {
      const key = `${d.type}-${d.chapter_number || d.title}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(d);
    });
    const list = Array.from(map.entries()).map(([key, items]) => {
      const sorted = items.sort((a, b) => (b.version || 1) - (a.version || 1));
      const latest = sorted[0];
      const label =
        typeLabel(latest.type) + (latest.chapter_number ? ` ${latest.chapter_number}` : '') +
        (latest.type !== 'chapter' ? ` - ${latest.title}` : '');
      return { key, label, latest, versions: sorted };
    });
    return list.sort((a, b) => (a.latest.chapter_number || 99) - (b.latest.chapter_number || 99));
  }, [documents]);

  if (loading) return <Loading />;

  const totalVersions = documents.length;

  return (
    <div>
      <PageHeader
        title="Submission History"
        subtitle="Track the evolution of every chapter and document through its revisions."
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryTile icon={Layers} label="Document Groups" value={groups.length} accent="primary" />
        <SummaryTile icon={GitCommit} label="Total Versions" value={totalVersions} accent="blue" />
        <SummaryTile icon={CheckCircle2} label="Approved" value={documents.filter(d => d.status === 'approved').length} accent="green" />
        <SummaryTile icon={History} label="In Revision" value={documents.filter(d => d.status === 'revision').length} accent="amber" />
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.key} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              {/* Group header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{g.label}</p>
                    <p className="text-xs text-muted-foreground">{g.versions.length} version{g.versions.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <StatusBadge status={g.latest.status} />
              </div>

              {/* Version timeline */}
              <ol className="relative px-6 py-5">
                {g.versions.map((v, i) => (
                  <li key={v.id} className="flex gap-4 pb-5 last:pb-0">
                    <div className="relative flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 text-xs font-bold ${
                        v.status === 'approved' ? 'bg-emerald-500 border-emerald-500 text-white' :
                        v.status === 'revision' ? 'bg-amber-50 border-amber-400 text-amber-600' :
                        v.status === 'rejected' ? 'bg-red-50 border-red-400 text-red-600' :
                        v.status === 'under_review' ? 'bg-blue-50 border-blue-400 text-blue-600' :
                        'bg-secondary border-border text-muted-foreground'
                      }`}>
                        v{v.version || 1}
                      </div>
                      {i < g.versions.length - 1 && <div className="absolute top-8 w-0.5 h-full bg-border" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={v.status} />
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(v.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        {v.file_url && (
                          <a href={v.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:gap-1.5 transition-all">
                            <Download className="w-3.5 h-3.5" /> View file
                          </a>
                        )}
                      </div>
                      {v.supervisor_comment && (
                        <div className="mt-2 p-3 rounded-xl bg-secondary/60 flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground line-clamp-3">{v.supervisor_comment}</p>
                        </div>
                      )}
                      {v.approved_date && v.status === 'approved' && (
                        <p className="text-xs text-emerald-600 mt-2">Approved on {new Date(v.approved_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function typeLabel(type) {
  const labels = { proposal: 'Proposal', chapter: 'Chapter', abstract: 'Abstract', other: 'Document' };
  return labels[type] || 'Document';
}

function SummaryTile({ icon: Icon, label, value, accent }) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}