const { getPool, sql } = require('../server/config/db');

async function addUsdRate() {
    try {
        const pool = await getPool();
        console.log('Checking usd_rate column in dbo.[Settings]...');

        const checkCol = await pool.request().query(`
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Settings' AND COLUMN_NAME = 'usd_rate'
        `);

        if (checkCol.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE dbo.[Settings] ADD [usd_rate] DECIMAL(18,2) DEFAULT 25400 NULL
            `);
            console.log('✅ Added column [usd_rate] to dbo.[Settings]');
        } else {
            console.log('ℹ️ Column [usd_rate] already exists in dbo.[Settings]');
        }

        // Update site_config row
        await pool.request().query(`
            UPDATE dbo.[Settings]
            SET [usd_rate] = 25400
            WHERE [name] = 'site_config' AND [usd_rate] IS NULL
        `);

        // Check if kv pair exists
        const checkKv = await pool.request().query(`
            SELECT 1 FROM dbo.[Settings] WHERE [name] = 'usd_rate'
        `);
        if (checkKv.recordset.length === 0) {
            await pool.request().query(`
                INSERT INTO dbo.[Settings] ([name], [value], [updated_at])
                VALUES ('usd_rate', '25400', GETDATE())
            `);
            console.log('✅ Inserted key-value pair usd_rate = 25400');
        }

        console.log('✅ Schema migration for usd_rate completed.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

addUsdRate();
