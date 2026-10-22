/**
 * Client Controller - Transactions Page (client/transactions.html)
 */

let currentPage = 1;

async function loadTransactions(page = 1) {
    if (!window.auth.checkAuth('user')) return;
    currentPage = page;

    const tbody = document.getElementById('transactions-table-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4 text-muted">
                <i class="fa fa-spinner fa-spin me-2 text-primary"></i> Đang tải biến động số dư...
            </td>
        </tr>
    `;

    try {
        const res = await window.api.get('api/data.php', {
            action: 'get_transactions',
            page: page,
            limit: 15
        });

        if (res && res.status === 'success' && res.data) {
            renderTransactionsTable(res.data, res.pagination);
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Không có lịch sử biến động số dư</td></tr>';
        }
    } catch (e) {
        console.error('Error fetching transactions:', e);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Lỗi khi tải dữ liệu</td></tr>';
    }
}

function renderTransactionsTable(rows, pagination) {
    const tbody = document.getElementById('transactions-table-body');
    if (!tbody) return;

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Chưa có giao dịch nào</td></tr>';
        return;
    }

    tbody.innerHTML = rows.map((r, idx) => {
        const isPlus = r.sotienthaydoi > 0;
        return `
            <tr>
                <td><small class="text-muted">${r.thoigian || r.createdate}</small></td>
                <td>${r.sotientruoc_formatted}</td>
                <td>
                    <strong class="${isPlus ? 'text-success' : 'text-danger'}">
                        ${isPlus ? '+' : ''}${r.sotienthaydoi_formatted}
                    </strong>
                </td>
                <td><strong>${r.sotiensau_formatted}</strong></td>
                <td><small>${r.noidung || ''}</small></td>
            </tr>
        `;
    }).join('');

    renderPagination(pagination);
}

function renderPagination(pagination) {
    const el = document.getElementById('transactions-pagination');
    if (!el || !pagination || pagination.total_pages <= 1) {
        if (el) el.innerHTML = '';
        return;
    }

    let items = '';
    for (let i = 1; i <= pagination.total_pages; i++) {
        items += `
            <li class="page-item ${i === pagination.page ? 'active' : ''}">
                <button class="page-link" onclick="loadTransactions(${i})">${i}</button>
            </li>
        `;
    }

    el.innerHTML = `
        <ul class="pagination pagination-sm justify-content-center mb-0">
            <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="loadTransactions(${pagination.page - 1})">Trước</button>
            </li>
            ${items}
            <li class="page-item ${pagination.page === pagination.total_pages ? 'disabled' : ''}">
                <button class="page-link" onclick="loadTransactions(${pagination.page + 1})">Sau</button>
            </li>
        </ul>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    loadTransactions(1);
});
