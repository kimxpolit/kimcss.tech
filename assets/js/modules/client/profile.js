/**
 * Client Controller - User Profile Page (client/profile.html)
 */

async function loadProfile() {
    if (!window.auth.checkAuth('user')) return;

    try {
        const user = await window.auth.syncUser();
        if (user) {
            renderProfile(user);
        }
    } catch (e) {
        console.error('Error loading profile:', e);
    }
}

function renderProfile(user) {
    // Wallet section
    const moneyEl = document.getElementById('user-money');
    if (moneyEl) moneyEl.innerText = user.money_formatted || window.formatCurrency(user.money);

    const totalMoneyEl = document.getElementById('user-total-money');
    if (totalMoneyEl) totalMoneyEl.innerText = user.total_money_formatted || window.formatCurrency(user.total_money);

    const usedMoneyEl = document.getElementById('user-used-money');
    if (usedMoneyEl) usedMoneyEl.innerText = user.used_money_formatted || window.formatCurrency(user.total_money - user.money);

    const discountEl = document.getElementById('user-discount');
    if (discountEl) discountEl.innerText = `${user.discount || 0}%`;

    // Form fields
    setValue('profile-username', user.username);
    setValue('profile-email', user.email);
    setValue('profile-phone', user.phone || '');
    setValue('profile-fullname', user.fullname || '');
    setValue('profile-telegram', user.telegram_chat_id || '');
    setValue('profile-api-key', user.api_key || '');
    setValue('profile-ip-whitelist', user.ip_whitelist_api || '');

    // Modal Edit Form fields
    setValue('edit-fullname', user.fullname || '');
    setValue('edit-phone', user.phone || '');
    setValue('edit-telegram', user.telegram_chat_id || '');
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.value = val;
        } else {
            el.innerText = val;
        }
    }
}

// Setup Form listeners
function setupProfileForms() {
    // 1. Change profile info form
    const formProfile = document.getElementById('formChangeProfile');
    if (formProfile) {
        formProfile.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSaveProfile');
            if (btn) {
                btn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i> Đang lưu...';
                btn.disabled = true;
            }

            const fullname = document.getElementById('edit-fullname').value.trim();
            const phone = document.getElementById('edit-phone').value.trim();
            const telegram = document.getElementById('edit-telegram').value.trim();

            try {
                const res = await window.api.post('ajaxs/client/auth.php', {
                    action: 'ChangeProfile',
                    fullname: fullname,
                    phone: phone,
                    telegram_chat_id: telegram
                });
                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg || 'Cập nhật thông tin thành công!');
                    await window.auth.syncUser();
                    loadProfile();
                    // Close modal
                    const modalEl = document.getElementById('modalEditProfile');
                    if (modalEl) {
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        if (modal) modal.hide();
                    }
                } else {
                    window.api.alertError(res ? res.msg : 'Cập nhật thất bại');
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (btn) {
                    btn.innerHTML = 'Lưu thay đổi';
                    btn.disabled = false;
                }
            }
        });
    }

    // 2. Change API Key
    const btnChangeApiKey = document.getElementById('btnChangeApiKey');
    if (btnChangeApiKey) {
        btnChangeApiKey.addEventListener('click', async () => {
            Swal.fire({
                title: 'Đổi API Key?',
                text: 'API Key cũ sẽ bị vô hiệu hóa ngay lập tức!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Đổi ngay',
                cancelButtonText: 'Hủy'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const res = await window.api.post('ajaxs/client/auth.php', { action: 'changeAPIKey' });
                        if (res && res.status === 'success') {
                            window.api.alertSuccess(res.msg || 'Đã tạo API Key mới!');
                            loadProfile();
                        } else {
                            window.api.alertError(res ? res.msg : 'Không thể tạo API Key');
                        }
                    } catch(e) {
                        console.error(e);
                    }
                }
            });
        });
    }

    // 3. Update IP Whitelist
    const formIp = document.getElementById('formUpdateIpWhitelist');
    if (formIp) {
        formIp.addEventListener('submit', async (e) => {
            e.preventDefault();
            const ip = document.getElementById('profile-ip-whitelist').value.trim();
            try {
                const res = await window.api.post('ajaxs/client/update.php', {
                    action: 'updateIPWhitelist',
                    ip_whitelist_api: ip
                });
                if (res && res.status === 'success') {
                    window.api.showToast(res.msg || 'Đã lưu IP Whitelist');
                    loadProfile();
                } else {
                    window.api.alertError(res ? res.msg : 'Lỗi cập nhật IP');
                }
            } catch(e) {
                console.error(e);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    setupProfileForms();
});
