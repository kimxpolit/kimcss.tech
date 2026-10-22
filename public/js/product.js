/**
 * ShopClone 7 - Product Detail Page Controller (public/product.html)
 */

let currentProduct = null;
let currentQty = 1;
let currentCoupon = '';

function formatVND(val) {
    return Number(val || 0).toLocaleString('vi-VN') + ' ₫';
}

async function initProductPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id') || 1;

    try {
        const res = await window.api.get(`/products/${id}`);
        if (res && res.status === 'success' && res.data) {
            currentProduct = res.data;
            renderProductDetail(res.data);
            calculatePrice();
            return;
        }
    } catch (e) {
        console.warn('Không gọi được API chi tiết sản phẩm, chuyển sang dữ liệu mock:', e);
    }

    // Fallback: Lấy dữ liệu từ MOCK_PRODUCTS (Array.find - Yêu cầu môn WEB1044)
    if (typeof window.MOCK_PRODUCTS !== 'undefined') {
        const found = window.MOCK_PRODUCTS.find(p => String(p.id) === String(id));
        if (found) {
            const unitPrice = Number(found.price);
            const discountPct = Number(found.discount || 0);
            const salePrice = discountPct > 0 ? Math.round(unitPrice * (1 - discountPct / 100)) : unitPrice;
            currentProduct = {
                ...found,
                price_formatted: formatVND(unitPrice),
                sale_price_formatted: formatVND(salePrice)
            };
            renderProductDetail(currentProduct);
            calculatePrice();
            return;
        }
    }

    document.getElementById('product-detail-area').innerHTML = `
        <div class="col-12 text-center py-5">
            <i class="fa-solid fa-triangle-exclamation text-warning fs-1 mb-3"></i>
            <h4>Sản phẩm không tồn tại hoặc đã ngừng kinh doanh</h4>
            <a href="index.html" class="btn btn-primary mt-3"><i class="fa-solid fa-arrow-left me-2"></i> Quay lại trang chủ</a>
        </div>
    `;
}

function renderProductDetail(p) {
    document.title = `${p.name} - ShopClone 7`;

    const nameEl = document.getElementById('product-name');
    if (nameEl) nameEl.innerText = p.name;

    const imgEl = document.getElementById('product-main-img');
    if (imgEl) imgEl.src = p.preview_image || 'mod/img/icon-facebook.png';

    const stockEl = document.getElementById('product-stock');
    if (stockEl) stockEl.innerText = p.stock || 0;

    const soldEl = document.getElementById('product-sold');
    if (soldEl) soldEl.innerText = p.sold || 0;

    const descEl = document.getElementById('product-desc');
    if (descEl) descEl.innerHTML = (p.description || '').replace(/\n/g, '<br>');

    const priceEl = document.getElementById('product-price');
    if (priceEl) {
        if (p.discount > 0) {
            priceEl.innerHTML = `<del class="text-muted me-2">${p.price_formatted}</del><span class="text-danger fw-bold fs-4">${p.sale_price_formatted}</span>`;
        } else {
            priceEl.innerHTML = `<span class="text-danger fw-bold fs-4">${p.price_formatted}</span>`;
        }
    }

    const maxInput = document.getElementById('amount');
    if (maxInput && p.stock > 0) {
        maxInput.max = p.stock;
    }
}

async function calculatePrice() {
    if (!currentProduct) return;

    const amountInput = document.getElementById('amount');
    const couponInput = document.getElementById('coupon');
    currentQty = amountInput ? Math.max(1, parseInt(amountInput.value) || 1) : 1;
    currentCoupon = couponInput ? couponInput.value.trim() : '';

    try {
        const res = await window.api.post('/products/calculate-price', {
            product_id: currentProduct.id,
            amount: currentQty,
            coupon: currentCoupon
        });

        if (res && res.status === 'success' && res.data) {
            const d = res.data;
            const intoMoney = document.getElementById('into_money');
            if (intoMoney) intoMoney.innerText = d.gross_money_formatted;

            const discountRow = document.getElementById('into_discount_row');
            const intoDiscount = document.getElementById('into_discount');
            if (d.discount_amount > 0) {
                if (discountRow) discountRow.style.display = 'table-row';
                if (intoDiscount) intoDiscount.innerText = `-${d.discount_formatted}`;
            } else if (discountRow) {
                discountRow.style.display = 'none';
            }

            const intoPay = document.getElementById('into_pay');
            if (intoPay) intoPay.innerText = d.total_pay_formatted;
        }
    } catch (e) {
        console.error('Calculation error:', e);
    }
}
window.calculatePrice = calculatePrice;

