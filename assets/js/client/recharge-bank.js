/**
 * Client Controller - Bank Recharge Page (client/recharge-bank.html & client/recharge.html)
 */

let pollInterval = null;
let currentAmount = 100000;
let cachedBanks = [];
let cachedUser = null;

async function loadBankRecharge() {
    if (!window.auth.checkAuth('user')) return;
    const user = window.auth.getUser();
    cachedUser = user;

    // Set transfer syntax
    const syntaxEls = document.querySelectorAll('.transfer-syntax');
    syntaxEls.forEach(el => {
        el.innerText = `NAPTIEN ${user.username}`;
    });

    // Setup amount input listeners
    setupAmountListeners();

    // Load active bank list
    try {
        const res = await window.api.get('api/data.php', { action: 'get_banks' });
        if (res && res.status === 'success' && res.data) {
            cachedBanks = res.data;
            renderBanks(res.data, user);
        }
    } catch (e) {
        console.error('Error fetching banks:', e);
        if (window.MockDB) {
            cachedBanks = window.MockDB.getBanks();
            renderBanks(cachedBanks, user);
        }
    }

    // Load deposit history
    loadDepositHistory();

    // Start auto polling for topup notification
    startTopupPolling();
}

function setupAmountListeners() {
    const inputAmount = document.getElementById('recharge-amount-input');
    if (inputAmount) {
        inputAmount.value = currentAmount.toLocaleString('vi-VN');
        inputAmount.addEventListener('input', (e) => {
            const rawVal = e.target.value.replace(/\D/g, '');
            currentAmount = parseInt(rawVal) || 0;
            e.target.value = currentAmount > 0 ? currentAmount.toLocaleString('vi-VN') : '';
            updateAllQRs();
        });
    }

    const quickBtns = document.querySelectorAll('.btn-quick-amount');
    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            quickBtns.forEach(b => b.classList.remove('active', 'btn-primary'));
            quickBtns.forEach(b => b.classList.add('btn-outline-primary'));
            btn.classList.add('active', 'btn-primary');
            btn.classList.remove('btn-outline-primary');

            const amt = parseInt(btn.getAttribute('data-amount')) || 100000;
            currentAmount = amt;
            if (inputAmount) {
                inputAmount.value = amt.toLocaleString('vi-VN');
            }
            updateAllQRs();
        });
    });
}

function updateAllQRs() {
    if (!cachedBanks || cachedBanks.length === 0 || !cachedUser) return;
    const syntax = `NAPTIEN ${cachedUser.username}`;

    cachedBanks.forEach(b => {
        const qrImg = document.getElementById(`qr-img-${b.id}`);
        const qrDownload = document.getElementById(`qr-download-${b.id}`);
        const qrUrl = `https://img.vietqr.io/image/${b.short_name || b.bank_name}-${b.account_number}-compact2.png?amount=${currentAmount}&addInfo=${encodeURIComponent(syntax)}&accountName=${encodeURIComponent(b.account_name)}`;

        if (qrImg) qrImg.src = qrUrl;
        if (qrDownload) qrDownload.href = qrUrl;
    });

    const displayAmountEls = document.querySelectorAll('.current-recharge-amount-display');
    displayAmountEls.forEach(el => {
        el.innerText = (currentAmount || 0).toLocaleString('vi-VN') + ' ₫';
    });
}

