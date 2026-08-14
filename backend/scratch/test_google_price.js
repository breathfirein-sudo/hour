const https = require('https');

function fetchGoogleGoldPrice() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.google.com',
      path: '/search?q=1+gram+24k+gold+price+in+india+inr+today',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Look for numbers around INR / ₹ in Google snippet
        const match = data.match(/₹\s*([0-9,]+(\.[0-9]+)?)/) || data.match(/INR\s*([0-9,]+(\.[0-9]+)?)/);
        if (match) {
          console.log('Google Search price match:', match[1]);
          resolve(parseFloat(match[1].replace(/,/g, '')));
        } else {
          console.log('No direct match in Google HTML length:', data.length);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error('Google fetch error:', err.message);
      resolve(null);
    });
  });
}

fetchGoogleGoldPrice();
