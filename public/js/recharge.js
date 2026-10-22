/**
 * ShopClone 7 - Recharge Page Controller (public/recharge.html)
 * 100% Real Commercial Banking Flow:
 * - Tab 1: VietQR Bank Selector (Single Focus QR Display)
 * - Tab 2: MoMo E-Wallet Topup
 * - Tab 3: Automatic Scratch Card Recharge
 * - Dynamic Syntax: NAP <username>
 * - Real-time Background Status Polling
 */

let currentAmount = 100000;
let cachedBanks = [];
let selectedBank = null;
let momoAccount = null;
let initialBalance = null;
let rechargePollingInterval = null;

function formatVND(val) {
    if (window.formatCurrency) {
        return window.formatCurrency(val);
    }
    return Number(val || 0).toLocaleString('vi-VN') + ' ₫';
}

function getRechargeSyntax() {
    const user = window.auth ? window.auth.getUser() : null;
    const username = user && user.username ? user.username : '';
    const prefix = (window.siteSettings?.deposit_syntax_prefix || window.siteSettings?.prefix_autobank || 'NAPTIEN').trim();
    if (!username) {
        return prefix;
    }
    return `${prefix} ${username}`;
}

async function initRechargePage() {
    // 1. Enforce authentication: must be logged in with real account
    if (!window.auth || !window.auth.isLoggedIn()) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent('recharge.html');
        return;
    }

    // 2. Sync fresh user state from SQL Server (/api/auth/me)
    const user = await window.auth.syncUser();
    if (!user) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent('recharge.html');
        return;
    }
    initialBalance = Number(user.balance || 0);

    // 3. Setup Amount Handlers (Input & Quick Buttons)
    setupAmountHandlers();

    // 4. Setup Scratch Card Handler
    setupCardFormHandler();

    // 5. Load Banks from SQL Server
    await loadBanks();

    // 6. Update syntax for other tabs (TheSieuRe, Crypto)
    updateAdditionalMethodsSyntax();

    // 7. Load Transaction History
    await loadTransactions();

    // 8. Start Real-Time Background Status Polling
    startRechargePolling();

    // 9. Auto-activate requested tab from URL (?type=...)
    activateTabFromUrl();
}

function setupAmountHandlers() {
    const inputAmount = document.getElementById('recharge-amount-input');
    if (inputAmount) {
        inputAmount.value = currentAmount.toLocaleString('vi-VN');
        inputAmount.addEventListener('input', (e) => {
            const raw = e.target.value.replace(/\D/g, '');
            currentAmount = parseInt(raw) || 0;
            e.target.value = currentAmount > 0 ? currentAmount.toLocaleString('vi-VN') : '';
            updateVietQRDisplay();
            updateMoMoDisplay();
        });
    }

    const quickBtns = document.querySelectorAll('.btn-quick-amount');
    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            quickBtns.forEach(b => {
                b.classList.remove('active', 'btn-primary');
                b.classList.add('btn-outline-primary');
            });
            btn.classList.add('active', 'btn-primary');
            btn.classList.remove('btn-outline-primary');

            const amt = parseInt(btn.getAttribute('data-amount')) || 100000;
            currentAmount = amt;
            if (inputAmount) {
                inputAmount.value = amt.toLocaleString('vi-VN');
            }
            updateVietQRDisplay();
            updateMoMoDisplay();
        });
    });
}

async function loadBanks() {
    const selectorContainer = document.getElementById('bank-selector-container');
    if (!selectorContainer) return;

    try {
        const res = await window.api.get('/recharge/banks');
        if (res && res.status === 'success' && res.data && res.data.length > 0) {
            // Filter out MoMo into dedicated slot
            momoAccount = res.data.find(b => b.bank_id === 'MOMO' || b.bank_name.toLowerCase().includes('momo'));
            cachedBanks = res.data.filter(b => b.bank_id !== 'MOMO' && !b.bank_name.toLowerCase().includes('momo'));

            if (cachedBanks.length === 0 && res.data.length > 0) {
                cachedBanks = res.data;
            }

            // Select default bank (first bank)
            selectedBank = cachedBanks[0];

            // Render Bank Selector Cards
            renderBankSelector(cachedBanks);

            // Update VietQR Focus Display
            updateVietQRDisplay();

            // Update MoMo Display
            updateMoMoDisplay();
        } else {
            selectorContainer.innerHTML = '<div class="col-12 text-center py-4 text-muted">Chưa có thông tin ngân hàng nạp tiền</div>';
        }
    } catch (e) {
        console.error('Error loading banks:', e);
        selectorContainer.innerHTML = '<div class="col-12 text-center py-4 text-danger">Lỗi kết nối khi tải danh sách ngân hàng!</div>';
    }
}

