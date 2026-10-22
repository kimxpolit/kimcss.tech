/**
 * ShopClone 7 - Home Page Controller (100% Vanilla JS & Real SQL Server Backend)
 * Exact Parity with views/client/home.php & ajaxs/client/modal/view-product.php
 */

let currentCategoryId = '';
let currentCategorySlug = '';
let currentKeyword = '';
let allCategories = [];
let currentProductInModal = null;

function formatVND(val) {
    return Number(val || 0).toLocaleString('vi-VN') + ' ₫';
}

function showToast(msg, type = 'success') {
    if (window.Swal) {
        Swal.fire({
            title: type === 'success' ? 'Thành công!' : 'Thông báo',
            text: msg,
            icon: type,
            timer: 2500,
            showConfirmButton: false
        });
    } else {
        alert(msg);
    }
}

// 1. Initialize Home Page
async function initHomePage() {
    await loadCategories();
    await loadProducts();
    renderWalletSidebar();
    loadRecentActivities();
}

// 2. Load Categories
async function loadCategories() {
    const tabsContainer = document.getElementById('category-tabs') || document.getElementById('home-categories-container');
    const menuContainer = document.getElementById('menu-categories-container');
    const topMenuRight = document.getElementById('top-menu-right');

    try {
        const res = await window.api.get('/categories');
        if (res && res.status === 'success' && res.data) {
            allCategories = res.data;

            // A. Populate Category Filter Tabs
            if (tabsContainer) {
                tabsContainer.innerHTML = `
                    <li>
                        <a class="btn-category-home ${!currentCategoryId ? 'active' : ''}" 
                           href="javascript:void(0);" 
                           onclick="loadProductsByCategory('', '')"
                           data-category-id="">
                            <i class="fa-solid fa-cart-shopping me-2"></i>Tất cả sản phẩm
                        </a>
                    </li>
                    ${allCategories.map(c => `
                        <li>
                            <a class="btn-category-home ${currentCategoryId == c.id ? 'active' : ''}" 
                               href="javascript:void(0);" 
                               onclick="loadProductsByCategory('${c.id}', '${c.slug}')"
                               data-category-id="${c.id}">
                                <img src="${c.icon || 'mod/img/icon-facebook.png'}" width="18" height="18" class="me-2" onerror="this.src='mod/img/icon-facebook.png'">
                                ${c.name}
                            </a>
                        </li>
                    `).join('')}
                `;
            }

            // B. Populate Navbar Categories Dropdown
            if (menuContainer) {
                menuContainer.innerHTML = allCategories.map(c => `
                    <div class="col-6">
                        <a href="javascript:void(0)" onclick="selectCategoryFromMenu('${c.id}', '${c.slug}')" class="category-menu-item d-flex align-items-center p-2 rounded text-decoration-none text-dark">
                            <img src="${c.icon || 'mod/img/icon-facebook.png'}" width="26" height="26" class="me-2 rounded flex-shrink-0" onerror="this.src='mod/img/icon-facebook.png'">
                            <span class="fw-semibold small text-truncate">${c.name}</span>
                        </a>
                    </div>
                `).join('');
            }

            // C. Populate Right Floating Menu
            if (topMenuRight) {
                // Keep the first 2 items (toggle, my orders) and append categories
                const staticItems = `
                    <li>
                        <a class="menu-item" id="toggle-menu-button" href="javascript:void(0);" onclick="toggleTopMenu()">
                            <i class="fa-solid fa-eye-slash"></i>
                            <span>Tạm ẩn</span>
                        </a>
                    </li>
                    <li>
                        <a class="menu-item" href="orders.html">
                            <i class="fa-solid fa-cart-shopping" style="color:red;"></i>
                            <span>Đơn hàng của tôi</span>
                        </a>
                    </li>
                `;
                const catItems = allCategories.map(c => `
                    <li>
                        <a class="menu-item ${currentCategoryId == c.id ? 'active' : ''}"
                           href="javascript:void(0);" 
                           onclick="loadProductsByCategory('${c.id}', '${c.slug}')"
                           data-category-id="${c.id}">
                            <i><img src="${c.icon || 'mod/img/icon-facebook.png'}" width="20" height="20" onerror="this.src='mod/img/icon-facebook.png'"></i>
                            <span>${c.name}</span>
                        </a>
                    </li>
                `).join('');
                topMenuRight.innerHTML = staticItems + catItems;
            }
        }
    } catch (e) {
        console.error('Error loading categories:', e);
    }
}

