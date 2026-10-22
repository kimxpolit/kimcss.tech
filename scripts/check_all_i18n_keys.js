const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const i18nPath = path.join(publicDir, 'js', 'core', 'i18n.js');
const i18nContent = fs.readFileSync(i18nPath, 'utf-8');

// Extract vi and en keys from i18n.js
const extractKeys = (content, lang) => {
    const blockRegex = new RegExp(`${lang}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},?\\n\\s*(?:en:|\\};)`);
    const match = content.match(blockRegex);
    if (!match) return [];
    const keys = [];
    const lines = match[1].split('\n');
    for (const line of lines) {
        const m = line.match(/^\s*([a-zA-Z0-9_]+)\s*:/);
        if (m) keys.push(m[1]);
    }
    return keys;
};

const viKeys = new Set(extractKeys(i18nContent, 'vi'));
const enKeys = new Set(extractKeys(i18nContent, 'en'));

console.log(`Dictionary contains: ${viKeys.size} VI keys, ${enKeys.size} EN keys`);

// Scan all app HTML files
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
const usedKeys = new Map(); // key -> [files]

for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rel = path.relative(publicDir, filePath);
    const regex = /data-i18n(?:-placeholder|-title)?=["']([^"']+)["']/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        if (!usedKeys.has(key)) usedKeys.set(key, []);
        usedKeys.get(key).push(rel);
    }
}

console.log(`Total unique i18n keys used in HTML: ${usedKeys.size}`);

const missingInVi = [];
const missingInEn = [];

for (const [key, fileList] of usedKeys.entries()) {
    if (!viKeys.has(key)) missingInVi.push({ key, files: Array.from(new Set(fileList)) });
    if (!enKeys.has(key)) missingInEn.push({ key, files: Array.from(new Set(fileList)) });
}

console.log('\n--- Missing in Vietnamese Dictionary ---');
if (missingInVi.length === 0) console.log('  None! All HTML keys exist in VI.');
else missingInVi.forEach(m => console.log(`  ❌ Key "${m.key}" missing! Used in: ${m.files.join(', ')}`));

console.log('\n--- Missing in English Dictionary ---');
if (missingInEn.length === 0) console.log('  None! All HTML keys exist in EN.');
else missingInEn.forEach(m => console.log(`  ❌ Key "${m.key}" missing! Used in: ${m.files.join(', ')}`));
