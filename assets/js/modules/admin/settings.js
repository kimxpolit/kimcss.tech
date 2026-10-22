/**
 * Admin Controller - Site Settings (admin/settings.html)
 */

async function loadAdminSettings() {
    if (!window.auth.checkAuth('admin')) return;

    try {
        const res = await window.api.get('api/data.php', { action: 'admin_settings' });
        if (res && res.status === 'success' && res.data) {
            populateSettings(res.data);
        }
    } catch (e) {
        console.error('Error fetching settings:', e);
    }
}

function populateSettings(settings) {
    for (const [key, val] of Object.entries(settings)) {
        const el = document.getElementById(`setting-${key}`) || document.querySelector(`[name="${key}"]`);
        if (el) {
            if (el.type === 'checkbox') {
                el.checked = (val == 1 || val === '1' || val === 'true');
            } else {
                el.value = val;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadAdminSettings();

    const form = document.getElementById('form-admin-settings');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Đang lưu...';

            const formData = new FormData(form);
            const settingsObj = {};
            formData.forEach((val, key) => {
                settingsObj[key] = val;
            });

            // Checkbox elements that might be unchecked
            const checkboxes = form.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                settingsObj[cb.name] = cb.checked ? 1 : 0;
            });

            try {
                const res = await window.api.post('api/data.php', {
                    action: 'admin_save_settings',
                    settings: JSON.stringify(settingsObj)
                });

                if (res && res.status === 'success') {
                    window.api.alertSuccess(res.msg || 'Cài đặt đã được lưu thành công');
                } else {
                    window.api.alertError(res ? res.msg : 'Lưu thất bại');
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
