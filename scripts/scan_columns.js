const fs = require('fs');
const { PNG } = require('pngjs');

const imgPath = 'C:/Users/LENOVO/.gemini/antigravity/brain/befa312a-7864-4714-a43a-988f44c88df7/.user_uploaded/media_1792244281585_66e5cbb8.png';
const data = fs.readFileSync(imgPath);
const png = PNG.sync.read(data);

// Column density
console.log('Scanning column opaque counts:');
for (let x = 200; x <= 350; x += 5) {
    let count = 0;
    for (let y = 0; y < png.height; y++) {
        const idx = (png.width * y + x) * 4;
        if (png.data[idx + 3] > 10) count++;
    }
    console.log(`x=${x}: ${count} opaque pixels`);
}
