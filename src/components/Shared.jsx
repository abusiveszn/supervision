import { cn } from '@/lib/utils';

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, accent = 'primary' }) {
  const accents = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-600',
    blue: 'bg-blue-500/10 text-blue-600',
    violet: 'bg-violet-500/10 text-violet-600',
  };
  return (
    <div className="glass-card rounded-2xl p-5 flex items-start gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', accents[accent])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold font-heading leading-tight">{value}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

const statusStyles = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
  in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  proposed: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  under_review: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  revision: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function StatusBadge({ status }) {
  const style = statusStyles[status] || 'bg-muted text-muted-foreground border-border';
  const label = (status || '').replace(/_/g, ' ');
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border', style)}>
      {label}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
      )}
      <p className="font-semibold">{title}</p>
      {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{subtitle}</p>}
    </div>
  );
}

export function Loading({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-3 border-secondary border-t-primary rounded-full animate-spin" />
      <span className="ml-3 text-sm text-muted-foreground">{label}</span>
    </div>
  );
}