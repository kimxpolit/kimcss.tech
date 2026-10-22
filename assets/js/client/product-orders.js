/**
 * Client Controller - Order History Page (client/product-orders.html)
 */

let currentPage = 1;
let currentTransId = '';

async function loadOrders(page = 1) {
    if (!window.auth.checkAuth('user')) return;
    currentPage = page;

    const tbody = document.getElementById('orders-table-body');
    const paginationEl = document.getElementById('orders-pagination');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4 text-muted">
                <i class="fa fa-spinner fa-spin me-2 text-primary"></i> Đang tải danh sách đơn hàng...
            </td>
        </tr>
    `;

    try {
        const res = await window.api.get('api/data.php', {
            action: 'get_orders',
            trans_id: currentTransId,
            page: page,
            limit: 10
        });

        if (res && res.status === 'success' && res.data) {
            renderOrdersTable(res.data, res.pagination);
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">Không có đơn hàng nào</td>
                </tr>
            `;
        }
    } catch (e) {
        console.error('Error fetching orders:', e);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-danger">Lỗi khi tải đơn hàng. Vui lòng thử lại!</td>
            </tr>
        `;
    }
}

function renderOrdersTable(orders, pagination) {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <i class="fa-solid fa-box-open fs-2 mb-2 text-muted"></i>
                    <p class="mb-0">Bạn chưa có đơn hàng nào</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = orders.map((o, idx) => `
        <tr>
            <td><strong>#${o.trans_id}</strong></td>
            <td><small class="text-muted">${o.create_gettime || o.create_date}</small></td>
            <td><strong>${o.product_name || 'Tài khoản'}</strong></td>
            <td><span class="badge bg-secondary">${o.amount}</span></td>
            <td><strong class="text-danger">${o.pay_formatted}</strong></td>
            <td>
                <span class="badge ${o.status === 'completed' || o.status == 1 ? 'bg-success' : 'bg-warning'}">
                    ${o.status === 'completed' || o.status == 1 ? 'Thành công' : 'Đang xử lý'}
                </span>
            </td>
            <td class="text-end">
                <a href="product-order.html?trans_id=${o.trans_id}" class="btn btn-sm btn-primary" title="Xem chi tiết">
                    <i class="fa-solid fa-eye me-1"></i> Xem
                </a>
                <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteOrder('${o.trans_id}')" title="Xóa khỏi lịch sử">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
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
                <button class="page-link" onclick="loadOrders(${i})">${i}</button>
            </li>
        `;
    }

    el.innerHTML = `
        <ul class="pagination pagination-sm justify-content-center mb-0">
            <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="loadOrders(${pagination.page - 1})">Trước</button>
            </li>
            ${items}
            <li class="page-item ${pagination.page === pagination.total_pages ? 'disabled' : ''}">
                <button class="page-link" onclick="loadOrders(${pagination.page + 1})">Sau</button>
            </li>
        </ul>
    `;
}

window.deleteOrder = function(transId) {
    Swal.fire({
        title: 'Xóa đơn hàng?',
        text: 'Đơn hàng sẽ được chuyển vào thùng rác',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await window.api.post('ajaxs/client/remove.php', {
                    action: 'removeOrder',
                    trans_id: transId
                });
                if (res && res.status === 'success') {
                    window.api.showToast(res.msg || 'Đã xóa đơn hàng thành công');
                    loadOrders(currentPage);
                } else {
                    window.api.alertError(res ? res.msg : 'Không thể xóa đơn hàng');
                }
            } catch (e) {
                console.error('Delete order error:', e);
            }
        }
    });
};

function setupFilters() {
    const searchInput = document.getElementById('search-trans-id');
    const searchBtn = document.getElementById('btn-search-order');
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            currentTransId = searchInput.value.trim();
            loadOrders(1);
        });
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                currentTransId = searchInput.value.trim();
                loadOrders(1);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupFilters();
    loadOrders(1);
});
