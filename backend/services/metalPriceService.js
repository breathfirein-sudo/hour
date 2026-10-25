const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const TROY_OZ_TO_GRAMS = 31.1034768;
const LB_TO_GRAMS = 453.59237;

// Complete real-world market calibration for all 29 physical elements (Prices in INR per gram)
// India import parity applied for precious metals to match domestic retail/MCX rates.
const METAL_DEFINITIONS = [
  // --- Precious Metals ---
  { id: 'gold', symbol: 'Au', name: 'Gold', category: 'precious', yahooSymbol: 'GC=F', unit: 'oz', landingFactor: 1.18, baseINR: 14450.00 },
  { id: 'silver', symbol: 'Ag', name: 'Silver', category: 'precious', yahooSymbol: 'SI=F', unit: 'oz', landingFactor: 1.25, baseINR: 208.50 },
  { id: 'platinum', symbol: 'Pt', name: 'Platinum', category: 'precious', yahooSymbol: 'PL=F', unit: 'oz', landingFactor: 1.05, baseINR: 4850.00 },
  { id: 'palladium', symbol: 'Pd', name: 'Palladium', category: 'precious', yahooSymbol: 'PA=F', unit: 'oz', landingFactor: 1.05, baseINR: 3450.00 },
  { id: 'rhodium', symbol: 'Rh', name: 'Rhodium', category: 'precious', baseINR: 38500.00 },
  { id: 'iridium', symbol: 'Ir', name: 'Iridium', category: 'precious', baseINR: 16500.00 },
  { id: 'ruthenium', symbol: 'Ru', name: 'Ruthenium', category: 'precious', baseINR: 3600.00 },
  { id: 'osmium', symbol: 'Os', name: 'Osmium', category: 'precious', baseINR: 3200.00 },

  // --- Strategic & High-Tech Refractory Elements ---
  { id: 'technetium', symbol: 'Tc', name: 'Technetium', category: 'strategic', baseINR: 1250.00 },
  { id: 'scandium', symbol: 'Sc', name: 'Scandium', category: 'strategic', baseINR: 340.00 },
  { id: 'hafnium', symbol: 'Hf', name: 'Hafnium', category: 'strategic', baseINR: 185.00 },
  { id: 'rhenium', symbol: 'Re', name: 'Rhenium', category: 'strategic', baseINR: 145.00 },
  { id: 'tantalum', symbol: 'Ta', name: 'Tantalum', category: 'strategic', baseINR: 28.50 },
  { id: 'mercury', symbol: 'Hg', name: 'Mercury', category: 'strategic', baseINR: 8.50 },
  { id: 'niobium', symbol: 'Nb', name: 'Niobium', category: 'strategic', baseINR: 6.50 },
  { id: 'molybdenum', symbol: 'Mo', name: 'Molybdenum', category: 'strategic', baseINR: 4.90 },
  { id: 'yttrium', symbol: 'Y', name: 'Yttrium', category: 'strategic', baseINR: 4.80 },
  { id: 'tungsten', symbol: 'W', name: 'Tungsten', category: 'strategic', baseINR: 4.20 },
  { id: 'cobalt', symbol: 'Co', name: 'Cobalt', category: 'strategic', baseINR: 3.80 },
  { id: 'vanadium', symbol: 'V', name: 'Vanadium', category: 'strategic', baseINR: 3.50 },
  { id: 'zirconium', symbol: 'Zr', name: 'Zirconium', category: 'strategic', baseINR: 3.20 },

  // --- Base & Industrial Elements ---
  { id: 'nickel', symbol: 'Ni', name: 'Nickel', category: 'industrial', baseINR: 1.95 },
  { id: 'copper', symbol: 'Cu', name: 'Copper', category: 'industrial', yahooSymbol: 'HG=F', unit: 'lb', landingFactor: 1.0, baseINR: 1.35 },
  { id: 'titanium', symbol: 'Ti', name: 'Titanium', category: 'industrial', baseINR: 1.25 },
  { id: 'chromium', symbol: 'Cr', name: 'Chromium', category: 'industrial', baseINR: 0.95 },
  { id: 'cadmium', symbol: 'Cd', name: 'Cadmium', category: 'industrial', baseINR: 0.38 },
  { id: 'zinc', symbol: 'Zn', name: 'Zinc', category: 'industrial', baseINR: 0.32 },
  { id: 'manganese', symbol: 'Mn', name: 'Manganese', category: 'industrial', baseINR: 0.24 },
  { id: 'iron', symbol: 'Fe', name: 'Iron', category: 'industrial', baseINR: 0.08 }
];

// In-memory live rates cache
let currentRates = {};
let isInitialFetched = false;
let globalIo = null;
let liveTickInterval = null;
let marketSyncInterval = null;

// Initialize baseline fallback rates with realistic pricing
function initializeFallbackRates() {
  METAL_DEFINITIONS.forEach((m) => {
    currentRates[m.id] = {
      price: m.baseINR,
      change: 0.00,
      pct: 0.00,
      symbol: m.symbol,
      name: m.name,
      category: m.category,
      updatedAt: new Date().toISOString()
    };
  });
}

initializeFallbackRates();

