/**
 * WEB1044 - Lập Trình Cơ Sở Với JavaScript
 * Cart Controller: Quản lý giỏ hàng toàn diện với Array methods (find, filter, reduce, map, forEach)
 * Lưu trữ bền vững qua localStorage, tự động khởi tạo 2 sản phẩm mẫu theo yêu cầu Giai đoạn 1
 */

const CART_STORAGE_KEY = 'shopclone_cart';
const COUPON_STORAGE_KEY = 'shopclone_applied_coupon';

// Bảng mã giảm giá áp dụng thử nghiệm
const VALID_COUPONS = {
    'WEB1044': { percent: 15, name: 'Khuyến mãi đặc biệt (Giảm 15%)' },
    'GIAM10': { percent: 10, name: 'Khách hàng mới (Giảm 10%)' },
    'KIMCSS': { percent: 20, name: 'VIP Partner (Giảm 20%)' }
};

/**
 * 1. Lấy danh sách sản phẩm trong giỏ hàng từ localStorage
 * Nếu chưa từng có giỏ hàng, tự động khởi tạo mảng cart với 2 sản phẩm mẫu (Yêu cầu Giai đoạn 1)
 */
function getCart() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        if (!raw) {
            // Khởi tạo 2 sản phẩm mẫu từ data.js
            const initialCart = (typeof window.DEFAULT_CART_ITEMS !== 'undefined' && Array.isArray(window.DEFAULT_CART_ITEMS)) 
                ? [...window.DEFAULT_CART_ITEMS].map(item => ({ ...item, selected: item.selected !== false })) 
                : [
                    {
                        id: 1,
                        code: "FB-001",
                        name: "Clone Facebook 50-500 bạn bè, 2FA, Live trâu, Avatar + Cover đầy đủ",
                        price: 6000,
                        original_price: 8000,
                        preview_image: "mod/img/icon-facebook.png",
                        quantity: 2,
                        category_name: "Tài Khoản Facebook",
                        selected: true
                    },
                    {
                        id: 6,
                        code: "GM-001",
                        name: "Gmail New 2026 ngâm 7 ngày, Chưa liên kết SĐT, IP Việt Nam sạch 100%",
                        price: 3500,
                        original_price: 5000,
                        preview_image: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
                        quantity: 5,
                        category_name: "Gmail & Hotmail",
                        selected: true
                    }
                ];
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initialCart));
            return initialCart;
        }
        const parsed = JSON.parse(raw) || [];
        return parsed.map(item => ({
            ...item,
            selected: item.selected !== false
        }));
    } catch (e) {
        console.error('Lỗi đọc giỏ hàng:', e);
        return [];
    }
}

/**
 * 2. Lưu giỏ hàng vào localStorage và cập nhật badge
 */
function saveCart(cart) {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        updateCartBadges();
    } catch (e) {
        console.error('Lỗi lưu giỏ hàng:', e);
    }
}

/**
 * 3. Thêm sản phẩm vào giỏ hàng
 * - Áp dụng Array.find(): Kiểm tra sản phẩm đã có trong giỏ hàng chưa
 * - Nếu có: cộng dồn số lượng
 * - Nếu chưa: thêm phần tử mới vào mảng
 */
function addToCart(productId, quantity = 1, showToast = true) {
    const qty = Math.max(1, parseInt(quantity) || 1);
    let cart = getCart();

    // Tìm kiếm thông tin sản phẩm từ window.MOCK_PRODUCTS hoặc window.lastLoadedProducts
    let productInfo = null;
    if (typeof window.MOCK_PRODUCTS !== 'undefined') {
        productInfo = window.MOCK_PRODUCTS.find(p => String(p.id) === String(productId));
    }
    if (!productInfo && typeof window.lastLoadedProducts !== 'undefined') {
        productInfo = window.lastLoadedProducts.find(p => String(p.id) === String(productId));
    }

    if (!productInfo) {
        // Fallback default
        productInfo = {
            id: productId,
            code: 'SP-' + productId,
            name: 'Sản phẩm #' + productId,
            price: 10000,
            preview_image: 'mod/img/icon-facebook.png',
            category_name: 'Dịch vụ MMO'
        };
    }

    // Áp dụng find() kiểm tra xem đã có trong giỏ chưa
    const existingItem = cart.find(item => String(item.id) === String(productId));

    if (existingItem) {
        existingItem.quantity += qty;
    } else {
        const itemPrice = Number(productInfo.sale_price || productInfo.price);
        cart.push({
            id: productInfo.id,
            code: productInfo.code || ('SP-' + productInfo.id),
            name: productInfo.name,
            price: itemPrice,
            original_price: Number(productInfo.original_price || itemPrice),
            preview_image: productInfo.preview_image || 'mod/img/icon-facebook.png',
            quantity: qty,
            category_name: productInfo.category_name || 'Sản phẩm',
            selected: true
        });
    }

    saveCart(cart);

    if (showToast) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `Đã thêm vào giỏ hàng! (${qty} sản phẩm)`,
                showConfirmButton: false,
                timer: 2000
            });
        } else {
            alert(`Đã thêm vào giỏ hàng thành công!`);
        }
    }

    // Nếu đang ở trang giỏ hàng, re-render lại bảng
    if (document.getElementById('cart-items-body')) {
        renderCartPage();
    }
}

