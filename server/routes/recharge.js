/**
 * Recharge & Banking Routes (VietQR Napas Integration & Real Balance Credit)
 */

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const { verifyToken, optionalAuth } = require('../middleware/auth');

function formatVND(amount) {
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
}

/**
 * GET /api/recharge/banks
 */
router.get('/banks', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT id, bank_id, bank_name, account_number, account_name, branch, icon, status
            FROM dbo.[BankAccounts]
            WHERE status = 1
        `);

        return res.json({
            status: 'success',
            data: result.recordset
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * GET /api/recharge/vietqr
 * Query: bank_id, account_number, account_name, amount, syntax
 */
router.get('/vietqr', optionalAuth, (req, res) => {
    const { bank_id, account_number, account_name, amount, syntax } = req.query;
    const username = req.user ? req.user.username : 'GUEST';
    const memo = syntax || `NAPTIEN ${username}`;
    const amt = parseInt(amount) || 0;

    // Standard VietQR Image URL
    const qrUrl = `https://img.vietqr.io/image/${bank_id || 'VCB'}-${account_number}-compact2.png?amount=${amt}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(account_name || '')}`;

    return res.json({
        status: 'success',
        qr_url: qrUrl,
        syntax: memo,
        amount: amt,
        amount_formatted: formatVND(amt)
    });
});

/**
 * GET /api/recharge/check-status
 * Real-time balance polling for active user
 */
