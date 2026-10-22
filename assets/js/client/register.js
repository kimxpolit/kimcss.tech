/**
 * Client Controller - Register Page (client/register.html)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref') || urlParams.get('aff');
    if (ref) {
        const refInput = document.getElementById('ref');
        if (refInput) refInput.value = ref;
    }

    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone') ? document.getElementById('phone').value.trim() : '';
        const password = document.getElementById('password').value;
        const rePassword = document.getElementById('re_password').value;
        const refValue = document.getElementById('ref') ? document.getElementById('ref').value.trim() : '';

        if (password !== rePassword) {
            window.api.alertError('Mật khẩu nhập lại không khớp!');
            return;
        }

        const btn = document.getElementById('btnRegister');
        if (btn) {
            btn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i> Đang tạo tài khoản...';
            btn.disabled = true;
        }

        let captchaResponse = '';
        if (typeof window.getCaptchaResponse === 'function') {
            captchaResponse = window.getCaptchaResponse();
        }

        try {
            await window.auth.register({
                username: username,
                email: email,
                phone: phone,
                password: password,
                re_password: rePassword,
                ref: refValue,
                captcha_response: captchaResponse
            });
        } catch (err) {
            console.error('Registration error:', err);
        } finally {
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-user-plus me-2"></i> ĐĂNG KÝ TÀI KHOẢN';
                btn.disabled = false;
            }
        }
    });
});