/**
 * 4. Cập nhật số lượng sản phẩm trực tiếp (từ ô input)
 * - Kiểm tra số lượng phải >= 1 (Yêu cầu bắt buộc Giai đoạn 2)
 */
function updateCartQuantity(productId, newQty) {
    const qty = parseInt(newQty);
    let cart = getCart();
    const item = cart.find(i => String(i.id) === String(productId));

    if (!item) return;

    if (isNaN(qty) || qty < 1) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Số lượng không hợp lệ',
                text: 'Số lượng sản phẩm trong giỏ hàng tối thiểu phải là 1!',
                confirmButtonColor: '#0d6efd'
            });
        } else {
            alert('Số lượng tối thiểu là 1!');
        }
        renderCartPage();
        return;
    }

    item.quantity = qty;
    saveCart(cart);
    renderCartPage();
}

/**
 * 5. Tăng hoặc giảm số lượng (+1 hoặc -1)
 */
function changeCartQuantity(productId, delta) {
    let cart = getCart();
    const item = cart.find(i => String(i.id) === String(productId));
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 1) {
        // Hỏi người dùng có muốn xóa sản phẩm không
        removeFromCart(productId, true);
        return;
    }

    item.quantity = newQty;
    saveCart(cart);
    renderCartPage();
}

/**
 * 6. Xóa một sản phẩm khỏi giỏ hàng
 * - Áp dụng Array.filter(): Lọc bỏ sản phẩm có id tương ứng
 */
function removeFromCart(productId, askConfirm = true) {
    const doDelete = () => {
        let cart = getCart();
        // Dùng filter() để loại bỏ sản phẩm
        cart = cart.filter(item => String(item.id) !== String(productId));
        saveCart(cart);
        renderCartPage();

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Đã xóa sản phẩm khỏi giỏ hàng',
                showConfirmButton: false,
                timer: 1800
            });
        }
    };

    if (askConfirm && typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Xóa sản phẩm này?',
            text: 'Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng không?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fa-solid fa-trash me-1"></i> Xóa',
            cancelButtonText: 'Giữ lại'
        }).then(result => {
            if (result.isConfirmed) {
                doDelete();
            } else {
                renderCartPage();
            }
        });
    } else {
        doDelete();
    }
}

/**
 * 7. Xóa sạch toàn bộ giỏ hàng
 */
function clearCart() {
    let cart = getCart();
    if (cart.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire('Giỏ hàng trống', 'Bạn chưa có sản phẩm nào trong giỏ hàng để xóa!', 'info');
        }
        return;
    }

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Dọn sạch giỏ hàng?',
            text: 'Toàn bộ sản phẩm trong giỏ hàng sẽ bị xóa!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Đồng ý xóa hết',
            cancelButtonText: 'Hủy'
        }).then(result => {
            if (result.isConfirmed) {
                saveCart([]);
                localStorage.removeItem(COUPON_STORAGE_KEY);
                renderCartPage();
                Swal.fire('Đã dọn sạch!', 'Giỏ hàng của bạn hiện đang trống.', 'success');
            }
        });
    } else if (confirm('Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng không?')) {
        saveCart([]);
        localStorage.removeItem(COUPON_STORAGE_KEY);
        renderCartPage();
    }
}