router.get('/check-status', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getPool();

        const userRes = await pool.request()
            .input('user_id', sql.Int, userId)
            .query('SELECT id, username, balance, total_deposited FROM dbo.[Users] WHERE id = @user_id');

        if (userRes.recordset.length === 0) {
            return res.status(404).json({ status: 'error', msg: 'Không tìm thấy người dùng!' });
        }

        const user = userRes.recordset[0];

        const latestTxRes = await pool.request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT TOP 1 id, trans_code, type, amount, balance_before, balance_after, note, created_at
                FROM dbo.[Transactions]
                WHERE user_id = @user_id AND type = 'recharge'
                ORDER BY id DESC
            `);

        const latest = latestTxRes.recordset[0] || null;

        return res.json({
            status: 'success',
            username: user.username,
            balance: Number(user.balance),
            balance_formatted: formatVND(user.balance),
            total_deposited: Number(user.total_deposited),
            total_deposited_formatted: formatVND(user.total_deposited),
            latest_recharge: latest ? {
                ...latest,
                amount_formatted: formatVND(latest.amount),
                created_at_formatted: new Date(latest.created_at).toLocaleString('vi-VN')
            } : null
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * GET /api/recharge/transactions
 * Get user transaction history
 */
router.get('/transactions', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getPool();

        const result = await pool.request()
            .input('user_id', sql.Int, userId)
            .query(`
                SELECT id, trans_code, type, amount, balance_before, balance_after, note, created_at
                FROM dbo.[Transactions]
                WHERE user_id = @user_id
                ORDER BY created_at DESC
            `);

        const txs = result.recordset.map(t => ({
            ...t,
            amount_formatted: (t.amount > 0 ? '+' : '') + formatVND(t.amount),
            balance_before_formatted: formatVND(t.balance_before),
            balance_after_formatted: formatVND(t.balance_after),
            created_at_formatted: new Date(t.created_at).toLocaleString('vi-VN')
        }));

        return res.json({
            status: 'success',
            data: txs
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});


/**
 * POST /api/recharge/webhook
 * Bank Webhook (VietQR / Casso / SeABank / Vietcombank / MBBank)
 * Automatically credits user balance and logs transaction
 */
router.post('/webhook', async (req, res) => {
    let pool;
    let transaction;
    try {
        const body = req.body || {};
        const amount = parseInt(body.amount || body.transferAmount || (body.data && body.data.amount) || 0);
        const content = body.content || body.description || body.transfer_content || (body.data && body.data.description) || '';
        const transId = body.transaction_id || body.referenceCode || body.tid || ('WH' + Date.now());

        if (amount <= 0 || !content) {
            return res.status(400).json({ status: 'error', msg: 'Dữ liệu giao dịch nạp tiền không hợp lệ!' });
        }

        pool = await getPool();
        const usersRes = await pool.request().query('SELECT id, username, balance, total_deposited FROM dbo.[Users]');
        let matchedUser = null;

        // 1. Try regex: (?:NAP|NAPTIEN|SHOP)\s*([a-zA-Z0-9_]+)
        const match = content.match(/(?:NAP|NAPTIEN|SHOP)\s*([a-zA-Z0-9_]+)/i);
        if (match && match[1]) {
            const rawUser = match[1].toLowerCase();
            matchedUser = usersRes.recordset.find(u => u.username.toLowerCase() === rawUser);
        }

        // 2. Search if any username is contained in the content string
        if (!matchedUser) {
            for (const u of usersRes.recordset) {
                if (content.toLowerCase().includes(u.username.toLowerCase())) {
                    matchedUser = u;
                    break;
                }
            }
        }

        if (!matchedUser) {
            return res.status(404).json({ status: 'error', msg: `Không tìm thấy tài khoản phù hợp với nội dung: "${content}"` });
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const userReq = new sql.Request(transaction);
        const userCheck = await userReq
            .input('user_id', sql.Int, matchedUser.id)
            .query('SELECT id, username, balance, total_deposited FROM dbo.[Users] WITH (UPDLOCK) WHERE id = @user_id');

        const currentUser = userCheck.recordset[0];
        const oldBalance = Number(currentUser.balance);
        const newBalance = oldBalance + amount;
        const newTotalDep = Number(currentUser.total_deposited) + amount;

        const updateReq = new sql.Request(transaction);
        await updateReq
            .input('user_id', sql.Int, matchedUser.id)
            .input('new_balance', sql.BigInt, newBalance)
            .input('new_total_dep', sql.BigInt, newTotalDep)
            .query(`
                UPDATE dbo.[Users]
                SET balance = @new_balance, total_deposited = @new_total_dep, updated_at = GETDATE()
                WHERE id = @user_id
            `);

        const note = `Nạp tiền tự động qua VietQR Webhook (${content.substring(0, 50)})`;
        const transReq = new sql.Request(transaction);
        await transReq
            .input('user_id', sql.Int, matchedUser.id)
            .input('trans_code', sql.NVarChar(50), String(transId).substring(0, 50))
            .input('type', sql.NVarChar(50), 'recharge')
            .input('amount', sql.BigInt, amount)
            .input('balance_before', sql.BigInt, oldBalance)
            .input('balance_after', sql.BigInt, newBalance)
            .input('note', sql.NVarChar(sql.MAX), note)
            .query(`
                INSERT INTO dbo.[Transactions] (user_id, trans_code, type, amount, balance_before, balance_after, note)
                VALUES (@user_id, @trans_code, @type, @amount, @balance_before, @balance_after, @note)
            `);

        await transaction.commit();

        return res.json({
            status: 'success',
            msg: `Đã cộng thành công ${amount.toLocaleString('vi-VN')} ₫ cho tài khoản ${matchedUser.username}!`,
            username: matchedUser.username,
            amount: amount,
            balance: newBalance
        });
    } catch (err) {
        if (transaction) {
            try { await transaction.rollback(); } catch (rbErr) {}
        }
        console.error('Webhook Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * POST /api/recharge/card
 * Submit scratch card (Viettel, Vinaphone, Mobifone, Zing, etc.)
 */
router.post('/card', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { telco, amount, serial, pin } = req.body;

        if (!telco || !amount || !serial || !pin) {
            return res.status(400).json({ status: 'error', msg: 'Vui lòng điền đầy đủ loại thẻ, mệnh giá, số serial và mã pin!' });
        }

        const amt = parseInt(amount);
        if (isNaN(amt) || amt < 10000) {
            return res.status(400).json({ status: 'error', msg: 'Mệnh giá thẻ không hợp lệ!' });
        }

        // Standard discount fee: 15% (user receives 85%)
        const discountRate = 0.85;
        const realAmount = Math.round(amt * discountRate);

        const pool = await getPool();
        await pool.request()
            .input('user_id', sql.Int, userId)
            .input('telco', sql.NVarChar(50), telco)
            .input('amount', sql.Decimal(18, 2), amt)
            .input('serial', sql.NVarChar(100), String(serial).trim())
            .input('pin', sql.NVarChar(100), String(pin).trim())
            .input('status', sql.NVarChar(50), 'pending')
            .input('real_amount', sql.Decimal(18, 2), realAmount)
            .input('note', sql.NVarChar(255), `Nạp thẻ ${telco} ${amt.toLocaleString('vi-VN')} ₫ (Thực nhận: ${realAmount.toLocaleString('vi-VN')} ₫)`)
            .query(`
                INSERT INTO dbo.[Cards] (user_id, telco, amount, serial, pin, status, real_amount, note)
                VALUES (@user_id, @telco, @amount, @serial, @pin, @status, @real_amount, @note)
            `);

        return res.json({
            status: 'success',
            msg: `Gửi thẻ cào ${telco} ${amt.toLocaleString('vi-VN')} ₫ thành công! Hệ thống đang xử lý và gạch thẻ tự động trong 1 - 3 phút.`,
            real_amount: realAmount
        });
    } catch (err) {
        console.error('Card recharge error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

module.exports = router;
