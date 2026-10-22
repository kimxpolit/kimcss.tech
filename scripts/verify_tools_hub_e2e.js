/**
 * Comprehensive Verification Test for MMO Tools Hub & Routing
 * Zero-Fake-Test Protocol: Runs real HTTP requests against http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ [PASS] ${message}`);
        passCount++;
    } else {
        console.error(`  ❌ [FAIL] ${message}`);
        failCount++;
    }
}

function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: options.method || 'GET',
            headers: options.headers || {},
            agent: false
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function runTests() {
    console.log('====================================================');
    console.log('🧪 BẮT ĐẦU KIỂM THỬ THỰC TẾ: KHO TIỆN ÍCH MMO & ROUTING');
    console.log('====================================================\n');

    // TEST 1: Direct access to /tools/index.html
    console.log('👉 [TEST 1]: Kiểm tra truy cập trực tiếp /tools/index.html');
    const resToolsIndex = await request('/tools/index.html');
    assert(resToolsIndex.statusCode === 200, `GET /tools/index.html trả về HTTP 200 (Hiện tại: ${resToolsIndex.statusCode})`);
    assert(resToolsIndex.body.includes('Kho Tiện Ích MMO'), 'Nội dung trang chứa tiêu đề "Kho Tiện Ích MMO"');
    assert(resToolsIndex.body.includes('tool-checklive-fb.html'), 'Có liên kết tới công cụ Check Live FB');
    assert(resToolsIndex.body.includes('tool-2fa.html'), 'Có liên kết tới công cụ Lấy mã 2FA');
    assert(resToolsIndex.body.includes('tool-icon-facebook.html'), 'Có liên kết tới công cụ Icon Facebook');
    assert(resToolsIndex.body.includes('tool-random-face.html'), 'Có liên kết tới công cụ Random Face');
    assert(resToolsIndex.body.includes('site-logo-img'), 'Có class site-logo-img cho animated shimmer logo');
    assert(resToolsIndex.body.includes('js/core/theme.js'), 'Đã tích hợp core/theme.js');
    assert(resToolsIndex.body.includes('js/core/i18n.js'), 'Đã tích hợp core/i18n.js');
    assert(resToolsIndex.body.includes('hotline-phone-ring'), 'Có widget Hotline phone ring');

    // TEST 2: Redirect /tools -> /tools/index.html
    console.log('\n👉 [TEST 2]: Kiểm tra chuyển hướng route /tools');
    const resTools = await request('/tools');
    assert(resTools.statusCode === 302, `GET /tools trả về HTTP 302 (Hiện tại: ${resTools.statusCode})`);
    assert(resTools.headers.location === '/tools/index.html', `Chuyển hướng chính xác về /tools/index.html (Location: ${resTools.headers.location})`);

    // TEST 3: Redirect /tools/ -> /tools/index.html
    console.log('\n👉 [TEST 3]: Kiểm tra chuyển hướng route /tools/');
    const resToolsSlash = await request('/tools/');
    assert(resToolsSlash.statusCode === 302 || resToolsSlash.statusCode === 200, `GET /tools/ trả về HTTP 302 hoặc 200 (Hiện tại: ${resToolsSlash.statusCode})`);

    // TEST 4: Redirect /tool -> /tools/index.html
    console.log('\n👉 [TEST 4]: Kiểm tra chuyển hướng alias /tool');
    const resTool = await request('/tool');
    assert(resTool.statusCode === 302, `GET /tool trả về HTTP 302 (Hiện tại: ${resTool.statusCode})`);
    assert(resTool.headers.location === '/tools/index.html', `Chuyển hướng chính xác về /tools/index.html (Location: ${resTool.headers.location})`);

    // TEST 5: Legacy tool aliases
    console.log('\n👉 [TEST 5]: Kiểm tra các route legacy chuyển tiếp mượt mà');
    const legacyRoutes = [
        { path: '/tool/check-live-facebook', target: '/tools/tool-checklive-fb.html' },
        { path: '/tool/get-2fa', target: '/tools/tool-2fa.html' },
        { path: '/tool/icon-facebook', target: '/tools/tool-icon-facebook.html' },
        { path: '/tool/random-face', target: '/tools/tool-random-face.html' }
    ];
    for (const item of legacyRoutes) {
        const resLegacy = await request(item.path);
        assert(resLegacy.statusCode === 302, `GET ${item.path} trả về HTTP 302`);
        assert(resLegacy.headers.location === item.target, `Chuyển hướng đúng về ${item.target}`);
    }

    // TEST 6: All 4 tool detail pages HTTP 200
    console.log('\n👉 [TEST 6]: Kiểm tra 4 trang công cụ chi tiết');
    const toolPages = [
        '/tools/tool-checklive-fb.html',
        '/tools/tool-2fa.html',
        '/tools/tool-icon-facebook.html',
        '/tools/tool-random-face.html'
    ];
    for (const page of toolPages) {
        const resPage = await request(page);
        assert(resPage.statusCode === 200, `GET ${page} trả về HTTP 200`);
        assert(resPage.body.includes('/tools/index.html'), `${page} có liên kết quay về Kho tiện ích /tools/index.html`);
        assert(resPage.body.includes('site-logo-img'), `${page} có class site-logo-img`);
        assert(resPage.body.includes('theme.js'), `${page} đã tích hợp theme.js`);
    }

    // TEST 7: Trang chủ index.html
    console.log('\n👉 [TEST 7]: Kiểm tra trang chủ index.html có link Tiện ích MMO');
    const resHome = await request('/index.html');
    assert(resHome.statusCode === 200, 'GET /index.html trả về HTTP 200');
    assert(resHome.body.includes('tools/index.html'), 'Navbar trang chủ chứa link dẫn tới tools/index.html');
    assert(resHome.body.includes('tools/tool-checklive-fb.html'), 'Widget trang chủ có link tool check live FB');
    assert(resHome.body.includes('tools/tool-2fa.html'), 'Widget trang chủ có link tool 2FA');

    // TEST 8: Kiểm tra chuyển tiếp an toàn khi gọi nhầm trang gốc từ thư mục /tools/
    console.log('\n👉 [TEST 8]: Kiểm tra fix lỗi /tools/profile.html -> /profile.html');
    const resToolProfile = await request('/tools/profile.html');
    assert(resToolProfile.statusCode === 302, 'GET /tools/profile.html trả về HTTP 302 chuyển hướng');
    assert(resToolProfile.headers.location === '/profile.html', 'Chuyển hướng đúng về /profile.html');

    const resProfile = await request('/profile.html');
    assert(resProfile.statusCode === 200, 'GET /profile.html trả về HTTP 200');
    assert(resProfile.body.includes('Thông Tin Thành Viên'), 'Trang /profile.html render đầy đủ nội dung tài khoản');

    const authJsPath = path.join(__dirname, '../public/js/auth.js');
    const authJsContent = fs.readFileSync(authJsPath, 'utf8');
    assert(authJsContent.includes('href="/profile.html"'), 'auth.js sử dụng link tuyệt đối href="/profile.html" cho dropdown & header');
    assert(!authJsContent.includes('href="profile.html"'), 'auth.js không còn chứa link tương đối href="profile.html" gây lỗi thư mục');

    // SUMMARY
    console.log('\n====================================================');
    console.log(`📊 KẾT QUẢ TỔNG HỢP: PASS: ${passCount} | FAIL: ${failCount}`);
    console.log('====================================================');

    if (failCount > 0) {
        console.error('❌ CÓ BÀI TEST THẤT BẠI!');
        process.exit(1);
    } else {
        console.log('🎉 TẤT CẢ CÁC BÀI TEST ĐỀU ĐẠT CHUẨN 100%!');
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error('Fatal Test Runner Error:', err);
    process.exit(1);
});
