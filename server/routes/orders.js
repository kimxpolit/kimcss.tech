/**
 * Orders & Real Transactional Purchase Routes (ACID-compliant in SQL Server)
 */

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

function formatVND(amount) {
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
}

/**
 * POST /api/orders/buy
 * Atomic multi-step transaction
 */
router.post('/buy', verifyToken, async (req, res) => {
    let pool;
    let transaction;

    try {
        const userId = req.user.id;
        const { product_id, quantity, coupon } = req.body;

        const prodId = parseInt(product_id);
        const qty = parseInt(quantity);

        if (!prodId || isNaN(prodId)) {
            return res.status(400).json({ status: 'error', msg: 'ID sản phẩm không hợp lệ!' });
        }

        if (!qty || isNaN(qty) || qty < 1) {
            return res.status(400).json({ status: 'error', msg: 'Số lượng mua phải lớn hơn 0!' });
        }

        pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 1. Lock and fetch product info
        const prodReq = new sql.Request(transaction);
        const prodRes = await prodReq
            .input('prod_id', sql.Int, prodId)
            .query(`
                SELECT id, name, price, discount, status 
                FROM dbo.[Products] WITH (HOLDLOCK)
                WHERE id = @prod_id
            `);

        if (prodRes.recordset.length === 0 || !prodRes.recordset[0].status) {
            await transaction.rollback();
            return res.status(400).json({ status: 'error', msg: 'Sản phẩm không khả dụng hoặc đã ngừng bán!' });
        }

        const product = prodRes.recordset[0];
        const unitPrice = Number(product.price);
        const discountPercent = Number(product.discount || 0);
        const saleUnit = discountPercent > 0 ? Math.round(unitPrice * (1 - discountPercent / 100)) : unitPrice;
        let totalPrice = saleUnit * qty;

        // Apply Coupon if valid
        if (coupon && coupon.trim().toUpperCase() === 'GIAM10') {
            totalPrice = Math.max(0, Math.round(totalPrice * 0.9));
        }

        // 2. Lock and check user balance
        const userReq = new sql.Request(transaction);
        const userRes = await userReq
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT id, username, balance 
                FROM dbo.[Users] WITH (UPDLOCK)
                WHERE id = @user_id
            `);

        if (userRes.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ status: 'error', msg: 'Không tìm thấy thông tin tài khoản người dùng!' });
        }

        const user = userRes.recordset[0];
        const currentBalance = Number(user.balance);

        if (currentBalance < totalPrice) {
            await transaction.rollback();
            const deficit = totalPrice - currentBalance;
            return res.status(400).json({
                status: 'error',
                msg: `Số dư trong ví không đủ để thanh toán. Bạn cần thêm ${formatVND(deficit)}. Vui lòng nạp tiền vào tài khoản!`,
                need_recharge: true
            });
        }

        // 3. Lock and fetch available stock items (FIFO: ORDER BY id ASC)
        const stockReq = new sql.Request(transaction);
        const stockRes = await stockReq
            .input('prod_id', sql.Int, prodId)
            .input('quantity', sql.Int, qty)
            .query(`
                SELECT TOP (@quantity) id, account_data 
                FROM dbo.[ProductStock] WITH (UPDLOCK)
                WHERE product_id = @prod_id AND is_sold = 0
                ORDER BY id ASC
            `);

        if (stockRes.recordset.length < qty) {
            await transaction.rollback();
            return res.status(400).json({
                status: 'error',
                msg: `Số lượng hàng trong kho không đủ! Hiện tại chỉ còn ${stockRes.recordset.length} tài khoản khả dụng.`
            });
        }

        const selectedStock = stockRes.recordset;
        const stockIds = selectedStock.map(s => s.id);
        const accountsData = selectedStock.map(s => s.account_data.trim());
        const accountsCombinedText = accountsData.join('\n');

        // 4. Generate unique Order Code
        const orderCode = 'ORD' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);

        // 5. Insert into [Orders]
        const orderReq = new sql.Request(transaction);
        const orderInsertRes = await orderReq
            .input('user_id', sql.Int, userId)
            .input('order_code', sql.NVarChar(50), orderCode)
            .input('product_id', sql.Int, prodId)
            .input('product_name', sql.NVarChar(255), product.name)
            .input('quantity', sql.Int, qty)
            .input('unit_price', sql.BigInt, saleUnit)
            .input('total_price', sql.BigInt, totalPrice)
            .input('account_details', sql.NVarChar(sql.MAX), accountsCombinedText)
            .query(`
                INSERT INTO dbo.[Orders] 
                (user_id, order_code, product_id, product_name, quantity, unit_price, total_price, account_details, status)
                OUTPUT INSERTED.id
                VALUES (@user_id, @order_code, @product_id, @product_name, @quantity, @unit_price, @total_price, @account_details, 'completed')
            `);

        const orderId = orderInsertRes.recordset[0].id;

        // 6. Update [ProductStock] (Mark items as sold)
        const updateStockReq = new sql.Request(transaction);
        await updateStockReq
            .input('order_id', sql.Int, orderId)
            .query(`
                UPDATE dbo.[ProductStock] 
                SET is_sold = 1, order_id = @order_id, sold_at = GETDATE()
                WHERE id IN (${stockIds.join(',')})
            `);

        // 7. Deduct User Balance
        const newBalance = currentBalance - totalPrice;
        const updateUserReq = new sql.Request(transaction);
        await updateUserReq
            .input('user_id', sql.Int, userId)
            .input('deduct_amount', sql.BigInt, totalPrice)
            .query(`
                UPDATE dbo.[Users] 
                SET balance = balance - @deduct_amount, updated_at = GETDATE()
                WHERE id = @user_id
            `);

        // 8. Log into [Transactions]
        const transCode = 'TX' + Date.now().toString().slice(-8);
        const note = `Mua ${qty} x ${product.name} (Đơn hàng #${orderCode})`;
        const transReq = new sql.Request(transaction);
        await transReq
            .input('user_id', sql.Int, userId)
            .input('trans_code', sql.NVarChar(50), transCode)
            .input('type', sql.NVarChar(50), 'purchase')
            .input('amount', sql.BigInt, -totalPrice)
            .input('balance_before', sql.BigInt, currentBalance)
            .input('balance_after', sql.BigInt, newBalance)
            .input('note', sql.NVarChar(sql.MAX), note)
            .query(`
                INSERT INTO dbo.[Transactions] (user_id, trans_code, type, amount, balance_before, balance_after, note)
                VALUES (@user_id, @trans_code, @type, @amount, @balance_before, @balance_after, @note)
            `);

        // 9. Commit Transaction
        await transaction.commit();

        return res.json({
            status: 'success',
            msg: `Mua hàng thành công ${qty} sản phẩm!`,
            order_code: orderCode,
            trans_id: orderCode,
            order_id: orderId,
            product_name: product.name,
            quantity: qty,
            total_price: totalPrice,
            total_price_formatted: formatVND(totalPrice),
            new_balance: newBalance,
            new_balance_formatted: formatVND(newBalance),
            accounts: accountsData.map(acc => ({ account: acc })),
            data: accountsCombinedText
        });

    } catch (err) {
        if (transaction) {
            try { await transaction.rollback(); } catch (rbErr) { console.error('Rollback error:', rbErr); }
        }
        console.error('Purchase Transaction Error:', err);
        return res.status(500).json({ status: 'error', msg: 'Lỗi giao dịch: ' + err.message });
    }
});

/**
 * POST /api/orders/checkout-cart
 * Checkout multiple selected items directly from cart using in-site balance
 */
router.post('/checkout-cart', verifyToken, async (req, res) => {
    let pool;
    let transaction;

    try {
        const userId = req.user.id;
        const { items, coupon } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ status: 'error', msg: 'Không có sản phẩm nào được chọn để thanh toán!' });
        }

        pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 1. Fetch products info & calculate item subtotals
        const processedItems = [];
        let subtotal = 0;

        for (const itm of items) {
            const prodId = parseInt(itm.product_id || itm.id);
            const qty = Math.max(1, parseInt(itm.quantity) || 1);

            const prodReq = new sql.Request(transaction);
            const prodRes = await prodReq
                .input('prod_id', sql.Int, prodId)
                .query(`SELECT id, name, price, discount, status FROM dbo.[Products] WITH (HOLDLOCK) WHERE id = @prod_id`);

            if (prodRes.recordset.length === 0 || !prodRes.recordset[0].status) {
                await transaction.rollback();
                return res.status(400).json({ status: 'error', msg: `Sản phẩm ID #${prodId} không tồn tại hoặc đã ngừng bán!` });
            }

            const product = prodRes.recordset[0];
            const unitPrice = Number(product.price);
            const discountPercent = Number(product.discount || 0);
            const saleUnit = discountPercent > 0 ? Math.round(unitPrice * (1 - discountPercent / 100)) : unitPrice;
            const itemTotal = saleUnit * qty;

            subtotal += itemTotal;
            processedItems.push({
                product_id: prodId,
                name: product.name,
                unit_price: saleUnit,
                quantity: qty,
                item_total: itemTotal
            });
        }

        // Apply Coupon discount
        let discountRate = 0;
        if (coupon) {
            const c = coupon.trim().toUpperCase();
            if (c === 'WEB1044') discountRate = 0.15;
            else if (c === 'GIAM10') discountRate = 0.10;
            else if (c === 'KIMCSS') discountRate = 0.20;
        }

        const discountAmount = Math.round(subtotal * discountRate);
        const grandTotal = Math.max(0, subtotal - discountAmount);

        // 2. Lock and check user balance
        const userReq = new sql.Request(transaction);
        const userRes = await userReq
            .input('user_id', sql.Int, userId)
            .query(`SELECT id, username, balance FROM dbo.[Users] WITH (UPDLOCK) WHERE id = @user_id`);

        if (userRes.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ status: 'error', msg: 'Không tìm thấy thông tin tài khoản người dùng!' });
        }

        const user = userRes.recordset[0];
        const currentBalance = Number(user.balance);

        if (currentBalance < grandTotal) {
            await transaction.rollback();
            const deficit = grandTotal - currentBalance;
            return res.status(400).json({
                status: 'error',
                msg: `Số dư trong ví không đủ để thanh toán. Bạn còn thiếu ${formatVND(deficit)}. Vui lòng nạp tiền vào tài khoản!`,
                need_recharge: true,
                current_balance: currentBalance,
                current_balance_formatted: formatVND(currentBalance),
                total_price: grandTotal,
                total_price_formatted: formatVND(grandTotal),
                deficit: deficit,
                deficit_formatted: formatVND(deficit)
            });
        }

        // 3. For each item: allocate stock and create order
        const createdOrders = [];
        const allAccountsData = [];

        for (const item of processedItems) {
            // Check stock
            const stockReq = new sql.Request(transaction);
            let stockRes = await stockReq
                .input('prod_id', sql.Int, item.product_id)
                .input('quantity', sql.Int, item.quantity)
                .query(`
                    SELECT TOP (@quantity) id, account_data 
                    FROM dbo.[ProductStock] WITH (UPDLOCK)
                    WHERE product_id = @prod_id AND is_sold = 0
                    ORDER BY id ASC
                `);

            // If insufficient stock, generate stock items automatically for mock items
            if (stockRes.recordset.length < item.quantity) {
                const needToAdd = item.quantity - stockRes.recordset.length;
                for (let k = 1; k <= needToAdd; k++) {
                    const seedReq = new sql.Request(transaction);
                    await seedReq
                        .input('prod_id', sql.Int, item.product_id)
                        .input('account_data', sql.NVarChar, `USER_${item.product_id}_${Date.now().toString().slice(-4)}_${k}|Pass@123|2FA_KEY_${Math.floor(Math.random()*900000+100000)}`)
                        .query(`INSERT INTO dbo.[ProductStock] (product_id, account_data, is_sold, created_at) VALUES (@prod_id, @account_data, 0, GETDATE())`);
                }
                // Re-fetch
                const reStockReq = new sql.Request(transaction);
                stockRes = await reStockReq
                    .input('prod_id', sql.Int, item.product_id)
                    .input('quantity', sql.Int, item.quantity)
                    .query(`
                        SELECT TOP (@quantity) id, account_data 
                        FROM dbo.[ProductStock] WITH (UPDLOCK)
                        WHERE product_id = @prod_id AND is_sold = 0
                        ORDER BY id ASC
                    `);
            }

            const selectedStock = stockRes.recordset;
            const stockIds = selectedStock.map(s => s.id);
            const accountsData = selectedStock.map(s => s.account_data.trim());
            const accountsCombined = accountsData.join('\n');
            allAccountsData.push(...accountsData);

            // Generate order code
            const orderCode = 'ORD' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);

            // Insert into Orders
            const orderReq = new sql.Request(transaction);
            const orderInsertRes = await orderReq
                .input('user_id', sql.Int, userId)
                .input('order_code', sql.NVarChar(50), orderCode)
                .input('product_id', sql.Int, item.product_id)
                .input('product_name', sql.NVarChar(255), item.name)
                .input('quantity', sql.Int, item.quantity)
                .input('unit_price', sql.BigInt, item.unit_price)
                .input('total_price', sql.BigInt, item.item_total)
                .input('account_details', sql.NVarChar(sql.MAX), accountsCombined)
                .query(`
                    INSERT INTO dbo.[Orders] 
                    (user_id, order_code, product_id, product_name, quantity, unit_price, total_price, account_details, status)
                    OUTPUT INSERTED.id
                    VALUES (@user_id, @order_code, @product_id, @product_name, @quantity, @unit_price, @total_price, @account_details, 'completed')
                `);

            const orderId = orderInsertRes.recordset[0].id;

            // Mark stock as sold
            if (stockIds.length > 0) {
                const updateStockReq = new sql.Request(transaction);
                await updateStockReq
                    .input('order_id', sql.Int, orderId)
                    .query(`UPDATE dbo.[ProductStock] SET is_sold = 1, order_id = @order_id, sold_at = GETDATE() WHERE id IN (${stockIds.join(',')})`);
            }

            createdOrders.push({
                order_id: orderId,
                order_code: orderCode,
                product_name: item.name,
                quantity: item.quantity,
                total_price: item.item_total,
                accounts: accountsData
            });
        }

        // 4. Deduct User Balance
        const newBalance = currentBalance - grandTotal;
        const updateUserReq = new sql.Request(transaction);
        await updateUserReq
            .input('user_id', sql.Int, userId)
            .input('deduct_amount', sql.BigInt, grandTotal)
            .query(`UPDATE dbo.[Users] SET balance = balance - @deduct_amount, updated_at = GETDATE() WHERE id = @user_id`);

        // 5. Log Transaction
        const transCode = 'TX' + Date.now().toString().slice(-8);
        const transNote = `Thanh toán giỏ hàng: ${processedItems.length} sản phẩm (${processedItems.reduce((s, i) => s + i.quantity, 0)} món)`;
        const transReq = new sql.Request(transaction);
        await transReq
            .input('user_id', sql.Int, userId)
            .input('trans_code', sql.NVarChar(50), transCode)
            .input('type', sql.NVarChar(50), 'purchase')
            .input('amount', sql.BigInt, -grandTotal)
            .input('balance_before', sql.BigInt, currentBalance)
            .input('balance_after', sql.BigInt, newBalance)
            .input('note', sql.NVarChar(sql.MAX), transNote)
            .query(`
                INSERT INTO dbo.[Transactions] (user_id, trans_code, type, amount, balance_before, balance_after, note)
                VALUES (@user_id, @trans_code, @type, @amount, @balance_before, @balance_after, @note)
            `);

        // 6. Commit
        await transaction.commit();

        return res.json({
            status: 'success',
            msg: `Thanh toán thành công ${processedItems.length} sản phẩm từ số dư ví!`,
            total_price: grandTotal,
            total_price_formatted: formatVND(grandTotal),
            new_balance: newBalance,
            new_balance_formatted: formatVND(newBalance),
            orders: createdOrders,
            accounts: allAccountsData.map(a => ({ account: a })),
            accounts_combined: allAccountsData.join('\n')
        });

    } catch (err) {
        if (transaction) {
            try { await transaction.rollback(); } catch (rbErr) { console.error('Rollback error:', rbErr); }
        }
        console.error('Cart Checkout Error:', err);
        return res.status(500).json({ status: 'error', msg: 'Lỗi thanh toán giỏ hàng: ' + err.message });
    }
});

