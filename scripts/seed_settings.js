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

const defaultSettings = [
  ['site_title', 'ShopClone 7 - Hệ thống Bán Tài Khoản MMO Tự Động 24/7'],
  ['site_description', 'Hệ thống cung cấp sỉ lẻ tài khoản Clone Facebook, Via Facebook, Gmail, TikTok, Proxy tốc độ cao tự động.'],
  ['site_keywords', 'shop clone, via facebook, mua clone fb, gmail ngoai, proxy ipv4'],
  ['site_author', 'ShopClone 7'],
  ['hotline', '0947.838.128'],
  ['email', 'hotro@shopclone.vn'],
  ['address', 'Hồ Chí Minh, Việt Nam'],
  ['site_notice_home', '🔥 Chào mừng bạn đến với <strong>ShopClone 7</strong>! Hệ thống cung cấp sỉ lẻ tài khoản Clone, Via Facebook, Gmail, TikTok, Proxy tự động 24/7. Nạp tiền VietQR duyệt trong 3 giây. Hỗ trợ kỹ thuật 24/7.'],
  ['notice_top_left', '🔥 Chào mừng bạn đến với ShopClone 7 - Nạp tiền tự động qua VietQR duyệt trong 3 giây!'],
  ['telegram', '@shopclone7_support'],
  ['telegram_url', 'https://t.me/shopclone7_support'],
  ['zalo', '0947838128'],
  ['zalo_url', 'https://zalo.me/0947838128'],
  ['facebook_url', 'https://facebook.com'],
  ['logo_dark', 'assets/storage/images/logo_dark_8OJ.png'],
  ['logo_light', 'assets/storage/images/logo_dark_8OJ.png'],
  ['favicon', 'assets/storage/images/logo_dark_8OJ.png'],
  ['copyright_footer', 'Hệ thống Kinh Doanh MMO Tự Động'],
  ['theme_color', '#0d6efd'],
  ['theme_color1', '#0a58ca'],
  ['status_menu_tools', '1'],
  ['cot_so_du_ben_phai', '1']
];

async function seed() {
  const pool = await sql.connect(config);
  for (const [name, value] of defaultSettings) {
    await pool.request()
      .input('name', sql.NVarChar(100), name)
      .input('value', sql.NVarChar, value)
      .query(`
        IF EXISTS (SELECT 1 FROM [Settings] WHERE [name] = @name)
          UPDATE [Settings] SET [value] = @value, [updated_at] = GETDATE() WHERE [name] = @name;
        ELSE
          INSERT INTO [Settings] ([name], [value], [updated_at]) VALUES (@name, @value, GETDATE());
      `);
  }
  console.log('Settings updated successfully in SQL Server!');
  await pool.close();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
