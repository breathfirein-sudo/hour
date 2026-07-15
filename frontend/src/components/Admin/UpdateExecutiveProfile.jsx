// Frontend: Customer Support Executive Profile Update Feature

import React, { useState } from 'react';

const UpdateExecutiveProfile = ({ editingExecId, initialFormState, setExecutives, setShowEditExecModal, setEditingExecId }) => {
  const [execForm, setExecForm] = useState(initialFormState || {
    name: '', phone: '', email: '', role: 'Chat', salary: '', status: 'Active', shift: 'Day', languages: '', rating: '5.0', experienceYrs: '0'
  });
  const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const handleUpdateExecutive = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/admin/support-executives/${editingExecId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(execForm)
      });
      const data = await res.json();
      if (data.success) {
        if (setExecutives) {
          setExecutives(prev => prev.map(ex => ex.id === editingExecId ? data.executive : ex));
        }
        if (setShowEditExecModal) setShowEditExecModal(false);
        if (setEditingExecId) setEditingExecId(null);
        alert("✅ Support executive updated successfully!");
      } else {
        alert("Failed to update: " + data.message);
      }
    } catch (err) {
      alert("Error updating support executive: " + err.message);
    }
  };

  return (
    <div style={{ background: '#120524', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>✏️ Update Agent Profile Details</h3>
      
      <form onSubmit={handleUpdateExecutive} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Name field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 600 }}>Name *</label>
          <input type="text" required value={execForm.name} onChange={e => setExecForm({...execForm, name: e.target.value})} style={{ background: '#1e0b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#ffffff', fontSize: '14px' }} />
        </div>
        {/* Phone & Email Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 600 }}>Phone</label>
            <input type="text" value={execForm.phone} onChange={e => setExecForm({...execForm, phone: e.target.value})} style={{ background: '#1e0b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#ffffff', fontSize: '14px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 600 }}>Email *</label>
            <input type="email" required value={execForm.email} onChange={e => setExecForm({...execForm, email: e.target.value})} style={{ background: '#1e0b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#ffffff', fontSize: '14px' }} />
          </div>
        </div>
        {/* Role & Shift Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 600 }}>Role *</label>
            <select value={execForm.role} onChange={e => setExecForm({...execForm, role: e.target.value})} style={{ background: '#1e0b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#ffffff', fontSize: '14px' }}>
              <option value="Chat">Chat</option>
              <option value="Call">Call</option>
              <option value="Both">Both</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 600 }}>Shift *</label>
            <select value={execForm.shift} onChange={e => setExecForm({...execForm, shift: e.target.value})} style={{ background: '#1e0b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#ffffff', fontSize: '14px' }}>
              <option value="Day">Day</option>
              <option value="Night">Night</option>
              <option value="Rotational">Rotational</option>
            </select>
          </div>
        </div>
        {/* Salary & Experience Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 600 }}>Monthly Salary (₹) *</label>
            <input type="number" required value={execForm.salary} onChange={e => setExecForm({...execForm, salary: e.target.value})} style={{ background: '#1e0b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#ffffff', fontSize: '14px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 600 }}>Experience (Yrs)</label>
            <input type="number" value={execForm.experienceYrs} onChange={e => setExecForm({...execForm, experienceYrs: e.target.value})} style={{ background: '#1e0b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#ffffff', fontSize: '14px' }} />
          </div>
        </div>
        {/* Languages & Rating Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 600 }}>Languages</label>
            <input type="text" value={execForm.languages} onChange={e => setExecForm({...execForm, languages: e.target.value})} style={{ background: '#1e0b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#ffffff', fontSize: '14px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 600 }}>Rating (1-5) *</label>
            <input type="number" step="0.1" min="1.0" max="5.0" required value={execForm.rating} onChange={e => setExecForm({...execForm, rating: e.target.value})} style={{ background: '#1e0b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#ffffff', fontSize: '14px' }} />
          </div>
        </div>
        {/* Status Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 600 }}>Status *</label>
          <select value={execForm.status} onChange={e => setExecForm({...execForm, status: e.target.value})} style={{ background: '#1e0b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#ffffff', fontSize: '14px' }}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button type="submit" style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)', border: 'none', color: '#ffffff', padding: '10px 22px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Save Profile Changes</button>
        </div>
      </form>
    </div>
  );
};

export default UpdateExecutiveProfile;
