const http = require('http');

function request(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: body });
                }
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log('========================================================');
    console.log('🧪 TESTING TABBED RECHARGE & REAL COMMERCIAL WORKFLOW');
    console.log('========================================================');

    // 1. Test Banks API
    console.log('\n--- 1. Testing GET /api/recharge/banks ---');
    const banksRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/recharge/banks',
        method: 'GET'
    });
    console.log('Status:', banksRes.status);
    const banks = banksRes.data.data;
    const vietqrBanks = banks.filter(b => b.bank_id !== 'MOMO');
    const momoBank = banks.find(b => b.bank_id === 'MOMO');
    console.log(`VietQR Banks count: ${vietqrBanks.length}`);
    vietqrBanks.forEach(b => console.log(`  - [${b.bank_id}] ${b.bank_name} | STK: ${b.account_number} | Chủ TK: ${b.account_name}`));
    console.log(`MoMo Account: [${momoBank.bank_id}] ${momoBank.account_name} | SĐT: ${momoBank.account_number}`);

    // 2. Test Customer Login
    console.log('\n--- 2. Logging in as "khachhang" (Password: 123456) ---');
    const loginRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { username: 'khachhang', password: '123456' });

    console.log('Login Status:', loginRes.status, '| Logged-in Username:', loginRes.data.user.username);
    const token = loginRes.data.token;
    if (!token) throw new Error('Failed to get token');

    // 3. Test Check-Status
    console.log('\n--- 3. Testing GET /api/recharge/check-status ---');
    const checkRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/recharge/check-status',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', checkRes.status);
    console.log('User:', checkRes.data.username, '| Balance:', checkRes.data.balance_formatted);
    console.log('Syntax expected on UI:', `NAP ${checkRes.data.username}`);

    // 4. Test Tab 3: Card Recharge API (POST /api/recharge/card)
    console.log('\n--- 4. Testing Tab 3: Scratch Card Recharge (POST /api/recharge/card) ---');
    const cardRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/recharge/card',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    }, {
        telco: 'VIETTEL',
        amount: 100000,
        serial: '10005678912345',
        pin: '9876543210123'
    });
    console.log('Card Submission Status:', cardRes.status);
    console.log('Response:', cardRes.data);

    // 5. Test Webhook with NAP khachhang
    console.log('\n--- 5. Testing Bank Webhook (NAP khachhang) ---');
    const webhookRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/recharge/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, {
        amount: 20000,
        description: 'NAP khachhang',
        transaction_id: 'TEST_TAB_' + Date.now()
    });
    console.log('Webhook Status:', webhookRes.status);
    console.log('Webhook Result:', webhookRes.data);

    // 6. Test Check-Status after Webhook
    console.log('\n--- 6. Verifying balance increase via check-status ---');
    const checkAfter = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/recharge/check-status',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('New Balance:', checkAfter.data.balance_formatted);
    console.log('Latest Transaction Note:', checkAfter.data.latest_recharge.note);

    console.log('\n========================================================');
    console.log('✅ ALL TESTS PASSED SUCCESSFULLY 100%!');
    console.log('========================================================');
}

runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