window.changeQty = function(delta) {
    const input = document.getElementById('amount');
    if (!input || !currentProduct) return;
    const max = currentProduct.stock || 1;
    let val = parseInt(input.value) || 1;
    val = Math.max(1, Math.min(max, val + delta));
    input.value = val;
    calculatePrice();
};

window.buyProduct = async function() {
    if (!window.auth.isLoggedIn()) {
        window.api.alertError('Vui lòng đăng nhập để thực hiện mua hàng!');
        setTimeout(() => {
            const redirectPath = window.location.pathname.split('/').pop() + window.location.search;
            window.location.href = 'login.html?redirect=' + encodeURIComponent(redirectPath);
        }, 1200);
        return;
    }

    if (!currentProduct) return;

    if (currentProduct.stock <= 0) {
        window.api.alertError('Sản phẩm này tạm thời đã hết hàng trong kho!');
        return;
    }

    const btnBuy = document.getElementById('btnBuy');
    if (btnBuy) {
        btnBuy.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i> Đang thanh toán...';
        btnBuy.disabled = true;
    }

    try {
        const res = await window.api.post('/orders/buy', {
            product_id: currentProduct.id,
            quantity: currentQty,
            coupon: currentCoupon
        });

        if (res && res.status === 'success') {
            await window.auth.syncUser();

            Swal.fire({
                icon: 'success',
                title: 'Mua hàng thành công!',
                html: `
                    <div class="text-start">
                        <p class="mb-1">Mã đơn hàng: <strong class="text-primary">#${res.order_code}</strong></p>
                        <p class="mb-1">Sản phẩm: <strong>${res.product_name}</strong></p>
                        <p class="mb-2">Số lượng: <strong>${res.quantity}</strong> | Tổng thanh toán: <strong class="text-danger">${res.total_price_formatted}</strong></p>
                        
                        <label class="form-label fw-bold small text-muted">Dữ liệu tài khoản của bạn:</label>
                        <textarea id="purchased-accounts-box" class="form-control form-control-sm font-monospace mb-2" rows="6" readonly>${res.data}</textarea>
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-secondary w-50" onclick="copyAccountsFromBox()">
                                <i class="fa-solid fa-copy me-1"></i> Sao chép toàn bộ
                            </button>
                            <button class="btn btn-sm btn-outline-primary w-50" onclick="downloadAccountsTxt('${res.order_code}')">
                                <i class="fa-solid fa-download me-1"></i> Tải file .TXT
                            </button>
                        </div>
                    </div>
                `,
                confirmButtonText: 'Xem lịch sử đơn hàng',
                confirmButtonColor: '#0d6efd'
            }).then(() => {
                window.location.href = 'orders.html';
            });
        } else {
            if (res && res.need_recharge) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Số dư không đủ!',
                    text: res.msg,
                    showCancelButton: true,
                    confirmButtonText: '<i class="fa-solid fa-wallet me-1"></i> Nạp tiền ngay',
                    cancelButtonText: 'Đóng',
                    confirmButtonColor: '#0d6efd'
                }).then(result => {
                    if (result.isConfirmed) {
                        window.location.href = 'recharge.html';
                    }
                });
            } else {
                window.api.alertError(res ? res.msg : 'Giao dịch không thành công!');
            }
        }
    } catch (e) {
        console.error('Purchase Error:', e);
        window.api.alertError('Lỗi xử lý đơn hàng!');
    } finally {
        if (btnBuy) {
            btnBuy.innerHTML = '<i class="fa-solid fa-cart-shopping me-2"></i> THANH TOÁN NGAY';
            btnBuy.disabled = false;
        }
    }
};

window.copyAccountsFromBox = function() {
    const box = document.getElementById('purchased-accounts-box');
    if (box) {
        box.select();
        navigator.clipboard.writeText(box.value).then(() => {
            window.api.showToast('Đã sao chép tài khoản!', 'success');
        });
    }
};

window.downloadAccountsTxt = function(orderCode) {
    const box = document.getElementById('purchased-accounts-box');
    if (!box) return;
    const blob = new Blob([box.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DonHang_${orderCode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.handleAddToCartFromDetail = function() {
    if (!currentProduct) {
        if (typeof Swal !== 'undefined') Swal.fire('Lỗi', 'Không xác định được sản phẩm!', 'error');
        return;
    }
    const amountInput = document.getElementById('amount');
    const qty = amountInput ? Math.max(1, parseInt(amountInput.value) || 1) : 1;
    
    if (typeof window.addToCart === 'function') {
        window.addToCart(currentProduct.id, qty, true);
    } else {
        alert(`Đã thêm ${qty} sản phẩm vào giỏ hàng!`);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initProductPage();
});
