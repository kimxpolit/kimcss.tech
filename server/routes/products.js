/**
 * Products & Categories Routes: Live Stock, Filtering, Price Calculation
 */

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

/**
 * Format currency helper
 */
function formatVND(amount) {
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
}

/**
 * GET /api/products/categories
 */
router.get('/categories', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT id, name, slug, image, status, stt 
            FROM dbo.[Categories]
            WHERE status = 1
            ORDER BY stt ASC, id ASC
        `);

        return res.json({
            status: 'success',
            data: result.recordset
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * GET /api/products
 * Query params: category_id, keyword
 */
router.get('/', async (req, res) => {
    try {
        const { category_id, keyword } = req.query;
        const pool = await getPool();
        const request = pool.request();

        let query = `
            SELECT 
                p.id, 
                p.category_id, 
                c.name AS category_name, 
                c.image AS category_icon,
                p.name, 
                p.slug, 
                p.price, 
                p.cost, 
                p.discount, 
                p.description, 
                p.preview_image, 
                p.status, 
                p.stt,
                ISNULL((SELECT COUNT(1) FROM dbo.[ProductStock] ps WHERE ps.product_id = p.id AND ps.is_sold = 0), 0) AS stock,
                ISNULL((SELECT COUNT(1) FROM dbo.[ProductStock] ps WHERE ps.product_id = p.id AND ps.is_sold = 1), 0) AS sold
            FROM dbo.[Products] p
            INNER JOIN dbo.[Categories] c ON p.category_id = c.id
            WHERE p.status = 1 AND c.status = 1
        `;

        if (category_id) {
            query += ` AND p.category_id = @category_id`;
            request.input('category_id', sql.Int, parseInt(category_id));
        }

        if (keyword) {
            query += ` AND (p.name LIKE @keyword OR p.description LIKE @keyword)`;
            request.input('keyword', sql.NVarChar(255), `%${keyword.trim()}%`);
        }

        query += ` ORDER BY p.stt ASC, p.id DESC`;

        const result = await request.query(query);

        // Format prices and discount
        const products = result.recordset.map(p => {
            const unitPrice = Number(p.price);
            const discountPercent = Number(p.discount || 0);
            const salePrice = discountPercent > 0 ? Math.round(unitPrice * (1 - discountPercent / 100)) : unitPrice;

            return {
                ...p,
                price_formatted: formatVND(unitPrice),
                sale_price: salePrice,
                sale_price_formatted: formatVND(salePrice)
            };
        });

        return res.json({
            status: 'success',
            data: products
        });
    } catch (err) {
        console.error('Error fetching products:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * GET /api/products/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        if (isNaN(productId)) {
            return res.status(400).json({ status: 'error', msg: 'ID sản phẩm không hợp lệ!' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, productId)
            .query(`
                SELECT 
                    p.id, 
                    p.category_id, 
                    c.name AS category_name, 
                    c.image AS category_icon,
                    p.name, 
                    p.slug, 
                    p.price, 
                    p.cost, 
                    p.discount, 
                    p.description, 
                    p.preview_image, 
                    p.status,
                    ISNULL((SELECT COUNT(1) FROM dbo.[ProductStock] ps WHERE ps.product_id = p.id AND ps.is_sold = 0), 0) AS stock,
                    ISNULL((SELECT COUNT(1) FROM dbo.[ProductStock] ps WHERE ps.product_id = p.id AND ps.is_sold = 1), 0) AS sold
                FROM dbo.[Products] p
                INNER JOIN dbo.[Categories] c ON p.category_id = c.id
                WHERE p.id = @id AND p.status = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ status: 'error', msg: 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh!' });
        }

        const p = result.recordset[0];
        const unitPrice = Number(p.price);
        const discountPercent = Number(p.discount || 0);
        const salePrice = discountPercent > 0 ? Math.round(unitPrice * (1 - discountPercent / 100)) : unitPrice;

        return res.json({
            status: 'success',
            data: {
                ...p,
                price_formatted: formatVND(unitPrice),
                sale_price: salePrice,
                sale_price_formatted: formatVND(salePrice)
            }
        });
    } catch (err) {
        console.error('Error fetching product detail:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * POST /api/products/calculate-price
 * Calculates dynamic price with coupon support
 */
router.post('/calculate-price', async (req, res) => {
    try {
        const { product_id, amount, coupon } = req.body;
        const qty = Math.max(1, parseInt(amount) || 1);

        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, parseInt(product_id) || 0)
            .query(`
                SELECT id, name, price, discount,
                ISNULL((SELECT COUNT(1) FROM dbo.[ProductStock] ps WHERE ps.product_id = p.id AND ps.is_sold = 0), 0) AS stock
                FROM dbo.[Products] p 
                WHERE id = @id AND status = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ status: 'error', msg: 'Sản phẩm không tồn tại!' });
        }

        const prod = result.recordset[0];
        const unitPrice = Number(prod.price);
        const baseDiscount = Number(prod.discount || 0);
        const effectiveUnit = baseDiscount > 0 ? Math.round(unitPrice * (1 - baseDiscount / 100)) : unitPrice;
        const gross = effectiveUnit * qty;

        let couponDiscount = 0;
        if (coupon && coupon.trim().toUpperCase() === 'GIAM10') {
            couponDiscount = Math.round(gross * 0.1);
        }

        const netPay = Math.max(0, gross - couponDiscount);

        return res.json({
            status: 'success',
            data: {
                unit_price: effectiveUnit,
                unit_price_formatted: formatVND(effectiveUnit),
                quantity: qty,
                stock: prod.stock,
                gross_money: gross,
                gross_money_formatted: formatVND(gross),
                discount_amount: couponDiscount,
                discount_formatted: formatVND(couponDiscount),
                total_pay: netPay,
                total_pay_formatted: formatVND(netPay)
            }
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

module.exports = router;
