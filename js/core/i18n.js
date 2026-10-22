/**
 * HOÀNG KIM MMO SOLUTION - Core i18n & Currency Switching Controller
 * Supports:
 * - Currency: VND <-> USD with dynamic exchange rate from SQL Server (dbo.[Settings].usd_rate)
 * - Languages: Tiếng Việt (vi) <-> English (en)
 * - Safe replacement using data-i18n (Zero Visual Regression)
 * - LocalStorage persistence: 'hk_currency' & 'hk_lang'
 */

(function () {
    // 1. Initial State
    const defaultCurrency = localStorage.getItem('hk_currency') || 'VND';
    const defaultLang = localStorage.getItem('hk_lang') || 'vi';

    window.currentCurrency = defaultCurrency;
    window.currentLang = defaultLang;
    window.usdRate = 25400; // Default fallback, synchronized dynamically from /api/settings

    // 2. Dictionary
    const translations = {
        vi: {
            // Topbar
            welcome_top: '🔥 Chào mừng bạn đến với HOÀNG KIM MMO SOLUTION - Nạp tiền tự động qua VietQR duyệt trong 3 giây!',
            policy: 'Chính sách',
            faq: 'FAQ',
            contact: 'Liên Hệ',

            // Navigation
            home: 'Trang chủ',
            products: 'Sản phẩm',
            recharge: 'Nạp tiền',
            orders: 'Đơn hàng',
            history: 'Lịch sử',
            transactions: 'Biến động số dư',
            api_docs: 'Tài liệu API',
            login: 'Đăng nhập',
            register: 'Đăng ký',
            logout: 'Đăng xuất',
            profile: 'Tài khoản',
            admin_panel: 'Quản trị Admin',
            all_products: 'Tất cả sản phẩm',
            mmo_tools: 'Tiện ích MMO',
            search_placeholder: 'Tìm kiếm sản phẩm...',

            // MMO Widgets
            widget_checklive_title: 'Check live FB',
            widget_checklive_desc: 'Kiểm tra tài khoản Live/Die tự động tốc độ cao',
            widget_2fa_title: 'Get 2FA code',
            widget_2fa_desc: 'Giải mã 2FA Live 30 giây nhanh chóng chính xác',
            widget_icon_title: 'Icon Facebook',
            widget_icon_desc: 'Hơn 5000+ biểu tượng icon emo FB bán hàng đỉnh cao',
            widget_avatar_title: 'Random Face',
            widget_avatar_desc: 'Tạo ảnh khuôn mặt người thật AI để vượt checkpoint',
            widget_free: 'Free',

            // Product Cards & Filter
            stock: 'Kho hàng',
            sold: 'Đã bán',
            buy_now: 'MUA NGAY',
            out_of_stock: 'HẾT HÀNG',
            empty_products: 'Không có sản phẩm nào liên quan',
            loading_products: 'Đang tải sản phẩm từ hệ thống...',

            // Purchase Modal
            purchase_info: 'THÔNG TIN MUA HÀNG',
            my_balance: 'Số dư của tôi',
            buy_qty: 'Số lượng cần mua',
            coupon_code: 'Mã giảm giá',
            coupon_placeholder: 'Nhập mã giảm giá nếu có (vd: GIAM10)',
            subtotal: 'Thành tiền',
            discount_amount: 'Số tiền giảm',
            total_payment: 'Tổng tiền thanh toán',
            pay_now: 'THANH TOÁN',
            login_to_buy: 'ĐĂNG NHẬP ĐỂ MUA',
            loading_product_info: 'Đang tải thông tin sản phẩm...',

            // Wallet & Activities
            current_balance: 'Số dư hiện tại',
            total_deposited: 'Tổng tiền nạp',
            used_balance: 'Số dư đã sử dụng',
            discount_rate: 'Giảm giá',
            topup_now: 'Nạp tiền ngay',
            purchased_orders: 'Đơn hàng đã mua',
            recent_orders_title: 'Đơn hàng vừa phát sinh',
            recent_deposits_title: 'Nạp tiền gần đây',
            just_bought: 'vừa mua',
            for_price: 'với giá',
            recharged_success: 'nạp thành công',
            via_method: 'qua',
            balance_label: 'Số dư',

            // Recharge
            recharge_rules: 'QUY ĐỊNH NẠP TIỀN TỰ ĐỘNG',
            bank_vietqr: 'Ngân hàng (VietQR)',
            momo_wallet: 'Ví MoMo',
            scratch_card: 'Thẻ cào tự động',
            thesieure: 'Ví Thẻ Siêu Rẻ',
            crypto: 'Tiền mã hóa (USDT)',
            choose_bank: '1. Chọn ngân hàng thụ hưởng',
            choose_amount: '2. Chọn hoặc nhập số tiền nạp',
            transfer_qr: '3. Quét mã QR hoặc Chuyển khoản',
            account_number: 'Số tài khoản',
            account_holder: 'Chủ tài khoản',
            transfer_content: 'Nội dung chuyển khoản',
            copy: 'Sao chép',
            copied: 'Đã sao chép!',
            waiting_payment: 'Đang chờ thanh toán tự động...',
            note_auto_deposit: 'Hệ thống tự động cộng tiền từ 1 - 3 phút sau khi chuyển khoản đúng nội dung.',

            // Footer
            terms_service: 'Chính sách dịch vụ',
            faq_footer: 'Câu hỏi thường gặp (FAQ)',
            support_contact: 'Liên hệ hỗ trợ',
            api_connect: 'Tài liệu kết nối API',
            all_rights_reserved: 'Hệ thống Kinh Doanh MMO Tự Động. Mọi quyền được bảo lưu.'
        },

        en: {
            // Topbar
            welcome_top: '🔥 Welcome to HOANG KIM MMO SOLUTION - Instant VietQR Top-up in 3 Seconds!',
            policy: 'Policies',
            faq: 'FAQ',
            contact: 'Contact',

            // Navigation
            home: 'Home',
            products: 'Products',
            recharge: 'Top Up',
            orders: 'Orders',
            history: 'History',
            transactions: 'Transactions',
            api_docs: 'API Docs',
            login: 'Login',
            register: 'Register',
            logout: 'Logout',
            profile: 'Profile',
            admin_panel: 'Admin Panel',
            all_products: 'All Products',
            mmo_tools: 'MMO Tools',
            search_placeholder: 'Search products...',

            // MMO Widgets
            widget_checklive_title: 'Check live FB',
            widget_checklive_desc: 'High-speed automated Facebook Live/Die account checker',
            widget_2fa_title: 'Get 2FA code',
            widget_2fa_desc: 'Fast 30-second live 2FA code generator with high accuracy',
            widget_icon_title: 'Icon Facebook',
            widget_icon_desc: '5000+ top marketing and sales emojis for Facebook posts',
            widget_avatar_title: 'Random Face',
            widget_avatar_desc: 'Generate realistic AI human faces to bypass checkpoints',
            widget_free: 'Free',

            // Product Cards & Filter
            stock: 'In Stock',
            sold: 'Sold',
            buy_now: 'BUY NOW',
            out_of_stock: 'OUT OF STOCK',
            empty_products: 'No related products found',
            loading_products: 'Loading products from database...',

            // Purchase Modal
            purchase_info: 'PURCHASE INFORMATION',
            my_balance: 'My Balance',
            buy_qty: 'Quantity',
            coupon_code: 'Discount Code',
            coupon_placeholder: 'Enter coupon if available (e.g. GIAM10)',
            subtotal: 'Subtotal',
            discount_amount: 'Discount',
            total_payment: 'Total Payment',
            pay_now: 'CHECKOUT',
            login_to_buy: 'LOGIN TO PURCHASE',
            loading_product_info: 'Loading product details...',

            // Wallet & Activities
            current_balance: 'Current Balance',
            total_deposited: 'Total Deposited',
            used_balance: 'Used Balance',
            discount_rate: 'Discount',
            topup_now: 'Top-up Now',
            purchased_orders: 'Purchased Orders',
            recent_orders_title: 'Recent Orders',
            recent_deposits_title: 'Recent Top-ups',
            just_bought: 'just bought',
            for_price: 'for',
            recharged_success: 'successfully deposited',
            via_method: 'via',
            balance_label: 'Balance',

            // Recharge
            recharge_rules: 'AUTOMATIC TOP-UP REGULATIONS',
            bank_vietqr: 'Bank (VietQR)',
            momo_wallet: 'MoMo Wallet',
            scratch_card: 'Scratch Card',
            thesieure: 'TheSieuRe Wallet',
            crypto: 'Cryptocurrency (USDT)',
            choose_bank: '1. Select Beneficiary Bank',
            choose_amount: '2. Select or Enter Amount',
            transfer_qr: '3. Scan QR Code or Transfer',
            account_number: 'Account Number',
            account_holder: 'Account Holder',
            transfer_content: 'Transfer Syntax',
            copy: 'Copy',
            copied: 'Copied!',
            waiting_payment: 'Waiting for automated confirmation...',
            note_auto_deposit: 'Balance is credited automatically within 1 - 3 minutes after correct transfer.',

            // Footer
            terms_service: 'Terms of Service',
            faq_footer: 'Frequently Asked Questions',
            support_contact: 'Support & Contact',
            api_connect: 'API Documentation',
            all_rights_reserved: 'Automated MMO Trading System. All Rights Reserved.'
        }
    };

    /**
     * Translation helper function
     */
    window.t = function (key) {
        const lang = window.currentLang || 'vi';
        if (translations[lang] && translations[lang][key]) {
            return translations[lang][key];
        }
        if (translations.vi[key]) {
            return translations.vi[key];
        }
        return key;
    };

    /**
     * Currency formatter function (amountVND -> formatted string)
     */
    window.formatCurrency = function (amountVND) {
        const num = Number(amountVND || 0);
        const curr = window.currentCurrency || 'VND';

        if (curr === 'USD') {
            const rate = window.usdRate > 0 ? window.usdRate : 25400;
            const usdVal = (num / rate).toFixed(2);
            return '$' + Number(usdVal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
            return num.toLocaleString('vi-VN') + ' ₫';
        }
    };

    /**
     * Legacy formatVND alias
     */
    window.formatVND = window.formatCurrency;

    /**
     * Apply Language to DOM (Safe data-i18n update)
     */
    window.setLanguage = function (lang) {
        if (lang !== 'vi' && lang !== 'en') lang = 'vi';
        window.currentLang = lang;
        localStorage.setItem('hk_lang', lang);

        // Sync all language dropdowns
        const langSelects = document.querySelectorAll('#changeLanguage, #language-select, .select-language');
        langSelects.forEach(sel => {
            if (sel && sel.value !== lang) sel.value = lang;
        });

        // 1. Safe text replacement for elements with data-i18n
        const textElements = document.querySelectorAll('[data-i18n]');
        textElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = window.t(key);
            if (translation) {
                // If element has only text or dedicated wrapper, update textContent safely
                // Do not wipe out child icon elements (<i class="..."></i>)
                const icon = el.querySelector('i, svg, img');
                if (icon) {
                    // Update only text nodes without removing the icon
                    let textNodeFound = false;
                    el.childNodes.forEach(child => {
                        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
                            child.textContent = ' ' + translation + ' ';
                            textNodeFound = true;
                        }
                    });
                    if (!textNodeFound) {
                        el.appendChild(document.createTextNode(' ' + translation));
                    }
                } else {
                    el.textContent = translation;
                }
            }
        });

        // 2. Safe placeholder replacement
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = window.t(key);
            if (translation) el.placeholder = translation;
        });

        // 3. Safe title replacement
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = window.t(key);
            if (translation) el.title = translation;
        });

        // 4. Update Marquee Welcome Top if present
        const welcomeEl = document.getElementById('header-top-welcome');
        if (welcomeEl) {
            const p = welcomeEl.querySelector('p');
            if (p) {
                // If it's the standard welcome notice, localize it
                p.textContent = window.t('welcome_top');
            }
        }

        // 5. Notify pages to re-render dynamic content (e.g. products, wallet)
        if (typeof window.renderProductsFromCache === 'function') {
            window.renderProductsFromCache();
        } else if (typeof window.loadProducts === 'function') {
            window.loadProducts();
        }
        if (typeof window.renderWalletSidebar === 'function') {
            window.renderWalletSidebar();
        }

        window.dispatchEvent(new CustomEvent('hk_language_change', { detail: { lang } }));
    };

    /**
     * Apply Currency to DOM
     */
    window.setCurrency = function (curr) {
        if (curr !== 'VND' && curr !== 'USD') curr = 'VND';
        window.currentCurrency = curr;
        localStorage.setItem('hk_currency', curr);

        // Sync all currency dropdowns
        const currSelects = document.querySelectorAll('#changeCurrency, #currency-select, .select-currency');
        currSelects.forEach(sel => {
            if (sel && sel.value !== curr) sel.value = curr;
        });

        // 1. Update elements with data-price-vnd
        const priceEls = document.querySelectorAll('[data-price-vnd]');
        priceEls.forEach(el => {
            const vnd = Number(el.getAttribute('data-price-vnd') || 0);
            el.innerText = window.formatCurrency(vnd);
        });

        // 2. Update Header User Balance
        if (window.auth && typeof window.auth.updateHeaderUI === 'function') {
            window.auth.updateHeaderUI();
        }

        // 3. Re-render Home page product cards & wallet if functions exist
        if (typeof window.renderProductsFromCache === 'function') {
            window.renderProductsFromCache();
        } else if (typeof window.loadProducts === 'function') {
            window.loadProducts();
        }
        if (typeof window.renderWalletSidebar === 'function') {
            window.renderWalletSidebar();
        }

        // 4. Recalculate Modal price if open
        if (typeof window.calcTotalPayment === 'function') {
            window.calcTotalPayment();
        }

        // 5. Update transaction history prices if on recharge page
        if (typeof window.updateDisplaySyntax === 'function') {
            window.updateDisplaySyntax();
        }

        window.dispatchEvent(new CustomEvent('hk_currency_change', { detail: { currency: curr } }));
    };

    /**
     * Fetch USD rate from Backend
     */
    async function syncRateAndSettings() {
        try {
            const res = await fetch('/api/settings');
            const json = await res.json();
            if (json && json.status === 'success' && json.data) {
                if (json.data.usd_rate) {
                    window.usdRate = Number(json.data.usd_rate);
                }
            }
        } catch (e) {
            console.warn('[i18n & Currency] Could not fetch remote usd_rate:', e.message);
        }
    }

    /**
     * Bind listeners to Select dropdowns on page load
     */
    function initI18nAndCurrency() {
        // Sync rate
        syncRateAndSettings().then(() => {
            // Apply saved language & currency
            window.setLanguage(window.currentLang);
            window.setCurrency(window.currentCurrency);
        });

        // Bind Currency Selectors
        const currSelects = document.querySelectorAll('#changeCurrency, #currency-select, .select-currency');
        currSelects.forEach(sel => {
            sel.value = window.currentCurrency;
            sel.addEventListener('change', function () {
                window.setCurrency(this.value);
            });
        });

        // Bind Language Selectors
        const langSelects = document.querySelectorAll('#changeLanguage, #language-select, .select-language');
        langSelects.forEach(sel => {
            sel.value = window.currentLang;
            sel.addEventListener('change', function () {
                window.setLanguage(this.value);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initI18nAndCurrency);
    } else {
        initI18nAndCurrency();
    }
})();
