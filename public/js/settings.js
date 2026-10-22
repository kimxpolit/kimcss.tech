/**
 * ShopClone 7 - Dynamic Settings Client Service
 * Automatically fetches settings from SQL Server (GET /api/settings)
 * and updates DOM elements across all pages
 */

window.siteSettings = {};

async function loadSiteSettings() {
    try {
        const res = await (window.api ? window.api.get('/settings') : fetch('/api/settings').then(r => r.json()));
        if (res && res.status === 'success' && res.data) {
            window.siteSettings = res.data;
            applySiteSettings(res.data);
        }
    } catch (err) {
        console.warn('Could not load dynamic settings:', err);
    }
}

function applySiteSettings(s) {
    if (!s) return;
    if (window.applySiteSettings && window.applySiteSettings !== applySiteSettings) {
        window.applySiteSettings(s);
        return;
    }

    // Fallback if theme.js is not loaded
    const hotlineDisplay = s.site_hotline || s.hotline || '0989.461.037';
    const hotlineClean = hotlineDisplay.replace(/[^0-9]/g, '');

    document.querySelectorAll('#navbar-hotline, .site-hotline, .text-hotline, #hotline-phone-text, #footer-hotline, #momo-phone-number, #tsr-phone-number').forEach(el => {
        if (el) el.innerText = hotlineDisplay;
    });

    document.querySelectorAll('a[href^="tel:"], .hotline-bar a, .pps-btn-img').forEach(a => {
        if (a) a.href = 'tel:' + hotlineClean;
    });

    const zaloPhone = (s.site_zalo || s.zalo || hotlineClean).replace(/[^0-9]/g, '');
    document.querySelectorAll('.giuseart-pc-contact-bar .zalo a, #linkzalo, .link-zalo, a[href*="zalo.me"]').forEach(a => {
        if (a) a.href = `https://zalo.me/${zaloPhone}`;
    });
}

// Auto run on load
document.addEventListener('DOMContentLoaded', () => {
    loadSiteSettings();
});
