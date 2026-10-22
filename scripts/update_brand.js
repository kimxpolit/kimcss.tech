const { getPool, sql } = require('../server/config/db');

async function updateBrand() {
    try {
        const pool = await getPool();
        await pool.request().query(`
            UPDATE dbo.Settings SET value = N'HOÀNG KIM - Hệ thống Bán Tài Khoản MMO Tự Động 24/7' WHERE name = 'site_title';
            UPDATE dbo.Settings SET value = N'HOÀNG KIM' WHERE name = 'site_author';
            UPDATE dbo.Settings SET value = N'assets/storage/images/logo_hoang_kim.png' WHERE name IN ('logo_dark', 'logo_light');
            UPDATE dbo.Settings SET value = N'assets/img/favicon.png' WHERE name = 'favicon';
        `);
        console.log('✅ Updated dbo.Settings successfully with HOANG KIM branding!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Failed to update brand settings:', e);
        process.exit(1);
    }
}

updateBrand();
