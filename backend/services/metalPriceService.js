const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const TROY_OZ_TO_GRAMS = 31.1034768;
const LB_TO_GRAMS = 453.59237;

const METAL_DEFINITIONS = [
  { id: 'gold', symbol: 'Au', name: 'Gold', yahooSymbol: 'GC=F', unit: 'oz', fallbackINR: 13468.00 },
  { id: 'silver', symbol: 'Ag', name: 'Silver', yahooSymbol: 'SI=F', unit: 'oz', fallbackINR: 198.00 },
  { id: 'platinum', symbol: 'Pt', name: 'Platinum', yahooSymbol: 'PL=F', unit: 'oz', fallbackINR: 5290.00 },
  { id: 'palladium', symbol: 'Pd', name: 'Palladium', yahooSymbol: 'PA=F', unit: 'oz', fallbackINR: 4010.00 },
  { id: 'copper', symbol: 'Cu', name: 'Copper', yahooSymbol: 'HG=F', unit: 'lb', fallbackINR: 1.38 },
  { id: 'titanium', symbol: 'Ti', name: 'Titanium', priceFactor: 0.062 },
  { id: 'chromium', symbol: 'Cr', name: 'Chromium', priceFactor: 0.009 },
  { id: 'manganese', symbol: 'Mn', name: 'Manganese', priceFactor: 0.007 },
  { id: 'iron', symbol: 'Fe', name: 'Iron', priceFactor: 0.0085 },
  { id: 'cobalt', symbol: 'Co', name: 'Cobalt', priceFactor: 0.055 },
  { id: 'nickel', symbol: 'Ni', name: 'Nickel', priceFactor: 0.028 },
  { id: 'zinc', symbol: 'Zn', name: 'Zinc', priceFactor: 0.006 },
  { id: 'yttrium', symbol: 'Y', name: 'Yttrium', priceFactor: 0.12 },
  { id: 'zirconium', symbol: 'Zr', name: 'Zirconium', priceFactor: 0.045 },
  { id: 'niobium', symbol: 'Nb', name: 'Niobium', priceFactor: 0.18 },
  { id: 'molybdenum', symbol: 'Mo', name: 'Molybdenum', priceFactor: 0.085 },
  { id: 'technetium', symbol: 'Tc', name: 'Technetium', priceFactor: 1.85 },
  { id: 'ruthenium', symbol: 'Ru', name: 'Ruthenium', priceFactor: 0.95 },
  { id: 'rhodium', symbol: 'Rh', name: 'Rhodium', priceFactor: 3.2 },
  { id: 'vanadium', symbol: 'V', name: 'Vanadium', priceFactor: 0.032 },
  { id: 'cadmium', symbol: 'Cd', name: 'Cadmium', priceFactor: 0.004 },
  { id: 'hafnium', symbol: 'Hf', name: 'Hafnium', priceFactor: 0.22 },
  { id: 'tantalum', symbol: 'Ta', name: 'Tantalum', priceFactor: 0.15 },
  { id: 'tungsten', symbol: 'W', name: 'Tungsten', priceFactor: 0.065 },
  { id: 'rhenium', symbol: 'Re', name: 'Rhenium', priceFactor: 0.42 },
  { id: 'osmium', symbol: 'Os', name: 'Osmium', priceFactor: 1.1 },
  { id: 'iridium', symbol: 'Ir', name: 'Iridium', priceFactor: 0.88 },
  { id: 'scandium', symbol: 'Sc', name: 'Scandium', priceFactor: 0.14 },
  { id: 'mercury', symbol: 'Hg', name: 'Mercury', priceFactor: 0.011 }
];

// In-memory live rates cache
let currentRates = {};
let isInitialFetched = false;
let globalIo = null;
let liveTickInterval = null;
let marketSyncInterval = null;

