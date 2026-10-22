/**
 * Client Controller - Product Details Page (client/product.html)
 */

let currentProduct = null;
let currentTotalPay = 0;

async function loadProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    let id = urlParams.get('id');

    if (!slug && !id) {
        id = 1; // Default to first product for preview and test
    }

    try {
        const res = await window.api.get('api/data.php', {
            action: 'get_product',
            slug: slug || '',
            id: id || ''
        });

        if (res && res.status === 'success' && res.data) {
            currentProduct = res.data;
            renderProduct(res.data);
            calculatePrice();
        } else {
            document.getElementById('product-detail-area').innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fa-solid fa-triangle-exclamation text-warning fs-1 mb-3"></i>
                    <h4>Sản phẩm không tồn tại hoặc đã ngừng kinh doanh</h4>
                    <a href="home.html" class="btn btn-primary mt-3"><i class="fa-solid fa-arrow-left me-2"></i> Quay lại trang chủ</a>
                </div>
            `;
        }
    } catch (e) {
        console.error('Error fetching product:', e);
    }
}

function renderProduct(p) {
    document.title = `${p.name} - ShopClone 7`;

    // Render image / gallery
    const galleryEl = document.getElementById('product-gallery');
    if (galleryEl) {
        let images = [];
        if (p.images) {
            images = p.images.split('\n').map(i => i.trim()).filter(Boolean);
        }
        if (images.length === 0) {
            images = ['assets/img/default-product.png'];
        }
        galleryEl.innerHTML = `
            <div class="details-gallery mb-3">
                <div class="border rounded p-2 text-center bg-white">
                    <img src="../${images[0]}" onerror="this.src='https://placehold.co/400x300?text=Product'" class="img-fluid rounded" alt="${p.name}">
                </div>
            </div>
        `;
    }

    // Details metadata
    const nameEl = document.getElementById('product-name');
    if (nameEl) nameEl.innerHTML = `<img src="../${p.category_icon || 'mod/img/icon-facebook.png'}" width="28" class="me-2" onerror="this.style.display='none'"> ${p.name}`;

    const stockEl = document.getElementById('product-stock');
    if (stockEl) stockEl.innerText = p.stock || 0;

    const soldEl = document.getElementById('product-sold');
    if (soldEl) soldEl.innerText = p.sold || 0;

    const priceEl = document.getElementById('product-price');
    if (priceEl) {
        if (p.discount > 0) {
            priceEl.innerHTML = `<del class="text-muted me-2">${p.price_formatted}</del><span class="text-danger fw-bold fs-4">${p.sale_price_formatted}</span>`;
        } else {
            priceEl.innerHTML = `<span class="text-danger fw-bold fs-4">${p.price_formatted}</span>`;
        }
    }

    const descEl = document.getElementById('product-desc');
    if (descEl) descEl.innerHTML = (p.short_desc || '').replace(/\n/g, '<br>');

    // Tier discounts
    const dealEl = document.getElementById('product-deals');
    if (dealEl && p.tier_discounts && p.tier_discounts.length > 0) {
        dealEl.innerHTML = `
            <div class="alert alert-warning border-0 p-3 mb-3">
                <h6 class="fw-bold mb-2 text-danger"><i class="fa-solid fa-fire-flame-curved me-2"></i> Khuyến mãi số lượng lớn (Hot Deal):</h6>
                <ul class="mb-0 ps-3">
                    ${p.tier_discounts.map(d => `<li>Mua từ <strong>${d.min}</strong> tài khoản: giảm ngay <strong class="text-danger">${d.discount}%</strong></li>`).join('')}
                </ul>
            </div>
        `;
        dealEl.style.display = 'block';
    }

    // Share link
    const shareInput = document.getElementById('share-url');
    if (shareInput) shareInput.value = window.location.href;
}

// Live calculation via ajaxs/client/product.php?action=total_payment
async function calculatePrice() {
    if (!currentProduct) return;

    const amountInput = document.getElementById('amount');
    const couponInput = document.getElementById('coupon');
    const amount = amountInput ? parseInt(amountInput.value) || 1 : 1;
    const coupon = couponInput ? couponInput.value.trim() : '';

    try {
        const res = await window.api.post('ajaxs/client/product.php', {
            action: 'total_payment',
            id: currentProduct.id,
            amount: amount,
            coupon: coupon
        });

        if (res && res.status === 'success') {
            currentTotalPay = res.pay;
            const intoMoneyEl = document.getElementById('into_money');
            if (intoMoneyEl) intoMoneyEl.innerText = res.money;

            const discountRow = document.getElementById('into_discount_row');
            const intoDiscountEl = document.getElementById('into_discount');
            if (res.discount_number > 0) {
                if (discountRow) discountRow.style.display = 'table-row';
                if (intoDiscountEl) intoDiscountEl.innerText = `-${res.discount}`;
            } else if (discountRow) {
                discountRow.style.display = 'none';
            }

            const vatRow = document.getElementById('into_vat_row');
            const intoVatEl = document.getElementById('into_price_vat');
            if (res.tax_vat > 0) {
                if (vatRow) vatRow.style.display = 'table-row';
                if (intoVatEl) intoVatEl.innerText = res.price_vat;
            } else if (vatRow) {
                vatRow.style.display = 'none';
            }

            const intoPayEl = document.getElementById('into_pay');
            if (intoPayEl) intoPayEl.innerText = res.pay;
        }
    } catch (e) {
        console.error('Price calculation error:', e);
    }
}
window.calculatePrice = calculatePrice;

// Execute purchase
async function buyProduct() {
    if (!window.auth.isLoggedIn()) {
        window.api.alertError('Vui lòng đăng nhập để mua hàng!');
        setTimeout(() => {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        }, 1200);
        return;
    }

    if (!currentProduct) return;

    const amountInput = document.getElementById('amount');
    const couponInput = document.getElementById('coupon');
    const amount = amountInput ? parseInt(amountInput.value) || 1 : 1;
    const coupon = couponInput ? couponInput.value.trim() : '';

    const btnBuy = document.getElementById('btnBuy');
    if (btnBuy) {
        btnBuy.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i> Đang thanh toán...';
        btnBuy.disabled = true;
    }

    try {
        const res = await window.api.post('ajaxs/client/product.php', {
            action: 'buyProduct',
            id: currentProduct.id,
            amount: amount,
            coupon: coupon
        });

        if (res && res.status === 'success') {
            // Update balance
            await window.auth.syncUser();

            Swal.fire({
                icon: 'success',
                title: 'Mua hàng thành công!',
                html: `
                    <p class="mb-2">Mã đơn hàng: <strong>#${res.trans_id}</strong></p>
                    <p class="text-success small mb-3">Tài khoản đã được chuyển vào lịch sử đơn hàng của bạn.</p>
                `,
                showCancelButton: true,
                confirmButtonText: '<i class="fa-solid fa-eye me-1"></i> Xem đơn hàng',
                cancelButtonText: 'Tiếp tục mua sắm',
                confirmButtonColor: '#0d6efd'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = `product-order.html?trans_id=${res.trans_id}`;
                } else {
                    location.reload();
                }
            });
        } else {
            window.api.alertError(res ? res.msg : 'Giao dịch không thành công');
        }
    } catch (e) {
        console.error('Purchase error:', e);
        window.api.alertError('Đã xảy ra lỗi trong quá trình xử lý');
    } finally {
        if (btnBuy) {
            btnBuy.innerHTML = '<i class="fa-solid fa-cart-shopping me-2"></i> THANH TOÁN NGAY';
            btnBuy.disabled = false;
        }
    }
}
window.buyProduct = buyProduct;

// Toggle favorite
async function toggleFavorite() {
    if (!window.auth.isLoggedIn()) {
        window.api.alertError('Vui lòng đăng nhập để lưu sản phẩm yêu thích!');
        return;
    }
    if (!currentProduct) return;

    try {
        const res = await window.api.post('ajaxs/client/update.php', {
            action: 'toggleFavorite',
            product_id: currentProduct.id
        });
        if (res && res.status === 'success') {
            window.api.showToast(res.msg || 'Đã cập nhật danh sách yêu thích');
            await window.auth.syncUser();
        }
    } catch (e) {
        console.error('Favorite toggle error:', e);
    }
}
window.toggleFavorite = toggleFavorite;

// Quantity buttons
function changeQty(delta) {
    const amountInput = document.getElementById('amount');
    if (!amountInput) return;
    let val = parseInt(amountInput.value) || 1;
    val = Math.max(1, val + delta);
    amountInput.value = val;
    calculatePrice();
}
window.changeQty = changeQty;

document.addEventListener('DOMContentLoaded', () => {
    loadProductDetail();
});
