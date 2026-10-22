/**
 * CTV Controller - Products Management (ctv/products.html)
 */

async function loadCtvProducts() {
    if (!window.auth.checkAuth('ctv')) return;

    const tbody = document.getElementById('ctv-products-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fa fa-spinner fa-spin me-2 text-primary"></i> Đang tải sản phẩm...</td></tr>';

    try {
        const res = await window.api.get('api/data.php', { action: 'ctv_products' });
        if (res && res.status === 'success' && res.data) {
            renderCtvProductsTable(res.data);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Chưa có sản phẩm nào</td></tr>';
        }
    } catch (e) {
        console.error('Error fetching CTV products:', e);
    }
}

function renderCtvProductsTable(products) {
    const tbody = document.getElementById('ctv-products-table-body');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Bạn chưa đăng sản phẩm nào</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td>#${p.id}</td>
            <td>
                <strong>${p.name}</strong>
                <div class="small text-muted">${p.category_name || 'Không có chuyên mục'}</div>
            </td>
            <td><strong class="text-primary">${p.price_formatted}</strong></td>
            <td><span class="badge ${p.stock > 0 ? 'bg-success' : 'bg-danger'}">${p.stock}</span></td>
            <td>
                <span class="badge ${p.pending == 1 ? 'bg-warning' : (p.status == 1 ? 'bg-success' : 'bg-secondary')}">
                    ${p.pending == 1 ? 'Chờ duyệt' : (p.status == 1 ? 'Đang bán' : 'Tạm ẩn')}
                </span>
            </td>
            <td>${p.sold || 0}</td>
            <td class="text-end">
                <a href="product-stock.html?id=${p.id}" class="btn btn-sm btn-info text-white me-1" title="Kho hàng"><i class="fa-solid fa-boxes-stacked"></i></a>
                <a href="product-edit.html?id=${p.id}" class="btn btn-sm btn-primary me-1" title="Sửa"><i class="fa-solid fa-pen-to-square"></i></a>
                <button class="btn btn-sm btn-danger" onclick="deleteCtvProduct(${p.id})" title="Xóa"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        </tr>
    `).join('');
}

window.deleteCtvProduct = function(id) {
    Swal.fire({
        title: 'Xóa sản phẩm này?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await window.api.post('ajaxs/ctv/remove.php', {
                    action: 'removeProduct',
                    id: id
                });
                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg || 'Đã xóa sản phẩm');
                    loadCtvProducts();
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
    loadCtvProducts();
});
