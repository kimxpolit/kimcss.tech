/**
 * Client Controller - Home Page (index.html / client/home.html)
 * 100% Client-Side Pure JS Rendering with zero PHP code leak risk.
 */

let currentCategoryId = '';
let currentCategorySlug = '';
let currentKeyword = '';

function getSkeletonLoadingHTML() {
    return `
        <div class="skeleton-container">
            ${Array(4).fill(0).map(() => `
                <div class="skeleton-card mb-3 p-3 border rounded">
                    <div class="skeleton-content">
                        <div class="skeleton-title mb-2" style="height: 20px; background: #e0e0e0; border-radius: 4px; width: 70%;"></div>
                        <div class="skeleton-text mb-2" style="height: 14px; background: #eee; border-radius: 4px; width: 90%;"></div>
                        <div class="skeleton-info d-flex gap-2">
                            <div class="skeleton-stock" style="height: 16px; background: #e8e8e8; border-radius: 4px; width: 80px;"></div>
                            <div class="skeleton-sales" style="height: 16px; background: #e8e8e8; border-radius: 4px; width: 80px;"></div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="text-center py-3 text-muted">
            <i class="fa fa-spinner fa-spin me-2 text-primary"></i> Đang tải dữ liệu sản phẩm...
        </div>
    `;
}

// Load Categories
async function loadCategories() {
    try {
        const res = await window.api.get('api/data.php', { action: 'get_categories' });
        const categories = (res && res.data && res.data.all) ? res.data.all : (window.MockDB ? window.MockDB.getCategories().all : []);

        // 1. Render Home Category Filter Buttons
        const btnContainer = document.getElementById('home-categories-container') || document.getElementById('category-tabs');
        if (btnContainer) {
            btnContainer.innerHTML = `
                <li>
                    <a class="btn-category-home ${!currentCategoryId ? 'active' : ''}" 
                       href="javascript:void(0);" 
                       onclick="loadProductsByCategory('', '')">
                       <i class="fa-solid fa-cart-shopping me-2"></i>Tất cả sản phẩm
                    </a>
                </li>
                ${categories.map(c => `
                    <li>
                        <a class="btn-category-home ${currentCategoryId == c.id ? 'active' : ''}" 
                           href="javascript:void(0);" 
                           onclick="loadProductsByCategory('${c.id}', '${c.slug}')">
                           <img src="${c.icon}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/5968/5968764.png'" width="18" height="18" class="me-2 rounded">
                           ${c.name}
                        </a>
                    </li>
                `).join('')}
            `;
        }

        // 2. Render Megamenu in Navbar
        const menuContainer = document.getElementById('menu-categories-container');
        if (menuContainer) {
            menuContainer.innerHTML = `
                <div class="row p-3">
                    ${categories.map(c => `
                        <div class="col-md-4 mb-2">
                            <a href="javascript:void(0);" onclick="loadProductsByCategory('${c.id}', '${c.slug}')" class="d-flex align-items-center text-dark text-decoration-none p-2 rounded hover-bg">
                                <img src="${c.icon}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/5968/5968764.png'" width="22" height="22" class="me-2 rounded">
                                <span class="fw-semibold fs-14">${c.name}</span>
                            </a>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (e) {
        console.error('Failed to load categories:', e);
    }
}

// Load Products
async function loadProducts() {
    const container = document.getElementById('products-container') || document.getElementById('product-list');
    if (!container) return;

    try {
        const res = await window.api.get('api/data.php', {
            action: 'get_products',
            category_id: currentCategoryId,
            keyword: currentKeyword
        });

        const products = (res && res.data) ? res.data : (window.MockDB ? window.MockDB.getProducts(currentCategoryId, currentKeyword) : []);
        renderProductSections(products, container);
    } catch (e) {
        console.error('Error loading products:', e);
        const products = window.MockDB ? window.MockDB.getProducts(currentCategoryId, currentKeyword) : [];
        renderProductSections(products, container);
    }
}

// Render Products grouped by category
function renderProductSections(products, container) {
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fa-solid fa-box-open fs-1 text-muted mb-3"></i>
                <h5 class="text-muted">Không tìm thấy sản phẩm nào</h5>
                <p class="text-muted small">Vui lòng thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác.</p>
            </div>
        `;
        return;
    }

    const categories = (window.MockDB ? window.MockDB.getCategories().all : []);
    const catMap = {};
    categories.forEach(c => catMap[c.id] = c);

    // Group products by category_id
    const grouped = {};
    products.forEach(p => {
        const cId = p.category_id || 0;
        if (!grouped[cId]) grouped[cId] = [];
        grouped[cId].push(p);
    });

    const isClientFolder = window.location.pathname.includes('/client/');
    const productDetailPrefix = isClientFolder ? 'product.html' : 'client/product.html';

    let html = '';

    for (const [cId, prods] of Object.entries(grouped)) {
        const cat = catMap[cId] || { name: prods[0].category_name || 'Dịch Vụ Khác', icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968764.png' };

        html += `
            <div class="col-lg-12 mb-4 category-section" id="category${cId}">
                <div class="home-heading mb-3 d-flex align-items-center">
                    <h4 class="fw-bold mb-0">
                        <img src="${cat.icon}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/5968/5968764.png'" width="26" height="26" class="me-2 rounded">
                        ${cat.name}
                    </h4>
                </div>
                <div class="row row-cols-1 row-cols-md-2 row-cols-lg-2 g-3">
                    ${prods.map(p => `
                        <div class="col">
                            <div class="feature-card h-100 ${p.stock <= 0 ? 'product-disable' : ''} border rounded p-3 bg-white shadow-sm position-relative">
                                ${p.discount > 0 ? `<span class="badge bg-danger position-absolute top-0 end-0 m-2">-${p.discount}%</span>` : ''}
                                <div class="feature-content d-flex flex-column h-100">
                                    <h6 class="feature-name mb-2">
                                        <a href="${productDetailPrefix}?slug=${p.slug}" class="text-dark fw-bold text-decoration-none">
                                            ${p.name}
                                        </a>
                                    </h6>
                                    <div class="row my-2 g-2">
                                        <div class="col-auto">
                                            <span class="badge bg-success-subtle text-success border border-success-subtle">
                                                <i class="fa-solid fa-boxes-stacked me-1"></i> Kho: <strong>${p.stock}</strong>
                                            </span>
                                        </div>
                                        <div class="col-auto">
                                            <span class="badge bg-info-subtle text-info border border-info-subtle">
                                                <i class="fa-solid fa-bag-shopping me-1"></i> Đã bán: <strong>${p.sold || 0}</strong>
                                            </span>
                                        </div>
                                    </div>
                                    <h6 class="feature-price my-2">
                                        ${p.discount > 0 ? `<del class="text-muted me-2 small">${p.price_formatted || (p.price + 'đ')}</del>` : ''}
                                        <span class="text-danger fw-bold fs-5">${p.sale_price_formatted || p.price_formatted || (p.price + 'đ')}</span>
                                    </h6>
                                    <p class="feature-desc text-muted small mb-3 flex-grow-1">
                                        <i class="fa-solid fa-angles-right text-primary me-1"></i> ${p.short_desc || 'Bảo hành đầy đủ, giao dịch tự động 24/7.'}
                                    </p>
                                    <div class="row g-2 mt-auto">
                                        <div class="col-6">
                                            <a href="${productDetailPrefix}?slug=${p.slug}" class="btn btn-outline-primary btn-sm w-100">
                                                <i class="fa-solid fa-circle-info me-1"></i> CHI TIẾT
                                            </a>
                                        </div>
                                        <div class="col-6">
                                            <button onclick="openModal('', ${p.id})" class="btn btn-primary btn-sm w-100 ${p.stock <= 0 ? 'disabled' : ''}">
                                                <i class="fa-solid fa-cart-shopping me-1"></i> MUA NGAY
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function loadProductsByCategory(categoryId, categorySlug) {
    currentCategoryId = categoryId;
    currentCategorySlug = categorySlug || '';
    currentKeyword = '';

    document.querySelectorAll('.btn-category-home').forEach(el => el.classList.remove('active'));
    if (window.event && window.event.target) {
        const btn = window.event.target.closest('a');
        if (btn) btn.classList.add('active');
    }

    const container = document.getElementById('products-container') || document.getElementById('product-list');
    if (container) {
        container.innerHTML = getSkeletonLoadingHTML();
    }

    loadProducts();
}
window.loadProductsByCategory = loadProductsByCategory;

// Modal Purchase Interactive Dialog
window.openModal = function(token, productId) {
    const p = window.MockDB ? window.MockDB.getProductById(productId) : null;
    if (!p) {
        window.api.alertError('Không tìm thấy thông tin sản phẩm');
        return;
    }

    const modalContent = document.getElementById('modalContent');
    const modalEl = document.getElementById('openModal');
    if (!modalContent || !modalEl) return;

    let qty = 1;
    let coupon = '';
    const unitPrice = p.sale_price || p.price;

    function renderModalBody() {
        let discountMultiplier = (coupon.toUpperCase() === 'GIAM10') ? 0.9 : 1.0;
        let totalPay = Math.round(unitPrice * qty * discountMultiplier);

        modalContent.innerHTML = `
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold" id="openModalLabel">
                    <i class="fa-solid fa-cart-shopping me-2"></i> Mua tài khoản: ${p.name}
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
                <div class="alert alert-light border mb-3">
                    <div class="row align-items-center">
                        <div class="col-8">
                            <span class="text-muted d-block small">Đơn giá sản phẩm:</span>
                            <span class="fs-5 fw-bold text-danger">${window.formatCurrency(unitPrice)}</span>
                            ${p.discount > 0 ? `<del class="text-muted small ms-2">${p.price_formatted}</del>` : ''}
                        </div>
                        <div class="col-4 text-end">
                            <span class="badge bg-success-subtle text-success p-2">
                                <i class="fa-solid fa-boxes-stacked me-1"></i> Còn: <strong>${p.stock}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">Số lượng muốn mua:</label>
                    <div class="input-group" style="max-width: 200px;">
                        <button class="btn btn-outline-secondary" type="button" id="btn-qty-minus"><i class="fa-solid fa-minus"></i></button>
                        <input type="number" class="form-control text-center fw-bold" id="input-modal-qty" value="${qty}" min="1" max="${p.stock}">
                        <button class="btn btn-outline-secondary" type="button" id="btn-qty-plus"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">Mã giảm giá (Coupon):</label>
                    <div class="input-group">
                        <input type="text" class="form-control text-uppercase" id="input-modal-coupon" placeholder="Nhập mã coupon (nếu có, thử: GIAM10)" value="${coupon}">
                        <button class="btn btn-outline-primary" type="button" id="btn-apply-coupon">Áp dụng</button>
                    </div>
                    ${coupon.toUpperCase() === 'GIAM10' ? '<small class="text-success mt-1 d-block"><i class="fa-solid fa-check me-1"></i> Đã áp dụng giảm giá 10%!</small>' : ''}
                </div>

                <div class="card bg-light border-0 p-3 mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold">Tổng thanh toán:</span>
                        <h4 class="text-danger fw-bold mb-0" id="modal-total-pay">${window.formatCurrency(totalPay)}</h4>
                    </div>
                </div>

                <div class="p-2 bg-warning-subtle text-warning-emphasis rounded small mb-0">
                    <i class="fa-solid fa-shield-halved me-1"></i> Tài khoản sẽ được giao ngay lập tức sau khi bạn xác nhận thanh toán.
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy bỏ</button>
                <button type="button" class="btn btn-primary px-4 fw-bold" id="btn-confirm-purchase">
                    <i class="fa-solid fa-check me-1"></i> XÁC NHẬN MUA
                </button>
            </div>
        `;

        // Wire event listeners
        document.getElementById('btn-qty-minus').onclick = () => {
            if (qty > 1) {
                qty--;
                renderModalBody();
            }
        };

        document.getElementById('btn-qty-plus').onclick = () => {
            if (qty < p.stock) {
                qty++;
                renderModalBody();
            }
        };

        document.getElementById('input-modal-qty').onchange = (e) => {
            let val = parseInt(e.target.value) || 1;
            qty = Math.min(Math.max(1, val), p.stock);
            renderModalBody();
        };

        document.getElementById('btn-apply-coupon').onclick = () => {
            const val = document.getElementById('input-modal-coupon').value.trim();
            coupon = val;
            renderModalBody();
        };

        document.getElementById('btn-confirm-purchase').onclick = async () => {
            const btn = document.getElementById('btn-confirm-purchase');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Đang xử lý...';

            const buyRes = window.MockDB.buyProduct(p.id, qty, coupon);

            if (buyRes.status === 'success') {
                const bsModal = bootstrap.Modal.getInstance(modalEl);
                if (bsModal) bsModal.hide();

                Swal.fire({
                    icon: 'success',
                    title: 'Mua hàng thành công!',
                    html: `
                        <p class="mb-2">Bạn đã mua thành công <strong>${qty}</strong> tài khoản.</p>
                        <div class="text-start mb-3">
                            <label class="form-label fw-bold">Thông tin tài khoản nhận được:</label>
                            <textarea class="form-control font-monospace" rows="6" readonly id="swal-accounts-area">${buyRes.data}</textarea>
                        </div>
                        <div class="d-flex gap-2 justify-content-center">
                            <button class="btn btn-sm btn-outline-primary" onclick="navigator.clipboard.writeText(document.getElementById('swal-accounts-area').value); window.api.showToast('Đã sao chép vào bộ nhớ tạm!');">
                                <i class="fa-solid fa-copy me-1"></i> Sao chép tất cả
                            </button>
                        </div>
                    `,
                    confirmButtonText: 'Đóng',
                    confirmButtonColor: '#0d6efd'
                });

                renderWalletWidget();
                loadProducts();
                loadRecentActivity();
            } else {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-check me-1"></i> XÁC NHẬN MUA';

                if (buyRes.need_recharge) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Số dư không đủ',
                        text: buyRes.msg,
                        showCancelButton: true,
                        confirmButtonText: 'Nạp tiền ngay',
                        cancelButtonText: 'Đóng',
                        confirmButtonColor: '#198754'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            const isClientFolder = window.location.pathname.includes('/client/');
                            window.location.href = isClientFolder ? 'recharge-bank.html' : 'client/recharge-bank.html';
                        }
                    });
                } else {
                    window.api.alertError(buyRes.msg);
                }
            }
        };
    }

    renderModalBody();
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
};

