import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  ShieldCheck, 
  Truck, 
  CheckCircle, 
  AlertTriangle, 
  MapPin, 
  Search, 
  RefreshCw, 
  X, 
  Eye, 
  FileText,
  DollarSign,
  PackageCheck,
  Crown
} from 'lucide-react';

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function AdminDeviceRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'BUY' | 'SELL_RETURN' | 'PREMIUM' | 'pending'
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Request for Address Modal
  const [viewingAddressReq, setViewingAddressReq] = useState(null);

  // Dispatch Action Modal State
  const [dispatchModalReq, setDispatchModalReq] = useState(null);
  const [courierName, setCourierName] = useState('Investhour Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdatingDispatch, setIsUpdatingDispatch] = useState(false);

  // Inspection Action Modal State
  const [inspectModalReq, setInspectModalReq] = useState(null);
  const [checkScreen, setCheckScreen] = useState(false);
  const [checkChassis, setCheckChassis] = useState(false);
  const [checkLiquid, setCheckLiquid] = useState(false);
  const [checkDiagnostics, setCheckDiagnostics] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [inspectNotes, setInspectNotes] = useState('');
  const [isVerifyingReturn, setIsVerifyingReturn] = useState(false);

  // Premium Registration Action State
  const [viewingInvoiceReq, setViewingInvoiceReq] = useState(null);
  const [approvePremiumModalReq, setApprovePremiumModalReq] = useState(null);
  const [approvedPriceInput, setApprovedPriceInput] = useState('');
  const [premiumAdminNotes, setPremiumAdminNotes] = useState('');
  const [premiumRejectionReason, setPremiumRejectionReason] = useState('');
  const [isProcessingPremium, setIsProcessingPremium] = useState(false);

  const fetchRequests = () => {
    setLoading(true);
    fetch(`${VITE_BACKEND_URL}/api/devices/admin/requests`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRequests(data.requests || []);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch device requests:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Filter requests
  const filteredRequests = requests.filter(req => {
    if (filterType === 'BUY' && req.order_type !== 'BUY') return false;
    if (filterType === 'SELL_RETURN' && req.order_type !== 'SELL_RETURN') return false;
    if (filterType === 'PREMIUM' && req.order_type !== 'PREMIUM_REGISTRATION') return false;
    if (filterType === 'pending' && !(req.status === 'Pending' || req.status === 'Request Submitted' || req.status === 'InspectionPending' || req.status === 'Pending Review')) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (req.id || '').toLowerCase().includes(q) ||
      (req.full_name || '').toLowerCase().includes(q) ||
      (req.email || '').toLowerCase().includes(q) ||
      (req.phone || '').includes(q) ||
      (req.model || '').toLowerCase().includes(q) ||
      (req.brand || '').toLowerCase().includes(q) ||
      (req.imei || '').toLowerCase().includes(q) ||
      (req.city || '').toLowerCase().includes(q)
    );
  });

  // Handle Dispatch submit
  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchModalReq) return;
    setIsUpdatingDispatch(true);

    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/devices/admin/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: dispatchModalReq.id,
          courierName,
          trackingNumber,
          status: 'Dispatched',
          adminNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`Order #${dispatchModalReq.id} marked as Dispatched! Tracking: ${trackingNumber}`);
        setDispatchModalReq(null);
        fetchRequests();
      } else {
        alert(data.message || 'Failed to update order dispatch.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsUpdatingDispatch(false);
    }
  };

  // Handle Return QA verification
  const handleVerifyReturn = async (inspectionPassed) => {
    if (!inspectModalReq) return;
    if (inspectionPassed && (!checkScreen || !checkChassis || !checkLiquid || !checkDiagnostics)) {
      alert('Please verify all 4 physical integrity check points before approving 100% price parity payout.');
      return;
    }

    if (!inspectionPassed && !rejectionReason.trim()) {
      alert('Please specify the rejection reason detailing the external or internal damage detected.');
      return;
    }

    const confirmMsg = inspectionPassed
      ? `Are you sure you want to approve this return and credit ₹${parseFloat(inspectModalReq.base_price).toLocaleString()} (100% Base Cost) to customer's wallet?`
      : `Are you sure you want to reject this return due to physical damage?`;
    if (!window.confirm(confirmMsg)) return;

    setIsVerifyingReturn(true);
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/devices/admin/verify-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: inspectModalReq.id,
          inspectionPassed,
          rejectionReason,
          adminNotes: inspectNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setInspectModalReq(null);
        fetchRequests();
      } else {
        alert(data.message || 'Failed to process return decision.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsVerifyingReturn(false);
    }
  };

  // Handle Premium Registration Approval
  const handleConfirmApprovePremium = async (e) => {
    e.preventDefault();
    if (!approvePremiumModalReq) return;
    setIsProcessingPremium(true);
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/devices/admin/approve-premium`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: approvePremiumModalReq.id,
          approvedPrice: parseFloat(approvedPriceInput) || parseFloat(approvePremiumModalReq.base_price),
          adminNotes: premiumAdminNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setApprovePremiumModalReq(null);
        fetchRequests();
      } else {
        alert(data.message || 'Failed to approve premium registration.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsProcessingPremium(false);
    }
  };

  // Handle Premium Registration Rejection
  const handleConfirmRejectPremium = async () => {
    if (!approvePremiumModalReq) return;
    if (!premiumRejectionReason.trim()) {
      alert('Please specify a rejection reason (e.g. invalid invoice, IMEI mismatch).');
      return;
    }
    if (!window.confirm(`Reject Premium Registration #${approvePremiumModalReq.id}?`)) return;

    setIsProcessingPremium(true);
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/devices/admin/reject-premium`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: approvePremiumModalReq.id,
          rejectionReason: premiumRejectionReason,
          adminNotes: premiumAdminNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setApprovePremiumModalReq(null);
        fetchRequests();
      } else {
        alert(data.message || 'Failed to reject premium registration.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsProcessingPremium(false);
    }
  };

  // Stats calculation
  const totalOrders = requests.length;
  const pendingDispatches = requests.filter(r => r.order_type === 'BUY' && (r.status === 'Pending' || r.status === 'Request Submitted')).length;
  const pendingReturns = requests.filter(r => r.order_type === 'SELL_RETURN' && r.status === 'InspectionPending').length;
  const pendingPremiums = requests.filter(r => r.order_type === 'PREMIUM_REGISTRATION' && r.status === 'Pending Review').length;
  const totalVolume = requests.reduce((acc, r) => acc + parseFloat(r.total_amount || 0), 0);
  const warrantiesActive = requests.filter(r => r.has_warranty).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fade-in 0.3s ease-out' }}>
      
      {/* Header & Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Smartphone style={{ color: '#d9af56' }} size={26} />
            Mobile & Device Exchange Requests
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#9c93a8' }}>
            Manage customer Buy & Sell orders, inspect delivery addresses, dispatch courier tracking, and verify return damage before 100% wallet buyback payout.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.15)',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Requests
        </button>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'rgba(18, 10, 28, 0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <span style={{ fontSize: '11px', color: '#9c93a8', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Total Requests</span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff' }}>{totalOrders}</div>
          <span style={{ fontSize: '11px', color: '#9c93a8' }}>All mobile buy & sell orders</span>
        </div>

        <div style={{ background: 'rgba(18, 10, 28, 0.7)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '14px', padding: '18px' }}>
          <span style={{ fontSize: '11px', color: '#f43f5e', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Pending Dispatches</span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#f43f5e' }}>{pendingDispatches}</div>
          <span style={{ fontSize: '11px', color: '#9c93a8' }}>Awaiting courier tracking</span>
        </div>

        <div style={{ background: 'rgba(18, 10, 28, 0.7)', border: '1px solid rgba(217, 175, 86, 0.3)', borderRadius: '14px', padding: '18px' }}>
          <span style={{ fontSize: '11px', color: '#d9af56', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Pending Returns QA</span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#d9af56' }}>{pendingReturns}</div>
          <span style={{ fontSize: '11px', color: '#9c93a8' }}>Awaiting damage verification</span>
        </div>

        <div style={{ background: 'rgba(18, 10, 28, 0.7)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', padding: '18px' }}>
          <span style={{ fontSize: '11px', color: '#10b981', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>10-Yr Warranties</span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#10b981' }}>{warrantiesActive}</div>
          <span style={{ fontSize: '11px', color: '#9c93a8' }}>Under parity protection</span>
        </div>

        <div style={{ background: 'rgba(18, 10, 28, 0.7)', border: '1px solid rgba(217, 175, 86, 0.45)', borderRadius: '14px', padding: '18px' }}>
          <span style={{ fontSize: '11px', color: '#d9af56', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            <Crown size={13} /> Pending Premium Reg
          </span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#d9af56' }}>{pendingPremiums}</div>
          <span style={{ fontSize: '11px', color: '#9c93a8' }}>Awaiting invoice review</span>
        </div>

        <div style={{ background: 'rgba(18, 10, 28, 0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <span style={{ fontSize: '11px', color: '#9c93a8', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Total Exchange Volume</span>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#d9af56' }}>₹{totalVolume.toLocaleString()}</div>
          <span style={{ fontSize: '11px', color: '#9c93a8' }}>Gross transaction turnover</span>
        </div>
      </div>

      {/* Filter Tabs & Search Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            style={{
              background: filterType === 'all' ? '#d9af56' : 'transparent',
              color: filterType === 'all' ? '#060309' : '#9c93a8',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            All Requests ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('pending')}
            style={{
              background: filterType === 'pending' ? '#d9af56' : 'transparent',
              color: filterType === 'pending' ? '#060309' : '#9c93a8',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Pending Action ({pendingDispatches + pendingReturns + pendingPremiums})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('BUY')}
            style={{
              background: filterType === 'BUY' ? '#d9af56' : 'transparent',
              color: filterType === 'BUY' ? '#060309' : '#9c93a8',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Buy Orders ({requests.filter(r => r.order_type === 'BUY').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('SELL_RETURN')}
            style={{
              background: filterType === 'SELL_RETURN' ? '#d9af56' : 'transparent',
              color: filterType === 'SELL_RETURN' ? '#060309' : '#9c93a8',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Sell Returns ({requests.filter(r => r.order_type === 'SELL_RETURN').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('PREMIUM')}
            style={{
              background: filterType === 'PREMIUM' ? '#d9af56' : 'transparent',
              color: filterType === 'PREMIUM' ? '#060309' : '#9c93a8',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Crown size={12} /> Premium Reg ({requests.filter(r => r.order_type === 'PREMIUM_REGISTRATION').length})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '400px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9c93a8' }} />
          <input
            type="text"
            placeholder="Search by Customer, Order ID, Phone, City..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '12.5px'
            }}
          />
        </div>
      </div>

      {/* Requests Data Table */}
      <div style={{ background: 'rgba(18, 10, 28, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9c93a8' }}>
            Loading requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9c93a8' }}>
            No mobile device requests found matching the current filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#9c93a8' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>ORDER ID / DATE</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>TYPE</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>CUSTOMER</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>DEVICE & SPECS</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>AMOUNT / WARRANTY</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>ADDRESS</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(req => {
                  const isBuy = req.order_type === 'BUY';
                  const isPremium = req.order_type === 'PREMIUM_REGISTRATION';
                  return (
                    <tr 
                      key={req.id} 
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* ID & Date */}
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: '#ffffff', fontFamily: 'monospace', display: 'block' }}>#{req.id}</strong>
                        <span style={{ fontSize: '11px', color: '#9c93a8' }}>
                          {new Date(req.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: isPremium ? 'rgba(217, 175, 86, 0.2)' : isBuy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(217, 175, 86, 0.15)',
                          color: isPremium ? '#d9af56' : isBuy ? '#10b981' : '#d9af56',
                          border: '1px solid ' + (isPremium ? 'rgba(217, 175, 86, 0.45)' : isBuy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(217, 175, 86, 0.3)'),
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '11px'
                        }}>
                          {isPremium ? <><Crown size={12} /> PREMIUM REG</> : isBuy ? 'BUY DISPATCH' : 'SELL RETURN'}
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: '#ffffff', display: 'block' }}>{req.full_name}</strong>
                        <span style={{ fontSize: '11px', color: '#d9af56', fontFamily: 'monospace' }}>
                          CUST-{req.user_id}
                        </span>
                        <div style={{ fontSize: '11px', color: '#9c93a8' }}>{req.phone}</div>
                      </td>

                      {/* Device & Specs */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>
                          {req.brand} {req.model}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9c93a8' }}>
                          {req.condition} • {req.ram}/{req.storage} • {req.color}
                        </div>
                        {req.imei && (
                          <div style={{ fontSize: '10.5px', color: '#10b981', fontFamily: 'monospace', marginTop: '2px' }}>
                            IMEI: {req.imei}
                          </div>
                        )}
                      </td>

                      {/* Financials & Warranty */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '14px' }}>
                          ₹{parseFloat(req.total_amount).toLocaleString()}
                        </div>
                        {isPremium ? (
                          <div>
                            <span style={{ fontSize: '10.5px', color: '#9c93a8', display: 'block' }}>
                              Bill: ₹{parseFloat(req.original_invoice_price || 0).toLocaleString()} (-{req.depreciation_rate || 1}%)
                            </span>
                            <span style={{ fontSize: '10.5px', color: '#d9af56', fontWeight: 700, display: 'block' }}>
                              Plan: {req.subscription_years || 1} Yr (₹{parseFloat(req.subscription_fee || req.warranty_fee || 118).toLocaleString()})
                            </span>
                            <span style={{ fontSize: '10px', color: '#60a5fa', fontFamily: 'monospace', display: 'block' }}>
                              UTR: {req.utr || 'N/A'} ({req.payment_mode || 'UPI'})
                            </span>
                          </div>
                        ) : req.has_warranty ? (
                          <span style={{ fontSize: '10.5px', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <ShieldCheck size={12} /> 10-Yr (100% Return Parity)
                          </span>
                        ) : (
                          <span style={{ fontSize: '10.5px', color: '#9c93a8' }}>Standard (No Warranty)</span>
                        )}
                      </td>

                      {/* Address & Invoice Trigger */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => setViewingAddressReq(req)}
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              color: '#ffffff',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <MapPin size={12} style={{ color: '#d9af56' }} />
                            {req.city}, {req.pin_code}
                          </button>
                          {req.invoice_document && (
                            <button
                              type="button"
                              onClick={() => setViewingInvoiceReq(req)}
                              style={{
                                background: 'rgba(217, 175, 86, 0.15)',
                                border: '1px solid rgba(217, 175, 86, 0.35)',
                                color: '#d9af56',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 700
                              }}
                            >
                              <FileText size={12} /> View Bill
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: req.status === 'Dispatched' ? 'rgba(59, 130, 246, 0.15)' :
                                      req.status === 'Delivered' || req.status === 'ApprovedAndRefunded' || req.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' :
                                      req.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' :
                                      req.status === 'Request Submitted' || req.status === 'Pending Review' ? 'rgba(217, 175, 86, 0.2)' : 'rgba(217, 175, 86, 0.15)',
                          color: req.status === 'Dispatched' ? '#60a5fa' :
                                 req.status === 'Delivered' || req.status === 'ApprovedAndRefunded' || req.status === 'Approved' ? '#10b981' :
                                 req.status === 'Rejected' ? '#ef4444' : '#d9af56',
                          border: (req.status === 'Request Submitted' || req.status === 'Pending Review') ? '1px solid rgba(217, 175, 86, 0.4)' : 'none'
                        }}>
                          {req.status === 'Approved' ? '10-Yr Parity Active' : req.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {isPremium ? (
                          req.status === 'Pending Review' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setApprovePremiumModalReq(req);
                                setApprovedPriceInput(req.base_price);
                                setPremiumAdminNotes(req.admin_notes || '');
                                setPremiumRejectionReason('');
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #d9af56 0%, #b8860b 100%)',
                                color: '#060309',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontWeight: 800,
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 8px rgba(217, 175, 86, 0.25)'
                              }}
                            >
                              <Crown size={13} /> Review & Approve
                            </button>
                          ) : req.status === 'Approved' ? (
                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <ShieldCheck size={13} /> 10-Yr Guarantee Active
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#ef4444' }}>Rejected</span>
                          )
                        ) : isBuy ? (
                          (req.status === 'Pending' || req.status === 'Request Submitted') ? (
                            <button
                              type="button"
                              onClick={() => {
                                setDispatchModalReq(req);
                                setCourierName('Investhour Express');
                                setTrackingNumber('');
                                setAdminNotes(req.admin_notes || '');
                              }}
                              style={{
                                background: req.status === 'Request Submitted' ? 'linear-gradient(135deg, #d9af56 0%, #b8860b 100%)' : '#10b981',
                                color: '#060309',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontWeight: 800,
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Truck size={13} /> {req.status === 'Request Submitted' ? 'Review & Dispatch' : 'Dispatch Order'}
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#9c93a8' }}>
                              {req.courier_name} ({req.tracking_number || 'Dispatched'})
                            </span>
                          )
                        ) : (
                          req.status === 'InspectionPending' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setInspectModalReq(req);
                                setCheckScreen(false);
                                setCheckChassis(false);
                                setCheckLiquid(false);
                                setCheckDiagnostics(false);
                                setRejectionReason('');
                                setInspectNotes('');
                              }}
                              style={{
                                background: '#d9af56',
                                color: '#060309',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontWeight: 800,
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <ShieldCheck size={13} /> QA Inspection
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#9c93a8' }}>
                              {req.status === 'ApprovedAndRefunded' ? '✓ Refund Settled' : 'Rejected'}
                            </span>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Full Address Inspector */}
      {viewingAddressReq && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '20px'
        }}>
          <div style={{
            background: '#120a1c',
            border: '1px solid rgba(217, 175, 86, 0.3)',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={20} style={{ color: '#d9af56' }} />
                <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>
                  {viewingAddressReq.order_type === 'BUY' ? 'Delivery Address' : 'Pickup Address'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingAddressReq(null)}
                style={{ background: 'transparent', border: 'none', color: '#9c93a8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#9c93a8', display: 'block', fontSize: '11px' }}>Customer Name:</span>
                <strong style={{ color: '#ffffff', fontSize: '14px' }}>{viewingAddressReq.full_name}</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <span style={{ color: '#9c93a8', display: 'block', fontSize: '11px' }}>Primary Phone:</span>
                  <a href={`tel:${viewingAddressReq.phone}`} style={{ color: '#d9af56', textDecoration: 'none', fontWeight: 700 }}>
                    {viewingAddressReq.phone}
                  </a>
                </div>
                {viewingAddressReq.alternate_phone && (
                  <div>
                    <span style={{ color: '#9c93a8', display: 'block', fontSize: '11px' }}>Alternate Phone:</span>
                    <span style={{ color: '#ffffff' }}>{viewingAddressReq.alternate_phone}</span>
                  </div>
                )}
              </div>

              <div>
                <span style={{ color: '#9c93a8', display: 'block', fontSize: '11px' }}>Address:</span>
                <div style={{ color: '#ffffff', background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', lineHeight: 1.5 }}>
                  {viewingAddressReq.house_number}, {viewingAddressReq.street}
                  {viewingAddressReq.landmark && <div>Landmark: {viewingAddressReq.landmark}</div>}
                  <div>{viewingAddressReq.city}, {viewingAddressReq.state} - <strong>{viewingAddressReq.pin_code}</strong></div>
                  <div>India</div>
                </div>
              </div>

              {viewingAddressReq.delivery_instructions && (
                <div>
                  <span style={{ color: '#9c93a8', display: 'block', fontSize: '11px' }}>Special Instructions:</span>
                  <div style={{ color: '#d9af56', fontStyle: 'italic', background: 'rgba(217, 175, 86, 0.05)', padding: '8px 12px', borderRadius: '6px' }}>
                    "{viewingAddressReq.delivery_instructions}"
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setViewingAddressReq(null)}
              style={{
                width: '100%',
                background: '#d9af56',
                color: '#060309',
                border: 'none',
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 800,
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal 2: Dispatch Order Form */}
      {dispatchModalReq && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '20px'
        }}>
          <form onSubmit={handleConfirmDispatch} style={{
            background: '#120a1c',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={20} style={{ color: '#10b981' }} />
                <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>
                  Dispatch Order #{dispatchModalReq.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalReq(null)}
                style={{ background: 'transparent', border: 'none', color: '#9c93a8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '13px', color: '#9c93a8', marginBottom: '16px' }}>
              Recipient: <strong style={{ color: '#fff' }}>{dispatchModalReq.full_name}</strong> ({dispatchModalReq.city})
              <br />
              Item: {dispatchModalReq.brand} {dispatchModalReq.model}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>
                Courier / Logistics Partner
              </label>
              <input
                type="text"
                required
                value={courierName}
                onChange={e => setCourierName(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>
                Tracking ID / AWB Airway Bill
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BLD-89421049"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>
                Admin Notes (Optional)
              </label>
              <textarea
                placeholder="Dispatched from Mumbai hub with tamper-evident seal."
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDispatchModalReq(null)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingDispatch}
                style={{
                  flex: 1,
                  background: '#10b981',
                  color: '#060309',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {isUpdatingDispatch ? 'Updating...' : 'Confirm Dispatch & Notify Customer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 3: Return Quality Inspection & 100% Wallet Refund */}
      {inspectModalReq && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '20px'
        }}>
          <div style={{
            background: '#120a1c',
            border: '1px solid rgba(217, 175, 86, 0.4)',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '26px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={22} style={{ color: '#d9af56' }} />
                <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>
                  QA Damage Inspection: #{inspectModalReq.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalReq(null)}
                style={{ background: 'transparent', border: 'none', color: '#9c93a8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '12.5px' }}>
              <div>Device: <strong style={{ color: '#fff' }}>{inspectModalReq.brand} {inspectModalReq.model}</strong> ({inspectModalReq.ram}/{inspectModalReq.storage})</div>
              <div>Customer: {inspectModalReq.full_name} • IMEI: <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{inspectModalReq.imei || 'Not provided'}</span></div>
              <div style={{ marginTop: '4px', color: '#d9af56', fontWeight: 700 }}>
                Guaranteed 100% Price Parity Refund: ₹{parseFloat(inspectModalReq.base_price).toLocaleString()}
              </div>
            </div>

            {/* 4-Point Physical Integrity Verification Checklist */}
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#d9af56', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
              4-Point Damage Verification Checklist:
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12.5px' }}>
                <input
                  type="checkbox"
                  checked={checkScreen}
                  onChange={e => setCheckScreen(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                />
                <span>Screen & Display Glass: 100% free of hairline/deep cracks and touch defects</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12.5px' }}>
                <input
                  type="checkbox"
                  checked={checkChassis}
                  onChange={e => setCheckChassis(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                />
                <span>Chassis / Outer Frame: Free of deep impact dents, cracks, or structural bends</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12.5px' }}>
                <input
                  type="checkbox"
                  checked={checkLiquid}
                  onChange={e => setCheckLiquid(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                />
                <span>Liquid Contact Indicators (LCI): Sensors are white & untripped (No water immersion)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12.5px' }}>
                <input
                  type="checkbox"
                  checked={checkDiagnostics}
                  onChange={e => setCheckDiagnostics(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                />
                <span>Internal Diagnostics Passed: Motherboard, Cameras, WiFi & Biometrics 100% functional</span>
              </label>
            </div>

            {/* Rejection Reason textarea (used if rejecting) */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>
                Inspection Notes / Damage Observation (Required if rejecting):
              </label>
              <textarea
                placeholder="e.g. Display glass is pristine, no internal moisture. Unit verified."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                disabled={isVerifyingReturn}
                onClick={() => handleVerifyReturn(false)}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Reject (Damage Found)
              </button>

              <button
                type="button"
                disabled={isVerifyingReturn || !checkScreen || !checkChassis || !checkLiquid || !checkDiagnostics}
                onClick={() => handleVerifyReturn(true)}
                style={{
                  flex: 1,
                  background: (checkScreen && checkChassis && checkLiquid && checkDiagnostics) ? '#10b981' : '#444',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: (checkScreen && checkChassis && checkLiquid && checkDiagnostics) ? 'pointer' : 'not-allowed'
                }}
              >
                {isVerifyingReturn ? 'Processing Refund...' : `Approve & Credit ₹${parseFloat(inspectModalReq.base_price).toLocaleString()} to Wallet`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Invoice Document Viewer */}
      {viewingInvoiceReq && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '20px'
        }}>
          <div style={{
            background: '#120a1c',
            border: '1px solid rgba(217, 175, 86, 0.4)',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} style={{ color: '#d9af56' }} />
                <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>
                  Billing Paper / Invoice — #{viewingInvoiceReq.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingInvoiceReq(null)}
                style={{ background: 'transparent', border: 'none', color: '#9c93a8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '12.5px', color: '#9c93a8', marginBottom: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px' }}>
              <div>Customer: <strong style={{ color: '#fff' }}>{viewingInvoiceReq.full_name}</strong></div>
              <div>Device: <strong style={{ color: '#fff' }}>{viewingInvoiceReq.brand} {viewingInvoiceReq.model}</strong></div>
              <div>IMEI: <strong style={{ color: '#10b981', fontFamily: 'monospace' }}>{viewingInvoiceReq.imei}</strong></div>
              <div>Original Bill Price: <strong style={{ color: '#d9af56' }}>₹{parseFloat(viewingInvoiceReq.original_invoice_price || 0).toLocaleString()}</strong></div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', textAlign: 'center', background: '#0a0510', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px' }}>
              {viewingInvoiceReq.invoice_document && viewingInvoiceReq.invoice_document.startsWith('data:image') ? (
                <img
                  src={viewingInvoiceReq.invoice_document}
                  alt="Billing Paper"
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '6px' }}
                />
              ) : viewingInvoiceReq.invoice_document && viewingInvoiceReq.invoice_document.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewingInvoiceReq.invoice_document}
                  title="Invoice PDF"
                  style={{ width: '100%', height: '55vh', border: 'none' }}
                />
              ) : (
                <div style={{ color: '#9c93a8', fontSize: '13px' }}>
                  No bill document image uploaded or file format unsupported for preview.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setViewingInvoiceReq(null)}
              style={{
                width: '100%',
                background: '#d9af56',
                color: '#060309',
                border: 'none',
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 800,
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal 5: Premium Registration Review & Approval */}
      {approvePremiumModalReq && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '20px'
        }}>
          <form onSubmit={handleConfirmApprovePremium} style={{
            background: '#120a1c',
            border: '1px solid rgba(217, 175, 86, 0.45)',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crown size={20} style={{ color: '#d9af56' }} />
                <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>
                  Verify & Activate 10-Yr Premium
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApprovePremiumModalReq(null)}
                style={{ background: 'transparent', border: 'none', color: '#9c93a8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '13px', color: '#9c93a8', marginBottom: '16px', lineHeight: 1.6 }}>
              <div>Customer: <strong style={{ color: '#fff' }}>{approvePremiumModalReq.full_name}</strong> ({approvePremiumModalReq.phone})</div>
              <div>Device: <strong style={{ color: '#fff' }}>{approvePremiumModalReq.brand} {approvePremiumModalReq.model}</strong> ({approvePremiumModalReq.ram}/{approvePremiumModalReq.storage})</div>
              <div>IMEI Number: <strong style={{ color: '#10b981', fontFamily: 'monospace' }}>{approvePremiumModalReq.imei}</strong></div>
              <div>Purchase Date on Bill: <strong style={{ color: '#ffffff' }}>{approvePremiumModalReq.billing_date ? new Date(approvePremiumModalReq.billing_date).toLocaleDateString() : 'N/A'}</strong></div>
              <div>Original Price on Bill: <strong style={{ color: '#d9af56' }}>₹{parseFloat(approvePremiumModalReq.original_invoice_price || 0).toLocaleString()}</strong></div>
              <div style={{ marginTop: '8px', background: 'rgba(0,0,0,0.35)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#d9af56', fontWeight: 700, fontSize: '12px' }}>
                  Subscription Plan: {approvePremiumModalReq.subscription_years || 1} Year(s) Protection (₹{parseFloat(approvePremiumModalReq.subscription_fee || approvePremiumModalReq.warranty_fee || 118).toLocaleString()})
                </div>
                <div style={{ color: '#60a5fa', fontSize: '12px', fontFamily: 'monospace', marginTop: '2px' }}>
                  Payment: {approvePremiumModalReq.payment_mode || 'UPI'} • UTR / Ref: <strong style={{ color: '#10b981' }}>{approvePremiumModalReq.utr || 'N/A'}</strong>
                </div>
              </div>
            </div>

            {/* Approved Locked Return Price */}
            <div style={{ marginBottom: '16px', background: 'rgba(217, 175, 86, 0.1)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(217, 175, 86, 0.3)' }}>
              <label style={{ fontSize: '11px', color: '#d9af56', display: 'block', marginBottom: '6px', fontWeight: 800 }}>
                10-YEAR GUARANTEED LOCKED RETURN PRICE (₹)
              </label>
              <input
                type="number"
                required
                value={approvedPriceInput}
                onChange={e => setApprovedPriceInput(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(217, 175, 86, 0.4)', borderRadius: '6px', color: '#10b981', fontSize: '18px', fontWeight: 900 }}
              />
              <span style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginTop: '4px' }}>
                Standard 1% depreciation already applied. You may adjust if needed before approval.
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>
                Admin Notes / Verification Memo
              </label>
              <textarea
                value={premiumAdminNotes}
                onChange={e => setPremiumAdminNotes(e.target.value)}
                rows={2}
                placeholder="Invoice verified, IMEI matches bill. 10-Yr Guarantee starts today."
                style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
              />
            </div>

            {/* If rejecting, reason box */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '11px', color: '#ef4444', display: 'block', marginBottom: '4px' }}>
                Rejection Reason (Fill only if rejecting request):
              </label>
              <input
                type="text"
                value={premiumRejectionReason}
                onChange={e => setPremiumRejectionReason(e.target.value)}
                placeholder="e.g. Unreadable bill copy or IMEI mismatch with device."
                style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                disabled={isProcessingPremium}
                onClick={handleConfirmRejectPremium}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Reject Request
              </button>
              <button
                type="submit"
                disabled={isProcessingPremium}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #d9af56 0%, #b8860b 100%)',
                  color: '#060309',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: isProcessingPremium ? 'not-allowed' : 'pointer'
                }}
              >
                {isProcessingPremium ? 'Activating...' : 'Approve & Activate 10-Yr Parity'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