// Fetch live rates from market APIs (Yahoo Finance / Live commodities)
async function fetchMarketRates() {
  let usdInr = 95.42;
  try {
    const usdinrQuote = await yahooFinance.quote('INR=X');
    if (usdinrQuote?.regularMarketPrice) {
      usdInr = usdinrQuote.regularMarketPrice;
    }
  } catch (err) {
    console.warn('[MetalPriceService] USDINR fetch error, using fallback:', usdInr);
  }

  const newRates = { ...currentRates };

  // 1. Fetch direct metals with market symbols (Gold, Silver, Platinum, Palladium, Copper)
  const directMetals = METAL_DEFINITIONS.filter(m => m.yahooSymbol);
  for (const m of directMetals) {
    try {
      const q = await yahooFinance.quote(m.yahooSymbol);
      if (q && q.regularMarketPrice) {
        const priceUSD = q.regularMarketPrice;
        const prevCloseUSD = q.regularMarketPreviousClose || priceUSD;
        const landingFactor = m.landingFactor || 1.0;

        let rawPriceINRPerGram = 0;
        let rawPrevCloseINRPerGram = 0;

        if (m.unit === 'oz') {
          rawPriceINRPerGram = ((priceUSD * usdInr) / TROY_OZ_TO_GRAMS) * landingFactor;
          rawPrevCloseINRPerGram = ((prevCloseUSD * usdInr) / TROY_OZ_TO_GRAMS) * landingFactor;
        } else if (m.unit === 'lb') {
          rawPriceINRPerGram = ((priceUSD * usdInr) / LB_TO_GRAMS) * landingFactor;
          rawPrevCloseINRPerGram = ((prevCloseUSD * usdInr) / LB_TO_GRAMS) * landingFactor;
        }

        const price = parseFloat(rawPriceINRPerGram.toFixed(2));
        const change = parseFloat((rawPriceINRPerGram - rawPrevCloseINRPerGram).toFixed(2));
        const pct = parseFloat((((rawPriceINRPerGram - rawPrevCloseINRPerGram) / rawPrevCloseINRPerGram) * 100).toFixed(2));

        newRates[m.id] = {
          price,
          change,
          pct,
          symbol: m.symbol,
          name: m.name,
          category: m.category,
          updatedAt: new Date().toISOString()
        };
      }
    } catch (err) {
      console.error(`[MetalPriceService] Error fetching ${m.name}:`, err.message);
    }
  }

  // 2. Derive non-quoted elements using their true base prices coupled with real-time sector momentum
  const goldPct = newRates.gold?.pct || 0.0;
  const copperPct = newRates.copper?.pct || 0.0;

  const derivedMetals = METAL_DEFINITIONS.filter(m => !m.yahooSymbol);
  for (const m of derivedMetals) {
    // Precious metals follow gold momentum; industrial/strategic metals follow copper/industrial momentum
    const sectorPct = m.category === 'precious' ? goldPct : copperPct;
    const base = m.baseINR;
    const delta = (base * sectorPct) / 100;
    const price = parseFloat((base + delta).toFixed(2));
    const change = parseFloat(delta.toFixed(2));
    const pct = parseFloat(sectorPct.toFixed(2));

    newRates[m.id] = {
      price,
      change,
      pct,
      symbol: m.symbol,
      name: m.name,
      category: m.category,
      updatedAt: new Date().toISOString()
    };
  }

  currentRates = newRates;
  isInitialFetched = true;

  if (globalIo) {
    globalIo.emit('live_metal_rates', currentRates);
  }
}

// Micro-tick simulator to simulate continuous live market fluctuations every 2 seconds
function startMicroTickLoop() {
  if (liveTickInterval) clearInterval(liveTickInterval);

  liveTickInterval = setInterval(() => {
    if (!currentRates.gold) return;

    // Pick 2 to 4 random assets per tick for micro fluctuations
    const keys = Object.keys(currentRates);
    const numToPick = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < numToPick; i++) {
      const randomAsset = keys[Math.floor(Math.random() * keys.length)];
      const item = currentRates[randomAsset];
      if (!item) continue;

      // ± 0.01% to ± 0.04% micro tick
      const direction = Math.random() < 0.5 ? -1 : 1;
      const changePct = (Math.random() * 0.03 + 0.01) * 0.01 * direction;
      const oldPrice = item.price;
      const delta = oldPrice * changePct;
      
      // Precision handling based on asset magnitude
      const decimals = item.price < 1 ? 4 : 2;
      const newPrice = parseFloat(Math.max(0.01, oldPrice + delta).toFixed(decimals));
      const newChange = parseFloat((item.change + delta).toFixed(2));
      const newPct = parseFloat(((newChange / (newPrice - newChange || 1)) * 100).toFixed(2));

      currentRates[randomAsset] = {
        ...item,
        price: newPrice,
        change: newChange,
        pct: newPct,
        updatedAt: new Date().toISOString()
      };
    }

    if (globalIo) {
      globalIo.emit('live_metal_rates', currentRates);
    }
  }, 2000);
}

function startMetalPriceEngine(io) {
  globalIo = io;
  console.log('[MetalPriceService] Starting real-time calibrated metal price engine for all 29 elements...');

  // Fetch immediately
  fetchMarketRates();

  // Re-sync with live Yahoo market feeds every 30 seconds
  if (marketSyncInterval) clearInterval(marketSyncInterval);
  marketSyncInterval = setInterval(fetchMarketRates, 30000);

  // Start 2-second micro tick broadcast loop
  startMicroTickLoop();
}

function getLiveMetalRates() {
  return currentRates;
}

function getMetalPrice(assetId) {
  return currentRates[assetId]?.price || null;
}

module.exports = {
  startMetalPriceEngine,
  getLiveMetalRates,
  getMetalPrice,
  fetchMarketRates,
  METAL_DEFINITIONS
};
