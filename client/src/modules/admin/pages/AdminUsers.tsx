import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, Shield, UserCheck, UserX, RefreshCw, Loader2, Search } from 'lucide-react';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge, ClassificationBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useAdminStore } from '../store';

export default function AdminUsers() {
  const { users, usersPagination, roles, isLoading, fetchUsers, createUser, updateUser, deleteUser, fetchRoles, createRole, updateRole, deleteRole } = useAdminStore();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // User form
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ email: '', password: '', firstName: '', lastName: '', roleName: 'VIEWER', clearance: 'UNCLASSIFIED' });
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // Role form
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: ['reports:read'] });
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<any>(null);
  const [permInput, setPermInput] = useState('');

  useEffect(() => { fetchUsers({ page, search }); fetchRoles(); }, [page]);

  const handleSearch = () => { fetchUsers({ page: 1, search }); };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ email: '', password: '', firstName: '', lastName: '', roleName: 'VIEWER', clearance: 'UNCLASSIFIED' });
    setUserModalOpen(true);
  };

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setUserForm({ email: user.email, password: '', firstName: user.first_name, lastName: user.last_name, roleName: user.role_name, clearance: user.clearance });
    setUserModalOpen(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) { await updateUser(editingUser.id, userForm); toast.success('User updated'); }
      else { await createUser(userForm); toast.success('User created'); }
      setUserModalOpen(false); fetchUsers();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '', permissions: ['reports:read'] });
    setRoleModalOpen(true);
  };

  const openEditRole = (role: any) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description || '', permissions: role.permissions || [] });
    setRoleModalOpen(true);
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) { await updateRole(editingRole.id, roleForm); toast.success('Role updated'); }
      else { await createRole(roleForm); toast.success('Role created'); }
      setRoleModalOpen(false); fetchRoles();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const addPermission = () => {
    if (permInput && !roleForm.permissions.includes(permInput)) {
      setRoleForm({ ...roleForm, permissions: [...roleForm.permissions, permInput] });
    }
    setPermInput('');
  };

  const userColumns = [
    { key: 'email', label: 'Email', render: (u: any) => <span className="font-medium">{u.email}</span> },
    { key: 'name', label: 'Name', render: (u: any) => <span>{u.first_name} {u.last_name}</span> },
    { key: 'role_name', label: 'Role', render: (u: any) => <StatusBadge label={u.role_name} color={u.role_name === 'ADMIN' ? 'red' : u.role_name === 'ANALYST' ? 'blue' : 'gray'} /> },
    { key: 'clearance', label: 'Clearance', render: (u: any) => <ClassificationBadge level={u.clearance} /> },
    { key: 'is_active', label: 'Status', render: (u: any) => u.is_active ? <StatusBadge label="Active" color="green" /> : <StatusBadge label="Disabled" color="red" /> },
    { key: 'actions', label: '', render: (u: any) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEditUser(u); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"><Edit size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><UserX size={14} /></button>
      </div>
    )},
  ];

  const roleColumns = [
    { key: 'name', label: 'Role', render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: 'description', label: 'Description' },
    { key: 'userCount', label: 'Users' },
    { key: 'permissions', label: 'Permissions', render: (r: any) => (
      <div className="flex flex-wrap gap-1 max-w-xs">{(r.permissions || []).slice(0, 4).map((p: string) => <span key={p} className="badge bg-bg-tertiary text-text-secondary text-[10px]">{p}</span>)} {(r.permissions || []).length > 4 && <span className="text-xs text-text-muted">+{r.permissions.length - 4}</span>}</div>
    )},
    { key: 'actions', label: '', render: (r: any) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEditRole(r); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"><Edit size={14} /></button>
        {r.name !== 'ADMIN' && <button onClick={(e) => { e.stopPropagation(); setDeleteRoleTarget(r); }} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={14} /></button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Panel" subtitle="User and role management" />

      <div className="flex gap-2 border-b border-border">
        {(['users', 'roles'] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            {t === 'users' ? <><UserCheck size={14} className="inline mr-1.5" /> Users</> : <><Shield size={14} className="inline mr-1.5" /> Roles</>}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <>
          <div className="flex gap-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Search users..." className="flex-1" />
            <button onClick={handleSearch} className="btn-secondary"><Search size={16} /></button>
            <button onClick={openCreateUser} className="btn-primary"><Plus size={16} /> Add User</button>
          </div>
          <DataTable columns={userColumns} data={users} pagination={usersPagination} isLoading={isLoading} onPageChange={(p) => setPage(p)} emptyMessage="No users found" />
        </>
      )}

      {activeTab === 'roles' && (
        <>
          <div className="flex justify-end">
            <button onClick={openCreateRole} className="btn-primary"><Plus size={16} /> Create Role</button>
          </div>
          <DataTable columns={roleColumns} data={roles} isLoading={isLoading} emptyMessage="No roles found" />
        </>
      )}

      {/* User Modal */}
      <Modal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} title={editingUser ? 'Edit User' : 'Create User'}>
        <form onSubmit={handleUserSubmit} className="space-y-4">
          <FormInput label="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required disabled={!!editingUser} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="First Name" value={userForm.firstName} onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} required />
            <FormInput label="Last Name" value={userForm.lastName} onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })} required />
          </div>
          <FormInput label={editingUser ? 'New Password (leave blank to keep)' : 'Password'} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required={!editingUser} />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Role" options={roles.map((r) => ({ value: r.name, label: r.name }))} value={userForm.roleName} onChange={(e) => setUserForm({ ...userForm, roleName: e.target.value })} />
            <FormSelect label="Clearance" options={[{ value: 'UNCLASSIFIED', label: 'Unclassified' }, { value: 'CONFIDENTIAL', label: 'Confidential' }, { value: 'SECRET', label: 'Secret' }, { value: 'TOP_SECRET', label: 'Top Secret' }]} value={userForm.clearance} onChange={(e) => setUserForm({ ...userForm, clearance: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary">{editingUser ? 'Update User' : 'Create User'}</button>
        </form>
      </Modal>

      {/* Role Modal */}
      <Modal isOpen={roleModalOpen} onClose={() => setRoleModalOpen(false)} title={editingRole ? 'Edit Role' : 'Create Role'}>
        <form onSubmit={handleRoleSubmit} className="space-y-4">
          <FormInput label="Role Name" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} required />
          <FormInput label="Description" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Permissions</label>
            <div className="flex flex-wrap gap-1 mb-2">{(roleForm.permissions || []).map((p) => (
              <span key={p} className="badge bg-bg-tertiary text-text-secondary text-xs gap-1.5">
                {p} <button type="button" onClick={() => setRoleForm({ ...roleForm, permissions: roleForm.permissions.filter((x: string) => x !== p) })} className="hover:text-red-400">x</button>
              </span>
            ))}</div>
            <div className="flex gap-2">
              <input value={permInput} onChange={(e) => setPermInput(e.target.value)} placeholder="e.g. reports:read" className="input flex-1 text-sm" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPermission(); } }} />
              <button type="button" onClick={addPermission} className="btn-secondary text-sm">Add</button>
            </div>
            <p className="text-xs text-text-muted mt-1">Quick add: <button type="button" onClick={() => setRoleForm({ ...roleForm, permissions: ['*'] })} className="text-accent hover:underline">Grant all (*)</button></p>
          </div>
          <button type="submit" className="btn-primary">{editingRole ? 'Update Role' : 'Create Role'}</button>
        </form>
      </Modal>

      {/* Delete Confirms */}
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={async () => { if (deleteTarget) { await deleteUser(deleteTarget.id); setDeleteTarget(null); toast.success('User deactivated'); } }} title="Deactivate User" message={`Deactivate ${deleteTarget?.first_name} ${deleteTarget?.last_name}? They will not be able to log in.`} confirmLabel="Deactivate" />
      <ConfirmDialog isOpen={!!deleteRoleTarget} onClose={() => setDeleteRoleTarget(null)} onConfirm={async () => { if (deleteRoleTarget) { try { await deleteRole(deleteRoleTarget.id); setDeleteRoleTarget(null); toast.success('Role deleted'); } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); } } }} title="Delete Role" message={`Delete role "${deleteRoleTarget?.name}"? This cannot be undone if the role is assigned to users.`} confirmLabel="Delete" />
    </div>
  );
}