function renderBankSelector(banks) {
    const container = document.getElementById('bank-selector-container');
    if (!container) return;

    container.innerHTML = banks.map(b => {
        const isSelected = selectedBank && selectedBank.id === b.id;
        const iconUrl = b.icon || `https://api.vietqr.io/img/${b.bank_id}.png`;

        return `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="bank-select-card p-3 text-center ${isSelected ? 'active' : ''}" onclick="selectBank(${b.id})" id="bank-card-${b.id}">
                    <div class="check-indicator"><i class="fa-solid fa-check"></i></div>
                    <div class="mb-2" style="height: 42px; display: flex; align-items: center; justify-content: center;">
                        <img src="${iconUrl}" alt="${b.bank_name}" style="max-height: 40px; max-width: 100px; object-fit: contain;" onerror="this.src='mod/img/icon-call-nh.png'">
                    </div>
                    <div class="fw-bold text-dark small text-truncate" title="${b.bank_name}">${b.bank_name}</div>
                    <div class="text-primary small font-monospace fw-bold">${b.account_number}</div>
                </div>
            </div>
        `;
    }).join('');
}

window.selectBank = function(bankId) {
    const bank = cachedBanks.find(b => b.id === bankId);
    if (!bank) return;

    selectedBank = bank;

    // Toggle active classes on cards
    document.querySelectorAll('.bank-select-card').forEach(card => card.classList.remove('active'));
    const activeEl = document.getElementById(`bank-card-${bankId}`);
    if (activeEl) activeEl.classList.add('active');

    // Update single VietQR focus display
    updateVietQRDisplay();
};

function updateVietQRDisplay() {
    if (!selectedBank) return;

    const syntax = getRechargeSyntax();
    const qrUrl = `https://img.vietqr.io/image/${selectedBank.bank_id}-${selectedBank.account_number}-compact2.png?amount=${currentAmount}&addInfo=${encodeURIComponent(syntax)}&accountName=${encodeURIComponent(selectedBank.account_name)}`;

    const qrImg = document.getElementById('vietqr-image');
    const qrDownload = document.getElementById('vietqr-download-btn');
    const bankTitle = document.getElementById('display-bank-title');
    const bankName = document.getElementById('display-bank-name');
    const accountName = document.getElementById('display-account-name');
    const accountNumber = document.getElementById('display-account-number');
    const amountDisplay = document.getElementById('display-amount');
    const syntaxDisplay = document.getElementById('display-syntax');

    if (qrImg) qrImg.src = qrUrl;
    if (qrDownload) qrDownload.href = qrUrl;
    if (bankTitle) bankTitle.innerHTML = `<i class="fa-solid fa-building-columns me-2"></i> ${selectedBank.bank_name} - Thanh Toán VietQR`;
    if (bankName) bankName.innerText = selectedBank.bank_name;
    if (accountName) accountName.innerText = selectedBank.account_name;
    if (accountNumber) accountNumber.innerText = selectedBank.account_number;
    if (amountDisplay) amountDisplay.innerText = formatVND(currentAmount);
    if (syntaxDisplay) syntaxDisplay.innerText = syntax;
}
window.updateVietQRDisplay = updateVietQRDisplay;

