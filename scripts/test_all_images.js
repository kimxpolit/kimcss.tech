const fs = require('fs');
const path = require('path');
const http = require('http');

const publicDir = path.join(__dirname, '..', 'public');

function getAppHtmlFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        if (ent.isDirectory()) {
            if (ent.name === 'theme' || ent.name === 'fontawesome' || ent.name === 'client' || ent.name === 'ckeditor') continue;
            results = results.concat(getAppHtmlFiles(path.join(dir, ent.name)));
        } else if (ent.name.endsWith('.html')) {
            results.push(path.join(dir, ent.name));
        }
    }
    return results;
}

function checkUrl(url) {
    return new Promise((resolve) => {
        const fullUrl = url.startsWith('/') ? `http://localhost:3000${url}` : `http://localhost:3000/${url}`;
        http.get(fullUrl, (res) => {
            resolve({ url, status: res.statusCode });
        }).on('error', (err) => {
            resolve({ url, status: 500, error: err.message });
        });
    });
}

async function run() {
    const files = getAppHtmlFiles(publicDir);
    console.log(`Checking images across ${files.length} application HTML files...`);

    const imgUrls = new Set();
    for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
        let match;
        while ((match = imgRegex.exec(content)) !== null) {
            const src = match[1];
            if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.includes('${')) continue;
            imgUrls.add(src);
        }
    }

    console.log(`Unique local image URLs found: ${imgUrls.size}`);
    let broken = 0;
    for (const url of imgUrls) {
        const res = await checkUrl(url);
        if (res.status !== 200) {
            console.error(`  ❌ ẢNH LỖI (HTTP ${res.status}): ${url}`);
            broken++;
        } else {
            console.log(`  ✅ HTTP 200 OK: ${url}`);
        }
    }

    console.log(`\nTổng số ảnh kiểm tra: ${imgUrls.size}, Lỗi 404: ${broken}`);
}

run();
