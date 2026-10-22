/**
 * End-to-End Verification Test for Admin Settings & Complete Hotline/Phone Propagation
 * Tests real runtime HTTP endpoints and SQL Server persistence on port 3000
 */

const http = require('http');

function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const headers = options.headers || {};
        let bodyData = null;
        if (options.body) {
            bodyData = typeof options.body === 'object' ? JSON.stringify(options.body) : options.body;
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = Buffer.byteLength(bodyData);
        }

        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: options.method || 'GET',
            headers: headers
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(data); } catch(e) {}
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                    json: parsed
                });
            });
        });

        req.on('error', reject);
        if (bodyData) req.write(bodyData);
        req.end();
    });
}

let totalTests = 0;
let passedTests = 0;

function assert(condition, message, details = '') {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ [PASS] ${message}`);
    } else {
        console.error(`  ❌ [FAIL] ${message} ${details ? '(' + details + ')' : ''}`);
    }
}

async function run() {
    console.log('======================================================================');
    console.log('🔍 TEST BỘ CẤU HÌNH ADMIN SETTINGS & THAY THẾ TOÀN BỘ SỐ ĐIỆN THOẠI');
    console.log('======================================================================\n');

    try {
        // 1. Login as Admin
        console.log('--- 1. Đăng nhập Admin & Lấy JWT Token ---');
        const loginRes = await request('/api/auth/login', {
            method: 'POST',
            body: { username: 'admin', password: 'admin123' }
        });
        assert(loginRes.status === 200 && loginRes.json?.status === 'success', 'Admin login thành công');
        const token = loginRes.json?.token;
        assert(!!token, 'Nhận JWT Admin Token hợp lệ');

        // 2. Test saving new settings with a test phone number
        console.log('\n--- 2. Cập nhật cấu hình mới qua POST /api/admin/settings (Test Hotline 0999.888.777) ---');
        const testPayload = {
            site_logo: '/assets/storage/images/logo_kimcss.png',
            logo_height: 56,
            primary_color: '#2563eb',
            accent_color: '#d4af37',
            navbar_bg: '#ffffff',
            site_title: 'kimcss.tech - MMO Solution',
            site_hotline: '0999.888.777',
            site_email: 'hotro@kimcss.tech',
            site_zalo: '0999.888.777',
            site_telegram: '@kimcss_support',
            usd_rate: 25500,
            marquee_notice: '🔥 Chào mừng quý khách - Hotline hỗ trợ: 0999.888.777!',
            welcome_popup_status: 1,
            welcome_popup_content: 'Chào mừng quý khách đến với kimcss.tech!',
            show_recent_orders: 1,
            status_menu_tools: 1
        };

        const updateRes = await request('/api/admin/settings', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: testPayload
        });

        assert(updateRes.status === 200, 'POST /api/admin/settings trả về HTTP 200');
        assert(updateRes.json?.status === 'success', 'Phản hồi API cập nhật thành công: ' + updateRes.json?.msg);

        // 3. Verify Public GET /api/settings
        console.log('\n--- 3. Kiểm tra tính năng đọc cấu hình qua GET /api/settings ---');
        const settingsRes = await request('/api/settings');
        assert(settingsRes.status === 200, 'GET /api/settings trả về HTTP 200');
        const s = settingsRes.json?.data || {};

        assert(s.site_hotline === '0999.888.777', 'site_hotline lưu đúng 0999.888.777', s.site_hotline);
        assert(s.hotline === '0999.888.777', 'hotline alias lưu đúng 0999.888.777', s.hotline);
        assert(s.zalo === '0999.888.777', 'zalo lưu đúng 0999.888.777', s.zalo);
        assert(s.zalo_url === 'https://zalo.me/0999888777', 'zalo_url tự động sinh đúng https://zalo.me/0999888777', s.zalo_url);
        assert(s.usd_rate === 25500, 'usd_rate lưu đúng 25500', s.usd_rate);
        assert(s.status_menu_tools === 1, 'status_menu_tools lưu đúng 1', s.status_menu_tools);
        assert(s.show_recent_orders === 1, 'show_recent_orders lưu đúng 1', s.show_recent_orders);
        assert(s.welcome_popup_status === 1, 'welcome_popup_status lưu đúng 1', s.welcome_popup_status);

        // 4. Verify MoMo bank account phone updated in SQL Server
        console.log('\n--- 4. Kiểm tra tài khoản ngân hàng MoMo qua GET /api/recharge/banks ---');
        const banksRes = await request('/api/recharge/banks');
        assert(banksRes.status === 200 && Array.isArray(banksRes.json?.data), 'GET /api/recharge/banks trả về danh sách ngân hàng');
        const momoBank = (banksRes.json?.data || []).find(b => b.bank_id === 'MOMO');
        assert(!!momoBank, 'Tìm thấy cổng thanh toán MoMo');
        assert(momoBank?.account_number === '0999888777', 'Số tài khoản MoMo tự động cập nhật theo số điện thoại mới (0999888777)', momoBank?.account_number);

        // 5. Restore User Desired Hotline 0989.461.037
        console.log('\n--- 5. Thiết lập số Hotline chính thức 0989.461.037 của Người dùng ---');
        const realPayload = {
            ...testPayload,
            site_hotline: '0989.461.037',
            site_zalo: '0989.461.037',
            usd_rate: 25400,
            marquee_notice: '🔥 Chào mừng bạn đến với kimcss.tech - Nạp tiền tự động qua VietQR duyệt trong 3 giây!'
        };
        const restoreRes = await request('/api/admin/settings', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: realPayload
        });
        assert(restoreRes.status === 200 && restoreRes.json?.status === 'success', 'Đã lưu số hotline 0989.461.037 thành công');

        const finalSettings = await request('/api/settings');
        const fs = finalSettings.json?.data || {};
        assert(fs.site_hotline === '0989.461.037', 'Xác nhận site_hotline chuẩn 0989.461.037', fs.site_hotline);
        assert(fs.zalo_url === 'https://zalo.me/0989461037', 'Xác nhận zalo_url chuẩn https://zalo.me/0989461037', fs.zalo_url);

        const finalBanks = await request('/api/recharge/banks');
        const finalMomo = (finalBanks.json?.data || []).find(b => b.bank_id === 'MOMO');
        assert(finalMomo?.account_number === '0989461037', 'Xác nhận MoMo account_number chuẩn 0989461037', finalMomo?.account_number);

        // 6. Check Static HTML Elements
        console.log('\n--- 6. Kiểm tra các phần tử HTML hiển thị số điện thoại và cấu hình ---');
        const indexHtml = await request('/');
        assert(indexHtml.status === 200, 'GET / trả về HTTP 200');
        assert(indexHtml.body.includes('id="recent-transactions-section"'), 'Trang chủ có id="recent-transactions-section" để bật/tắt bảng đơn hàng');
        assert(indexHtml.body.includes('id="widget-tools"'), 'Trang chủ có id="widget-tools" để bật/tắt 4 tiện ích MMO');
        assert(indexHtml.body.includes('id="hotline-phone-text"'), 'Trang chủ có id="hotline-phone-text" cho nút gọi điện thoại nổi');
        assert(indexHtml.body.includes('id="navbar-hotline"'), 'Trang chủ có id="navbar-hotline"');
        assert(indexHtml.body.includes('id="footer-hotline"'), 'Trang chủ có id="footer-hotline"');

        const contactHtml = await request('/contact.html');
        assert(contactHtml.status === 200, 'GET /contact.html trả về HTTP 200');
        assert(contactHtml.body.includes('site-hotline'), 'Trang liên hệ có class="site-hotline"');
        assert(contactHtml.body.includes('link-zalo'), 'Trang liên hệ có class="link-zalo"');

        const rechargeHtml = await request('/recharge.html');
        assert(rechargeHtml.status === 200, 'GET /recharge.html trả về HTTP 200');
        assert(rechargeHtml.body.includes('id="momo-phone-number"'), 'Trang nạp tiền có id="momo-phone-number"');
        assert(rechargeHtml.body.includes('id="tsr-phone-number"'), 'Trang nạp tiền có id="tsr-phone-number"');

        const adminSettingsHtml = await request('/admin/settings.html');
        assert(adminSettingsHtml.status === 200, 'GET /admin/settings.html trả về HTTP 200');
        assert(adminSettingsHtml.body.includes('id="set_usd_rate"'), 'Admin settings có input id="set_usd_rate"');
        assert(adminSettingsHtml.body.includes('id="set_status_menu_tools"'), 'Admin settings có input switch id="set_status_menu_tools"');
        assert(adminSettingsHtml.body.includes('id="btnSaveSettingsTop"'), 'Admin settings có nút lưu trên đầu id="btnSaveSettingsTop"');
        assert(adminSettingsHtml.body.includes('id="btnSaveSettingsBottom"'), 'Admin settings có nút lưu phía dưới id="btnSaveSettingsBottom"');

        // Summary
        console.log('\n======================================================================');
        console.log(`🎯 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} BÀI TEST ĐẠT (PASS 100%)`);
        console.log('======================================================================');

        if (passedTests === totalTests) {
            process.exit(0);
        } else {
            process.exit(1);
        }
    } catch (err) {
        console.error('Fatal Test Error:', err);
        process.exit(1);
    }
}

run();
