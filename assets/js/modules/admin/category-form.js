/**
 * Admin Controller - Category Add/Edit (admin/category-add.html, admin/category-edit.html)
 */

async function initCategoryForm() {
    if (!window.auth.checkAuth('admin')) return;

    // Load parent category options
    try {
        const catRes = await window.api.get('api/data.php', { action: 'get_categories' });
        if (catRes && catRes.status === 'success' && catRes.data && catRes.data.parents) {
            const select = document.getElementById('category-parent-id');
            if (select) {
                select.innerHTML = '<option value="0">-- Là chuyên mục gốc (Cha) --</option>' + catRes.data.parents.map(c => `
                    <option value="${c.id}">${c.name}</option>
                `).join('');
            }
        }
    } catch (e) {
        console.error('Error fetching categories:', e);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const catId = urlParams.get('id');

    if (catId) {
        document.getElementById('category-id').value = catId;
        const pageTitle = document.getElementById('page-action-title');
        if (pageTitle) pageTitle.innerText = 'Chỉnh sửa chuyên mục';

        try {
            const catRes = await window.api.get('api/data.php', { action: 'get_categories' });
            if (catRes && catRes.status === 'success' && catRes.data && catRes.data.all) {
                const c = catRes.data.all.find(item => item.id == catId);
                if (c) {
                    document.getElementById('category-name').value = c.name || '';
                    document.getElementById('category-slug').value = c.slug || '';
                    document.getElementById('category-icon').value = c.icon || '';
                    document.getElementById('category-stt').value = c.stt || 0;

                    const parentSelect = document.getElementById('category-parent-id');
                    if (parentSelect) parentSelect.value = c.parent_id;

                    const statusSelect = document.getElementById('category-status');
                    if (statusSelect) statusSelect.value = c.status;
                }
            }
        } catch (e) {
            console.error('Error loading category details:', e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initCategoryForm();

    const nameInput = document.getElementById('category-name');
    const slugInput = document.getElementById('category-slug');
    if (nameInput && slugInput) {
        nameInput.addEventListener('input', () => {
            if (!document.getElementById('category-id').value) {
                slugInput.value = nameInput.value.toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)+/g, '');
            }
        });
    }

    const form = document.getElementById('form-category');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Đang lưu...';

            const payload = {
                action: 'admin_save_category',
                id: document.getElementById('category-id').value || 0,
                name: document.getElementById('category-name').value,
                slug: document.getElementById('category-slug').value,
                icon: document.getElementById('category-icon').value,
                parent_id: document.getElementById('category-parent-id').value,
                stt: document.getElementById('category-stt').value,
                status: document.getElementById('category-status').value
            };

            try {
                const res = await window.api.post('api/data.php', payload);
                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg || 'Lưu chuyên mục thành công').then(() => {
                        window.location.href = 'categories.html';
                    });
                } else {
                    window.api.alertError(res ? res.msg : 'Lưu chuyên mục thất bại');
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
