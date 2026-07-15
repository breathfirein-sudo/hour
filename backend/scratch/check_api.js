const http = require('http');

http.get('http://localhost:5000/api/admin/users/sync', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.clients) {
        const user = parsed.clients.find(c => c.email.includes('sandeep'));
        console.log('User from API:', user);
      } else {
        console.log('No clients found in response:', parsed);
      }
    } catch (e) {
      console.log('Error parsing response:', e);
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
