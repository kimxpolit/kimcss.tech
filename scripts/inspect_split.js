const fs = require('fs');
const { PNG } = require('pngjs');

const imgPath = 'C:/Users/LENOVO/.gemini/antigravity/brain/befa312a-7864-4714-a43a-988f44c88df7/.user_uploaded/media_1792244281585_66e5cbb8.png';
const data = fs.readFileSync(imgPath);
const png = PNG.sync.read(data);

for (let x = 250; x <= 275; x++) {
    let yList = [];
    for (let y = 0; y < png.height; y++) {
        const idx = (png.width * y + x) * 4;
        if (png.data[idx + 3] > 20) {
            yList.push(y);
        }
    }
    if (yList.length > 0) {
        console.log(`x=${x}: count=${yList.length}, minY=${Math.min(...yList)}, maxY=${Math.max(...yList)}`);
    } else {
        console.log(`x=${x}: EMPTY`);
    }
}
