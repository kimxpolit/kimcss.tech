/**
 * Core Theme & Dynamic UI Controller - ShopClone 7 / kimcss.tech
 * Handles: CSS Variables, Animated Gold Shimmer Logo (Image & Video),
 * Welcome Popup, Marquee, Contacts & Realtime Settings Synchronization.
 */

(function () {
    // 1. Inject Animated Logo Styles (Gold Shimmer & 3D Glow)
    const styleId = 'kimcss-theme-animated-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            :root {
                --primary-color: #2563eb;
                --accent-color: #d4af37;
                --navbar-bg: #ffffff;
                --logo-height: 54px;
            }

            /* Animated Logo Wrapper with Golden Glow */
            .logo-wrapper {
                position: relative;
                display: inline-flex;
                align-items: center;
                overflow: hidden;
                border-radius: 8px;
                filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.45));
                transition: transform 0.3s ease, filter 0.3s ease;
                vertical-align: middle;
            }

            .logo-wrapper:hover {
                transform: scale(1.03);
                filter: drop-shadow(0 0 14px rgba(255, 215, 0, 0.75));
            }

            .logo-main {
                display: block;
                height: var(--logo-height, 54px) !important;
                max-height: 80px;
                width: auto !important;
                object-fit: contain;
                transition: height 0.2s ease;
            }

            /* Gold Shimmer Sweep Light Effect (every 3.5s) */
            .logo-wrapper::after {
                content: "";
                position: absolute;
                top: -50%;
                left: -150%;
                width: 70%;
                height: 200%;
                background: linear-gradient(
                    105deg,
                    rgba(255, 255, 255, 0) 0%,
                    rgba(255, 235, 130, 0.18) 30%,
                    rgba(255, 255, 255, 0.75) 50%,
                    rgba(255, 215, 0, 0.35) 70%,
                    rgba(255, 255, 255, 0) 100%
                );
                transform: rotate(25deg);
                pointer-events: none;
                animation: goldSweepLight 3.5s infinite ease-in-out;
            }

            @keyframes goldSweepLight {
                0% {
                    left: -150%;
                    opacity: 0;
                }
                15% {
                    opacity: 1;
                }
                45% {
                    left: 200%;
                    opacity: 1;
                }
                50%, 100% {
                    left: 200%;
                    opacity: 0;
                }
            }

            /* Navbar background sync */
            .header-part, .navbar-part {
                background-color: var(--navbar-bg, #ffffff) !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Render logo element (Video vs Image)
     */
    function renderLogoElement(src, height) {
        if (!src) src = 'assets/storage/images/logo_kimcss.png';
        const cleanSrc = src.trim();
        const isVideo = cleanSrc.endsWith('.mp4') || cleanSrc.endsWith('.webm') || cleanSrc.endsWith('.ogg');
        const h = height || 54;

        if (isVideo) {
            return `
                <span class="logo-wrapper">
                    <video src="${cleanSrc}" autoplay loop muted playsinline class="logo-main" style="height: ${h}px;"></video>
                </span>
            `;
        } else {
            return `
                <span class="logo-wrapper">
                    <img src="${cleanSrc}" onerror="this.src='/assets/storage/images/logo_kimcss.png'" alt="Logo" class="logo-main" style="height: ${h}px;">
                </span>
            `;
        }
    }

    /**
     * Apply all dynamic settings to DOM across all pages
     */
    window.applySiteSettings = function (data) {
        if (!data || typeof data !== 'object') return;
        window.siteSettings = data;

        // 1. CSS Variables
        if (data.primary_color) {
            document.documentElement.style.setProperty('--primary-color', data.primary_color);
            document.documentElement.style.setProperty('--primary', data.primary_color);
            document.documentElement.style.setProperty('--primary1', data.primary_color);
        }
        if (data.accent_color) {
            document.documentElement.style.setProperty('--accent-color', data.accent_color);
        }
        if (data.navbar_bg) {
            document.documentElement.style.setProperty('--navbar-bg', data.navbar_bg);
        }

        const logoHeight = data.logo_height ? parseInt(data.logo_height) : 54;
        document.documentElement.style.setProperty('--logo-height', `${logoHeight}px`);

        // 2. Title & Meta
        if (data.site_title && !document.title.includes('Admin')) {
            document.title = data.site_title;
        }
        if (data.site_description) {
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.setAttribute('content', data.site_description);
        }
        if (data.favicon) {
            const favEl = document.querySelector('link[rel="icon"]');
            if (favEl) favEl.setAttribute('href', data.favicon);
        }

        // 3. Logo Rendering across all containers
        const logoSrc = data.site_logo || data.logo_dark || 'assets/storage/images/logo_kimcss.png';
        const logoContainers = document.querySelectorAll('.header-logo, .footer-logo, .site-logo-container');
        logoContainers.forEach(container => {
            if (container) {
                container.innerHTML = renderLogoElement(logoSrc, logoHeight);
            }
        });

        const standaloneLogos = document.querySelectorAll('img.site-logo-img, img.header-logo-img');
        standaloneLogos.forEach(img => {
            if (img && !img.closest('.logo-wrapper')) {
                img.src = logoSrc;
                img.style.height = `${logoHeight}px`;
                img.classList.add('logo-main');
                const parent = img.parentElement;
                if (parent && !parent.classList.contains('logo-wrapper')) {
                    const wrapper = document.createElement('span');
                    wrapper.className = 'logo-wrapper';
                    parent.insertBefore(wrapper, img);
                    wrapper.appendChild(img);
                }
            }
        });

        // 4. PHONE NUMBERS & HOTLINE PROPAGATION (CRITICAL)
        // Replacing all phone numbers everywhere across header, navbar, floating widgets, footer, and contact/recharge pages
        const rawPhone = data.site_hotline || data.hotline || '0989.461.037';
        const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
        const displayPhone = rawPhone;

        const phoneTextSelectors = [
            '#navbar-hotline',
            '.site-hotline',
            '[data-bind="hotline"]',
            '[data-setting="hotline"]',
            '#hotline-phone-text',
            '.text-hotline',
            '#footer-hotline',
            '#momo-phone-number',
            '#tsr-phone-number'
        ];
        document.querySelectorAll(phoneTextSelectors.join(', ')).forEach(el => {
            if (el) el.innerText = displayPhone;
        });

        // Direct Tel Link updates
        document.querySelectorAll('a[href^="tel:"], .hotline-bar a, .hotline-phone-ring-img-circle a, .pps-btn-img').forEach(a => {
            if (a && a.tagName === 'A') {
                a.href = 'tel:' + cleanPhone;
            }
        });

        // 5. ZALO PROPAGATION (Linked with hotline/phone)
        const rawZalo = data.site_zalo || data.zalo || cleanPhone;
        const cleanZalo = rawZalo.replace(/[^0-9]/g, '');
        document.querySelectorAll('a[href*="zalo.me"], .link-zalo, .giuseart-pc-contact-bar .zalo a, #linkzalo').forEach(a => {
            if (a && a.tagName === 'A') {
                a.href = `https://zalo.me/${cleanZalo}`;
            }
        });
        document.querySelectorAll('.link-zalo').forEach(el => {
            if (el && /^[0-9.\s+]{9,15}$/.test(el.innerText.trim())) {
                el.innerText = displayPhone;
            }
        });

        // 6. TELEGRAM PROPAGATION
        const rawTele = data.site_telegram || data.telegram || '@kimcss_support';
        const cleanTele = rawTele.replace('@', '').trim();
        document.querySelectorAll('a[href*="t.me"], .link-telegram').forEach(a => {
            if (a && a.tagName === 'A') {
                a.href = `https://t.me/${cleanTele}`;
                if (a.innerText.startsWith('@') || a.innerText.toLowerCase().includes('kimcss') || a.innerText.toLowerCase().includes('shopclone')) {
                    a.innerText = '@' + cleanTele;
                }
            }
        });

        // 7. EMAIL PROPAGATION
        const email = data.site_email || data.email || 'hotro@kimcss.tech';
        document.querySelectorAll('#navbar-email, .site-email, #footer-email, [data-bind="email"]').forEach(el => {
            if (el) el.innerText = email;
        });
        document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
            if (a) a.href = 'mailto:' + email;
        });

        // 8. NOTICES & MARQUEE
        const marquee = data.marquee_notice || data.notice_top_left || '';
        if (marquee) {
            document.querySelectorAll('#top-notice, #marquee-notice, .marquee-text, #header-top-welcome, .header-notice').forEach(el => {
                if (el) el.innerHTML = marquee;
            });
        }
        if (data.site_notice_home) {
            const homeNotice = document.getElementById('site-notice-home');
            if (homeNotice) homeNotice.innerHTML = data.site_notice_home;
        }

        // 9. RECENT TRANSACTIONS SECTION (show_recent_orders)
        const showRecent = data.show_recent_orders !== 0 && data.show_recent_orders !== false && data.show_recent_orders !== '0';
        const recentSec = document.getElementById('recent-transactions-section') || document.querySelector('#recent-orders')?.closest('.row') || document.querySelector('.recent-transactions-block');
        if (recentSec) {
            recentSec.style.display = showRecent ? '' : 'none';
        }

        // 10. MMO TOOLS 4 WIDGETS (status_menu_tools)
        const showTools = data.status_menu_tools !== 0 && data.status_menu_tools !== false && data.status_menu_tools !== '0';
        const toolsSec = document.getElementById('widget-tools') || document.getElementById('mmo-widgets-section');
        if (toolsSec) {
            toolsSec.style.display = showTools ? '' : 'none';
        }

        // 11. USD RATE SYNC
        if (data.usd_rate) {
            window.USD_RATE = Number(data.usd_rate) || 25400;
            if (typeof window.updateAllCurrencyDisplays === 'function') {
                window.updateAllCurrencyDisplays();
            }
        }

        // 12. WELCOME POPUP MODAL
        const popupEnabled = data.welcome_popup_status === 1 || data.welcome_popup_status === true || data.welcome_popup_status === '1';
        const isHome = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
        if (popupEnabled && data.welcome_popup_content && isHome) {
            const popupShown = sessionStorage.getItem('welcome_popup_shown');
            if (!popupShown) {
                sessionStorage.setItem('welcome_popup_shown', 'true');
                setTimeout(() => {
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            title: '<i class="fa-solid fa-bullhorn text-warning me-2"></i> THÔNG BÁO TỪ HỆ THỐNG',
                            html: `<div style="text-align: left; font-size: 14px; line-height: 1.6;">${data.welcome_popup_content}</div>`,
                            confirmButtonText: 'Tôi đã hiểu',
                            confirmButtonColor: data.primary_color || '#2563eb',
                            customClass: { popup: 'rounded-4 shadow-lg border-0' }
                        });
                    }
                }, 700);
            }
        }

        // 13. RECHARGE SYNTAX & VIETQR SYNC (if on recharge page)
        if (typeof window.updateVietQRDisplay === 'function') window.updateVietQRDisplay();
        if (typeof window.updateMoMoDisplay === 'function') window.updateMoMoDisplay();
        if (typeof window.updateAdditionalMethodsSyntax === 'function') window.updateAdditionalMethodsSyntax();
    };

    /**
     * Load settings from API
     */
    async function loadThemeSettings() {
        try {
            const res = await fetch('/api/settings');
            const json = await res.json();
            if (json && json.status === 'success' && json.data) {
                window.siteSettings = json.data;
                window.applySiteSettings(json.data);
            }
        } catch (err) {
            console.warn('[Theme Controller] Could not fetch remote settings:', err.message);
        }
    }

    // Cross-tab synchronization
    window.addEventListener('storage', (e) => {
        if (e.key === 'hk_site_settings_updated') {
            loadThemeSettings();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadThemeSettings);
    } else {
        loadThemeSettings();
    }
})();
