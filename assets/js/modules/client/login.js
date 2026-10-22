/**
 * Client Controller - Login Page (client/login.html)
 */

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect
    if (window.auth && window.auth.isLoggedIn()) {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        window.location.href = redirect ? decodeURIComponent(redirect) : 'home.html';
        return;
    }

    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnLogin');
        if (btn) {
            btn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i> Đang đăng nhập...';
            btn.disabled = true;
        }

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // Collect captcha if present
        let captchaResponse = '';
        if (typeof window.getCaptchaResponse === 'function') {
            captchaResponse = window.getCaptchaResponse();
        } else if (typeof grecaptcha !== 'undefined') {
            try { captchaResponse = grecaptcha.getResponse(); } catch(err) {}
        }

        try {
            await window.auth.login(username, password, captchaResponse);
        } catch (err) {
            console.error('Login error:', err);
        } finally {
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-right-to-bracket me-2"></i> ĐĂNG NHẬP';
                btn.disabled = false;
            }
        }
    });
});
