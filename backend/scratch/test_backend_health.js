const http = require('http');

function checkEndpoint(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ path, status: res.statusCode, data });
      });
    }).on('error', (err) => {
      resolve({ path, error: err.message });
    });
  });
}

async function testBackend() {
  console.log('Testing running backend endpoints...');
  console.log(await checkEndpoint('/api/health'));
  console.log(await checkEndpoint('/api/support/chats'));
  process.exit(0);
}

testBackend();