function updateMoMoDisplay() {
    const syntax = getRechargeSyntax();
    const momoPhone = momoAccount ? momoAccount.account_number : (window.siteSettings?.site_hotline || window.siteSettings?.hotline || '0989461037').replace(/[^0-9]/g, '');
    const momoName = momoAccount ? momoAccount.account_name : 'NGUYEN VAN QUYEN (ADMIN SHOPCLONE)';
    const momoQrUrl = `https://img.vietqr.io/image/MOMO-${momoPhone}-compact2.png?amount=${currentAmount}&addInfo=${encodeURIComponent(syntax)}&accountName=${encodeURIComponent(momoName)}`;

    const qrImg = document.getElementById('momo-qr-image');
    const qrDownload = document.getElementById('momo-download-btn');
    const nameEl = document.getElementById('momo-account-name');
    const phoneEl = document.getElementById('momo-phone-number');
    const syntaxEl = document.getElementById('momo-syntax');

    if (qrImg) qrImg.src = momoQrUrl;
    if (qrDownload) qrDownload.href = momoQrUrl;
    if (nameEl) nameEl.innerText = momoName;
    if (phoneEl) phoneEl.innerText = momoPhone;
    if (syntaxEl) syntaxEl.innerText = syntax;
}
window.updateMoMoDisplay = updateMoMoDisplay;

window.copyDisplaySTK = function() {
    if (selectedBank) {
        copyText(selectedBank.account_number);
    }
};

window.copyDisplaySyntax = function() {
    copyText(getRechargeSyntax());
};

window.copyText = function(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        window.api.showToast(`Đã sao chép: ${text}`, 'success');
    }).catch(() => {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        window.api.showToast(`Đã sao chép: ${text}`, 'success');
    });
};

/**
 * Tab 3: Scratch Card Handling
 */
window.updateCardRealAmount = function() {
    const amtSelect = document.getElementById('card-amount');
    const telcoSelect = document.getElementById('card-telco');
    const display = document.getElementById('card-real-amount-display');
    if (!amtSelect || !display) return;

    const amt = parseInt(amtSelect.value) || 0;
    const telco = telcoSelect ? telcoSelect.value : '';
    const discountRate = (telco === 'VNMOBI') ? 0.82 : 0.85; // 15% discount, 18% for VNMobile
    const realAmount = Math.round(amt * discountRate);

    display.innerText = realAmount > 0 ? formatVND(realAmount) : '0 ₫';
};

function setupCardFormHandler() {
    const form = document.getElementById('card-recharge-form');
    if (!form) return;

    const telcoSelect = document.getElementById('card-telco');
    if (telcoSelect) {
        telcoSelect.addEventListener('change', window.updateCardRealAmount);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmitCard');
        const telco = document.getElementById('card-telco').value;
        const amount = document.getElementById('card-amount').value;
        const serial = document.getElementById('card-serial').value.trim();
        const pin = document.getElementById('card-pin').value.trim();

        if (!telco || !amount || !serial || !pin) {
            window.api.alertError('Vui lòng nhập đầy đủ thông tin thẻ cào!');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i> Đang gửi thẻ...';

        try {
            const res = await window.api.post('/recharge/card', { telco, amount, serial, pin });
            if (res && res.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: 'Gửi thẻ thành công!',
                    text: res.msg || 'Hệ thống đang xử lý và gạch thẻ trong 1 - 3 phút.',
                    confirmButtonColor: '#0d6efd'
                });
                form.reset();
                window.updateCardRealAmount();
                await loadTransactions();
            } else {
                window.api.alertError(res ? res.msg : 'Gửi thẻ thất bại!');
            }
        } catch (err) {
            console.error('Submit card error:', err);
            window.api.alertError('Có lỗi xảy ra khi nạp thẻ cào!');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane me-2"></i> NẠP THẺ CÀO NGAY';
        }
    });
}

/**
 * Real-time Auto Status Polling (Every 6 seconds)
 * Checks when funds land in wallet via VietQR / Webhook
 */
