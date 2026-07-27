import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';

interface Announcement {
  id: string;
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'critical';
  starts_at: string | null;
  expires_at: string | null;
}

const severityStyles: Record<string, string> = {
  info: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  warning: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  critical: 'bg-red-500/20 border-red-500/40 text-red-300',
};

export default function AppShell() {
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);
  const [sidebarOpen, setSidebarOpen] = React.useState(!sidebarCollapsed && window.innerWidth >= 768);
  const [isMobile, setIsMobile] = React.useState(false);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const user = useAuthStore((s) => s.user);
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => { if (!user) fetchProfile(); }, [user, fetchProfile]);

  React.useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(!sidebarCollapsed);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [sidebarCollapsed]);

  React.useEffect(() => {
    api.get('/admin/announcements').then(({ data }) => {
      setAnnouncements(data.data || []);
    }).catch(() => {});
  }, []);

  const handleToggle = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    if (!isMobile) setSidebarCollapsed(!next);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {isMobile ? (
        <>
          <div className={`fixed inset-y-0 left-0 z-40 w-60 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <Sidebar isOpen={true} onToggle={handleToggle} />
          </div>
          {sidebarOpen && (
            <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={handleToggle} />
          )}
        </>
      ) : (
        <Sidebar isOpen={sidebarOpen} onToggle={handleToggle} />
      )}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onToggleSidebar={handleToggle} />
        {announcements.filter((a) => !dismissedIds.has(a.id)).map((a) => (
          <div key={a.id} className={`flex items-center justify-between px-4 py-2 border-b border-border text-sm ${severityStyles[a.severity] || severityStyles.info}`}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-medium shrink-0">{a.title}</span>
              <span className="truncate text-opacity-80">{a.content}</span>
            </div>
            <button
              onClick={() => setDismissedIds((prev) => new Set(prev).add(a.id))}
              className="ml-3 shrink-0 text-current opacity-60 hover:opacity-100 text-base leading-none"
            >
              &times;
            </button>
          </div>
        ))}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-bg-primary">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
