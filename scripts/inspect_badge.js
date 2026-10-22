const fs = require('fs');
const { PNG } = require('pngjs');

const imgPath = 'C:/Users/LENOVO/.gemini/antigravity/brain/befa312a-7864-4714-a43a-988f44c88df7/.user_uploaded/media_1792244281585_66e5cbb8.png';
const data = fs.readFileSync(imgPath);
const png = PNG.sync.read(data);

// Find pixels in lower region y > 330
let minX = png.width, maxX = 0, minY = png.height, maxY = 0;
for (let y = 330; y < png.height; y++) {
    for (let x = 300; x < png.width; x++) {
        const idx = (png.width * y + x) * 4;
        if (png.data[idx + 3] > 20) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
}
console.log('Badge Box:', { minX, maxX, minY, maxY });
