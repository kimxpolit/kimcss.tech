/**
 * ShopClone 7 - Main Express Server (100% JavaScript, Node.js & Microsoft SQL Server)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getPool } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Fallback redirects for legacy admin login/logout URLs
app.get(['/admin/login.html', '/admin/login', '/admin/logout', '/admin/logout.html', '/logout'], (req, res) => {
    res.redirect('/login.html');
});

// Tools Hub route aliases and legacy redirects
app.get(['/tools', '/tools/', '/tool', '/tool/'], (req, res) => {
    res.redirect('/tools/index.html');
});
app.get('/tools/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'tools', 'index.html'));
});
app.get('/tool/check-live-facebook', (req, res) => res.redirect('/tools/tool-checklive-fb.html'));
app.get('/tool/get-2fa', (req, res) => res.redirect('/tools/tool-2fa.html'));
app.get('/tool/icon-facebook', (req, res) => res.redirect('/tools/tool-icon-facebook.html'));
app.get('/tool/random-face', (req, res) => res.redirect('/tools/tool-random-face.html'));

// Fallback redirects for root pages incorrectly accessed with /tools/ prefix (e.g. /tools/profile.html -> /profile.html)
app.get('/tools/:page.html', (req, res, next) => {
    const pageName = req.params.page;
    const toolFile = path.join(__dirname, '..', 'public', 'tools', `${pageName}.html`);
    if (fs.existsSync(toolFile)) {
        return next();
    }
    const rootFile = path.join(__dirname, '..', 'public', `${pageName}.html`);
    if (fs.existsSync(rootFile)) {
        return res.redirect(`/${pageName}.html`);
    }
    next();
});
app.get(['/tools/profile', '/tools/profile.html'], (req, res) => res.redirect('/profile.html'));



// Static Assets Serving
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use('/mod', express.static(path.join(__dirname, '..', 'mod')));
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'ShopClone 7 Node.js + SQL Server API',
        timestamp: new Date().toISOString()
    });
});

// API Routes Mount
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/recharge', require('./routes/recharge'));
app.use('/api/banks', require('./routes/recharge'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/openApi'));

// Global 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        status: 'error',
        msg: `Endpoint '${req.originalUrl}' không tồn tại trên hệ thống API!`
    });
});

// Start Server
async function startServer() {
    try {
        console.log('====================================================');
        console.log('🚀 KHỞI ĐỘNG HỆ THỐNG SHOPCLONE 7 (NODE.JS & MSSQL)');
        console.log('====================================================');

        // Test SQL Server connection
        try {
            await getPool();
        } catch (dbErr) {
            console.warn('⚠️  [CẢNH BÁO DATABASE]: Chưa kết nối được Microsoft SQL Server.');
            console.warn('    Server vẫn đang chạy để phục vụ giao diện web.');
            console.warn('    Hãy kiểm tra file .env và bảo đảm SQL Server đang chạy để sử dụng đầy đủ chức năng.');
        }

        app.listen(PORT, () => {
            console.log(`\n✅ Ứng dụng đã sẵn sàng hoạt động tại:`);
            console.log(`   👉 Trang chủ Client: http://localhost:${PORT}`);
            console.log(`   👉 Quản trị Admin:   http://localhost:${PORT}/admin/index.html`);
            console.log(`   👉 API Health Check: http://localhost:${PORT}/api/health\n`);
        });

    } catch (err) {
        console.error('Fatal Server Error:', err);
        process.exit(1);
    }
}

startServer();

module.exports = app;
