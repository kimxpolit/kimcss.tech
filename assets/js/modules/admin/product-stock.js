/**
 * Product Stock Controller (admin/product-stock.html, ctv/product-stock.html)
 */

let currentStockPage = 1;

async function loadProductStock(page = 1) {
    currentStockPage = page;
    const urlParams = new URLSearchParams(window.location.search);
    const prodId = urlParams.get('id');
    const prodCode = urlParams.get('code');

    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted"><i class="fa fa-spinner fa-spin me-2 text-primary"></i> Đang tải kho hàng...</td></tr>';

    try {
        const res = await window.api.get('api/data.php', {
            action: 'get_product_stock',
            id: prodId,
            code: prodCode,
            page: page,
            limit: 50
        });

        if (res && res.status === 'success') {
            if (res.product) {
                const titleEl = document.getElementById('stock-product-name');
                if (titleEl) titleEl.innerText = res.product.name;
                const totalEl = document.getElementById('stock-total-count');
                if (totalEl) totalEl.innerText = res.total;
                document.getElementById('stock-product-id').value = res.product.id;
            }
            renderStockTable(res.data || []);
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Không tìm thấy kho hàng</td></tr>';
        }
    } catch (e) {
        console.error('Error fetching product stock:', e);
    }
}

function renderStockTable(stocks) {
    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;

    if (stocks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Kho hàng đang trống. Vui lòng thêm tài khoản bên dưới.</td></tr>';
        return;
    }

    tbody.innerHTML = stocks.map((s, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td><code>${s.uid}</code></td>
            <td class="font-monospace"><small>${s.account}</small></td>
            <td class="text-end">
                <button class="btn btn-sm btn-danger" onclick="deleteStockItem(${s.id})" title="Xóa tài khoản"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        </tr>
    `).join('');
}

window.deleteStockItem = async function(stockId) {
    try {
        const res = await window.api.post('api/data.php', {
            action: 'remove_product_stock',
            stock_id: stockId
        });
        if (res && res.status === 'success') {
            window.api.showToast(res.msg);
            loadProductStock(currentStockPage);
        } else {
            window.api.alertError(res ? res.msg : 'Xóa thất bại');
        }
    } catch(e) {
        console.error(e);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadProductStock(1);

    const form = document.getElementById('form-add-stock');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Đang nhập kho...';

            const prodId = document.getElementById('stock-product-id').value;
            const accounts = document.getElementById('stock-accounts-input').value;

            try {
                const res = await window.api.post('api/data.php', {
                    action: 'add_product_stock',
                    id: prodId,
                    accounts: accounts
                });

                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg);
                    document.getElementById('stock-accounts-input').value = '';
                    loadProductStock(1);
                } else {
                    window.api.alertError(res ? res.msg : 'Nhập kho thất bại');
                }
            } catch (err) {
                console.error(err);
            } finally {
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        });
    }
});
