const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getPool } = require('../server/config/db');

async function deploy() {
    console.log('🚀 Deploying new kimcss.tech logo across all assets...');

    // Source image
    const logoSourcePath = 'scripts/final_logo_kimcss_lower.png';
    const logoCapSourcePath = 'scripts/final_logo_Kimcss_cap.png';
    const logoBuffer = fs.readFileSync(logoSourcePath);
    const logoCapBuffer = fs.readFileSync(logoCapSourcePath);

    // Target destinations
    const targets = [
        'public/assets/storage/images/logo_dark_8OJ.png',
        'public/assets/storage/images/logo_light_9O6.png',
        'public/assets/storage/images/logo_kimcss.png',
        'public/assets/storage/images/logo_kimcss_cap.png',
        'public/assets/storage/images/logo_hoang_kim.png',
        'public/assets/img/logo.png',
        'public/client/images/logo.png',
        'assets/storage/images/logo_dark_8OJ.png',
        'assets/storage/images/logo_light_9O6.png',
        'assets/storage/images/logo_kimcss.png',
        'assets/storage/images/logo_hoang_kim.png',
        'assets/img/logo.png'
    ];

    for (const target of targets) {
        const fullPath = path.join(__dirname, '..', target);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (target.includes('_cap.png')) {
            fs.writeFileSync(fullPath, logoCapBuffer);
        } else {
            fs.writeFileSync(fullPath, logoBuffer);
        }
        console.log(`  ✅ Written: ${target}`);
    }

    // Generate square favicon from the 3D Facebook icon
    console.log('🎨 Generating square favicon...');
    const origBuf = fs.readFileSync('C:/Users/LENOVO/.gemini/antigravity/brain/befa312a-7864-4714-a43a-988f44c88df7/.user_uploaded/media_1792244281585_66e5cbb8.png');
    
    // Crop the 3D Facebook square (approx x: 5..250, y: 15..455)
    const faviconBuffer = await sharp(origBuf)
        .extract({ left: 5, top: 15, width: 250, height: 440 })
        .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

    const faviconTargets = [
        'public/assets/img/favicon.png',
        'assets/img/favicon.png',
        'public/favicon.ico',
        'favicon.ico'
    ];

    for (const fav of faviconTargets) {
        const fullFavPath = path.join(__dirname, '..', fav);
        fs.writeFileSync(fullFavPath, faviconBuffer);
        console.log(`  ✅ Written favicon: ${fav}`);
    }

    // Update dbo.Settings in SQL Server
    try {
        console.log('🔄 Updating database settings...');
        const pool = await getPool();
        await pool.request().query(`
            UPDATE dbo.[Settings] SET value = 'assets/storage/images/logo_kimcss.png' WHERE name IN ('logo_dark', 'logo_light');
            UPDATE dbo.[Settings] SET value = 'kimcss.tech - Hệ thống Bán Tài Khoản MMO Tự Động 24/7' WHERE name = 'site_title';
            UPDATE dbo.[Settings] SET value = 'kimcss.tech' WHERE name = 'site_author';
            UPDATE dbo.[Settings] SET value = '© 2026 kimcss.tech | Hệ thống Kinh Doanh MMO Tự Động' WHERE name = 'copyright_footer';
        `);
        console.log('  ✅ Database settings updated successfully!');
    } catch (dbErr) {
        console.error('  ⚠️ DB Update notice:', dbErr.message);
    }

    console.log('🎉 Logo deployment completed successfully!');
    process.exit(0);
}

deploy().catch(console.error);
