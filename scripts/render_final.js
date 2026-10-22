const fs = require('fs');
const sharp = require('sharp');
const { PNG } = require('pngjs');

// Read original PNG and prepare base
const origBuf = fs.readFileSync('C:/Users/LENOVO/.gemini/antigravity/brain/befa312a-7864-4714-a43a-988f44c88df7/.user_uploaded/media_1792244281585_66e5cbb8.png');
const origPng = PNG.sync.read(origBuf);

const basePng = new PNG({ width: origPng.width, height: origPng.height });

for (let y = 0; y < origPng.height; y++) {
    for (let x = 0; x < origPng.width; x++) {
        const idx = (origPng.width * y + x) * 4;
        const r = origPng.data[idx];
        const g = origPng.data[idx + 1];
        const b = origPng.data[idx + 2];
        const a = origPng.data[idx + 3];

        let keep = false;

        // Left icons
        if (x < 254) {
            keep = true;
        } else if (x < 335 && y < 140) {
            const dist = Math.hypot(x - 286, y - 88);
            if (dist < 46) keep = true;
        }

        // Original bottom badge
        if (y >= 355 && y <= 417 && x >= 330 && x <= 960) {
            keep = true;
        }

        if (keep && a > 0) {
            basePng.data[idx] = r;
            basePng.data[idx + 1] = g;
            basePng.data[idx + 2] = b;
            basePng.data[idx + 3] = a;
        }
    }
}

const baseBuffer = PNG.sync.write(basePng);
const montserratBase64 = fs.readFileSync('scripts/Montserrat-BlackItalic.ttf').toString('base64');

function makeSvg(text, fontSize, x, y) {
    return `<svg width="1024" height="472" viewBox="0 0 1024 472" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Montserrat';
        font-style: italic;
        font-weight: 900;
        src: url(data:font/truetype;charset=utf-8;base64,${montserratBase64}) format('truetype');
      }
      .brand-title {
        font-family: 'Montserrat', sans-serif;
        font-style: italic;
        font-weight: 900;
        font-size: ${fontSize}px;
        letter-spacing: -1.5px;
      }
    </style>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#5582fd" />
      <stop offset="30%" stop-color="#3e6bf7" />
      <stop offset="70%" stop-color="#305be9" />
      <stop offset="100%" stop-color="#2148d5" />
    </linearGradient>
  </defs>

  <g transform="translate(${x}, ${y})">
    <!-- Layer 1: Solid Black 3D Shadow -->
    <text class="brand-title" x="4" y="6" fill="#000000" stroke="#000000" stroke-width="20" stroke-linejoin="round" stroke-linecap="round">${text}</text>
    
    <!-- Layer 2: Bright Yellow Outline -->
    <text class="brand-title" x="0" y="0" fill="#ffe238" stroke="#ffe238" stroke-width="17" stroke-linejoin="round" stroke-linecap="round">${text}</text>
    
    <!-- Layer 3: Crisp White Outline -->
    <text class="brand-title" x="0" y="0" fill="#ffffff" stroke="#ffffff" stroke-width="8.5" stroke-linejoin="round" stroke-linecap="round">${text}</text>
    
    <!-- Layer 4: Gradient Blue Face -->
    <text class="brand-title" x="0" y="0" fill="url(#textGrad)">${text}</text>
  </g>
</svg>`;
}

async function renderFinal() {
    // 1. Lowercase: kimcss.tech (fontSize 126, x=262, y=292)
    const svgLower = Buffer.from(makeSvg('kimcss.tech', 126, 262, 292));
    const txtLowerBuf = await sharp(svgLower).png().toBuffer();
    await sharp(baseBuffer)
        .composite([{ input: txtLowerBuf, left: 0, top: 0 }])
        .png()
        .toFile('scripts/final_logo_kimcss_lower.png');

    // 2. Capital: Kimcss.tech (fontSize 124, x=262, y=292)
    const svgCap = Buffer.from(makeSvg('Kimcss.tech', 124, 262, 292));
    const txtCapBuf = await sharp(svgCap).png().toBuffer();
    await sharp(baseBuffer)
        .composite([{ input: txtCapBuf, left: 0, top: 0 }])
        .png()
        .toFile('scripts/final_logo_Kimcss_cap.png');

    console.log('Final logos rendered successfully!');
}

renderFinal().catch(console.error);
