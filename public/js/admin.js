/**
 * ShopClone 7 - Admin Panel Controller (public/admin/*.html)
 * Real Admin Management with SQL Server Backend
 */

async function initAdminDashboard() {
    if (!window.auth.checkAuth('admin')) return;

    try {
        const res = await window.api.get('/admin/stats');
        if (res && res.status === 'success' && res.data) {
            const d = res.data;
            setStatText('stat-total-users', d.total_users);
            setStatText('stat-total-orders', d.total_orders);
            setStatText('stat-total-revenue', d.total_revenue_formatted);
            setStatText('stat-total-deposits', d.total_deposits_formatted);

            renderRecentOrders(d.recent_orders || []);
            renderRecentUsers(d.recent_users || []);
        }
    } catch (e) {
        console.error('Error loading admin stats:', e);
    }
}

function setStatText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = typeof val === 'number' ? val.toLocaleString('vi-VN') : val;
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('recent-orders-table-body');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Chưa có đơn hàng nào</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><strong>#${o.order_code}</strong></td>
            <td><strong>${o.username}</strong></td>
            <td>${o.product_name}</td>
            <td><span class="badge bg-secondary">${o.quantity}</span></td>
            <td><strong class="text-danger">${o.total_price_formatted}</strong></td>
            <td><small class="text-muted">${o.created_at_formatted}</small></td>
        </tr>
    `).join('');
}

function renderRecentUsers(users) {
    const tbody = document.getElementById('recent-users-table-body');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Chưa có thành viên nào</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr>
            <td>#${u.id}</td>
            <td><strong>${u.username}</strong></td>
            <td><strong class="text-primary">${u.balance_formatted}</strong></td>
        </tr>
    `).join('');
}

// Bulk Stock Import Form Handler
async function setupStockImport() {
    // Populate products dropdown
    const select = document.getElementById('select-product-import');
    if (select) {
        try {
            const res = await window.api.get('/products');
            if (res && res.status === 'success' && res.data) {
                select.innerHTML = '<option value="">-- Chọn sản phẩm cần nhập kho --</option>' + 
                    res.data.map(p => `<option value="${p.id}">${p.name} (Hiện có: ${p.stock})</option>`).join('');
            }
        } catch (e) {}
    }

    const form = document.getElementById('form-stock-import');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const prodId = select ? select.value : '';
            const textarea = document.getElementById('textarea-stock-data');
            const data = textarea ? textarea.value.trim() : '';

            if (!prodId || !data) {
                window.api.alertError('Vui lòng chọn sản phẩm và dán danh sách tài khoản!');
                return;
            }

            const btn = document.getElementById('btnSubmitImport');
            if (btn) {
                btn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i> Đang nhập kho...';
                btn.disabled = true;
            }

            try {
                const res = await window.api.post('/admin/stock/import', {
                    product_id: prodId,
                    account_data: data
                });

                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg);
                    textarea.value = '';
                    if (select) {
                        const opt = select.options[select.selectedIndex];
                        if (opt) opt.text = opt.text.replace(/\(Hiện có: \d+\)/, `(Đã nhập thêm +${res.count})`);
                    }
                } else {
                    window.api.alertError(res ? res.msg : 'Nhập kho thất bại');
                }
            } catch (err) {
                window.api.alertError('Lỗi kết nối khi nhập kho');
            } finally {
                if (btn) {
                    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up me-2"></i> Xác nhận nhập kho';
                    btn.disabled = false;
                }
            }
        });
    }
}

// User Balance Adjustment Dialog
window.promptAdjustBalance = function(userId, username, currentBalance) {
    Swal.fire({
        title: `Cộng/Trừ tiền: ${username}`,
        html: `
            <div class="text-start">
                <p class="small text-muted mb-2">Số dư hiện tại: <strong>${currentBalance}</strong></p>
                <div class="mb-3">
                    <label class="form-label small fw-bold">Số tiền (Dương = Cộng, Âm = Trừ):</label>
                    <input type="number" id="swal-adjust-amount" class="form-control" placeholder="Ví dụ: 100000 hoặc -50000">
                </div>
                <div>
                    <label class="form-label small fw-bold">Lý do điều chỉnh:</label>
                    <input type="text" id="swal-adjust-note" class="form-control" placeholder="Admin cộng tiền thưởng sự kiện...">
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Xác nhận thay đổi',
        cancelButtonText: 'Hủy bỏ',
        confirmButtonColor: '#0d6efd',
        preConfirm: () => {
            const amount = document.getElementById('swal-adjust-amount').value;
            const note = document.getElementById('swal-adjust-note').value;
            if (!amount || parseInt(amount) === 0) {
                Swal.showValidationMessage('Vui lòng nhập số tiền hợp lệ khác 0!');
                return false;
            }
            return { amount: parseInt(amount), note: note };
        }
    }).then(async (result) => {
        if (result.isConfirmed && result.value) {
            try {
                const res = await window.api.post('/admin/users/balance', {
                    user_id: userId,
                    amount: result.value.amount,
                    note: result.value.note
                });

                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg);
                    if (typeof loadAdminUsers === 'function') loadAdminUsers();
                } else {
                    window.api.alertError(res ? res.msg : 'Thao tác thất bại');
                }
            } catch (e) {
                window.api.alertError('Lỗi cập nhật số dư');
            }
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    initAdminDashboard();
    setupStockImport();
});
