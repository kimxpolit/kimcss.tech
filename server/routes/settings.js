/**
 * Settings API Routes - ShopClone 7 (MSSQL dbo.[Settings])
 * Enhanced for Dynamic Theme Customizer & Animated Media Logo
 */

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

/**
 * Helper to get merged settings object
 */
async function getFullSettings(pool) {
    // 1. Fetch key-value pairs
    const kvRes = await pool.request().query('SELECT [name], [value] FROM dbo.[Settings]');
    const settingsMap = {};
    kvRes.recordset.forEach(row => {
        settingsMap[row.name] = row.value;
    });

    // 2. Fetch master column-based configuration
    const configRes = await pool.request().query(`
        SELECT TOP 1 
            site_logo, logo_height, primary_color, accent_color, navbar_bg,
            welcome_popup_status, welcome_popup_content, show_recent_orders,
            site_hotline, site_email, site_zalo, site_telegram, marquee_notice, usd_rate, updated_at
        FROM dbo.[Settings] 
        WHERE [name] = 'site_config'
    `);

    const colConfig = (configRes.recordset && configRes.recordset[0]) || {};

    const cleanHotline = (colConfig.site_hotline || settingsMap['site_hotline'] || settingsMap['hotline'] || '0989.461.037').trim();
    const cleanZalo = (colConfig.site_zalo || settingsMap['site_zalo'] || settingsMap['zalo'] || cleanHotline).trim();

    const merged = {
        // Master Column Configurations with fallbacks
        site_logo: colConfig.site_logo || settingsMap['site_logo'] || settingsMap['logo_dark'] || 'assets/storage/images/logo_kimcss.png',
        logo_height: colConfig.logo_height !== null && colConfig.logo_height !== undefined ? Number(colConfig.logo_height) : 54,
        primary_color: colConfig.primary_color || settingsMap['primary_color'] || settingsMap['theme_color'] || '#2563eb',
        accent_color: colConfig.accent_color || settingsMap['accent_color'] || settingsMap['theme_color1'] || '#d4af37',
        navbar_bg: colConfig.navbar_bg || settingsMap['navbar_bg'] || '#ffffff',
        welcome_popup_status: colConfig.welcome_popup_status !== null && colConfig.welcome_popup_status !== undefined ? (colConfig.welcome_popup_status ? 1 : 0) : 1,
        welcome_popup_content: colConfig.welcome_popup_content || settingsMap['welcome_popup_content'] || 'Chào mừng quý khách đến với kimcss.tech MMO SOLUTION!',
        show_recent_orders: colConfig.show_recent_orders !== null && colConfig.show_recent_orders !== undefined ? (colConfig.show_recent_orders ? 1 : 0) : 1,
        status_menu_tools: settingsMap['status_menu_tools'] !== undefined ? (Number(settingsMap['status_menu_tools']) ? 1 : 0) : 1,
        site_hotline: cleanHotline,
        site_email: colConfig.site_email || settingsMap['site_email'] || settingsMap['email'] || 'hotro@kimcss.tech',
        site_zalo: cleanZalo,
        zalo_url: settingsMap['zalo_url'] || `https://zalo.me/${cleanZalo.replace(/[^0-9]/g, '')}`,
        site_telegram: colConfig.site_telegram || settingsMap['site_telegram'] || settingsMap['telegram'] || '@kimcss_support',
        telegram_url: settingsMap['telegram_url'] || `https://t.me/${(colConfig.site_telegram || settingsMap['telegram'] || 'kimcss_support').replace('@', '')}`,
        marquee_notice: colConfig.marquee_notice || settingsMap['marquee_notice'] || settingsMap['notice_top_left'] || '🔥 Chào mừng bạn đến với kimcss.tech - Nạp tiền tự động qua VietQR duyệt trong 3 giây!',
        usd_rate: Number(colConfig.usd_rate || settingsMap['usd_rate'] || 25400),
        
        // Bank & VietQR Configuration
        bank_status: settingsMap['bank_status'] !== undefined ? (Number(settingsMap['bank_status']) ? 1 : 0) : 1,
        deposit_syntax_prefix: settingsMap['deposit_syntax_prefix'] || settingsMap['prefix_autobank'] || 'NAPTIEN',
        prefix_autobank: settingsMap['deposit_syntax_prefix'] || settingsMap['prefix_autobank'] || 'NAPTIEN',
        bank_min: Number(settingsMap['bank_min'] || 10000),
        bank_max: Number(settingsMap['bank_max'] || 50000000),
        bank_notice: settingsMap['bank_notice'] || 'Vui lòng nhập đúng nội dung chuyển khoản để hệ thống cộng tiền tự động trong 3 giây.',
        token_webhook_web2m: settingsMap['token_webhook_web2m'] || settingsMap['bank_webhook_token'] || '',

        // General text fields
        site_title: settingsMap['site_title'] || 'kimcss.tech - Hệ thống Bán Tài Khoản MMO Tự Động 24/7',
        site_author: settingsMap['site_author'] || 'kimcss.tech',
        site_description: settingsMap['site_description'] || 'Hệ thống cung cấp sỉ lẻ tài khoản Clone, Via Facebook, Gmail, TikTok tự động 24/7.',
        site_keywords: settingsMap['site_keywords'] || 'shop clone, via facebook, mua clone fb',
        copyright_footer: settingsMap['copyright_footer'] || '© 2026 kimcss.tech | Hệ thống Kinh Doanh MMO Tự Động',
        address: settingsMap['address'] || 'Hồ Chí Minh, Việt Nam',
        facebook_url: settingsMap['facebook_url'] || 'https://facebook.com',

        // Legacy compatibility aliases
        hotline: cleanHotline,
        email: colConfig.site_email || settingsMap['site_email'] || settingsMap['email'] || 'hotro@kimcss.tech',
        zalo: cleanZalo,
        telegram: colConfig.site_telegram || settingsMap['site_telegram'] || settingsMap['telegram'] || '@kimcss_support',
        logo_dark: colConfig.site_logo || settingsMap['site_logo'] || settingsMap['logo_dark'] || 'assets/storage/images/logo_kimcss.png',
        logo_light: colConfig.site_logo || settingsMap['site_logo'] || settingsMap['logo_light'] || 'assets/storage/images/logo_kimcss.png',
        favicon: settingsMap['favicon'] || 'assets/img/favicon.png',
        updated_at: colConfig.updated_at || new Date().toISOString()
    };

    return merged;
}

