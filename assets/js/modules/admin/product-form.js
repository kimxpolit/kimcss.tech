/**
 * Admin Controller - Product Add/Edit (admin/product-add.html, admin/product-edit.html)
 */

async function initProductForm() {
    if (!window.auth.checkAuth('admin')) return;

    // Load categories for dropdown
    try {
        const catRes = await window.api.get('api/data.php', { action: 'get_categories' });
        if (catRes && catRes.status === 'success' && catRes.data && catRes.data.all) {
            const select = document.getElementById('product-category-id');
            if (select) {
                select.innerHTML = '<option value="">-- Chọn chuyên mục --</option>' + catRes.data.all.map(c => `
                    <option value="${c.id}">${c.name}</option>
                `).join('');
            }
        }
    } catch (e) {
        console.error('Error fetching categories:', e);
    }

    // Check if editing existing product
    const urlParams = new URLSearchParams(window.location.search);
    const prodId = urlParams.get('id');

    if (prodId) {
        document.getElementById('product-id').value = prodId;
        const pageTitle = document.getElementById('page-action-title');
        if (pageTitle) pageTitle.innerText = 'Chỉnh sửa sản phẩm';

        try {
            const res = await window.api.get('api/data.php', {
                action: 'get_product',
                id: prodId
            });

            if (res && res.status === 'success' && res.data) {
                const p = res.data;
                document.getElementById('product-name').value = p.name || '';
                document.getElementById('product-price').value = p.price || 0;
                document.getElementById('product-cost').value = p.cost || 0;
                document.getElementById('product-discount').value = p.discount || 0;
                document.getElementById('product-stt').value = p.stt || 0;
                document.getElementById('product-short-desc').value = p.short_desc || '';
                document.getElementById('product-content').value = p.content || '';

                const catSelect = document.getElementById('product-category-id');
                if (catSelect) catSelect.value = p.category_id;

                const statusSelect = document.getElementById('product-status');
                if (statusSelect) statusSelect.value = p.status;
            }
        } catch (e) {
            console.error('Error loading product details:', e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initProductForm();

    const form = document.getElementById('form-product');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Đang lưu...';

            const payload = {
                action: 'admin_save_product',
                id: document.getElementById('product-id').value || 0,
                name: document.getElementById('product-name').value,
                category_id: document.getElementById('product-category-id').value,
                price: document.getElementById('product-price').value,
                cost: document.getElementById('product-cost').value,
                discount: document.getElementById('product-discount').value,
                stt: document.getElementById('product-stt').value,
                short_desc: document.getElementById('product-short-desc').value,
                content: document.getElementById('product-content').value,
                status: document.getElementById('product-status').value
            };

            try {
                const res = await window.api.post('api/data.php', payload);
                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg || 'Lưu sản phẩm thành công').then(() => {
                        window.location.href = 'products.html';
                    });
                } else {
                    window.api.alertError(res ? res.msg : 'Lưu sản phẩm thất bại');
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
