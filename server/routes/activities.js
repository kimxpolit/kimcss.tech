/**
 * Recent Activities API (Recent Orders & Recent Deposits)
 * Directly queried from Microsoft SQL Server
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');

function formatVND(amount) {
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${Math.max(1, seconds)} giây trước`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

router.get('/recent', async (req, res) => {
    try {
        const pool = await getPool();

        // 1. Recent Orders
        const ordersRes = await pool.request().query(`
            SELECT TOP 20 
                o.id, o.order_code, o.product_name, o.quantity, o.total_price, o.created_at,
                u.username
            FROM dbo.[Orders] o
            LEFT JOIN dbo.[Users] u ON o.user_id = u.id
            ORDER BY o.id DESC
        `);

        // 2. Recent Deposits
        const depositsRes = await pool.request().query(`
            SELECT TOP 20 
                t.id, t.trans_code, t.amount, t.created_at, t.note,
                u.username
            FROM dbo.[Transactions] t
            LEFT JOIN dbo.[Users] u ON t.user_id = u.id
            WHERE t.type = 'recharge'
            ORDER BY t.id DESC
        `);

        const recent_orders = ordersRes.recordset.map(o => {
            const maskedUser = o.username ? ('***' + o.username.slice(-3)) : '***khách';
            return {
                id: o.id,
                order_code: o.order_code,
                username: maskedUser,
                product_name: o.product_name,
                amount: o.quantity,
                pay_formatted: formatVND(o.total_price),
                time_ago: timeAgo(o.created_at)
            };
        });

        const recent_deposits = depositsRes.recordset.map(d => {
            const maskedUser = d.username ? ('***' + d.username.slice(-3)) : '***khách';
            return {
                id: d.id,
                trans_code: d.trans_code,
                username: maskedUser,
                amount_formatted: formatVND(d.amount),
                method: 'VietQR Napas 24/7',
                time_ago: timeAgo(d.created_at)
            };
        });

        return res.json({
            status: 'success',
            data: {
                recent_orders,
                recent_deposits
            }
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

router.get('/recent-orders', async (req, res) => {
    try {
        const pool = await getPool();
        const ordersRes = await pool.request().query(`
            SELECT TOP 20 
                o.id, o.order_code, o.product_name, o.quantity, o.total_price, o.created_at,
                u.username
            FROM dbo.[Orders] o
            LEFT JOIN dbo.[Users] u ON o.user_id = u.id
            ORDER BY o.id DESC
        `);
        const recent_orders = ordersRes.recordset.map(o => {
            const maskedUser = o.username ? ('***' + o.username.slice(-3)) : '***khách';
            return {
                id: o.id,
                order_code: o.order_code,
                username: maskedUser,
                product_name: o.product_name,
                amount: o.quantity,
                pay_formatted: formatVND(o.total_price),
                time_ago: timeAgo(o.created_at)
            };
        });
        return res.json({ status: 'success', data: recent_orders });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

router.get('/recent-deposits', async (req, res) => {
    try {
        const pool = await getPool();
        const depositsRes = await pool.request().query(`
            SELECT TOP 20 
                t.id, t.trans_code, t.amount, t.created_at, t.note,
                u.username
            FROM dbo.[Transactions] t
            LEFT JOIN dbo.[Users] u ON t.user_id = u.id
            WHERE t.type = 'recharge'
            ORDER BY t.id DESC
        `);
        const recent_deposits = depositsRes.recordset.map(d => {
            const maskedUser = d.username ? ('***' + d.username.slice(-3)) : '***khách';
            return {
                id: d.id,
                trans_code: d.trans_code,
                username: maskedUser,
                amount_formatted: formatVND(d.amount),
                method: 'VietQR Napas 24/7',
                time_ago: timeAgo(d.created_at)
            };
        });
        return res.json({ status: 'success', data: recent_deposits });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

module.exports = router;
