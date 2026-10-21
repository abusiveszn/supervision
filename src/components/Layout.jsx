import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { getRole } from '@/lib/role';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, FileText, FolderUp, CalendarClock,
  Users, GraduationCap, Building2, GitBranch, BarChart3, User as UserIcon,
  LogOut, Menu, X, Bell, BookOpen, Sparkles, Target, History
} from 'lucide-react';

const navByRole = {
  student: [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/topics', label: 'Project Topic', icon: BookOpen },
    { to: '/documents', label: 'Documents', icon: FolderUp },
    { to: '/progress', label: 'Progress', icon: Target },
    { to: '/submission-history', label: 'Submission History', icon: History },
    { to: '/feedback', label: 'Feedback', icon: FileText },
    { to: '/meetings', label: 'Meetings', icon: CalendarClock },
    { to: '/profile', label: 'Profile', icon: UserIcon },
  ],
  supervisor: [
    { to: '/supervisor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/students', label: 'My Students', icon: Users },
    { to: '/documents', label: 'Review Submissions', icon: FolderUp },
    { to: '/submission-history', label: 'Submission History', icon: History },
    { to: '/topics', label: 'Topic Requests', icon: BookOpen },
    { to: '/meetings', label: 'Meetings', icon: CalendarClock },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/profile', label: 'Profile', icon: UserIcon },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/students', label: 'Students', icon: GraduationCap },
    { to: '/supervisors', label: 'Supervisors', icon: Users },
    { to: '/departments', label: 'Departments', icon: Building2 },
    { to: '/supervisor-performance', label: 'Supervisor Performance', icon: BarChart3 },
    { to: '/allocation', label: 'Allocation', icon: GitBranch },
    { to: '/topics', label: 'Topic Approvals', icon: BookOpen },
    { to: '/documents', label: 'Documents', icon: FolderUp },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/profile', label: 'Profile', icon: UserIcon },
  ],
};

const roleLabel = {
  student: 'Student',
  supervisor: 'Supervisor',
  admin: 'Administrator',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const role = getRole(user);
  const nav = navByRole[role] || navByRole.student;

  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      const items = await base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 5);
      setNotifications(items);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadNotifications();
    const unsub = base44.entities.Notification.subscribe(() => loadNotifications());
    return unsub;
  }, [user?.id]);

  const handleLogout = () => {
    logout(true);
  };

  const initials = (user?.full_name || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center gap-2 px-6 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="font-heading font-bold text-[15px] leading-tight">SmartSupervise</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{roleLabel[role]} Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to.endsWith('/dashboard')}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`
              }
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 sticky top-0 z-20 glass-card flex items-center justify-between px-4 lg:px-8 border-b border-border">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(!open)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Welcome back,</span>
              <span className="font-semibold">{user?.full_name?.split(' ')[0] || 'there'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <button className="p-2 rounded-lg hover:bg-secondary relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
              <div className="absolute right-0 mt-2 w-80 bg-popover border border-border rounded-xl shadow-lg p-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all z-50">
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Notifications</p>
                {notifications.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="px-3 py-2 rounded-lg hover:bg-secondary/60">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold border border-primary/20"
            >
              {initials}
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}