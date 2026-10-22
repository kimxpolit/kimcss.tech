/**
 * Admin Controller - Categories Management (admin/categories.html)
 */

async function loadAdminCategories() {
    if (!window.auth.checkAuth('admin')) return;

    const tbody = document.getElementById('categories-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fa fa-spinner fa-spin me-2 text-primary"></i> Đang tải chuyên mục...</td></tr>';

    try {
        const res = await window.api.get('api/data.php', { action: 'get_categories' });
        if (res && res.status === 'success' && res.data && res.data.all) {
            renderCategoriesTable(res.data.all);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Chưa có chuyên mục nào</td></tr>';
        }
    } catch (e) {
        console.error('Error fetching categories:', e);
    }
}

function renderCategoriesTable(categories) {
    const tbody = document.getElementById('categories-table-body');
    if (!tbody) return;

    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Chưa có chuyên mục nào</td></tr>';
        return;
    }

    tbody.innerHTML = categories.map(c => `
        <tr>
            <td>#${c.id}</td>
            <td>
                <img src="../${c.icon || 'assets/img/icon.png'}" onerror="this.src='https://placehold.co/32x32?text=Cat'" width="28" height="28" class="me-2 rounded">
                <strong>${c.name}</strong>
            </td>
            <td><code>${c.slug}</code></td>
            <td>${c.parent_id == 0 ? '<span class="badge bg-primary">Chuyên mục cha</span>' : `<span class="badge bg-secondary">Con của #${c.parent_id}</span>`}</td>
            <td><span class="badge bg-light text-dark">${c.stt || 0}</span></td>
            <td>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" ${c.status == 1 ? 'checked' : ''} onchange="toggleCategoryStatus(${c.id})">
                </div>
            </td>
            <td class="text-end">
                <a href="category-edit.html?id=${c.id}" class="btn btn-sm btn-primary me-1"><i class="fa-solid fa-pen-to-square"></i></a>
                <button class="btn btn-sm btn-danger" onclick="deleteCategory(${c.id})"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        </tr>
    `).join('');
}

window.toggleCategoryStatus = async function(id) {
    try {
        const res = await window.api.post('ajaxs/admin/update.php', {
            action: 'update_status_category',
            id: id
        });
        if (res && res.status === 'success') {
            window.api.showToast(res.msg || 'Cập nhật trạng thái thành công');
        } else {
            window.api.alertError(res ? res.msg : 'Lỗi cập nhật');
            loadAdminCategories();
        }
    } catch(e) {
        console.error(e);
    }
};

window.deleteCategory = function(id) {
    Swal.fire({
        title: 'Xóa chuyên mục này?',
        text: 'Lưu ý: Tất cả sản phẩm trong chuyên mục có thể bị ảnh hưởng!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await window.api.post('ajaxs/admin/remove.php', {
                    action: 'removeCategory',
                    id: id
                });
                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg || 'Đã xóa chuyên mục');
                    loadAdminCategories();
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
    loadAdminCategories();
});
