/**
 * Admin Controller - Order Management (admin/product-orders.html)
 */

let currentPage = 1;

async function loadAdminOrders(page = 1) {
    if (!window.auth.checkAuth('admin')) return;
    currentPage = page;

    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted"><i class="fa fa-spinner fa-spin me-2 text-primary"></i> Đang tải danh sách đơn hàng...</td></tr>';

    try {
        const res = await window.api.get('api/data.php', {
            action: 'admin_orders',
            page: page,
            limit: 20
        });

        if (res && res.status === 'success' && res.data) {
            renderOrdersTable(res.data, res.pagination);
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Không có đơn hàng nào</td></tr>';
        }
    } catch (e) {
        console.error('Error fetching admin orders:', e);
    }
}

function renderOrdersTable(orders, pagination) {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Chưa có đơn hàng nào</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td><strong>#${o.trans_id}</strong></td>
            <td><strong>${o.username || `#${o.buyer}`}</strong></td>
            <td>${o.product_name || 'Tài khoản'}</td>
            <td><span class="badge bg-secondary">${o.amount}</span></td>
            <td><strong class="text-danger">${o.pay_formatted || window.formatCurrency(o.pay)}</strong></td>
            <td><small class="text-muted">${o.create_gettime || o.create_date}</small></td>
            <td>
                <span class="badge ${o.status == 1 || o.status === 'completed' ? 'bg-success' : 'bg-warning'}">
                    ${o.status == 1 || o.status === 'completed' ? 'Thành công' : 'Đang xử lý'}
                </span>
            </td>
            <td class="text-end">
                <button class="btn btn-sm btn-info text-white me-1" onclick="viewAccounts('${o.trans_id}')" title="Xem tài khoản"><i class="fa-solid fa-eye"></i></button>
                <button class="btn btn-sm btn-warning text-dark me-1" onclick="refundOrder(${o.id})" title="Hoàn tiền"><i class="fa-solid fa-rotate-left"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteOrder('${o.trans_id}')" title="Xóa"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        </tr>
    `).join('');

    renderPagination(pagination);
}

function renderPagination(pagination) {
    const el = document.getElementById('orders-pagination');
    if (!el || !pagination || pagination.total_pages <= 1) {
        if (el) el.innerHTML = '';
        return;
    }

    let items = '';
    for (let i = 1; i <= pagination.total_pages; i++) {
        items += `
            <li class="page-item ${i === pagination.page ? 'active' : ''}">
                <button class="page-link" onclick="loadAdminOrders(${i})">${i}</button>
            </li>
        `;
    }

    el.innerHTML = `
        <ul class="pagination pagination-sm justify-content-center mb-0">
            <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="loadAdminOrders(${pagination.page - 1})">Trước</button>
            </li>
            ${items}
            <li class="page-item ${pagination.page === pagination.total_pages ? 'disabled' : ''}">
                <button class="page-link" onclick="loadAdminOrders(${pagination.page + 1})">Sau</button>
            </li>
        </ul>
    `;
}

window.viewAccounts = async function(transId) {
    try {
        const res = await window.api.post('ajaxs/admin/view.php', {
            action: 'view_order',
            trans_id: transId
        });
        if (res && res.status === 'success' && res.data) {
            Swal.fire({
                title: `Chi tiết đơn #${transId}`,
                html: `<textarea class="form-control font-monospace" rows="10" readonly>${res.data}</textarea>`,
                width: '600px',
                confirmButtonText: 'Đóng'
            });
        } else {
            window.api.alertError('Không thể tải dữ liệu tài khoản');
        }
    } catch(e) {
        console.error(e);
    }
};

window.refundOrder = function(orderId) {
    Swal.fire({
        title: 'Hoàn tiền đơn hàng này?',
        text: 'Số tiền sẽ được hoàn trả trực tiếp vào ví của người mua!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ffc107',
        confirmButtonText: 'Đồng ý hoàn tiền',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await window.api.post('ajaxs/admin/update.php', {
                    action: 'refundOrder',
                    id: orderId
                });
                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg || 'Hoàn tiền thành công');
                    loadAdminOrders(currentPage);
                } else {
                    window.api.alertError(res ? res.msg : 'Lỗi hoàn tiền');
                }
            } catch(e) {
                console.error(e);
            }
        }
    });
};

window.deleteOrder = function(transId) {
    Swal.fire({
        title: 'Xóa đơn hàng?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await window.api.post('ajaxs/admin/remove.php', {
                    action: 'removeOrder',
                    trans_id: transId
                });
                if (res && res.status === 'success') {
                    window.api.showToast(res.msg || 'Đã xóa');
                    loadAdminOrders(currentPage);
                } else {
                    window.api.alertError(res ? res.msg : 'Lỗi khi xóa');
                }
            } catch(e) {
                console.error(e);
            }
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    loadAdminOrders(1);
});
