const https = require('https');

function fetchGoogleFinanceGold() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.google.com',
      path: '/finance/quote/XAU-INR',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Class for price in Google finance: data-last-price
        const match = data.match(/data-last-price="([0-9.]+)"/) || data.match(/class="YMlKec fxfa-c">₹?\s*([0-9,.]+)</);
        if (match) {
          const pricePerOz = parseFloat(match[1].replace(/,/g, ''));
          const pricePerGram = pricePerOz / 31.1034768;
          console.log('Google Finance XAU-INR price/oz:', pricePerOz, 'price/g:', pricePerGram);
          resolve(pricePerGram);
        } else {
          console.log('Google finance regex not matched, length:', data.length);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error('Google Finance error:', err.message);
      resolve(null);
    });
  });
}

fetchGoogleFinanceGold();
