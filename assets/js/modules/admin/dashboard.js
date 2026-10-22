/**
 * Admin Controller - Dashboard (admin/index.html / admin/home.html)
 */

async function loadAdminDashboard() {
    if (!window.auth.checkAuth('admin')) return;

    try {
        const res = await window.api.get('api/data.php', { action: 'admin_dashboard' });
        if (res && res.status === 'success' && res.data) {
            renderDashboardStats(res.data);
            renderRecentOrders(res.data.recent_orders || []);
            renderRecentUsers(res.data.recent_users || []);
        }
    } catch (e) {
        console.error('Error fetching admin dashboard:', e);
    }
}

function renderDashboardStats(data) {
    const totalUsersEl = document.getElementById('stat-total-users');
    if (totalUsersEl) totalUsersEl.innerText = (data.total_users || 0).toLocaleString();

    const totalOrdersEl = document.getElementById('stat-total-orders');
    if (totalOrdersEl) totalOrdersEl.innerText = (data.total_orders || 0).toLocaleString();

    const totalRevenueEl = document.getElementById('stat-total-revenue');
    if (totalRevenueEl) totalRevenueEl.innerText = data.total_revenue_formatted || window.formatCurrency(data.total_revenue || 0);

    const totalDepositsEl = document.getElementById('stat-total-deposits');
    if (totalDepositsEl) totalDepositsEl.innerText = data.total_deposits_formatted || window.formatCurrency(data.total_deposits || 0);
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
            <td><strong>#${o.trans_id}</strong></td>
            <td>${o.username ? `<strong>${o.username}</strong>` : `<span class="text-muted">User #${o.buyer}</span>`}</td>
            <td>${o.product_name || 'Tài khoản'}</td>
            <td><span class="badge bg-secondary">${o.amount}</span></td>
            <td><strong class="text-danger">${window.formatCurrency(o.pay)}</strong></td>
            <td><small class="text-muted">${o.create_gettime || o.create_date || ''}</small></td>
        </tr>
    `).join('');
}

function renderRecentUsers(users) {
    const tbody = document.getElementById('recent-users-table-body');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Chưa có thành viên nào</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr>
            <td>#${u.id}</td>
            <td><strong>${u.username}</strong></td>
            <td>${u.email || '<span class="text-muted">--</span>'}</td>
            <td><strong class="text-primary">${window.formatCurrency(u.money)}</strong></td>
            <td><small class="text-muted">${u.createdate || ''}</small></td>
        </tr>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    loadAdminDashboard();
});
