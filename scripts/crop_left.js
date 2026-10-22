const fs = require('fs');
const { PNG } = require('pngjs');

const imgPath = 'C:/Users/LENOVO/.gemini/antigravity/brain/befa312a-7864-4714-a43a-988f44c88df7/.user_uploaded/media_1792244281585_66e5cbb8.png';
const data = fs.readFileSync(imgPath);
const png = PNG.sync.read(data);

// Let's create an image for left artwork up to x=335
// Notice the pink bubble reaches x=332, and the S of Shopclone starts around x=263
// Let's check which pixels between x=250 and 335 belong to the pink bubble vs the letter S.
// The pink bubble is high R, low G, medium/high B.
// The letter S has:
// - Blue fill: R=40..70, G=90..140, B=230..255
// - White border: R > 230, G > 230, B > 230
// - Yellow border: R > 240, G > 220, B < 150
// - Black shadow: R < 50, G < 50, B < 50

const leftPng = new PNG({ width: 340, height: png.height });

for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < 340; x++) {
        const srcIdx = (png.width * y + x) * 4;
        const dstIdx = (340 * y + x) * 4;

        const r = png.data[srcIdx];
        const g = png.data[srcIdx + 1];
        const b = png.data[srcIdx + 2];
        const a = png.data[srcIdx + 3];

        let keep = false;

        if (x < 255) {
            // All pixels left of 255 belong to the Facebook icon and left artwork
            keep = true;
        } else if (y < 145) {
            // In the top region (y < 145), check if it belongs to the pink music bubble
            // Pink bubble: r > 150 && b > 70 && (r > g)
            // Or white note inside the pink bubble: r > 200, g > 200, b > 200 within bubble range
            const distToBubbleCenter = Math.hypot(x - 286, y - 88);
            if (distToBubbleCenter < 48) {
                keep = true;
            }
        }

        if (keep && a > 0) {
            leftPng.data[dstIdx] = r;
            leftPng.data[dstIdx + 1] = g;
            leftPng.data[dstIdx + 2] = b;
            leftPng.data[dstIdx + 3] = a;
        } else {
            leftPng.data[dstIdx] = 0;
            leftPng.data[dstIdx + 1] = 0;
            leftPng.data[dstIdx + 2] = 0;
            leftPng.data[dstIdx + 3] = 0;
        }
    }
}

fs.writeFileSync('scripts/left_icons.png', PNG.sync.write(leftPng));
console.log('Saved scripts/left_icons.png');