function startRechargePolling() {
    if (rechargePollingInterval) clearInterval(rechargePollingInterval);

    rechargePollingInterval = setInterval(async () => {
        if (!window.auth || !window.auth.isLoggedIn()) return;

        try {
            const res = await window.api.get('/recharge/check-status');
            if (res && res.status === 'success') {
                const currentBal = Number(res.balance);

                if (initialBalance !== null && currentBal > initialBalance) {
                    const addedAmt = currentBal - initialBalance;
                    initialBalance = currentBal;

                    // 1. Sync & update Header Navbar Balance
                    await window.auth.syncUser();
                    window.auth.updateHeaderUI();

                    // 2. Refresh transaction history table
                    await loadTransactions();

                    // 3. Trigger SweetAlert2 Success Alert
                    Swal.fire({
                        icon: 'success',
                        title: 'Nạp tiền thành công!',
                        html: `
                            <div class="text-center p-2">
                                <div class="fs-1 text-success mb-2"><i class="fa-solid fa-circle-check"></i></div>
                                <h3 class="fw-bold text-success mb-2">+${formatVND(addedAmt)}</h3>
                                <p class="mb-2 text-muted">Hệ thống đã tự động ghi nhận chuyển khoản và cộng tiền vào ví của bạn.</p>
                                <p class="fw-bold text-primary mb-0">Số dư hiện tại: <span class="fs-5">${res.balance_formatted}</span></p>
                            </div>
                        `,
                        confirmButtonText: 'Tiếp tục mua hàng',
                        showCancelButton: true,
                        cancelButtonText: 'Ở lại trang này',
                        confirmButtonColor: '#0d6efd'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = 'index.html';
                        }
                    });
                } else {
                    initialBalance = currentBal;
                }
            }
        } catch (err) {
            console.warn('Recharge auto check:', err);
        }
    }, 6000);
}

async function loadTransactions() {
    const tbody = document.getElementById('deposits-table-body');
    if (!tbody) return;

    try {
        const res = await window.api.get('/recharge/transactions');
        if (res && res.status === 'success' && res.data) {
            if (res.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Chưa có giao dịch biến động số dư nào</td></tr>';
                return;
            }

            tbody.innerHTML = res.data.map(t => `
                <tr>
                    <td><small class="text-muted">${t.created_at_formatted}</small></td>
                    <td><span class="badge ${t.type === 'recharge' ? 'bg-success' : 'bg-primary'}">${t.type === 'recharge' ? 'Nạp tiền VietQR' : 'Thanh toán'}</span></td>
                    <td><code class="font-monospace">#${t.trans_code}</code></td>
                    <td><small class="text-dark">${t.note || ''}</small></td>
                    <td><strong>${t.balance_before_formatted}</strong></td>
                    <td><strong class="${t.amount > 0 ? 'text-success' : 'text-danger'}">${t.amount_formatted}</strong></td>
                </tr>
            `).join('');
        }
    } catch (e) {
        console.error('Error loading transactions:', e);
    }
}

function updateAdditionalMethodsSyntax() {
    const syntax = getRechargeSyntax();
    document.querySelectorAll('.thesieure-syntax, .crypto-syntax').forEach(el => {
        el.innerText = syntax;
    });
}
window.updateAdditionalMethodsSyntax = updateAdditionalMethodsSyntax;

function activateTabFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const type = (urlParams.get('type') || '').toLowerCase().trim();
    if (!type) return;

    let targetBtn = document.querySelector(`#recharge-main-tabs [data-type="${type}"]`)
                 || document.getElementById(`tab-${type}-btn`);

    // Handle common aliases:
    if (!targetBtn) {
        if (type === 'vietqr' || type === 'napas' || type === 'banking') {
            targetBtn = document.getElementById('tab-bank-btn');
        } else if (type === 'tsr' || type === 'thesieure') {
            targetBtn = document.getElementById('tab-thesieure-btn');
        } else if (type === 'thecao' || type === 'cards') {
            targetBtn = document.getElementById('tab-card-btn');
        } else if (type === 'usdt') {
            targetBtn = document.getElementById('tab-crypto-btn');
        }
    }

    if (targetBtn) {
        if (window.bootstrap && window.bootstrap.Tab) {
            const tabTrigger = bootstrap.Tab.getOrCreateInstance(targetBtn);
            tabTrigger.show();
        } else {
            targetBtn.click();
        }
    }
}

window.addEventListener('beforeunload', () => {
    if (rechargePollingInterval) clearInterval(rechargePollingInterval);
});

document.addEventListener('DOMContentLoaded', () => {
    initRechargePage();
});
