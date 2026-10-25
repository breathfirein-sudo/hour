/** Periodic metals shown on About Us — each maps to a tradeable asset id. */
export const metals = [
  { no: 1, symbol: 'Au', name: 'Gold', type: 'Precious Metal', group: 'gold', assetId: 'gold', basePriceINR: 14450.00 },
  { no: 2, symbol: 'Ti', name: 'Titanium', type: 'Transition Metal', group: 'silver', assetId: 'titanium', basePriceINR: 1.25 },
  { no: 3, symbol: 'Ag', name: 'Silver', type: 'Precious Metal', group: 'silver', assetId: 'silver', basePriceINR: 208.50 },
  { no: 4, symbol: 'Cr', name: 'Chromium', type: 'Transition Metal', group: 'dark', assetId: 'chromium', basePriceINR: 0.95 },
  { no: 5, symbol: 'Mn', name: 'Manganese', type: 'Transition Metal', group: 'dark', assetId: 'manganese', basePriceINR: 0.24 },
  { no: 6, symbol: 'Fe', name: 'Iron', type: 'Transition Metal', group: 'dark', assetId: 'iron', basePriceINR: 0.08 },
  { no: 7, symbol: 'Co', name: 'Cobalt', type: 'Transition Metal', group: 'blue', assetId: 'cobalt', basePriceINR: 3.80 },
  { no: 8, symbol: 'Ni', name: 'Nickel', type: 'Transition Metal', group: 'cyan', assetId: 'nickel', basePriceINR: 1.95 },
  { no: 9, symbol: 'Cu', name: 'Copper', type: 'Transition Metal', group: 'bronze', assetId: 'copper', basePriceINR: 1.35 },
  { no: 10, symbol: 'Zn', name: 'Zinc', type: 'Transition Metal', group: 'dark', assetId: 'zinc', basePriceINR: 0.32 },
  { no: 11, symbol: 'Y', name: 'Yttrium', type: 'Transition Metal', group: 'dark', assetId: 'yttrium', basePriceINR: 4.80 },
  { no: 12, symbol: 'Zr', name: 'Zirconium', type: 'Transition Metal', group: 'silver', assetId: 'zirconium', basePriceINR: 3.20 },
  { no: 13, symbol: 'Nb', name: 'Niobium', type: 'Transition Metal', group: 'cyan', assetId: 'niobium', basePriceINR: 6.50 },
  { no: 14, symbol: 'Mo', name: 'Molybdenum', type: 'Transition Metal', group: 'dark', assetId: 'molybdenum', basePriceINR: 4.90 },
  { no: 15, symbol: 'Tc', name: 'Technetium', type: 'Transition Metal', group: 'green', assetId: 'technetium', basePriceINR: 1250.00 },
  { no: 16, symbol: 'Ru', name: 'Ruthenium', type: 'Precious Metal', group: 'dark', assetId: 'ruthenium', basePriceINR: 3600.00 },
  { no: 17, symbol: 'Rh', name: 'Rhodium', type: 'Precious Metal', group: 'bronze', assetId: 'rhodium', basePriceINR: 38500.00 },
  { no: 18, symbol: 'Pd', name: 'Palladium', type: 'Precious Metal', group: 'bronze', assetId: 'palladium', basePriceINR: 3450.00 },
  { no: 19, symbol: 'V', name: 'Vanadium', type: 'Transition Metal', group: 'silver', assetId: 'vanadium', basePriceINR: 3.50 },
  { no: 20, symbol: 'Cd', name: 'Cadmium', type: 'Transition Metal', group: 'dark', assetId: 'cadmium', basePriceINR: 0.38 },
  { no: 21, symbol: 'Hf', name: 'Hafnium', type: 'Transition Metal', group: 'dark', assetId: 'hafnium', basePriceINR: 185.00 },
  { no: 22, symbol: 'Ta', name: 'Tantalum', type: 'Transition Metal', group: 'dark', assetId: 'tantalum', basePriceINR: 28.50 },
  { no: 23, symbol: 'W', name: 'Tungsten', type: 'Transition Metal', group: 'dark', assetId: 'tungsten', basePriceINR: 4.20 },
  { no: 24, symbol: 'Re', name: 'Rhenium', type: 'Transition Metal', group: 'dark', assetId: 'rhenium', basePriceINR: 145.00 },
  { no: 25, symbol: 'Os', name: 'Osmium', type: 'Transition Metal', group: 'dark', assetId: 'osmium', basePriceINR: 3200.00 },
  { no: 26, symbol: 'Ir', name: 'Iridium', type: 'Transition Metal', group: 'silver', assetId: 'iridium', basePriceINR: 16500.00 },
  { no: 27, symbol: 'Pt', name: 'Platinum', type: 'Precious Metal', group: 'bronze', assetId: 'platinum', basePriceINR: 4850.00 },
  { no: 28, symbol: 'Sc', name: 'Scandium', type: 'Transition Metal', group: 'silver', assetId: 'scandium', basePriceINR: 340.00 },
  { no: 29, symbol: 'Hg', name: 'Mercury', type: 'Transition Metal', group: 'liquid', assetId: 'mercury', basePriceINR: 8.50 },
];