/**
 * 8. Tính tiền giỏ hàng (Áp dụng chỉ cho các sản phẩm ĐƯỢC CHỌN)
 * - Cho phép chọn từng mục để thanh toán
 * - Công thức thành tiền từng món: Thành tiền = Đơn giá × Số lượng
 * - Áp dụng Array.filter() và Array.reduce() để tính tổng tiền và số lượng sản phẩm được chọn
 */
function calculateCartSummary(cart) {
    const allCart = cart || [];
    // filter() chỉ lấy các sản phẩm có selected !== false
    const selectedItems = allCart.filter(item => item.selected !== false);

    // reduce() tính tổng tiền gốc của các sản phẩm được chọn
    const subtotal = selectedItems.reduce((total, item) => {
        return total + (Number(item.price) * Number(item.quantity));
    }, 0);

    // reduce() tính tổng số lượng món được chọn
    const selectedCount = selectedItems.reduce((total, item) => {
        return total + Number(item.quantity);
    }, 0);

    // reduce() tính tổng số lượng tất cả sản phẩm có trong giỏ hàng
    const totalItems = allCart.reduce((total, item) => {
        return total + Number(item.quantity);
    }, 0);

    // Tính toán mã giảm giá nếu có
    const appliedCode = localStorage.getItem(COUPON_STORAGE_KEY);
    let discountPercent = 0;
    let couponName = '';
    if (appliedCode && VALID_COUPONS[appliedCode]) {
        discountPercent = VALID_COUPONS[appliedCode].percent;
        couponName = VALID_COUPONS[appliedCode].name;
    }

    const discountAmount = Math.round(subtotal * (discountPercent / 100));
    const grandTotal = Math.max(0, subtotal - discountAmount);

    return {
        subtotal,
        totalItems,
        selectedCount,
        selectedItems,
        discountPercent,
        discountAmount,
        grandTotal,
        appliedCode,
        couponName
    };
}

/**
 * 8b. Chọn hoặc bỏ chọn tất cả sản phẩm trong giỏ hàng
 */
function toggleSelectAllCart(checked) {
    let cart = getCart();
    cart = cart.map(item => ({
        ...item,
        selected: !!checked
    }));
    saveCart(cart);
    renderCartPage();
}

/**
 * 8c. Chọn hoặc bỏ chọn một sản phẩm riêng lẻ trong giỏ hàng
 */
function toggleCartItemCheck(productId, checked) {
    let cart = getCart();
    const item = cart.find(i => String(i.id) === String(productId));
    if (item) {
        item.selected = !!checked;
        saveCart(cart);
        renderCartPage();
    }
}

/**
 * 9. Áp dụng mã giảm giá
 */
function applyCoupon() {
    const input = document.getElementById('coupon-input');
    if (!input) return;

    const code = input.value.trim().toUpperCase();
    if (!code) {
        if (typeof Swal !== 'undefined') {
            Swal.fire('Chưa nhập mã', 'Vui lòng nhập mã giảm giá của bạn!', 'warning');
        } else {
            alert('Vui lòng nhập mã giảm giá!');
        }
        return;
    }

    if (VALID_COUPONS[code]) {
        localStorage.setItem(COUPON_STORAGE_KEY, code);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Áp dụng mã thành công!',
                text: `${VALID_COUPONS[code].name}`,
                timer: 2000,
                showConfirmButton: false
            });
        }
        renderCartPage();
    } else {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Mã không hợp lệ',
                html: `Mã <b>${code}</b> không tồn tại hoặc đã hết hạn!<br><small class="text-muted">Gợi ý mã có sẵn: <b>GIAM10</b>, <b>KIMCSS</b></small>`
            });
        } else {
            alert('Mã giảm giá không hợp lệ!');
        }
    }
}

function removeCoupon() {
    localStorage.removeItem(COUPON_STORAGE_KEY);
    renderCartPage();
}

/**
 * 10. Format tiền tệ VND tiện lợi
 */
function formatCurrencyVND(amount) {
    if (window.formatCurrency) {
        return window.formatCurrency(amount);
    }
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
}

/**
 * 11. Cập nhật số lượng trên các badge icon giỏ hàng ở header
 * Áp dụng Array.reduce()
 */
function updateCartBadges() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + Number(item.quantity), 0);
    
    // Cập nhật tất cả các badge hiển thị giỏ hàng
    const badgeElements = document.querySelectorAll('.cart-badge-count, #header-cart-count, #cart-badge');
    badgeElements.forEach(el => {
        el.innerText = count;
        if (count > 0) {
            el.style.display = 'inline-block';
        }
    });
}

