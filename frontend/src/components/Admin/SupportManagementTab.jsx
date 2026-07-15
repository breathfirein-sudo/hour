import React, { useState } from 'react';
import UpdateExecutiveProfile from './UpdateExecutiveProfile';

const SupportManagementTab = ({
  executives,
  fetchingExecutives,
  execForm,
  setExecForm,
  setShowAddExecModal,
  fetchExecutives,
  handleToggleExecStatus,
  handleDeleteExecutive,
  setExecutives,
  VITE_BACKEND_URL
}) => {
  const [selectedExecId, setSelectedExecId] = useState(null);
  const [selectedExecStats, setSelectedExecStats] = useState(null);

  const fetchSelectedExecStats = async (id) => {
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/admin/support-executives/${id}/stats`);
      const data = await res.json();
      if (data.success) {
        setSelectedExecStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching selected executive stats:", err);
    }
  };

  const handleForceRecontinueShift = async (selectedExec) => {
    if (!selectedExec) return;
    try {
      let logs = [];
      try {
        logs = typeof selectedExec.attendance === 'string' ? JSON.parse(selectedExec.attendance || '[]') : (selectedExec.attendance || []);
      } catch (e) {
        logs = [];
      }
      
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayLogIndex = logs.findIndex(log => log.date === todayStr);
      
      if (todayLogIndex > -1) {
        logs[todayLogIndex].clockOut = null;
      } else {
        logs.push({
          date: todayStr,
          clockIn: new Date().toISOString(),
          clockOut: null,
          status: 'On Time'
        });
      }

      const res = await fetch(`${VITE_BACKEND_URL}/api/admin/support-executives/${selectedExec.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: JSON.stringify(logs) })
      });
      const data = await res.json();
      if (data.success) {
        setExecutives(prev => prev.map(ex => ex.id === selectedExec.id ? data.executive : ex));
        alert("✅ Shift status re-continued successfully!");
        fetchSelectedExecStats(selectedExec.id);
      } else {
        alert("Failed to update: " + data.message);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const selectedExec = selectedExecId ? executives.find(ex => ex.id === selectedExecId) : null;
  const isExecActive = (() => {
    if (!selectedExec || !selectedExec.attendance) return false;
    try {
      const logs = typeof selectedExec.attendance === 'string' ? JSON.parse(selectedExec.attendance) : selectedExec.attendance;
      if (!Array.isArray(logs)) return false;
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayLog = logs.find(log => log.date === todayStr);
      return !!(todayLog && todayLog.clockIn && !todayLog.clockOut);
    } catch (err) {
      return false;
    }
  })();

  if (selectedExecId && selectedExec) {
    return (
      /* Support Executive Portfolio View */
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fade-in 0.3s ease-out' }}>
        {/* Back Button */}
        <div>
          <button
            type="button"
            onClick={() => {
              setSelectedExecId(null);
              setSelectedExecStats(null);
            }}
            style={{
              background: '#1e0b36', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff',
              padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '12px',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            ← Back to Customer Service Directory
          </button>
        </div>

        {/* Portfolio Title */}
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            👤 Support Executive Portfolio: {selectedExec.name}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9c93a8' }}>
            Real-time shift log, chat resolution statistics, and account update profile.
          </p>
        </div>

        {/* Two Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '24px', alignItems: 'start' }}>
          {/* Left Column: Stats and Clocking */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Shift & Chat Statistics Card */}
            <div style={{ background: '#120524', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3b82f6', fontSize: '18px' }}>☑</span> Shift & Chat Statistics
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Resolved Chats Box */}
                <div style={{ background: '#1e0b36', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '24px', background: 'rgba(255,255,255,0.05)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9c93a8' }}>💬</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#9c93a8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resolved Chats</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '13px' }}>
                      <span style={{ color: '#9c93a8' }}>Today: <strong style={{ color: '#10b981' }}>{selectedExecStats?.chatsClosedToday || 0} chats</strong></span>
                      <span style={{ color: '#9c93a8' }}>All-Time: <strong style={{ color: '#ffffff' }}>{selectedExecStats?.chatsClosed || 0} chats</strong></span>
                    </div>
                  </div>
                </div>

                {/* Attendance Sessions Box */}
                <div style={{ background: '#1e0b36', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '24px', background: 'rgba(255,255,255,0.05)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d9af56' }}>🔑</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#9c93a8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attendance Sessions</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '13px' }}>
                      <span style={{ color: '#9c93a8' }}>Today: <strong style={{ color: '#ffffff' }}>{selectedExecStats ? `${selectedExecStats.attendanceTodayLate}L / ${selectedExecStats.attendanceTodayOnTime}O` : '0L / 0O'}</strong></span>
                      <span style={{ color: '#9c93a8' }}>This Month: <strong style={{ color: '#ffffff' }}>{selectedExecStats ? `${selectedExecStats.attendanceMonthLate}L / ${selectedExecStats.attendanceMonthOnTime}O` : '0L / 0O'}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shift Working Status Card */}
            <div style={{ background: '#120524', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⏰ Shift Working Status
              </h3>
              <div>
                <div style={{ fontSize: '11px', color: '#9c93a8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Working State</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '14px', fontWeight: 700, color: isExecActive ? '#10b981' : '#ffffff' }}>
                  <span style={{ color: isExecActive ? '#10b981' : '#9c93a8', fontSize: '16px' }}>●</span> 
                  {isExecActive ? 'Active (Clocked In)' : 'Inactive (Not Clocked In)'}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#9c93a8', lineHeight: '1.5' }}>
                If this agent is unintentionally clocked out, you can force-recontinue their shift:
              </p>
              <button
                type="button"
                onClick={() => handleForceRecontinueShift(selectedExec)}
                disabled={isExecActive}
                style={{
                  background: isExecActive ? 'rgba(16, 185, 129, 0.2)' : '#10b981',
                  color: isExecActive ? 'rgba(255,255,255,0.4)' : '#ffffff',
                  border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
                  cursor: isExecActive ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s', width: 'fit-content'
                }}
              >
                ▶ Recontinue Executive Shift
              </button>
            </div>

            {/* Money Deposit Monitor (Live) Card */}
            <div style={{ background: '#120524', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💰 Money Deposit Monitor (Live)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Approved Today */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '24px', background: 'rgba(16,185,129,0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>💵</div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9c93a8', fontWeight: 600 }}>Deposits Approved Today</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                      ₹{(selectedExecStats?.depositsTodaySum || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9c93a8', marginTop: '2px' }}>
                      Approved {selectedExecStats?.depositsTodayCount || 0} deposit request(s) today
                    </div>
                  </div>
                </div>

                {/* Approved This Month */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '24px', background: 'rgba(59,130,246,0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>📅</div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9c93a8', fontWeight: 600 }}>Deposits Approved This Month</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                      ₹{(selectedExecStats?.depositsMonthSum || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Update form */}
          <div>
            <UpdateExecutiveProfile
              editingExecId={selectedExec.id}
              initialFormState={{
                name: selectedExec.name,
                phone: selectedExec.phone || '',
                email: selectedExec.email || '',
                role: selectedExec.role,
                salary: selectedExec.salary.toString(),
                status: selectedExec.status,
                shift: selectedExec.shift,
                languages: selectedExec.languages,
                rating: selectedExec.rating.toString(),
                experienceYrs: selectedExec.experienceYrs.toString()
              }}
              setExecutives={setExecutives}
              setShowEditExecModal={null}
              setEditingExecId={null}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fade-in 0.3s ease-out' }}>
      {/* Header & Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>🎧 Customer Service Directory</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9c93a8' }}>Manage call & chat support executives, shifts, salaries, and performance reviews.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => {
              setExecForm({
                name: '',
                phone: '',
                email: '',
                role: 'Chat',
                salary: '',
                status: 'Active',
                shift: 'Day',
                languages: 'English, Hindi',
                rating: '5.0',
                experienceYrs: '0'
              });
              setShowAddExecModal(true);
            }}
            style={{
              background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)', border: 'none', color: '#ffffff',
              padding: '10px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(244, 63, 94, 0.2)'
            }}
          >
            ➕ Add Executive
          </button>
          <button
            type="button"
            onClick={fetchExecutives}
            disabled={fetchingExecutives}
            style={{
              background: '#1e0b36', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff',
              padding: '10px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
              cursor: fetchingExecutives ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              opacity: fetchingExecutives ? 0.6 : 1, transition: 'all 0.2s'
            }}
          >
            {fetchingExecutives ? '⟳ Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {/* Metric 1 */}
        <div style={{ background: '#120524', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', fontSize: '20px' }}>👥</div>
          <div>
            <div style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 500 }}>Total Executives</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>{executives.length}</div>
          </div>
        </div>
        {/* Metric 2 */}
        <div style={{ background: '#120524', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '20px' }}>🟢</div>
          <div>
            <div style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 500 }}>Active Support</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>{executives.filter(e => e.status === 'Active').length}</div>
          </div>
        </div>
        {/* Metric 3 */}
        <div style={{ background: '#120524', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: '20px' }}>💳</div>
          <div>
            <div style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 500 }}>Monthly Payroll</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
              ₹{executives.reduce((acc, curr) => acc + (curr.salary || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
        {/* Metric 4 */}
        <div style={{ background: '#120524', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(217, 175, 86, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d9af56', fontSize: '20px' }}>⭐</div>
          <div>
            <div style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 500 }}>Average Rating</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
              {executives.length > 0 ? (executives.reduce((acc, curr) => acc + (curr.rating || 0), 0) / executives.length).toFixed(1) : '5.0'} / 5.0
            </div>
          </div>
        </div>
      </div>

      {/* Staff Grid/Table */}
      <div style={{ background: '#120524', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '24px' }}>
        {fetchingExecutives ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9c93a8' }}>Loading support executives...</div>
        ) : executives.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9c93a8' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎧</div>
            <div>No customer service staff registered yet. Click "+ Add Executive" to register support staff.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#9c93a8', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>
                  <th style={{ padding: '12px 10px' }}>Executive Details</th>
                  <th style={{ padding: '12px 10px' }}>Role</th>
                  <th style={{ padding: '12px 10px' }}>Shift</th>
                  <th style={{ padding: '12px 10px' }}>Monthly Salary</th>
                  <th style={{ padding: '12px 10px' }}>Performance & Experience</th>
                  <th style={{ padding: '12px 10px' }}>Status</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {executives.map((ex) => {
                  const ratingVal = ex.rating || 5.0;
                  const perfLabel = ratingVal >= 4.5 ? 'Outstanding' :
                                    ratingVal >= 4.0 ? 'Good' :
                                    ratingVal >= 3.0 ? 'Average' : 'Underperforming';
                  const perfColor = ratingVal >= 4.5 ? '#10b981' :
                                    ratingVal >= 4.0 ? '#3b82f6' :
                                    ratingVal >= 3.0 ? '#f59e0b' : '#f43f5e';
                  const perfBg = ratingVal >= 4.5 ? 'rgba(16,185,129,0.15)' :
                                 ratingVal >= 4.0 ? 'rgba(59,130,246,0.15)' :
                                 ratingVal >= 3.0 ? 'rgba(245,158,11,0.15)' : 'rgba(244,63,94,0.15)';

                  const roleBg = ex.role === 'Chat' ? 'rgba(16,185,129,0.1)' :
                                 ex.role === 'Call' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)';
                  const roleColor = ex.role === 'Chat' ? '#10b981' :
                                    ex.role === 'Call' ? '#3b82f6' : '#8b5cf6';

                  return (
                    <tr key={ex.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }} className="client-directory-row">
                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff' }}>{ex.name}</div>
                        <div style={{ fontSize: '11px', color: '#9c93a8', marginTop: '2px' }}>
                          {ex.email || 'No Email'} • {ex.phone || 'No Phone'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                          🗣️ Speaks: {ex.languages}
                        </div>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '4px 8px', borderRadius: '4px', background: roleBg, color: roleColor }}>
                          {ex.role} Support
                        </span>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 600 }}>
                          ☀️ {ex.shift} Shift
                        </span>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: '#ffffff' }}>
                          ₹{(ex.salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#d9af56' }}>★ {ratingVal.toFixed(1)}</span>
                          <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', padding: '3px 6px', borderRadius: '4px', background: perfBg, color: perfColor }}>
                            {perfLabel}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#9c93a8', marginTop: '4px' }}>{ex.experienceYrs} Yrs Experience</div>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        {(() => {
                          let isClockedIn = false;
                          if (ex.attendance) {
                            try {
                              const logs = typeof ex.attendance === 'string' ? JSON.parse(ex.attendance) : ex.attendance;
                              if (Array.isArray(logs)) {
                                const todayStr = new Date().toISOString().slice(0, 10);
                                const todayLog = logs.find(log => log.date === todayStr);
                                isClockedIn = !!(todayLog && todayLog.clockIn && !todayLog.clockOut);
                              }
                            } catch (e) {
                              isClockedIn = false;
                            }
                          }
                          return (
                            <span
                              style={{
                                fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                                color: isClockedIn ? '#10b981' : '#f43f5e'
                              }}
                            >
                              ● {isClockedIn ? 'Active' : 'Inactive'}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedExecId(ex.id);
                              fetchSelectedExecStats(ex.id);
                            }}
                            style={{
                              padding: '5px 10px', fontSize: '11px', border: '1px solid rgba(255,255,255,0.15)',
                              background: 'rgba(255,255,255,0.05)', color: '#ffffff', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                          >
                            Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExecutive(ex.id, ex.name)}
                            style={{
                              padding: '5px 10px', fontSize: '11px', border: '1px solid #f43f5e',
                              background: 'rgba(244,63,94,0.1)', color: '#f43f5e', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportManagementTab;
