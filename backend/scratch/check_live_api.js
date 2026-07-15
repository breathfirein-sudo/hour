const http = require('https');

http.get('https://hour-60kr.onrender.com/api/admin/users/sync', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.clients) {
        const user = parsed.clients.find(c => c.email.includes('sandeep'));
        console.log('Live User:', user.email, 'isUnlocked:', user.isUnlocked);
      }
    } catch (e) {
      console.log('Error parsing response:', e);
    }
  });
});
