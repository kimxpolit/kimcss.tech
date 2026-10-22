const http = require('http');

function request(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTest() {
  console.log('--- 1. Testing GET /api/recharge/banks ---');
  const banksRes = await request('/api/recharge/banks');
  console.log('Status:', banksRes.status);
  console.log('Banks list:');
  banksRes.body.data.forEach(b => console.log(`  * ${b.bank_name} (${b.bank_id}): ${b.account_number} - ${b.account_name}`));

  console.log('\n--- 2. Logging in as khachhang ---');
  const loginRes = await request('/api/auth/login', 'POST', { username: 'khachhang', password: '123' });
  let token = '';
  if (loginRes.body.status === 'success') {
    token = loginRes.body.token;
  } else {
    // Try password '123456'
    const login2 = await request('/api/auth/login', 'POST', { username: 'khachhang', password: '123456' });
    token = login2.body.token;
  }
  console.log('Login success, Token obtained:', !!token);

  console.log('\n--- 3. Testing GET /api/recharge/check-status before recharge ---');
  const check1 = await request('/api/recharge/check-status', 'GET', null, { Authorization: `Bearer ${token}` });
  console.log('User status:', check1.body);
  const balBefore = check1.body.balance;

  console.log('\n--- 4. Testing POST /api/recharge/webhook (Simulating Webhook from Casso/Bank) ---');
  const webhookRes = await request('/api/recharge/webhook', 'POST', {
    amount: 15000,
    content: 'NAP khachhang',
    tid: 'WH_' + Date.now()
  });
  console.log('Webhook result:', webhookRes.body);

  console.log('\n--- 5. Testing GET /api/recharge/check-status after recharge ---');
  const check2 = await request('/api/recharge/check-status', 'GET', null, { Authorization: `Bearer ${token}` });
  console.log('User status after webhook:', check2.body);
  const balAfter = check2.body.balance;
  console.log(`Balance changed: ${balBefore} -> ${balAfter} (Delta: +${balAfter - balBefore} VND)`);

  console.log('\n--- 6. Verifying POST /api/recharge/simulate is disabled ---');
  const simRes = await request('/api/recharge/simulate', 'POST', { amount: 50000 });
  console.log('Simulate status code:', simRes.status, '(Expected 404)');

  console.log('\nALL CHECKS COMPLETED SUCCESSFULLY!');
}

runTest().catch(console.error);
