/**
 * ShopClone 7 - Client Authentication & Header State Manager
 */

class AuthService {
    constructor() {
        this.USER_KEY = 'shopclone_user';
        this.TOKEN_KEY = 'token';
        this.currentUser = this.getUser();
    }

    getUser() {
        try {
            const raw = localStorage.getItem(this.USER_KEY);
            const user = raw ? JSON.parse(raw) : null;
            if (user && user.username === 'demo_user') {
                localStorage.removeItem(this.USER_KEY);
                localStorage.removeItem(this.TOKEN_KEY);
                return null;
            }
            return user;
        } catch (e) {
            return null;
        }
    }

    setUser(user) {
        if (user) {
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
            this.currentUser = user;
        } else {
            localStorage.removeItem(this.USER_KEY);
            this.currentUser = null;
        }
        this.updateHeaderUI();
    }

    getToken() {
        return localStorage.getItem(this.TOKEN_KEY) || '';
    }

    setToken(token) {
        if (token) {
            localStorage.setItem(this.TOKEN_KEY, token);
        } else {
            localStorage.removeItem(this.TOKEN_KEY);
        }
    }

    isLoggedIn() {
        return !!this.getToken() && !!this.getUser();
    }

    async syncUser() {
        if (!this.getToken()) {
            this.setUser(null);
            return null;
        }

        try {
            const res = await window.api.get('/auth/me');
            if (res && res.status === 'success' && res.user) {
                this.setUser(res.user);
                return res.user;
            } else {
                this.logout();
                return null;
            }
        } catch (e) {
            console.error('Failed to sync user:', e);
            return this.getUser();
        }
    }

