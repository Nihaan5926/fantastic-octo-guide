import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { User, Shield, Mail, Calendar, Key, Bell, Save, Loader2, Eye, EyeOff, BadgeCheck, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import PageHeader from '../components/common/PageHeader';
import { FormInput, FormSelect } from '../components/common/FormComponents';
import { ClassificationBadge, StatusBadge } from '../components/common/Badges';
import api from '../api/client';

export default function ProfilePage() {
  const { user, fetchProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications'>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '', rank: '', clearance: '' });
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Password form
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    reportUpdates: true, caseUpdates: true, threatAlerts: true,
    missionChanges: false, systemNotices: true, briefingReminders: false,
  });

  useEffect(() => {
    if (user && !profileLoaded) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        rank: user.rank || '',
        clearance: user.clearance || 'UNCLASSIFIED',
      });
      // Parse metadata - server returns JSONB which may be parsed or string
      let meta = (user as any).metadata;
      if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch {} }
      if (meta?.notifications) {
        setNotifPrefs((prev) => ({ ...prev, ...meta.notifications }));
      }
      setProfileLoaded(true);
    }
  }, [user, profileLoaded]);

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
        <div className="flex gap-2 border-b border-border mb-6">
          {(['profile', 'password', 'notifications'] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
              {t === 'profile' ? 'Edit Profile' : t === 'password' ? 'Security' : 'Notifications'}
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
      </div>
    </div>
  );
}