// 3. Switch Category from Navbar Menu
window.selectCategoryFromMenu = function(categoryId, categorySlug) {
    const tabs = document.getElementById('category-tabs') || document.getElementById('home-categories-container');
    if (tabs) {
        tabs.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    window.loadProductsByCategory(categoryId, categorySlug);
};

window.loadProductsByCategory = function(categoryId, categorySlug) {
    currentCategoryId = categoryId;
    currentCategorySlug = categorySlug || '';
    currentKeyword = '';

    // Update active class on button tabs
    $('.btn-category-home').removeClass('active');
    $(`[data-category-id="${categoryId}"]`).addClass('active');

    // Update active class on side menu
    $('#top-menu-right .menu-item').removeClass('active');
    $(`#top-menu-right [data-category-id="${categoryId}"]`).addClass('active');

    loadProducts();
};

// 4. Search Products
window.searchProducts = function() {
    const kw = document.getElementById('keyword-input');
    if (kw) {
        currentKeyword = kw.value.trim();
        currentCategoryId = '';
        $('.btn-category-home').removeClass('active');
        $(`[data-category-id=""]`).addClass('active');
        loadProducts();
    }
};

// 5. Load Products from SQL Server
async function loadProducts() {
    const container = document.getElementById('product-list') || document.getElementById('products-container');
    if (!container) return;

    // Show skeleton loading
    container.innerHTML = `
        <div class="skeleton-container py-4 text-center">
            <div class="loading-dots">
                <i class="fa fa-spinner fa-spin fa-2x text-primary mb-2"></i>
            </div>
            <div class="loading-text text-muted">Đang tải sản phẩm từ hệ thống...</div>
        </div>
    `;

    try {
        const queryParams = {};
        if (currentCategoryId) queryParams.category_id = currentCategoryId;
        if (currentKeyword) queryParams.keyword = currentKeyword;

        const res = await window.api.get('/products', queryParams);
        if (res && res.status === 'success' && res.data) {
            renderProducts(res.data, container);
        } else {
            container.innerHTML = `
                <div class="alert alert-info text-center my-4">
                    <i class="fa-solid fa-circle-info me-2"></i> Không có sản phẩm nào phù hợp.
                </div>
            `;
        }
    } catch (err) {
        console.error('Error loading products:', err);
        container.innerHTML = `
            <div class="alert alert-danger text-center my-4">
                <i class="fa-solid fa-triangle-exclamation me-2"></i> Lỗi tải danh sách sản phẩm. Vui lòng thử lại sau!
            </div>
        `;
    }
}

// 6. Render Products according to original ShopClone 7 layout
function renderProducts(products, container) {
    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state text-center py-5">
                <i class="fa-solid fa-box-open fs-1 text-secondary mb-3"></i>
                <p class="text-muted">Không có sản phẩm nào liên quan</p>
            </div>
        `;
        return;
    }

    // Group products by category
    const grouped = {};
    products.forEach(p => {
        const catId = p.category_id || 0;
        if (!grouped[catId]) {
            grouped[catId] = {
                name: p.category_name || 'Sản phẩm khác',
                icon: p.category_icon || 'mod/img/icon-facebook.png',
                items: []
            };
        }
        grouped[catId].items.push(p);
    });

    let html = '';
    for (const [catId, group] of Object.entries(grouped)) {
        html += `
            <div class="col-lg-12 mb-5" id="category${catId}">
                <div class="home-heading mb-3">
                    <h3>
                        <img src="${group.icon}" width="28" height="28" style="margin-right: 10px;" onerror="this.src='mod/img/icon-facebook.png'">
                        ${group.name}
                    </h3>
                </div>
                <div class="row row-cols-1 row-cols-md-1 row-cols-lg-1 row-cols-xl-1">
                    ${group.items.map(p => {
                        const stock = Number(p.stock || 0);
                        const sold = Number(p.sold || 0);
                        const isOutOfStock = stock === 0;
                        const price = Number(p.price);
                        const discount = Number(p.discount || 0);
                        const salePrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;

                        return `
                            <div>
                                <div class="feature-card ${isOutOfStock ? 'product-disable' : ''}">
                                    <div class="feature-content">
                                        <div class="row align-items-center">
                                            <div class="col-8 col-md-9">
                                                <h6 class="feature-name">
                                                    <a href="product.html?id=${p.id}">${p.name}</a>
                                                </h6>
                                                <p class="feature-desc"><i class="fa-solid fa-angles-right"></i> ${p.description || 'Tài khoản chất lượng cao, bảo hành uy tín.'}</p>
                                                <div class="row">
                                                    <div class="col-12 col-md-12">
                                                        <label class="label-text feat">Kho hàng: <b>${stock.toLocaleString()}</b></label>
                                                        <label class="label-text order">Đã bán: <b>${sold.toLocaleString()}</b></label>
                                                        ${discount > 0 ? `<label class="label-text off" title="Đang được giảm giá">-${discount}%</label>` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-4 col-md-3 text-end">
                                                <div class="card-price-product-list mb-2">
                                                    <h5 class="feature-price">
                                                        ${discount > 0 ? `<del>${formatVND(price)}</del>` : ''}
                                                        <span>${formatVND(salePrice)}</span>
                                                    </h5>
                                                </div>
                                                <button id="openModal_${p.id}" 
                                                        onclick="openModal('${p.id}')" 
                                                        class="btn-buy" 
                                                        data-id="${p.id}"
                                                        ${isOutOfStock ? 'disabled' : ''}>
                                                    MUA NGAY
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// 7. Render Wallet Sidebar in Right Column (home.php:157)
function renderWalletSidebar() {
    const card = document.getElementById('wallet-box') || document.getElementById('home-wallet-card');
    if (!card) return;

    const isLoggedIn = window.auth && window.auth.isLoggedIn();
    const user = isLoggedIn ? window.auth.getUser() : null;

    if (isLoggedIn && user) {
        const balance = Number(user.balance || 0);
        const totalDeposited = Number(user.total_deposited || balance);
        const usedMoney = Math.max(0, totalDeposited - balance);

        card.innerHTML = `
            <div class="my-wallet">
                <p>Số dư hiện tại</p>
                <h3 style="color:#0d6efd;">${formatVND(balance)}</h3>
            </div>
            <div class="wallet-card-group">
                <div class="wallet-card">
                    <p>Tổng tiền nạp</p>
                    <h3>${formatVND(totalDeposited)}</h3>
                </div>
                <div class="wallet-card">
                    <p>Số dư đã sử dụng</p>
                    <h3>${formatVND(usedMoney)}</h3>
                </div>
                <div class="wallet-card">
                    <p>Giảm giá</p>
                    <h3>0%</h3>
                </div>
            </div>
            <div class="mt-3 px-3">
                <a href="recharge.html" class="btn btn-primary btn-sm rounded-pill w-100 mb-2 py-2">
                    <i class="fa-solid fa-wallet me-1"></i> Nạp tiền ngay
                </a>
                <a href="orders.html" class="btn btn-outline-secondary btn-sm rounded-pill w-100 mb-2 py-2">
                    <i class="fa-solid fa-bag-shopping me-1"></i> Đơn hàng đã mua
                </a>
                <a href="javascript:void(0)" onclick="window.auth.logout()" class="btn btn-outline-danger btn-sm rounded-pill w-100 py-1">
                    <i class="fa-solid fa-right-from-bracket me-1"></i> Đăng xuất
                </a>
            </div>
        `;
    } else {
        card.innerHTML = `
            <ul class="user-form-social">
                <li>
                    <a href="login.html" class="facebook">
                        <i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP
                    </a>
                </li>
                <li>
                    <a href="register.html" class="google">
                        <i class="fa-solid fa-user-plus"></i> ĐĂNG KÝ TÀI KHOẢN
                    </a>
                </li>
            </ul>
        `;
    }
}

// 8. Load Recent Orders & Recent Deposits (home.php:193)
async function loadRecentActivities() {
    const ordersContainer = document.getElementById('recent-orders') || document.getElementById('recent-orders-container');
    const depositsContainer = document.getElementById('recent-recharges') || document.getElementById('recent-deposits-container');

    try {
        const res = await window.api.get('/activities/recent');
        if (res && res.status === 'success' && res.data) {
            const { recent_orders, recent_deposits } = res.data;

            if (ordersContainer) {
                if (recent_orders.length === 0) {
                    ordersContainer.innerHTML = '<div class="text-center py-4 text-muted">Chưa có đơn hàng nào gần đây.</div>';
                } else {
                    ordersContainer.innerHTML = recent_orders.map(o => `
                        <div class="feature-card mb-2">
                            <div class="feature-content p-2">
                                <div class="row align-items-center">
                                    <div class="col-9">
                                        <span class="fw-bold text-primary">${o.username}</span> vừa mua <b class="text-danger">${o.amount}</b> x <span>${o.product_name}</span> với giá <b>${o.pay_formatted}</b>
                                    </div>
                                    <div class="col-3 text-end">
                                        <span class="badge bg-primary">${o.time_ago}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            }

            if (depositsContainer) {
                if (recent_deposits.length === 0) {
                    depositsContainer.innerHTML = '<div class="text-center py-4 text-muted">Chưa có giao dịch nạp tiền gần đây.</div>';
                } else {
                    depositsContainer.innerHTML = recent_deposits.map(d => `
                        <div class="feature-card mb-2">
                            <div class="feature-content p-2">
                                <div class="row align-items-center">
                                    <div class="col-9">
                                        <span class="fw-bold text-success">${d.username}</span> nạp thành công <b class="text-success">${d.amount_formatted}</b> qua <span>${d.method}</span>
                                    </div>
                                    <div class="col-3 text-end">
                                        <span class="badge bg-primary">${d.time_ago}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            }
        }
    } catch (e) {
        console.error('Error loading recent activities:', e);
    }
}

// 9. Exact Modal View & Purchase (ajaxs/client/modal/view-product.php)
window.openModal = async function(id) {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;

    modalContent.innerHTML = `
        <div class="text-center py-5">
            <i class="fa fa-spinner fa-spin fa-2x text-primary mb-2"></i>
            <p>Đang tải thông tin sản phẩm...</p>
        </div>
    `;

    // Open modal via bootstrap
    const modalEl = document.getElementById('openModal');
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();

    try {
        const res = await window.api.get(`/products/${id}`);
        if (!res || res.status !== 'success' || !res.data) {
            modalContent.innerHTML = `<div class="p-4 text-center text-danger">Không tìm thấy sản phẩm!</div>`;
            return;
        }

        const product = res.data;
        currentProductInModal = product;
        const stock = Number(product.stock || 0);
        const sold = Number(product.sold || 0);
        const price = Number(product.price);
        const discount = Number(product.discount || 0);
        const salePrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;

        const isLoggedIn = window.auth && window.auth.isLoggedIn();
        const user = isLoggedIn ? window.auth.getUser() : null;
        const userBalance = user ? Number(user.balance || 0) : 0;

        modalContent.innerHTML = `
            <button class="modal-close icofont-close" data-bs-dismiss="modal"></button>
            <div class="product-view">
                <div class="row">
                    <div class="col-md-6 col-lg-6">
                        <div class="view-details">
                            <h3 class="view-name">
                                <a href="product.html?id=${product.id}">${product.name}</a>
                            </h3>
                            <div class="view-meta">
                                <p>
                                    <label class="label-text feat">Kho hàng: <strong>${stock.toLocaleString()}</strong></label>
                                    <label class="label-text order">Đã bán: <strong>${sold.toLocaleString()}</strong></label>
                                </p>
                            </div>
                            <div class="view-rating">
                                <i class="active icofont-star"></i>
                                <i class="active icofont-star"></i>
                                <i class="active icofont-star"></i>
                                <i class="active icofont-star"></i>
                                <i class="icofont-star"></i>
                                <a href="javascript:void(0)">(5 Reviews)</a>
                            </div>

                            <h3 class="view-price">
                                ${discount > 0 ? `<del>${formatVND(price)}</del>` : ''}
                                <span>${formatVND(salePrice)}</span>
                            </h3>

                            <p class="view-desc">${product.description || 'Tài khoản chất lượng cao, bàn giao tức thì.'}</p>
                            
                            <div class="view-list-group">
                                <label class="view-list-title">Chia sẻ:</label>
                                <ul class="view-share-list">
                                    <li><a href="javascript:void(0)" title="Facebook"><i class="fa-brands fa-facebook"></i></a></li>
                                    <li><a href="javascript:void(0)" title="Twitter"><i class="fa-brands fa-square-x-twitter"></i></a></li>
                                    <li><a href="javascript:void(0)" title="Telegram"><i class="fa-brands fa-telegram"></i></a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 col-lg-6">
                        <div class="view-details">
                            <table class="table fs-sm mb-0">
                                <tbody>
                                    <tr>
                                        <td colspan="2" align="center"><strong>THÔNG TIN MUA HÀNG</strong></td>
                                    </tr>
                                    <tr>
                                        <td>Số dư của tôi:</td>
                                        <td class="text-right">
                                            <strong class="text-wallet">${formatVND(userBalance)}</strong>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Số lượng cần mua: (<span class="text-danger">*</span>)</td>
                                        <td>
                                            <div class="product-action" style="display: flex;">
                                                <input type="hidden" id="product_id" value="${product.id}">
                                                <button class="action-minus1" onclick="changeQty(-1)" title="Giảm"><i class="fa-solid fa-minus"></i></button>
                                                <input class="action-input" onkeyup="calcTotalPayment()" onchange="calcTotalPayment()" type="number" id="amount" value="1" min="1" max="${stock}">
                                                <button class="action-plus1" onclick="changeQty(1)" title="Tăng"><i class="fa-solid fa-plus"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Mã giảm giá:</td>
                                        <td>
                                            <input class="form-control-view-product" onchange="calcTotalPayment()" type="text" id="coupon" placeholder="Nhập mã giảm giá nếu có (vd: GIAM10)">
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Thành tiền:</td>
                                        <td class="text-right"><strong id="into_money">${formatVND(salePrice)}</strong></td>
                                    </tr>
                                    <tr style="display: none;" id="into_discount_row">
                                        <td>Số tiền giảm:</td>
                                        <td class="text-right"><del style="color: red;" id="into_discount">0 ₫</del></td>
                                    </tr>
                                    <tr>
                                        <td>Tổng tiền thanh toán:</td>
                                        <td class="text-right"><strong style="color: blue;" id="into_pay">${formatVND(salePrice)}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="view-add-group mt-3">
                                ${isLoggedIn ? `
                                    <button class="btn-buy" id="btnBuy" onclick="buyProductInModal()" ${stock === 0 ? 'disabled' : ''}>
                                        <i class="fa-solid fa-cart-shopping"></i>
                                        <span>THANH TOÁN</span>
                                    </button>
                                ` : `
                                    <button class="btn-buy" type="button" onclick="window.location.href='login.html';">
                                        <i class="fa-solid fa-sign-in"></i>
                                        <span>ĐĂNG NHẬP ĐỂ MUA</span>
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        calcTotalPayment();
    } catch (err) {
        console.error('Error fetching modal product:', err);
    }
};

window.changeQty = function(delta) {
    const input = document.getElementById('amount');
    if (!input) return;
    let qty = parseInt(input.value) || 1;
    qty = Math.max(1, qty + delta);
    if (currentProductInModal && currentProductInModal.stock > 0) {
        qty = Math.min(qty, currentProductInModal.stock);
    }
    input.value = qty;
    calcTotalPayment();
};

window.calcTotalPayment = function() {
    if (!currentProductInModal) return;
    const qtyInput = document.getElementById('amount');
    const couponInput = document.getElementById('coupon');
    const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
    const coupon = (couponInput ? couponInput.value : '').trim().toUpperCase();

    const unitPrice = Number(currentProductInModal.price);
    const discount = Number(currentProductInModal.discount || 0);
    const saleUnit = discount > 0 ? Math.round(unitPrice * (1 - discount / 100)) : unitPrice;

    let subTotal = saleUnit * qty;
    let discountAmount = 0;

    if (coupon === 'GIAM10') {
        discountAmount = Math.round(subTotal * 0.1);
    }

    let finalPay = Math.max(0, subTotal - discountAmount);

    const elMoney = document.getElementById('into_money');
    const elDiscount = document.getElementById('into_discount');
    const elDiscountRow = document.getElementById('into_discount_row');
    const elPay = document.getElementById('into_pay');

    if (elMoney) elMoney.innerText = formatVND(subTotal);
    if (elPay) elPay.innerText = formatVND(finalPay);

    if (discountAmount > 0) {
        if (elDiscount) elDiscount.innerText = formatVND(discountAmount);
        if (elDiscountRow) elDiscountRow.style.display = 'table-row';
    } else {
        if (elDiscountRow) elDiscountRow.style.display = 'none';
    }
};

// 10. Buy Product In Modal (ajaxs/client/modal/view-product.php:188)
window.buyProductInModal = async function() {
    if (!window.auth || !window.auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const btnBuy = document.getElementById('btnBuy');
    const prodIdInput = document.getElementById('product_id');
    const qtyInput = document.getElementById('amount');
    const couponInput = document.getElementById('coupon');

    const productId = parseInt(prodIdInput.value);
    const quantity = parseInt(qtyInput.value) || 1;
    const coupon = couponInput ? couponInput.value.trim() : '';

    if (btnBuy) {
        btnBuy.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang xử lý...';
        btnBuy.disabled = true;
    }

    try {
        const res = await window.api.post('/orders/buy', {
            product_id: productId,
            quantity: quantity,
            coupon: coupon
        });

        if (res && res.status === 'success') {
            // Update auth user balance locally
            if (res.new_balance !== undefined) {
                const user = window.auth.getUser();
                user.balance = res.new_balance;
                window.auth.setUser(user);
                renderWalletSidebar();
                loadRecentActivities();
            }

            // Extract delivered accounts string
            let accountsText = '';
            if (res.accounts && Array.isArray(res.accounts)) {
                accountsText = res.accounts.map(a => a.account).join('\n');
            } else if (typeof res.data === 'string') {
                accountsText = res.data;
            }

            // Render exact success view from view-product.php:240
            const container = document.querySelector('.product-view');
            if (container) {
                container.innerHTML = `
                    <style>
                    .vp-wrap{padding:12px 12px 18px;}
                    .vp-card{padding:18px;}
                    .vp-header{display:flex;align-items:center;gap:12px;margin-bottom:12px;justify-content:center;}
                    .vp-check{width:54px;height:54px;border-radius:50%;background:#e8f7ee;border:2px solid #c6f1d9;display:flex;align-items:center;justify-content:center;color:#22c55e;font-size:28px;}
                    .vp-title{font-size:20px;font-weight:700;margin:0;text-align:center;}
                    .vp-badge{display:inline-block;background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;border-radius:999px;padding:4px 10px;font-size:12px;margin:6px auto 14px;}
                    .vp-acc{background:#0f172a0a;border:1px solid #e5e7eb;border-radius:10px;padding:12px;height:230px;overflow:auto;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;white-space:pre-wrap;line-height:1.5;color:#111827;}
                    .vp-actions{display:flex;flex-direction:column;gap:10px;margin-top:14px;}
                    .vp-btn{display:flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:10px;height:42px;font-weight:600;cursor:pointer;}
                    .vp-btn-primary{background:#2563eb;color:#fff;}
                    .vp-btn-info{background:#0ea5e9;color:#fff;}
                    .vp-btn-ghost{background:#f3f4f6;color:#111827;}
                    @media(min-width:768px){.vp-actions{flex-direction:row;}.vp-btn{min-width:32%;}}
                    </style>
                    <div class="vp-wrap">
                        <div class="vp-card">
                            <div class="vp-header">
                                <div class="vp-check"><i class="fa-solid fa-check"></i></div>
                            </div>
                            <h3 class="vp-title">Thanh toán thành công !</h3>
                            <div style="text-align:center">
                                <span class="vp-badge">Chi tiết đơn hàng #${res.order_code || res.order_id || ''}</span>
                            </div>
                            <div id="purchasedAccounts" class="vp-acc">${accountsText}</div>
                            <div class="vp-actions">
                                <button id="btnCopyAccounts" class="vp-btn vp-btn-primary" onclick="copyAccountsToClipboard()">
                                    <i class="fa-regular fa-copy"></i><span>Sao chép</span>
                                </button>
                                <button class="vp-btn vp-btn-info" onclick="window.location.href='orders.html'">
                                    <i class="fa-solid fa-file-invoice"></i><span>Xem đơn hàng</span>
                                </button>
                                <button class="vp-btn vp-btn-ghost" onclick="openModal('${productId}')">
                                    <i class="fa-solid fa-cart-plus"></i><span>Mua thêm</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Reload products grid to update stock
            loadProducts();
        } else {
            showToast(res ? res.msg : 'Lỗi thanh toán đơn hàng!', 'error');
            if (btnBuy) {
                btnBuy.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> <span>THANH TOÁN</span>';
                btnBuy.disabled = false;
            }
        }
    } catch (e) {
        showToast(e.message || 'Lỗi kết nối máy chủ!', 'error');
        if (btnBuy) {
            btnBuy.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> <span>THANH TOÁN</span>';
            btnBuy.disabled = false;
        }
    }
};

window.copyAccountsToClipboard = function() {
    const accBox = document.getElementById('purchasedAccounts');
    const btn = document.getElementById('btnCopyAccounts');
    if (!accBox) return;

    const text = accBox.innerText || accBox.textContent || '';
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Đã sao chép vào clipboard!', 'success');
            if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Đã sao chép</span>';
        });
    } else {
        const range = document.createRange();
        range.selectNode(accBox);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        showToast('Đã sao chép vào clipboard!', 'success');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Đã sao chép</span>';
    }
};
