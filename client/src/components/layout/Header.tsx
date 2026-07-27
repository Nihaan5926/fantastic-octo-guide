import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, LogOut, User, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import GlobalSearch from '../common/GlobalSearch';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getEntityRoute(relatedType: string | null, relatedId: string | null): string | null {
  if (!relatedType || !relatedId) return null;
  const routeMap: Record<string, string> = {
    report: '/reports',
    case: '/cases',
    source: '/sources',
    evidence: '/evidence',
  };
  const base = routeMap[relatedType];
  return base ? `${base}/${relatedId}` : null;
}

export default function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user, logout } = useAuthStore();
  const { notifications, unreadCount, fetch, markRead, markAllRead } = useNotificationStore();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = React.useState(false);
  const [showNotifs, setShowNotifs] = React.useState(false);

  React.useEffect(() => {
    fetch();
  }, [fetch]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNotificationClick = (notif: { id: string; is_read: boolean; related_type: string | null; related_id: string | null }) => {
    if (!notif.is_read) {
      markRead(notif.id);
    }
    const route = getEntityRoute(notif.related_type, notif.related_id);
    if (route) {
      setShowNotifs(false);
      navigate(route);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead();
  };

  return (
    <header className="h-16 bg-bg-secondary border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <GlobalSearch />
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-accent-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-bg-card border border-border rounded-xl shadow-2xl z-50">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-accent hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-text-muted">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-bg-hover transition-colors ${!n.is_read ? 'bg-accent/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-accent' : 'bg-text-muted/30'}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${!n.is_read ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                            {n.title}
                          </div>
                          {n.message && (
                            <div className="text-xs text-text-muted mt-0.5 truncate">{n.message}</div>
                          )}
                          <div className="text-xs text-text-muted mt-1">{timeAgo(n.created_at)}</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm overflow-hidden">
              {user?.avatarUrl ? (
                <img src={`/${user.avatarUrl}`} alt="" className="w-full h-full object-cover" style={{ maxWidth: 200, maxHeight: 200 }} />
              ) : (
                `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`
              )}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-text-primary">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-text-muted">{user?.role}</div>
            </div>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-bg-card border border-border rounded-xl shadow-2xl z-50 py-2">
              <div className="px-4 py-2 border-b border-border">
                <div className="text-sm font-medium">{user?.firstName} {user?.lastName}</div>
                <div className="text-xs text-text-muted">{user?.email}</div>
              </div>
              <button
                onClick={() => { navigate('/profile'); setShowMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
              >
                <User size={16} /> Profile
              </button>
              <button
                onClick={() => { navigate('/settings'); setShowMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
              >
                <Settings size={16} /> Settings
              </button>
              <hr className="my-1 border-border" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-accent-danger hover:bg-accent-danger/10 transition-colors"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
