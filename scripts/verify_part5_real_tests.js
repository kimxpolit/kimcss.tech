/**
 * Comprehensive Real Integration & Zero-Fake-Test Protocol
 * Executes against live runtime (http://localhost:3000) and Microsoft SQL Server (ShopCloneDB)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../server/config/db');

const BASE_URL = 'http://localhost:3000';

function httpRequest(urlPath, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlPath, BASE_URL);
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: method,
            headers: {
                ...headers
            }
        };

        if (data) {
            const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch (e) {
                    parsed = body;
                }
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: parsed,
                    rawBody: body
                });
            });
        });

        req.on('error', (err) => reject(err));

        if (data) {
            req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log('======================================================================');
    console.log('   ZERO-FAKE-TEST SUITE: REAL RUNTIME & SQL SERVER VERIFICATION');
    console.log('======================================================================\n');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    function assert(desc, condition, details = '') {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`  ✅ [PASS] ${desc}`);
        } else {
            failedTests++;
            console.error(`  ❌ [FAIL] ${desc} ${details ? '- ' + details : ''}`);
        }
    }

    // -------------------------------------------------------------------------
    // PHẦN 1: HTTP Status Codes & Route Fallback Verification
    // -------------------------------------------------------------------------
    console.log('[SECTION 1] Kiểm tra HTTP Status Codes & Route Fallback');

    const testRoutes = [
        { path: '/', expected: [200, 304], desc: 'Trang chủ root (/)' },
        { path: '/index.html', expected: [200, 304], desc: 'Trang chủ (/index.html)' },
        { path: '/recharge.html', expected: [200, 304], desc: 'Trang nạp tiền (/recharge.html)' },
        { path: '/orders.html', expected: [200, 304], desc: 'Trang lịch sử đơn hàng (/orders.html)' },
        { path: '/api-document.html', expected: [200, 304], desc: 'Trang tài liệu API (/api-document.html)' },
        { path: '/admin/index.html', expected: [200, 304], desc: 'Admin Dashboard (/admin/index.html)' },
        { path: '/admin/settings.html', expected: [200, 304], desc: 'Admin Cấu hình giao diện (/admin/settings.html)' }
    ];

    for (const r of testRoutes) {
        try {
            const res = await httpRequest(r.path);
            assert(`Route ${r.path} trả về HTTP 200: ${r.desc}`, r.expected.includes(res.statusCode), `Nhận được HTTP ${res.statusCode}`);
        } catch (e) {
            assert(`Route ${r.path} kết nối thành công`, false, e.message);
        }
    }

    // Check Fallback Redirect for /admin/login.html and /admin/logout
    try {
        const resAdminLogin = await httpRequest('/admin/login.html');
        const isRedirect = (resAdminLogin.statusCode === 302 || resAdminLogin.statusCode === 301) &&
                           (resAdminLogin.headers.location === '/login.html' || resAdminLogin.headers.location === 'login.html');
        assert('Fallback /admin/login.html: Không bị 404, trả về 302 Redirect về /login.html', isRedirect, `HTTP ${resAdminLogin.statusCode}, Location: ${resAdminLogin.headers.location}`);
    } catch (e) {
        assert('Fallback /admin/login.html', false, e.message);
    }

    try {
        const resAdminLogout = await httpRequest('/admin/logout');
        const isRedirect = (resAdminLogout.statusCode === 302 || resAdminLogout.statusCode === 301) &&
                           (resAdminLogout.headers.location === '/login.html' || resAdminLogout.headers.location === 'login.html');
        assert('Fallback /admin/logout: Không bị 404, trả về 302 Redirect về /login.html', isRedirect, `HTTP ${resAdminLogout.statusCode}, Location: ${resAdminLogout.headers.location}`);
    } catch (e) {
        assert('Fallback /admin/logout', false, e.message);
    }

    console.log('');

    // -------------------------------------------------------------------------
    // PHẦN 2: Kiểm tra cập nhật dữ liệu THẬT vào Microsoft SQL Server
    // -------------------------------------------------------------------------
    console.log('[SECTION 2] Kiểm tra ghi/đọc dữ liệu THẬT trên Microsoft SQL Server (ShopCloneDB)');

    let adminToken = '';
    try {
        const loginRes = await httpRequest('/api/auth/login', 'POST', {
            username: 'admin',
            password: 'admin123'
        });
        if (loginRes.body && loginRes.body.status === 'success' && loginRes.body.token) {
            adminToken = loginRes.body.token;
            assert('Đăng nhập Admin thành công nhận JWT token', true);
        } else {
            assert('Đăng nhập Admin thành công nhận JWT token', false, JSON.stringify(loginRes.body));
        }
    } catch (e) {
        assert('Gọi API đăng nhập Admin', false, e.message);
    }

    if (adminToken) {
        const pool = await getPool();

        // 1. Lấy giá trị hiện tại từ SQL Server
        const preQuery = await pool.request().query("SELECT TOP 1 * FROM dbo.[Settings] WHERE [name] = 'site_config'");
        const originalRow = preQuery.recordset[0] || {};
        const originalHotline = originalRow.site_hotline || '0947.838.128';
        const originalNotice = originalRow.marquee_notice || 'Hệ thống tài nguyên MMO tự động 24/7';

        console.log(`     📌 Giá trị hotline ban đầu trong SQL Server: "${originalHotline}"`);

        // 2. Cập nhật giá trị test qua API POST /api/admin/settings
        const testHotline = '0988.777.999';
        const testNotice = 'Thông báo test tự động chạy lúc ' + new Date().toLocaleTimeString();

        const updateRes = await httpRequest('/api/admin/settings', 'POST', {
            site_hotline: testHotline,
            marquee_notice: testNotice,
            logo_height: 56,
            primary_color: '#2563eb',
            accent_color: '#d4af37',
            navbar_bg: '#ffffff'
        }, {
            'Authorization': `Bearer ${adminToken}`
        });

        assert('API POST /api/admin/settings trả về status: "success"', updateRes.body && updateRes.body.status === 'success');

        // 3. Truy vấn trực tiếp bằng T-SQL vào dbo.[Settings] để xác nhận giá trị trong DB thay đổi thật
        const verifyQuery = await pool.request().query("SELECT TOP 1 * FROM dbo.[Settings] WHERE [name] = 'site_config'");
        const updatedRow = verifyQuery.recordset[0];

        assert(
            `Xác nhận T-SQL: [site_hotline] trong dbo.[Settings] đã cập nhật THẬT thành "${testHotline}"`,
            updatedRow && updatedRow.site_hotline === testHotline,
            `Thực tế trong DB: ${updatedRow ? updatedRow.site_hotline : 'null'}`
        );

        assert(
            `Xác nhận T-SQL: [marquee_notice] trong dbo.[Settings] đã cập nhật THẬT thành "${testNotice}"`,
            updatedRow && updatedRow.marquee_notice === testNotice,
            `Thực tế trong DB: ${updatedRow ? updatedRow.marquee_notice : 'null'}`
        );

        // 4. Kiểm tra GET /api/settings phản hồi đúng dữ liệu mới
        const clientSettingsRes = await httpRequest('/api/settings');
        assert(
            'Client API GET /api/settings phản hồi đúng hotline mới',
            clientSettingsRes.body && clientSettingsRes.body.data && clientSettingsRes.body.data.site_hotline === testHotline
        );

        // 5. Khôi phục lại dữ liệu chuẩn ban đầu
        await httpRequest('/api/admin/settings', 'POST', {
            site_hotline: originalHotline,
            marquee_notice: originalNotice,
            logo_height: 54,
            primary_color: '#2563eb',
            accent_color: '#d4af37',
            navbar_bg: '#ffffff'
        }, {
            'Authorization': `Bearer ${adminToken}`
        });

        const restoreQuery = await pool.request().query("SELECT TOP 1 * FROM dbo.[Settings] WHERE [name] = 'site_config'");
        const restoredRow = restoreQuery.recordset[0];
        assert(
            `Khôi phục an toàn: [site_hotline] trở lại "${originalHotline}"`,
            restoredRow && restoredRow.site_hotline === originalHotline
        );
    }

    console.log('');

    // -------------------------------------------------------------------------
    // PHẦN 3: Static Code Analysis Kiểm tra Null-Safety trên DOM
    // -------------------------------------------------------------------------
    console.log('[SECTION 3] Static Code Analysis: Kiểm tra Null-Safety cho DOM Interactions');

    const jsFilesToCheck = [
        'public/js/core/theme.js',
        'public/js/home.js',
        'public/js/auth.js',
        'public/admin/settings.html'
    ];

    for (const relPath of jsFilesToCheck) {
        const fullPath = path.join(__dirname, '..', relPath);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');

            // Check for dangerous unguard getElementById or querySelector calls followed immediately by .value or .innerHTML without check
            const unhandledPatterns = [
                /document\.getElementById\(['"][^'"]+['"]\)\.(value|innerHTML|innerText|style|classList)\b(?!\?)/g,
                /document\.querySelector\(['"][^'"]+['"]\)\.(value|innerHTML|innerText|style|classList)\b(?!\?)/g
            ];

            let riskyFound = 0;
            for (const pat of unhandledPatterns) {
                const matches = content.match(pat);
                if (matches) {
                    riskyFound += matches.length;
                }
            }

            // In our files, elements are either cached and guarded with `if (el) ...` or safe
            assert(`File [${relPath}] an toàn, không có chuỗi truy cập DOM không có guard (${riskyFound} rủi ro)`, riskyFound === 0, `Tìm thấy ${riskyFound} điểm cần rà soát`);
        } else {
            assert(`File [${relPath}] tồn tại`, false, 'File not found');
        }
    }

    console.log('');

    // -------------------------------------------------------------------------
    // PHẦN 4: Kiểm tra CSS Layout & Animated Logo Integrity
    // -------------------------------------------------------------------------
    console.log('[SECTION 4] Kiểm tra CSS Layout & Animated Logo (Tia sáng vàng kim 3.5s & 3D Glow)');

    // A. Theme Controller CSS Keyframes & Shimmer
    const themeJsPath = path.join(__dirname, '..', 'public/js/core/theme.js');
    const themeJsContent = fs.readFileSync(themeJsPath, 'utf8');

    assert('Theme Controller chứa keyframes @keyframes goldSweepLight', themeJsContent.includes('@keyframes goldSweepLight'));
    assert('Theme Controller chu kỳ quét tia sáng đúng 3.5s', themeJsContent.includes('3.5s infinite'));
    assert('Theme Controller hiệu ứng 3D gold glow: drop-shadow(0 0 8px rgba(255, 215, 0, 0.45))', themeJsContent.includes('rgba(255, 215, 0, 0.45)'));
    assert('Theme Controller hỗ trợ logo Video (.mp4 / .webm) tự động', themeJsContent.includes('isVideo') && themeJsContent.includes('<video'));
    assert('Theme Controller hỗ trợ logo Image (.png / .webp / .svg / .gif)', themeJsContent.includes('<img'));
    assert('Theme Controller chiều cao logo mặc định >= 50px (54px)', themeJsContent.includes('54px'));

    // B. Kiểm tra CSS Dropdown Menu trong public/mod/css/main.css và public/index.html
    const modCssPath = path.join(__dirname, '..', 'public/mod/css/main.css');
    const modCssContent = fs.readFileSync(modCssPath, 'utf8');
    const indexHtmlContent = fs.readFileSync(path.join(__dirname, '..', 'public/index.html'), 'utf8');

    assert('index.html đã tích hợp js/core/theme.js', indexHtmlContent.includes('src="js/core/theme.js"'));
    assert('CSS Dropdown Menu định nghĩa position: relative cho .dropdown-products', modCssContent.includes('.navbar-item.dropdown-products') && modCssContent.includes('position: relative !important'));
    assert('CSS Dropdown Menu định nghĩa position: absolute cho .dropdown-products-menu', modCssContent.includes('.dropdown-products-menu') && modCssContent.includes('position: absolute !important'));
    assert('CSS Dropdown Menu định nghĩa mũi tên căn giữa cho dropdown', modCssContent.includes('.dropdown-position-list::before') && modCssContent.includes('left: 50% !important'));

    // C. Kiểm tra các trang khách hàng đã tích hợp theme.js
    const clientPages = [
        'public/recharge.html',
        'public/orders.html',
        'public/transactions.html',
        'public/profile.html',
        'public/api-document.html'
    ];
    for (const p of clientPages) {
        const full = path.join(__dirname, '..', p);
        const txt = fs.readFileSync(full, 'utf8');
        assert(`Trang [${p}] đã nhúng js/core/theme.js`, txt.includes('src="js/core/theme.js"') || txt.includes('src="../js/core/theme.js"'));
    }

    // D. Kiểm tra trang Admin Settings 4 Tabs
    const adminSettingsPath = path.join(__dirname, '..', 'public/admin/settings.html');
    const adminSettingsContent = fs.readFileSync(adminSettingsPath, 'utf8');

    assert('Admin Settings Tab 1: Logo & Branding', adminSettingsContent.includes('tab-logo') || adminSettingsContent.includes('tab-logo-pane'));
    assert('Admin Settings Tab 2: Theme Customizer (Màu sắc)', adminSettingsContent.includes('tab-theme') || adminSettingsContent.includes('tab-theme-pane'));
    assert('Admin Settings Tab 3: Liên hệ & Thông báo (Contact & Notices)', adminSettingsContent.includes('tab-contact') || adminSettingsContent.includes('tab-contact-pane'));
    assert('Admin Settings Tab 4: Cấu hình hiển thị (Display Switches)', adminSettingsContent.includes('tab-display') || adminSettingsContent.includes('tab-display-pane'));
    assert('Admin Settings chứa tính năng Upload Media (Base64 file reader)', adminSettingsContent.includes('handleMediaUpload'));
    assert('Admin Settings chứa thanh trượt điều chỉnh chiều cao Logo (Slider)', adminSettingsContent.includes('set_logo_height') && adminSettingsContent.includes('type="range"'));

    console.log('\n======================================================================');
    console.log(`   KẾT QUẢ KIỂM THỬ TỔNG THỂ: ${passedTests}/${totalTests} KIỂM TRA ĐẠT (PASS)`);
    console.log(`   TỔNG SỐ LỖI: ${failedTests}`);
    console.log('======================================================================\n');

    process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
});
