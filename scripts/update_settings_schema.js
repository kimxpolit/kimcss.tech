const { getPool } = require('../server/config/db');

async function updateSchema() {
    console.log('Connecting to SQL Server to update Settings table schema...');
    const pool = await getPool();

    const columnsToAdd = [
        { name: 'site_logo', type: 'NVARCHAR(500)', default: "'assets/storage/images/logo_kimcss.png'" },
        { name: 'logo_height', type: 'INT', default: '54' },
        { name: 'primary_color', type: 'VARCHAR(50)', default: "'#2563eb'" },
        { name: 'accent_color', type: 'VARCHAR(50)', default: "'#d4af37'" },
        { name: 'navbar_bg', type: 'VARCHAR(50)', default: "'#ffffff'" },
        { name: 'welcome_popup_status', type: 'BIT', default: '1' },
        { name: 'welcome_popup_content', type: 'NVARCHAR(MAX)', default: "N'Chào mừng quý khách đến với kimcss.tech MMO SOLUTION!'" },
        { name: 'show_recent_orders', type: 'BIT', default: '1' },
        { name: 'site_hotline', type: 'VARCHAR(50)', default: "'0947.838.128'" },
        { name: 'site_email', type: 'VARCHAR(100)', default: "'hotro@kimcss.tech'" },
        { name: 'site_zalo', type: 'VARCHAR(255)', default: "'0947838128'" },
        { name: 'site_telegram', type: 'VARCHAR(255)', default: "'@kimcss_support'" },
        { name: 'marquee_notice', type: 'NVARCHAR(MAX)', default: "N'🔥 Chào mừng bạn đến với kimcss.tech - Nạp tiền tự động qua VietQR duyệt trong 3 giây!'" }
    ];

    for (const col of columnsToAdd) {
        const checkQuery = `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Settings' AND COLUMN_NAME = '${col.name}'`;
        const checkRes = await pool.request().query(checkQuery);
        if (checkRes.recordset.length === 0) {
            const addQuery = `ALTER TABLE dbo.[Settings] ADD [${col.name}] ${col.type} NULL`;
            await pool.request().query(addQuery);
            console.log(`  ✅ Added column: [${col.name}] (${col.type})`);
        } else {
            console.log(`  ℹ️ Column already exists: [${col.name}]`);
        }
    }

    // Ensure a master config row exists or set default values
    const checkMaster = await pool.request().query("SELECT 1 FROM dbo.[Settings] WHERE [name] = 'site_config'");
    if (checkMaster.recordset.length === 0) {
        await pool.request().query(`
            INSERT INTO dbo.[Settings] (
                [name], [value], [updated_at],
                [site_logo], [logo_height], [primary_color], [accent_color], [navbar_bg],
                [welcome_popup_status], [welcome_popup_content], [show_recent_orders],
                [site_hotline], [site_email], [site_zalo], [site_telegram], [marquee_notice]
            ) VALUES (
                'site_config', 'active', GETDATE(),
                'assets/storage/images/logo_kimcss.png', 54, '#2563eb', '#d4af37', '#ffffff',
                1, N'Chào mừng quý khách đến với kimcss.tech MMO SOLUTION!', 1,
                '0947.838.128', 'hotro@kimcss.tech', '0947838128', '@kimcss_support',
                N'🔥 Chào mừng bạn đến với kimcss.tech - Nạp tiền tự động qua VietQR duyệt trong 3 giây!'
            )
        `);
        console.log('  ✅ Inserted master site_config row with defaults.');
    } else {
        await pool.request().query(`
            UPDATE dbo.[Settings] SET
                [site_logo] = ISNULL([site_logo], 'assets/storage/images/logo_kimcss.png'),
                [logo_height] = ISNULL([logo_height], 54),
                [primary_color] = ISNULL([primary_color], '#2563eb'),
                [accent_color] = ISNULL([accent_color], '#d4af37'),
                [navbar_bg] = ISNULL([navbar_bg], '#ffffff'),
                [welcome_popup_status] = ISNULL([welcome_popup_status], 1),
                [welcome_popup_content] = ISNULL([welcome_popup_content], N'Chào mừng quý khách đến với kimcss.tech MMO SOLUTION!'),
                [show_recent_orders] = ISNULL([show_recent_orders], 1),
                [site_hotline] = ISNULL([site_hotline], '0947.838.128'),
                [site_email] = ISNULL([site_email], 'hotro@kimcss.tech'),
                [site_zalo] = ISNULL([site_zalo], '0947838128'),
                [site_telegram] = ISNULL([site_telegram], '@kimcss_support'),
                [marquee_notice] = ISNULL([marquee_notice], N'🔥 Chào mừng bạn đến với kimcss.tech - Nạp tiền tự động qua VietQR duyệt trong 3 giây!')
            WHERE [name] = 'site_config'
        `);
        console.log('  ✅ Master site_config row updated with default fallbacks.');
    }

    // Verify all columns
    const cols = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Settings'");
    console.log('\nFinal dbo.Settings Columns:');
    cols.recordset.forEach(c => console.log(`   - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

    process.exit(0);
}

updateSchema().catch(err => {
    console.error('Fatal Schema Error:', err);
    process.exit(1);
});