// Wallet Sidebar Widget
function renderWalletWidget() {
    const walletContainer = document.getElementById('home-wallet-widget');
    if (!walletContainer) return;

    const user = window.MockDB ? window.MockDB.getCurrentUser() : null;
    const isClient = window.location.pathname.includes('/client/');
    const rechargePath = isClient ? 'recharge-bank.html' : 'client/recharge-bank.html';
    const ordersPath = isClient ? 'product-orders.html' : 'client/product-orders.html';

    if (user) {
        walletContainer.innerHTML = `
            <div class="account-card card-wallet-home p-3 border rounded shadow-sm bg-white mb-4">
                <div class="my-wallet text-center mb-3">
                    <p class="text-muted small mb-1">Số dư khả dụng</p>
                    <h3 class="text-primary fw-bold mb-0">${user.money_formatted || window.formatCurrency(user.money)}</h3>
                </div>
                <div class="wallet-card-group mb-3">
                    <div class="p-2 bg-light rounded mb-2 d-flex justify-content-between">
                        <small class="text-muted">Tổng nạp tích lũy:</small>
                        <strong class="text-success small">${user.total_money_formatted || window.formatCurrency(user.total_money)}</strong>
                    </div>
                    <div class="p-2 bg-light rounded mb-2 d-flex justify-content-between">
                        <small class="text-muted">Đã thanh toán:</small>
                        <strong class="text-danger small">${user.used_money_formatted || window.formatCurrency((user.total_money || 0) - (user.money || 0))}</strong>
                    </div>
                    <div class="p-2 bg-light rounded d-flex justify-content-between">
                        <small class="text-muted">Chiết khấu riêng:</small>
                        <span class="badge bg-danger">${user.discount || 0}%</span>
                    </div>
                </div>
                <div class="d-grid gap-2">
                    <a href="${rechargePath}" class="btn btn-success btn-sm">
                        <i class="fa-solid fa-wallet me-1"></i> Nạp tiền vào ví
                    </a>
                    <a href="${ordersPath}" class="btn btn-outline-primary btn-sm">
                        <i class="fa-solid fa-bag-shopping me-1"></i> Lịch sử đơn hàng
                    </a>
                </div>
            </div>
        `;
    }
}

