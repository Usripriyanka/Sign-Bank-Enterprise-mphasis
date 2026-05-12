import { useState } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import Modal from '../../components/ui/Modal';
import { useData } from '../../context/DataContext';
import { createUser, updateUser, deleteUser } from '../../api/adminApi';
import type { User } from '../../types';
import './ManageTable.css';

export default function ManageUsers() {
  const { users, roles, refreshUsers } = useData();
  const nonAdminRoles = roles.filter(r => r.roleName !== 'admin');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', email: '', roleId: 'R001' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm({ username: '', email: '', roleId: nonAdminRoles[0]?.roleId || 'R001' });
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ username: u.username, email: u.email, roleId: u.roleId });
    setShowModal(true);
  };

  const getRoleName = (rid: string) => roles.find(r => r.roleId === rid)?.roleName || rid;

  const handleSave = async () => {
    if (!form.username.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        // Update existing user
        await updateUser(editing.userId, {
          username: form.username,
          email: form.email,
          roleId: form.roleId,
        });
      } else {
        // Create new user
        await createUser({
          userId: form.username,
          username: form.username,
          roleId: form.roleId,
          email: form.email,
        });
      }
      await refreshUsers();
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!window.confirm(`Delete user "${editing.username}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteUser(editing.userId);
      await refreshUsers();
      setShowModal(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="manage-page">
        <div className="manage-header">
          <div>
            <h1>Manage Users</h1>
            <p>New users must set their own password on first login.</p>
          </div>
          <button className="add-btn" onClick={openAdd}>+ Add User</button>
        </div>
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Password Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.userId}>
                  <td>{u.userId}</td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${getRoleName(u.roleId)}`}>
                      {getRoleName(u.roleId)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${u.passwordSet ? 'active' : 'inactive'}`}>
                      {u.passwordSet ? 'Set' : 'Not Set'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="action-btn edit" onClick={() => openEdit(u)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit User' : 'Add User'} onClose={() => setShowModal(false)}>
          <div className="form-group">
            <label>Username (4-digit ID)</label>
            <input
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="e.g. 1003"
              disabled={!!editing}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@signbank.com"
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select
              value={form.roleId}
              onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}
            >
              {nonAdminRoles.map(r => (
                <option key={r.roleId} value={r.roleId}>{r.roleName}</option>
              ))}
            </select>
          </div>
          {!editing && (
            <p className="info-note">Password defaults to DEFAULT. User sets it on first login.</p>
          )}
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            {editing && (
              <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}