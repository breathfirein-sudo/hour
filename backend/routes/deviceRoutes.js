const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { processBrokerCommission } = require('../services/brokerCommissionService');

// Static Brand & Model Catalog with Zero-Spread Price Parity
const DEVICE_BRANDS = [
  {
    id: 'apple',
    name: 'Apple',
    slug: 'apple',
    tagline: 'Titanium. Super Retina XDR. A18 Pro.',
    logoSvg: '<svg viewBox="0 0 170 170" width="100%" height="100%" fill="currentColor"><path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.08-7.7-7.93-12-14.54-6.3-9.68-11.25-20.73-14.86-33.15-3.6-12.43-5.41-24.36-5.41-35.8 0-14.75 3.86-26.96 11.59-36.63 7.73-9.68 17.58-14.63 29.56-14.86 4.78 0 10.22 1.34 16.32 4.02 6.1 2.68 10.15 4.08 12.16 4.2 1.8.12 5.92-1.27 12.38-4.17 6.45-2.9 11.96-4.23 16.52-3.99 12.65.61 22.88 4.79 30.7 12.54-10.97 6.66-16.36 15.82-16.17 27.48.24 9.1 3.73 16.79 10.47 23.08 6.74 6.29 14.82 9.77 24.23 10.45-2.32 7.1-5.16 14.28-8.52 21.54zM119.22 33.64c0-7.39 2.66-14.47 7.99-21.24 5.33-6.77 11.98-11.13 19.95-13.08.13 1.09.2 2.06.2 2.91 0 7.39-2.78 14.59-8.34 21.6-5.56 7.01-12.33 11.27-20.31 12.79-.12-1.09-.18-1.98-.18-2.67z"/></svg>',
    models: [
      {
        id: 'iphone-16-pro-max',
        name: 'iPhone 16 Pro Max',
        year: 2024,
        image: '/devices/iphone-16-pro-max.jpg',
        colors: ['Desert Titanium', 'Natural Titanium', 'White Titanium', 'Black Titanium'],
        rams: ['8GB'],
        storages: ['256GB', '512GB', '1TB'],
        basePriceNew: 144900,
        basePriceRefurb: 119900,
        marketBenchmark: 149900,
        features: ['A18 Pro Chip', '48MP Fusion Camera', 'Camera Control Button', '6.9-inch Super Retina XDR']
      },
      {
        id: 'iphone-16-pro',
        name: 'iPhone 16 Pro',
        year: 2024,
        image: '/devices/iphone-16-pro.jpg',
        colors: ['Desert Titanium', 'Natural Titanium', 'White Titanium', 'Black Titanium'],
        rams: ['8GB'],
        storages: ['128GB', '256GB', '512GB', '1TB'],
        basePriceNew: 119900,
        basePriceRefurb: 99900,
        marketBenchmark: 124900,
        features: ['A18 Pro Chip', '5x Optical Zoom', 'ProMotion 120Hz', 'Grade 5 Titanium']
      },
      {
        id: 'iphone-15-pro-max',
        name: 'iPhone 15 Pro Max',
        year: 2023,
        image: '/devices/iphone-15-pro-max.jpg',
        colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
        rams: ['8GB'],
        storages: ['256GB', '512GB', '1TB'],
        basePriceNew: 129900,
        basePriceRefurb: 94900,
        marketBenchmark: 134900,
        features: ['A17 Pro Chip', 'Action Button', 'USB-C 3.0', '5x Telephoto']
      },
      {
        id: 'iphone-15',
        name: 'iPhone 15',
        year: 2023,
        image: '/devices/iphone-15.jpg',
        colors: ['Black', 'Blue', 'Green', 'Yellow', 'Pink'],
        rams: ['6GB'],
        storages: ['128GB', '256GB', '512GB'],
        basePriceNew: 69900,
        basePriceRefurb: 54900,
        marketBenchmark: 74900,
        features: ['Dynamic Island', '48MP Main Camera', 'A16 Bionic', 'USB-C']
      }
    ]
  },
  {
    id: 'samsung',
    name: 'Samsung',
    slug: 'samsung',
    tagline: 'Galaxy AI. 200MP Quad Tele. Armor Aluminum.',
    logoSvg: '<svg viewBox="0 0 100 30" width="100%" height="100%" fill="currentColor"><path d="M12 21c-5 0-8-3-8-7s3-7 8-7c4 0 7 2 8 5l-3 1c-1-2-3-3-5-3-3 0-5 2-5 4s2 4 5 4c2 0 4-1 5-2v-2h-5v-3h8v7c-2 2-5 3-8 3zm18-14h3v14h-3zm12 0h3l5 10 5-10h3v14h-3v-9l-5 9h-1l-5-9v9h-3zm20 0h10v3h-7v3h6v3h-6v2h7v3h-10zm16 0h3v11h7v3h-10zm16 0h3l6 9v-9h3v14h-3l-6-9v9h-3z"/></svg>',
    models: [
      {
        id: 'galaxy-s24-ultra',
        name: 'Galaxy S24 Ultra',
        year: 2024,
        image: '/devices/galaxy-s24-ultra.jpg',
        colors: ['Titanium Gray', 'Titanium Black', 'Titanium Violet', 'Titanium Yellow'],
        rams: ['12GB'],
        storages: ['256GB', '512GB', '1TB'],
        basePriceNew: 129999,
        basePriceRefurb: 98999,
        marketBenchmark: 134999,
        features: ['Galaxy AI', 'Snapdragon 8 Gen 3', '200MP Camera', 'Built-in S-Pen']
      },
      {
        id: 'galaxy-z-fold-6',
        name: 'Galaxy Z Fold 6',
        year: 2024,
        image: '/devices/galaxy-z-fold-6.jpg',
        colors: ['Silver Shadow', 'Navy', 'Pink'],
        rams: ['12GB'],
        storages: ['256GB', '512GB', '1TB'],
        basePriceNew: 164999,
        basePriceRefurb: 129999,
        marketBenchmark: 172999,
        features: ['7.6" Dynamic AMOLED 2X', 'IP48 Water Resistance', 'Slim Lightweight Hinge']
      },
      {
        id: 'galaxy-s23-ultra',
        name: 'Galaxy S23 Ultra',
        year: 2023,
        image: '/devices/galaxy-s23-ultra.jpg',
        colors: ['Phantom Black', 'Green', 'Cream', 'Lavender'],
        rams: ['12GB'],
        storages: ['256GB', '512GB'],
        basePriceNew: 89999,
        basePriceRefurb: 67999,
        marketBenchmark: 94999,
        features: ['100x Space Zoom', '5000mAh Battery', 'Gorilla Glass Victus 2']
      }
    ]
  },
  {
    id: 'google',
    name: 'Google Pixel',
    slug: 'google',
    tagline: 'Google Tensor G4. Gemini Pro built-in.',
    logoSvg: '<svg viewBox="0 0 48 48" width="100%" height="100%"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>',
    models: [
      {
        id: 'pixel-9-pro-xl',
        name: 'Pixel 9 Pro XL',
        year: 2024,
        image: '/devices/pixel-9-pro-xl.jpg',
        colors: ['Obsidian', 'Porcelain', 'Hazel', 'Rose Quartz'],
        rams: ['16GB'],
        storages: ['128GB', '256GB', '512GB', '1TB'],
        basePriceNew: 124999,
        basePriceRefurb: 99999,
        marketBenchmark: 129999,
        features: ['Google Tensor G4', '7 Years OS Updates', 'Super Actua Display', 'Pro Triple Camera']
      },
      {
        id: 'pixel-8-pro',
        name: 'Pixel 8 Pro',
        year: 2023,
        image: '/devices/pixel-8-pro.jpg',
        colors: ['Bay', 'Obsidian', 'Porcelain', 'Mint'],
        rams: ['12GB'],
        storages: ['128GB', '256GB'],
        basePriceNew: 79999,
        basePriceRefurb: 59999,
        marketBenchmark: 84999,
        features: ['Google Tensor G3', 'Best Take AI', 'Magic Audio Eraser', 'Temperature Sensor']
      }
    ]
  },
  {
    id: 'oneplus',
    name: 'OnePlus',
    slug: 'oneplus',
    tagline: 'Never Settle. 100W SUPERVOOC. Hasselblad Camera.',
    logoSvg: '<svg viewBox="0 0 100 100" width="100%" height="100%" fill="currentColor"><rect x="15" y="15" width="70" height="70" rx="8" fill="none" stroke="currentColor" stroke-width="8"/><text x="50" y="65" font-size="44" font-weight="900" text-anchor="middle" fill="currentColor">1+</text></svg>',
    models: [
      {
        id: 'oneplus-12',
        name: 'OnePlus 12',
        year: 2024,
        image: '/devices/oneplus-12.jpg',
        colors: ['Flowy Emerald', 'Silky Black', 'Glacial White'],
        rams: ['12GB', '16GB'],
        storages: ['256GB', '512GB'],
        basePriceNew: 64999,
        basePriceRefurb: 49999,
        marketBenchmark: 69999,
        features: ['4th Gen Hasselblad Camera', '100W Fast Charge', '5400mAh Battery', 'Snapdragon 8 Gen 3']
      },
      {
        id: 'oneplus-open',
        name: 'OnePlus Open',
        year: 2023,
        image: '/devices/oneplus-open.jpg',
        colors: ['Emerald Dusk', 'Voyager Black'],
        rams: ['16GB'],
        storages: ['512GB'],
        basePriceNew: 139999,
        basePriceRefurb: 104999,
        marketBenchmark: 144999,
        features: ['Dual 120Hz ProXDR Displays', 'Hasselblad Foldable Camera', 'Lightweight Titanium']
      }
    ]
  },
  {
    id: 'xiaomi',
    name: 'Xiaomi',
    slug: 'xiaomi',
    tagline: 'Leica Optics. Quad 50MP. 120W HyperCharge.',
    logoSvg: '<svg viewBox="0 0 100 100" width="100%" height="100%" fill="#FF6900"><rect width="100" height="100" rx="20"/><path fill="#FFF" d="M30 30h12v40H30zm16 0h24v16H58v24H46zm16 28h12v12H62z"/></svg>',
    models: [
      {
        id: 'xiaomi-14-ultra',
        name: 'Xiaomi 14 Ultra',
        year: 2024,
        image: '/devices/xiaomi-14-ultra.jpg',
        colors: ['Black', 'White'],
        rams: ['16GB'],
        storages: ['512GB'],
        basePriceNew: 99999,
        basePriceRefurb: 77999,
        marketBenchmark: 104999,
        features: ['1-inch LYT-900 Sensor', 'Leica Summilux Lens', 'Xiaomi Shield Glass']
      }
    ]
  },
  {
    id: 'nothing',
    name: 'Nothing',
    slug: 'nothing',
    tagline: 'Glyph Interface. Transparent Aesthetics. Nothing OS.',
    logoSvg: '<svg viewBox="0 0 100 30" width="100%" height="100%" fill="currentColor"><text x="5" y="22" font-family="monospace" font-size="20" font-weight="900" letter-spacing="4">NOTHING</text></svg>',
    models: [
      {
        id: 'nothing-phone-2',
        name: 'Nothing Phone (2)',
        year: 2023,
        image: '/devices/nothing-phone-2.jpg',
        colors: ['Dark Grey', 'White'],
        rams: ['8GB', '12GB'],
        storages: ['128GB', '256GB', '512GB'],
        basePriceNew: 36999,
        basePriceRefurb: 27999,
        marketBenchmark: 39999,
        features: ['Glyph Interface LEDs', 'Nothing OS 2.5', '50MP Sony Dual Cameras']
      }
    ]
  }
];

