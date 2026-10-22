const { getPool, sql } = require('../server/config/db');
const { MOCK_PRODUCTS } = require('../public/js/data.js');

async function syncDb() {
    console.log('Connecting to SQL Server to sync products...');
    const pool = await getPool();
    let inserted = 0;
    for (const p of MOCK_PRODUCTS) {
        const check = await pool.request()
            .input('name', sql.NVarChar, p.name)
            .query('SELECT id FROM dbo.[Products] WHERE name = @name');
            
        if (check.recordset.length === 0) {
            const insertResult = await pool.request()
                .input('category_id', sql.Int, p.category_id)
                .input('name', sql.NVarChar, p.name)
                .input('slug', sql.VarChar, p.slug)
                .input('price', sql.Decimal(18, 2), p.price)
                .input('cost', sql.Decimal(18, 2), Math.round(p.price * 0.7))
                .input('discount', sql.Int, p.discount)
                .input('description', sql.NVarChar, p.description)
                .input('preview_image', sql.NVarChar, p.preview_image)
                .input('status', sql.Int, 1)
                .input('stt', sql.Int, p.id)
                .query(`INSERT INTO dbo.[Products] (category_id, name, slug, price, cost, discount, description, preview_image, status, stt) 
                        OUTPUT INSERTED.id
                        VALUES (@category_id, @name, @slug, @price, @cost, @discount, @description, @preview_image, @status, @stt)`);
            
            const newId = insertResult.recordset[0].id;
            
            // Seed a few stock items so the product shows available stock
            for (let i = 1; i <= 5; i++) {
                await pool.request()
                    .input('product_id', sql.Int, newId)
                    .input('account_data', sql.NVarChar, `MOCK_USER_${p.code}_${i}|pass123|2FA_CODE_ABC`)
                    .query(`INSERT INTO dbo.[ProductStock] (product_id, account_data, is_sold, created_at)
                            VALUES (@product_id, @account_data, 0, GETDATE())`);
            }

            inserted++;
            console.log(`[+] Đã thêm sản phẩm: ${p.name}`);
        }
    }
    console.log(`\n✅ Hoàn tất đồng bộ: Đã thêm ${inserted} sản phẩm mới vào SQL Server!`);
    process.exit(0);
}

syncDb().catch(err => {
    console.error('Lỗi đồng bộ DB:', err);
    process.exit(1);
});
