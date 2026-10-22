const fs = require('fs');
const path = require('path');

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

const files = getAppHtmlFiles(publicDir);
console.log(`Scanning ${files.length} Application HTML files...`);

const missing = [];
for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relHtml = path.relative(publicDir, filePath);
    const htmlDir = path.dirname(filePath);

    const regex = /(?:src|href)=["']([^"']+)["']/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const rawUrl = match[1];
        if (rawUrl.startsWith('#') || rawUrl.startsWith('javascript:') || rawUrl.startsWith('mailto:') || rawUrl.startsWith('tel:') || rawUrl.startsWith('${') || rawUrl.startsWith('{{')) continue;
        if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('//')) continue;
        if (rawUrl.endsWith('.html') || rawUrl.includes('.html?') || rawUrl.includes('.html#')) continue;

        const cleanPath = rawUrl.split('?')[0].split('#')[0];
        if (!cleanPath) continue;

        let targetDiskPath;
        if (cleanPath.startsWith('/')) {
            targetDiskPath = path.join(publicDir, cleanPath.slice(1));
        } else {
            targetDiskPath = path.resolve(htmlDir, cleanPath);
        }

        if (!fs.existsSync(targetDiskPath)) {
            missing.push({
                htmlFile: relHtml,
                rawUrl: rawUrl,
                expected: path.relative(publicDir, targetDiskPath)
            });
        }
    }
}

console.log(`\nMissing assets in App files: ${missing.length}`);
missing.forEach(m => {
    console.log(`  ❌ [${m.htmlFile}] -> "${m.rawUrl}" (looked in: ${m.expected})`);
});
