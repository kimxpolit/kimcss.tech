const fs = require('fs');
const { PNG } = require('pngjs');

const imgPath = 'C:/Users/LENOVO/.gemini/antigravity/brain/befa312a-7864-4714-a43a-988f44c88df7/.user_uploaded/media_1792244281585_66e5cbb8.png';
const data = fs.readFileSync(imgPath);
const png = PNG.sync.read(data);

console.log('Dimensions:', png.width, 'x', png.height);

const checkCoords = [
    [0, 0], [10, 10], [50, 50], [100, 10],
    [png.width - 1, 0], [png.width - 1, png.height - 1]
];

for (const [x, y] of checkCoords) {
    const idx = (png.width * y + x) * 4;
    console.log('Pixel at (' + x + ',' + y + '): R=' + png.data[idx] + ' G=' + png.data[idx+1] + ' B=' + png.data[idx+2] + ' A=' + png.data[idx+3]);
}

// Find non-transparent bounding box
let minX = png.width, maxX = 0, minY = png.height, maxY = 0;
let transparentCount = 0, opaqueCount = 0;

for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
        const idx = (png.width * y + x) * 4;
        const a = png.data[idx + 3];
        if (a > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            opaqueCount++;
        } else {
            transparentCount++;
        }
    }
}

console.log('Transparent pixels:', transparentCount, 'Opaque pixels:', opaqueCount);
console.log('Content Bounding Box: X=[' + minX + '..' + maxX + '], Y=[' + minY + '..' + maxY + ']');
