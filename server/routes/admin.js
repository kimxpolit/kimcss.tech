/**
 * Admin Management API Routes (Protected by verifyToken & verifyAdmin)
 */

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

function formatVND(amount) {
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
}

// Apply guards to all admin routes
router.use(verifyToken, verifyAdmin);

/**
 * GET /api/admin/stats
 * Dashboard Overview
 */
router.get('/stats', async (req, res) => {
    try {
        const pool = await getPool();

        // Total users
        const usersCountRes = await pool.request().query('SELECT COUNT(1) AS total FROM dbo.[Users]');
        // Total orders & revenue
        const ordersRes = await pool.request().query(`
            SELECT 
                COUNT(1) AS total_orders, 
                ISNULL(SUM(total_price), 0) AS total_revenue 
            FROM dbo.[Orders]
        `);
        // Total unsold stock
        const stockRes = await pool.request().query(`
            SELECT COUNT(1) AS unsold_stock 
            FROM dbo.[ProductStock] 
            WHERE is_sold = 0
        `);
        // Total deposits
        const depositsRes = await pool.request().query(`
            SELECT ISNULL(SUM(amount), 0) AS total_deposits 
            FROM dbo.[Transactions] 
            WHERE type = 'recharge'
        `);
        // Recent 5 orders
        const recentOrdersRes = await pool.request().query(`
            SELECT TOP 5 
                o.id, o.order_code, o.product_name, o.quantity, o.total_price, o.created_at,
                u.username
            FROM dbo.[Orders] o
            INNER JOIN dbo.[Users] u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        `);
        // Recent 5 users
        const recentUsersRes = await pool.request().query(`
            SELECT TOP 5 id, username, email, balance, role, created_at 
            FROM dbo.[Users]
            ORDER BY created_at DESC
        `);

        const totalRev = Number(ordersRes.recordset[0].total_revenue);
        const totalDep = Number(depositsRes.recordset[0].total_deposits);

        return res.json({
            status: 'success',
            data: {
                total_users: usersCountRes.recordset[0].total,
                total_orders: ordersRes.recordset[0].total_orders,
                total_revenue: totalRev,
                total_revenue_formatted: formatVND(totalRev),
                total_deposits: totalDep,
                total_deposits_formatted: formatVND(totalDep),
                unsold_stock: stockRes.recordset[0].unsold_stock,
                recent_orders: recentOrdersRes.recordset.map(o => ({
                    ...o,
                    total_price_formatted: formatVND(o.total_price),
                    created_at_formatted: new Date(o.created_at).toLocaleString('vi-VN')
                })),
                recent_users: recentUsersRes.recordset.map(u => ({
                    ...u,
                    balance_formatted: formatVND(u.balance),
                    created_at_formatted: new Date(u.created_at).toLocaleDateString('vi-VN')
                }))
            }
        });
    } catch (err) {
        console.error('Admin Stats Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * Categories CRUD
 */
router.get('/categories', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT c.*, 
                (SELECT COUNT(1) FROM dbo.[Products] p WHERE p.category_id = c.id) AS product_count
            FROM dbo.[Categories] c
            ORDER BY c.stt ASC, c.id DESC
        `);
        return res.json({ status: 'success', data: result.recordset });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

router.post('/categories', async (req, res) => {
    try {
        const { name, slug, image, stt, status } = req.body;
        if (!name) return res.status(400).json({ status: 'error', msg: 'Vui lòng nhập tên danh mục!' });

        const pool = await getPool();
        const autoSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        await pool.request()
            .input('name', sql.NVarChar(100), name.trim())
            .input('slug', sql.NVarChar(100), autoSlug)
            .input('image', sql.NVarChar(255), image || '')
            .input('stt', sql.Int, parseInt(stt) || 0)
            .input('status', sql.Bit, status !== undefined ? (status ? 1 : 0) : 1)
            .query(`
                INSERT INTO dbo.[Categories] (name, slug, image, stt, status)
                VALUES (@name, @slug, @image, @stt, @status)
            `);

        return res.json({ status: 'success', msg: 'Thêm danh mục thành công!' });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

router.put('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, image, stt, status } = req.body;
        const pool = await getPool();

        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('name', sql.NVarChar(100), name.trim())
            .input('slug', sql.NVarChar(100), slug)
            .input('image', sql.NVarChar(255), image || '')
            .input('stt', sql.Int, parseInt(stt) || 0)
            .input('status', sql.Bit, status ? 1 : 0)
            .query(`
                UPDATE dbo.[Categories] 
                SET name = @name, slug = @slug, image = @image, stt = @stt, status = @status
                WHERE id = @id
            `);

        return res.json({ status: 'success', msg: 'Cập nhật danh mục thành công!' });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

router.delete('/categories/:id', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, parseInt(req.params.id))
            .query('DELETE FROM dbo.[Categories] WHERE id = @id');
        return res.json({ status: 'success', msg: 'Đã xóa danh mục!' });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * Products CRUD
 */
router.get('/products', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                p.*, c.name AS category_name,
                ISNULL((SELECT COUNT(1) FROM dbo.[ProductStock] ps WHERE ps.product_id = p.id AND ps.is_sold = 0), 0) AS stock,
                ISNULL((SELECT COUNT(1) FROM dbo.[ProductStock] ps WHERE ps.product_id = p.id AND ps.is_sold = 1), 0) AS sold
            FROM dbo.[Products] p
            INNER JOIN dbo.[Categories] c ON p.category_id = c.id
            ORDER BY p.id DESC
        `);

        const products = result.recordset.map(p => ({
            ...p,
            price_formatted: formatVND(p.price),
            cost_formatted: formatVND(p.cost)
        }));

        return res.json({ status: 'success', data: products });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

router.post('/products', async (req, res) => {
    try {
        const { category_id, name, slug, price, cost, discount, description, preview_image, status, stt } = req.body;
        if (!name || !category_id) {
            return res.status(400).json({ status: 'error', msg: 'Vui lòng nhập tên sản phẩm và danh mục!' });
        }

        const pool = await getPool();
        const autoSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        await pool.request()
            .input('category_id', sql.Int, parseInt(category_id))
            .input('name', sql.NVarChar(255), name.trim())
            .input('slug', sql.NVarChar(255), autoSlug)
            .input('price', sql.BigInt, parseInt(price) || 0)
            .input('cost', sql.BigInt, parseInt(cost) || 0)
            .input('discount', sql.Int, parseInt(discount) || 0)
            .input('description', sql.NVarChar(sql.MAX), description || '')
            .input('preview_image', sql.NVarChar(255), preview_image || '')
            .input('status', sql.Bit, status !== undefined ? (status ? 1 : 0) : 1)
            .input('stt', sql.Int, parseInt(stt) || 0)
            .query(`
                INSERT INTO dbo.[Products] 
                (category_id, name, slug, price, cost, discount, description, preview_image, status, stt)
                VALUES (@category_id, @name, @slug, @price, @cost, @discount, @description, @preview_image, @status, @stt)
            `);

        return res.json({ status: 'success', msg: 'Thêm sản phẩm thành công!' });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

router.put('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { category_id, name, slug, price, cost, discount, description, preview_image, status, stt } = req.body;
        const pool = await getPool();

        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('category_id', sql.Int, parseInt(category_id))
            .input('name', sql.NVarChar(255), name.trim())
            .input('slug', sql.NVarChar(255), slug)
            .input('price', sql.BigInt, parseInt(price) || 0)
            .input('cost', sql.BigInt, parseInt(cost) || 0)
            .input('discount', sql.Int, parseInt(discount) || 0)
            .input('description', sql.NVarChar(sql.MAX), description || '')
            .input('preview_image', sql.NVarChar(255), preview_image || '')
            .input('status', sql.Bit, status ? 1 : 0)
            .input('stt', sql.Int, parseInt(stt) || 0)
            .query(`
                UPDATE dbo.[Products]
                SET category_id = @category_id, name = @name, slug = @slug, price = @price,
                    cost = @cost, discount = @discount, description = @description,
                    preview_image = @preview_image, status = @status, stt = @stt, updated_at = GETDATE()
                WHERE id = @id
            `);

        return res.json({ status: 'success', msg: 'Cập nhật sản phẩm thành công!' });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

router.delete('/products/:id', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, parseInt(req.params.id))
            .query('DELETE FROM dbo.[Products] WHERE id = @id');
        return res.json({ status: 'success', msg: 'Đã xóa sản phẩm!' });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * Bulk Import Inventory Stock
 * POST /api/admin/stock/import
 */
router.post('/stock/import', async (req, res) => {
    try {
        const { product_id, account_data } = req.body;
        const prodId = parseInt(product_id);

        if (!prodId || !account_data) {
            return res.status(400).json({ status: 'error', msg: 'Vui lòng chọn sản phẩm và nhập danh sách tài khoản!' });
        }

        const lines = account_data.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
            return res.status(400).json({ status: 'error', msg: 'Không tìm thấy dòng tài khoản hợp lệ nào!' });
        }

        const pool = await getPool();

        // Batch insert in chunks of 500 for high efficiency
        let insertedCount = 0;
        const chunkSize = 200;
        for (let i = 0; i < lines.length; i += chunkSize) {
            const chunk = lines.slice(i, i + chunkSize);
            const values = chunk.map((c, idx) => `(@prodId, @acc_${i + idx}, 0)`).join(',');

            const reqBatch = pool.request().input('prodId', sql.Int, prodId);
            chunk.forEach((c, idx) => {
                reqBatch.input(`acc_${i + idx}`, sql.NVarChar(sql.MAX), c);
            });

            await reqBatch.query(`
                INSERT INTO dbo.[ProductStock] (product_id, account_data, is_sold)
                VALUES ${values}
            `);
            insertedCount += chunk.length;
        }

        return res.json({
            status: 'success',
            msg: `Đã nhập thành công ${insertedCount} tài khoản vào kho!`,
            count: insertedCount
        });
    } catch (err) {
        console.error('Stock Import Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * GET /api/admin/stock/:productId
 */
router.get('/stock/:productId', async (req, res) => {
    try {
        const prodId = parseInt(req.params.productId);
        const pool = await getPool();
        const result = await pool.request()
            .input('prodId', sql.Int, prodId)
            .query(`
                SELECT TOP 100 id, account_data, is_sold, order_id, created_at, sold_at
                FROM dbo.[ProductStock]
                WHERE product_id = @prodId
                ORDER BY id DESC
            `);

        return res.json({ status: 'success', data: result.recordset });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * Users Management
 */
router.get('/users', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT id, username, email, phone, fullname, balance, total_deposited, role, status, created_at
            FROM dbo.[Users]
            ORDER BY id DESC
        `);

        const users = result.recordset.map(u => ({
            ...u,
            balance_formatted: formatVND(u.balance),
            total_deposited_formatted: formatVND(u.total_deposited),
            created_at_formatted: new Date(u.created_at).toLocaleDateString('vi-VN')
        }));

        return res.json({ status: 'success', data: users });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * POST /api/admin/users/balance
 * Manually add or deduct balance with transaction logging
 */
router.post('/users/balance', async (req, res) => {
    let pool;
    let transaction;

    try {
        const { user_id, amount, note } = req.body;
        const uid = parseInt(user_id);
        const amt = parseInt(amount);

        if (!uid || isNaN(amt) || amt === 0) {
            return res.status(400).json({ status: 'error', msg: 'Thông tin số tiền hoặc thành viên không hợp lệ!' });
        }

        pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const userReq = new sql.Request(transaction);
        const userRes = await userReq
            .input('user_id', sql.Int, uid)
            .query('SELECT id, username, balance FROM dbo.[Users] WITH (UPDLOCK) WHERE id = @user_id');

        if (userRes.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ status: 'error', msg: 'Không tìm thấy người dùng!' });
        }

        const user = userRes.recordset[0];
        const oldBal = Number(user.balance);
        const newBal = oldBal + amt;

        if (newBal < 0) {
            await transaction.rollback();
            return res.status(400).json({ status: 'error', msg: 'Số dư sau khi trừ không thể nhỏ hơn 0!' });
        }

        // Update balance
        const updateReq = new sql.Request(transaction);
        await updateReq
            .input('user_id', sql.Int, uid)
            .input('new_balance', sql.BigInt, newBal)
            .query('UPDATE dbo.[Users] SET balance = @new_balance, updated_at = GETDATE() WHERE id = @user_id');

        // Log transaction
        const transCode = 'ADM' + Date.now().toString().slice(-8);
        const transReq = new sql.Request(transaction);
        await transReq
            .input('user_id', sql.Int, uid)
            .input('trans_code', sql.NVarChar(50), transCode)
            .input('type', sql.NVarChar(50), 'admin_adjustment')
            .input('amount', sql.BigInt, amt)
            .input('balance_before', sql.BigInt, oldBal)
            .input('balance_after', sql.BigInt, newBal)
            .input('note', sql.NVarChar(sql.MAX), note || `Admin điều chỉnh số dư (${amt > 0 ? '+' : ''}${formatVND(amt)})`)
            .query(`
                INSERT INTO dbo.[Transactions] (user_id, trans_code, type, amount, balance_before, balance_after, note)
                VALUES (@user_id, @trans_code, @type, @amount, @balance_before, @balance_after, @note)
            `);

        await transaction.commit();

        return res.json({
            status: 'success',
            msg: `Đã cập nhật số dư cho thành viên ${user.username}: ${formatVND(newBal)}!`,
            new_balance: newBal,
            new_balance_formatted: formatVND(newBal)
        });

    } catch (err) {
        if (transaction) {
            try { await transaction.rollback(); } catch (rbErr) {}
        }
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * All System Orders
 */
router.get('/orders', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                o.*, u.username, u.email
            FROM dbo.[Orders] o
            INNER JOIN dbo.[Users] u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        `);

        const orders = result.recordset.map(o => ({
            ...o,
            total_price_formatted: formatVND(o.total_price),
            created_at_formatted: new Date(o.created_at).toLocaleString('vi-VN')
        }));

        return res.json({ status: 'success', data: orders });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * GET /api/admin/settings
 */
router.get('/settings', async (req, res) => {
    try {
        const pool = await getPool();
        const { getFullSettings } = require('./settings');
        const settings = await getFullSettings(pool);
        return res.json({ status: 'success', data: settings });
    } catch (err) {
        console.error('Admin Get Settings Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * POST /api/admin/settings
 */
router.post('/settings', async (req, res) => {
    try {
        const d = req.body;
        if (!d || typeof d !== 'object') {
            return res.status(400).json({ status: 'error', msg: 'Dữ liệu không hợp lệ!' });
        }

        const pool = await getPool();

        // 1. Update the master site_config column-based row
        const siteLogo = d.site_logo !== undefined ? String(d.site_logo).trim() : null;
        const logoHeight = d.logo_height !== undefined ? parseInt(d.logo_height) : 54;
        const primaryColor = d.primary_color !== undefined ? String(d.primary_color).trim() : '#2563eb';
        const accentColor = d.accent_color !== undefined ? String(d.accent_color).trim() : '#d4af37';
        const navbarBg = d.navbar_bg !== undefined ? String(d.navbar_bg).trim() : '#ffffff';
        const welcomePopupStatus = d.welcome_popup_status !== undefined ? (d.welcome_popup_status ? 1 : 0) : 1;
        const welcomePopupContent = d.welcome_popup_content !== undefined ? String(d.welcome_popup_content) : '';
        const showRecentOrders = d.show_recent_orders !== undefined ? (d.show_recent_orders ? 1 : 0) : 1;
        const siteHotline = d.site_hotline !== undefined ? String(d.site_hotline).trim() : '0989.461.037';
        const cleanHotline = siteHotline.replace(/[^0-9]/g, '');
        const siteEmail = d.site_email !== undefined ? String(d.site_email).trim() : 'hotro@kimcss.tech';
        const siteZalo = d.site_zalo !== undefined && String(d.site_zalo).trim() ? String(d.site_zalo).trim() : siteHotline;
        const cleanZalo = siteZalo.replace(/[^0-9]/g, '');
        const siteTelegram = d.site_telegram !== undefined ? String(d.site_telegram).trim() : '@kimcss_support';
        const marqueeNotice = d.marquee_notice !== undefined ? String(d.marquee_notice) : '';
        const usdRate = d.usd_rate !== undefined ? parseFloat(d.usd_rate) || 25400 : 25400;

        await pool.request()
            .input('site_logo', sql.NVarChar(500), siteLogo)
            .input('logo_height', sql.Int, logoHeight)
            .input('primary_color', sql.VarChar(50), primaryColor)
            .input('accent_color', sql.VarChar(50), accentColor)
            .input('navbar_bg', sql.VarChar(50), navbarBg)
            .input('welcome_popup_status', sql.Bit, welcomePopupStatus)
            .input('welcome_popup_content', sql.NVarChar(sql.MAX), welcomePopupContent)
            .input('show_recent_orders', sql.Bit, showRecentOrders)
            .input('site_hotline', sql.VarChar(50), siteHotline)
            .input('site_email', sql.VarChar(100), siteEmail)
            .input('site_zalo', sql.VarChar(255), siteZalo)
            .input('site_telegram', sql.VarChar(255), siteTelegram)
            .input('marquee_notice', sql.NVarChar(sql.MAX), marqueeNotice)
            .input('usd_rate', sql.Decimal(18, 2), usdRate)
            .query(`
                IF EXISTS (SELECT 1 FROM dbo.[Settings] WHERE [name] = 'site_config')
                BEGIN
                    UPDATE dbo.[Settings] SET
                        [site_logo] = ISNULL(@site_logo, [site_logo]),
                        [logo_height] = @logo_height,
                        [primary_color] = @primary_color,
                        [accent_color] = @accent_color,
                        [navbar_bg] = @navbar_bg,
                        [welcome_popup_status] = @welcome_popup_status,
                        [welcome_popup_content] = @welcome_popup_content,
                        [show_recent_orders] = @show_recent_orders,
                        [site_hotline] = @site_hotline,
                        [site_email] = @site_email,
                        [site_zalo] = @site_zalo,
                        [site_telegram] = @site_telegram,
                        [marquee_notice] = @marquee_notice,
                        [usd_rate] = @usd_rate,
                        [updated_at] = GETDATE()
                    WHERE [name] = 'site_config';
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.[Settings] (
                        [name], [value], [updated_at],
                        [site_logo], [logo_height], [primary_color], [accent_color], [navbar_bg],
                        [welcome_popup_status], [welcome_popup_content], [show_recent_orders],
                        [site_hotline], [site_email], [site_zalo], [site_telegram], [marquee_notice], [usd_rate]
                    ) VALUES (
                        'site_config', 'active', GETDATE(),
                        @site_logo, @logo_height, @primary_color, @accent_color, @navbar_bg,
                        @welcome_popup_status, @welcome_popup_content, @show_recent_orders,
                        @site_hotline, @site_email, @site_zalo, @site_telegram, @marquee_notice, @usd_rate
                    );
                END
            `);

        // 2. Also sync key-value pairs for full legacy and client compatibility
        const syncPairs = {
            hotline: siteHotline,
            site_hotline: siteHotline,
            email: siteEmail,
            site_email: siteEmail,
            zalo: siteZalo,
            site_zalo: siteZalo,
            zalo_url: `https://zalo.me/${cleanZalo || cleanHotline}`,
            telegram: siteTelegram,
            site_telegram: siteTelegram,
            telegram_url: `https://t.me/${siteTelegram.replace('@', '')}`,
            notice_top_left: marqueeNotice,
            marquee_notice: marqueeNotice,
            logo_height: String(logoHeight),
            usd_rate: String(usdRate),
            primary_color: primaryColor,
            theme_color: primaryColor,
            accent_color: accentColor,
            theme_color1: accentColor,
            navbar_bg: navbarBg,
            welcome_popup_status: String(welcomePopupStatus),
            welcome_popup_content: welcomePopupContent,
            show_recent_orders: String(showRecentOrders)
        };
        if (siteLogo) {
            syncPairs.logo_dark = siteLogo;
            syncPairs.logo_light = siteLogo;
            syncPairs.site_logo = siteLogo;
        }
        if (d.site_title) syncPairs.site_title = String(d.site_title).trim();
        if (d.site_author) syncPairs.site_author = String(d.site_author).trim();
        if (d.site_description) syncPairs.site_description = String(d.site_description).trim();
        if (d.copyright_footer) syncPairs.copyright_footer = String(d.copyright_footer).trim();
        if (d.status_menu_tools !== undefined) {
            syncPairs.status_menu_tools = String(d.status_menu_tools ? 1 : 0);
        }
        if (d.bank_status !== undefined) syncPairs.bank_status = String(d.bank_status ? 1 : 0);
        if (d.deposit_syntax_prefix !== undefined) {
            syncPairs.deposit_syntax_prefix = String(d.deposit_syntax_prefix).trim();
            syncPairs.prefix_autobank = String(d.deposit_syntax_prefix).trim();
        }
        if (d.prefix_autobank !== undefined) {
            syncPairs.deposit_syntax_prefix = String(d.prefix_autobank).trim();
            syncPairs.prefix_autobank = String(d.prefix_autobank).trim();
        }
        if (d.bank_min !== undefined) syncPairs.bank_min = String(parseInt(d.bank_min) || 10000);
        if (d.bank_max !== undefined) syncPairs.bank_max = String(parseInt(d.bank_max) || 50000000);
        if (d.bank_notice !== undefined) syncPairs.bank_notice = String(d.bank_notice);
        if (d.token_webhook_web2m !== undefined) syncPairs.token_webhook_web2m = String(d.token_webhook_web2m).trim();

        for (const [k, v] of Object.entries(syncPairs)) {
            await pool.request()
                .input('name', sql.NVarChar(100), k)
                .input('value', sql.NVarChar(sql.MAX), String(v))
                .query(`
                    IF EXISTS (SELECT 1 FROM dbo.[Settings] WHERE [name] = @name)
                        UPDATE dbo.[Settings] SET [value] = @value, [updated_at] = GETDATE() WHERE [name] = @name;
                    ELSE
                        INSERT INTO dbo.[Settings] ([name], [value], [updated_at]) VALUES (@name, @value, GETDATE());
                `);
        }

        // 3. Update MoMo bank account phone number to match the new hotline
        if (cleanHotline) {
            await pool.request()
                .input('phone', sql.NVarChar(50), cleanHotline)
                .query(`
                    UPDATE dbo.[BankAccounts] 
                    SET account_number = @phone 
                    WHERE bank_id = 'MOMO' OR LOWER(bank_name) LIKE '%momo%';
                `);
        }

        const { getFullSettings } = require('./settings');
        const updated = await getFullSettings(pool);

        return res.json({
            status: 'success',
            msg: 'Cập nhật cấu hình giao diện và toàn bộ hệ thống thành công!',
            data: updated
        });
    } catch (err) {
        console.error('Admin Update Settings Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * GET /api/admin/banks
 * Get all bank accounts & bank configuration
 */
router.get('/banks', async (req, res) => {
    try {
        const pool = await getPool();
        const banksRes = await pool.request().query('SELECT * FROM dbo.[BankAccounts] ORDER BY id ASC');
        const { getFullSettings } = require('./settings');
        const settings = await getFullSettings(pool);

        return res.json({
            status: 'success',
            banks: banksRes.recordset,
            settings: {
                bank_status: settings.bank_status,
                deposit_syntax_prefix: settings.deposit_syntax_prefix,
                prefix_autobank: settings.prefix_autobank,
                bank_min: settings.bank_min,
                bank_max: settings.bank_max,
                bank_notice: settings.bank_notice,
                token_webhook_web2m: settings.token_webhook_web2m
            }
        });
    } catch (err) {
        console.error('Admin Get Banks Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * POST /api/admin/banks
 * Add a new bank account
 */
router.post('/banks', async (req, res) => {
    try {
        const { bank_id, bank_name, account_number, account_name, branch, icon, status } = req.body;
        if (!bank_id || !bank_name || !account_number || !account_name) {
            return res.status(400).json({ status: 'error', msg: 'Vui lòng điền đầy đủ: Mã ngân hàng, Tên ngân hàng, Số tài khoản, Chủ tài khoản!' });
        }

        const pool = await getPool();
        const finalIcon = icon || `https://api.vietqr.io/img/${bank_id.toUpperCase()}.png`;
        const finalStatus = status === 0 || status === false ? 0 : 1;

        const insertRes = await pool.request()
            .input('bank_id', sql.NVarChar(50), String(bank_id).toUpperCase().trim())
            .input('bank_name', sql.NVarChar(100), String(bank_name).trim())
            .input('account_number', sql.NVarChar(50), String(account_number).trim())
            .input('account_name', sql.NVarChar(100), String(account_name).toUpperCase().trim())
            .input('branch', sql.NVarChar(100), branch ? String(branch).trim() : 'Toàn quốc')
            .input('icon', sql.NVarChar(255), finalIcon)
            .input('status', sql.Bit, finalStatus)
            .query(`
                INSERT INTO dbo.[BankAccounts] (bank_id, bank_name, account_number, account_name, branch, icon, status)
                OUTPUT INSERTED.*
                VALUES (@bank_id, @bank_name, @account_number, @account_name, @branch, @icon, @status);
            `);

        return res.json({
            status: 'success',
            msg: `Đã thêm tài khoản ngân hàng ${bank_name} (${account_number}) thành công!`,
            data: insertRes.recordset[0]
        });
    } catch (err) {
        console.error('Admin Add Bank Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * PUT /api/admin/banks/:id
 * Update an existing bank account
 */
router.put('/banks/:id', async (req, res) => {
    try {
        const bankId = parseInt(req.params.id);
        const { bank_id, bank_name, account_number, account_name, branch, icon, status } = req.body;

        const pool = await getPool();
        const checkRes = await pool.request()
            .input('id', sql.Int, bankId)
            .query('SELECT * FROM dbo.[BankAccounts] WHERE id = @id');

        if (!checkRes.recordset || checkRes.recordset.length === 0) {
            return res.status(404).json({ status: 'error', msg: 'Không tìm thấy tài khoản ngân hàng cần sửa!' });
        }

        const current = checkRes.recordset[0];
        const newBankId = bank_id !== undefined ? String(bank_id).toUpperCase().trim() : current.bank_id;
        const newBankName = bank_name !== undefined ? String(bank_name).trim() : current.bank_name;
        const newAccNum = account_number !== undefined ? String(account_number).trim() : current.account_number;
        const newAccName = account_name !== undefined ? String(account_name).toUpperCase().trim() : current.account_name;
        const newBranch = branch !== undefined ? String(branch).trim() : current.branch;
        const newIcon = icon !== undefined ? String(icon).trim() : current.icon;
        const newStatus = status !== undefined ? (status ? 1 : 0) : (current.status ? 1 : 0);

        await pool.request()
            .input('id', sql.Int, bankId)
            .input('bank_id', sql.NVarChar(50), newBankId)
            .input('bank_name', sql.NVarChar(100), newBankName)
            .input('account_number', sql.NVarChar(50), newAccNum)
            .input('account_name', sql.NVarChar(100), newAccName)
            .input('branch', sql.NVarChar(100), newBranch)
            .input('icon', sql.NVarChar(255), newIcon)
            .input('status', sql.Bit, newStatus)
            .query(`
                UPDATE dbo.[BankAccounts]
                SET bank_id = @bank_id,
                    bank_name = @bank_name,
                    account_number = @account_number,
                    account_name = @account_name,
                    branch = @branch,
                    icon = @icon,
                    status = @status
                WHERE id = @id;
            `);

        return res.json({
            status: 'success',
            msg: `Đã cập nhật thông tin ngân hàng ${newBankName} thành công!`
        });
    } catch (err) {
        console.error('Admin Update Bank Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * DELETE /api/admin/banks/:id
 * Delete a bank account
 */
router.delete('/banks/:id', async (req, res) => {
    try {
        const bankId = parseInt(req.params.id);
        const pool = await getPool();

        await pool.request()
            .input('id', sql.Int, bankId)
            .query('DELETE FROM dbo.[BankAccounts] WHERE id = @id');

        return res.json({
            status: 'success',
            msg: 'Đã xóa tài khoản ngân hàng thành công!'
        });
    } catch (err) {
        console.error('Admin Delete Bank Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * POST /api/admin/banks/toggle-status/:id
 * Toggle status of a bank account
 */
router.post('/banks/toggle-status/:id', async (req, res) => {
    try {
        const bankId = parseInt(req.params.id);
        const pool = await getPool();

        const result = await pool.request()
            .input('id', sql.Int, bankId)
            .query(`
                UPDATE dbo.[BankAccounts]
                SET status = CASE WHEN status = 1 THEN 0 ELSE 1 END
                OUTPUT INSERTED.status, INSERTED.bank_name
                WHERE id = @id;
            `);

        if (!result.recordset || result.recordset.length === 0) {
            return res.status(404).json({ status: 'error', msg: 'Không tìm thấy ngân hàng!' });
        }

        const updated = result.recordset[0];
        const stateText = updated.status ? 'Bật nhận tiền' : 'Tắt';

        return res.json({
            status: 'success',
            msg: `Đã chuyển trạng thái ${updated.bank_name} sang [${stateText}]!`,
            newStatus: updated.status ? 1 : 0,
            status_value: updated.status ? 1 : 0
        });
    } catch (err) {
        console.error('Admin Toggle Bank Status Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * POST /api/admin/banks/settings
 * Update bank configuration settings
 */
router.post('/banks/settings', async (req, res) => {
    try {
        const { bank_status, deposit_syntax_prefix, prefix_autobank, bank_min, bank_max, bank_notice, token_webhook_web2m } = req.body;
        const pool = await getPool();

        const pairs = {};
        if (bank_status !== undefined) pairs.bank_status = String(bank_status ? 1 : 0);
        const prefix = deposit_syntax_prefix !== undefined ? deposit_syntax_prefix : prefix_autobank;
        if (prefix !== undefined) {
            pairs.deposit_syntax_prefix = String(prefix).trim();
            pairs.prefix_autobank = String(prefix).trim();
        }
        if (bank_min !== undefined) pairs.bank_min = String(parseInt(bank_min) || 10000);
        if (bank_max !== undefined) pairs.bank_max = String(parseInt(bank_max) || 50000000);
        if (bank_notice !== undefined) pairs.bank_notice = String(bank_notice);
        if (token_webhook_web2m !== undefined) pairs.token_webhook_web2m = String(token_webhook_web2m).trim();

        for (const [k, v] of Object.entries(pairs)) {
            await pool.request()
                .input('name', sql.NVarChar(100), k)
                .input('value', sql.NVarChar(sql.MAX), String(v))
                .query(`
                    IF EXISTS (SELECT 1 FROM dbo.[Settings] WHERE [name] = @name)
                        UPDATE dbo.[Settings] SET [value] = @value, [updated_at] = GETDATE() WHERE [name] = @name;
                    ELSE
                        INSERT INTO dbo.[Settings] ([name], [value], [updated_at]) VALUES (@name, @value, GETDATE());
                `);
        }

        return res.json({
            status: 'success',
            msg: 'Cập nhật cấu hình nạp tiền ngân hàng thành công!'
        });
    } catch (err) {
        console.error('Admin Save Bank Settings Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * POST /api/admin/upload-media
 * Upload .png, .gif, .mp4, .webm, .webp, .svg media file
 */
router.post('/upload-media', async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');

        let originalName = 'upload_' + Date.now();
        let fileBuffer = null;

        // Check if JSON base64 upload
        if (req.body && (req.body.data || req.body.file || req.body.base64)) {
            const rawData = req.body.data || req.body.file || req.body.base64;
            originalName = (req.body.filename || req.body.name || originalName).trim();

            const base64Data = rawData.replace(/^data:[^;]+;base64,/, '');
            fileBuffer = Buffer.from(base64Data, 'base64');
        } else {
            return res.status(400).json({ status: 'error', msg: 'Không tìm thấy dữ liệu tệp tin upload!' });
        }

        // Sanitize filename
        const ext = path.extname(originalName).toLowerCase() || '.png';
        const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.webm'];
        if (!allowedExts.includes(ext)) {
            return res.status(400).json({ status: 'error', msg: `Định dạng tệp ${ext} không được hỗ trợ!` });
        }

        const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const finalFileName = `${Date.now()}_${baseName}${ext}`;

        const uploadDirPublic = path.join(__dirname, '..', '..', 'public', 'assets', 'uploads');
        const uploadDirRoot = path.join(__dirname, '..', '..', 'assets', 'uploads');

        if (!fs.existsSync(uploadDirPublic)) fs.mkdirSync(uploadDirPublic, { recursive: true });
        if (!fs.existsSync(uploadDirRoot)) fs.mkdirSync(uploadDirRoot, { recursive: true });

        fs.writeFileSync(path.join(uploadDirPublic, finalFileName), fileBuffer);
        fs.writeFileSync(path.join(uploadDirRoot, finalFileName), fileBuffer);

        const fileUrl = `/assets/uploads/${finalFileName}`;

        return res.json({
            status: 'success',
            msg: 'Tải lên tệp tin media thành công!',
            url: fileUrl,
            file_url: fileUrl,
            filename: finalFileName
        });
    } catch (err) {
        console.error('Upload Media Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

module.exports = router;
