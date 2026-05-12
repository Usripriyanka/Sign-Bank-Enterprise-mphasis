import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/Layout/AdminLayout';
import Modal from '../../components/ui/Modal';
import { useData } from '../../context/DataContext';
import { createCommand, updateCommand, deleteCommand } from '../../api/adminApi';
import type { Command } from '../../types';
import './ManageTable.css';

export default function ManageCommands() {
  const { commands, pages, refreshCommands } = useData();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Command | null>(null);
  const [form, setForm] = useState({ commandName: '', commandDescription: '', pageId: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm({ commandName: '', commandDescription: '', pageId: pages[0]?.pageId || '' });
    setShowModal(true);
  };

  const openEdit = (c: Command) => {
    setEditing(c);
    setForm({
      commandName: c.commandName,
      commandDescription: c.commandDescription,
      pageId: c.page?.pageId ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.commandName.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCommand(editing.commandId, {
          commandName: form.commandName,
          commandDescription: form.commandDescription,
          pageId: form.pageId,
        });
      } else {
        await createCommand({
          commandName: form.commandName,
          commandDescription: form.commandDescription,
          pageId: form.pageId,
        });
      }
      await refreshCommands();
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!window.confirm(`Delete command "${editing.commandName}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteCommand(editing.commandId);
      await refreshCommands();
      setShowModal(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="manage-page">
        <div className="manage-header">
          <div><h1>Manage Commands</h1><p>View and edit commands.</p></div>
          <div className="header-actions">
            <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>← Back</button>
            <button className="add-btn" onClick={openAdd}>+ Add Command</button>
          </div>
        </div>

        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Command ID</th>
                <th>Command Name</th>
                <th>Description</th>
                <th>Page ID</th>
                <th>Page Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {commands.map(c => (
                <tr key={c.commandId}>
                  <td>{c.commandId}</td>
                  <td>{c.commandName}</td>
                  <td>{c.commandDescription}</td>
                  <td>{c.page?.pageId}</td>
                  <td><strong>{c.page?.pageName}</strong></td>
                  <td className="actions-cell">
                    <button className="action-btn edit" onClick={() => openEdit(c)}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Command' : 'Add Command'} onClose={() => setShowModal(false)}>
          <div className="form-group">
            <label>Command Name</label>
            <input
              value={form.commandName}
              onChange={e => setForm(f => ({ ...f, commandName: e.target.value }))}
              placeholder="e.g. Check Balance"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              value={form.commandDescription}
              onChange={e => setForm(f => ({ ...f, commandDescription: e.target.value }))}
              placeholder="e.g. Used to check balance"
            />
          </div>
          <div className="form-group">
            <label>Page</label>
            <select
              value={form.pageId}
              onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))}
            >
              {pages.map(p => (
                <option key={p.pageId} value={p.pageId}>{p.pageId} - {p.pageName}</option>
              ))}
            </select>
          </div>
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