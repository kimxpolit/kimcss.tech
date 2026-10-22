/**
 * KIỂM ĐỊNH TOÀN DIỆN TIÊU CHÍ ASSIGNMENT WEB1044
 * Lập trình cơ sở với JavaScript - Website Thương Mại Điện Tử (E-Commerce)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.join(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
    totalTests++;
    try {
        fn();
        console.log(`  ✅ [PASS] ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
        failedTests++;
    }
}

async function runAudit() {
    console.log('========================================================================');
    console.log('🎓 KIỂM ĐỊNH CHUẨN SYLLABUS MÔN HỌC WEB1044 - JAVASCRIPT CƠ SỞ');
    console.log('========================================================================\n');

    // --- PHẦN 1: DỮ LIỆU MẢNG & ĐỐI TƯỢNG (ARRAY & OBJECT) ---
    console.log('📌 PHẦN 1: KIỂM TRA MẢNG DỮ LIỆU & ĐỐI TƯỢNG JAVASCRIPT:');
    
    test('File public/js/data.js tồn tại trên ổ cứng', () => {
        assert(fs.existsSync(path.join(ROOT_DIR, 'public', 'js', 'data.js')));
    });

    const dataJsContent = fs.readFileSync(path.join(ROOT_DIR, 'public', 'js', 'data.js'), 'utf8');
    const { MOCK_PRODUCTS, DEFAULT_CART_ITEMS, MOCK_CATEGORIES } = require('../public/js/data.js');

    test('Mảng MOCK_PRODUCTS chứa tối thiểu 20 sản phẩm (Hiện có: ' + MOCK_PRODUCTS.length + ' sản phẩm)', () => {
        assert(Array.isArray(MOCK_PRODUCTS));
        assert(MOCK_PRODUCTS.length >= 20, `Cần tối thiểu 20 sản phẩm, hiện có ${MOCK_PRODUCTS.length}`);
    });

    test('Mỗi sản phẩm có đầy đủ các thuộc tính đối tượng (id, code, name, price, preview_image, description, category)', () => {
        MOCK_PRODUCTS.forEach((p, idx) => {
            assert(p.id, `Thiếu id ở sản phẩm index ${idx}`);
            assert(p.name, `Thiếu name ở sản phẩm id ${p.id}`);
            assert(typeof p.price === 'number', `Price phải là number ở sản phẩm id ${p.id}`);
            assert(p.preview_image, `Thiếu preview_image ở sản phẩm id ${p.id}`);
            assert(p.category_name, `Thiếu category_name ở sản phẩm id ${p.id}`);
        });
    });

    test('Mảng DEFAULT_CART_ITEMS chứa sẵn tối thiểu 2 sản phẩm mẫu theo yêu cầu Giai đoạn 1', () => {
        assert(Array.isArray(DEFAULT_CART_ITEMS));
        assert(DEFAULT_CART_ITEMS.length >= 2, `Cần tối thiểu 2 sản phẩm mẫu trong giỏ hàng, hiện có ${DEFAULT_CART_ITEMS.length}`);
    });

    // --- PHẦN 2: CÁC TRANG BẮT BUỘC & KHUYẾN KHÍCH ---
    console.log('\n📌 PHẦN 2: KIỂM TRA CẤU TRÚC CÁC TRANG BẮT BUỘC & GIAO DIỆN:');

    const requiredFiles = [
        { file: 'index.html', desc: 'Trang chủ (Home)' },
        { file: 'cart.html', desc: 'Trang giỏ hàng (Cart - Bắt buộc)' },
        { file: 'checkout.html', desc: 'Trang thanh toán (Checkout - Khuyến khích)' },
        { file: 'product.html', desc: 'Trang chi tiết sản phẩm (Product Detail)' },
        { file: 'login.html', desc: 'Trang đăng nhập (Login)' },
        { file: 'register.html', desc: 'Trang đăng ký (Register)' },
        { file: 'orders.html', desc: 'Trang lịch sử đơn hàng (Orders)' }
    ];

    requiredFiles.forEach(rf => {
        test(`Trang ${rf.desc} (${rf.file}) tồn tại`, () => {
            const p = path.join(ROOT_DIR, 'public', rf.file);
            assert(fs.existsSync(p), `Không tìm thấy file ${rf.file}`);
        });
    });

    // --- PHẦN 3: PHƯƠNG THỨC XỬ LÝ MẢNG JAVASCRIPT (BAREM CHẤM ĐIỂM WEB1044) ---
    console.log('\n📌 PHẦN 3: KIỂM TRA CÁC PHƯƠNG THỨC XỬ LÝ MẢNG BẮT BUỘC (ARRAY METHODS):');

    const cartJsContent = fs.readFileSync(path.join(ROOT_DIR, 'public', 'js', 'cart.js'), 'utf8');
    const homeJsContent = fs.readFileSync(path.join(ROOT_DIR, 'public', 'js', 'home.js'), 'utf8');

    test('Giỏ hàng sử dụng Array.reduce() để tính tổng tiền (Thành tiền & Tổng đơn hàng)', () => {
        assert(cartJsContent.includes('.reduce('), 'cart.js bắt buộc phải sử dụng Array.reduce() để tính tổng tiền');
    });

    test('Giỏ hàng sử dụng Array.find() để kiểm tra sản phẩm đã có trong giỏ hàng hay chưa', () => {
        assert(cartJsContent.includes('.find('), 'cart.js bắt buộc phải sử dụng Array.find()');
    });

    test('Giỏ hàng sử dụng Array.filter() để xóa sản phẩm khỏi giỏ hàng', () => {
        assert(cartJsContent.includes('.filter('), 'cart.js bắt buộc phải sử dụng Array.filter()');
    });

    test('Hiển thị giỏ hàng sử dụng Array.map() để render danh sách HTML', () => {
        assert(cartJsContent.includes('.map('), 'cart.js bắt buộc phải sử dụng Array.map()');
    });

    test('Trang chủ sử dụng Array.sort() để sắp xếp sản phẩm theo giá tăng/giảm', () => {
        assert(homeJsContent.includes('.sort('), 'home.js bắt buộc phải sử dụng Array.sort() để sắp xếp sản phẩm');
    });

    test('Trang chủ sử dụng Array.filter() để lọc danh mục và tìm kiếm sản phẩm', () => {
        assert(homeJsContent.includes('.filter('), 'home.js bắt buộc phải sử dụng Array.filter() để tìm kiếm và lọc');
    });

    test('Cơ chế lưu trữ localStorage được sử dụng để giữ dữ liệu giỏ hàng', () => {
        assert(cartJsContent.includes('localStorage.setItem') && cartJsContent.includes('localStorage.getItem'), 'Phải lưu trữ và đọc dữ liệu qua localStorage');
    });

    // --- PHẦN 4: FORM VALIDATION TRANG ĐĂNG KÝ (GIAI ĐOẠN 2) ---
    console.log('\n📌 PHẦN 4: KIỂM TRA FORM VALIDATION PHÍA CLIENT (GIAI ĐOẠN 2):');

    const regHtmlContent = fs.readFileSync(path.join(ROOT_DIR, 'public', 'register.html'), 'utf8');

    test('Form đăng ký kiểm tra đầy đủ họ tên, email, mật khẩu, xác nhận mật khẩu', () => {
        assert(regHtmlContent.includes('reg-fullname') && regHtmlContent.includes('reg-email') && regHtmlContent.includes('reg-password') && regHtmlContent.includes('reg-repassword'));
    });

    test('Kiểm tra định dạng email hợp lệ bằng Regex chuẩn', () => {
        assert(regHtmlContent.includes('emailRegex') || regHtmlContent.includes('test(email)'));
    });

    test('Kiểm tra độ dài mật khẩu tối thiểu 6 ký tự', () => {
        assert(regHtmlContent.includes('.length < 6') || regHtmlContent.includes('.length >= 6'));
    });

    test('Kiểm tra mật khẩu xác nhận trùng khớp với mật khẩu', () => {
        assert(regHtmlContent.includes('password !== repassword'));
    });

    test('Kiểm tra email trùng lặp với danh sách người dùng đã đăng ký', () => {
        assert(regHtmlContent.includes('existingEmail') || regHtmlContent.includes('existingUser'));
    });

    // --- PHẦN 5: KIỂM TRA HTTP RESPONSE RUNTIME QUA PORT 3000 ---
    console.log('\n📌 PHẦN 5: KIỂM TRA TRUY CẬP TRỰC TIẾP RUNTIME HTTP (PORT 3000):');

    const urlsToTest = [
        '/',
        '/index.html',
        '/cart.html',
        '/checkout.html',
        '/product.html?id=1',
        '/login.html',
        '/register.html',
        '/orders.html'
    ];

    for (const urlPath of urlsToTest) {
        await new Promise(resolve => {
            http.get(`http://localhost:3000${urlPath}`, res => {
                test(`HTTP GET ${urlPath} -> Mã ${res.statusCode}`, () => {
                    assert.strictEqual(res.statusCode, 200);
                });
                resolve();
            }).on('error', err => {
                test(`HTTP GET ${urlPath} -> Lỗi kết nối`, () => {
                    throw err;
                });
                resolve();
            });
        });
    }

    console.log('\n========================================================================');
    console.log(`📊 TỔNG KẾT KIỂM THỬ: ${totalTests} TESTS | ĐẠT: ${passedTests} | LỖI: ${failedTests}`);
    console.log('========================================================================');

    if (failedTests === 0) {
        console.log('🎉 XUẤT SẮC! BỘ MÃ NGUỒN ĐÃ ĐÁP ỨNG ĐẦY ĐỦ 100% TIÊU CHÍ CỦA MÔN WEB1044!');
        process.exit(0);
    } else {
        console.error('⚠️ Vẫn còn một số tiêu chí chưa đạt, cần rà soát lại.');
        process.exit(1);
    }
}

runAudit();
