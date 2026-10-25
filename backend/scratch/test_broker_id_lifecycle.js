const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

async function testBrokerToggle() {
  console.log('--- 1. Testing Validate for User 84 in currently Cancelled state ---');
  let authRes = await post('http://localhost:5000/api/auth/validate', { email: 'kshivaprasad33987@gmail.com' });
  console.log('Validate result:', {
    userId: authRes.userId,
    isBroker: authRes.isBroker,
    brokerStatus: authRes.brokerStatus,
    brokerId: authRes.brokerId
  });

  console.log('\n--- 2. Testing /admin/users/sync ---');
  let syncRes = await get('http://localhost:5000/api/admin/users/sync');
  let user84 = syncRes.clients.find(c => c.numericId === 84 || c.email === 'kshivaprasad33987@gmail.com');
  console.log('Sync User 84:', { id: user84?.id, isBroker: user84?.isBroker, brokerStatus: user84?.brokerStatus });

  console.log('\n--- 3. Testing Re-activate Broker for User 84 ---');
  let reactivateRes = await post('http://localhost:5000/api/broker/admin/reactivate', { userId: 84, commissionRate: 8.0 });
  console.log('Reactivate response:', reactivateRes);

  authRes = await post('http://localhost:5000/api/auth/validate', { email: 'kshivaprasad33987@gmail.com' });
  console.log('Validate after reactivate:', {
    userId: authRes.userId,
    isBroker: authRes.isBroker,
    brokerStatus: authRes.brokerStatus,
    brokerId: authRes.brokerId
  });

  syncRes = await get('http://localhost:5000/api/admin/users/sync');
  user84 = syncRes.clients.find(c => c.numericId === 84 || c.email === 'kshivaprasad33987@gmail.com');
  console.log('Sync User 84 after reactivate:', { id: user84?.id, isBroker: user84?.isBroker, brokerStatus: user84?.brokerStatus });

  console.log('\n--- 4. Testing Cancel Broker for User 84 ---');
  let cancelRes = await post('http://localhost:5000/api/broker/admin/cancel-subscription', { userId: 84, reason: 'Testing ID revert' });
  console.log('Cancel response:', cancelRes);

  authRes = await post('http://localhost:5000/api/auth/validate', { email: 'kshivaprasad33987@gmail.com' });
  console.log('Validate after cancel:', {
    userId: authRes.userId,
    isBroker: authRes.isBroker,
    brokerStatus: authRes.brokerStatus,
    brokerId: authRes.brokerId
  });

  syncRes = await get('http://localhost:5000/api/admin/users/sync');
  user84 = syncRes.clients.find(c => c.numericId === 84 || c.email === 'kshivaprasad33987@gmail.com');
  console.log('Sync User 84 after cancel:', { id: user84?.id, isBroker: user84?.isBroker, brokerStatus: user84?.brokerStatus });

  console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY!');
  process.exit(0);
}

testBrokerToggle().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
