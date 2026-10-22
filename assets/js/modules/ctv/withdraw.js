/**
 * CTV Controller - Withdraw Management (ctv/ctv-withdraw.html)
 */

async function loadCtvWithdraw() {
    if (!window.auth.checkAuth('ctv')) return;

    try {
        const userRes = await window.api.get('api/data.php', { action: 'get_user' });
        if (userRes && userRes.status === 'success' && userRes.data) {
            const balanceEl = document.getElementById('ctv-available-balance');
            if (balanceEl) balanceEl.innerText = userRes.data.money_formatted || window.formatCurrency(userRes.data.money);
        }
    } catch (e) {
        console.error('Error fetching CTV user data:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCtvWithdraw();

    const form = document.getElementById('form-ctv-withdraw');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Đang gửi yêu cầu...';

            const payload = {
                action: 'ctv_withdraw',
                amount: document.getElementById('withdraw-amount').value,
                bank: document.getElementById('withdraw-bank').value,
                account_number: document.getElementById('withdraw-account-number').value,
                account_name: document.getElementById('withdraw-account-name').value
            };

            try {
                const res = await window.api.post('api/data.php', payload);
                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg || 'Yêu cầu rút tiền thành công');
                    form.reset();
                    loadCtvWithdraw();
                } else {
                    window.api.alertError(res ? res.msg : 'Rút tiền thất bại');
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