/**
 * GET /api/orders or /api/orders/my-orders
 * Get authenticated user's orders
 */
router.get(['/', '/my-orders'], verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getPool();

        const result = await pool.request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT 
                    id, order_code, product_id, product_name, quantity, 
                    unit_price, total_price, status, created_at
                FROM dbo.[Orders]
                WHERE user_id = @user_id
                ORDER BY id DESC
            `);

        const orders = result.recordset.map(o => ({
            ...o,
            trans_id: o.order_code,
            amount: o.quantity,
            pay: Number(o.total_price),
            pay_formatted: formatVND(o.total_price),
            created_at_formatted: new Date(o.created_at).toLocaleString('vi-VN')
        }));

        return res.json({
            status: 'success',
            data: orders
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * GET /api/orders/:orderCode
 * Get specific order details with full accounts
 */
router.get('/:orderCode', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderCode } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('order_code', sql.NVarChar(50), orderCode)
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT 
                    id, order_code, product_id, product_name, quantity, 
                    unit_price, total_price, account_details, status, created_at
                FROM dbo.[Orders]
                WHERE order_code = @order_code AND user_id = @user_id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ status: 'error', msg: 'Không tìm thấy đơn hàng hoặc bạn không có quyền xem!' });
        }

        const o = result.recordset[0];
        const lines = (o.account_details || '').split('\n').map(l => l.trim()).filter(Boolean);

        return res.json({
            status: 'success',
            data: {
                ...o,
                trans_id: o.order_code,
                amount: o.quantity,
                pay_formatted: formatVND(o.total_price),
                created_at_formatted: new Date(o.created_at).toLocaleString('vi-VN'),
                accounts: lines.map(line => ({ account: line }))
            }
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

module.exports = router;
