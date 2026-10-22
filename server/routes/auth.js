/**
 * Authentication Routes: Register, Login, Me, Change Password
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getPool, sql } = require('../config/db');
const { JWT_SECRET, verifyToken } = require('../middleware/auth');

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
    try {
        const { username, password, email, phone, fullname } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({
                status: 'error',
                msg: 'Vui lòng điền đầy đủ tên đăng nhập, mật khẩu và email!'
            });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanUsername.length < 3) {
            return res.status(400).json({
                status: 'error',
                msg: 'Tên đăng nhập phải có ít nhất 3 ký tự!'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                status: 'error',
                msg: 'Mật khẩu phải có ít nhất 6 ký tự!'
            });
        }

        const pool = await getPool();

        // Check duplicate
        const checkUser = await pool.request()
            .input('username', sql.NVarChar(50), cleanUsername)
            .input('email', sql.NVarChar(100), cleanEmail)
            .query(`
                SELECT id FROM dbo.[Users] 
                WHERE username = @username OR email = @email
            `);

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({
                status: 'error',
                msg: 'Tên đăng nhập hoặc email đã tồn tại trên hệ thống!'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const apiKey = crypto.randomBytes(16).toString('hex');

        // Insert new user
        const insertResult = await pool.request()
            .input('username', sql.NVarChar(50), cleanUsername)
            .input('password', sql.NVarChar(255), hashedPassword)
            .input('email', sql.NVarChar(100), cleanEmail)
            .input('phone', sql.NVarChar(20), phone ? phone.trim() : null)
            .input('fullname', sql.NVarChar(100), fullname ? fullname.trim() : cleanUsername)
            .input('api_key', sql.NVarChar(64), apiKey)
            .query(`
                INSERT INTO dbo.[Users] (username, password, email, phone, fullname, balance, role, api_key, status)
                OUTPUT INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.balance, INSERTED.role, INSERTED.api_key
                VALUES (@username, @password, @email, @phone, @fullname, 0, 'user', @api_key, 1)
            `);

        const newUser = insertResult.recordset[0];

        // Generate JWT Token
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, role: newUser.role },
            JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return res.json({
            status: 'success',
            msg: 'Đăng ký tài khoản thành công!',
            token: token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                balance: Number(newUser.balance),
                role: newUser.role
            }
        });
    } catch (err) {
        console.error('Registration Error:', err);
        return res.status(500).json({
            status: 'error',
            msg: 'Đã xảy ra lỗi hệ thống: ' + err.message
        });
    }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                status: 'error',
                msg: 'Vui lòng nhập tên đăng nhập và mật khẩu!'
            });
        }

        const pool = await getPool();

        // Query user
        const result = await pool.request()
            .input('username', sql.NVarChar(50), username.trim())
            .query(`
                SELECT id, username, password, email, fullname, phone, balance, total_deposited, role, api_key, status 
                FROM dbo.[Users] 
                WHERE username = @username
            `);

        if (result.recordset.length === 0) {
            return res.status(400).json({
                status: 'error',
                msg: 'Tài khoản hoặc mật khẩu không chính xác!'
            });
        }

        const user = result.recordset[0];

        if (!user.status) {
            return res.status(403).json({
                status: 'error',
                msg: 'Tài khoản của bạn đã bị khóa hoặc tạm ngưng!'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                status: 'error',
                msg: 'Tài khoản hoặc mật khẩu không chính xác!'
            });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return res.json({
            status: 'success',
            msg: 'Đăng nhập thành công!',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullname: user.fullname,
                phone: user.phone,
                balance: Number(user.balance),
                total_deposited: Number(user.total_deposited),
                role: user.role,
                api_key: user.api_key
            }
        });
    } catch (err) {
        console.error('Login Error:', err);
        return res.status(500).json({
            status: 'error',
            msg: 'Đã xảy ra lỗi hệ thống: ' + err.message
        });
    }
});

/**
 * GET /api/auth/me (Get profile and current balance)
 */
router.get('/me', verifyToken, async (req, res) => {
    try {
        const pool = await getPool();

        const result = await pool.request()
            .input('id', sql.Int, req.user.id)
            .query(`
                SELECT id, username, email, fullname, phone, balance, total_deposited, role, api_key, status, created_at 
                FROM dbo.[Users] 
                WHERE id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                msg: 'Không tìm thấy người dùng!'
            });
        }

        const user = result.recordset[0];

        return res.json({
            status: 'success',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullname: user.fullname,
                phone: user.phone,
                balance: Number(user.balance),
                total_deposited: Number(user.total_deposited),
                role: user.role,
                api_key: user.api_key,
                status: user.status,
                created_at: user.created_at
            }
        });
    } catch (err) {
        console.error('Auth Me Error:', err);
        return res.status(500).json({
            status: 'error',
            msg: 'Lỗi tải thông tin cá nhân: ' + err.message
        });
    }
});

/**
 * POST /api/auth/change-api-key
 */
router.post('/change-api-key', verifyToken, async (req, res) => {
    try {
        const pool = await getPool();
        const newApiKey = crypto.randomBytes(16).toString('hex');

        await pool.request()
            .input('id', sql.Int, req.user.id)
            .input('api_key', sql.NVarChar(64), newApiKey)
            .query('UPDATE dbo.[Users] SET api_key = @api_key, updated_at = GETDATE() WHERE id = @id');

        return res.json({
            status: 'success',
            msg: 'Đổi API Key thành công!',
            api_key: newApiKey
        });
    } catch (err) {
        console.error('Change API Key Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * POST /api/auth/change-password
 */
router.post('/change-password', verifyToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                status: 'error',
                msg: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới!'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                status: 'error',
                msg: 'Mật khẩu mới phải có tối thiểu 6 ký tự!'
            });
        }

        const pool = await getPool();

        const userRes = await pool.request()
            .input('id', sql.Int, req.user.id)
            .query('SELECT password FROM dbo.[Users] WHERE id = @id');

        if (userRes.recordset.length === 0) {
            return res.status(404).json({ status: 'error', msg: 'Người dùng không tồn tại!' });
        }

        const isMatch = await bcrypt.compare(current_password, userRes.recordset[0].password);
        if (!isMatch) {
            return res.status(400).json({ status: 'error', msg: 'Mật khẩu hiện tại không đúng!' });
        }

        const salt = await bcrypt.genSalt(10);
        const newHashed = await bcrypt.hash(new_password, salt);

        await pool.request()
            .input('id', sql.Int, req.user.id)
            .input('password', sql.NVarChar(255), newHashed)
            .query('UPDATE dbo.[Users] SET password = @password, updated_at = GETDATE() WHERE id = @id');

        return res.json({
            status: 'success',
            msg: 'Đổi mật khẩu thành công!'
        });
    } catch (err) {
        console.error('Change Password Error:', err);
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

/**
 * POST /api/auth/profile (Update phone / fullname)
 */
router.post('/profile', verifyToken, async (req, res) => {
    try {
        const { fullname, phone } = req.body;
        const pool = await getPool();

        await pool.request()
            .input('id', sql.Int, req.user.id)
            .input('fullname', sql.NVarChar(100), fullname ? fullname.trim() : null)
            .input('phone', sql.NVarChar(20), phone ? phone.trim() : null)
            .query(`
                UPDATE dbo.[Users] 
                SET fullname = @fullname, phone = @phone, updated_at = GETDATE() 
                WHERE id = @id
            `);

        return res.json({
            status: 'success',
            msg: 'Cập nhật thông tin thành công!'
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

module.exports = router;
