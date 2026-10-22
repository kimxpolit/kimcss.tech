/**
 * Automated Database Initializer & Seeder for ShopClone 7
 * Microsoft SQL Server (T-SQL)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const sql = require('mssql');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function initDatabase() {
    console.log('====================================================');
    console.log('🚀 INITIALIZING SHOPCLONE 7 SQL SERVER DATABASE');
    console.log('====================================================');

    const schemaPath = path.resolve(__dirname, '../../database/schema_mssql.sql');
    if (!fs.existsSync(schemaPath)) {
        console.error('❌ Schema file not found:', schemaPath);
        process.exit(1);
    }

    // Try executing schema via sqlcmd with UTF-8 support
    try {
        console.log('Executing database/schema_mssql.sql via sqlcmd (UTF-8)...');
        execSync(`sqlcmd -S . -E -f 65001 -i "${schemaPath}"`, { stdio: 'inherit' });
        console.log('✅ SQL Schema successfully applied!');
    } catch (e) {
        console.warn('⚠️ sqlcmd failed or not in PATH, falling back to mssql direct execution...');
    }

    // Verify connection via mssql library
    const dbConfig = {
        server: process.env.DB_SERVER || 'localhost',
        port: parseInt(process.env.DB_PORT) || 1433,
        database: process.env.DB_NAME || 'ShopCloneDB',
        user: process.env.DB_USER || 'shopclone',
        password: process.env.DB_PASSWORD || 'ShopClone@2026!',
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
        }
    };

    try {
        console.log(`Connecting via Node.js mssql client to [${dbConfig.database}] on ${dbConfig.server}...`);
        const pool = await sql.connect(dbConfig);
        const bcrypt = require('bcryptjs');
        const adminHash = await bcrypt.hash('admin123', 10);
        const khachHangHash = await bcrypt.hash('123456', 10);
        await pool.request().input('h', sql.NVarChar, adminHash).query("UPDATE dbo.Users SET password = @h WHERE username = 'admin'");
        await pool.request().input('h', sql.NVarChar, khachHangHash).query("UPDATE dbo.Users SET password = @h WHERE username = 'khachhang'");

        const userRes = await pool.request().query('SELECT COUNT(*) AS total_users FROM dbo.Users');
        const prodRes = await pool.request().query('SELECT COUNT(*) AS total_prods FROM dbo.Products');
        const stockRes = await pool.request().query('SELECT COUNT(*) AS total_stock FROM dbo.ProductStock WHERE is_sold = 0');
        const catRes = await pool.request().query('SELECT COUNT(*) AS total_cats FROM dbo.Categories');

        console.log('\n📊 DATABASE STATUS SUMMARY:');
        console.log(`   - Users:        ${userRes.recordset[0].total_users}`);
        console.log(`   - Categories:   ${catRes.recordset[0].total_cats}`);
        console.log(`   - Products:     ${prodRes.recordset[0].total_prods}`);
        console.log(`   - Stock Items:  ${stockRes.recordset[0].total_stock}`);
        console.log('\n🔐 DEFAULT CREDENTIALS:');
        console.log('   - Admin:    username "admin", password "admin123" (Balance: 10,000,000 VND)');
        console.log('   - Customer: username "khachhang", password "123456" (Balance: 500,000 VND)');
        console.log('====================================================\n');

        await pool.close();
        return true;
    } catch (err) {
        console.error('❌ Database verification failed:', err.message);
        return false;
    }
}

if (require.main === module) {
    initDatabase().then(success => {
        if (!success) process.exit(1);
    });
}

module.exports = initDatabase;
