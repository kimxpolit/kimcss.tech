const fs = require('fs');
const { PNG } = require('pngjs');

const imgPath = 'C:/Users/LENOVO/.gemini/antigravity/brain/befa312a-7864-4714-a43a-988f44c88df7/.user_uploaded/media_1792244281585_66e5cbb8.png';
const data = fs.readFileSync(imgPath);
const png = PNG.sync.read(data);

// Badge is roughly x: 335..950, y: 330..415
const badgeW = 955 - 330;
const badgeH = 425 - 330;
const badgePng = new PNG({ width: badgeW, height: badgeH });

for (let y = 0; y < badgeH; y++) {
    for (let x = 0; x < badgeW; x++) {
        const srcX = x + 330;
        const srcY = y + 330;
        const srcIdx = (png.width * srcY + srcX) * 4;
        const dstIdx = (badgeW * y + x) * 4;

        badgePng.data[dstIdx] = png.data[srcIdx];
        badgePng.data[dstIdx + 1] = png.data[srcIdx + 1];
        badgePng.data[dstIdx + 2] = png.data[srcIdx + 2];
        badgePng.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
}

fs.writeFileSync('scripts/badge.png', PNG.sync.write(badgePng));
console.log('Saved scripts/badge.png');
