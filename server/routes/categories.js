/**
 * Categories Route: GET /api/categories
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT id, name, slug, image AS icon, status, stt 
            FROM dbo.[Categories]
            WHERE status = 1
            ORDER BY stt ASC, id ASC
        `);
        return res.json({
            status: 'success',
            data: result.recordset
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

module.exports = router;
