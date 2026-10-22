/**
 * Auth Module - ShopClone 7
 * Authentication State Management, Session Guards, Login, Register, 2FA, and UI Binding
 */

class AuthService {
    constructor() {
        this.STORAGE_KEY = 'user_session';
        this.currentUser = this.getUser();
    }

    /**
     * Get current user object from localStorage
     * @returns {object|null}
     */
    getUser() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Failed to parse user session:', e);
            return null;
        }
    }

    /**
     * Save user session into localStorage
     * @param {object} user
     */
    setUser(user) {
        if (!user) {
            localStorage.removeItem(this.STORAGE_KEY);
            this.currentUser = null;
        } else {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
            this.currentUser = user;
        }
        this.renderHeaderUser();
    }

    /**
     * Get token string
     * @returns {string}
     */
    getToken() {
        const u = this.getUser();
        return u ? (u.token || '') : '';
    }

    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!this.getUser();
    }

    /**
     * Synchronize user session from backend API
     */
    async syncUser() {
        if (!window.api) return null;
        try {
            const res = await window.api.get('api/data.php', { action: 'get_user' });
            if (res && res.status === 'success' && res.data) {
                this.setUser(res.data);
                return res.data;
            } else if (res && res.status === 'unauthenticated') {
                this.setUser(null);
                return null;
            }
        } catch (e) {
            console.error('Sync user error:', e);
        }
        return this.getUser();
    }

    /**
     * Route guard: Verify required role or redirect to login.html
     * @param {string} requiredRole - 'user' | 'admin' | 'ctv'
     */
    checkAuth(requiredRole = 'user') {
        const user = this.getUser();
        const currentPath = window.location.pathname;

        const isClientPage = currentPath.includes('/client/');
        const loginUrl = isClientPage ? 'login.html' : (currentPath.includes('/admin/') || currentPath.includes('/ctv/') ? '../client/login.html' : 'client/login.html');

        if (!user) {
            window.location.href = loginUrl + '?redirect=' + encodeURIComponent(window.location.href);
            return false;
        }

        if (requiredRole === 'admin' && (!user.admin || parseInt(user.admin) <= 0)) {
            window.api && window.api.alertError('Bạn không có quyền truy cập trang quản trị!');
            setTimeout(() => {
                window.location.href = isClientPage ? 'home.html' : '../index.html';
            }, 1500);
            return false;
        }

        if (requiredRole === 'ctv' && (!user.ctv || parseInt(user.ctv) <= 0)) {
            window.api && window.api.alertError('Bạn không có quyền truy cập trang Cộng tác viên!');
            setTimeout(() => {
                window.location.href = isClientPage ? 'home.html' : '../index.html';
            }, 1500);
            return false;
        }

        return true;
    }

    /**
     * Perform user login
     * @param {string} username
     * @param {string} password
     * @param {string} captchaResponse
     */
    async login(username, password, captchaResponse = '') {
        const payload = {
            action: 'Login',
            username: username.trim(),
            password: password,
            captcha_response: captchaResponse
        };

        const res = await window.api.post('ajaxs/client/auth.php', payload);

        if (res && res.status === 'verify') {
            // Needs 2FA or OTP verification
            if (res.url) {
                // Parse target verification page
                let verifyPage = 'verify_2fa.html';
                if (res.url.includes('verify_otp')) {
                    verifyPage = 'verify_otp.html';
                }
                const urlObj = new URL(res.url, window.location.origin);
                const tokenParam = urlObj.searchParams.get('token');
                window.location.href = `${verifyPage}?token=${encodeURIComponent(tokenParam)}`;
                return res;
            }
        }

        if (res && res.status === 'success') {
            // Sync user profile to save session in localStorage
            await this.syncUser();
            window.api.alertSuccess(res.msg || 'Đăng nhập thành công!');
            
            // Handle redirect parameter if exists
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect');
            setTimeout(() => {
                if (redirectUrl) {
                    window.location.href = decodeURIComponent(redirectUrl);
                } else {
                    const user = this.getUser();
                    if (user && user.admin > 0) {
                        window.location.href = '../admin/index.html';
                    } else if (user && user.ctv > 0) {
                        window.location.href = '../ctv/index.html';
                    } else {
                        window.location.href = '../index.html';
                    }
                }
            }, 1200);
        } else {
            window.api.alertError(res ? res.msg : 'Đăng nhập không thành công');
        }

        return res;
    }

    /**
     * Perform user registration
     * @param {object} data
     */
    async register(data) {
        const payload = {
            action: 'Register',
            ...data
        };

        const res = await window.api.post('ajaxs/client/auth.php', payload);
        if (res && res.status === 'success') {
            window.api.alertSuccess(res.msg || 'Đăng ký tài khoản thành công!');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            window.api.alertError(res ? res.msg : 'Đăng ký không thành công');
        }
        return res;
    }

    /**
     * Perform 2FA Verification
     */
    async verify2FA(token2FA, code) {
        const payload = {
            action: 'Verify2FA',
            token_2fa: token2FA,
            code: code
        };
        const res = await window.api.post('ajaxs/client/auth.php', payload);
        if (res && res.status === 'success') {
            await this.syncUser();
            window.api.alertSuccess(res.msg || 'Xác minh thành công!');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1200);
        } else {
            window.api.alertError(res ? res.msg : 'Mã xác thực không hợp lệ');
        }
        return res;
    }

    /**
     * Perform OTP Verification
     */
    async verifyOTP(tokenOTP, otpCode) {
        const payload = {
            action: 'VerifyOTP',
            token_otp_mail: tokenOTP,
            otp: otpCode
        };
        const res = await window.api.post('ajaxs/client/auth.php', payload);
        if (res && res.status === 'success') {
            await this.syncUser();
            window.api.alertSuccess(res.msg || 'Xác minh thành công!');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1200);
        } else {
            window.api.alertError(res ? res.msg : 'Mã OTP không hợp lệ');
        }
        return res;
    }

    /**
     * Perform user logout
     */
    async logout() {
        this.setUser(null);
        // Clear cookies via server request
        try {
            if (window.api) {
                await window.api.get('api/data.php', { action: 'logout' });
            }
        } catch (e) {
            console.error('Logout error:', e);
        }

        const isClientPage = window.location.pathname.includes('/client/');
        const isSubdir = isClientPage || window.location.pathname.includes('/admin/') || window.location.pathname.includes('/ctv/');
        window.location.href = isSubdir ? (isClientPage ? 'login.html' : '../client/login.html') : 'client/login.html';
    }

    /**
     * Update client header and navigation UI with user details
     */
    renderHeaderUser() {
        const user = this.getUser();
        const container = document.getElementById('header-user-area');
        const numFavs = document.getElementById('numFavorites');
        
        if (numFavs && user) {
            numFavs.innerText = user.favorite_count || '0';
        }

        if (!container) return;

        const isClientPage = window.location.pathname.includes('/client/');
        const prefix = isClientPage ? '' : 'client/';

        if (user) {
            container.innerHTML = `
                <a href="${prefix}profile.html" class="header-widget" title="Hồ sơ cá nhân">
                    <img src="${prefix ? '../' : ''}assets/img/avatar.png" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=0D8ABC&color=fff'" alt="user">
                    <span>
                        <p class="text-uppercase fw-bold m-0" style="font-size: 13px;">${user.username}</p>
                        <p class="m-0" style="color: blue; font-size: 12px; font-weight: 600;">${user.money_formatted || formatCurrency(user.money)}</p>
                    </span>
                </a>
            `;
        } else {
            container.innerHTML = `
                <a href="${prefix}login.html" class="header-widget" title="Đăng nhập">
                    <i class="fa-solid fa-user-lock fs-5 me-1"></i>
                    <span style="font-weight: 600;">Đăng nhập</span>
                </a>
            `;
        }
    }
}

// Utility formatting helper
function formatCurrency(number) {
    if (number === undefined || number === null || isNaN(number)) return '0đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
}
window.formatCurrency = formatCurrency;

const auth = new AuthService();
window.auth = auth;

// Auto sync and render on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    auth.renderHeaderUser();
    // Silent background sync
    if (auth.isLoggedIn()) {
        auth.syncUser();
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { auth, AuthService };
}
