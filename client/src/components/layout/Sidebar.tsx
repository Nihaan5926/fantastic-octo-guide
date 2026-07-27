import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, Briefcase, FolderOpen,
  Globe, BarChart3, Shield, ChevronLeft, ChevronRight,
  UserCheck, GraduationCap, Clock, Target, Crosshair,
  ListChecks, Map, Radio, Fingerprint, DollarSign,
  UserX, MessageSquare, Presentation, Building2,
  Scale, Archive, Wallet, ChevronDown, Activity, Upload, Terminal, GitBranch, Grid3X3
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={18} />,
  FileText: <FileText size={18} />,
  Users: <Users size={18} />,
  Briefcase: <Briefcase size={18} />,
  FolderOpen: <FolderOpen size={18} />,
  Globe: <Globe size={18} />,
  BarChart3: <BarChart3 size={18} />,
  Shield: <Shield size={18} />,
  Activity: <Activity size={18} />,
  Upload: <Upload size={18} />,
  Terminal: <Terminal size={18} />,
  GitBranch: <GitBranch size={18} />,
  Grid3X3: <Grid3X3 size={18} />,
  UserCheck: <UserCheck size={18} />,
  GraduationCap: <GraduationCap size={18} />,
  Clock: <Clock size={18} />,
  Target: <Target size={18} />,
  Crosshair: <Crosshair size={18} />,
  ListChecks: <ListChecks size={18} />,
  Map: <Map size={18} />,
  Radio: <Radio size={18} />,
  Fingerprint: <Fingerprint size={18} />,
  DollarSign: <DollarSign size={18} />,
  UserX: <UserX size={18} />,
  MessageSquare: <MessageSquare size={18} />,
  Presentation: <Presentation size={18} />,
  Building2: <Building2 size={18} />,
  Scale: <Scale size={18} />,
  Archive: <Archive size={18} />,
  Wallet: <Wallet size={18} />,
};

const staticNavItems: { category: string; items: { label: string; path: string; icon: string; category: string; order: number }[] }[] = [
  { category: 'MAIN', items: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', category: 'MAIN', order: 1 },
  ]},
  { category: 'CORE INTEL', items: [
    { label: 'Reports', path: '/reports', icon: 'FileText', category: 'CORE INTEL', order: 10 },
    { label: 'Sources', path: '/sources', icon: 'Users', category: 'CORE INTEL', order: 11 },
    { label: 'Cases', path: '/cases', icon: 'Briefcase', category: 'CORE INTEL', order: 12 },
    { label: 'Evidence', path: '/evidence', icon: 'FolderOpen', category: 'CORE INTEL', order: 13 },
    { label: 'OSINT', path: '/osint', icon: 'Globe', category: 'CORE INTEL', order: 14 },
    { label: 'Analysis', path: '/analysis', icon: 'BarChart3', category: 'CORE INTEL', order: 15 },
    { label: 'Link Analysis', path: '/analysis/link-analysis', icon: 'GitBranch', category: 'CORE INTEL', order: 15.1 },
    { label: 'Timeline', path: '/analysis/timeline', icon: 'Clock', category: 'CORE INTEL', order: 15.2 },
    { label: 'Threats', path: '/threats', icon: 'Shield', category: 'CORE INTEL', order: 16 },
    { label: 'Risk Matrix', path: '/threats/risk-matrix', icon: 'Grid3X3', category: 'CORE INTEL', order: 16.1 },
  ]},
  { category: 'PERSONNEL', items: [
    { label: 'Directory', path: '/personnel', icon: 'UserCheck', category: 'PERSONNEL', order: 20 },
    { label: 'Org Chart', path: '/org-chart', icon: 'Building2', category: 'PERSONNEL', order: 21 },
    { label: 'Training', path: '/training', icon: 'GraduationCap', category: 'PERSONNEL', order: 22 },
    { label: 'Watch Center', path: '/watch-center', icon: 'Clock', category: 'PERSONNEL', order: 23 },
  ]},
  { category: 'OPERATIONS', items: [
    { label: 'Missions', path: '/missions', icon: 'Target', category: 'OPERATIONS', order: 30 },
    { label: 'Targeting', path: '/targeting', icon: 'Crosshair', category: 'OPERATIONS', order: 31 },
    { label: 'Collection', path: '/collection', icon: 'ListChecks', category: 'OPERATIONS', order: 32 },
    { label: 'Tasking', path: '/tasking', icon: 'Activity', category: 'OPERATIONS', order: 33 },
  ]},
  { category: 'INT DISCIPLINES', items: [
    { label: 'GEOINT', path: '/geoint', icon: 'Map', category: 'INT DISCIPLINES', order: 40 },
    { label: 'SIGINT', path: '/sigint', icon: 'Radio', category: 'INT DISCIPLINES', order: 41 },
    { label: 'CI', path: '/ci', icon: 'UserX', category: 'INT DISCIPLINES', order: 42 },
    { label: 'FININT', path: '/fint', icon: 'DollarSign', category: 'INT DISCIPLINES', order: 43 },
    { label: 'Biometrics', path: '/biometrics', icon: 'Fingerprint', category: 'INT DISCIPLINES', order: 44 },
  ]},
  { category: 'DISSEMINATION', items: [
    { label: 'Briefings', path: '/briefings', icon: 'Presentation', category: 'DISSEMINATION', order: 50 },
    { label: 'Messages', path: '/messages', icon: 'MessageSquare', category: 'DISSEMINATION', order: 51 },
    { label: 'Liaison', path: '/liaison', icon: 'Building2', category: 'DISSEMINATION', order: 52 },
  ]},
  { category: 'OVERSIGHT', items: [
    { label: 'Legal', path: '/legal', icon: 'Scale', category: 'OVERSIGHT', order: 60 },
    { label: 'Archive', path: '/archive', icon: 'Archive', category: 'OVERSIGHT', order: 61 },
    { label: 'Budget', path: '/budget', icon: 'Wallet', category: 'OVERSIGHT', order: 62 },
  ]},
  { category: 'ADMIN', items: [
    { label: 'Users', path: '/admin/users', icon: 'Users', category: 'ADMIN', order: 90 },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'ListChecks', category: 'ADMIN', order: 91 },
    { label: 'System Health', path: '/admin/health', icon: 'Activity', category: 'ADMIN', order: 92 },
    { label: 'Bulk Import', path: '/admin/bulk-import', icon: 'Upload', category: 'ADMIN', order: 93 },
    { label: 'System Logs', path: '/admin/logs', icon: 'Terminal', category: 'ADMIN', order: 94 },
  ]},
];