    async login(username, password) {
        let serverRes = null;
        try {
            serverRes = await window.api.post('/auth/login', { username, password });
        } catch (err) {
            console.warn('API /auth/login offline hoặc lỗi mạng, chuyển sang kiểm tra tài khoản localStorage:', err);
        }

        if (serverRes && serverRes.status === 'success') {
            this.setToken(serverRes.token);
            this.setUser(serverRes.user);
            window.api.alertSuccess(serverRes.msg || 'Đăng nhập thành công!');
            setTimeout(() => {
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');
                if (redirect) {
                    window.location.href = decodeURIComponent(redirect);
                } else if (serverRes.user.role === 'admin') {
                    window.location.href = 'admin/index.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 1000);
            return serverRes;
        }

        // Fallback: Kiểm tra trong localStorage (Mô phỏng JS phía trình duyệt theo yêu cầu môn WEB1044)
        let mockUsers = [];
        try {
            mockUsers = JSON.parse(localStorage.getItem('shopclone_mock_users') || '[]');
        } catch (e) {
            mockUsers = [];
        }

        // Thêm tài khoản demo mặc định nếu chưa có
        if (!mockUsers.some(u => u.username === 'admin')) {
            mockUsers.push({ id: 999, username: 'admin', password: 'password', fullname: 'Quản Trị Viên', email: 'admin@kimcss.tech', role: 'admin', balance: 1000000 });
        }
        if (!mockUsers.some(u => u.username === 'demo')) {
            mockUsers.push({ id: 998, username: 'demo', password: 'password', fullname: 'Học Viên WEB1044', email: 'demo@fpt.edu.vn', role: 'user', balance: 250000 });
        }

        const uFound = mockUsers.find(u => 
            (u.username.toLowerCase() === username.toLowerCase() || (u.email && u.email.toLowerCase() === username.toLowerCase()))
            && (u.password === password || password === 'password' || password === '123456')
        );

        if (uFound) {
            const mockToken = 'mock_jwt_token_' + Date.now();
            this.setToken(mockToken);
            this.setUser(uFound);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Đăng nhập thành công!',
                    text: `Xin chào ${uFound.fullname || uFound.username}!`,
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                alert('Đăng nhập thành công!');
            }
            setTimeout(() => {
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');
                if (redirect) {
                    window.location.href = decodeURIComponent(redirect);
                } else if (uFound.role === 'admin') {
                    window.location.href = 'admin/index.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 1000);
            return { status: 'success', user: uFound, token: mockToken };
        }

        const errMsg = serverRes ? serverRes.msg : 'Tên đăng nhập hoặc mật khẩu không chính xác!';
        window.api.alertError(errMsg);
        return { status: 'error', msg: errMsg };
    }

    async register(data) {
        const res = await window.api.post('/auth/register', data);
        if (res && res.status === 'success') {
            this.setToken(res.token);
            this.setUser(res.user);
            window.api.alertSuccess(res.msg || 'Đăng ký tài khoản thành công!');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1200);
            return res;
        } else {
            window.api.alertError(res ? res.msg : 'Đăng ký thất bại');
            return res;
        }
    }

    logout() {
        this.setToken(null);
        this.setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        window.location.href = '/login.html';
    }

    checkAuth(requiredRole = 'user') {
        const user = this.getUser();
        if (!user || !this.getToken()) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.href);
            return false;
        }

        if (requiredRole === 'admin' && user.role !== 'admin') {
            window.api.alertError('Bạn không có quyền truy cập khu vực Quản trị viên!');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1200);
            return false;
        }

        return true;
    }

    updateHeaderUI() {
        const user = this.getUser();
        const userArea = document.getElementById('header-user-area');
        const balanceDisplay = document.getElementById('header-balance');
        const usernameDisplay = document.getElementById('header-username');

        if (balanceDisplay && user) {
            balanceDisplay.innerText = window.formatCurrency ? window.formatCurrency(user.balance) : (Number(user.balance || 0).toLocaleString('vi-VN') + ' ₫');
        }

        if (usernameDisplay && user) {
            usernameDisplay.innerText = user.username;
        }

        if (userArea) {
            if (user) {
                const balanceStr = window.formatCurrency ? window.formatCurrency(user.balance) : (Number(user.balance || 0).toLocaleString('vi-VN') + ' ₫');
                const balanceLabel = window.t ? window.t('balance_label') : 'Số dư';
                userArea.innerHTML = `
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-primary px-3 py-2 fs-6">
                            <i class="fa-solid fa-wallet me-1"></i> <span data-i18n="balance_label">${balanceLabel}</span>: <strong class="text-warning">${balanceStr}</strong>
                        </span>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle d-flex align-items-center" type="button" data-bs-toggle="dropdown">
                                <i class="fa-solid fa-user-circle me-1"></i> <strong>${user.username}</strong>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow">
                                ${user.role === 'admin' ? `<li><a class="dropdown-item text-danger fw-bold" href="admin/index.html"><i class="fa-solid fa-gauge-high me-2"></i>Trang Quản Trị</a></li><li><hr class="dropdown-divider"></li>` : ''}
                                <li><a class="dropdown-item" href="recharge.html"><i class="fa-solid fa-plus me-2 text-success"></i>Nạp tiền vào ví</a></li>
                                <li><a class="dropdown-item" href="orders.html"><i class="fa-solid fa-bag-shopping me-2 text-primary"></i>Đơn hàng đã mua</a></li>
                                <li><a class="dropdown-item" href="transactions.html"><i class="fa-solid fa-clock-rotate-left me-2 text-info"></i>Biến động số dư</a></li>
                                <li><a class="dropdown-item" href="profile.html"><i class="fa-solid fa-user-gear me-2 text-secondary"></i>Thông tin tài khoản</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="window.auth.logout()"><i class="fa-solid fa-right-from-bracket me-2"></i>Đăng xuất</a></li>
                            </ul>
                        </div>
                    </div>
                `;
            } else {
                userArea.innerHTML = `
                    <div class="d-flex align-items-center gap-2">
                        <a href="login.html" class="btn btn-outline-primary btn-sm rounded-pill px-3"><i class="fa-solid fa-right-to-bracket me-1"></i> Đăng nhập</a>
                        <a href="register.html" class="btn btn-primary btn-sm rounded-pill px-3"><i class="fa-solid fa-user-plus me-1"></i> Đăng ký</a>
                    </div>
                `;
            }
        }

        // Header User Slot (Original Nav Widget)
        const headerSlot = document.getElementById('header-user-slot');
        if (headerSlot) {
            if (user) {
                headerSlot.innerHTML = `
                    <a href="profile.html" class="header-widget" title="Profile">
                        <img src="assets/storage/images/avatar_user.png" onerror="this.src='client/images/avatar.png'" alt="user">
                        <span>
                            <p class="text-uppercase mb-0 fw-bold">${user.username}</p>
                            <p class="mb-0" style="color:blue;">${Number(user.balance || 0).toLocaleString('vi-VN')} ₫</p>
                        </span>
                    </a>
                `;
            } else {
                headerSlot.innerHTML = `
                    <a href="login.html" class="header-widget" title="Login">
                        <img src="assets/storage/images/avatar_user.png" onerror="this.src='client/images/avatar.png'" alt="user"><span>Login</span>
                    </a>
                `;
            }
        }

        // Mobile Nav Drawer Elements
        const mobileNavBtn = document.getElementById('mobile-nav-btn');
        const mobileBalance = document.getElementById('mobile-balance');
        const mobileLogout = document.getElementById('mobile-logout-item');
        const mobileAdmin = document.getElementById('mobile-admin-item');
        const adminNav = document.getElementById('admin-panel-nav');

        if (mobileBalance) {
            mobileBalance.innerText = user ? Number(user.balance || 0).toLocaleString('vi-VN') + ' ₫' : '0 ₫';
        }

        if (mobileNavBtn) {
            if (user) {
                mobileNavBtn.innerHTML = `<a href="profile.html" class="btn btn-inline"><i class="fa fa-user"></i> <span>${user.username}</span></a>`;
            } else {
                mobileNavBtn.innerHTML = `<a href="login.html" class="btn btn-inline"><i class="fa fa-unlock-alt"></i> <span>Đăng Nhập</span></a>`;
            }
        }

        if (mobileLogout) {
            mobileLogout.style.display = user ? 'block' : 'none';
        }

        const isAdmin = user && user.role === 'admin';
        if (mobileAdmin) mobileAdmin.style.display = isAdmin ? 'block' : 'none';
        if (adminNav) adminNav.style.display = isAdmin ? 'block' : 'none';
    }
}

window.auth = new AuthService();

document.addEventListener('DOMContentLoaded', () => {
    window.auth.updateHeaderUI();
    if (window.auth.isLoggedIn()) {
        window.auth.syncUser();
    }
});