function renderBanks(banks, user) {
    const container = document.getElementById('banks-list-container');
    if (!container) return;

    if (!banks || banks.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-4 text-muted">Chưa có thông tin ngân hàng</div>';
        return;
    }

    const syntax = `NAPTIEN ${user.username}`;

    container.innerHTML = banks.map(b => {
        const qrUrl = `https://img.vietqr.io/image/${b.short_name || b.bank_name}-${b.account_number}-compact2.png?amount=${currentAmount}&addInfo=${encodeURIComponent(syntax)}&accountName=${encodeURIComponent(b.account_name)}`;

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
                    <div class="card-header bg-gradient text-white text-center py-3" style="background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);">
                        <h6 class="fw-bold mb-0 fs-5"><i class="fa-solid fa-building-columns me-2"></i> ${b.bank_name}</h6>
                    </div>
                    <div class="card-body text-center p-3">
                        <div class="mb-2">
                            <span class="badge bg-light text-primary border px-3 py-2 fs-6">
                                Số tiền: <strong class="text-danger current-recharge-amount-display">${(currentAmount || 0).toLocaleString('vi-VN')} ₫</strong>
                            </span>
                        </div>
                        <div class="qr-box mb-3 border p-2 rounded-3 d-inline-block bg-white shadow-sm position-relative">
                            <img id="qr-img-${b.id}" src="${qrUrl}" alt="VietQR" class="img-fluid rounded" style="max-height: 220px;" onerror="this.src='../mod/img/icon-call-nh.png'">
                        </div>
                        <div class="mb-3">
                            <a id="qr-download-${b.id}" href="${qrUrl}" target="_blank" download="vietqr_${b.short_name}.png" class="btn btn-sm btn-outline-secondary rounded-pill px-3">
                                <i class="fa-solid fa-download me-1"></i> Tải mã QR về máy
                            </a>
                        </div>
                        <ul class="list-group list-group-flush text-start small mb-3">
                            <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                                <span class="text-muted"><i class="fa-solid fa-user me-1"></i> Chủ tài khoản:</span>
                                <strong>${b.account_name}</strong>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                                <span class="text-muted"><i class="fa-solid fa-credit-card me-1"></i> Số tài khoản:</span>
                                <div class="d-flex align-items-center">
                                    <strong class="text-primary me-2 fs-6">${b.account_number}</strong>
                                    <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="copyText('${b.account_number}')" title="Sao chép số TK">
                                        <i class="fa-solid fa-copy"></i>
                                    </button>
                                </div>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center py-2 bg-light rounded-2">
                                <span class="text-muted"><i class="fa-solid fa-comment-dots me-1"></i> Nội dung CK:</span>
                                <div class="d-flex align-items-center">
                                    <strong class="text-danger me-2 fs-6">${syntax}</strong>
                                    <button class="btn btn-sm btn-danger py-0 px-2" onclick="copyText('${syntax}')" title="Sao chép cú pháp">
                                        <i class="fa-solid fa-copy"></i>
                                    </button>
                                </div>
                            </li>
                        </ul>
                        <!-- Test Simulator Button -->
                        <button class="btn btn-success w-100 rounded-pill py-2 shadow-sm" onclick="simulateRechargeSuccess('${b.bank_name}')">
                            <i class="fa-solid fa-bolt me-1"></i> Giả lập nạp tiền ngay (Demo Test)
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function loadDepositHistory() {
    const tbody = document.getElementById('deposits-table-body');
    if (!tbody) return;

    try {
        const res = await window.api.get('api/data.php', { action: 'get_deposits' });
        if (res && res.status === 'success' && res.data) {
            renderDeposits(res.data);
            return;
        }
    } catch (e) {
        console.error('Error fetching deposits:', e);
    }

    if (window.MockDB) {
        renderDeposits(window.MockDB.getDeposits());
    }
}

function renderDeposits(deposits) {
    const tbody = document.getElementById('deposits-table-body');
    if (!tbody) return;

    if (!deposits || deposits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Chưa có giao dịch nạp tiền nào</td></tr>';
        return;
    }

    tbody.innerHTML = deposits.map(d => `
        <tr>
            <td><small class="text-muted">${d.create_gettime || d.create_date || 'Vừa xong'}</small></td>
            <td><strong>${d.method || 'Vietcombank VietQR'}</strong></td>
            <td><code>#${d.trans_id || d.tid || 'DEP' + d.id}</code></td>
            <td><span class="badge bg-light text-dark border">${d.description || ('NAPTIEN ' + (cachedUser ? cachedUser.username : ''))}</span></td>
            <td><strong>${d.amount_formatted || ((d.amount || 0).toLocaleString('vi-VN') + ' ₫')}</strong></td>
            <td><strong class="text-success">+${d.received_formatted || ((d.received || d.amount || 0).toLocaleString('vi-VN') + ' ₫')}</strong></td>
        </tr>
    `).join('');
}

function startTopupPolling() {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
        try {
            const res = await window.api.post('ajaxs/client/view.php', {
                action: 'notication_topup'
            });

            if (res && res.status === 'success') {
                await window.auth.syncUser();
                loadDepositHistory();

                Swal.fire({
                    icon: 'success',
                    title: 'Nạp tiền thành công!',
                    text: res.msg || 'Số dư ví của bạn đã được cộng tự động.',
                    confirmButtonText: 'Tiếp tục',
                    confirmButtonColor: '#0d6efd'
                });
            }
        } catch (e) {
            // Ignore polling network glitches
        }
    }, 8000);
}

// Interactive Topup Simulator for offline/demo/testing
window.simulateRechargeSuccess = function(bankName = 'Vietcombank') {
    const amt = currentAmount > 0 ? currentAmount : 100000;
    if (window.MockDB) {
        const updatedUser = window.MockDB.simulateDeposit(amt, bankName);
        window.auth.setUser(updatedUser);
        loadDepositHistory();

        Swal.fire({
            icon: 'success',
            title: 'Nạp tiền thành công!',
            html: `
                <p class="mb-2">Hệ thống đã tự động ghi nhận số tiền <strong>${amt.toLocaleString('vi-VN')} ₫</strong> từ <strong>${bankName}</strong>.</p>
                <p class="text-success small mb-0">Số dư hiện tại của bạn: <strong>${(updatedUser.money || 0).toLocaleString('vi-VN')} ₫</strong></p>
            `,
            confirmButtonText: 'Xác nhận',
            confirmButtonColor: '#198754'
        });
    } else {
        window.api.alertSuccess(`Đã mô phỏng nạp thành công ${amt.toLocaleString('vi-VN')} ₫!`);
    }
};

window.copyText = function(val) {
    navigator.clipboard.writeText(val).then(() => {
        window.api.showToast(`Đã sao chép: ${val}`);
    }).catch(() => {
        const el = document.createElement('textarea');
        el.value = val;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        window.api.showToast(`Đã sao chép: ${val}`);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    loadBankRecharge();
});

window.addEventListener('beforeunload', () => {
    if (pollInterval) clearInterval(pollInterval);
});