// Recent Activity Widget
async function loadRecentActivity() {
    const ordersContainer = document.getElementById('recent-orders-container');
    const depositsContainer = document.getElementById('recent-deposits-container');
    const genericRecent = document.getElementById('recent-transactions');

    const activities = window.MockDB ? window.MockDB.getRecentActivities() : { orders: [], deposits: [] };

    if (ordersContainer && activities.orders) {
        ordersContainer.innerHTML = activities.orders.map(o => `
            <div class="feature-card mb-2 p-2 border-bottom d-flex justify-content-between align-items-center">
                <div>
                    <i class="fa-solid fa-user-check text-primary me-1"></i> <strong>${o.username_masked}</strong> mua <strong>${o.amount}</strong> <em>${o.product_name}</em>
                    <div class="text-danger fw-bold small">${o.pay_formatted}</div>
                </div>
                <span class="badge bg-primary">${o.time_ago}</span>
            </div>
        `).join('');
    }

    if (depositsContainer && activities.deposits) {
        depositsContainer.innerHTML = activities.deposits.map(d => `
            <div class="feature-card mb-2 p-2 border-bottom d-flex justify-content-between align-items-center">
                <div>
                    <i class="fa-solid fa-credit-card text-success me-1"></i> <strong>${d.username_masked}</strong> nạp qua <strong>${d.method}</strong>
                    <div class="text-success fw-bold small">+${d.received_formatted}</div>
                </div>
                <span class="badge bg-success">${d.time_ago}</span>
            </div>
        `).join('');
    }

    if (genericRecent && activities.orders) {
        genericRecent.innerHTML = activities.orders.map(o => `
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span><strong>${o.username_masked}</strong> mua <strong>${o.amount}</strong> ${o.product_name}</span>
                <span class="badge bg-success">${o.pay_formatted}</span>
            </div>
        `).join('');
    }
}

// Search handler
function setupSearch() {
    const searchForm = document.querySelector('.header-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = searchForm.querySelector('input[name="keyword"]');
            if (input) {
                currentKeyword = input.value.trim();
                currentCategoryId = '';
                loadProducts();
            }
        });
    }
}

// Init Home Controller
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadProducts();
    renderWalletWidget();
    loadRecentActivity();
    setupSearch();
});
