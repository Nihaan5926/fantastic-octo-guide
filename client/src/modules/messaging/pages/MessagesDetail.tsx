import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useMessagingStore } from '../store';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import Modal from '../../../components/common/Modal';
import { FormInput } from '../../../components/common/FormComponents';

const statusColorMap: Record<string, string> = {
  ACTIVE: 'green', ARCHIVED: 'gray', INACTIVE: 'yellow',
};

export default function MessagesDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedChannel, members, isLoading, fetchChannel, fetchMembers, addMember, removeMember } = useMessagingStore();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newUserRole, setNewUserRole] = useState('member');

  useEffect(() => {
    if (id) {
      fetchChannel(id);
      fetchMembers(id);
    }
  }, [id, fetchChannel, fetchMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newUserId.trim()) return;
    try {
      await addMember(id, { user_id: newUserId.trim(), role: newUserRole });
      toast.success('Member added');
      setAddModalOpen(false);
      setNewUserId('');
      setNewUserRole('member');
    } catch {
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!id) return;
    try {
      await removeMember(id, memberId);
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  if (isLoading && !selectedChannel) {
    return <div className="card text-center py-16"><div className="animate-pulse text-text-muted">Loading...</div></div>;
  }
  if (!selectedChannel) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Channel not found.</p>
        <button onClick={() => navigate('/messages')} className="btn-secondary mt-4">Back to Messages</button>
      </div>
    );
  }

  const ch = selectedChannel;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{ch.name}</h2>
          <div className="flex items-center gap-2">
            {ch.classification && <ClassificationBadge level={ch.classification} />}
            {ch.status && <StatusBadge label={ch.status} color={statusColorMap[ch.status] || 'gray'} />}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Name</span>
            <p className="text-sm mt-0.5">{ch.name || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Type</span>
            <p className="text-sm mt-0.5">{ch.classification || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Status</span>
            <p className="text-sm mt-0.5"><StatusBadge label={ch.status || 'N/A'} color={statusColorMap[ch.status] || 'gray'} /></p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Created By</span>
            <p className="text-sm mt-0.5">{ch.created_by || '—'}</p>
          </div>
        </div>
        {ch.description && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Description</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{ch.description}</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Members ({members.length})</h3>
          <button onClick={() => setAddModalOpen(true)} className="btn-secondary text-xs flex items-center gap-1 py-1 px-2.5">
            <Plus size={14} /> Add Member
          </button>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No members in this channel.</p>
        ) : (
          <div className="space-y-1">
            {members.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary">
                <div>
                  <p className="text-sm font-medium">{m.user_name || m.user_id}</p>
                  <p className="text-xs text-text-muted">{m.role || 'member'}</p>
                </div>
                <button onClick={() => handleRemoveMember(m.id)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Member" size="sm">
        <form onSubmit={handleAddMember} className="space-y-4">
          <FormInput label="User ID" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} required placeholder="Enter user ID" />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Role</label>
            <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="input w-full">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setAddModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
