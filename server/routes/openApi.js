/**
 * ShopClone 7 - Open API Integration Endpoints
 * 100% Pure Node.js & Microsoft SQL Server (Replaces legacy PHP API files)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getPool, sql } = require('../config/db');

// Helper to authenticate via api_key
async function authenticateApiKey(req, res, next) {
    try {
        const apiKey = req.query.api_key || req.query.apikey || req.body.api_key || req.body.apikey || req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(401).json({ status: 'error', code: 201, msg: 'Thiếu api_key' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('api_key', sql.NVarChar(64), apiKey.trim())
            .query('SELECT id, username, email, balance, role, status, api_key FROM dbo.[Users] WHERE api_key = @api_key AND status = 1');

        if (result.recordset.length === 0) {
            return res.status(401).json({ status: 'error', code: 201, msg: 'api_key không hợp lệ hoặc tài khoản bị khóa' });
        }

        req.apiUser = result.recordset[0];
        next();
    } catch (err) {
        console.error('API Auth Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
}

/**
 * 1. GET /profile or /profile.php
 */
async function handleProfile(req, res) {
    const user = req.apiUser;
    return res.json({
        status: 'success',
        msg: 'Lấy dữ liệu thành công!',
        data: {
            username: user.username,
            email: user.email,
            money: Number(user.balance),
            balance: Number(user.balance)
        }
    });
}
router.get('/profile', authenticateApiKey, handleProfile);
router.get('/profile.php', authenticateApiKey, handleProfile);

/**
 * 2. GET /products or /products.php
 */
