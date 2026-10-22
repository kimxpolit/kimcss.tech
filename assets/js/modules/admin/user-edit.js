/**
 * Admin Controller - User Edit (admin/user-edit.html)
 */

async function loadUserEdit() {
    if (!window.auth.checkAuth('admin')) return;

    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (!userId) {
        window.api.alertError('Không tìm thấy ID người dùng').then(() => {
            window.location.href = 'users.html';
        });
        return;
    }

    try {
        const res = await window.api.get('api/data.php', {
            action: 'admin_user_detail',
            id: userId
        });

        if (res && res.status === 'success' && res.data) {
            populateUserForm(res.data);
        } else {
            window.api.alertError(res ? res.msg : 'Không thể tải thông tin người dùng').then(() => {
                window.location.href = 'users.html';
            });
        }
    } catch (e) {
        console.error('Error fetching user detail:', e);
    }
}

function populateUserForm(u) {
    document.getElementById('edit-user-id').value = u.id;
    document.getElementById('edit-username').value = u.username;
    document.getElementById('edit-email').value = u.email || '';
    document.getElementById('edit-phone').value = u.phone || '';
    document.getElementById('edit-fullname').value = u.fullname || '';
    document.getElementById('edit-discount').value = u.discount || 0;
    document.getElementById('edit-money').innerText = u.money_formatted || window.formatCurrency(u.money);
    document.getElementById('edit-total-money').innerText = u.total_money_formatted || window.formatCurrency(u.total_money);

    const adminSelect = document.getElementById('edit-admin');
    if (adminSelect) adminSelect.value = u.admin;

    const ctvSelect = document.getElementById('edit-ctv');
    if (ctvSelect) ctvSelect.value = u.ctv;

    const bannedSelect = document.getElementById('edit-banned');
    if (bannedSelect) bannedSelect.value = u.banned;
}

document.addEventListener('DOMContentLoaded', () => {
    loadUserEdit();

    const form = document.getElementById('form-user-edit');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Đang lưu...';

            const payload = {
                action: 'admin_save_user',
                id: document.getElementById('edit-user-id').value,
                email: document.getElementById('edit-email').value,
                phone: document.getElementById('edit-phone').value,
                fullname: document.getElementById('edit-fullname').value,
                discount: document.getElementById('edit-discount').value,
                admin: document.getElementById('edit-admin').value,
                ctv: document.getElementById('edit-ctv').value,
                banned: document.getElementById('edit-banned').value
            };

            const pass = document.getElementById('edit-password').value;
            if (pass) {
                payload.password = pass;
            }

            try {
                const res = await window.api.post('api/data.php', payload);
                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg || 'Cập nhật thành công');
                } else {
                    window.api.alertError(res ? res.msg : 'Cập nhật thất bại');
                }
            } catch (err) {
                console.error(err);
            } finally {
                btn.disabled = false;
                btn.innerHTML = origText;
            }
        });
    }

    const formBalance = document.getElementById('form-adjust-balance');
    if (formBalance) {
        formBalance.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('edit-user-id').value;
            const type = document.getElementById('balance-type').value;
            const amount = parseFloat(document.getElementById('balance-amount').value);
            const reason = document.getElementById('balance-reason').value;

            if (!amount || amount <= 0) {
                window.api.alertError('Vui lòng nhập số tiền hợp lệ');
                return;
            }

            try {
                const res = await window.api.post('api/data.php', {
                    action: 'admin_change_money',
                    id: userId,
                    type: type,
                    amount: amount,
                    reason: reason
                });

                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg);
                    formBalance.reset();
                    loadUserEdit();
                } else {
                    window.api.alertError(res ? res.msg : 'Thao tác thất bại');
                }
            } catch (err) {
                console.error(err);
            }
        });
    }
});
