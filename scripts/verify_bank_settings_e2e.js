const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed, raw: body });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, headers: res.headers, body: null, raw: body });
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

async function run() {
    console.log('=== RUNNING ZERO-FAKE-TEST: BANK SETTINGS & CRUD E2E ===\n');
    let passCount = 0;
    let failCount = 0;

    function assert(condition, testName, extra = '') {
        if (condition) {
            console.log(`[PASS] ${testName}`);
            passCount++;
        } else {
            console.error(`[FAIL] ${testName} - ${extra}`);
            failCount++;
        }
    }

    // 1. Verify Server is live
    try {
        const healthRes = await request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/settings',
            method: 'GET'
        });
        assert(healthRes.statusCode === 200 && healthRes.body && healthRes.body.status === 'success', 'Server is online and responding on port 3000');
    } catch (err) {
        assert(false, 'Server connection', err.message);
        process.exit(1);
    }

    // 2. Admin Authentication
    let adminToken = '';
    try {
        const loginRes = await request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { username: 'admin', password: 'admin123' });

        assert(loginRes.statusCode === 200 && loginRes.body && loginRes.body.token, 'Admin login successfully with valid JWT token');
        adminToken = loginRes.body.token;
    } catch (err) {
        assert(false, 'Admin login failed', err.message);
        process.exit(1);
    }

    const authHeaders = {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
    };

    // 3. Test GET /api/admin/banks
    let initialBanks = [];
    try {
        const getRes = await request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/admin/banks',
            method: 'GET',
            headers: authHeaders
        });
        assert(getRes.statusCode === 200 && getRes.body.status === 'success', 'GET /api/admin/banks responds 200 success');
        assert(Array.isArray(getRes.body.banks), 'GET /api/admin/banks returns banks array');
        assert(getRes.body.settings && typeof getRes.body.settings === 'object', 'GET /api/admin/banks returns settings object');
        assert('bank_status' in getRes.body.settings && 'deposit_syntax_prefix' in getRes.body.settings, 'Settings object contains bank_status & deposit_syntax_prefix');
        initialBanks = getRes.body.banks;
        console.log(`       Found ${initialBanks.length} existing bank account(s)`);
    } catch (err) {
        assert(false, 'GET /api/admin/banks', err.message);
    }

    // 4. Test POST /api/admin/banks (Create new bank account)
    let createdBankId = null;
    try {
        const newBankData = {
            bank_id: 'ACB',
            bank_name: 'Ngân hàng Á Châu (ACB)',
            account_number: '987654321',
            account_name: 'HOANG KIM MMO VIP',
            branch: 'Chi nhánh Hà Nội',
            status: 1
        };
        const postRes = await request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/admin/banks',
            method: 'POST',
            headers: authHeaders
        }, newBankData);

        assert(postRes.statusCode === 200 && postRes.body.status === 'success', 'POST /api/admin/banks created bank account successfully');
        assert(postRes.body.data && postRes.body.data.id, 'New bank has auto-generated database ID');
        createdBankId = postRes.body.data ? postRes.body.data.id : null;
        console.log(`       Created Test Bank ID: ${createdBankId}`);
    } catch (err) {
        assert(false, 'POST /api/admin/banks', err.message);
    }

    // 5. Test PUT /api/admin/banks/:id (Update bank account)
    if (createdBankId) {
        try {
            const updateData = {
                bank_id: 'ACB',
                bank_name: 'Ngân hàng TMCP Á Châu - Hội Sở',
                account_number: '987654321',
                account_name: 'HOANG KIM MMO PREMIUM',
                branch: 'Hội Sở Chính',
                status: 1
            };
            const putRes = await request({
                hostname: '127.0.0.1',
                port: 3000,
                path: `/api/admin/banks/${createdBankId}`,
                method: 'PUT',
                headers: authHeaders
            }, updateData);

            assert(putRes.statusCode === 200 && putRes.body.status === 'success', `PUT /api/admin/banks/${createdBankId} updated bank details`);
        } catch (err) {
            assert(false, 'PUT /api/admin/banks/:id', err.message);
        }

        // 6. Test POST /api/admin/banks/toggle-status/:id (Toggle status)
        try {
            const toggleRes1 = await request({
                hostname: '127.0.0.1',
                port: 3000,
                path: `/api/admin/banks/toggle-status/${createdBankId}`,
                method: 'POST',
                headers: authHeaders
            });
            assert(toggleRes1.statusCode === 200 && toggleRes1.body.status === 'success' && toggleRes1.body.newStatus === 0, 'Toggle status turns bank OFF (status: 0)');

            const toggleRes2 = await request({
                hostname: '127.0.0.1',
                port: 3000,
                path: `/api/admin/banks/toggle-status/${createdBankId}`,
                method: 'POST',
                headers: authHeaders
            });
            assert(toggleRes2.statusCode === 200 && toggleRes2.body.status === 'success' && toggleRes2.body.newStatus === 1, 'Toggle status turns bank ON (status: 1)');
        } catch (err) {
            assert(false, 'POST /api/admin/banks/toggle-status/:id', err.message);
        }

        // 7. Test Client reflection on /api/recharge/banks
        try {
            const clientRes = await request({
                hostname: '127.0.0.1',
                port: 3000,
                path: '/api/recharge/banks',
                method: 'GET'
            });
            assert(clientRes.statusCode === 200 && clientRes.body.status === 'success', 'GET /api/recharge/banks responds 200');
            const foundClient = (clientRes.body.data || []).find(b => b.id === createdBankId);
            assert(foundClient && foundClient.account_name === 'HOANG KIM MMO PREMIUM', 'Client recharge page immediately sees active newly configured bank');
        } catch (err) {
            assert(false, 'GET /api/recharge/banks reflection', err.message);
        }
    }

    // 8. Test POST /api/admin/banks/settings (General Bank Config)
    try {
        const settingsPayload = {
            bank_status: 1,
            deposit_syntax_prefix: 'HKNAP',
            bank_min: 20000,
            bank_max: 100000000,
            bank_notice: 'Nạp tiền tự động 24/7 - Xử lý trong 30 giây',
            token_webhook_web2m: 'SECURE_WEBHOOK_TOKEN_123'
        };
        const postSetRes = await request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/admin/banks/settings',
            method: 'POST',
            headers: authHeaders
        }, settingsPayload);

        assert(postSetRes.statusCode === 200 && postSetRes.body.status === 'success', 'POST /api/admin/banks/settings saved bank configuration');

        // Check if settings synced back
        const checkSetRes = await request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/settings',
            method: 'GET'
        });
        const currentPrefix = checkSetRes.body.data.deposit_syntax_prefix || checkSetRes.body.data.prefix_autobank;
        assert(currentPrefix === 'HKNAP', `General settings reflected deposit_syntax_prefix = '${currentPrefix}'`);
    } catch (err) {
        assert(false, 'POST /api/admin/banks/settings', err.message);
    }

    // 9. Test DELETE /api/admin/banks/:id (Clean up test bank)
    if (createdBankId) {
        try {
            const delRes = await request({
                hostname: '127.0.0.1',
                port: 3000,
                path: `/api/admin/banks/${createdBankId}`,
                method: 'DELETE',
                headers: authHeaders
            });
            assert(delRes.statusCode === 200 && delRes.body.status === 'success', `DELETE /api/admin/banks/${createdBankId} deleted test bank successfully`);

            // Verify it is gone
            const verifyGetRes = await request({
                hostname: '127.0.0.1',
                port: 3000,
                path: '/api/admin/banks',
                method: 'GET',
                headers: authHeaders
            });
            const stillExists = (verifyGetRes.body.banks || []).some(b => b.id === createdBankId);
            assert(!stillExists, 'Test bank verified completely removed from database');
        } catch (err) {
            assert(false, 'DELETE /api/admin/banks/:id', err.message);
        }
    }

    // 10. Verify Frontend Files Structure
    const settingsHtml = fs.readFileSync(path.join(__dirname, '../public/admin/settings.html'), 'utf8');
    assert(settingsHtml.includes('id="tab-bank"'), 'settings.html contains #tab-bank container');
    assert(settingsHtml.includes('id="tab-bank-btn"'), 'settings.html contains tab-bank-btn tab header');
    assert(settingsHtml.includes('id="table-admin-banks"'), 'settings.html contains #table-admin-banks');
    assert(settingsHtml.includes('id="modalAddBank"'), 'settings.html contains #modalAddBank modal');
    assert(settingsHtml.includes('id="modalEditBank"'), 'settings.html contains #modalEditBank modal');
    assert(settingsHtml.includes('openAddBankModal'), 'settings.html contains openAddBankModal function');
    assert(settingsHtml.includes('saveNewBank'), 'settings.html contains saveNewBank function');
    assert(settingsHtml.includes('deleteBank'), 'settings.html contains deleteBank function');

    // 11. Verify Unified Sidebar Link in all admin files
    const adminPages = ['index.html', 'products.html', 'product-stock.html', 'stock.html', 'users.html', 'orders.html', 'settings.html'];
    for (const page of adminPages) {
        const filePath = path.join(__dirname, '../public/admin', page);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const hasUnifiedLink = content.includes('Cấu hình hệ thống & Ngân hàng') && content.includes('href="settings.html"');
            assert(hasUnifiedLink, `Admin page ${page} has unified 'Cấu hình hệ thống & Ngân hàng' in sidebar navigation`);
        }
    }

    console.log('\n======================================================');
    console.log(`TOTAL TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
    console.log('======================================================\n');

    if (failCount > 0) {
        process.exit(1);
    }
}

run().catch(e => {
    console.error('Fatal error during test run:', e);
    process.exit(1);
});
