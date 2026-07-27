import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { User, Shield, Mail, Calendar, Key, Bell, Save, Loader2, Eye, EyeOff, BadgeCheck, Clock, Smartphone, Monitor, XCircle, Copy, RefreshCw, Check, Trash2, Camera, Activity, Zap, Download, Plus, Code } from 'lucide-react';
import { toCanvas } from 'qrcode';
import { useAuthStore } from '../store/authStore';
import PageHeader from '../components/common/PageHeader';
import { FormInput, FormSelect } from '../components/common/FormComponents';
import { ClassificationBadge, StatusBadge } from '../components/common/Badges';
import ConfirmDialog from '../components/common/ConfirmDialog';
import api from '../api/client';

interface SessionInfo {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  is_current: boolean;
}

interface ActivityEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  changes: any;
  source: string;
  createdAt: string;
}

type NotifKey = 'reportUpdates' | 'caseUpdates' | 'threatAlerts' | 'missionChanges' | 'systemNotices' | 'briefingReminders';

interface NotifChannel {
  inApp: boolean;
  email: boolean;
  digest: 'instant' | 'daily' | 'weekly';
}

type NotifPrefs = Record<NotifKey, NotifChannel>;

const DEFAULT_CHANNEL: NotifChannel = { inApp: false, email: false, digest: 'instant' };

