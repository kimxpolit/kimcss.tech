const fs = require('fs');
const { PNG } = require('pngjs');

const imgPath = 'C:/Users/LENOVO/.gemini/antigravity/brain/befa312a-7864-4714-a43a-988f44c88df7/.user_uploaded/media_1792244281585_66e5cbb8.png';
const data = fs.readFileSync(imgPath);
const png = PNG.sync.read(data);

// Find the blue rectangle of the badge
// Blue badge has R: 50..80, G: 100..120, B: 230..255
for (let y = 340; y < 420; y++) {
    let bluePixels = 0;
    for (let x = 330; x < 960; x++) {
        const idx = (png.width * y + x) * 4;
        const r = png.data[idx], g = png.data[idx+1], b = png.data[idx+2], a = png.data[idx+3];
        if (a > 200 && b > 200 && r < 100) {
            bluePixels++;
        }
    }
    console.log(`y=${y}: ${bluePixels} blue pixels`);
}
