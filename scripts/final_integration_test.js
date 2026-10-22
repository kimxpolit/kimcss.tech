/**
 * SHOPCLONE 7 - FINAL END-TO-END AUTOMATED INTEGRATION SUITE
 * 100% Zero-PHP & Full Database Integration Testing
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
    console.log('================================================================');
    console.log('🚀 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN HỆ THỐNG SHOPCLONE 7');
    console.log('================================================================\n');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    function assert(condition, message) {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`  ✅ [PASS] ${message}`);
        } else {
            failedTests++;
            console.error(`  ❌ [FAIL] ${message}`);
        }
    }

    // -------------------------------------------------------------
    // TEST 1: ZERO PHP FILES PROTOCOL
    // -------------------------------------------------------------
    console.log('🔍 [TEST 1]: Rà soát toàn bộ thư mục - Tuyệt đối không còn file PHP');
    function scanPhpFiles(dir) {
        let results = [];
        const list = fs.readdirSync(dir);
        for (const file of list) {
            const filePath = path.join(dir, file);
            if (file === 'raw_source' || file === 'node_modules' || file === '.git') continue;
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                results = results.concat(scanPhpFiles(filePath));
            } else if (file.toLowerCase().endsWith('.php')) {
                results.push(filePath);
            }
        }
        return results;
    }

    const phpFiles = scanPhpFiles(path.join(__dirname, '..'));
    assert(phpFiles.length === 0, `Số lượng file PHP trong dự án chạy (ngoại trừ raw_source): ${phpFiles.length} (Kỳ vọng: 0)`);
    if (phpFiles.length > 0) {
        console.error('     Danh sách file PHP còn sót:', phpFiles);
    }

    // -------------------------------------------------------------
    // TEST 2: HTTP 200 TRÊN TẤT CẢ CÁC TRANG CLIENT VÀ ADMIN
    // -------------------------------------------------------------
    console.log('\n🌐 [TEST 2]: Kiểm tra khả dụng HTTP 200 cho toàn bộ trang giao diện');
    const clientPages = [
        '/',
        '/index.html',
        '/api-document.html',
        '/recharge.html',
        '/orders.html',
        '/transactions.html',
        '/profile.html',
        '/login.html',
        '/register.html',
        '/admin/index.html',
        '/admin/products.html',
        '/admin/orders.html',
        '/admin/users.html',
        '/admin/settings.html',
        '/admin/stock.html'
    ];

    for (const page of clientPages) {
        try {
            const res = await fetch(`${BASE_URL}${page}`);
            assert(res.status === 200, `Trang '${page}' phản hồi HTTP 200 OK`);
        } catch (err) {
            assert(false, `Lỗi kết nối trang '${page}': ${err.message}`);
        }
    }

    // -------------------------------------------------------------
    // TEST 3: KIỂM TRA HỆ THỐNG API PUBLIC (CATEGORIES, SETTINGS)
    // -------------------------------------------------------------
    console.log('\n⚙️ [TEST 3]: Kiểm tra API hệ thống và CSDL SQL Server');
    try {
        const healthRes = await fetch(`${BASE_URL}/api/health`);
        const health = await healthRes.json();
        assert(health.status === 'online', 'API Health Check trả về online');

        const catRes = await fetch(`${BASE_URL}/api/products/categories`);
        const catData = await catRes.json();
        assert(catData.status === 'success' && catData.data.length > 0, `Đọc được ${catData.data ? catData.data.length : 0} chuyên mục từ SQL Server`);

        const prodsRes = await fetch(`${BASE_URL}/api/products`);
        const prodsData = await prodsRes.json();
        assert(prodsData.status === 'success' && prodsData.data.length > 0, `Đọc được ${prodsData.data ? prodsData.data.length : 0} sản phẩm từ SQL Server`);
    } catch (err) {
        assert(false, `Lỗi kiểm tra API cơ bản: ${err.message}`);
    }

    // -------------------------------------------------------------
    // TEST 4: KIỂM TRA ĐĂNG NHẬP KHÁCH HÀNG & ADMIN
    // -------------------------------------------------------------
    console.log('\n🔑 [TEST 4]: Kiểm tra xác thực (Authentication Flow)');
    let userToken = '';
    let userApiKey = '';
    let adminToken = '';

    try {
        // Customer login
        const loginCustomerRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'khachhang', password: '123456' })
        });
        const custData = await loginCustomerRes.json();
        assert(custData.status === 'success' && custData.token, `Đăng nhập khách hàng ('khachhang'): Thành công, Số dư: ${custData.user ? custData.user.balance.toLocaleString('vi-VN') : 0} ₫`);
        userToken = custData.token;
        userApiKey = custData.user ? custData.user.api_key : '';

        // Admin login
        const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const adminData = await loginAdminRes.json();
        assert(adminData.status === 'success' && adminData.user.role === 'admin', `Đăng nhập quản trị viên ('admin'): Thành công, Quyền: ${adminData.user ? adminData.user.role : ''}`);
        adminToken = adminData.token;

        // /api/auth/me test
        const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const meData = await meRes.json();
        assert(meData.status === 'success' && meData.user.username === 'khachhang', `Xác thực Token JWT (/api/auth/me) trả về đúng username: ${meData.user ? meData.user.username : ''}`);
        if (meData.user && meData.user.api_key) {
            userApiKey = meData.user.api_key;
        }

        // Change API Key test
        const changeKeyRes = await fetch(`${BASE_URL}/api/auth/change-api-key`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const keyData = await changeKeyRes.json();
        assert(keyData.status === 'success' && keyData.api_key && keyData.api_key !== userApiKey, `Tạo mới API Key thành công: ${keyData.api_key}`);
        userApiKey = keyData.api_key;

    } catch (err) {
        assert(false, `Lỗi xác thực: ${err.message}`);
    }

    // -------------------------------------------------------------
    // TEST 5: TÍCH HỢP OPEN API (SHOPCLONE 7 API SPEC)
    // -------------------------------------------------------------
    console.log('\n📡 [TEST 5]: Kiểm thử Open API tích hợp cho đối tác');
    try {
        // Profile by API Key
        const profileRes = await fetch(`${BASE_URL}/api/profile?api_key=${userApiKey}`);
        const profileData = await profileRes.json();
        assert(profileData.status === 'success' && profileData.data.username === 'khachhang', `Gọi GET /api/profile?api_key=... thành công (User: ${profileData.data ? profileData.data.username : ''})`);

        // Products list by API Key
        const prodsApiRes = await fetch(`${BASE_URL}/api/products.php?api_key=${userApiKey}`);
        const prodsApiData = await prodsApiRes.json();
        assert(prodsApiData.status === 'success' && prodsApiData.categories.length > 0, `Gọi GET /api/products.php?api_key=... thành công (${prodsApiData.categories ? prodsApiData.categories.length : 0} danh mục)`);

        // Single product
        const prodApiRes = await fetch(`${BASE_URL}/api/product?api_key=${userApiKey}&product=1`);
        const prodApiData = await prodApiRes.json();
        assert(prodApiData.status === 'success' && prodApiData.product.length > 0, `Gọi GET /api/product?api_key=... thành công (${prodApiData.product ? prodApiData.product[0].name : ''})`);

    } catch (err) {
        assert(false, `Lỗi kiểm tra Open API: ${err.message}`);
    }

    // -------------------------------------------------------------
    // TEST 6: ACID TRANSACTION PURCHASE & STOCK DELIVERY
    // -------------------------------------------------------------
    console.log('\n💳 [TEST 6]: Kiểm thử luồng giao dịch mua hàng ACID & trừ kho FIFO');
    try {
        // Buy 1 account of product ID 1 via API
        const buyRes = await fetch(`${BASE_URL}/api/buy_product`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: userApiKey,
                id: 1,
                amount: 1
            })
        });
        const buyData = await buyRes.json();
        assert(buyData.status === 'success' && buyData.data && buyData.data.length === 1, `Mua hàng thành công! Mã đơn: ${buyData.trans_id}, Tài khoản trả về: ${buyData.data ? buyData.data[0].substring(0, 20) : ''}...`);

        // Verify balance after purchase
        const checkBalanceRes = await fetch(`${BASE_URL}/api/profile?api_key=${userApiKey}`);
        const checkBalanceData = await checkBalanceRes.json();
        assert(checkBalanceData.status === 'success', `Số dư sau khi trừ tiền: ${checkBalanceData.data ? checkBalanceData.data.balance.toLocaleString('vi-VN') : 0} ₫`);

        // Verify order appears in order history
        const orderHistRes = await fetch(`${BASE_URL}/api/orders/my-orders`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const orderHistData = await orderHistRes.json();
        const latestOrder = orderHistData.data && orderHistData.data[0];
        assert(orderHistData.status === 'success' && latestOrder && latestOrder.order_code === buyData.trans_id, `Đơn hàng ${buyData.trans_id} đã ghi nhận chuẩn xác trong lịch sử đơn hàng SQL Server`);

    } catch (err) {
        assert(false, `Lỗi kiểm thử giao dịch mua hàng: ${err.message}`);
    }

    // -------------------------------------------------------------
    // TEST 7: RECHARGE CONFIGURATION & BANK SELECTOR
    // -------------------------------------------------------------
    console.log('\n🏦 [TEST 7]: Kiểm tra cấu hình nạp tiền VietQR & Lịch sử biến động');
    try {
        const banksRes = await fetch(`${BASE_URL}/api/recharge/banks`);
        const banksData = await banksRes.json();
        assert(banksData.status === 'success' && banksData.data.length > 0, `Đọc được cấu hình ${banksData.data ? banksData.data.length : 0} tài khoản ngân hàng thụ hưởng`);

        const transRes = await fetch(`${BASE_URL}/api/recharge/transactions`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const transData = await transRes.json();
        assert(transData.status === 'success' && transData.data.length > 0, `Kiểm tra biến động số dư: Tìm thấy ${transData.data ? transData.data.length : 0} giao dịch gần nhất`);

    } catch (err) {
        assert(false, `Lỗi kiểm tra nạp tiền: ${err.message}`);
    }

    console.log('\n================================================================');
    console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS PASS (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('================================================================\n');

    if (failedTests > 0) {
        console.error(`⚠️ Có ${failedTests} bài kiểm thử thất bại!`);
        process.exit(1);
    } else {
        console.log('🎉 TOÀN BỘ CÁC BÀI KIỂM THỬ ĐỀU ĐẠT CHUẨN XUẤT SẮC 100%!');
        process.exit(0);
    }
}

runTests();
