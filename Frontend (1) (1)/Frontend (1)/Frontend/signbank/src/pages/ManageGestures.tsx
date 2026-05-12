import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/Layout/AdminLayout';
import Modal from '../../components/ui/Modal';
import { useData } from '../../context/DataContext';
import type { Gesture } from '../../types';
import './ManageTable.css';

import { updateGesture, deleteGesture, createGesture } from '../../api/adminApi';


export default function ManageGestures() {
  const { gestures, refreshGestures } = useData();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Gesture | null>(null);
  const [form, setForm] = useState({ gestureName: '', gestureSymbol: '' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const openAdd = () => { setEditing(null); setForm({ gestureName: '', gestureSymbol: '' }); setShowModal(true); };
  const openEdit = (g: Gesture) => { setEditing(g); setSelectedId(g.gestureId); setForm({ gestureName: g.gestureName, gestureSymbol: g.gestureSymbol }); setShowModal(true); };
  const handleSave = async () => {

    if (editing && selectedId) {
      await updateGesture(selectedId, {
        gestureName: form.gestureName,
        gestureSymbol: form.gestureSymbol
      });
    } else {
      
      await createGesture({
        gestureName: form.gestureName,
        gestureSymbol: form.gestureSymbol
      });
    }
    await refreshGestures();
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!selectedId) return;

    await deleteGesture(selectedId);

    await refreshGestures();
    setShowModal(false);
  };

  return (
    <AdminLayout>
      <div className="manage-page">
        <div className="manage-header">
          <div><h1>Manage Gestures</h1><p>View and edit Gestures.</p></div>
          <div className="header-actions">
            <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>← Back</button>
            <button className="add-btn" onClick={openAdd}>+ Add Gesture</button>
          </div>
        </div>

        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>Label</th><th>Gesture ID</th><th>Gesture Name</th><th>Symbol</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {gestures.map((g, i) => (
                <tr key={g.gestureId}>
                  <td>{i + 1}</td>
                  <td>{g.gestureId}</td>
                  <td>{g.gestureName}</td>
                  <td className="symbol-cell">{g.gestureSymbol}</td>
                  <td className="actions-cell">
                    <button className="action-btn edit" onClick={() => openEdit(g)} title="Edit">✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Gesture' : 'Add Gesture'} onClose={() => setShowModal(false)}>
          <div className="form-group">
            <label>Gesture Name</label>
            <input value={form.gestureName} onChange={e => setForm(f => ({ ...f, gestureName: e.target.value }))} placeholder="e.g. One Finger" />
          </div>
          <div className="form-group">
            <label>Gesture Symbol (emoji)</label>
            <input value={form.gestureSymbol} onChange={e => setForm(f => ({ ...f, gestureSymbol: e.target.value }))} placeholder="e.g. ☝️" />
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>

            {editing && (
              <button className="btn-danger" onClick={handleDelete}>
                Delete
              </button>
            )}

            <button className="btn-primary" onClick={handleSave}>
              Save
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
