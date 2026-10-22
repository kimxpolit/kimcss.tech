/**
 * Client Controller - Card Recharge Page (client/recharge-card.html)
 */

async function loadCardRecharge() {
    if (!window.auth.checkAuth('user')) return;
    setupCardForm();
}

function setupCardForm() {
    const form = document.getElementById('card-recharge-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btnSubmitCard');
        if (btnSubmit) {
            btnSubmit.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i> Đang gửi thẻ...';
            btnSubmit.disabled = true;
        }

        const telco = document.getElementById('telco').value;
        const amount = document.getElementById('amount').value;
        const pin = document.getElementById('pin').value.trim();
        const serial = document.getElementById('serial').value.trim();

        try {
            const res = await window.api.post('ajaxs/client/create.php', {
                action: 'nap_the',
                telco: telco,
                amount: amount,
                pin: pin,
                serial: serial
            });

            if (res && res.status === 'success') {
                window.api.alertSuccess(res.msg || 'Gửi thẻ thành công! Vui lòng chờ hệ thống duyệt thẻ trong 1-3 phút.');
                form.reset();
            } else {
                window.api.alertError(res ? res.msg : 'Gửi thẻ thất bại. Vui lòng kiểm tra lại thông tin.');
            }
        } catch (err) {
            console.error('Card recharge error:', err);
            window.api.alertError('Lỗi kết nối máy chủ khi gửi thẻ');
        } finally {
            if (btnSubmit) {
                btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane me-2"></i> NẠP THẺ NGAY';
                btnSubmit.disabled = false;
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadCardRecharge();
});