// Initialize baseline fallback rates so app never starts empty
function initializeFallbackRates() {
  const baseGold = 13468.00;
  METAL_DEFINITIONS.forEach((m) => {
    if (m.yahooSymbol) {
      currentRates[m.id] = {
        price: m.fallbackINR,
        change: 0,
        pct: 0,
        symbol: m.symbol,
        name: m.name,
        updatedAt: new Date().toISOString()
      };
    } else {
      const factor = m.priceFactor || 0.05;
      currentRates[m.id] = {
        price: parseFloat((baseGold * factor).toFixed(2)),
        change: 0,
        pct: 0,
        symbol: m.symbol,
        name: m.name,
        updatedAt: new Date().toISOString()
      };
    }
  });
}

initializeFallbackRates();

// Fetch live rates from market APIs (Yahoo Finance / Google Finance market feeds)
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

  // 1. Fetch direct metals with market symbols
  const directMetals = METAL_DEFINITIONS.filter(m => m.yahooSymbol);
  for (const m of directMetals) {
    try {
      const q = await yahooFinance.quote(m.yahooSymbol);
      if (q && q.regularMarketPrice) {
        const priceUSD = q.regularMarketPrice;
        const prevCloseUSD = q.regularMarketPreviousClose || priceUSD;

        let priceINRPerGram = 0;
        let prevCloseINRPerGram = 0;

        if (m.unit === 'oz') {
          priceINRPerGram = (priceUSD * usdInr) / TROY_OZ_TO_GRAMS;
          prevCloseINRPerGram = (prevCloseUSD * usdInr) / TROY_OZ_TO_GRAMS;
        } else if (m.unit === 'lb') {
          priceINRPerGram = (priceUSD * usdInr) / LB_TO_GRAMS;
          prevCloseINRPerGram = (prevCloseUSD * usdInr) / LB_TO_GRAMS;
        }

        const price = parseFloat(priceINRPerGram.toFixed(2));
        const change = parseFloat((priceINRPerGram - prevCloseINRPerGram).toFixed(2));
        const pct = parseFloat((((priceINRPerGram - prevCloseINRPerGram) / prevCloseINRPerGram) * 100).toFixed(2));

        newRates[m.id] = {
          price,
          change,
          pct,
          symbol: m.symbol,
          name: m.name,
          updatedAt: new Date().toISOString()
        };
      }
    } catch (err) {
      console.error(`[MetalPriceService] Error fetching ${m.name}:`, err.message);
    }
  }

  // 2. Derive derived element metals relative to live Gold rate
  const refGoldPrice = newRates.gold?.price || 13468.00;
  const refGoldChange = newRates.gold?.change || 0;
  const refGoldPct = newRates.gold?.pct || 0;

  const derivedMetals = METAL_DEFINITIONS.filter(m => !m.yahooSymbol);
  for (const m of derivedMetals) {
    const factor = m.priceFactor || 0.05;
    const price = parseFloat((refGoldPrice * factor).toFixed(2));
    const change = parseFloat((refGoldChange * factor).toFixed(2));
    const pct = refGoldPct;

    newRates[m.id] = {
      price,
      change,
      pct,
      symbol: m.symbol,
      name: m.name,
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

    // Pick 1 to 3 random assets per tick for micro fluctuations
    const keys = Object.keys(currentRates);
    const numToPick = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < numToPick; i++) {
      const randomAsset = keys[Math.floor(Math.random() * keys.length)];
      const item = currentRates[randomAsset];
      if (!item) continue;

      // ± 0.02% to ± 0.06% micro tick
      const direction = Math.random() < 0.5 ? -1 : 1;
      const changePct = (Math.random() * 0.04 + 0.01) * 0.01 * direction;
      const oldPrice = item.price;
      const delta = oldPrice * changePct;
      const newPrice = parseFloat(Math.max(0.01, oldPrice + delta).toFixed(2));
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
  console.log('[MetalPriceService] Starting live metal price engine...');

  // Fetch immediately
  fetchMarketRates();

  // Re-sync with live Yahoo/Google market feeds every 30 seconds
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
  fetchMarketRates
};