async function handleProducts(req, res) {
    try {
        const pool = await getPool();
        // Fetch categories with active products
        const catRes = await pool.request().query(`
            SELECT id, name, slug, image FROM dbo.[Categories] WHERE status = 1 ORDER BY stt ASC, id ASC
        `);
        const prodRes = await pool.request().query(`
            SELECT 
                p.id, p.category_id, p.name, p.price, p.discount, p.description,
                ISNULL((SELECT COUNT(1) FROM dbo.[ProductStock] ps WHERE ps.product_id = p.id AND ps.is_sold = 0), 0) AS stock
            FROM dbo.[Products] p
            WHERE p.status = 1
            ORDER BY p.stt ASC, p.id DESC
        `);

        const categories = catRes.recordset.map(cat => {
            const catProds = prodRes.recordset
                .filter(p => p.category_id === cat.id)
                .map(p => ({
                    id: p.id,
                    name: p.name,
                    price: Number(p.price),
                    amount: Number(p.stock),
                    description: p.description || '',
                    flag: 'vn',
                    min: 1,
                    max: Number(p.stock)
                }));

            return {
                id: cat.id,
                name: cat.name,
                icon: cat.image,
                products: catProds
            };
        });

        return res.json({
            status: 'success',
            msg: 'Lấy dữ liệu thành công!',
            categories: categories
        });
    } catch (err) {
        console.error('API Products Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
}
router.get('/products-list', authenticateApiKey, handleProducts);
router.get('/products.php', authenticateApiKey, handleProducts);

/**
 * 3. GET /product or /product.php
 */
async function handleSingleProduct(req, res) {
    try {
        const prodId = req.query.product || req.query.id;
        if (!prodId) {
            return res.status(400).json({ status: 'error', msg: 'Thiếu param product' });
        }

        const pool = await getPool();
        const prodRes = await pool.request()
            .input('id', sql.Int, parseInt(prodId))
            .query(`
                SELECT 
                    p.id, p.category_id, p.name, p.price, p.discount, p.description,
                    ISNULL((SELECT COUNT(1) FROM dbo.[ProductStock] ps WHERE ps.product_id = p.id AND ps.is_sold = 0), 0) AS stock
                FROM dbo.[Products] p
                WHERE p.id = @id AND p.status = 1
            `);

        if (prodRes.recordset.length === 0) {
            return res.status(404).json({ status: 'error', msg: 'Không tìm thấy sản phẩm' });
        }

        const p = prodRes.recordset[0];
        const dataProduct = [{
            id: p.id,
            name: p.name,
            price: Number(p.price),
            amount: Number(p.stock),
            description: p.description || '',
            flag: 'vn',
            min: 1,
            max: Number(p.stock)
        }];

        return res.json({
            status: 'success',
            msg: 'Lấy dữ liệu thành công!',
            product: dataProduct
        });
    } catch (err) {
        console.error('API Product Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
}
router.get('/product', authenticateApiKey, handleSingleProduct);
router.get('/product.php', authenticateApiKey, handleSingleProduct);

/**
 * 4. POST or GET /buy_product or /buy_product.php
 */
async function handleBuyProduct(req, res) {
    let pool;
    let transaction;
    try {
        const user = req.apiUser;
        const prodId = parseInt(req.body.id || req.query.id);
        const amount = parseInt(req.body.amount || req.query.amount);
        const coupon = (req.body.coupon || req.query.coupon || '').trim().toUpperCase();

        if (!prodId || isNaN(prodId)) {
            return res.status(400).json({ status: 'error', msg: 'ID sản phẩm không hợp lệ!' });
        }
        if (!amount || isNaN(amount) || amount < 1) {
            return res.status(400).json({ status: 'error', msg: 'Số lượng mua phải lớn hơn 0!' });
        }

        pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 1. Fetch product
        const prodReq = new sql.Request(transaction);
        const prodRes = await prodReq
            .input('prod_id', sql.Int, prodId)
            .query('SELECT id, name, price, discount, status FROM dbo.[Products] WITH (HOLDLOCK) WHERE id = @prod_id');

        if (prodRes.recordset.length === 0 || !prodRes.recordset[0].status) {
            await transaction.rollback();
            return res.status(400).json({ status: 'error', msg: 'Sản phẩm không khả dụng!' });
        }

        const product = prodRes.recordset[0];
        const unitPrice = Number(product.price);
        const discountPercent = Number(product.discount || 0);
        const saleUnit = discountPercent > 0 ? Math.round(unitPrice * (1 - discountPercent / 100)) : unitPrice;
        let totalPrice = saleUnit * amount;

        if (coupon === 'GIAM10') {
            totalPrice = Math.max(0, Math.round(totalPrice * 0.9));
        }

        // 2. Lock & Check user balance
        const userReq = new sql.Request(transaction);
        const userRes = await userReq
            .input('user_id', sql.Int, user.id)
            .query('SELECT id, username, balance FROM dbo.[Users] WITH (UPDLOCK) WHERE id = @user_id');

        const currentUser = userRes.recordset[0];
        const currentBalance = Number(currentUser.balance);

        if (currentBalance < totalPrice) {
            await transaction.rollback();
            return res.status(400).json({
                status: 'error',
                msg: `Số dư trong tài khoản không đủ để thanh toán đơn hàng này! Cần ${totalPrice.toLocaleString('vi-VN')} đ, hiện có ${currentBalance.toLocaleString('vi-VN')} đ`
            });
        }

        // 3. Fetch Stock Items
        const stockReq = new sql.Request(transaction);
        const stockRes = await stockReq
            .input('prod_id', sql.Int, prodId)
            .input('amount', sql.Int, amount)
            .query(`
                SELECT TOP (@amount) id, account_data 
                FROM dbo.[ProductStock] WITH (ROWLOCK, UPDLOCK)
                WHERE product_id = @prod_id AND is_sold = 0
                ORDER BY id ASC
            `);

        if (stockRes.recordset.length < amount) {
            await transaction.rollback();
            return res.status(400).json({
                status: 'error',
                msg: `Số lượng hàng trong kho không đủ! Hiện chỉ còn ${stockRes.recordset.length} tài khoản.`
            });
        }

        const stockItems = stockRes.recordset;
        const stockIds = stockItems.map(s => s.id);
        const accountsData = stockItems.map(s => s.account_data);
        const joinedAccounts = accountsData.join('\n');

        // 4. Create Order
        const orderCode = 'API_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const orderReq = new sql.Request(transaction);
        const orderRes = await orderReq
            .input('user_id', sql.Int, user.id)
            .input('order_code', sql.NVarChar(50), orderCode)
            .input('product_id', sql.Int, prodId)
            .input('product_name', sql.NVarChar(255), product.name)
            .input('quantity', sql.Int, amount)
            .input('unit_price', sql.BigInt, saleUnit)
            .input('total_price', sql.BigInt, totalPrice)
            .input('account_details', sql.NVarChar(sql.MAX), joinedAccounts)
            .query(`
                INSERT INTO dbo.[Orders] (user_id, order_code, product_id, product_name, quantity, unit_price, total_price, account_details, status)
                OUTPUT INSERTED.id
                VALUES (@user_id, @order_code, @product_id, @product_name, @quantity, @unit_price, @total_price, @account_details, 'completed')
            `);

        const orderId = orderRes.recordset[0].id;

        // 5. Mark stock sold
        const updateStockReq = new sql.Request(transaction);
        await updateStockReq
            .input('order_id', sql.Int, orderId)
            .query(`
                UPDATE dbo.[ProductStock]
                SET is_sold = 1, order_id = @order_id, sold_at = GETDATE()
                WHERE id IN (${stockIds.join(',')})
            `);

        // 6. Deduct Balance
        const newBalance = currentBalance - totalPrice;
        const deductReq = new sql.Request(transaction);
        await deductReq
            .input('user_id', sql.Int, user.id)
            .input('new_balance', sql.BigInt, newBalance)
            .query('UPDATE dbo.[Users] SET balance = @new_balance, updated_at = GETDATE() WHERE id = @user_id');

        // 7. Log Transaction
        const transReq = new sql.Request(transaction);
        await transReq
            .input('user_id', sql.Int, user.id)
            .input('trans_code', sql.NVarChar(50), 'TX' + Date.now().toString().slice(-8))
            .input('type', sql.NVarChar(50), 'purchase')
            .input('amount', sql.BigInt, -totalPrice)
            .input('balance_before', sql.BigInt, currentBalance)
            .input('balance_after', sql.BigInt, newBalance)
            .input('note', sql.NVarChar(sql.MAX), `Mua qua API: ${amount} x ${product.name} (Đơn hàng #${orderCode})`)
            .query(`
                INSERT INTO dbo.[Transactions] (user_id, trans_code, type, amount, balance_before, balance_after, note)
                VALUES (@user_id, @trans_code, @type, @amount, @balance_before, @balance_after, @note)
            `);

        await transaction.commit();

        return res.json({
            status: 'success',
            msg: 'Tạo đơn hàng thành công!',
            trans_id: orderCode,
            data: accountsData
        });

    } catch (err) {
        if (transaction) {
            try { await transaction.rollback(); } catch (e) { /* ignore */ }
        }
        console.error('API Buy Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
}
router.post('/buy_product', authenticateApiKey, handleBuyProduct);
router.get('/buy_product', authenticateApiKey, handleBuyProduct);
router.post('/buy_product.php', authenticateApiKey, handleBuyProduct);

/**
 * 5. Universal action style compatibility: /api.php
 */
router.all('/api.php', authenticateApiKey, async (req, res) => {
    const action = req.query.action || req.body.action;
    if (action === 'get-balance') {
        return res.json({
            username: req.apiUser.username,
            balance: Number(req.apiUser.balance)
        });
    } else if (action === 'get-services') {
        return handleProducts(req, res);
    } else if (action === 'create-order' || action === 'buyProduct') {
        return handleBuyProduct(req, res);
    } else {
        return res.json({ code: 201, msg: 'Hành động (action) không hợp lệ!' });
    }
});

module.exports = router;
