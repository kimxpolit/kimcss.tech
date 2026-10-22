const { getPool } = require('../server/config/db');

(async () => {
    try {
        const pool = await getPool();
        const settings = await pool.request().query("SELECT name, value FROM dbo.[Settings] WHERE name LIKE '%bank%' OR name LIKE '%recharge%' OR name LIKE '%prefix%'");
        console.log('Settings:', settings.recordset);

        const cols = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'BankAccounts'");
        console.log('Columns:', cols.recordset);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