export default function ProfilePage() {
  const { user, fetchProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | '2fa' | 'sessions' | 'activity' | 'apiKeys'>('profile');
  const [isSaving, setIsSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '', rank: '', clearance: '' });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    reportUpdates: { ...DEFAULT_CHANNEL, inApp: true },
    caseUpdates: { ...DEFAULT_CHANNEL, inApp: true },
    threatAlerts: { ...DEFAULT_CHANNEL, inApp: true },
    missionChanges: { ...DEFAULT_CHANNEL },
    systemNotices: { ...DEFAULT_CHANNEL, inApp: true },
    briefingReminders: { ...DEFAULT_CHANNEL },
  });

  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpToken, setTotpToken] = useState('');
  const [is2faLoading, setIs2faLoading] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<SessionInfo | null>(null);

  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lastUserId = React.useRef<string | null>(null);

  useEffect(() => {
    if (user && user.id !== lastUserId.current) {
      lastUserId.current = user.id;
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        rank: user.rank || '',
        clearance: user.clearance || 'UNCLASSIFIED',
      });
      setTotpEnabled(user.totpEnabled || false);
      let meta = (user as any).metadata;
      if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch {} }
      if (meta?.notifications) {
        const saved = meta.notifications as Record<string, Partial<NotifChannel>>;
        setNotifPrefs((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next) as NotifKey[]) {
            if (saved[key]) {
              next[key] = { ...DEFAULT_CHANNEL, ...saved[key] };
            }
          }
          return next;
        });
      }
    }
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.patch('/auth/me', profileForm);
      await fetchProfile();
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Avatar uploaded');
      await fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsSaving(true);
    try {
      await api.patch('/auth/me', { password: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotifSave = async () => {
    setIsSaving(true);
    try {
      await api.patch('/auth/me', { metadata: { notifications: notifPrefs } });
      await fetchProfile();
      toast.success('Notification preferences saved');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleInApp = (key: NotifKey) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: { ...prev[key], inApp: !prev[key].inApp } }));
  };

  const toggleEmail = (key: NotifKey) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: { ...prev[key], email: !prev[key].email } }));
  };

  const setDigest = (key: NotifKey, digest: NotifChannel['digest']) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: { ...prev[key], digest } }));
  };

  const handleSetup2FA = async () => {
    setIs2faLoading(true);
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setTotpSetup(data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to setup 2FA');
    } finally {
      setIs2faLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (totpToken.length !== 6) {
      toast.error('Enter a valid 6-digit code');
      return;
    }
    setIs2faLoading(true);
    try {
      await api.post('/auth/2fa/enable', { token: totpToken });
      setTotpEnabled(true);
      setTotpSetup(null);
      setTotpToken('');
      await fetchProfile();
      toast.success('2FA enabled successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid code');
    } finally {
      setIs2faLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setIs2faLoading(true);
    try {
      await api.post('/auth/2fa/disable');
      setTotpEnabled(false);
      setTotpSetup(null);
      setTotpToken('');
      setShowDisableConfirm(false);
      await fetchProfile();
      toast.success('2FA disabled');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setIs2faLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  useEffect(() => {
    if (totpSetup && canvasRef.current) {
      toCanvas(canvasRef.current, totpSetup.otpauthUrl, { width: 200, margin: 1 });
    }
  }, [totpSetup]);

  const fetchSessions = async () => {
    setIsSessionsLoading(true);
    try {
      const { data } = await api.get('/auth/sessions');
      setSessions(data.data || []);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setIsSessionsLoading(false);
    }
  };

  const fetchActivity = async () => {
    setIsActivityLoading(true);
    try {
      const { data } = await api.get('/auth/activity');
      setActivityLog(data.data || []);
    } catch {
      toast.error('Failed to load activity');
    } finally {
      setIsActivityLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions();
    if (activeTab === 'activity') fetchActivity();
    if (activeTab === 'apiKeys') fetchApiKeys();
  }, [activeTab]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setRevokeTarget(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await api.delete('/auth/sessions');
      setSessions((prev) => prev.filter((s) => s.is_current));
      toast.success('All other sessions revoked');
    } catch {
      toast.error('Failed to revoke sessions');
    } finally {
      setShowRevokeAllConfirm(false);
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; scopes: string[]; last_used_at: string | null; expires_at: string | null; is_active: boolean; created_at: string }[]>([]);
  const [isApiKeysLoading, setIsApiKeysLoading] = useState(false);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    setIsApiKeysLoading(true);
    try {
      const { data } = await api.get('/admin/api-keys');
      setApiKeys(data.data || []);
    } catch {
      toast.error('Failed to load API keys');
    } finally {
      setIsApiKeysLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    try {
      const scopes = newKeyScopes.split(',').map((s) => s.trim()).filter(Boolean);
      const { data } = await api.post('/admin/api-keys', { name: newKeyName, scopes });
      setCreatedKey(data.key);
      setShowCreateKey(false);
      setNewKeyName('');
      setNewKeyScopes('');
      fetchApiKeys();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create API key');
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    try {
      await api.delete(`/admin/api-keys/${id}`);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success('API key revoked');
    } catch {
      toast.error('Failed to revoke API key');
    }
  };

  const formatRelative = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const parseBrowser = (ua: string | null) => {
    if (!ua) return 'Unknown';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome') && ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return ua.split(' ')[0] || 'Unknown';
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Profile & Settings" subtitle="Manage your account, security, and preferences" />

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="relative group cursor-pointer"
              title="Upload avatar"
            >
              {user?.avatarUrl ? (
                <img
                  src={`/${user.avatarUrl}`}
                  alt="Avatar"
                  className="w-16 h-16 rounded-2xl object-cover max-w-[200px] max-h-[200px]"
                  style={{ maxWidth: 200, maxHeight: 200 }}
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-white font-bold text-xl shrink-0">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploadingAvatar ? <Loader2 size={20} className="animate-spin text-white" /> : <Camera size={20} className="text-white" />}
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleAvatarUpload} className="hidden" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user?.firstName} {user?.lastName}</h2>
            <p className="text-sm text-text-secondary">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge label={user?.role || ''} color={user?.role === 'ADMIN' ? 'red' : 'blue'} />
              <ClassificationBadge level={user?.clearance || ''} />
              {totpEnabled && <StatusBadge label="2FA" color="green" />}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-bg-primary rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-accent">{user?.role || '—'}</div>
            <div className="text-[10px] text-text-muted uppercase">Role</div>
          </div>
          <div className="bg-bg-primary rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-accent">{user?.clearance?.replace('_', ' ') || '—'}</div>
            <div className="text-[10px] text-text-muted uppercase">Clearance</div>
          </div>
          <div className="bg-bg-primary rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-accent">{(user?.permissions || []).length}</div>
            <div className="text-[10px] text-text-muted uppercase">Permissions</div>
          </div>
          <div className="bg-bg-primary rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-accent">{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '—'}</div>
            <div className="text-[10px] text-text-muted uppercase">Last Login</div>
          </div>
        </div>

        <div className="flex gap-2 border-b border-border mb-6 overflow-x-auto">
          {(['profile', 'password', '2fa', 'notifications', 'sessions', 'activity', 'apiKeys'] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
              {t === 'profile' ? 'Edit Profile' : t === 'password' ? 'Security' : t === '2fa' ? 'Two-Factor Auth' : t === 'notifications' ? 'Notifications' : t === 'sessions' ? 'Sessions' : t === 'activity' ? 'Activity Log' : 'API Keys'}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="First Name" value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} required />
              <FormInput label="Last Name" value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} required />
            </div>
            <FormInput label="Email" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="Rank" value={profileForm.rank} onChange={(e) => setProfileForm({ ...profileForm, rank: e.target.value })} />
              <FormSelect label="Clearance" options={[
                { value: 'UNCLASSIFIED', label: 'Unclassified' }, { value: 'CONFIDENTIAL', label: 'Confidential' },
                { value: 'SECRET', label: 'Secret' }, { value: 'TOP_SECRET', label: 'Top Secret' },
              ]} value={profileForm.clearance} onChange={(e) => setProfileForm({ ...profileForm, clearance: e.target.value })} />
            </div>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save Changes
            </button>
          </form>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <FormInput label="Current Password" type={showPw.current ? 'text' : 'password'} value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
            <FormInput label="New Password" type={showPw.new ? 'text' : 'password'} value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
            <div className="relative">
              <FormInput label="Confirm New Password" type={showPw.confirm ? 'text' : 'password'} value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
            </div>
            <p className="text-xs text-text-muted">Password must be at least 8 characters.</p>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Key size={16} />}
              Change Password
            </button>
          </form>
        )}

        {activeTab === '2fa' && (
          <div className="space-y-6 max-w-md">
            {totpEnabled ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Check size={16} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Two-factor authentication is enabled</p>
                    <p className="text-xs text-text-muted">Your account is protected with an authenticator app</p>
                  </div>
                </div>
                <button onClick={() => setShowDisableConfirm(true)} disabled={is2faLoading} className="btn-primary bg-accent-danger hover:bg-accent-danger/80">
                  {is2faLoading ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
                  Disable 2FA
                </button>
              </div>
            ) : totpSetup ? (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">Scan this QR code with your authenticator app</p>
                <div className="flex justify-center bg-white p-4 rounded-xl">
                  <canvas ref={canvasRef}></canvas>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Or enter this code manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-bg-primary rounded-lg px-3 py-2 text-sm font-mono break-all">{totpSetup.secret}</code>
                    <button onClick={() => copyToClipboard(totpSetup.secret)} className="p-2 rounded-lg hover:bg-bg-hover text-text-secondary">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Enter verification code from your app</label>
                  <input type="text" value={totpToken} onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))} className="input text-center text-xl tracking-widest" placeholder="000000" maxLength={6} />
                </div>
                <button onClick={handleEnable2FA} disabled={is2faLoading || totpToken.length !== 6} className="btn-primary">
                  {is2faLoading ? <Loader2 className="animate-spin" size={16} /> : <Shield size={16} />}
                  Enable 2FA
                </button>
                <button onClick={() => { setTotpSetup(null); setTotpToken(''); }} className="btn-secondary text-sm">Cancel</button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-text-secondary mb-4">Add an extra layer of security to your account by requiring a code from an authenticator app when you sign in.</p>
                <button onClick={handleSetup2FA} disabled={is2faLoading} className="btn-primary">
                  {is2faLoading ? <Loader2 className="animate-spin" size={16} /> : <Smartphone size={16} />}
                  Setup Two-Factor Authentication
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary mb-4">Choose which notifications you want to receive and how.</p>
            {([
              { key: 'reportUpdates' as const, label: 'Report Updates', desc: 'When reports are created, updated, or reviewed' },
              { key: 'caseUpdates' as const, label: 'Case Updates', desc: 'Case status changes and new assignments' },
              { key: 'threatAlerts' as const, label: 'Threat Alerts', desc: 'New threat actors and high-confidence indicators' },
              { key: 'missionChanges' as const, label: 'Mission Updates', desc: 'Mission plan changes and briefs' },
              { key: 'systemNotices' as const, label: 'System Notices', desc: 'Platform announcements and maintenance' },
              { key: 'briefingReminders' as const, label: 'Briefing Reminders', desc: 'Upcoming briefings and read receipts' },
            ]).map((item) => (
              <div key={item.key} className="p-4 bg-bg-primary rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-text-muted">{item.desc}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-text-secondary">
                    <button
                      type="button"
                      onClick={() => toggleInApp(item.key)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${notifPrefs[item.key].inApp ? 'bg-accent' : 'bg-bg-tertiary'}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${notifPrefs[item.key].inApp ? 'translate-x-4.5' : 'translate-x-0.5'}`} style={{ transform: notifPrefs[item.key].inApp ? 'translateX(14px)' : 'translateX(2px)' }} />
                    </button>
                    In-App
                  </label>
                  <label className="flex items-center gap-2 text-xs text-text-secondary">
                    <button
                      type="button"
                      onClick={() => toggleEmail(item.key)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${notifPrefs[item.key].email ? 'bg-accent' : 'bg-bg-tertiary'}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform`} style={{ transform: notifPrefs[item.key].email ? 'translateX(14px)' : 'translateX(2px)' }} />
                    </button>
                    Email
                  </label>
                  <select
                    value={notifPrefs[item.key].digest}
                    onChange={(e) => setDigest(item.key, e.target.value as NotifChannel['digest'])}
                    className="text-xs bg-bg-secondary border border-border rounded px-2 py-1 text-text-primary"
                  >
                    <option value="instant">Instant</option>
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Digest</option>
                  </select>
                </div>
              </div>
            ))}
            <button onClick={handleNotifSave} disabled={isSaving} className="btn-primary mt-4">
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Bell size={16} />}
              Save Preferences
            </button>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">Manage your active sessions.</p>
              <button onClick={fetchSessions} disabled={isSessionsLoading} className="btn-secondary text-sm">
                <RefreshCw size={14} className={isSessionsLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {isSessionsLoading ? (
              <div className="text-center py-8"><Loader2 className="animate-spin mx-auto mb-2 text-text-muted" size={24} /><p className="text-sm text-text-muted">Loading sessions...</p></div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8"><Monitor size={32} className="mx-auto mb-2 text-text-muted" /><p className="text-sm text-text-muted">No active sessions found</p></div>
            ) : (
              <>
                {sessions.filter((s) => s.is_current).length > 1 && (
                  <div className="flex justify-end">
                    <button onClick={() => setShowRevokeAllConfirm(true)} className="btn-secondary text-sm text-accent-danger">
                      <XCircle size={14} /> Revoke All Other Sessions
                    </button>
                  </div>
                )}
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className={`p-4 rounded-xl border ${session.is_current ? 'border-accent bg-accent/5' : 'border-border bg-bg-primary'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Monitor size={18} className={session.is_current ? 'text-accent' : 'text-text-muted'} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{parseBrowser(session.user_agent)}</span>
                              {session.is_current && <span className="badge bg-accent text-white text-[10px]">Current</span>}
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">{session.ip_address || 'Unknown IP'} · Created {formatDate(session.created_at)}</p>
                            <p className="text-xs text-text-muted">Expires {formatDate(session.expires_at)}</p>
                          </div>
                        </div>
                        {!session.is_current && (
                          <button onClick={() => setRevokeTarget(session)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400" title="Revoke session">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            ...(activity content as shown above)...
          </div>
        )}

        {activeTab === 'apiKeys' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">Manage your API keys for programmatic access.</p>
              <button onClick={fetchApiKeys} disabled={isApiKeysLoading} className="btn-secondary text-sm">
                <RefreshCw size={14} className={isApiKeysLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {createdKey && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Check size={16} className="text-green-400" />
                  <span className="text-sm font-medium text-green-400">API Key Created</span>
                </div>
                <p className="text-xs text-text-muted mb-2">Copy this key now. You won't be able to see it again.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-bg-primary rounded-lg px-3 py-2 text-xs font-mono break-all select-all">{createdKey}</code>
                  <button onClick={() => { copyToClipboard(createdKey); setCreatedKey(null); }} className="p-2 rounded-lg hover:bg-bg-hover text-text-secondary">
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={() => setShowCreateKey(!showCreateKey)} className="btn-primary text-sm">
                <Plus size={14} /> Create API Key
              </button>
            </div>

            {showCreateKey && (
              <div className="p-4 bg-bg-primary rounded-xl border border-border space-y-3">
                <FormInput label="Key Name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. CI/CD Pipeline" />
                <FormInput label="Scopes (comma-separated)" value={newKeyScopes} onChange={(e) => setNewKeyScopes(e.target.value)} placeholder="reports:read, cases:read" />
                <div className="flex gap-2">
                  <button onClick={handleCreateApiKey} disabled={!newKeyName} className="btn-primary text-sm">Create</button>
                  <button onClick={() => setShowCreateKey(false)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}

            {isApiKeysLoading ? (
              <div className="text-center py-8"><Loader2 className="animate-spin mx-auto mb-2 text-text-muted" size={24} /><p className="text-sm text-text-muted">Loading API keys...</p></div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8"><Code size={32} className="mx-auto mb-2 text-text-muted" /><p className="text-sm text-text-muted">No API keys created yet</p></div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className={`p-4 rounded-xl border ${key.is_active ? 'border-border bg-bg-primary' : 'border-red-500/30 bg-red-500/5'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Code size={16} className="text-text-muted" />
                          <span className="text-sm font-medium">{key.name}</span>
                          {!key.is_active && <span className="badge bg-red-500/20 text-red-400 text-[10px]">Revoked</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(key.scopes || []).map((s) => (
                            <span key={s} className="badge bg-bg-tertiary text-text-muted text-[10px]">{s}</span>
                          ))}
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                          Created {formatDate(key.created_at)}
                          {key.last_used_at && ` · Last used ${formatDate(key.last_used_at)}`}
                          {key.expires_at && ` · Expires ${formatDate(key.expires_at)}`}
                        </p>
                      </div>
                      {key.is_active && (
                        <button onClick={() => handleRevokeApiKey(key.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400" title="Revoke key">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog isOpen={showDisableConfirm} onClose={() => setShowDisableConfirm(false)} onConfirm={handleDisable2FA}
        title="Disable Two-Factor Authentication" message="Are you sure you want to disable 2FA? Your account will be less secure." confirmLabel="Disable 2FA" variant="danger" isLoading={is2faLoading} />
      <ConfirmDialog isOpen={!!revokeTarget} onClose={() => setRevokeTarget(null)} onConfirm={() => revokeTarget && handleRevokeSession(revokeTarget.id)}
        title="Revoke Session" message={`Revoke session from ${revokeTarget?.ip_address || 'unknown IP'} (${parseBrowser(revokeTarget?.user_agent || null)})?`} confirmLabel="Revoke" variant="danger" />
      <ConfirmDialog isOpen={showRevokeAllConfirm} onClose={() => setShowRevokeAllConfirm(false)} onConfirm={handleRevokeAllSessions}
        title="Revoke All Other Sessions" message="This will sign out all your other active sessions. Your current session will remain active." confirmLabel="Revoke All Others" variant="danger" />
    </div>
  );
}
