/**
 * ShopClone 7 - Orders Page Controller (public/orders.html)
 * Real Orders & Credential Delivery from SQL Server
 */

async function loadOrders() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4 text-muted">
                <i class="fa fa-spinner fa-spin me-2 text-primary"></i> Đang tải danh sách đơn hàng...
            </td>
        </tr>
    `;

    let serverOrders = [];
    try {
        if (window.auth && window.auth.isLoggedIn && window.auth.isLoggedIn()) {
            const res = await window.api.get('/orders');
            if (res && res.status === 'success' && res.data) {
                serverOrders = res.data;
            }
        }
    } catch (e) {
        console.warn('Không tải được đơn hàng từ server, sử dụng đơn hàng cục bộ:', e);
    }

    // Đọc thêm đơn hàng cục bộ từ localStorage (được tạo từ trang checkout.html)
    let localOrders = [];
    try {
        const raw = localStorage.getItem('shopclone_orders');
        if (raw) {
            const parsed = JSON.parse(raw);
            localOrders = parsed.map(o => ({
                order_code: o.order_code,
                created_at_formatted: new Date(o.created_at).toLocaleString('vi-VN'),
                product_name: o.items && o.items.length > 0 
                    ? o.items.map(i => i.name).join(', ') 
                    : 'Đơn hàng mua sắm',
                quantity: o.summary ? o.summary.totalItems : (o.items ? o.items.length : 1),
                pay_formatted: Number(o.summary ? o.summary.grandTotal : 0).toLocaleString('vi-VN') + ' ₫',
                is_local: true,
                items: o.items
            }));
        }
    } catch (e) {
        console.error('Lỗi đọc đơn hàng local:', e);
    }

    const allOrders = [...localOrders, ...serverOrders];
    renderOrdersTable(allOrders);
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <i class="fa-solid fa-box-open fs-2 mb-2 text-muted"></i>
                    <p class="mb-0">Bạn chưa mua đơn hàng nào</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><strong>#${o.order_code}</strong></td>
            <td><small class="text-muted">${o.created_at_formatted}</small></td>
            <td><strong>${o.product_name}</strong></td>
            <td><span class="badge bg-secondary">${o.quantity}</span></td>
            <td><strong class="text-danger">${o.pay_formatted}</strong></td>
            <td><span class="badge bg-success">Thành công</span></td>
            <td class="text-end">
                <div class="d-inline-flex gap-1">
                    <button class="btn btn-sm btn-primary rounded-pill px-3" onclick="viewOrderDetail('${o.order_code}')">
                        <i class="fa-solid fa-eye me-1"></i> Xem tài khoản
                    </button>
                    <button class="btn btn-sm btn-outline-success rounded-pill px-3" onclick="quickDownloadTxt('${o.order_code}')">
                        <i class="fa-solid fa-download me-1"></i> Tải file .txt
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.quickDownloadTxt = async function(orderCode) {
    try {
        const res = await window.api.get(`/orders/${orderCode}`);
        if (res && res.status === 'success' && res.data) {
            const accounts = res.data.accounts || [];
            const accountsText = accounts.map(a => a.account).join('\n');
            const blob = new Blob([accountsText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `DonHang_${orderCode}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            window.api.showToast(`Đã tải file .txt cho đơn hàng #${orderCode}`, 'success');
        } else {
            window.api.alertError('Không tìm thấy dữ liệu đơn hàng!');
        }
    } catch (e) {
        window.api.alertError('Lỗi kết nối khi tải file!');
    }
};

window.viewOrderDetail = async function(orderCode) {
    try {
        const res = await window.api.get(`/orders/${orderCode}`);
        if (res && res.status === 'success' && res.data) {
            const o = res.data;
            const accounts = o.accounts || [];
            const accountsText = accounts.map(a => a.account).join('\n');

            Swal.fire({
                title: `<i class="fa-solid fa-file-invoice text-primary me-2"></i> Đơn hàng #${o.order_code}`,
                html: `
                    <div class="text-start">
                        <div class="card bg-light border-0 p-3 mb-3 rounded-3">
                            <p class="mb-1">Sản phẩm: <strong>${o.product_name}</strong></p>
                            <p class="mb-1">Số lượng: <strong>${o.quantity}</strong> | Tổng tiền: <strong class="text-danger">${o.pay_formatted}</strong></p>
                            <p class="mb-0 small text-muted">Thời gian mua: ${o.created_at_formatted}</p>
                        </div>

                        <label class="form-label fw-bold small">Dữ liệu tài khoản:</label>
                        <textarea id="modal-order-accounts" class="form-control form-control-sm font-monospace mb-3" rows="7" readonly>${accountsText}</textarea>

                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-secondary w-50" onclick="copyModalOrderAccounts()">
                                <i class="fa-solid fa-copy me-1"></i> Sao chép tất cả
                            </button>
                            <button class="btn btn-outline-primary w-50" onclick="downloadOrderTxt('${o.order_code}')">
                                <i class="fa-solid fa-download me-1"></i> Tải file .TXT
                            </button>
                        </div>
                    </div>
                `,
                width: 650,
                confirmButtonText: 'Đóng',
                confirmButtonColor: '#6c757d'
            });
        } else {
            window.api.alertError(res ? res.msg : 'Không tải được chi tiết đơn hàng');
        }
    } catch (e) {
        window.api.alertError('Lỗi kết nối khi tải đơn hàng');
    }
};

window.copyModalOrderAccounts = function() {
    const el = document.getElementById('modal-order-accounts');
    if (el) {
        el.select();
        navigator.clipboard.writeText(el.value).then(() => {
            window.api.showToast('Đã sao chép danh sách tài khoản!', 'success');
        });
    }
};

window.downloadOrderTxt = function(orderCode) {
    const el = document.getElementById('modal-order-accounts');
    if (!el) return;
    const blob = new Blob([el.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DonHang_${orderCode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
});
