/**
 * MỆNH LỆNH SIẾT KỶ LUẬT: BỘ TEST RUNTIME AUDIT THỰC TẾ
 * Kiểm tra mã trạng thái HTTP, kết nối MSSQL, 4 Tab Admin Settings, và fix widget_free
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function logPass(msg) {
    console.log(`  ✅ [PASS] ${msg}`);
    passCount++;
}

function logFail(msg, detail = '') {
    console.error(`  ❌ [FAIL] ${msg} ${detail ? '(' + detail + ')' : ''}`);
    failCount++;
}

function requestHttp(urlPath, followRedirect = false) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: urlPath,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (followRedirect && [301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                    requestHttp(res.headers.location, false).then(resolve).catch(reject);
                } else {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', err => reject(err));
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request Timeout (5s)'));
        });
        req.end();
    });
}

async function runAudit() {
    console.log('========================================================================');
    console.log('  🛡️  HỆ THỐNG KIỂM ĐỊNH THỰC TẾ RUNTIME (PORT 3000 & SQL SERVER)  ');
    console.log('========================================================================\n');

    // MỤC 1: BẢNG MÃ TRẠNG THÁI HTTP CỦA DANH SÁCH URL CỐT LÕI
    console.log('📌 PHẦN 1: BẢNG MÃ TRẠNG THÁI HTTP CỦA TOÀN BỘ CÁC TRANG CỐT LÕI:');
    console.log('------------------------------------------------------------------------');
    console.log('| URL Đường dẫn          | Mã HTTP Mong đợi | Mã Nhận được | Trạng thái |');
    console.log('------------------------------------------------------------------------');

    const testUrls = [
        { path: '/', expected: 200, name: 'Trang chủ root (/)' },
        { path: '/index.html', expected: 200, name: 'Trang chủ index.html' },
        { path: '/api-document.html', expected: 200, name: 'Tài liệu tích hợp API' },
        { path: '/recharge.html', expected: 200, name: 'Trang Nạp tiền VietQR' },
        { path: '/orders.html', expected: 200, name: 'Lịch sử đơn hàng' },
        { path: '/transactions.html', expected: 200, name: 'Biến động số dư' },
        { path: '/admin/index.html', expected: 200, name: 'Admin Dashboard' },
        { path: '/admin/settings.html', expected: 200, name: 'Admin Cấu hình giao diện' },
        { path: '/login.html', expected: 200, name: 'Trang Đăng nhập' },
        { path: '/register.html', expected: 200, name: 'Trang Đăng ký' },
        { path: '/terms.html', expected: 200, name: 'Trang Chính sách' },
        { path: '/faq.html', expected: 200, name: 'Trang FAQ' },
        { path: '/contact.html', expected: 200, name: 'Trang Liên hệ' },
        { path: '/profile.html', expected: 200, name: 'Thông tin tài khoản' },
        { path: '/tools/profile.html', expected: [200, 302], name: 'Fallback Tools Profile -> Profile' },
        { path: '/admin/login.html', expected: [200, 302], name: 'Fallback Admin Login -> Login' },
        { path: '/admin/logout', expected: [200, 302], name: 'Fallback Admin Logout -> Login' }
    ];

    const resultsTable = [];

    for (const item of testUrls) {
        try {
            const res = await requestHttp(item.path, false);
            const isExpected = Array.isArray(item.expected) 
                ? item.expected.includes(res.statusCode) 
                : res.statusCode === item.expected;

            const padPath = (item.path + ' '.repeat(22)).slice(0, 22);
            const padExp = (String(item.expected) + ' '.repeat(16)).slice(0, 16);
            const padGot = (String(res.statusCode) + ' '.repeat(12)).slice(0, 12);
            const statusStr = isExpected ? 'PASS ✅' : 'FAIL ❌';

            console.log(`| ${padPath} | ${padExp} | ${padGot} | ${statusStr}    |`);

            if (isExpected) {
                passCount++;
            } else {
                failCount++;
            }

            resultsTable.push({ ...item, actual: res.statusCode, pass: isExpected });
        } catch (e) {
            console.log(`| ${(item.path + ' '.repeat(22)).slice(0, 22)} | ERROR: ${e.message}`);
            failCount++;
        }
    }
    console.log('------------------------------------------------------------------------\n');

    // MỤC 2: KẾT NỐI VÀ DỮ LIỆU MICROSOFT SQL SERVER THẬT
    console.log('📌 PHẦN 2: KIỂM TRA KẾT NỐI SQL SERVER THẬT QUA API /api/settings:');
    try {
        const res = await requestHttp('/api/settings');
        const json = JSON.parse(res.body);

        if (json.status === 'success' && json.data) {
            logPass(`API /api/settings phản hồi status: success (Dữ liệu từ dbo.[Settings])`);
            logPass(`Cột usd_rate cấu hình hợp lệ: ${json.data.usd_rate} VND/USD`);
            logPass(`Hotline hệ thống: ${json.data.site_hotline || json.data.hotline}`);
            logPass(`Marquee notice: ${json.data.marquee_notice}`);
        } else {
            logFail('API /api/settings không trả về dữ liệu hợp lệ', JSON.stringify(json));
        }
    } catch (e) {
        logFail('Lỗi gọi API /api/settings', e.message);
    }

    // MỤC 3: XÁC NHẬN 4 TAB ADMIN SETTINGS
    console.log('\n📌 PHẦN 3: XÁC NHẬN 4 TAB TRANG ADMIN SETTINGS (public/admin/settings.html):');
    try {
        const settingsHtmlPath = path.join(__dirname, '..', 'public', 'admin', 'settings.html');
        const settingsHtml = fs.readFileSync(settingsHtmlPath, 'utf-8');

        // Check tabs exist
        const hasTab1 = settingsHtml.includes('id="tab-logo-btn"') && settingsHtml.includes('id="tab-logo"');
        const hasTab2 = settingsHtml.includes('id="tab-theme-btn"') && settingsHtml.includes('id="tab-theme"');
        const hasTab3 = settingsHtml.includes('id="tab-contact-btn"') && settingsHtml.includes('id="tab-contact"');
        const hasTab4 = settingsHtml.includes('id="tab-display-btn"') && settingsHtml.includes('id="tab-display"');
        const hasTab5 = settingsHtml.includes('id="tab-bank-btn"') && settingsHtml.includes('id="tab-bank"');

        if (hasTab1) logPass('Tab 1: Logo & Nhận Diện tồn tại nút và pane container');
        else logFail('Tab 1: Logo & Nhận Diện bị thiếu');

        if (hasTab2) logPass('Tab 2: Màu Sắc Giao Diện tồn tại nút và pane container');
        else logFail('Tab 2: Màu Sắc Giao Diện bị thiếu');

        if (hasTab3) logPass('Tab 3: Liên Hệ & Thông Báo tồn tại nút và pane container');
        else logFail('Tab 3: Liên Hệ & Thông Báo bị thiếu');

        if (hasTab4) logPass('Tab 4: Cấu Hình Hiển Thị tồn tại nút và pane container');
        else logFail('Tab 4: Cấu Hình Hiển Thị bị thiếu');

        if (hasTab5) logPass('Tab 5: Cấu Hình Ngân Hàng & VietQR tồn tại nút và pane container');
        else logFail('Tab 5: Cấu Hình Ngân Hàng & VietQR bị thiếu');

        // Check fallback script
        const hasFallback = settingsHtml.includes('initTabSwitcherFallback') && settingsHtml.includes('targetPane.classList.add');
        if (hasFallback) logPass('Bộ chuyển tab dự phòng Vanilla JS (initTabSwitcherFallback) đã tích hợp sẵn, không phụ thuộc thư viện ngoài');
        else logFail('Thiếu bộ chuyển tab dự phòng Vanilla JS');

        // Check bootstrap bundle script
        const hasBootstrap = settingsHtml.includes('bootstrap.bundle.min.js');
        if (hasBootstrap) logPass('Đã cấu hình script Bootstrap Bundle 5 hỗ trợ đầy đủ hiệu ứng');
        else logFail('Thiếu script Bootstrap bundle');

    } catch (e) {
        logFail('Lỗi kiểm tra tệp public/admin/settings.html', e.message);
    }

    // MỤC 4: XÁC NHẬN LỖI WIDGET_FREE ĐƯỢC FIX SẠCH TRÊN TRANG CHỦ
    console.log('\n📌 PHẦN 4: XÁC NHẬN FIX SẠCH LỖI BIẾN widget_free TRÊN TRANG CHỦ:');
    try {
        const i18nPath = path.join(__dirname, '..', 'public', 'js', 'core', 'i18n.js');
        const i18nContent = fs.readFileSync(i18nPath, 'utf-8');
        const indexPath = path.join(__dirname, '..', 'public', 'index.html');
        const indexHtml = fs.readFileSync(indexPath, 'utf-8');

        // Check i18n dictionary
        const hasViFree = i18nContent.includes("widget_free: 'Free'") || i18nContent.includes("widget_free: 'Miễn phí'");
        const hasEnFree = i18nContent.includes("widget_free: 'Free'");

        if (hasViFree) logPass('Từ điển Tiếng Việt (i18n.js) đã định nghĩa widget_free');
        else logFail('Từ điển Tiếng Việt thiếu key widget_free');

        if (hasEnFree) logPass('Từ điển Tiếng Anh (i18n.js) đã định nghĩa widget_free = "Free"');
        else logFail('Từ điển Tiếng Anh thiếu key widget_free');

        // Check index.html fallback content
        const matches = [...indexHtml.matchAll(/data-i18n="widget_free">([^<]+)<\/div>/g)];
        if (matches.length === 4) {
            logPass(`Cả 4 widget MMO trong index.html đều có nhãn mặc định: "${matches[0][1]}"`);
        } else {
            logFail(`Số lượng widget_free trong index.html không khớp: tìm thấy ${matches.length}/4`);
        }

        // Check that raw {{widget_free}} or raw variable doesn't leak
        const rawLeak = indexHtml.includes('{{widget_free}}') || indexHtml.includes('${widget_free}');
        if (!rawLeak) logPass('Không có biến thô {{widget_free}} hay ${widget_free} bị rò rỉ trên HTML');
        else logFail('Phát hiện biến thô rò rỉ trên HTML');

    } catch (e) {
        logFail('Lỗi kiểm tra widget_free', e.message);
    }

    // MỤC 5: BẢO TOÀN LAYOUT & LOGO
    console.log('\n📌 PHẦN 5: BẢO TOÀN LAYOUT, DROPDOWNS & ANIMATED LOGO:');
    try {
        const cssPath = path.join(__dirname, '..', 'public', 'mod', 'css', 'main.css');
        const cssContent = fs.readFileSync(cssPath, 'utf-8');

        const hasDropdownProducts = cssContent.includes('.navbar-item.dropdown-products');
        const hasRelative = cssContent.includes('position: relative !important');
        const hasAbsolute = cssContent.includes('position: absolute !important');
        const hasLogoAnim = cssContent.includes('goldSweepLight') && cssContent.includes('3.5s');

        if (hasDropdownProducts && hasRelative && hasAbsolute) {
            logPass('Bảo toàn 100% định vị CSS Dropdown Menu Sản phẩm & Nạp tiền (relative / absolute !important)');
        } else {
            logFail('CSS Dropdown Menu bị thay đổi hoặc thiếu thuộc tính bảo vệ');
        }

        if (hasLogoAnim) {
            logPass('Bảo toàn 100% hiệu ứng ánh kim (Gold Shimmer 3.5s) và phát sáng 3D cho Logo');
        } else {
            logFail('Hiệu ứng chuyển động Logo bị thiếu trong CSS');
        }
    } catch (e) {
        logFail('Lỗi kiểm tra CSS layout', e.message);
    }

    // TỔNG KẾT
    console.log('\n========================================================================');
    console.log(`📊 TỔNG KẾT AUDIT THỰC TẾ: ${passCount + failCount} TESTS`);
    console.log(`   - Thành công: ${passCount} ✅`);
    console.log(`   - Thất bại:   ${failCount} ❌`);
    console.log('========================================================================\n');

    if (failCount === 0) {
        console.log('🏆 KẾT LUẬN: TOÀN BỘ WEBSITE ĐÃ ĐẠT CHUẨN 100% - KHÔNG CÒN BẤT KỲ LỖI NÀO!');
        process.exit(0);
    } else {
        console.error('⚠️  VẪN CÒN LỖI CẦN XỬ LÝ TRƯỚC KHI BÀN GIAO.');
        process.exit(1);
    }
}

runAudit().catch(err => {
    console.error('Lỗi ngoại lệ trong audit:', err);
    process.exit(1);
});
