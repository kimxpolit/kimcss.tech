/**
 * Client Controller - Check Live Facebook UID Tool
 */

let isChecking = false;

document.addEventListener('DOMContentLoaded', () => {
    const btnCheck = document.getElementById('btnStartCheck');
    const btnStop = document.getElementById('btnStopCheck');

    if (btnCheck) {
        btnCheck.addEventListener('click', () => startCheckLive());
    }
    if (btnStop) {
        btnStop.addEventListener('click', () => { isChecking = false; });
    }
});

async function startCheckLive() {
    const inputEl = document.getElementById('inputAccounts');
    const liveEl = document.getElementById('liveAccounts');
    const dieEl = document.getElementById('dieAccounts');

    if (!inputEl) return;
    const lines = inputEl.value.split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length === 0) {
        window.api.alertError('Vui lòng nhập danh sách UID cần kiểm tra!');
        return;
    }

    isChecking = true;
    liveEl.value = '';
    dieEl.value = '';

    let liveCount = 0;
    let dieCount = 0;
    let totalChecked = 0;

    const liveCountEl = document.getElementById('liveCount');
    const dieCountEl = document.getElementById('dieCount');
    const totalCountEl = document.getElementById('totalCount');

    const btnStart = document.getElementById('btnStartCheck');
    if (btnStart) btnStart.disabled = true;

    for (let i = 0; i < lines.length; i++) {
        if (!isChecking) break;
        const line = lines[i];
        const uid = line.split('|')[0].trim();

        try {
            const isLive = await checkFbUid(uid);
            if (isLive) {
                liveCount++;
                liveEl.value += line + '\n';
                if (liveCountEl) liveCountEl.innerText = liveCount;
            } else {
                dieCount++;
                dieEl.value += line + '\n';
                if (dieCountEl) dieCountEl.innerText = dieCount;
            }
        } catch (e) {
            dieCount++;
            dieEl.value += line + '\n';
            if (dieCountEl) dieCountEl.innerText = dieCount;
        }

        totalChecked++;
        if (totalCountEl) totalCountEl.innerText = `${totalChecked}/${lines.length}`;

        // Small delay to prevent client throttling
        await new Promise(r => setTimeout(r, 200));
    }

    isChecking = false;
    if (btnStart) btnStart.disabled = false;
    window.api.showToast(`Hoàn tất kiểm tra: ${liveCount} Live - ${dieCount} Die`);
}

function checkFbUid(uid) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            // When UID is live, facebook graph returns avatar with width > 10
            if (img.width > 20) {
                resolve(true);
            } else {
                resolve(false);
            }
        };
        img.onerror = () => {
            resolve(false);
        };
        img.src = `https://graph.facebook.com/${uid}/picture?type=normal&timestamp=${Date.now()}`;
    });
}

window.copyTextarea = function(id) {
    const el = document.getElementById(id);
    if (el) {
        navigator.clipboard.writeText(el.value).then(() => {
            window.api.showToast('Đã sao chép nội dung');
        });
    }
};