/**
 * GET /api/settings
 * Public endpoint to fetch all dynamic website configuration settings
 */
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const fullSettings = await getFullSettings(pool);

        return res.json({
            status: 'success',
            data: fullSettings
        });
    } catch (err) {
        console.error('Fetch Settings Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * POST /api/settings
 * Update settings (Admin only fallback)
 */
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const updates = req.body;
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ status: 'error', msg: 'Dữ liệu cấu hình không hợp lệ!' });
        }

        const pool = await getPool();
        for (const [key, val] of Object.entries(updates)) {
            const strVal = val !== undefined && val !== null ? String(val) : '';
            await pool.request()
                .input('name', sql.NVarChar(100), key)
                .input('value', sql.NVarChar(sql.MAX), strVal)
                .query(`
                    IF EXISTS (SELECT 1 FROM dbo.[Settings] WHERE [name] = @name)
                        UPDATE dbo.[Settings] SET [value] = @value, [updated_at] = GETDATE() WHERE [name] = @name;
                    ELSE
                        INSERT INTO dbo.[Settings] ([name], [value], [updated_at]) VALUES (@name, @value, GETDATE());
                `);
        }

        return res.json({
            status: 'success',
            msg: 'Cập nhật cấu hình hệ thống thành công!'
        });
    } catch (err) {
        console.error('Update Settings Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

module.exports = router;
module.exports.getFullSettings = getFullSettings;
