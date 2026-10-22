/**
 * Client Controller - Order Detail Page (client/product-order.html)
 */

let currentOrderData = null;

async function loadOrderDetail() {
    if (!window.auth.checkAuth('user')) return;

    const urlParams = new URLSearchParams(window.location.search);
    let transId = urlParams.get('trans_id');

    if (!transId) {
        const orders = window.MockDB ? window.MockDB.getOrders() : [];
        if (orders && orders.length > 0) {
            transId = orders[0].trans_id;
        } else {
            window.location.href = 'product-orders.html';
            return;
        }
    }

    try {
        const res = await window.api.get('api/data.php', {
            action: 'get_order_detail',
            trans_id: transId
        });

        if (res && res.status === 'success' && res.data) {
            currentOrderData = res.data;
            renderOrder(res.data);
        } else {
            document.getElementById('order-detail-container').innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fa-solid fa-circle-exclamation text-warning fs-1 mb-3"></i>
                    <h4>Đơn hàng không tồn tại hoặc bạn không có quyền xem</h4>
                    <a href="product-orders.html" class="btn btn-primary mt-3">Quay lại danh sách đơn hàng</a>
                </div>
            `;
        }
    } catch (e) {
        console.error('Error loading order:', e);
    }
}

function renderOrder(order) {
    document.title = `Đơn hàng #${order.trans_id} - ShopClone 7`;

    const transIdEl = document.getElementById('order-trans-id');
    if (transIdEl) transIdEl.innerText = order.trans_id;

    const dateEl = document.getElementById('order-date');
    if (dateEl) dateEl.innerText = order.create_gettime || order.create_date;

    const nameEl = document.getElementById('order-product-name');
    if (nameEl) nameEl.innerText = order.product ? order.product.name : 'Sản phẩm';

    const qtyEl = document.getElementById('order-qty');
    if (qtyEl) qtyEl.innerText = order.amount;

    const payEl = document.getElementById('order-pay');
    if (payEl) payEl.innerText = order.pay_formatted;

    const accountsContainer = document.getElementById('order-accounts-list');
    if (accountsContainer && order.accounts) {
        if (order.accounts.length === 0) {
            accountsContainer.innerHTML = '<div class="alert alert-info">Chưa có dữ liệu tài khoản cho đơn hàng này.</div>';
            return;
        }

        const accountsText = order.accounts.map(a => a.account).join('\n');
        document.getElementById('accounts-textarea').value = accountsText;

        accountsContainer.innerHTML = `
            <table class="table table-striped table-hover mb-0">
                <thead class="table-light">
                    <tr>
                        <th width="50">#</th>
                        <th>Thông tin tài khoản</th>
                        <th width="100" class="text-end">Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.accounts.map((a, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td><code>${escapeHtml(a.account)}</code></td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-outline-secondary" onclick="copySingle('${encodeURIComponent(a.account)}')">
                                    <i class="fa-solid fa-copy"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

window.copySingle = function(textEncoded) {
    const text = decodeURIComponent(textEncoded);
    navigator.clipboard.writeText(text).then(() => {
        window.api.showToast('Đã sao chép tài khoản vào bộ nhớ tạm');
    });
};

window.copyAllAccounts = function() {
    const textarea = document.getElementById('accounts-textarea');
    if (textarea && textarea.value) {
        navigator.clipboard.writeText(textarea.value).then(() => {
            window.api.alertSuccess('Đã sao chép toàn bộ danh sách tài khoản!');
        });
    }
};

window.downloadTxt = async function() {
    if (!currentOrderData) return;
    try {
        const res = await window.api.post('ajaxs/client/view.php', {
            action: 'download_order',
            trans_id: currentOrderData.trans_id
        });

        if (res && res.status === 'success' && res.accounts) {
            const blob = new Blob([res.accounts], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = res.filename || `${currentOrderData.trans_id}.txt`;
            link.click();
            URL.revokeObjectURL(link.href);
        } else {
            // Fallback download directly from textarea
            const textarea = document.getElementById('accounts-textarea');
            if (textarea && textarea.value) {
                const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${currentOrderData.trans_id}.txt`;
                link.click();
                URL.revokeObjectURL(link.href);
            }
        }
    } catch (e) {
        console.error('Download error:', e);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadOrderDetail();
});
