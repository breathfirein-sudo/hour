import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  ShieldCheck, 
  Sparkles, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Truck, 
  MapPin, 
  ArrowRightLeft, 
  X, 
  Info,
  Clock,
  RotateCcw,
  ShoppingBag,
  ExternalLink,
  Check,
  Send,
  Crown,
  FileText,
  Upload,
  Calendar
} from 'lucide-react';
import MASTER_PHONE_CATALOGUE from '../data/phone_catalogue_master.json';

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function DeviceExchange({ user, walletBalance, setWalletBalance, setTransactions }) {
  const [activeSubTab, setActiveSubTab] = useState('store'); // 'store' | 'my-devices'
  const [condition, setCondition] = useState('New'); // 'New' | 'Refurbished'
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Buy Configurator Modal State
  const [activeModel, setActiveModel] = useState(null);
  const [selectedRam, setSelectedRam] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [hasWarranty, setHasWarranty] = useState(true); // 10-Yr Guarantee Included with purchase (Free / ₹0)
  
  // Address & Checkout Drawer
  const [checkoutStep, setCheckoutStep] = useState('config'); // 'config' | 'address' | 'certificate'
  const [address, setAddress] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    alternatePhone: '',
    houseNumber: '',
    street: '',
    landmark: '',
    city: '',
    state: '',
    pinCode: '',
    deliveryInstructions: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderReceipt, setOrderReceipt] = useState(null);

  // Sell-Back / Return Modal State
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellModelTarget, setSellModelTarget] = useState(null);
  const [sellImei, setSellImei] = useState('');
  const [sellDeclaration, setSellDeclaration] = useState(false);
  const [sellAddress, setSellAddress] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    alternatePhone: '',
    houseNumber: '',
    street: '',
    landmark: '',
    city: '',
    state: '',
    pinCode: '',
    deliveryInstructions: ''
  });
  const [sellSuccessMsg, setSellSuccessMsg] = useState('');

  // Premium Registration State
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumTargetModel, setPremiumTargetModel] = useState(null);
  const [premiumBrand, setPremiumBrand] = useState('Apple (iPhone)');
  const [premiumModelName, setPremiumModelName] = useState('iPhone 15 Pro');
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [premiumRam, setPremiumRam] = useState('8GB');
  const [premiumStorage, setPremiumStorage] = useState('256GB');
  const [premiumColor, setPremiumColor] = useState('Default');
  const [premiumImei, setPremiumImei] = useState('');
  const [premiumBillingDate, setPremiumBillingDate] = useState('');
  const [premiumOriginalPrice, setPremiumOriginalPrice] = useState('');
  const [premiumBillFile, setPremiumBillFile] = useState('');
  const [premiumBillName, setPremiumBillName] = useState('');
  const [premiumDeclaration, setPremiumDeclaration] = useState(false);
  const [subscriptionYears, setSubscriptionYears] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [premiumUtr, setPremiumUtr] = useState('');
  const [premiumPaymentMode, setPremiumPaymentMode] = useState('UPI');
  const [premiumAddress, setPremiumAddress] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    alternatePhone: '',
    houseNumber: '',
    street: '',
    landmark: '',
    city: '',
    state: '',
    pinCode: '',
    deliveryInstructions: ''
  });
  const [premiumReceipt, setPremiumReceipt] = useState(null);
  const [isSubmittingPremium, setIsSubmittingPremium] = useState(false);

  // User's My Devices / Warranties
  const [myOrders, setMyOrders] = useState([]);

  // Fetch catalog on mount
  useEffect(() => {
    fetch(`${VITE_BACKEND_URL}/api/devices/catalog`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.brands) {
          setBrands(data.brands);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load device catalog:', err);
        setLoading(false);
      });
  }, []);

  // Fetch user's orders
  const fetchMyOrders = () => {
    if (!user || !user.email) return;
    fetch(`${VITE_BACKEND_URL}/api/devices/my-orders/${encodeURIComponent(user.email)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMyOrders(data.orders || []);
        }
      })
      .catch(err => console.error('Failed to fetch my device orders:', err));
  };

  useEffect(() => {
    if (activeSubTab === 'my-devices') {
      fetchMyOrders();
    }
  }, [activeSubTab, user]);

  // Aggregate models from brands
  const allModels = brands.flatMap(brand => 
    (brand.models || []).map(m => ({ ...m, brandName: brand.name, brandId: brand.id }))
  );

  // Filter models
  const filteredModels = allModels.filter(m => {
    const matchBrand = selectedBrand === 'all' || m.brandId === selectedBrand;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.brandName.toLowerCase().includes(q);
    return matchBrand && matchSearch;
  });

  // Open Model Configurator
  const handleOpenConfigurator = (model) => {
    setActiveModel(model);
    setSelectedRam(model.rams[0] || '8GB');
    setSelectedStorage(model.storages[0] || '256GB');
    setSelectedColor(model.colors[0] || 'Default');
    setHasWarranty(true);
    setCheckoutStep('config');
    setOrderReceipt(null);
  };

  // Calculate prices
  const basePrice = activeModel 
    ? (condition === 'New' ? activeModel.basePriceNew : activeModel.basePriceRefurb)
    : 0;
  const warrantyFee = 0; // 10-Yr Guarantee Included Free (₹0)
  const totalPrice = basePrice;
  const marketPrice = activeModel?.marketBenchmark 
    ? activeModel.marketBenchmark 
    : (basePrice > 0 ? basePrice + 4000 : 0);
  const discountOnSellingPrice = Math.max(0, marketPrice - basePrice);
  const totalSavings = discountOnSellingPrice > 0 ? discountOnSellingPrice : 4000;

  // Handle Buy Checkout (Wallet debit or Send Request)
  const handleBuySubmit = async (e, paymentMode = 'WALLET') => {
    if (e && e.preventDefault) e.preventDefault();
    if (!user) {
      alert('Please log in to purchase devices.');
      return;
    }

    if (!address.fullName || !address.phone || !address.houseNumber || !address.street || !address.city || !address.state || !address.pinCode) {
      alert('Please fill out all required address fields.');
      return;
    }

    if (paymentMode === 'WALLET' && walletBalance < totalPrice) {
      alert(`Insufficient wallet balance. Required: ₹${totalPrice.toLocaleString()}, Available: ₹${Number(walletBalance || 0).toLocaleString()}. Please deposit funds first or click "Send Buy Request".`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/devices/order/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          brand: activeModel.brandName,
          model: activeModel.name,
          condition: condition === 'New' ? 'Brand New' : 'Certified Refurbished',
          ram: selectedRam,
          storage: selectedStorage,
          color: selectedColor,
          basePrice: basePrice,
          hasWarranty: hasWarranty,
          shippingAddress: address,
          paymentMode: paymentMode
        })
      });

      const data = await res.json();
      if (data.success) {
        if (paymentMode === 'WALLET') {
          if (data.walletBalance !== undefined && setWalletBalance) {
            setWalletBalance(data.walletBalance);
          }
          if (setTransactions) {
            const newTx = {
              id: 'TX-' + Math.floor(1000 + Math.random() * 9000),
              type: 'withdrawal',
              asset: 'wallet',
              amount: totalPrice,
              status: 'Completed',
              date: new Date().toISOString().slice(0, 16).replace('T', ' ')
            };
            setTransactions(prev => [newTx, ...(prev || [])]);
          }
        }
        setOrderReceipt({ ...data.order, isRequestOnly: data.isRequestOnly });
        setCheckoutStep('certificate');
      } else {
        alert(data.message || 'Failed to place order.');
      }
    } catch (err) {
      console.error('Order error:', err);
      alert('Network error while placing order: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Premium Registration Modal
  const handleOpenPremiumModal = (model = null) => {
    let brandName = 'Apple (iPhone)';
    let modelName = 'iPhone 15 Pro';
    let basePrice = '';
    let rams = ['4GB', '6GB', '8GB', '12GB', '16GB'];
    let storages = ['64GB', '128GB', '256GB', '512GB', '1TB'];
    let colors = ['Space Black', 'Natural Titanium', 'Silver', 'Gold', 'Blue', 'White', 'Default'];

    if (model) {
      // Find matching brand in master catalogue if possible
      const matchedBrand = MASTER_PHONE_CATALOGUE.find(b => 
        b.brand.toLowerCase() === (model.brandName || '').toLowerCase() ||
        b.brand.toLowerCase().includes((model.brandName || '').toLowerCase()) ||
        (model.brandName || '').toLowerCase().includes(b.brand.toLowerCase())
      );
      brandName = matchedBrand ? matchedBrand.brand : (model.brandName || 'Apple (iPhone)');
      modelName = model.name;
      basePrice = model.basePriceNew || '';
      if (model.rams && model.rams.length > 0) rams = model.rams;
      if (model.storages && model.storages.length > 0) storages = model.storages;
      if (model.colors && model.colors.length > 0) colors = model.colors;
    } else {
      const defaultBrandObj = MASTER_PHONE_CATALOGUE.find(b => b.brand === 'Apple (iPhone)') || MASTER_PHONE_CATALOGUE[0];
      brandName = defaultBrandObj.brand;
      modelName = defaultBrandObj.models[0]?.name || 'iPhone 15 Pro';
    }

    setPremiumBrand(brandName);
    setPremiumModelName(modelName);
    setPremiumTargetModel({
      brandName,
      name: modelName,
      rams,
      storages,
      colors
    });
    setPremiumRam(rams[0] || '8GB');
    setPremiumStorage(storages[0] || '256GB');
    setPremiumColor(colors[0] || 'Default');
    setPremiumImei('');
    setPremiumBillingDate('');
    setPremiumOriginalPrice(basePrice);
    setPremiumBillFile('');
    setPremiumBillName('');
    setPremiumDeclaration(false);
    setSubscriptionYears(1);
    setShowPaymentModal(false);
    setPremiumUtr('');
    setPremiumPaymentMode('UPI');
    setPremiumReceipt(null);
    setModelSearchQuery('');
    setShowPremiumModal(true);
  };

  const handleBrandChange = (newBrand) => {
    setPremiumBrand(newBrand);
    setModelSearchQuery('');
    const brandObj = MASTER_PHONE_CATALOGUE.find(b => b.brand === newBrand);
    if (brandObj && brandObj.models && brandObj.models.length > 0) {
      const firstModel = brandObj.models[0].name;
      setPremiumModelName(firstModel);
      setPremiumTargetModel(prev => ({
        ...prev,
        brandName: newBrand,
        name: firstModel
      }));
    } else {
      setPremiumModelName('');
      setPremiumTargetModel(prev => ({
        ...prev,
        brandName: newBrand,
        name: ''
      }));
    }
  };

  const handleModelChange = (newModelName) => {
    setPremiumModelName(newModelName);
    setPremiumTargetModel(prev => ({
      ...prev,
      name: newModelName
    }));
  };

  // Calculate depreciation based on purchase date (1% standard depreciation)
  const calculateDepreciation = (origPrice, bDate) => {
    const orig = parseFloat(origPrice) || 0;
    if (!bDate || orig <= 0) return { depRate: 1, depAmount: Math.round(orig * 0.01), lockedPrice: Math.round(orig * 0.99), diffYears: 1, diffDays: 365 };
    const billTime = new Date(bDate).getTime();
    const nowTime = Date.now();
    const diffDays = Math.max(0, Math.floor((nowTime - billTime) / (1000 * 60 * 60 * 24)));
    const diffYears = diffDays / 365.25;

    let depRate = 1;
    if (diffYears > 1.5 && diffYears <= 2.5) depRate = 2;
    else if (diffYears > 2.5 && diffYears <= 3.5) depRate = 3;
    else if (diffYears > 3.5) depRate = 4;
    else depRate = 1; // Exactly 1 year ago or standard = 1%

    const depAmount = Math.round((orig * depRate) / 100);
    const lockedPrice = Math.max(0, orig - depAmount);
    return { depRate, depAmount, lockedPrice, diffYears, diffDays };
  };

  // Upload Invoice / Bill Handler
  const handleBillFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPremiumBillName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPremiumBillFile(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Step 1 Validation: Proceed to Payment Modal
  const handleProceedToPayment = (e) => {
    if (e) e.preventDefault();
    if (!user) return alert('Please log in to register your device.');
    if (!premiumImei || premiumImei.trim().length < 8) return alert('Please enter a valid IMEI number.');
    if (!premiumBillingDate) return alert('Please select the original purchase / billing date.');
    if (!premiumOriginalPrice || Number(premiumOriginalPrice) <= 0) return alert('Please enter the original invoice purchase price.');
    if (!premiumDeclaration) return alert('Please confirm that the device is free from external cracks or internal physical/water damage.');
    if (!premiumBillFile) return alert('Upload Billing Paper / Invoice Photo is MANDATORY. Please upload your purchase invoice or bill before submitting.');
    if (!premiumAddress.fullName || !premiumAddress.phone || !premiumAddress.houseNumber || !premiumAddress.city || !premiumAddress.pinCode) {
      return alert('Please fill in complete contact and address details.');
    }
    setPremiumUtr('');
    setShowPaymentModal(true);
  };
  const handlePremiumSubmit = handleProceedToPayment;

  // Step 2 Submission: Submit Payment & Registration
  const handleFinalPremiumSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!premiumUtr || !premiumUtr.trim()) {
      return alert('Please enter the UTR or Reference Number of your deposit transaction.');
    }

    setIsSubmittingPremium(true);
    try {
      const subFee = subscriptionYears * 118;
      const res = await fetch(`${VITE_BACKEND_URL}/api/devices/order/premium-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          brand: premiumBrand || premiumTargetModel?.brandName || 'Smartphone',
          model: premiumModelName || premiumTargetModel?.name || 'Device',
          condition: 'Original Customer Device',
          ram: premiumRam,
          storage: premiumStorage,
          color: premiumColor,
          imei: premiumImei.trim(),
          billingDate: premiumBillingDate,
          originalInvoicePrice: parseFloat(premiumOriginalPrice),
          invoiceDocument: premiumBillFile,
          conditionDeclaration: true,
          customerAddress: premiumAddress,
          subscriptionYears: subscriptionYears,
          subscriptionFee: subFee,
          utr: premiumUtr.trim().toUpperCase(),
          paymentMode: premiumPaymentMode
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowPaymentModal(false);
        setPremiumReceipt(data.order);
      } else {
        alert(data.message || 'Failed to submit premium registration.');
      }
    } catch (err) {
      alert('Error submitting premium request: ' + err.message);
    } finally {
      setIsSubmittingPremium(false);
    }
  };

  // Open Sell-Back Modal
  const handleOpenSellModal = (model) => {
    setSellModelTarget(model);
    setSellImei('');
    setSellDeclaration(false);
    setSellSuccessMsg('');
    setShowSellModal(true);
  };

  // Submit Sell-Back Request
  const handleSellSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert('Please log in.');
    if (!sellImei || sellImei.length < 8) return alert('Please enter a valid IMEI number.');
    if (!sellDeclaration) return alert('Please check the physical condition confirmation declaration.');
    if (!sellAddress.fullName || !sellAddress.phone || !sellAddress.houseNumber || !sellAddress.street || !sellAddress.city || !sellAddress.pinCode) {
      return alert('Please fill in complete pickup address details.');
    }

    setIsSubmitting(true);
    try {
      const sellBase = condition === 'New' ? sellModelTarget.basePriceNew : sellModelTarget.basePriceRefurb;
      const res = await fetch(`${VITE_BACKEND_URL}/api/devices/order/sell-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          brand: sellModelTarget.brandName,
          model: sellModelTarget.name,
          condition: condition === 'New' ? 'Brand New' : 'Refurbished',
          ram: sellModelTarget.rams[0],
          storage: sellModelTarget.storages[0],
          color: sellModelTarget.colors[0],
          basePrice: sellBase,
          imei: sellImei,
          conditionDeclaration: true,
          pickupAddress: sellAddress
        })
      });

      const data = await res.json();
      if (data.success) {
        setSellSuccessMsg(`Sell-back request #${data.order.id} submitted! Pickup and Investhour QA inspection scheduled. 100% price parity payout (₹${sellBase.toLocaleString()}) will be credited to your wallet once physical inspection is verified.`);
      } else {
        alert(data.message || 'Failed to submit sell-back request.');
      }
    } catch (err) {
      alert('Error submitting sell-back: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 0', maxWidth: '1280px', margin: '0 auto', color: '#ffffff' }}>
      
      {/* Top Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(32, 15, 51, 0.9) 0%, rgba(18, 10, 28, 0.95) 100%)',
        border: '1px solid rgba(217, 175, 86, 0.25)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
      }}>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(217, 175, 86, 0.15)', border: '1px solid rgba(217, 175, 86, 0.3)', padding: '6px 14px', borderRadius: '30px', fontSize: '12px', fontWeight: 700, color: '#d9af56', marginBottom: '14px' }}>
              <Sparkles size={14} /> Zero-Spread E-Commerce Exchange
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 10px', color: '#ffffff', letterSpacing: '-0.5px' }}>
              Buy & Sell Electronics at <span style={{ color: '#d9af56' }}>100% Price Parity</span>
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#9c93a8', maxWidth: '640px', lineHeight: 1.6 }}>
              Purchase smartphones and gadgets with an included <strong>10-Year Return Guarantee (₹0 Extra Fee)</strong>. Sell back to Investhour anytime at the exact same purchase price (100% same money back!), provided the device is free from external or internal damage.
            </p>
          </div>

          {/* Sub Navigation Switcher */}
          <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveSubTab('store')}
              style={{
                background: activeSubTab === 'store' ? '#d9af56' : 'transparent',
                color: activeSubTab === 'store' ? '#060309' : '#9c93a8',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Smartphone size={16} /> Device Store
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('my-devices')}
              style={{
                background: activeSubTab === 'my-devices' ? '#d9af56' : 'transparent',
                color: activeSubTab === 'my-devices' ? '#060309' : '#9c93a8',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <ShieldCheck size={16} /> My Devices & Orders
            </button>
            <button
              type="button"
              onClick={() => handleOpenPremiumModal(null)}
              style={{
                background: 'linear-gradient(135deg, rgba(217, 175, 86, 0.22) 0%, rgba(139, 92, 246, 0.3) 100%)',
                color: '#d9af56',
                border: '1px solid rgba(217, 175, 86, 0.5)',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 10px rgba(217, 175, 86, 0.15)'
              }}
            >
              <Crown size={16} style={{ color: '#d9af56' }} /> Register Any Phone (Premium)
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'store' ? (
        <>
          {/* Controls Bar: Condition Switcher & Search Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            
            {/* Condition Mode Pill Switcher */}
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                onClick={() => setCondition('New')}
                style={{
                  background: condition === 'New' ? 'rgba(217, 175, 86, 0.2)' : 'transparent',
                  color: condition === 'New' ? '#d9af56' : '#9c93a8',
                  border: condition === 'New' ? '1px solid rgba(217, 175, 86, 0.4)' : '1px solid transparent',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={14} /> Brand New (Factory Sealed)
              </button>
              <button
                type="button"
                onClick={() => setCondition('Refurbished')}
                style={{
                  background: condition === 'Refurbished' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: condition === 'Refurbished' ? '#10b981' : '#9c93a8',
                  border: condition === 'Refurbished' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ShieldCheck size={14} /> Certified Refurbished (Grade A+)
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '320px', flex: 1, maxWidth: '480px' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9c93a8' }} />
              <input
                type="text"
                placeholder="Search phone model (e.g. S24 Ultra, iPhone 16 Pro, Pixel 9)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 40px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>

          {/* Brand Logos Showcase Grid */}
          <div style={{ marginBottom: '28px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#9c93a8', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>
              Select Brand
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
              <div
                onClick={() => setSelectedBrand('all')}
                style={{
                  background: selectedBrand === 'all' ? 'rgba(217, 175, 86, 0.15)' : 'rgba(255,255,255,0.02)',
                  border: '1px solid ' + (selectedBrand === 'all' ? '#d9af56' : 'rgba(255,255,255,0.08)'),
                  borderRadius: '12px',
                  padding: '16px 12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: selectedBrand === 'all' ? '#d9af56' : '#ffffff' }}>
                  ALL BRANDS
                </div>
                <div style={{ fontSize: '11px', color: '#9c93a8', marginTop: '6px' }}>
                  {allModels.length} Models
                </div>
              </div>

              {brands.map(brand => (
                <div
                  key={brand.id}
                  onClick={() => setSelectedBrand(brand.id)}
                  style={{
                    background: selectedBrand === brand.id ? 'rgba(217, 175, 86, 0.15)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid ' + (selectedBrand === brand.id ? '#d9af56' : 'rgba(255,255,255,0.08)'),
                    borderRadius: '12px',
                    padding: '16px 12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <div 
                    style={{ height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedBrand === brand.id ? '#d9af56' : '#ffffff' }}
                    dangerouslySetInnerHTML={{ __html: brand.logoSvg }}
                  />
                  <div style={{ fontSize: '12px', fontWeight: 700, color: selectedBrand === brand.id ? '#d9af56' : '#ffffff', marginTop: '8px' }}>
                    {brand.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9c93a8', marginTop: '2px' }}>
                    {(brand.models || []).length} Models
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Catalog Grid */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#9c93a8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Available Models ({filteredModels.length})
              </span>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                ✓ Guaranteed Buyback at 100% Base Cost
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#9c93a8' }}>
                Loading phone models...
              </div>
            ) : filteredModels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <Smartphone size={36} style={{ color: '#9c93a8', marginBottom: '12px' }} />
                <h4 style={{ margin: '0 0 6px', color: '#ffffff' }}>No models match your search</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#9c93a8' }}>Try searching another keyword or select All Brands.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
                {filteredModels.map(model => {
                  const currentPrice = condition === 'New' ? model.basePriceNew : model.basePriceRefurb;
                  return (
                    <div
                      key={model.id}
                      style={{
                        background: 'rgba(18, 10, 28, 0.75)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                      }}
                    >
                      {/* Product Thumbnail */}
                      <div style={{ position: 'relative', height: '210px', overflow: 'hidden', background: 'radial-gradient(circle at center, rgba(35, 18, 55, 0.7) 0%, #0e0717 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
                        <img 
                          src={model.image} 
                          alt={model.name}
                          style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.65))', transition: 'transform 0.3s ease' }} 
                        />
                        <div style={{ position: 'absolute', top: '12px', left: '12px', background: condition === 'New' ? '#d9af56' : '#10b981', color: '#060309', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                          {condition === 'New' ? 'Brand New' : 'Certified Refurb'}
                        </div>
                        <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                          {model.brandName}
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px', color: '#ffffff' }}>
                          {model.name}
                        </h3>

                        {/* Specs overview */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                          <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px', color: '#9c93a8' }}>
                            {model.rams.join('/')} RAM
                          </span>
                          <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px', color: '#9c93a8' }}>
                            {model.storages.join(', ')}
                          </span>
                          <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px', color: '#9c93a8' }}>
                            {model.year}
                          </span>
                        </div>

                        {/* Benchmark & Price Parity Box */}
                        <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9c93a8', marginBottom: '4px' }}>
                            <span>Live Market Retail:</span>
                            <span style={{ textDecoration: 'line-through' }}>₹{model.marketBenchmark.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '12px', color: '#d9af56', fontWeight: 700 }}>Investhour Parity Price:</span>
                            <span style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>₹{currentPrice.toLocaleString()}</span>
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#9c93a8', marginTop: '4px', textAlign: 'right' }}>
                            Sell-Back Value: <strong style={{ color: '#10b981' }}>₹{currentPrice.toLocaleString()}</strong> (100% same!)
                          </div>
                        </div>

                        {/* Action CTAs */}
                        <div style={{ marginTop: 'auto', display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenConfigurator(model)}
                            style={{
                              flex: 1,
                              background: '#d9af56',
                              color: '#060309',
                              border: 'none',
                              padding: '10px 8px',
                              borderRadius: '8px',
                              fontWeight: 800,
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <ShoppingBag size={13} /> Buy Phone
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenSellModal(model)}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              color: '#ffffff',
                              border: '1px solid rgba(255,255,255,0.12)',
                              padding: '10px 8px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <RotateCcw size={13} /> Sell Back
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenPremiumModal(model)}
                            style={{
                              background: 'linear-gradient(135deg, rgba(217, 175, 86, 0.22) 0%, rgba(139, 92, 246, 0.28) 100%)',
                              color: '#d9af56',
                              border: '1px solid rgba(217, 175, 86, 0.45)',
                              padding: '10px 10px',
                              borderRadius: '8px',
                              fontWeight: 800,
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 8px rgba(217, 175, 86, 0.15)'
                            }}
                          >
                            <Crown size={13} style={{ color: '#d9af56' }} /> Premium
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* User's My Devices / Warranties Tab */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
              My Investhour Devices & 10-Year Warranties
            </h2>
            <button
              type="button"
              onClick={fetchMyOrders}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
            >
              Refresh
            </button>
          </div>

          {myOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Smartphone size={40} style={{ color: '#9c93a8', marginBottom: '14px' }} />
              <h3 style={{ margin: '0 0 8px', color: '#ffffff' }}>No device purchases or returns yet</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#9c93a8' }}>
                Go to the <strong>Device Store</strong> tab to purchase your first smartphone with 100% price parity guarantee!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myOrders.map(ord => (
                <div
                  key={ord.id}
                  style={{
                    background: 'rgba(18, 10, 28, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{
                        background: ord.order_type === 'BUY' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(217, 175, 86, 0.15)',
                        color: ord.order_type === 'BUY' ? '#10b981' : '#d9af56',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 800
                      }}>
                        {ord.order_type === 'BUY' ? 'PURCHASE' : 'SELL-BACK'}
                      </span>
                      <strong style={{ fontSize: '13px', color: '#9c93a8', fontFamily: 'monospace' }}>#{ord.id}</strong>
                      <span style={{ fontSize: '11px', color: '#9c93a8' }}>
                        {new Date(ord.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: '#ffffff' }}>
                      {ord.brand} {ord.model} ({ord.ram} / {ord.storage}, {ord.color})
                    </h4>

                    <div style={{ fontSize: '12px', color: '#9c93a8' }}>
                      Deliver to: {ord.full_name} • {ord.city}, {ord.state} ({ord.pin_code})
                    </div>
                  </div>

                  {/* Financials & Warranty Badge */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff' }}>
                      ₹{parseFloat(ord.total_amount).toLocaleString()}
                    </div>
                    {ord.has_warranty && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d9af56', fontSize: '11.5px', fontWeight: 700, marginTop: '4px' }}>
                        <ShieldCheck size={14} /> 10-Yr Parity Warranty Active
                      </div>
                    )}
                    <div style={{ marginTop: '8px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        background: ord.status === 'Delivered' || ord.status === 'ApprovedAndRefunded' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(217, 175, 86, 0.2)',
                        color: ord.status === 'Delivered' || ord.status === 'ApprovedAndRefunded' ? '#10b981' : '#d9af56'
                      }}>
                        Status: {ord.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Buy Configurator & Address Drawer Modal */}
      {activeModel && (
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
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#120a1c',
            border: '1px solid rgba(217, 175, 86, 0.3)',
            borderRadius: '20px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#d9af56', textTransform: 'uppercase' }}>
                  {condition === 'New' ? 'Brand New' : 'Refurbished'} • {activeModel.brandName}
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 0', color: '#ffffff' }}>
                  {activeModel.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModel(null)}
                style={{ background: 'transparent', border: 'none', color: '#9c93a8', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* STEP 1: CONFIGURATION */}
            {checkoutStep === 'config' && (
              <div>
                {/* Device Photo Preview */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '170px', background: 'radial-gradient(circle at center, rgba(35, 18, 55, 0.7) 0%, #0e0717 100%)', borderRadius: '14px', marginBottom: '18px', padding: '12px' }}>
                  <img 
                    src={activeModel.image} 
                    alt={activeModel.name}
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.65))' }} 
                  />
                </div>

                {/* RAM Selection */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#9c93a8', display: 'block', marginBottom: '8px' }}>
                    Select RAM:
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {activeModel.rams.map(ram => (
                      <button
                        key={ram}
                        type="button"
                        onClick={() => setSelectedRam(ram)}
                        style={{
                          background: selectedRam === ram ? '#d9af56' : 'rgba(255,255,255,0.04)',
                          color: selectedRam === ram ? '#060309' : '#ffffff',
                          border: '1px solid ' + (selectedRam === ram ? '#d9af56' : 'rgba(255,255,255,0.1)'),
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        {ram}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Storage / ROM Selection */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#9c93a8', display: 'block', marginBottom: '8px' }}>
                    Select Internal Storage (ROM):
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {activeModel.storages.map(storage => (
                      <button
                        key={storage}
                        type="button"
                        onClick={() => setSelectedStorage(storage)}
                        style={{
                          background: selectedStorage === storage ? '#d9af56' : 'rgba(255,255,255,0.04)',
                          color: selectedStorage === storage ? '#060309' : '#ffffff',
                          border: '1px solid ' + (selectedStorage === storage ? '#d9af56' : 'rgba(255,255,255,0.1)'),
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        {storage}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#9c93a8', display: 'block', marginBottom: '8px' }}>
                    Select Color Finish:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {activeModel.colors.map(col => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setSelectedColor(col)}
                        style={{
                          background: selectedColor === col ? 'rgba(217, 175, 86, 0.2)' : 'rgba(255,255,255,0.04)',
                          color: selectedColor === col ? '#d9af56' : '#ffffff',
                          border: '1px solid ' + (selectedColor === col ? '#d9af56' : 'rgba(255,255,255,0.1)'),
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 10-Year Warranty & Parity Return Clause Card */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldCheck size={22} style={{ color: '#10b981', flexShrink: 0 }} />
                      <div>
                        <strong style={{ fontSize: '14px', color: '#ffffff', display: 'block' }}>
                          10-Year Parity Return Guarantee Included
                        </strong>
                        <span style={{ fontSize: '11.5px', color: '#9c93a8' }}>
                          Return to Investhour anytime within 10 years at 100% of purchase price (₹{basePrice.toLocaleString()}) — exact same money back!
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '6px' }}>
                      INCLUDED (₹0)
                    </span>
                  </div>

                  {/* Damage Exclusion Notice */}
                  <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', fontSize: '11px', color: '#f59e0b', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Return Condition Clause:</strong> For full 100% purchase parity return, the device must pass inspection. Any external body dents, cracked screen/glass, or internal hardware/water damage voids return eligibility.
                    </div>
                  </div>
                </div>

                {/* Price Details (Exact Match to Price Breakdown) */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '18px',
                  borderRadius: '14px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '14px', letterSpacing: '-0.2px' }}>
                    Price Details
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9c93a8', marginBottom: '9px' }}>
                    <span style={{ borderBottom: '1px dotted rgba(255, 255, 255, 0.25)', cursor: 'default' }}>
                      Selling Price (incl. of all taxes)
                    </span>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>₹{marketPrice.toLocaleString()}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9c93a8', marginBottom: '9px' }}>
                    <span style={{ borderBottom: '1px dotted rgba(255, 255, 255, 0.25)', cursor: 'default' }}>
                      Protect Promise Fee (1)
                    </span>
                    <div>
                      <span style={{ textDecoration: 'line-through', color: '#888', marginRight: '6px', fontSize: '12px' }}>₹2,000</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>FREE</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.1)', margin: '8px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9c93a8', marginBottom: '9px' }}>
                    <span>Discount on Selling Price</span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>-₹{discountOnSellingPrice.toLocaleString()}</span>
                  </div>

                  <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.1)', margin: '8px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>Total Amount</span>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff' }}>₹{totalPrice.toLocaleString()}</span>
                  </div>

                  {/* You'll Save Banner (Matching Image 2) */}
                  <div style={{
                    marginTop: '14px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#10b981',
                      color: '#060309',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 900,
                      flexShrink: 0
                    }}>
                      %
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                      You'll Save ₹{totalSavings.toLocaleString()} on this order
                    </span>
                  </div>
                </div>

                {/* Continue to Address */}
                <button
                  type="button"
                  onClick={() => setCheckoutStep('address')}
                  style={{
                    width: '100%',
                    background: '#d9af56',
                    color: '#060309',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Continue to Delivery Address →
                </button>
              </div>
            )}

            {/* STEP 2: ADDRESS & CONFIRMATION */}
            {checkoutStep === 'address' && (
              <form onSubmit={(e) => handleBuySubmit(e, Number(walletBalance || 0) >= totalPrice ? 'WALLET' : 'REQUEST')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', color: '#d9af56', fontSize: '13px', fontWeight: 700 }}>
                  <MapPin size={16} /> Enter Complete Delivery Address
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={address.fullName}
                      onChange={e => setAddress({ ...address, fullName: e.target.value })}
                      style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>Primary Mobile Phone *</label>
                    <input
                      type="tel"
                      required
                      value={address.phone}
                      onChange={e => setAddress({ ...address, phone: e.target.value })}
                      style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>House / Flat / Building No. *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flat 402, Royal Palms Apartment"
                    value={address.houseNumber}
                    onChange={e => setAddress({ ...address, houseNumber: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>Street / Area *</label>
                    <input
                      type="text"
                      required
                      placeholder="Road name or colony"
                      value={address.street}
                      onChange={e => setAddress({ ...address, street: e.target.value })}
                      style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>Landmark (Optional)</label>
                    <input
                      type="text"
                      placeholder="Near Metro or Temple"
                      value={address.landmark}
                      onChange={e => setAddress({ ...address, landmark: e.target.value })}
                      style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>City *</label>
                    <input
                      type="text"
                      required
                      value={address.city}
                      onChange={e => setAddress({ ...address, city: e.target.value })}
                      style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>State *</label>
                    <input
                      type="text"
                      required
                      value={address.state}
                      onChange={e => setAddress({ ...address, state: e.target.value })}
                      style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>PIN Code *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={address.pinCode}
                      onChange={e => setAddress({ ...address, pinCode: e.target.value })}
                      style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                    />
                  </div>
                </div>

                {/* Wallet Balance Warning */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#9c93a8', display: 'block' }}>Your Investhour Wallet Balance:</span>
                    <strong style={{ fontSize: '15px', color: Number(walletBalance || 0) >= totalPrice ? '#10b981' : '#ef4444' }}>
                      ₹{Number(walletBalance || 0).toLocaleString()}
                    </strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#9c93a8', display: 'block' }}>Debit Amount:</span>
                    <strong style={{ fontSize: '16px', color: '#ffffff' }}>₹{totalPrice.toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Option 1: Send Buy Request (Always available) */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={(e) => handleBuySubmit(e, 'REQUEST')}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #d9af56 0%, #b8860b 100%)',
                      color: '#060309',
                      border: 'none',
                      padding: '14px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 16px rgba(217, 175, 86, 0.25)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <Send size={16} />
                    {isSubmitting ? 'Submitting Request...' : `Send Buy Request (₹${totalPrice.toLocaleString()})`}
                  </button>

                  {/* Option 2: Back button + Pay from Wallet button */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('config')}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '12px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || Number(walletBalance || 0) < totalPrice}
                      onClick={(e) => handleBuySubmit(e, 'WALLET')}
                      style={{
                        flex: 1,
                        background: Number(walletBalance || 0) >= totalPrice ? '#10b981' : 'rgba(255,255,255,0.06)',
                        color: Number(walletBalance || 0) >= totalPrice ? '#ffffff' : '#6b7280',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '12px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: Number(walletBalance || 0) >= totalPrice ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {Number(walletBalance || 0) >= totalPrice
                        ? `Confirm & Pay ₹${totalPrice.toLocaleString()} from Wallet`
                        : `Pay from Wallet (Low Balance)`}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: DIGITAL CERTIFICATE / RECEIPT */}
            {checkoutStep === 'certificate' && orderReceipt && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: (orderReceipt.isRequestOnly || orderReceipt.status === 'Request Submitted') ? 'rgba(217, 175, 86, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: (orderReceipt.isRequestOnly || orderReceipt.status === 'Request Submitted') ? '#d9af56' : '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  {(orderReceipt.isRequestOnly || orderReceipt.status === 'Request Submitted') ? <Send size={30} /> : <CheckCircle size={32} />}
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px', color: '#ffffff' }}>
                  {(orderReceipt.isRequestOnly || orderReceipt.status === 'Request Submitted') ? 'Buy Request Sent!' : 'Device Purchase Confirmed!'}
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#9c93a8' }}>
                  {(orderReceipt.isRequestOnly || orderReceipt.status === 'Request Submitted') ? (
                    <>Order Request <strong>#{orderReceipt.id}</strong> has been submitted. Our logistics desk will review your address and coordinate dispatch.</>
                  ) : (
                    <>Order <strong>#{orderReceipt.id}</strong> has been confirmed for dispatch to your address.</>
                  )}
                </p>

                {/* Vault Ownership Certificate Box */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(217, 175, 86, 0.1) 0%, rgba(32, 15, 51, 0.6) 100%)',
                  border: '1px solid rgba(217, 175, 86, 0.4)',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'left',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#d9af56' }}>INVESTHOUR DIGITAL VAULT CERTIFICATE</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>VERIFIED PARITY</span>
                  </div>

                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                    {orderReceipt.brand} {orderReceipt.model}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9c93a8', marginBottom: '12px' }}>
                    Specs: {orderReceipt.ram} / {orderReceipt.storage} • {orderReceipt.color}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: '#9c93a8' }}>Guaranteed Buyback Price:</span>
                      <div style={{ fontWeight: 800, color: '#10b981', fontSize: '15px' }}>₹{parseFloat(orderReceipt.base_price).toLocaleString()}</div>
                    </div>
                    <div>
                      <span style={{ color: '#9c93a8' }}>Warranty Coverage:</span>
                      <div style={{ fontWeight: 700, color: '#d9af56' }}>10-Year Parity Protection</div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModel(null);
                    setActiveSubTab('my-devices');
                  }}
                  style={{
                    background: '#d9af56',
                    color: '#060309',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  View in My Devices & Orders
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sell-Back / Return Modal */}
      {showSellModal && sellModelTarget && (
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
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#120a1c',
            border: '1px solid rgba(217, 175, 86, 0.3)',
            borderRadius: '20px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                  100% Price Parity Buyback
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0', color: '#ffffff' }}>
                  Sell Back: {sellModelTarget.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSellModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#9c93a8', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {sellSuccessMsg ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '14px' }} />
                <h4 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>Claim Submitted!</h4>
                <p style={{ fontSize: '13.5px', color: '#9c93a8', lineHeight: 1.6 }}>{sellSuccessMsg}</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowSellModal(false);
                    setActiveSubTab('my-devices');
                  }}
                  style={{ background: '#d9af56', color: '#060309', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', marginTop: '16px' }}
                >
                  View My Requests
                </button>
              </div>
            ) : (
              <form onSubmit={handleSellSubmit}>
                {/* Device Photo Preview */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', background: 'radial-gradient(circle at center, rgba(35, 18, 55, 0.7) 0%, #0e0717 100%)', borderRadius: '12px', marginBottom: '16px', padding: '10px' }}>
                  <img 
                    src={sellModelTarget.image} 
                    alt={sellModelTarget.name}
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))' }} 
                  />
                </div>

                {/* Parity Payout Banner */}
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#ffffff' }}>Guaranteed Parity Payout:</span>
                    <strong style={{ fontSize: '22px', color: '#10b981', fontWeight: 900 }}>
                      ₹{(condition === 'New' ? sellModelTarget.basePriceNew : sellModelTarget.basePriceRefurb).toLocaleString()}
                    </strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9c93a8', marginTop: '4px' }}>
                    Credited directly to your Investhour wallet upon successful physical QA inspection.
                  </div>
                </div>

                {/* IMEI Number Input */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', color: '#9c93a8', display: 'block', marginBottom: '6px' }}>
                    Device IMEI Number * (Dial *#06# to view)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter 15-digit IMEI number"
                    value={sellImei}
                    onChange={e => setSellImei(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                {/* Physical Damage Declaration Checkbox */}
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      id="damage-declaration"
                      checked={sellDeclaration}
                      onChange={e => setSellDeclaration(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#ef4444', marginTop: '2px', cursor: 'pointer' }}
                    />
                    <label htmlFor="damage-declaration" style={{ fontSize: '12px', color: '#ffffff', cursor: 'pointer', lineHeight: 1.5 }}>
                      <strong>Integrity Self-Declaration:</strong> I certify that this device is in working condition with <strong>NO screen cracks, NO heavy body dents, and NO internal motherboard or liquid/water damage</strong>. I understand that physical damage voids the 100% price parity return.
                    </label>
                  </div>
                </div>

                {/* Pickup Address */}
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#d9af56', display: 'block', marginBottom: '8px' }}>
                    Pickup Address (Courier will collect from this address):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={sellAddress.fullName}
                      onChange={e => setSellAddress({ ...sellAddress, fullName: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Contact Phone"
                      value={sellAddress.phone}
                      onChange={e => setSellAddress({ ...sellAddress, phone: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                    />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="House / Street / Colony"
                    value={sellAddress.houseNumber}
                    onChange={e => setSellAddress({ ...sellAddress, houseNumber: e.target.value, street: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', marginBottom: '10px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={sellAddress.city}
                      onChange={e => setSellAddress({ ...sellAddress, city: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                    />
                    <input
                      type="text"
                      required
                      placeholder="PIN Code"
                      value={sellAddress.pinCode}
                      onChange={e => setSellAddress({ ...sellAddress, pinCode: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !sellDeclaration}
                  style={{
                    width: '100%',
                    background: sellDeclaration ? '#10b981' : '#555',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: sellDeclaration ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isSubmitting ? 'Transmitting Request...' : 'Submit Sell-Back Return Claim'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Premium Registration Modal */}
      {showPremiumModal && (() => {
        const { depRate, depAmount, lockedPrice, diffYears, diffDays } = calculateDepreciation(premiumOriginalPrice, premiumBillingDate);
        const currentBrandObj = MASTER_PHONE_CATALOGUE.find(b => b.brand === premiumBrand) || { models: [] };
        const filteredModels = currentBrandObj.models.filter(m => 
          !modelSearchQuery.trim() || m.name.toLowerCase().includes(modelSearchQuery.trim().toLowerCase())
        );

        return (
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
            zIndex: 99999,
            padding: '20px'
          }}>
            <div style={{
              background: '#120a1c',
              border: '1px solid rgba(217, 175, 86, 0.4)',
              borderRadius: '20px',
              maxWidth: '660px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '28px',
              position: 'relative',
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
            }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#d9af56', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                    <Crown size={14} /> 10-Year Parity Protection • Customer Device Registration
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 0', color: '#ffffff' }}>
                    Register Mobile: {premiumBrand} - {premiumModelName || 'Select Model'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPremiumModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#9c93a8', cursor: 'pointer' }}
                >
                  <X size={22} />
                </button>
              </div>

              {!premiumReceipt ? (
                <form onSubmit={handleProceedToPayment}>
                  {/* Brand & Model Catalogue Selector (from 35 Brands & 1,162 Models) */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(217, 175, 86, 0.25)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#d9af56', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Smartphone size={14} /> Select Phone Brand & Model (All Indian Brands Catalogue)
                      </span>
                      <span style={{ fontSize: '10.5px', color: '#9c93a8' }}>
                        35 Brands • 1,162 Models
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                      {/* Brand Dropdown */}
                      <div>
                        <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>
                          Select Brand (35 Brands) *
                        </label>
                        <select
                          value={premiumBrand}
                          onChange={e => handleBrandChange(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '9px 10px',
                            background: '#190e26',
                            border: '1px solid rgba(217, 175, 86, 0.35)',
                            borderRadius: '6px',
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '12.5px'
                          }}
                        >
                          {MASTER_PHONE_CATALOGUE.map(b => (
                            <option key={b.brand} value={b.brand} style={{ background: '#120a1c' }}>
                              {b.brand} ({b.modelCount} models)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Model Search & Dropdown */}
                      <div>
                        <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>
                          Select Model ({currentBrandObj.models.length} available) *
                        </label>
                        <select
                          value={premiumModelName}
                          onChange={e => handleModelChange(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '9px 10px',
                            background: '#190e26',
                            border: '1px solid rgba(217, 175, 86, 0.35)',
                            borderRadius: '6px',
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '12.5px'
                          }}
                        >
                          {filteredModels.map(m => (
                            <option key={m.name} value={m.name} style={{ background: '#120a1c' }}>
                              {m.name} {m.year ? `(${m.year})` : ''}
                            </option>
                          ))}
                          {filteredModels.length === 0 && (
                            <option value="" disabled style={{ background: '#120a1c' }}>No matching model found</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Quick Filter Search Input */}
                    <div>
                      <input
                        type="text"
                        placeholder={`🔍 Quick filter ${premiumBrand} models (e.g. Pro, Ultra, Note, Max, GT, Neo)...`}
                        value={modelSearchQuery}
                        onChange={e => setModelSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '11.5px'
                        }}
                      />
                    </div>
                  </div>

                  {/* Model Specs Selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>RAM Variant</label>
                      <select
                        value={premiumRam}
                        onChange={e => setPremiumRam(e.target.value)}
                        style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                      >
                        {(premiumTargetModel?.rams || ['4GB', '6GB', '8GB', '12GB', '16GB']).map(r => <option key={r} value={r} style={{ background: '#120a1c' }}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>Storage</label>
                      <select
                        value={premiumStorage}
                        onChange={e => setPremiumStorage(e.target.value)}
                        style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                      >
                        {(premiumTargetModel?.storages || ['64GB', '128GB', '256GB', '512GB', '1TB']).map(s => <option key={s} value={s} style={{ background: '#120a1c' }}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>Color</label>
                      <select
                        value={premiumColor}
                        onChange={e => setPremiumColor(e.target.value)}
                        style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                      >
                        {(premiumTargetModel?.colors || ['Space Black', 'Natural Titanium', 'Silver', 'Gold', 'Blue', 'White', 'Default']).map(c => <option key={c} value={c} style={{ background: '#120a1c' }}>{c}</option>)}
c:\Users\shiva\OneDrive\Pictures\Screenshots\Screenshot 2026-11-22 184421.png                      </select>
                    </div>
                  </div>

                  {/* IMEI Number */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>
                      Device 15-Digit IMEI Number * (Dial *#06# on mobile)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 358941098234123"
                      value={premiumImei}
                      onChange={e => setPremiumImei(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', letterSpacing: '1px' }}
                    />
                  </div>

                  {/* Original Billing Date & Price You Bought For */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>
                        Purchase Date on Bill *
                      </label>
                      <input
                        type="date"
                        required
                        max={new Date().toISOString().slice(0, 10)}
                        value={premiumBillingDate}
                        onChange={e => setPremiumBillingDate(e.target.value)}
                        style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginBottom: '4px' }}>
                        Original Price You Bought For (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1000"
                        placeholder="e.g. 144900"
                        value={premiumOriginalPrice}
                        onChange={e => setPremiumOriginalPrice(e.target.value)}
                        style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                      />
                    </div>
                  </div>

                  {/* Live Depreciation & 10-Yr Locked Value Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(217, 175, 86, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
                    border: '1px solid rgba(217, 175, 86, 0.35)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '18px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#d9af56' }}>10-YEAR GUARANTEED PARITY VALUATION</span>
                      <span style={{ fontSize: '11px', background: 'rgba(217, 175, 86, 0.2)', color: '#d9af56', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        {depRate}% Depreciation Applied
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', marginBottom: '10px' }}>
                      <div>
                        <span style={{ color: '#9c93a8', display: 'block' }}>Device Age:</span>
                        <strong style={{ color: '#ffffff' }}>
                          {premiumBillingDate ? `${diffDays} days (~${diffYears < 1 ? '< 1 yr' : `${diffYears.toFixed(1)} yrs`})` : 'Select bill date'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#9c93a8', display: 'block' }}>Depreciation Deduction:</span>
                        <strong style={{ color: '#ef4444' }}>-₹{depAmount.toLocaleString()}</strong>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: '#9c93a8', display: 'block' }}>Locked 10-Year Return Price:</span>
                        <small style={{ fontSize: '10.5px', color: '#d9af56' }}>Starts immediately upon Super Admin approval</small>
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 900, color: '#10b981' }}>
                        ₹{lockedPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Billing Paper / Invoice Upload (Mandatory) */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700 }}>Upload Billing Paper / Invoice Photo *</span>
                      <span style={{
                        background: premiumBillFile ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: premiumBillFile ? '#10b981' : '#f87171',
                        border: `1px solid ${premiumBillFile ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.5px'
                      }}>
                        {premiumBillFile ? '✓ BILL ATTACHED' : 'MANDATORY FIELD'}
                      </span>
                    </label>
                    <div style={{
                      border: premiumBillFile ? '2px solid rgba(16, 185, 129, 0.6)' : '2px dashed rgba(217, 175, 86, 0.4)',
                      borderRadius: '10px',
                      padding: '16px',
                      textAlign: 'center',
                      background: premiumBillFile ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}>
                      {premiumBillFile ? (
                        <CheckCircle size={24} style={{ color: '#10b981', marginBottom: '6px' }} />
                      ) : (
                        <Upload size={22} style={{ color: '#d9af56', marginBottom: '6px' }} />
                      )}
                      <div style={{ fontSize: '12px', color: premiumBillFile ? '#10b981' : '#ffffff', fontWeight: 700 }}>
                        {premiumBillName ? `✓ Selected: ${premiumBillName}` : 'Click to Upload Invoice / Bill (JPG, PNG, PDF) *'}
                      </div>
                      <span style={{ fontSize: '11px', color: '#9c93a8', display: 'block', marginTop: '2px' }}>
                        {premiumBillFile ? 'Click anytime to replace file' : 'Super Admin verifies billing date and IMEI against this document (Required).'}
                      </span>
                      <input
                        type="file"
                        required={!premiumBillFile}
                        accept="image/*,application/pdf"
                        onChange={handleBillFileChange}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                    {premiumBillFile && premiumBillFile.startsWith('data:image') && (
                      <div style={{ marginTop: '8px', textAlign: 'center' }}>
                        <img src={premiumBillFile} alt="Bill Preview" style={{ maxHeight: '80px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' }} />
                      </div>
                    )}
                  </div>

                  {/* Premium Subscription Plan Duration (1-10 Years @ ₹118/year) */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(217, 175, 86, 0.1) 0%, rgba(139, 92, 246, 0.08) 100%)',
                    border: '1px solid rgba(217, 175, 86, 0.35)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '18px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#d9af56', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Crown size={15} /> Select Guarantee Duration (1 to 10 Years)
                      </span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                        ₹118 / year (incl. GST)
                      </span>
                    </div>

                    {/* 1 to 10 Years Pill Selection */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '12px' }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(yr => {
                        const isSel = subscriptionYears === yr;
                        return (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => setSubscriptionYears(yr)}
                            style={{
                              background: isSel ? 'linear-gradient(135deg, #d9af56 0%, #b8860b 100%)' : 'rgba(255,255,255,0.04)',
                              color: isSel ? '#060309' : '#ffffff',
                              border: isSel ? '1px solid #d9af56' : '1px solid rgba(255,255,255,0.1)',
                              padding: '8px 4px',
                              borderRadius: '8px',
                              fontWeight: 800,
                              fontSize: '11.5px',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.15s ease',
                              boxShadow: isSel ? '0 2px 8px rgba(217, 175, 86, 0.3)' : 'none'
                            }}
                          >
                            {yr} {yr === 1 ? 'Year' : 'Years'}
                          </button>
                        );
                      })}
                    </div>

                    {/* Live Fee Calculation summary */}
                    <div style={{
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <div style={{ fontSize: '12px', color: '#9c93a8' }}>
                        Subscription Plan: <strong style={{ color: '#ffffff' }}>{subscriptionYears} Year{subscriptionYears > 1 ? 's' : ''} Guarantee</strong>
                        <div style={{ fontSize: '11px', color: '#d9af56' }}>Calculation: ₹118 × {subscriptionYears} {subscriptionYears === 1 ? 'year' : 'years'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: '#9c93a8', display: 'block' }}>Subscription Total:</span>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#d9af56' }}>₹{(subscriptionYears * 118).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Condition Checkbox */}
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '18px'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <input
                        type="checkbox"
                        id="prem-decl"
                        required
                        checked={premiumDeclaration}
                        onChange={e => setPremiumDeclaration(e.target.checked)}
                        style={{ marginTop: '3px', accentColor: '#d9af56' }}
                      />
                      <label htmlFor="prem-decl" style={{ fontSize: '11.5px', color: '#ffffff', cursor: 'pointer', lineHeight: 1.5 }}>
                        <strong>Physical & Internal Integrity Declaration:</strong> I confirm this mobile is authentic, fully functioning, and has NO external screen/glass cracks, heavy body dents, or internal hardware/liquid damage. External or internal damage voids 10-year parity buyback.
                      </label>
                    </div>
                  </div>

                  {/* Customer Contact Address */}
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#d9af56', display: 'block', marginBottom: '10px' }}>
                      Customer Contact & Pickup Address
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <input
                        type="text"
                        required
                        placeholder="Full Name"
                        value={premiumAddress.fullName}
                        onChange={e => setPremiumAddress({ ...premiumAddress, fullName: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                      />
                      <input
                        type="tel"
                        required
                        placeholder="Mobile Phone"
                        value={premiumAddress.phone}
                        onChange={e => setPremiumAddress({ ...premiumAddress, phone: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                      />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="House / Flat / Street / Area"
                      value={premiumAddress.houseNumber}
                      onChange={e => setPremiumAddress({ ...premiumAddress, houseNumber: e.target.value, street: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', marginBottom: '10px' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input
                        type="text"
                        required
                        placeholder="City"
                        value={premiumAddress.city}
                        onChange={e => setPremiumAddress({ ...premiumAddress, city: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                      />
                      <input
                        type="text"
                        required
                        placeholder="PIN Code"
                        value={premiumAddress.pinCode}
                        onChange={e => setPremiumAddress({ ...premiumAddress, pinCode: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleProceedToPayment}
                    disabled={isSubmittingPremium || !premiumDeclaration || !premiumBillFile}
                    style={{
                      width: '100%',
                      background: (premiumDeclaration && premiumBillFile) ? 'linear-gradient(135deg, #d9af56 0%, #b8860b 100%)' : 'rgba(255,255,255,0.1)',
                      color: (premiumDeclaration && premiumBillFile) ? '#060309' : '#888',
                      border: 'none',
                      padding: '14px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: (premiumDeclaration && premiumBillFile) ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: (premiumDeclaration && premiumBillFile) ? '0 4px 14px rgba(217, 175, 86, 0.25)' : 'none'
                    }}
                  >
                    <Crown size={16} />
                    {!premiumBillFile
                      ? 'Upload Bill Invoice (Mandatory)'
                      : !premiumDeclaration
                      ? 'Accept Integrity Declaration'
                      : `Proceed to Pay Subscription (₹${(subscriptionYears * 118).toLocaleString()}) →`}
                  </button>
                </form>
              ) : (
                /* Success Certificate View */
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(217, 175, 86, 0.2)', color: '#d9af56', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Crown size={32} />
                  </div>
                  <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px', color: '#ffffff' }}>
                    10-Year Premium Protection Registered!
                  </h3>
                  <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#9c93a8' }}>
                    Registration <strong>#{premiumReceipt.id}</strong> submitted. Super Admin will verify your subscription payment & billing paper to activate your locked return parity!
                  </p>

                  {/* Certificate Box */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(217, 175, 86, 0.12) 0%, rgba(32, 15, 51, 0.7) 100%)',
                    border: '1px solid rgba(217, 175, 86, 0.45)',
                    borderRadius: '16px',
                    padding: '24px',
                    textAlign: 'left',
                    marginBottom: '24px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '14px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#d9af56' }}>INVESTHOUR 10-YEAR PREMIUM CERTIFICATE</span>
                      <span style={{ fontSize: '11px', color: '#d9af56', fontWeight: 700 }}>PENDING ADMIN APPROVAL</span>
                    </div>

                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                      {premiumReceipt.brand} {premiumReceipt.model}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9c93a8', marginBottom: '12px' }}>
                      IMEI: <strong>{premiumReceipt.imei}</strong> • Specs: {premiumReceipt.ram} / {premiumReceipt.storage}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', marginBottom: '12px' }}>
                      <div>
                        <span style={{ color: '#9c93a8' }}>Original Purchase Price:</span>
                        <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px' }}>₹{parseFloat(premiumReceipt.original_invoice_price).toLocaleString()}</div>
                      </div>
                      <div>
                        <span style={{ color: '#9c93a8' }}>Locked 10-Year Return Price:</span>
                        <div style={{ fontWeight: 800, color: '#10b981', fontSize: '16px' }}>₹{parseFloat(premiumReceipt.base_price).toLocaleString()}</div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11.5px' }}>
                      <div>
                        <span style={{ color: '#9c93a8' }}>Subscription Plan:</span>
                        <div style={{ fontWeight: 700, color: '#d9af56' }}>{premiumReceipt.subscription_years || subscriptionYears} Year(s) (₹{parseFloat(premiumReceipt.subscription_fee || (subscriptionYears * 118)).toLocaleString()})</div>
                      </div>
                      <div>
                        <span style={{ color: '#9c93a8' }}>Payment UTR Ref:</span>
                        <div style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>{premiumReceipt.utr || premiumUtr || 'SUBMITTED'}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPremiumModal(false);
                      setActiveSubTab('my-devices');
                    }}
                    style={{
                      background: '#d9af56',
                      color: '#060309',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Close & View in My Devices
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Payment Modal (Matching Image 2: Submit Manual Deposit) */}
      {showPaymentModal && (
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
          zIndex: 100000,
          padding: '20px'
        }}>
          <div style={{
            background: '#120a1c',
            border: '1px solid rgba(217, 175, 86, 0.4)',
            borderRadius: '20px',
            maxWidth: '680px',
            width: '100%',
            padding: '28px',
            position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)'
          }}>
            {/* Modal Title & Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 800,
                margin: 0,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                Submit Manual Deposit
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: '#9c93a8',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Grid Layout: Left QR Code, Right Details */}
            <form onSubmit={handleFinalPremiumSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.15fr',
                gap: '24px',
                alignItems: 'start',
                marginBottom: '24px'
              }}>
                {/* Left Column: SCAN QR CODE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <span style={{ fontSize: '11px', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                    SCAN QR CODE
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      background: '#fff',
                      borderRadius: '16px',
                      boxShadow: '0 8px 30px rgba(16, 185, 129, 0.2)',
                      border: '2px solid rgba(16, 185, 129, 0.4)',
                      overflow: 'hidden',
                      width: '180px',
                      height: '180px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px'
                    }}>
                      <img
                        src="/deposit-qr.jpg"
                        alt="Deposit QR Code"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#9c93a8', textAlign: 'center', lineHeight: '1.4', maxWidth: '220px' }}>
                      Scan QR code using PhonePe, Paytm, GooglePay or any UPI application.
                    </span>
                  </div>
                </div>

                {/* Right Column: SUBMIT PAYMENT DETAILS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <span style={{ fontSize: '11px', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                    SUBMIT PAYMENT DETAILS
                  </span>

                  {/* Amount Locked */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(217, 175, 86, 0.08) 0%, rgba(217, 175, 86, 0.02) 100%)',
                    border: '1px solid rgba(217, 175, 86, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#9c93a8', fontWeight: 600, display: 'block' }}>Amount Locked</span>
                      <small style={{ fontSize: '10.5px', color: '#d9af56' }}>{subscriptionYears} Year(s) Guarantee Plan</small>
                    </div>
                    <span style={{ fontSize: '20px', color: '#d9af56', fontWeight: 800 }}>
                      ₹{(subscriptionYears * 118).toLocaleString()}
                    </span>
                  </div>

                  {/* UTR / Transaction Ref */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#9c93a8', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                      UTR / TRANSACTION REF NUMBER *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={30}
                      placeholder="Enter UTR or Reference Number"
                      value={premiumUtr}
                      onChange={e => setPremiumUtr(e.target.value.trim().toUpperCase())}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        background: 'rgba(0, 0, 0, 0.35)',
                        color: '#fff',
                        outline: 'none',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        letterSpacing: '1px'
                      }}
                    />
                  </div>

                  {/* Payment Mode Used */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#9c93a8', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                      PAYMENT MODE USED
                    </label>
                    <select
                      value={premiumPaymentMode}
                      onChange={e => setPremiumPaymentMode(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        background: '#190e26',
                        color: '#fff',
                        outline: 'none',
                        fontSize: '13px'
                      }}
                    >
                      <option value="UPI" style={{ background: '#120a1c' }}>UPI</option>
                      <option value="IMPS" style={{ background: '#120a1c' }}>IMPS</option>
                      <option value="NEFT" style={{ background: '#120a1c' }}>NEFT</option>
                      <option value="RTGS" style={{ background: '#120a1c' }}>RTGS</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Green Action Button */}
              <button
                type="submit"
                disabled={isSubmittingPremium || !premiumUtr.trim()}
                style={{
                  width: '100%',
                  background: premiumUtr.trim() ? '#10b981' : 'rgba(255,255,255,0.1)',
                  color: premiumUtr.trim() ? '#ffffff' : '#888',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: premiumUtr.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: premiumUtr.trim() ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {isSubmittingPremium ? 'Transmitting Payment & Registration...' : 'Submit Deposit for Verification'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

