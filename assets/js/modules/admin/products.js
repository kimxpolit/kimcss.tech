/**
 * Admin Controller - Products Management (admin/products.html)
 */

async function loadAdminProducts() {
    if (!window.auth.checkAuth('admin')) return;

    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted"><i class="fa fa-spinner fa-spin me-2 text-primary"></i> Đang tải danh sách sản phẩm...</td></tr>';

    try {
        const res = await window.api.get('api/data.php', { action: 'admin_products' });
        if (res && res.status === 'success' && res.data) {
            renderProductsTable(res.data);
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Chưa có sản phẩm nào</td></tr>';
        }
    } catch (e) {
        console.error('Error fetching admin products:', e);
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Không tìm thấy sản phẩm</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td>#${p.id}</td>
            <td>
                <strong>${p.name}</strong>
                <div class="small text-muted">${p.category_name || 'Không có chuyên mục'}</div>
            </td>
            <td><strong>${p.price_formatted}</strong></td>
            <td><span class="badge ${p.discount > 0 ? 'bg-danger' : 'bg-secondary'}">${p.discount}%</span></td>
            <td><span class="badge ${p.stock > 0 ? 'bg-success' : 'bg-danger'}">${p.stock}</span></td>
            <td>${p.sold || 0}</td>
            <td>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" ${p.status == 1 ? 'checked' : ''} onchange="toggleProductStatus(${p.id})">
                </div>
            </td>
            <td class="text-end">
                <a href="product-stock.html?id=${p.id}" class="btn btn-sm btn-info text-white me-1" title="Quản lý kho"><i class="fa-solid fa-boxes-stacked"></i></a>
                <a href="product-edit.html?id=${p.id}" class="btn btn-sm btn-primary me-1" title="Chỉnh sửa"><i class="fa-solid fa-pen-to-square"></i></a>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})" title="Xóa"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        </tr>
    `).join('');
}

window.toggleProductStatus = async function(id) {
    try {
        const res = await window.api.post('ajaxs/admin/update.php', {
            action: 'update_status_product',
            id: id
        });
        if (res && res.status === 'success') {
            window.api.showToast(res.msg || 'Cập nhật trạng thái thành công');
        } else {
            window.api.alertError(res ? res.msg : 'Cập nhật thất bại');
            loadAdminProducts();
        }
    } catch(e) {
        console.error(e);
    }
};

window.deleteProduct = function(id) {
    Swal.fire({
        title: 'Xóa sản phẩm này?',
        text: 'Thao tác này sẽ xóa vĩnh viễn sản phẩm và tồn kho liên quan!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await window.api.post('ajaxs/admin/remove.php', {
                    action: 'removeProduct',
                    id: id
                });
                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg || 'Đã xóa sản phẩm thành công');
                    loadAdminProducts();
                } else {
                    window.api.alertError(res ? res.msg : 'Không thể xóa sản phẩm');
                }
            } catch(e) {
                console.error(e);
            }
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    loadAdminProducts();
});
