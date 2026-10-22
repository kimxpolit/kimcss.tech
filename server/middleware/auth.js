/**
 * Authentication & Authorization Middleware: JWT & Role Guards
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'shopclone7_super_secret_jwt_key_2026_xyz!@#';

/**
 * Verify JWT Token from Authorization header
 */
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['token'];
    if (!authHeader) {
        return res.status(401).json({
            status: 'error',
            msg: 'Vui lòng đăng nhập để thực hiện thao tác này!'
        });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            status: 'error',
            msg: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại!'
        });
    }
}

/**
 * Admin role guard
 */
function verifyAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            status: 'error',
            msg: 'Quyền truy cập bị từ chối: Yêu cầu quyền Quản trị viên!'
        });
    }
    next();
}

/**
 * Optional token verification (attaches user if present, but doesn't block)
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['token'];
    if (authHeader) {
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (e) {
            // Ignore invalid token for optional auth
        }
    }
    next();
}

module.exports = {
    JWT_SECRET,
    verifyToken,
    verifyAdmin,
    optionalAuth
};
