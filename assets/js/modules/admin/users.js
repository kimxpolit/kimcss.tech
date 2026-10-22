/**
 * Admin Controller - User Management (admin/users.html)
 */

let currentPage = 1;
let searchKeyword = '';

async function loadAdminUsers(page = 1) {
    if (!window.auth.checkAuth('admin')) return;
    currentPage = page;

    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted"><i class="fa fa-spinner fa-spin me-2 text-primary"></i> Đang tải danh sách người dùng...</td></tr>';

    try {
        const res = await window.api.get('api/data.php', {
            action: 'admin_users',
            keyword: searchKeyword,
            page: page,
            limit: 20
        });

        if (res && res.status === 'success' && res.data) {
            renderUsersTable(res.data, res.pagination);
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Không tìm thấy người dùng</td></tr>';
        }
    } catch (e) {
        console.error('Error fetching admin users:', e);
    }
}

function renderUsersTable(users, pagination) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Chưa có người dùng nào</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr>
            <td>#${u.id}</td>
            <td>
                <strong>${u.username}</strong>
                ${u.admin > 0 ? '<span class="badge bg-danger ms-1">Admin</span>' : (u.ctv > 0 ? '<span class="badge bg-info ms-1">CTV</span>' : '')}
            </td>
            <td>${u.email || '<span class="text-muted">--</span>'}</td>
            <td><strong class="text-primary">${u.money_formatted || window.formatCurrency(u.money)}</strong></td>
            <td><span class="badge bg-secondary">${u.discount}%</span></td>
            <td>
                <span class="badge ${u.banned == 1 ? 'bg-danger' : 'bg-success'}">
                    ${u.banned == 1 ? 'Khóa' : 'Hoạt động'}
                </span>
            </td>
            <td><small class="text-muted">${u.createdate || ''}</small></td>
            <td class="text-end">
                <button class="btn btn-sm btn-success me-1" onclick="openBalanceModal(${u.id}, '${u.username}')" title="Cộng/Trừ tiền"><i class="fa-solid fa-wallet"></i></button>
                <a href="user-edit.html?id=${u.id}" class="btn btn-sm btn-primary me-1" title="Chỉnh sửa"><i class="fa-solid fa-user-pen"></i></a>
                <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id}, '${u.username}')" title="Xóa"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        </tr>
    `).join('');

    renderPagination(pagination);
}

function renderPagination(pagination) {
    const el = document.getElementById('users-pagination');
    if (!el || !pagination || pagination.total_pages <= 1) {
        if (el) el.innerHTML = '';
        return;
    }

    let items = '';
    for (let i = 1; i <= pagination.total_pages; i++) {
        items += `
            <li class="page-item ${i === pagination.page ? 'active' : ''}">
                <button class="page-link" onclick="loadAdminUsers(${i})">${i}</button>
            </li>
        `;
    }

    el.innerHTML = `
        <ul class="pagination pagination-sm justify-content-center mb-0">
            <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="loadAdminUsers(${pagination.page - 1})">Trước</button>
            </li>
            ${items}
            <li class="page-item ${pagination.page === pagination.total_pages ? 'disabled' : ''}">
                <button class="page-link" onclick="loadAdminUsers(${pagination.page + 1})">Sau</button>
            </li>
        </ul>
    `;
}

window.openBalanceModal = function(id, username) {
    Swal.fire({
        title: `Điều chỉnh số dư: ${username}`,
        html: `
            <div class="mb-3 text-start">
                <label class="form-label">Loại thao tác</label>
                <select id="swal-money-type" class="form-select">
                    <option value="add">Cộng tiền (+)</option>
                    <option value="sub">Trừ tiền (-)</option>
                </select>
            </div>
            <div class="mb-3 text-start">
                <label class="form-label">Số tiền (VNĐ)</label>
                <input type="number" id="swal-money-amount" class="form-control" placeholder="Ví dụ: 50000" min="1000">
            </div>
            <div class="mb-3 text-start">
                <label class="form-label">Lý do</label>
                <input type="text" id="swal-money-reason" class="form-control" placeholder="Lý do điều chỉnh">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Hủy',
        preConfirm: () => {
            const type = document.getElementById('swal-money-type').value;
            const amount = parseFloat(document.getElementById('swal-money-amount').value);
            const reason = document.getElementById('swal-money-reason').value;
            if (!amount || amount <= 0) {
                Swal.showValidationMessage('Vui lòng nhập số tiền hợp lệ');
                return false;
            }
            return { type, amount, reason };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await window.api.post('api/data.php', {
                    action: 'admin_change_money',
                    id: id,
                    type: result.value.type,
                    amount: result.value.amount,
                    reason: result.value.reason
                });
                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg);
                    loadAdminUsers(currentPage);
                } else {
                    window.api.alertError(res ? res.msg : 'Thao tác thất bại');
                }
            } catch(e) {
                console.error(e);
            }
        }
    });
};

window.deleteUser = function(id, username) {
    Swal.fire({
        title: `Xóa thành viên: ${username}?`,
        text: 'Lưu ý: Hành động này không thể hoàn tác!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await window.api.post('ajaxs/admin/remove.php', {
                    action: 'removeUser',
                    id: id
                });
                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg || 'Đã xóa người dùng thành công');
                    loadAdminUsers(currentPage);
                } else {
                    window.api.alertError(res ? res.msg : 'Không thể xóa');
                }
            } catch(e) {
                console.error(e);
            }
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('user-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchKeyword = e.target.value;
            loadAdminUsers(1);
        });
    }

    loadAdminUsers(1);
});
