import React from 'react';
import toast from 'react-hot-toast';
import { Settings, Moon, Sun, Monitor, Trash2, LogOut, Loader2, Download, Shield, Database, HardDrive, Volume2, VolumeX, Zap, ZapOff, LayoutDashboard, FileText, Briefcase, Shield as ShieldIcon, Target, RefreshCw, GripVertical, Globe, Clock, AlertTriangle, UserX } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

type Language = 'en' | 'fr' | 'es' | 'de' | 'ar';
type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
type TimeFormat = '12h' | '24h';

const LANGUAGE_LABELS: Record<Language, string> = { en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch', ar: 'العربية' };

const TIMEZONES = (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') : [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'Pacific/Auckland',
];

function getDatePreview(df: DateFormat, locale: string): string {
  const d = new Date(2025, 5, 15);
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return df;
  }
}

function getTimePreview(tf: TimeFormat, locale: string): string {
  const d = new Date(2025, 5, 15, 14, 30, 0);
  try {
    const hour12 = tf === '12h';
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12 }).format(d);
  } catch {
    return tf === '12h' ? '02:30 PM' : '14:30';
  }
}

const LOCALE_MAP: Record<Language, string> = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', ar: 'ar-SA' };

export default function SettingsPage() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const settings = useSettingsStore();
  const [showLogout, setShowLogout] = React.useState(false);
  const [showReset, setShowReset] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const [deletePassword, setDeletePassword] = React.useState('');
  const [showDeleteAccount, setShowDeleteAccount] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleThemeChange = (theme: 'dark' | 'light' | 'system') => {
    settings.setTheme(theme);
    toast.success(`Theme set to ${theme}`);
  };

  const handleReset = () => {
    settings.resetToDefaults();
    setShowReset(false);
    toast.success('Settings reset to defaults');
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await logout();
    navigate('/login');
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const { data } = await api.get('/auth/export-data');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('All data exported');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }
    setIsDeleting(true);
    try {
      await api.delete('/auth/me', { data: { password: deletePassword } });
      toast.success('Account deleted');
      await logout();
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" subtitle="Customize your experience across the platform" />

      {/* Appearance */}
      <div className="card">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">Appearance</h3>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium block mb-2">Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'dark' as const, icon: <Moon size={16} />, label: 'Dark', desc: 'Easy on the eyes' },
                { value: 'light' as const, icon: <Sun size={16} />, label: 'Light', desc: 'Bright & clean' },
                { value: 'system' as const, icon: <Monitor size={16} />, label: 'System', desc: 'Follows OS' },
              ].map((opt) => (
                <button key={opt.value} onClick={() => handleThemeChange(opt.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    settings.theme === opt.value ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-primary text-text-secondary hover:border-border-light'
                  }`}>
                  {opt.icon}
                  <span className="text-xs font-medium">{opt.label}</span>
                  <span className="text-[10px] text-text-muted">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Layout Density</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'comfortable' as const, label: 'Comfortable', desc: 'More spacing between elements' },
                { value: 'compact' as const, label: 'Compact', desc: 'Tighter, more data on screen' },
              ].map((opt) => (
                <button key={opt.value} onClick={() => settings.setDensity(opt.value)}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border transition-all ${
                    settings.density === opt.value ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-primary text-text-secondary hover:border-border-light'
                  }`}>
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-[10px] text-text-muted">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Compact Cards</div>
              <div className="text-xs text-text-muted">Reduce card padding across all pages</div>
            </div>
            <button onClick={() => settings.setCompactCards(!settings.compactCards)}
              className={`w-10 h-6 rounded-full transition-colors relative ${settings.compactCards ? 'bg-accent' : 'bg-bg-tertiary'}`}>
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${settings.compactCards ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Animations</div>
              <div className="text-xs text-text-muted">Enable transitions and effects</div>
            </div>
            <button onClick={() => settings.setShowAnimations(!settings.showAnimations)}
              className={`w-10 h-6 rounded-full transition-colors relative ${settings.showAnimations ? 'bg-accent' : 'bg-bg-tertiary'}`}>
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${settings.showAnimations ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Locale & Time */}
      <div className="card">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">Locale & Time</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Language</label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
                <button key={lang} onClick={() => settings.setLanguage(lang)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    settings.language === lang ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-primary text-text-secondary hover:border-border-light'
                  }`}>
                  <Globe size={14} className="inline mr-1" />
                  {LANGUAGE_LABELS[lang]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Timezone</label>
            <select value={settings.timezone} onChange={(e) => settings.setTimezone(e.target.value)}
              className="input max-w-xs">
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Date Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'] as DateFormat[]).map((df) => (
                <button key={df} onClick={() => settings.setDateFormat(df)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    settings.dateFormat === df ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-primary text-text-secondary hover:border-border-light'
                  }`}>
                  <span className="text-sm font-medium">{df}</span>
                  <span className="text-[10px] text-text-muted">e.g. {getDatePreview(df, LOCALE_MAP[settings.language])}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Time Format</label>
            <div className="grid grid-cols-2 gap-2">
              {(['12h', '24h'] as TimeFormat[]).map((tf) => (
                <button key={tf} onClick={() => settings.setTimeFormat(tf)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    settings.timeFormat === tf ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-primary text-text-secondary hover:border-border-light'
                  }`}>
                  <span className="text-sm font-medium">{tf === '12h' ? '12-Hour' : '24-Hour'}</span>
                  <span className="text-[10px] text-text-muted">e.g. {getTimePreview(tf, LOCALE_MAP[settings.language])}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Behavior */}
      <div className="card">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">Behavior</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Default Landing Page</label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {[
                { value: '/dashboard' as const, icon: <LayoutDashboard size={14} />, label: 'Dashboard' },
                { value: '/reports' as const, icon: <FileText size={14} />, label: 'Reports' },
                { value: '/cases' as const, icon: <Briefcase size={14} />, label: 'Cases' },
                { value: '/threats' as const, icon: <ShieldIcon size={14} />, label: 'Threats' },
                { value: '/missions' as const, icon: <Target size={14} />, label: 'Missions' },
              ].map((opt) => (
                <button key={opt.value} onClick={() => settings.setDefaultPage(opt.value)}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                    settings.defaultPage === opt.value ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-primary text-text-secondary hover:border-border-light'
                  }`}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Items Per Page</label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 50, 100].map((n) => (
                <button key={n} onClick={() => settings.setItemsPerPage(n)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    settings.itemsPerPage === n ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-primary text-text-secondary hover:border-border-light'
                  }`}>{n}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Notification Sound</div>
              <div className="text-xs text-text-muted">Play a sound for new alerts</div>
            </div>
            <button onClick={() => settings.setNotificationSound(!settings.notificationSound)}
              className={`w-10 h-6 rounded-full transition-colors relative ${settings.notificationSound ? 'bg-accent' : 'bg-bg-tertiary'}`}>
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${settings.notificationSound ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Auto-Save Forms</div>
              <div className="text-xs text-text-muted">Automatically save form drafts</div>
            </div>
            <button onClick={() => settings.setAutoSaveForms(!settings.autoSaveForms)}
              className={`w-10 h-6 rounded-full transition-colors relative ${settings.autoSaveForms ? 'bg-accent' : 'bg-bg-tertiary'}`}>
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${settings.autoSaveForms ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="card">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">Data & Privacy</h3>
        <div className="space-y-3">
          <button onClick={handleExportAll} disabled={isExporting} className="w-full flex items-center justify-between p-3 bg-bg-primary rounded-lg hover:bg-bg-hover transition-colors">
            <div className="flex items-center gap-3">
              {isExporting ? <Loader2 size={18} className="animate-spin text-accent" /> : <Download size={18} className="text-accent" />}
              <div className="text-left"><div className="text-sm font-medium">Export All My Data</div><div className="text-xs text-text-muted">Download all reports, cases, evidence, and more</div></div>
            </div>
            <span className="text-text-muted">&rarr;</span>
          </button>
          <button onClick={() => {
            const exportData = {
              settings: {
                theme: settings.theme, density: settings.density, defaultPage: settings.defaultPage,
                notificationSound: settings.notificationSound, autoSaveForms: settings.autoSaveForms,
                showAnimations: settings.showAnimations, itemsPerPage: settings.itemsPerPage,
                language: settings.language, timezone: settings.timezone,
                dateFormat: settings.dateFormat, timeFormat: settings.timeFormat,
              },
              preferences: settings.sidebarCategories,
              exportedAt: new Date().toISOString(),
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `icmp-settings-${new Date().toISOString().slice(0, 10)}.json`;
            a.click(); URL.revokeObjectURL(url);
            toast.success('Settings exported');
          }} className="w-full flex items-center justify-between p-3 bg-bg-primary rounded-lg hover:bg-bg-hover transition-colors">
            <div className="flex items-center gap-3">
              <Download size={18} className="text-accent" />
              <div className="text-left"><div className="text-sm font-medium">Export Settings</div><div className="text-xs text-text-muted">Download your configuration as JSON</div></div>
            </div>
            <span className="text-text-muted">&rarr;</span>
          </button>
          <button onClick={() => setShowReset(true)} className="w-full flex items-center justify-between p-3 bg-bg-primary rounded-lg hover:bg-bg-hover transition-colors">
            <div className="flex items-center gap-3">
              <RefreshCw size={18} className="text-amber-400" />
              <div className="text-left"><div className="text-sm font-medium">Reset to Defaults</div><div className="text-xs text-text-muted">Restore all settings to factory defaults</div></div>
            </div>
            <span className="text-text-muted">&rarr;</span>
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="card">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">System Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <Shield size={16} />, label: 'ICMP', value: 'v1.0.0', color: 'text-accent' },
            { icon: <Database size={16} />, label: 'Database', value: 'PostgreSQL', color: 'text-purple-400' },
            { icon: <HardDrive size={16} />, label: 'API', value: 'Express', color: 'text-emerald-400' },
            { icon: <Monitor size={16} />, label: 'Frontend', value: 'React + TS', color: 'text-amber-400' },
          ].map((item, i) => (
            <div key={i} className="bg-bg-primary rounded-lg p-3 text-center">
              <div className={`mx-auto mb-1 ${item.color}`}>{item.icon}</div>
              <div className="text-sm font-bold">{item.value}</div>
              <div className="text-[10px] text-text-muted">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Account */}
      <div className="card border-accent-danger/30">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">Account</h3>
        <div className="space-y-3">
          <button onClick={() => setShowLogout(true)} className="w-full flex items-center justify-between p-3 bg-bg-primary rounded-lg hover:bg-accent-danger/10 transition-colors">
            <div className="flex items-center gap-3">
              <LogOut size={18} className="text-accent-danger" />
              <div className="text-left"><div className="text-sm font-medium text-accent-danger">Sign Out</div><div className="text-xs text-text-muted">Log out of your account</div></div>
            </div>
            <span className="text-text-muted">&rarr;</span>
          </button>
          <button onClick={() => setShowDeleteAccount(true)} className="w-full flex items-center justify-between p-3 bg-bg-primary rounded-lg hover:bg-accent-danger/10 transition-colors">
            <div className="flex items-center gap-3">
              <UserX size={18} className="text-accent-danger" />
              <div className="text-left"><div className="text-sm font-medium text-accent-danger">Delete Account</div><div className="text-xs text-text-muted">Permanently remove your account and data</div></div>
            </div>
            <span className="text-text-muted">&rarr;</span>
          </button>
        </div>
      </div>

      <ConfirmDialog isOpen={showLogout} onClose={() => setShowLogout(false)} onConfirm={handleLogout}
        title="Sign Out" message="Are you sure you want to sign out?" confirmLabel="Sign Out" variant="danger" isLoading={isLoading} />
      <ConfirmDialog isOpen={showReset} onClose={() => setShowReset(false)} onConfirm={handleReset}
        title="Reset Settings" message="This will restore all settings to their factory defaults. Your data will not be affected." confirmLabel="Reset" variant="danger" />

      <ConfirmDialog isOpen={showDeleteAccount} onClose={() => { setShowDeleteAccount(false); setDeletePassword(''); }} onConfirm={handleDeleteAccount}
        title="Delete Account" confirmLabel="Delete My Account" variant="danger" isLoading={isDeleting}
        message="This action is permanent and cannot be undone. Your personal data will be anonymized and your account will be deactivated.">
        <div className="mt-3">
          <label className="block text-xs font-medium text-text-secondary mb-1">Enter your password to confirm</label>
          <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
            className="input w-full" placeholder="Your password" />
        </div>
      </ConfirmDialog>
    </div>
  );
}