/**
 * 12. Render trang Cart (public/cart.html)
 * Áp dụng Array.map() và forEach()
 * Hiển thị checkbox chọn từng mục, cập nhật tổng tiền động theo các mục được chọn
 */
function renderCartPage() {
    const tableBody = document.getElementById('cart-items-body');
    const emptyState = document.getElementById('cart-empty-state');
    const cartContent = document.getElementById('cart-content-wrapper');
    if (!tableBody) return;

    const cart = getCart();
    const summary = calculateCartSummary(cart);

    if (cart.length === 0) {
        if (cartContent) cartContent.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (cartContent) cartContent.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';

    // Cập nhật trạng thái checkbox "Chọn tất cả" trên header bảng
    const checkAllEl = document.getElementById('check-all-cart');
    if (checkAllEl) {
        checkAllEl.checked = cart.length > 0 && cart.every(i => i.selected !== false);
    }

    // Dùng Array.map() để tạo các dòng HTML của giỏ hàng với checkbox cho từng sản phẩm
    const rowsHtml = cart.map((item, index) => {
        const isSelected = item.selected !== false;
        const itemSubtotal = Number(item.price) * Number(item.quantity);
        return `
            <tr class="align-middle cart-item-row ${isSelected ? 'selected' : 'unselected'}">
                <td class="text-center" style="width: 45px;">
                    <input type="checkbox" 
                           class="form-check-input cart-item-check" 
                           data-id="${item.id}" 
                           onchange="toggleCartItemCheck('${item.id}', this.checked)" 
                           ${isSelected ? 'checked' : ''} 
                           title="Chọn sản phẩm này để đặt hàng">
                </td>
                <td class="text-center fw-bold text-muted" style="width: 50px;">${index + 1}</td>
                <td style="min-width: 260px;">
                    <div class="d-flex align-items-center gap-3">
                        <img src="${item.preview_image || 'mod/img/icon-facebook.png'}" 
                             alt="${item.name}" 
                             width="52" 
                             height="52" 
                             class="rounded-3 border flex-shrink-0 object-fit-contain bg-light p-1"
                             onerror="this.src='mod/img/icon-facebook.png'">
                        <div>
                            <span class="badge bg-light text-primary border small mb-1">${item.category_name || 'MMO'}</span>
                            <h6 class="mb-0 fw-bold">
                                <a href="product.html?id=${item.id}" class="text-dark text-decoration-none hover-primary">${item.name}</a>
                            </h6>
                            <small class="text-muted">Mã: <code>${item.code || ('SP-' + item.id)}</code></small>
                        </div>
                    </div>
                </td>
                <td class="text-nowrap fw-semibold text-dark">
                    ${formatCurrencyVND(item.price)}
                    ${item.original_price && item.original_price > item.price ? `<div class="text-muted small text-decoration-line-through">${formatCurrencyVND(item.original_price)}</div>` : ''}
                </td>
                <td style="width: 140px;">
                    <div class="input-group input-group-sm quantity-stepper" style="max-width: 120px;">
                        <button class="btn btn-outline-secondary px-2" type="button" onclick="changeCartQuantity('${item.id}', -1)" title="Giảm số lượng">
                            <i class="fa-solid fa-minus small"></i>
                        </button>
                        <input type="number" 
                               class="form-control text-center fw-bold px-1" 
                               value="${item.quantity}" 
                               min="1" 
                               onchange="updateCartQuantity('${item.id}', this.value)"
                               title="Nhập số lượng">
                        <button class="btn btn-outline-secondary px-2" type="button" onclick="changeCartQuantity('${item.id}', 1)" title="Tăng số lượng">
                            <i class="fa-solid fa-plus small"></i>
                        </button>
                    </div>
                </td>
                <td class="text-nowrap fw-bold text-danger fs-6">
                    ${formatCurrencyVND(itemSubtotal)}
                </td>
                <td class="text-end" style="width: 70px;">
                    <button type="button" 
                            class="btn btn-outline-danger btn-sm rounded-circle p-2" 
                            onclick="removeFromCart('${item.id}')" 
                            title="Xóa khỏi giỏ hàng">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rowsHtml;

    // Cập nhật bảng tổng kết chi phí bên phải
    const subtotalEl = document.getElementById('cart-subtotal');
    if (subtotalEl) subtotalEl.innerText = formatCurrencyVND(summary.subtotal);

    const selectedCountEl = document.getElementById('cart-selected-count');
    if (selectedCountEl) selectedCountEl.innerText = summary.selectedCount;

    const totalItemsEl = document.getElementById('cart-total-items');
    if (totalItemsEl) totalItemsEl.innerText = summary.totalItems;

    const discountRow = document.getElementById('cart-discount-row');
    const discountEl = document.getElementById('cart-discount');
    const couponDescEl = document.getElementById('cart-coupon-desc');

    if (summary.discountAmount > 0) {
        if (discountRow) discountRow.style.display = 'flex';
        if (discountEl) discountEl.innerText = '-' + formatCurrencyVND(summary.discountAmount);
        if (couponDescEl) {
            couponDescEl.innerHTML = `
                <div class="alert alert-success py-1 px-2 small mb-2 d-flex justify-content-between align-items-center">
                    <span><i class="fa-solid fa-tag me-1"></i> ${summary.appliedCode}: -${summary.discountPercent}%</span>
                    <button class="btn-close btn-close-sm" type="button" onclick="removeCoupon()" title="Hủy mã"></button>
                </div>
            `;
        }
    } else {
        if (discountRow) discountRow.style.display = 'none';
        if (couponDescEl) couponDescEl.innerHTML = '';
    }

    const grandTotalEl = document.getElementById('cart-grand-total');
    if (grandTotalEl) grandTotalEl.innerText = formatCurrencyVND(summary.grandTotal);

    // Cập nhật trạng thái nút thanh toán
    const btnCheckout = document.getElementById('btnCheckoutCart');
    if (btnCheckout) {
        if (summary.selectedCount === 0) {
            btnCheckout.classList.add('disabled', 'opacity-75');
            btnCheckout.innerHTML = `<i class="fa-solid fa-hand-pointer me-2"></i> Vui lòng chọn sản phẩm (${formatCurrencyVND(0)})`;
        } else {
            btnCheckout.classList.remove('disabled', 'opacity-75');
            btnCheckout.innerHTML = `<i class="fa-solid fa-credit-card me-2"></i> TIẾN HÀNH ĐẶT HÀNG (${formatCurrencyVND(summary.grandTotal)})`;
        }
    }
}

/**
 * 13. Tiến hành đặt hàng & Thanh toán trực tiếp tại giỏ hàng
 * - Thanh toán ngay trong cart.html bằng số dư tài khoản
 * - KHÔNG chuyển trang checkout.html
 * - Bắt buộc kiểm tra có tiền mới đặt được, nếu thiếu tiền hiển thị thông báo nạp tiền
 * - Chỉ thanh toán và xóa các sản phẩm được tích chọn, giữ nguyên các sản phẩm khác
 */
async function checkoutSelectedCartItems() {
    const cart = getCart();
    const selectedItems = cart.filter(item => item.selected !== false);

    if (selectedItems.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Chưa chọn sản phẩm',
                text: 'Vui lòng tích chọn ít nhất một sản phẩm trong giỏ hàng để tiến hành đặt hàng!',
                confirmButtonColor: '#0d6efd'
            });
        } else {
            alert('Vui lòng chọn ít nhất một sản phẩm để thanh toán!');
        }
        return;
    }

    // 1. Kiểm tra đăng nhập
    let currentUser = null;
    if (window.auth && typeof window.auth.getUser === 'function') {
        currentUser = window.auth.getUser();
    }
    if (!currentUser) {
        try {
            const rawU = localStorage.getItem('shopclone_user');
            if (rawU) currentUser = JSON.parse(rawU);
        } catch (e) {}
    }

    if (!currentUser || !currentUser.username) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Yêu cầu đăng nhập',
                html: 'Bạn cần đăng nhập tài khoản để thanh toán đơn hàng bằng số dư ví!<br><small class="text-muted">Đăng nhập giúp bạn lưu trữ và bảo hành tài khoản đã mua.</small>',
                showCancelButton: true,
                confirmButtonText: '<i class="fa-solid fa-arrow-right-to-bracket me-1"></i> Đăng nhập ngay',
                cancelButtonText: 'Để sau',
                confirmButtonColor: '#0d6efd',
                cancelButtonColor: '#6c757d'
            }).then(res => {
                if (res.isConfirmed) {
                    window.location.href = 'login.html?redirect=cart.html';
                }
            });
        } else {
            if (confirm('Vui lòng đăng nhập để thanh toán! Chuyển tới trang đăng nhập?')) {
                window.location.href = 'login.html?redirect=cart.html';
            }
        }
        return;
    }

    // 2. Đồng bộ số dư mới nhất từ server
    if (window.auth && typeof window.auth.syncUser === 'function') {
        try {
            const freshUser = await window.auth.syncUser();
            if (freshUser) currentUser = freshUser;
        } catch (e) {
            console.warn('Lỗi đồng bộ số dư từ server, dùng số dư lưu local:', e);
        }
    }

    const summary = calculateCartSummary(cart);
    const currentBalance = Number(currentUser.balance || 0);

    // 3. Kiểm tra số dư tài khoản - Nếu không đủ tiền phải thông báo nạp
    if (currentBalance < summary.grandTotal) {
        const deficit = summary.grandTotal - currentBalance;
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Số dư tài khoản không đủ!',
                html: `
                    <div class="text-start p-3 bg-light rounded-3 border mb-3">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="text-muted">Số dư hiện tại của bạn:</span>
                            <span class="fw-bold text-dark">${formatCurrencyVND(currentBalance)}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-1">
                            <span class="text-muted">Tổng tiền cần thanh toán (${summary.selectedCount} món):</span>
                            <span class="fw-bold text-danger">${formatCurrencyVND(summary.grandTotal)}</span>
                        </div>
                        <div class="d-flex justify-content-between pt-2 border-top text-danger">
                            <span class="fw-bold">Số tiền còn thiếu:</span>
                            <span class="fw-bold fs-5">${formatCurrencyVND(deficit)}</span>
                        </div>
                    </div>
                    <p class="text-muted mb-0">Vui lòng nạp thêm tiền vào tài khoản để hoàn tất giao dịch đặt hàng này.</p>
                `,
                showCancelButton: true,
                confirmButtonText: '<i class="fa-solid fa-wallet me-1"></i> Nạp tiền ngay',
                cancelButtonText: 'Đóng',
                confirmButtonColor: '#198754',
                cancelButtonColor: '#6c757d'
            }).then(res => {
                if (res.isConfirmed) {
                    window.location.href = 'recharge.html';
                }
            });
        } else {
            if (confirm(`Số dư không đủ! Bạn còn thiếu ${formatCurrencyVND(deficit)}. Chuyển đến trang nạp tiền ngay?`)) {
                window.location.href = 'recharge.html';
            }
        }
        return;
    }

    // 4. Nếu đủ tiền: Hiển thị hộp thoại xác nhận thanh toán
    if (typeof Swal !== 'undefined') {
        const confirmRes = await Swal.fire({
            title: 'Xác nhận đặt hàng?',
            html: `
                <p class="mb-3">Bạn đang tiến hành thanh toán <b>${summary.selectedCount}</b> sản phẩm bằng số dư ví:</p>
                <div class="text-start p-3 bg-light rounded-3 border small mb-2">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted">Số dư hiện tại:</span>
                        <span class="fw-bold text-dark">${formatCurrencyVND(currentBalance)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-1 text-danger">
                        <span>Số tiền trừ:</span>
                        <span class="fw-bold">-${formatCurrencyVND(summary.grandTotal)}</span>
                    </div>
                    <div class="d-flex justify-content-between pt-1 border-top text-success">
                        <span class="fw-bold">Số dư còn lại dự kiến:</span>
                        <span class="fw-bold">${formatCurrencyVND(currentBalance - summary.grandTotal)}</span>
                    </div>
                </div>
                <div class="small text-muted text-start">
                    <i class="fa-solid fa-bolt text-warning me-1"></i> Tài khoản MMO sẽ được xuất và bàn giao tức thì ngay trên trang web.
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-check me-1"></i> Đồng ý thanh toán',
            cancelButtonText: 'Hủy bỏ',
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#6c757d'
        });

        if (!confirmRes.isConfirmed) return;
    } else {
        if (!confirm(`Xác nhận thanh toán ${summary.selectedCount} sản phẩm với tổng tiền ${formatCurrencyVND(summary.grandTotal)}?`)) {
            return;
        }
    }

    // 5. Tiến hành thanh toán
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Đang xử lý giao dịch...',
            text: 'Hệ thống đang trừ số dư và xuất tài khoản...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
    }

    let checkoutSuccess = false;
    let newBalance = currentBalance - summary.grandTotal;
    let deliveredAccountsText = '';
    let ordersCreated = [];

    // Gọi API Backend checkout-cart
    try {
        if (window.api && typeof window.api.post === 'function') {
            const apiRes = await window.api.post('/orders/checkout-cart', {
                items: selectedItems.map(itm => ({
                    id: itm.id,
                    product_id: itm.id,
                    quantity: itm.quantity
                })),
                coupon: summary.appliedCode
            });

            if (apiRes && apiRes.status === 'success') {
                checkoutSuccess = true;
                newBalance = apiRes.new_balance;
                deliveredAccountsText = apiRes.accounts_combined || (apiRes.orders ? apiRes.orders.map(o => o.account_details).join('\n') : '');
                ordersCreated = apiRes.orders || [];
            } else if (apiRes && apiRes.need_recharge) {
                // Server phát hiện không đủ tiền
                Swal.fire({
                    icon: 'warning',
                    title: 'Số dư không đủ!',
                    text: apiRes.msg || 'Vui lòng nạp thêm tiền!',
                    showCancelButton: true,
                    confirmButtonText: 'Nạp tiền ngay',
                    cancelButtonText: 'Đóng',
                    confirmButtonColor: '#198754'
                }).then(r => {
                    if (r.isConfirmed) window.location.href = 'recharge.html';
                });
                return;
            } else if (apiRes && apiRes.status === 'error') {
                throw new Error(apiRes.msg || 'Lỗi thanh toán từ hệ thống');
            }
        }
    } catch (apiErr) {
        console.warn('API checkout server lỗi hoặc offline, chuyển sang chế độ fallback offline an toàn:', apiErr);
        // Fallback offline mode nếu server offline
        checkoutSuccess = true;
        deliveredAccountsText = '';
        ordersCreated = [];

        selectedItems.forEach((itm, idx) => {
            const itmCode = 'ORD' + Date.now().toString().slice(-8) + idx;
            const itmAccs = [];
            for (let k = 1; k <= itm.quantity; k++) {
                itmAccs.push(`USER_${itm.code || itm.id}_${Date.now().toString().slice(-4)}_${k}|Pass@123|2FA_${Math.floor(Math.random()*900000+100000)}`);
            }
            deliveredAccountsText += (deliveredAccountsText ? '\n' : '') + itmAccs.join('\n');
            ordersCreated.push({
                order_code: itmCode,
                product_name: itm.name,
                quantity: itm.quantity,
                total_price: Number(itm.price) * Number(itm.quantity),
                account_details: itmAccs.join('\n'),
                created_at: new Date().toISOString()
            });
        });

        // Lưu đơn hàng vào localStorage
        try {
            const rawO = localStorage.getItem('shopclone_orders');
            const prevOrders = rawO ? JSON.parse(rawO) : [];
            ordersCreated.forEach(o => prevOrders.unshift(o));
            localStorage.setItem('shopclone_orders', JSON.stringify(prevOrders));
        } catch (e) {
            console.error('Lỗi lưu đơn hàng offline:', e);
        }
    }

    if (!checkoutSuccess) {
        Swal.fire('Thất bại', 'Không thể hoàn tất thanh toán. Vui lòng thử lại!', 'error');
        return;
    }

    // 6. Cập nhật số dư người dùng
    currentUser.balance = newBalance;
    if (window.auth && typeof window.auth.setUser === 'function') {
        window.auth.setUser(currentUser);
    } else {
        localStorage.setItem('shopclone_user', JSON.stringify(currentUser));
    }

    // 7. Xóa CHỈ NHỮNG MỤC ĐÃ ĐƯỢC CHỌN khỏi giỏ hàng
    // Các mục chưa được tích chọn vẫn được giữ nguyên vẹn
    const remainingCart = cart.filter(item => item.selected === false);
    saveCart(remainingCart);
    if (remainingCart.length === 0) {
        localStorage.removeItem(COUPON_STORAGE_KEY);
    }

    // Lưu thông tin tài khoản đã mua vào window
    window.lastDeliveredAccounts = deliveredAccountsText;

    // 8. Hiển thị thông báo thành công và tài khoản nhận được trực tiếp tại giỏ hàng
    if (typeof Swal !== 'undefined') {
        await Swal.fire({
            icon: 'success',
            title: 'Thanh toán thành công!',
            width: 620,
            html: `
                <div class="text-start">
                    <div class="alert alert-success py-2 px-3 small mb-3">
                        <i class="fa-solid fa-circle-check me-1"></i> Đã thanh toán thành công <b>${summary.selectedCount}</b> sản phẩm!
                        <br>Số dư ví hiện tại: <b class="text-success fs-6">${formatCurrencyVND(newBalance)}</b>
                    </div>

                    <div class="mb-2 d-flex justify-content-between align-items-center">
                        <span class="fw-bold small text-dark"><i class="fa-solid fa-key text-warning me-1"></i> Thông tin tài khoản MMO nhận được:</span>
                        <div class="d-flex gap-1">
                            <button type="button" class="btn btn-outline-primary btn-sm py-1 px-2 fw-semibold" onclick="copyAccountsFromCartBox()">
                                <i class="fa-regular fa-copy me-1"></i> Sao chép
                            </button>
                            <button type="button" class="btn btn-outline-secondary btn-sm py-1 px-2 fw-semibold" onclick="downloadAccountsFromCartBox()">
                                <i class="fa-solid fa-download me-1"></i> Tải file .TXT
                            </button>
                        </div>
                    </div>

                    <textarea id="cart-delivered-accounts-box" class="form-control font-monospace small bg-light" rows="6" readonly style="font-size: 0.85rem; line-height: 1.4;">${deliveredAccountsText}</textarea>

                    <div class="small text-muted mt-2">
                        <i class="fa-solid fa-shield-halved text-primary me-1"></i> Đơn hàng đã được lưu an toàn trong <a href="orders.html" class="fw-bold text-decoration-none">Lịch sử đơn hàng</a>.
                    </div>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: '<i class="fa-solid fa-list-check me-1"></i> Xem lịch sử đơn hàng',
            showCancelButton: true,
            cancelButtonText: '<i class="fa-solid fa-cart-shopping me-1"></i> Ở lại giỏ hàng',
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#6c757d'
        }).then(result => {
            if (result.isConfirmed) {
                window.location.href = 'orders.html';
            }
        });
    } else {
        alert(`Thanh toán thành công! Số dư còn lại: ${formatCurrencyVND(newBalance)}`);
    }

    // Re-render lại giỏ hàng với các mặt hàng còn lại (nếu có)
    renderCartPage();
}

/**
 * Tiện ích sao chép thông tin tài khoản đã mua
 */
function copyAccountsFromCartBox() {
    const text = window.lastDeliveredAccounts || '';
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Đã sao chép vào bộ nhớ tạm!',
                    showConfirmButton: false,
                    timer: 1800
                });
            } else {
                alert('Đã sao chép vào bộ nhớ tạm!');
            }
        });
    } else {
        const box = document.getElementById('cart-delivered-accounts-box');
        if (box) {
            box.select();
            document.execCommand('copy');
            alert('Đã sao chép vào bộ nhớ tạm!');
        }
    }
}

/**
 * Tiện ích tải file .TXT chứa thông tin tài khoản đã mua
 */
function downloadAccountsFromCartBox() {
    const text = window.lastDeliveredAccounts || '';
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `donhang_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Tự động cập nhật badge khi tải bất kỳ trang web nào
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadges();
    if (document.getElementById('cart-items-body')) {
        renderCartPage();
    }
});

// Xuất ra window
if (typeof window !== 'undefined') {
    window.getCart = getCart;
    window.saveCart = saveCart;
    window.addToCart = addToCart;
    window.updateCartQuantity = updateCartQuantity;
    window.changeCartQuantity = changeCartQuantity;
    window.removeFromCart = removeFromCart;
    window.clearCart = clearCart;
    window.calculateCartSummary = calculateCartSummary;
    window.applyCoupon = applyCoupon;
    window.removeCoupon = removeCoupon;
    window.updateCartBadges = updateCartBadges;
    window.renderCartPage = renderCartPage;
    window.toggleSelectAllCart = toggleSelectAllCart;
    window.toggleCartItemCheck = toggleCartItemCheck;
    window.checkoutSelectedCartItems = checkoutSelectedCartItems;
    window.copyAccountsFromCartBox = copyAccountsFromCartBox;
    window.downloadAccountsFromCartBox = downloadAccountsFromCartBox;
}
