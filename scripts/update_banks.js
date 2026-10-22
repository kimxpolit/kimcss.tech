const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'shopclone',
  password: process.env.DB_PASSWORD || 'ShopClone@2026!',
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME || 'ShopCloneDB',
  options: { encrypt: false, trustServerCertificate: true }
};

async function updateBanks() {
  const pool = await sql.connect(config);
  
  await pool.request().query(`
    UPDATE [BankAccounts]
    SET account_name = N'CTY TNHH CONG NGHE SHOPCLONE', branch = N'Hội Sở TP.HCM'
    WHERE bank_id = 'VCB';

    UPDATE [BankAccounts]
    SET account_name = N'CTY TNHH CONG NGHE SHOPCLONE', branch = N'Chi nhánh Ba Đình Hà Nội'
    WHERE bank_id = 'MB';

    UPDATE [BankAccounts]
    SET account_name = N'CTY TNHH CONG NGHE SHOPCLONE', branch = N'Chi nhánh Tân Bình'
    WHERE bank_id = 'TCB';

    UPDATE [BankAccounts]
    SET account_name = N'NGUYEN VAN QUYEN (ADMIN SHOPCLONE)', branch = N'Ví MoMo Tự Động 24/7'
    WHERE bank_id = 'MOMO';
  `);

  const res = await pool.request().query('SELECT * FROM [BankAccounts]');
  console.log('Updated BankAccounts in SQL Server:');
  res.recordset.forEach(b => console.log(`- ${b.bank_name} (${b.bank_id}): ${b.account_number} - ${b.account_name}`));
  await pool.close();
}

updateBanks().catch(err => {
  console.error('Update error:', err);
  process.exit(1);
});
