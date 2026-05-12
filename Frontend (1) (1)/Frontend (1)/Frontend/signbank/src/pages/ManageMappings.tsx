import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/Layout/AdminLayout';
import Modal from '../../components/ui/Modal';
import { useData } from '../../context/DataContext';
import { updateMapping, deleteMapping } from '../../api/adminApi';
import type { CommandMapping } from '../../types';
import './ManageMappings.css';

export default function ManageMappings() {
  const { mappings, gestures, commands, pages, refreshMappings } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'R001' | 'R002'>('R001');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CommandMapping | null>(null);
  const [form, setForm] = useState({ gestureId: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filter pages for the active role
  const rolePages = pages.filter(p => p.role?.roleId === activeTab);
  const roleMappings = mappings.filter(m => m.roleId === activeTab && m.userId === null);

  const getGesture = (gid: string) => gestures.find(g => g.gestureId === gid);
  const getPageCommands = (pageId: string) => commands.filter(c => c.page?.pageId === pageId);

  const openEdit = (m: CommandMapping) => {
    setEditing(m);
    setForm({ gestureId: m.gestureId });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      // Use PUT to update the existing mapping — not POST (which creates a duplicate)
      await updateMapping(editing.mapId, {
        gestureId: form.gestureId,
        isActive: editing.isActive,
      });
      await refreshMappings();
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!window.confirm('Remove this mapping?')) return;
    setDeleting(true);
    try {
      await deleteMapping(editing.mapId);
      await refreshMappings();
      setShowModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const roleLabel = activeTab === 'R001' ? 'Operator' : 'Viewer';

  return (
    <AdminLayout>
      <div className="manage-page">
        <div className="manage-header">
          <div><h1>Manage Mapping</h1><p>View and edit mapped Gestures.</p></div>
          <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>← Back</button>
        </div>

        <div className="mapping-tabs">
          <button
            className={`tab-btn ${activeTab === 'R001' ? 'active' : ''}`}
            onClick={() => setActiveTab('R001')}
          >
            Operator
          </button>
          <button
            className={`tab-btn ${activeTab === 'R002' ? 'active' : ''}`}
            onClick={() => setActiveTab('R002')}
          >
            Viewer
          </button>
        </div>

        <div className="mapping-content">
          <h2 className="role-title">{roleLabel}</h2>
          {rolePages.map(page => {
            const pageCommands = getPageCommands(page.pageId);
            return (
              <div key={page.pageId} className="mapping-section">
                <h3 className="page-title">{page.pageName}</h3>
                <table className="data-table">
                  <thead>
                    <tr><th>Command</th><th>Gesture</th><th>Gesture Symbol</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {pageCommands.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ color: '#94a3b8', textAlign: 'center' }}>
                          No commands for this page
                        </td>
                      </tr>
                    ) : pageCommands.map(cmd => {
                      const mapping = roleMappings.find(m => m.commandId === cmd.commandId);
                      const gesture = mapping ? getGesture(mapping.gestureId) : null;
                      return (
                        <tr key={cmd.commandId}>
                          <td>{cmd.commandName}</td>
                          <td>{gesture?.gestureName || '—'}</td>
                          <td className="symbol-cell">{gesture?.gestureSymbol || '—'}</td>
                          <td>
                            {mapping && (
                              <button
                                className="action-btn edit"
                                onClick={() => openEdit(mapping)}
                              >
                                ✏️
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && editing && (
        <Modal title="Edit Mapping" onClose={() => setShowModal(false)}>
          <div className="form-group">
            <label>Command</label>
            <input value={editing.commandName || editing.commandId} disabled />
          </div>
          <div className="form-group">
            <label>Gesture</label>
            <select
              value={form.gestureId}
              onChange={e => setForm(f => ({ ...f, gestureId: e.target.value }))}
            >
              {gestures.map(g => (
                <option key={g.gestureId} value={g.gestureId}>
                  {g.gestureSymbol} {g.gestureName}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}