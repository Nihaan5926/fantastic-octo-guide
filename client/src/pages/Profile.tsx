import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { User, Shield, Mail, Calendar, Key, Bell, Save, Loader2, Eye, EyeOff, BadgeCheck, Clock, Smartphone, Monitor, XCircle, Copy, RefreshCw, Check, Trash2 } from 'lucide-react';
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

export default function ProfilePage() {
  const { user, fetchProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | '2fa' | 'sessions'>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '', rank: '', clearance: '' });

  // Password form
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    reportUpdates: true, caseUpdates: true, threatAlerts: true,
    missionChanges: false, systemNotices: true, briefingReminders: false,
  });

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpToken, setTotpToken] = useState('');
  const [is2faLoading, setIs2faLoading] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sessions state
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<SessionInfo | null>(null);

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
        setNotifPrefs((prev) => ({ ...prev, ...meta.notifications }));
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

  const toggleNotif = (key: keyof typeof notifPrefs) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ─── 2FA Handlers ───

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

  // Generate QR code on canvas when setup is done
  useEffect(() => {
    if (totpSetup && canvasRef.current) {
      toCanvas(canvasRef.current, totpSetup.otpauthUrl, { width: 200, margin: 1 });
    }
  }, [totpSetup]);

  // ─── Sessions Handlers ───

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

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    }
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
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

      {/* Profile Card */}
      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-white font-bold text-xl shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
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

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border mb-6 overflow-x-auto">
          {(['profile', 'password', '2fa', 'notifications', 'sessions'] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
              {t === 'profile' ? 'Edit Profile' : t === 'password' ? 'Security' : t === '2fa' ? 'Two-Factor Auth' : t === 'notifications' ? 'Notifications' : 'Sessions'}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
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

        {/* Password Tab */}
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

        {/* Two-Factor Auth Tab */}
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
                <button
                  onClick={() => setShowDisableConfirm(true)}
                  disabled={is2faLoading}
                  className="btn-primary bg-accent-danger hover:bg-accent-danger/80"
                >
                  {is2faLoading ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
                  Disable 2FA
                </button>
              </div>
            ) : totpSetup ? (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
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
                  <input
                    type="text"
                    value={totpToken}
                    onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input text-center text-xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
                <button onClick={handleEnable2FA} disabled={is2faLoading || totpToken.length !== 6} className="btn-primary">
                  {is2faLoading ? <Loader2 className="animate-spin" size={16} /> : <Shield size={16} />}
                  Enable 2FA
                </button>
                <button onClick={() => { setTotpSetup(null); setTotpToken(''); }} className="btn-secondary text-sm">Cancel</button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-text-secondary mb-4">
                  Add an extra layer of security to your account by requiring a code from an authenticator app when you sign in.
                </p>
                <button onClick={handleSetup2FA} disabled={is2faLoading} className="btn-primary">
                  {is2faLoading ? <Loader2 className="animate-spin" size={16} /> : <Smartphone size={16} />}
                  Setup Two-Factor Authentication
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary mb-4">Choose which notifications you want to receive.</p>
            {[
              { key: 'reportUpdates' as const, label: 'Report Updates', desc: 'When reports are created, updated, or reviewed' },
              { key: 'caseUpdates' as const, label: 'Case Updates', desc: 'Case status changes and new assignments' },
              { key: 'threatAlerts' as const, label: 'Threat Alerts', desc: 'New threat actors and high-confidence indicators' },
              { key: 'missionChanges' as const, label: 'Mission Updates', desc: 'Mission plan changes and briefs' },
              { key: 'systemNotices' as const, label: 'System Notices', desc: 'Platform announcements and maintenance' },
              { key: 'briefingReminders' as const, label: 'Briefing Reminders', desc: 'Upcoming briefings and read receipts' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-text-muted">{item.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotif(item.key)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${notifPrefs[item.key] ? 'bg-accent' : 'bg-bg-tertiary'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${notifPrefs[item.key] ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
            <button onClick={handleNotifSave} disabled={isSaving} className="btn-primary mt-4">
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Bell size={16} />}
              Save Preferences
            </button>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">Manage your active sessions. Revoke any sessions you don't recognize.</p>
              <button onClick={fetchSessions} disabled={isSessionsLoading} className="btn-secondary text-sm">
                <RefreshCw size={14} className={isSessionsLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {isSessionsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin mx-auto mb-2 text-text-muted" size={24} />
                <p className="text-sm text-text-muted">Loading sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <Monitor size={32} className="mx-auto mb-2 text-text-muted" />
                <p className="text-sm text-text-muted">No active sessions found</p>
              </div>
            ) : (
              <>
                {sessions.filter((s) => s.is_current).length > 1 && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowRevokeAllConfirm(true)}
                      className="btn-secondary text-sm text-accent-danger"
                    >
                      <XCircle size={14} />
                      Revoke All Other Sessions
                    </button>
                  </div>
                )}
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-4 rounded-xl border ${session.is_current ? 'border-accent bg-accent/5' : 'border-border bg-bg-primary'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Monitor size={18} className={session.is_current ? 'text-accent' : 'text-text-muted'} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{parseBrowser(session.user_agent)}</span>
                              {session.is_current && (
                                <span className="badge bg-accent text-white text-[10px]">Current</span>
                              )}
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">
                              {session.ip_address || 'Unknown IP'} · Created {formatDate(session.created_at)}
                            </p>
                            <p className="text-xs text-text-muted">
                              Expires {formatDate(session.expires_at)}
                            </p>
                          </div>
                        </div>
                        {!session.is_current && (
                          <button
                            onClick={() => setRevokeTarget(session)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"
                            title="Revoke session"
                          >
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
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={showDisableConfirm}
        onClose={() => setShowDisableConfirm(false)}
        onConfirm={handleDisable2FA}
        title="Disable Two-Factor Authentication"
        message="Are you sure you want to disable 2FA? Your account will be less secure."
        confirmLabel="Disable 2FA"
        variant="danger"
        isLoading={is2faLoading}
      />

      <ConfirmDialog
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && handleRevokeSession(revokeTarget.id)}
        title="Revoke Session"
        message={`Revoke session from ${revokeTarget?.ip_address || 'unknown IP'} (${parseBrowser(revokeTarget?.user_agent || null)})?`}
        confirmLabel="Revoke"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showRevokeAllConfirm}
        onClose={() => setShowRevokeAllConfirm(false)}
        onConfirm={handleRevokeAllSessions}
        title="Revoke All Other Sessions"
        message="This will sign out all your other active sessions. Your current session will remain active."
        confirmLabel="Revoke All Others"
        variant="danger"
      />
    </div>
  );
}
