/**
 * CTV Controller - Dashboard (ctv/index.html)
 */

async function loadCtvDashboard() {
    if (!window.auth.checkAuth('ctv')) return;

    try {
        const res = await window.api.get('api/data.php', { action: 'ctv_dashboard' });
        if (res && res.status === 'success' && res.data) {
            const d = res.data;
            const elProducts = document.getElementById('stat-ctv-products');
            if (elProducts) elProducts.innerText = (d.total_products || 0).toLocaleString();

            const elOrders = document.getElementById('stat-ctv-orders');
            if (elOrders) elOrders.innerText = (d.total_orders || 0).toLocaleString();

            const elRevenue = document.getElementById('stat-ctv-revenue');
            if (elRevenue) elRevenue.innerText = d.total_revenue_formatted || window.formatCurrency(d.total_revenue || 0);

            const elBalance = document.getElementById('stat-ctv-balance');
            if (elBalance) elBalance.innerText = window.formatCurrency(d.user ? d.user.money : 0);
        }
    } catch (e) {
        console.error('Error fetching CTV dashboard:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCtvDashboard();
});
