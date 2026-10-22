const { getPool, sql } = require('../server/config/db');

async function cleanDemoUser() {
    try {
        const pool = await getPool();
        const check = await pool.request().query("SELECT id FROM dbo.Users WHERE username = 'demo_user'");
        if (check.recordset.length > 0) {
            const uid = check.recordset[0].id;
            await pool.request().query(`DELETE FROM dbo.Transactions WHERE user_id = ${uid}`);
            await pool.request().query(`DELETE FROM dbo.Orders WHERE user_id = ${uid}`);
            await pool.request().query(`DELETE FROM dbo.Users WHERE id = ${uid}`);
            console.log('✅ Deleted demo_user from dbo.Users and associated tables');
        } else {
            console.log('ℹ️ demo_user does not exist in dbo.Users');
        }

        // Also check if dbo.Cards table exists, create if missing
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Cards')
            BEGIN
                CREATE TABLE dbo.[Cards] (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL,
                    telco NVARCHAR(50) NOT NULL,
                    amount DECIMAL(18,2) NOT NULL,
                    serial NVARCHAR(100) NOT NULL,
                    pin NVARCHAR(100) NOT NULL,
                    status NVARCHAR(50) DEFAULT 'pending',
                    real_amount DECIMAL(18,2) DEFAULT 0,
                    note NVARCHAR(255) NULL,
                    created_at DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_Cards_Users FOREIGN KEY (user_id) REFERENCES dbo.Users(id)
                );
                PRINT '✅ Created dbo.Cards table';
            END
        `);
        console.log('✅ Database schema verified');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error cleaning demo user:', e);
        process.exit(1);
    }
}

cleanDemoUser();
