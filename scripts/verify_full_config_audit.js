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

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
    if (condition) {
        console.log(`  ✅ [PASS] ${testName}`);
        passCount++;
    } else {
        console.error(`  ❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
        failCount++;
    }
}

async function runAudit() {
    console.log('========================================================================');
    console.log('🛡️  TỔNG KIỂM ĐỊNH TOÀN DIỆN MỤC CẤU HÌNH HỆ THỐNG & NGÂN HÀNG (RUNTIME)');
    console.log('========================================================================\n');

    // 1. Check HTTP Status of Admin Settings
    console.log('📌 PHẦN 1: KIỂM TRA TRUY CẬP TRANG SETTINGS & GIAO DIỆN ADMIN:');
    try {
        const resSettings = await request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/admin/settings.html',
            method: 'GET'
        });
        assert(resSettings.statusCode === 200, 'Truy cập HTTP /admin/settings.html thành công (Mã 200)');
    } catch (err) {
        assert(false, 'Truy cập /admin/settings.html', err.message);
    }

    // 2. DOM & HTML Element Audit in settings.html
    console.log('\n📌 PHẦN 2: KIỂM TRA ĐẦY ĐỦ CÁC THÀNH PHẦN INPUT & 5 TAB TRONG SETTINGS.HTML:');
    const settingsHtmlPath = path.join(__dirname, '../public/admin/settings.html');
    const settingsHtml = fs.readFileSync(settingsHtmlPath, 'utf8');

    // 5 Tabs verification
    assert(settingsHtml.includes('id="tab-logo-btn"') && settingsHtml.includes('id="tab-logo"'), 'Tab 1: Logo & Nhận diện tồn tại');
    assert(settingsHtml.includes('id="tab-theme-btn"') && settingsHtml.includes('id="tab-theme"'), 'Tab 2: Màu sắc giao diện tồn tại');
    assert(settingsHtml.includes('id="tab-contact-btn"') && settingsHtml.includes('id="tab-contact"'), 'Tab 3: Liên hệ & Tỷ giá tồn tại');
    assert(settingsHtml.includes('id="tab-display-btn"') && settingsHtml.includes('id="tab-display"'), 'Tab 4: Cấu hình hiển thị tồn tại');
    assert(settingsHtml.includes('id="tab-bank-btn"') && settingsHtml.includes('id="tab-bank"'), 'Tab 5: Cấu hình ngân hàng & VietQR tồn tại');

    // Form inputs verification (Tab 1 to Tab 5)
    const requiredInputs = [
        'set_site_logo',
        'set_logo_height',
        'set_primary_color',
        'set_accent_color',
        'set_navbar_bg',
        'set_site_title',
        'set_site_hotline',
        'set_site_email',
        'set_site_zalo',
        'set_site_telegram',
        'set_usd_rate',
        'set_marquee_notice',
        'set_welcome_popup_status',
        'set_welcome_popup_content',
        'set_show_recent_orders',
        'set_status_menu_tools',
        'set_bank_status',
        'set_deposit_syntax_prefix',
        'set_bank_min',
        'set_bank_max',
        'set_bank_notice',
        'set_token_webhook_web2m'
    ];

    let allInputsFound = true;
    for (const inp of requiredInputs) {
        const found = settingsHtml.includes(`id="${inp}"`);
        if (!found) {
            allInputsFound = false;
            console.error(`Missing input element with ID: ${inp}`);
        }
    }
    assert(allInputsFound, `Tất cả ${requiredInputs.length} trường cấu hình input/textarea/checkbox đều có mặt đầy đủ trong DOM`);

    // Modals & Bank elements verification
    assert(settingsHtml.includes('id="modalAddBank"'), 'Modal Thêm ngân hàng tồn tại (#modalAddBank)');
    assert(settingsHtml.includes('id="modalEditBank"'), 'Modal Sửa ngân hàng tồn tại (#modalEditBank)');
    assert(settingsHtml.includes('id="table-admin-banks"'), 'Bảng danh sách tài khoản thụ hưởng tồn tại (#table-admin-banks)');
    assert(settingsHtml.includes('id="btnSaveSettingsTop"'), 'Nút lưu cấu hình trên cùng tồn tại (#btnSaveSettingsTop)');
    assert(settingsHtml.includes('id="btnSaveSettingsBottom"'), 'Nút lưu cấu hình dưới cùng tồn tại (#btnSaveSettingsBottom)');

    // 3. Verify Unified Sidebar Menu Item in all 7 admin files
    console.log('\n📌 PHẦN 3: KIỂM TRA ĐỒNG BỘ MENU SIDEBAR TRÊN TẤT CẢ CÁC TRANG ADMIN:');
    const adminFiles = ['index.html', 'products.html', 'product-stock.html', 'stock.html', 'users.html', 'orders.html', 'settings.html'];
    for (const file of adminFiles) {
        const fPath = path.join(__dirname, '../public/admin', file);
        if (fs.existsSync(fPath)) {
            const content = fs.readFileSync(fPath, 'utf8');
            const hasUnified = content.includes('Cấu hình hệ thống & Ngân hàng') && content.includes('href="settings.html"');
            const hasSeparated = content.includes('Cấu hình ngân hàng') && content.includes('settings.html#tab-bank');
            assert(hasUnified && !hasSeparated, `Trang ${file}: Menu đã gộp chuẩn duy nhất 1 mục [Cấu hình hệ thống & Ngân hàng]`);
        }
    }

    // 4. Admin Authentication & API Verification
    console.log('\n📌 PHẦN 4: KIỂM TRA LOGIC BACKEND API & ĐỒNG BỘ MICROSOFT SQL SERVER:');
    let token = '';
    try {
        const loginRes = await request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { username: 'admin', password: 'admin123' });

        assert(loginRes.statusCode === 200 && loginRes.body?.token, 'Đăng nhập Admin lấy JWT Token thành công');
        token = loginRes.body?.token;
    } catch (err) {
        assert(false, 'Đăng nhập admin', err.message);
        process.exit(1);
    }

    const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // Test saving comprehensive payload through POST /api/admin/settings
    const testConfig = {
        site_logo: '/assets/storage/images/logo_kimcss.png',
        logo_height: 56,
        primary_color: '#2563eb',
        accent_color: '#d4af37',
        navbar_bg: '#ffffff',
        site_title: 'kimcss.tech - MMO Solution',
        site_hotline: '0989.461.037',
        site_email: 'hotro@kimcss.tech',
        site_zalo: '0989.461.037',
        site_telegram: '@kimcss_support',
        usd_rate: 25400,
        marquee_notice: '🔥 Chào mừng bạn đến với kimcss.tech - Nạp tiền tự động qua VietQR duyệt trong 3 giây!',
        welcome_popup_status: 1,
        welcome_popup_content: 'Chào mừng quý khách đến với kimcss.tech!',
        show_recent_orders: 1,
        status_menu_tools: 1,
        bank_status: 1,
        deposit_syntax_prefix: 'NAPTIEN',
        bank_min: 10000,
        bank_max: 50000000,
        bank_notice: 'Nạp tiền tự động 24/7 bảo đảm chính xác',
        token_webhook_web2m: 'SECURE_TOKEN_TEST'
    };

    try {
        const saveRes = await request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/admin/settings',
            method: 'POST',
            headers: authHeaders
        }, testConfig);

        assert(saveRes.statusCode === 200 && saveRes.body?.status === 'success', 'POST /api/admin/settings lưu thành công toàn bộ 22 trường cấu hình');
    } catch (err) {
        assert(false, 'POST /api/admin/settings', err.message);
    }

    // Verify Public GET /api/settings
    try {
        const publicSettings = await request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/settings',
            method: 'GET'
        });

        assert(publicSettings.statusCode === 200 && publicSettings.body?.status === 'success', 'GET /api/settings phản hồi HTTP 200');
        const s = publicSettings.body?.data || {};

        assert(s.site_hotline === '0989.461.037', `Hotline đồng bộ đúng: ${s.site_hotline}`);
        assert(s.usd_rate === 25400 || s.usd_rate === '25400', `Tỷ giá USD đồng bộ đúng: ${s.usd_rate}`);
        assert(s.deposit_syntax_prefix === 'NAPTIEN' || s.prefix_autobank === 'NAPTIEN', `Cú pháp nạp đồng bộ đúng: ${s.deposit_syntax_prefix || s.prefix_autobank}`);
        assert(Number(s.bank_min) === 10000, `Hạn mức nạp tối thiểu: ${s.bank_min}`);
        assert(Number(s.bank_max) === 50000000, `Hạn mức nạp tối đa: ${s.bank_max}`);
    } catch (err) {
        assert(false, 'GET /api/settings', err.message);
    }

    // 5. Test Bank CRUD cycle in Admin
    console.log('\n📌 PHẦN 5: KIỂM TRA CHỨC NĂNG QUẢN LÝ TÀI KHOẢN NGÂN HÀNG (CRUD):');
    let tempBankId = null;
    try {
        // Create bank
        const addBankRes = await request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/admin/banks',
            method: 'POST',
            headers: authHeaders
        }, {
            bank_id: 'MB',
            bank_name: 'Ngân hàng Quân Đội (MBBank)',
            account_number: '0989461037',
            account_name: 'HOANG KIM MMO VIP',
            branch: 'Hội sở chính',
            status: 1
        });

        assert(addBankRes.statusCode === 200 && addBankRes.body?.status === 'success', 'Thêm mới tài khoản ngân hàng thành công');
        tempBankId = addBankRes.body?.data?.id;

        // Edit bank
        if (tempBankId) {
            const editBankRes = await request({
                hostname: '127.0.0.1',
                port: 3000,
                path: `/api/admin/banks/${tempBankId}`,
                method: 'PUT',
                headers: authHeaders
            }, {
                bank_id: 'MB',
                bank_name: 'Ngân hàng TMCP Quân Đội - MBBank',
                account_number: '0989461037',
                account_name: 'HOANG KIM MMO OFFICIAL',
                branch: 'Chi nhánh Hà Nội',
                status: 1
            });
            assert(editBankRes.statusCode === 200 && editBankRes.body?.status === 'success', 'Sửa thông tin tài khoản ngân hàng thành công');

            // Toggle status
            const toggleRes = await request({
                hostname: '127.0.0.1',
                port: 3000,
                path: `/api/admin/banks/toggle-status/${tempBankId}`,
                method: 'POST',
                headers: authHeaders
            });
            assert(toggleRes.statusCode === 200 && toggleRes.body?.status === 'success', 'Bật / Tắt trạng thái nhận tiền thành công');

            // Delete bank (clean up)
            const deleteRes = await request({
                hostname: '127.0.0.1',
                port: 3000,
                path: `/api/admin/banks/${tempBankId}`,
                method: 'DELETE',
                headers: authHeaders
            });
            assert(deleteRes.statusCode === 200 && deleteRes.body?.status === 'success', 'Xóa tài khoản ngân hàng thử nghiệm thành công');
        }
    } catch (err) {
        assert(false, 'Bank CRUD Operations', err.message);
    }

    // 6. Test Client Recharge reflection & Syntax
    console.log('\n📌 PHẦN 6: KIỂM TRA PHẢN ÁNH TỨC THÌ SANG TRANG NẠP TIỀN CLIENT:');
    try {
        const rechargeBanksRes = await request({
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api/recharge/banks',
            method: 'GET'
        });
        assert(rechargeBanksRes.statusCode === 200 && Array.isArray(rechargeBanksRes.body?.data), 'API /api/recharge/banks hoạt động chính xác');
        assert(rechargeBanksRes.body?.data?.length > 0, `Đã kết nối ${rechargeBanksRes.body?.data?.length} ngân hàng thụ hưởng đang hoạt động`);
    } catch (err) {
        assert(false, 'Client recharge banks', err.message);
    }

    console.log('\n========================================================================');
    console.log(`📊 TỔNG KẾT AUDIT: TỔNG SỐ TESTS: ${passCount + failCount} | ĐẠT: ${passCount} | LỖI: ${failCount}`);
    console.log('========================================================================\n');

    if (failCount > 0) {
        console.error('❌ CÓ BÀI TEST THẤT BẠI!');
        process.exit(1);
    } else {
        console.log('🏆 TẤT CẢ CÁC MỤC CẤU HÌNH ĐỀU HOẠT ĐỘNG HOÀN HẢO - 100% CHUẨN XÁC!');
        process.exit(0);
    }
}

runAudit().catch(err => {
    console.error('Fatal Audit Error:', err);
    process.exit(1);
});