const CORE_ASSETS = ['gold', 'silver'];

export function createAllMetalRates(baseRates) {
  const rates = { ...baseRates };
  metals.forEach((metal) => {
    if (rates[metal.assetId]) return;
    const defaultPrice = metal.basePriceINR || 1.0;
    rates[metal.assetId] = {
      price: defaultPrice,
      change: 0.00,
      pct: 0.00,
    };
  });
  return rates;
}

export function createInitialHoldings(seed = {}) {
  const holdings = { ...seed };
  metals.forEach((metal) => {
    if (holdings[metal.assetId] === undefined) {
      holdings[metal.assetId] = 0;
    }
  });
  return holdings;
}

export function smartParseTransaction(t) {
  if (!t) return null;
  const tType = (t.type || '').toLowerCase();
  const details = (t.details || '').toLowerCase();

  let normType = 'withdrawal';
  if (tType === 'deposit' || details.includes('deposit')) {
    normType = 'deposit';
  } else if (tType === 'referral' || details.includes('referral')) {
    normType = 'referral';
  } else if (tType === 'refund' || details.includes('rejected')) {
    normType = 'refund';
  } else if (tType === 'metal_buy' || tType === 'buy' || details.includes('purchase') || details.includes('bought')) {
    normType = 'buy';
  } else if (tType === 'metal_sell' || tType === 'sell' || details.includes('sold')) {
    normType = 'sell';
  }

  // Detect asset type if missing or default
  let asset = (t.asset || '').toLowerCase();
  if (!asset || asset === 'wallet' || asset === 'metal') {
    const metalMatch = metals.find(m => 
      details.includes(m.name.toLowerCase()) || details.includes(m.assetId.toLowerCase())
    );
    if (metalMatch) {
      asset = metalMatch.assetId;
    }
  }

  // Extract weight from details or t.weight
  let weightVal = parseFloat(t.weight) || 0;
  if (weightVal <= 0 && t.details) {
    const match = t.details.match(/([0-9.]+)\s*g/i);
    if (match) {
      weightVal = parseFloat(match[1]) || 0;
    }
  }

  return {
    id: typeof t.id === 'string' && t.id.startsWith('TX-') ? t.id : 'TX-' + (t.id || Math.floor(1000 + Math.random() * 9000)),
    type: normType,
    asset: asset || 'wallet',
    amount: Math.abs(parseFloat(t.amount) || 0),
    weight: weightVal,
    details: t.details || '',
    status: t.status || 'Completed',
    date: t.date || (t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '))
  };
}

export function calculateHoldingsFromTransactions(txList = [], initialSeed = {}) {
  const holdings = createInitialHoldings(initialSeed);

  txList.forEach(rawTx => {
    const tx = smartParseTransaction(rawTx);
    if (!tx) return;
    const type = tx.type;
    const asset = tx.asset;
    const w = tx.weight;

    if (asset && holdings[asset] !== undefined && w > 0) {
      if (type === 'buy') {
        holdings[asset] = parseFloat(((holdings[asset] || 0) + w).toFixed(4));
      } else if (type === 'sell') {
        let rem = (holdings[asset] || 0) - w;
        if (rem <= 0.00009) rem = 0;
        holdings[asset] = parseFloat(rem.toFixed(4));
      }
    }
  });

  return holdings;
}

export function getMetalByAssetId(assetId) {
  return metals.find((m) => m.assetId === assetId);
}

export function getMetalLabel(assetId) {
  const metal = getMetalByAssetId(assetId);
  if (metal) {
    return `${metal.name} (${metal.symbol})`;
  }
  return assetId.charAt(0).toUpperCase() + assetId.slice(1);
}

export function getAllRateAssetIds(rates) {
  return Object.keys(rates);
}

export function pickRandomRateAsset(rates) {
  const ids = getAllRateAssetIds(rates);
  return ids[Math.floor(Math.random() * ids.length)];
}

/** Gold & Silver only — customer, admin, and home trade UIs */
export const PORTAL_TRADE_ASSETS = ['gold', 'silver'];

/** @deprecated Use PORTAL_TRADE_ASSETS */
export const HOME_TRADE_ASSETS = PORTAL_TRADE_ASSETS;

export function pickRandomPortalAsset(rates) {
  const ids = PORTAL_TRADE_ASSETS.filter((id) => rates[id]);
  return ids[Math.floor(Math.random() * ids.length)] || 'gold';
}

export { CORE_ASSETS };
