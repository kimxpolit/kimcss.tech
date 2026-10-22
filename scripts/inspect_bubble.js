const fs = require('fs');
const { PNG } = require('pngjs');

const imgPath = 'C:/Users/LENOVO/.gemini/antigravity/brain/befa312a-7864-4714-a43a-988f44c88df7/.user_uploaded/media_1792244281585_66e5cbb8.png';
const data = fs.readFileSync(imgPath);
const png = PNG.sync.read(data);

// Find pink bubble around x=250..340, y=50..160
let minX = png.width, maxX = 0, minY = png.height, maxY = 0;
for (let y = 40; y < 160; y++) {
    for (let x = 240; x < 350; x++) {
        const idx = (png.width * y + x) * 4;
        const r = png.data[idx], g = png.data[idx+1], b = png.data[idx+2], a = png.data[idx+3];
        // Pink bubble color has high R, low G, medium/high B (magenta/pink)
        if (a > 30 && r > 180 && g < 100 && b > 80) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
}
console.log('Pink bubble:', { minX, maxX, minY, maxY });