export default function Sidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const sidebarCategories = useSettingsStore((s) => s.sidebarCategories);
  const toggleSidebarCategory = useSettingsStore((s) => s.toggleSidebarCategory);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <aside
      className={`${isOpen ? 'w-60' : 'w-[60px]'} bg-bg-secondary border-r border-border flex flex-col transition-all duration-200 shrink-0 h-screen`}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-border shrink-0">
        {isOpen ? (
          <span className="font-mono font-bold text-accent tracking-wider text-xs">ICMP</span>
        ) : (
          <span className="font-mono font-bold text-accent tracking-wider text-xs mx-auto">I</span>
        )}
        <button
          onClick={onToggle}
          className={`p-1 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors ${!isOpen ? 'mx-auto' : ''}`}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1.5 space-y-1">
        {staticNavItems.map((cat) => {
          const visibleItems = cat.items.filter(
            (item) => item.category !== 'ADMIN' || isAdmin
          );
          if (visibleItems.length === 0) return null;
          const isCollapsed = sidebarCategories[cat.category] ?? false;

          return (
            <div key={cat.category}>
              {isOpen && (
                <button
                  onClick={() => toggleSidebarCategory(cat.category)}
                  className="w-full flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-text-muted tracking-widest uppercase hover:text-text-secondary transition-colors"
                >
                  <ChevronRight size={10} className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                  {cat.category}
                </button>
              )}
              {(!isOpen || !isCollapsed) && visibleItems.map((item) => {
                const Icon = iconMap[item.icon] || <Activity size={18} />;
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 transition-colors ${
                      isActive
                        ? 'bg-accent/20 text-accent'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                    title={!isOpen ? item.label : undefined}
                  >
                    <span className="shrink-0">{Icon}</span>
                    {isOpen && (
                      <span className="text-[13px] font-medium truncate">{item.label}</span>
                    )}
                    {!isOpen && isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-accent rounded-r-full" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
        {/* Extra padding at bottom so last items aren't cut off */}
        <div className="h-4" />
      </nav>

      {/* Footer */}
      <div className={`shrink-0 border-t border-border ${isOpen ? 'p-2' : 'py-2'}`}>
        <div className={`text-[10px] text-text-muted ${isOpen ? 'px-2' : 'text-center'}`}>
          v1.0
        </div>
      </div>
    </aside>
  );
}