// 1. GET /api/devices/catalog
router.get('/catalog', (req, res) => {
  res.json({
    success: true,
    brands: DEVICE_BRANDS,
    warrantyFee: 0,
    warrantyPeriodYears: 10,
    terms: {
      zeroSpreadRule: 'Purchase Price equals Guaranteed Return/Sell-back Price (100% price parity).',
      warrantyGuarantee: 'All devices purchased from Investhour automatically include 10-Year Investhour Buyback at 100% purchase price (exact same money back, ₹0 extra fee).',
      damageExclusion: 'Any external physical damage (cracks, heavy dents, screen breaks) or internal physical/water damage voids the return parity guarantee.'
    }
  });
});

// 1.1 GET /api/devices/catalogue-master (35 Brands, 1,162 Models from research excel)
router.get('/catalogue-master', (req, res) => {
  try {
    const cataloguePath = path.join(__dirname, '../data/phone_catalogue_master.json');
    if (fs.existsSync(cataloguePath)) {
      const data = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
      return res.json({ success: true, count: data.length, brands: data });
    }
    res.json({ success: true, count: 0, brands: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. POST /api/devices/order/buy
router.post('/order/buy', async (req, res) => {
  const client = await db.connect();
  try {
    const {
      email,
      brand,
      model,
      condition = 'New',
      ram,
      storage,
      color,
      basePrice,
      hasWarranty = false,
      shippingAddress = {},
      paymentMode = 'WALLET' // 'WALLET' or 'REQUEST'
    } = req.body;

    if (!email || !brand || !model || !basePrice) {
      return res.status(400).json({ success: false, message: 'Missing required order fields.' });
    }

    const {
      fullName,
      phone,
      alternatePhone,
      houseNumber,
      street,
      landmark,
      city,
      state,
      pinCode,
      deliveryInstructions
    } = shippingAddress;

    if (!fullName || !phone || !houseNumber || !street || !city || !state || !pinCode) {
      return res.status(400).json({ success: false, message: 'Complete delivery address is required.' });
    }

    await client.query('BEGIN');

    // 1. Find user & wallet
    const userRes = await client.query('SELECT id, email, name FROM "User" WHERE LOWER(email) = LOWER($1)', [email]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }
    const user = userRes.rows[0];

    const walletRes = await client.query('SELECT balance FROM "Wallet" WHERE "userId" = $1 FOR UPDATE', [user.id]);
    if (walletRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Wallet not found.' });
    }

    const currentBalance = parseFloat(walletRes.rows[0].balance || 0);
    const parsedBasePrice = parseFloat(basePrice);
    const warrantyFee = 0.00; // 10-Yr Guarantee Included Free (₹0)
    const totalAmount = parsedBasePrice;

    let newBalance = currentBalance;
    let orderStatus = 'Request Submitted';
    let adminNotes = 'Buy Request submitted by user. Payment mode: Offline / Invoice / Admin Review.';

    if (paymentMode === 'WALLET') {
      if (currentBalance < totalAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance. Required: ₹${totalAmount.toLocaleString()}, Available: ₹${currentBalance.toLocaleString()}. Please deposit funds first or use "Send Buy Request" to submit directly to Admin.`
        });
      }

      // 2. Deduct wallet
      newBalance = parseFloat((currentBalance - totalAmount).toFixed(2));
      await client.query('UPDATE "Wallet" SET balance = $1, "updatedAt" = NOW() WHERE "userId" = $2', [newBalance, user.id]);

      // 3. Log transaction
      const txDetails = `Device Purchase: ${brand} ${model} (${condition}, ${ram}/${storage}, ${color})${hasWarranty ? ' + 10-Yr Return Warranty' : ''}`;
      await client.query(
        'INSERT INTO "Transaction" ("userId", type, asset, amount, fee, gst, details, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
        [user.id, 'withdrawal', 'wallet', totalAmount, 0, 0, txDetails]
      );

      orderStatus = 'Pending';
      adminNotes = 'Paid via Investhour Wallet.';
    }

    // 4. Create Device Order
    const orderId = 'DEV-ORD-' + Math.floor(100000 + Math.random() * 900000);
    const warrantyValidUntil = hasWarranty ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) : null;

    const insertOrderQuery = `
      INSERT INTO device_orders (
        id, user_id, order_type, brand, model, condition, ram, storage, color,
        base_price, warranty_fee, total_amount, has_warranty, warranty_valid_until,
        status, admin_notes, full_name, phone, alternate_phone, email, house_number, street,
        landmark, city, state, pin_code, delivery_instructions, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22,
        $23, $24, $25, $26, $27, NOW(), NOW()
      ) RETURNING *;
    `;

    const orderRes = await client.query(insertOrderQuery, [
      orderId, user.id, 'BUY', brand, model, condition, ram, storage, color,
      parsedBasePrice, warrantyFee, totalAmount, hasWarranty, warrantyValidUntil,
      orderStatus, adminNotes, fullName, phone, alternatePhone || null, email, houseNumber, street,
      landmark || null, city, state, pinCode, deliveryInstructions || null
    ]);

    await client.query('COMMIT');

    // 5. Attribute Broker Commission asynchronously (if paid via wallet)
    if (paymentMode === 'WALLET') {
      try {
        await processBrokerCommission({
          userId: user.id,
          userEmail: user.email,
          spentAmount: totalAmount,
          actionType: 'DEVICE_BUY',
          description: `Referral commission for device purchase: ${brand} ${model}`
        });
      } catch (bErr) {
        console.error('[Device Order] Broker commission error:', bErr.message);
      }
    }

    res.json({
      success: true,
      message: paymentMode === 'REQUEST' 
        ? 'Buy request sent successfully! Our logistics team will review and coordinate delivery.'
        : 'Device order placed successfully! Your order is being processed for dispatch.',
      order: orderRes.rows[0],
      walletBalance: newBalance,
      isRequestOnly: paymentMode === 'REQUEST'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error placing device order:', error);
    res.status(500).json({ success: false, message: 'Failed to place device order: ' + error.message });
  } finally {
    client.release();
  }
});

// 3. POST /api/devices/order/sell-return
router.post('/order/sell-return', async (req, res) => {
  try {
    const {
      email,
      orderId,
      brand,
      model,
      condition = 'Used',
      ram,
      storage,
      color,
      basePrice,
      imei,
      conditionDeclaration,
      pickupAddress = {}
    } = req.body;

    if (!email || !imei || !basePrice) {
      return res.status(400).json({ success: false, message: 'Missing required return fields.' });
    }

    if (!conditionDeclaration) {
      return res.status(400).json({
        success: false,
        message: 'You must confirm the physical condition declaration (no external or internal damage) to initiate a parity return.'
      });
    }

    const {
      fullName,
      phone,
      alternatePhone,
      houseNumber,
      street,
      landmark,
      city,
      state,
      pinCode,
      deliveryInstructions
    } = pickupAddress;

    if (!fullName || !phone || !houseNumber || !street || !city || !state || !pinCode) {
      return res.status(400).json({ success: false, message: 'Complete pickup address is required.' });
    }

    // Check user
    const userRes = await db.query('SELECT id FROM "User" WHERE LOWER(email) = LOWER($1)', [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = userRes.rows[0];

    const returnId = 'DEV-RET-' + Math.floor(100000 + Math.random() * 900000);
    const parsedBasePrice = parseFloat(basePrice);

    const insertReturnQuery = `
      INSERT INTO device_orders (
        id, user_id, order_type, brand, model, condition, ram, storage, color,
        base_price, warranty_fee, total_amount, has_warranty, imei,
        status, full_name, phone, alternate_phone, email, house_number, street,
        landmark, city, state, pin_code, delivery_instructions, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26, NOW(), NOW()
      ) RETURNING *;
    `;

    const returnRes = await db.query(insertReturnQuery, [
      returnId, user.id, 'SELL_RETURN', brand, model, condition, ram, storage, color,
      parsedBasePrice, 0.00, parsedBasePrice, true, imei,
      'InspectionPending', fullName, phone, alternatePhone || null, email, houseNumber, street,
      landmark || null, city, state, pinCode, deliveryInstructions || null
    ]);

    res.json({
      success: true,
      message: 'Sell-back return claim submitted. Investhour QA inspection and courier pickup scheduled!',
      order: returnRes.rows[0]
    });
  } catch (error) {
    console.error('Error submitting sell-return claim:', error);
    res.status(500).json({ success: false, message: 'Failed to submit return claim: ' + error.message });
  }
});

// 4. GET /api/devices/my-orders/:email
router.get('/my-orders/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const ordersRes = await db.query(
      'SELECT * FROM device_orders WHERE LOWER(email) = LOWER($1) ORDER BY created_at DESC',
      [email]
    );
    res.json({ success: true, orders: ordersRes.rows });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders: ' + error.message });
  }
});

// 5. GET /api/devices/admin/requests (SuperAdmin View)
router.get('/admin/requests', async (req, res) => {
  try {
    const ordersRes = await db.query(`
      SELECT o.*, u.name as user_name, u."isBroker", u."brokerCommissionRate"
      FROM device_orders o
      LEFT JOIN "User" u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    res.json({ success: true, requests: ordersRes.rows });
  } catch (error) {
    console.error('Error fetching admin device requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin requests: ' + error.message });
  }
});

// 6. POST /api/devices/admin/dispatch
router.post('/admin/dispatch', async (req, res) => {
  try {
    const { orderId, courierName, trackingNumber, status = 'Dispatched', adminNotes } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const updateRes = await db.query(`
      UPDATE device_orders
      SET courier_name = $1, tracking_number = $2, status = $3, admin_notes = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [courierName || 'Investhour Express', trackingNumber || '', status, adminNotes || '', orderId]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.json({ success: true, message: `Order updated to ${status}!`, order: updateRes.rows[0] });
  } catch (error) {
    console.error('Error updating dispatch status:', error);
    res.status(500).json({ success: false, message: 'Failed to update order: ' + error.message });
  }
});

// 7. POST /api/devices/admin/verify-return (Quality Check & 100% Wallet Refund)
router.post('/admin/verify-return', async (req, res) => {
  const client = await db.connect();
  try {
    const { orderId, inspectionPassed, rejectionReason, adminNotes } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM device_orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const order = orderRes.rows[0];

    if (inspectionPassed) {
      // 100% price parity payout to user's wallet
      const refundAmount = parseFloat(order.base_price);

      // Fetch wallet
      const walletRes = await client.query('SELECT balance FROM "Wallet" WHERE "userId" = $1 FOR UPDATE', [order.user_id]);
      if (walletRes.rows.length > 0) {
        const curBal = parseFloat(walletRes.rows[0].balance || 0);
        const newBal = parseFloat((curBal + refundAmount).toFixed(2));
        await client.query('UPDATE "Wallet" SET balance = $1, "updatedAt" = NOW() WHERE "userId" = $2', [newBal, order.user_id]);

        // Log transaction
        await client.query(
          'INSERT INTO "Transaction" ("userId", type, asset, amount, fee, gst, details, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
          [order.user_id, 'deposit', 'wallet', refundAmount, 0, 0, `100% Price Parity Return Refund for ${order.brand} ${order.model} (${order.id})`]
        );
      }

      await client.query(`
        UPDATE device_orders
        SET status = 'ApprovedAndRefunded', inspection_passed = true, admin_notes = $1, updated_at = NOW()
        WHERE id = $2
      `, [adminNotes || 'Inspection passed: 100% base price refunded to wallet.', orderId]);

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: `Inspection approved! 100% purchase cost (₹${refundAmount.toLocaleString()}) credited to user's wallet.`,
        refundAmount
      });
    } else {
      // Return rejected due to damage
      await client.query(`
        UPDATE device_orders
        SET status = 'Rejected', inspection_passed = false, rejection_reason = $1, admin_notes = $2, updated_at = NOW()
        WHERE id = $3
      `, [rejectionReason || 'External or internal damage detected. Parity return voided under warranty terms.', adminNotes || '', orderId]);

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: 'Return rejected due to damage inspection failure. Device status updated.'
      });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error verifying return request:', error);
    res.status(500).json({ success: false, message: 'Failed to verify return: ' + error.message });
  } finally {
    client.release();
  }
});

// 8. POST /api/devices/order/premium-register
router.post('/order/premium-register', async (req, res) => {
  try {
    const {
      email,
      brand,
      model,
      condition = 'Used',
      ram,
      storage,
      color,
      imei,
      billingDate,
      originalInvoicePrice,
      invoiceDocument,
      conditionDeclaration,
      customerAddress = {},
      subscriptionYears = 1,
      subscriptionFee,
      utr,
      paymentMode = 'UPI'
    } = req.body;

    if (!email || !brand || !model || !imei || !billingDate || !originalInvoicePrice) {
      return res.status(400).json({ success: false, message: 'All device, IMEI, billing date, and invoice price details are required.' });
    }

    if (!invoiceDocument) {
      return res.status(400).json({ success: false, message: 'Billing paper / invoice document upload is mandatory for Super Admin verification.' });
    }

    if (!conditionDeclaration) {
      return res.status(400).json({ success: false, message: 'You must confirm the physical condition declaration (no external or internal damage) to register.' });
    }

    if (!utr || !utr.trim()) {
      return res.status(400).json({ success: false, message: 'UTR / Transaction Reference Number is mandatory to verify your subscription payment.' });
    }

    const {
      fullName,
      phone,
      alternatePhone,
      houseNumber,
      street,
      landmark,
      city,
      state,
      pinCode
    } = customerAddress;

    if (!fullName || !phone || !houseNumber || !street || !city || !pinCode) {
      return res.status(400).json({ success: false, message: 'Complete customer contact & address details are required.' });
    }

    // Check user
    const userRes = await db.query('SELECT id FROM "User" WHERE LOWER(email) = LOWER($1)', [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = userRes.rows[0];

    // Calculate depreciation
    const parsedOriginalPrice = parseFloat(originalInvoicePrice);
    const billDate = new Date(billingDate);
    const now = new Date();
    const diffDays = Math.max(0, Math.floor((now - billDate) / (1000 * 60 * 60 * 24)));
    const diffYears = diffDays / 365.25;

    // Standard 1% per year, or minimum 1% for ~1-year purchase
    let depreciationRate = 1.00;
    if (diffYears > 1.5 && diffYears <= 2.5) depreciationRate = 2.00;
    else if (diffYears > 2.5 && diffYears <= 3.5) depreciationRate = 3.00;
    else if (diffYears > 3.5) depreciationRate = 4.00;
    else depreciationRate = 1.00;

    const depreciationAmount = (parsedOriginalPrice * depreciationRate) / 100.0;
    const lockedParityPrice = Math.max(0, parseFloat((parsedOriginalPrice - depreciationAmount).toFixed(2)));

    // Subscription plan calculations (₹118 per year)
    const parsedSubscriptionYears = Math.min(10, Math.max(1, parseInt(subscriptionYears) || 1));
    const calculatedFee = parsedSubscriptionYears * 118;
    const parsedSubscriptionFee = parseFloat(subscriptionFee) || calculatedFee;
    const cleanUtr = utr.trim().toUpperCase();

    const orderId = 'DEV-PREM-' + Math.floor(100000 + Math.random() * 900000);

    const insertQuery = `
      INSERT INTO device_orders (
        id, user_id, order_type, brand, model, condition, ram, storage, color,
        base_price, warranty_fee, total_amount, has_warranty, imei,
        status, admin_notes, full_name, phone, alternate_phone, email, house_number, street,
        landmark, city, state, pin_code, billing_date, original_invoice_price, depreciation_rate,
        invoice_document, subscription_years, subscription_fee, utr, payment_mode, payment_status,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22,
        $23, $24, $25, $26, $27, $28, $29,
        $30, $31, $32, $33, $34, $35, NOW(), NOW()
      ) RETURNING *;
    `;

    const initialNotes = `Premium Registration (${parsedSubscriptionYears} Year Plan @ ₹${parsedSubscriptionFee}). Payment Mode: ${paymentMode}, UTR: ${cleanUtr}. Original Invoice: ₹${parsedOriginalPrice.toLocaleString()} (${billingDate}), Depreciation: ${depreciationRate}%, Locked 10-Yr Guarantee: ₹${lockedParityPrice.toLocaleString()}. Awaiting SuperAdmin verification.`;

    const result = await db.query(insertQuery, [
      orderId, user.id, 'PREMIUM_REGISTRATION', brand, model, condition, ram || 'Standard', storage || 'Standard', color || 'Standard',
      lockedParityPrice, parsedSubscriptionFee, lockedParityPrice, true, imei,
      'Pending Review', initialNotes, fullName, phone, alternatePhone || null, email, houseNumber, street,
      landmark || null, city, state || '', pinCode, billDate, parsedOriginalPrice, depreciationRate,
      invoiceDocument || null, parsedSubscriptionYears, parsedSubscriptionFee, cleanUtr, paymentMode, 'Pending Verification'
    ]);

    res.json({
      success: true,
      message: 'Premium registration & subscription payment submitted successfully! Super Admin will review your payment and invoice.',
      order: result.rows[0],
      lockedParityPrice,
      depreciationRate,
      subscriptionYears: parsedSubscriptionYears,
      subscriptionFee: parsedSubscriptionFee,
      utr: cleanUtr
    });
  } catch (error) {
    console.error('Error in premium-register:', error);
    res.status(500).json({ success: false, message: 'Failed to submit premium registration: ' + error.message });
  }
});

// 9. POST /api/devices/admin/approve-premium
router.post('/admin/approve-premium', async (req, res) => {
  try {
    const { orderId, approvedPrice, adminNotes } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const orderRes = await db.query('SELECT * FROM device_orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const order = orderRes.rows[0];

    const finalPrice = approvedPrice ? parseFloat(approvedPrice) : parseFloat(order.base_price);
    const validUntil = new Date(Date.now() + 10 * 365.25 * 24 * 60 * 60 * 1000);

    const updateRes = await db.query(`
      UPDATE device_orders
      SET status = 'Approved',
          base_price = $1,
          total_amount = $1,
          has_warranty = true,
          premium_started_at = NOW(),
          warranty_valid_until = $2,
          admin_notes = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [finalPrice, validUntil, adminNotes || 'Premium 10-Year Parity Protection Approved by Super Admin.', orderId]);

    res.json({
      success: true,
      message: `Premium Registration #${orderId} approved! 10-Year Guaranteed Return parity is now ACTIVE starting today.`,
      order: updateRes.rows[0]
    });
  } catch (error) {
    console.error('Error approving premium registration:', error);
    res.status(500).json({ success: false, message: 'Failed to approve premium registration: ' + error.message });
  }
});

// 10. POST /api/devices/admin/reject-premium
router.post('/admin/reject-premium', async (req, res) => {
  try {
    const { orderId, rejectionReason, adminNotes } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const updateRes = await db.query(`
      UPDATE device_orders
      SET status = 'Rejected',
          rejection_reason = $1,
          admin_notes = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [rejectionReason || 'Invoice invalid or IMEI mismatch.', adminNotes || '', orderId]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.json({
      success: true,
      message: `Premium Registration #${orderId} rejected.`,
      order: updateRes.rows[0]
    });
  } catch (error) {
    console.error('Error rejecting premium registration:', error);
    res.status(500).json({ success: false, message: 'Failed to reject premium: ' + error.message });
  }
});

module.exports = router;

