/**
 * Client Controller - Favorites Page (client/favorites.html)
 */

async function loadFavorites() {
    if (!window.auth.checkAuth('user')) return;

    const container = document.getElementById('favorites-container');
    if (!container) return;

    container.innerHTML = `
        <div class="col-12 text-center py-5 text-muted">
            <i class="fa fa-spinner fa-spin fa-2x text-primary mb-2"></i>
            <p>Đang tải danh sách yêu thích...</p>
        </div>
    `;

    try {
        const res = await window.api.get('api/data.php', { action: 'get_favorites' });
        if (res && res.status === 'success' && res.data) {
            renderFavorites(res.data, container);
        } else {
            container.innerHTML = '<div class="col-12 text-center py-5 text-muted">Bạn chưa lưu sản phẩm nào</div>';
        }
    } catch (e) {
        console.error('Error fetching favorites:', e);
    }
}

function renderFavorites(favs, container) {
    if (favs.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fa-regular fa-heart fs-1 text-muted mb-3"></i>
                <h5 class="text-muted">Danh sách yêu thích đang trống</h5>
                <a href="home.html" class="btn btn-primary btn-sm mt-2">Khám phá sản phẩm ngay</a>
            </div>
        `;
        return;
    }

    container.innerHTML = favs.map(f => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100 border-0 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title fw-bold">
                        <a href="product.html?slug=${f.slug}" class="text-decoration-none text-dark">${f.name}</a>
                    </h5>
                    <p class="card-text text-muted small">${f.short_desc || ''}</p>
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="badge bg-success-subtle text-success">Kho: ${f.stock}</span>
                        <strong class="text-danger fs-5">${f.sale_price_formatted}</strong>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="product.html?slug=${f.slug}" class="btn btn-sm btn-primary flex-grow-1"><i class="fa-solid fa-cart-shopping me-1"></i> Mua ngay</a>
                        <button class="btn btn-sm btn-outline-danger" onclick="removeFavorite(${f.product_id})" title="Xóa"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

window.removeFavorite = async function(productId) {
    try {
        const res = await window.api.post('ajaxs/client/remove.php', {
            action: 'removeFavorite',
            product_id: productId
        });
        if (res && res.status === 'success') {
            window.api.showToast(res.msg || 'Đã xóa khỏi danh sách yêu thích');
            await window.auth.syncUser();
            loadFavorites();
        } else {
            window.api.alertError(res ? res.msg : 'Không thể xóa');
        }
    } catch (e) {
        console.error(e);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadFavorites();
});
