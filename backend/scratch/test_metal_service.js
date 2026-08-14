const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const TROY_OZ_TO_GRAMS = 31.1034768;
const LB_TO_GRAMS = 453.59237;

// List of elements from metals.js
const METAL_DEFINITIONS = [
  { id: 'gold', symbol: 'Au', name: 'Gold', yahooSymbol: 'GC=F', unit: 'oz', basePriceFactor: 1.0 },
  { id: 'silver', symbol: 'Ag', name: 'Silver', yahooSymbol: 'SI=F', unit: 'oz', basePriceFactor: 1.0 },
  { id: 'platinum', symbol: 'Pt', name: 'Platinum', yahooSymbol: 'PL=F', unit: 'oz', basePriceFactor: 1.0 },
  { id: 'palladium', symbol: 'Pd', name: 'Palladium', yahooSymbol: 'PA=F', unit: 'oz', basePriceFactor: 1.0 },
  { id: 'copper', symbol: 'Cu', name: 'Copper', yahooSymbol: 'HG=F', unit: 'lb', basePriceFactor: 1.0 },
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

async function fetchLiveRates() {
  let usdInr = 95.42;
  try {
    const usdinrQuote = await yahooFinance.quote('INR=X');
    if (usdinrQuote?.regularMarketPrice) {
      usdInr = usdinrQuote.regularMarketPrice;
    }
  } catch (err) {
    console.warn('Failed to fetch USDINR, using fallback:', usdInr);
  }

  console.log(`Live USD/INR Rate: ₹${usdInr}`);

  const rates = {};

  // Fetch direct market metals
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

        rates[m.id] = {
          price,
          change,
          pct,
          symbol: m.symbol,
          name: m.name,
          updatedAt: new Date().toISOString()
        };
      }
    } catch (err) {
      console.error(`Error fetching ${m.name}:`, err.message);
    }
  }

  // Derive all other elements relative to Gold live price
  const refGoldPrice = rates.gold?.price || 13468.13;
  const refGoldChange = rates.gold?.change || 0;
  const refGoldPct = rates.gold?.pct || 0;

  const derivedMetals = METAL_DEFINITIONS.filter(m => !m.yahooSymbol);
  for (const m of derivedMetals) {
    const factor = m.priceFactor || 0.05;
    const price = parseFloat((refGoldPrice * factor).toFixed(2));
    const change = parseFloat((refGoldChange * factor).toFixed(2));
    const pct = refGoldPct;

    rates[m.id] = {
      price,
      change,
      pct,
      symbol: m.symbol,
      name: m.name,
      updatedAt: new Date().toISOString()
    };
  }

  console.log('Sample Live Metal Rates:');
  console.log('Gold:', rates.gold);
  console.log('Silver:', rates.silver);
  console.log('Platinum:', rates.platinum);
  console.log('Copper:', rates.copper);
  console.log('Iron:', rates.iron);
  console.log('Titanium:', rates.titanium);

  return rates;
}

fetchLiveRates();
