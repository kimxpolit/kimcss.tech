/**
 * CTV Controller - Product Add/Edit (ctv/product-add.html, ctv/product-edit.html)
 */

async function initCtvProductForm() {
    if (!window.auth.checkAuth('ctv')) return;

    // Load categories
    try {
        const catRes = await window.api.get('api/data.php', { action: 'get_categories' });
        if (catRes && catRes.status === 'success' && catRes.data && catRes.data.all) {
            const select = document.getElementById('ctv-product-category-id');
            if (select) {
                select.innerHTML = '<option value="">-- Chọn chuyên mục --</option>' + catRes.data.all.map(c => `
                    <option value="${c.id}">${c.name}</option>
                `).join('');
            }
        }
    } catch (e) {
        console.error('Error fetching categories:', e);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const prodId = urlParams.get('id');

    if (prodId) {
        document.getElementById('ctv-product-id').value = prodId;
        const pageTitle = document.getElementById('page-action-title');
        if (pageTitle) pageTitle.innerText = 'Chỉnh sửa sản phẩm';

        try {
            const res = await window.api.get('api/data.php', {
                action: 'get_product',
                id: prodId
            });

            if (res && res.status === 'success' && res.data) {
                const p = res.data;
                document.getElementById('ctv-product-name').value = p.name || '';
                document.getElementById('ctv-product-price').value = p.price || 0;
                document.getElementById('ctv-product-short-desc').value = p.short_desc || '';
                document.getElementById('ctv-product-content').value = p.content || '';

                const catSelect = document.getElementById('ctv-product-category-id');
                if (catSelect) catSelect.value = p.category_id;
            }
        } catch (e) {
            console.error('Error loading product details:', e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initCtvProductForm();

    const form = document.getElementById('form-ctv-product');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Đang gửi...';

            const payload = {
                action: 'ctv_save_product',
                id: document.getElementById('ctv-product-id').value || 0,
                name: document.getElementById('ctv-product-name').value,
                category_id: document.getElementById('ctv-product-category-id').value,
                price: document.getElementById('ctv-product-price').value,
                short_desc: document.getElementById('ctv-product-short-desc').value,
                content: document.getElementById('ctv-product-content').value
            };

            try {
                const res = await window.api.post('api/data.php', payload);
                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg || 'Thành công').then(() => {
                        window.location.href = 'products.html';
                    });
                } else {
                    window.api.alertError(res ? res.msg : 'Thao tác thất bại');
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
