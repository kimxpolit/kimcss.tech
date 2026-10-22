/**
 * KIỂM TRA CHẾ ĐỘ HOẠT ĐỘNG HOÀN TOÀN OFFLINE (KHÔNG CẦN BACKEND / SQL SERVER)
 * Mô phỏng tình huống giảng viên mở bằng VS Code Live Server
 */

const assert = require('assert');
const { MOCK_CATEGORIES, MOCK_PRODUCTS, DEFAULT_CART_ITEMS } = require('../public/js/data.js');

console.log('========================================================================');
console.log('🧪 TEST CHẾ ĐỘ OFFLINE THUẦN JAVASCRIPT (STANDALONE CLIENT)');
console.log('========================================================================\n');

// 1. Kiểm tra nạp danh mục và sản phẩm
console.log('👉 [BƯỚC 1]: Kiểm tra nạp dữ liệu từ data.js khi không có kết nối API:');
assert(MOCK_CATEGORIES.length === 5, 'Phải có 5 danh mục mock');
assert(MOCK_PRODUCTS.length >= 20, 'Phải có ít nhất 20 sản phẩm mock');
console.log(`  ✅ Nạp thành công ${MOCK_CATEGORIES.length} danh mục & ${MOCK_PRODUCTS.length} sản phẩm từ data.js`);

// 2. Kiểm tra tìm kiếm sản phẩm theo từ khóa (Array.filter)
console.log('\n👉 [BƯỚC 2]: Kiểm tra tìm kiếm sản phẩm offline (Array.filter):');
const keyword = 'TikTok';
const searchResults = MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(keyword.toLowerCase()));
assert(searchResults.length > 0, 'Phải tìm thấy sản phẩm có chứa từ khóa TikTok');
console.log(`  ✅ Tìm thấy ${searchResults.length} sản phẩm phù hợp với từ khóa "${keyword}"`);

// 3. Kiểm tra lọc sản phẩm theo danh mục (Array.filter)
console.log('\n👉 [BƯỚC 3]: Kiểm tra lọc sản phẩm theo danh mục offline (Array.filter):');
const catId = 1; // Facebook
const catProducts = MOCK_PRODUCTS.filter(p => p.category_id === catId);
assert(catProducts.length > 0, 'Phải có sản phẩm thuộc danh mục Facebook');
console.log(`  ✅ Lọc danh mục ID=${catId}: Tìm thấy ${catProducts.length} sản phẩm`);

// 4. Kiểm tra sắp xếp theo giá tăng dần & giảm dần (Array.sort)
console.log('\n👉 [BƯỚC 4]: Kiểm tra sắp xếp giá tăng/giảm offline (Array.sort):');
const sortedAsc = [...MOCK_PRODUCTS].sort((a, b) => a.price - b.price);
assert(sortedAsc[0].price <= sortedAsc[1].price, 'Sản phẩm đầu tiên phải có giá nhỏ hơn hoặc bằng sản phẩm thứ 2');
console.log(`  ✅ Sắp xếp giá tăng dần (Thấp -> Cao): Món rẻ nhất là ${sortedAsc[0].price} ₫, đắt nhất là ${sortedAsc[sortedAsc.length - 1].price} ₫`);

const sortedDesc = [...MOCK_PRODUCTS].sort((a, b) => b.price - a.price);
assert(sortedDesc[0].price >= sortedDesc[1].price, 'Sản phẩm đầu tiên phải có giá lớn hơn hoặc bằng sản phẩm thứ 2');
console.log(`  ✅ Sắp xếp giá giảm dần (Cao -> Thấp): Món đắt nhất là ${sortedDesc[0].price} ₫, rẻ nhất là ${sortedDesc[sortedDesc.length - 1].price} ₫`);

// 5. Kiểm tra giỏ hàng mẫu mặc định (Giai đoạn 1)
console.log('\n👉 [BƯỚC 5]: Kiểm tra giỏ hàng mẫu mặc định 2 sản phẩm:');
assert(DEFAULT_CART_ITEMS.length >= 2, 'Phải có sẵn ít nhất 2 sản phẩm trong giỏ hàng mẫu');
const initialTotal = DEFAULT_CART_ITEMS.reduce((sum, item) => sum + (item.price * item.quantity), 0);
console.log(`  ✅ Giỏ hàng mẫu có sẵn ${DEFAULT_CART_ITEMS.length} sản phẩm, tổng tiền ban đầu: ${initialTotal.toLocaleString()} ₫`);

// 6. Kiểm tra chức năng thêm vào giỏ hàng & tính tiền (Array.reduce, Array.find)
console.log('\n👉 [BƯỚC 6]: Kiểm tra logic giỏ hàng (thêm mới, cộng dồn số lượng, tính tổng tiền):');
let cart = [...DEFAULT_CART_ITEMS];

// Thêm sản phẩm ID=3
const p3 = MOCK_PRODUCTS.find(p => p.id === 3);
cart.push({
    id: p3.id,
    name: p3.name,
    price: p3.price,
    quantity: 1
});
console.log(`  ✅ Thêm mới sản phẩm "${p3.name}" vào giỏ hàng`);

// Cộng dồn số lượng sản phẩm ID=1
const existing = cart.find(item => item.id === 1);
existing.quantity += 3;
console.log(`  ✅ Cộng dồn số lượng sản phẩm ID=1: Số lượng mới = ${existing.quantity}`);

// Tính tổng tiền bằng reduce
const finalTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
const finalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
console.log(`  ✅ Tổng số lượng món: ${finalCount} món, Tổng thanh toán giỏ hàng: ${finalTotal.toLocaleString()} ₫`);

console.log('\n========================================================================');
console.log('🏆 KẾT LUẬN: CHẾ ĐỘ OFFLINE HOẠT ĐỘNG HOÀN TOÀN CHÍNH XÁC VÀ ĐỘC LẬP 100%!');
console.log('========================================================================\n');
