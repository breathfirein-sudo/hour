const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function testMetals() {
  try {
    const quoteUSDINR = await yahooFinance.quote('INR=X');
    const usdinr = quoteUSDINR?.regularMarketPrice || 86.5;
    console.log('USDINR:', usdinr);

    const symbols = {
      gold: 'GC=F',       // Gold futures (USD/troy oz)
      silver: 'SI=F',     // Silver futures (USD/troy oz)
      platinum: 'PL=F',   // Platinum futures (USD/troy oz)
      palladium: 'PA=F',  // Palladium futures (USD/troy oz)
      copper: 'HG=F',     // Copper futures (USD/lb)
    };

    for (const [name, sym] of Object.entries(symbols)) {
      try {
        const q = await yahooFinance.quote(sym);
        console.log(`${name} (${sym}):`, {
          priceUSD: q?.regularMarketPrice,
          change: q?.regularMarketChange,
          pct: q?.regularMarketChangePercent
        });
      } catch (err) {
        console.error(`Error for ${name}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Test error:', err);
  }
}

testMetals();
