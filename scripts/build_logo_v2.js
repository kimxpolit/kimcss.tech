const fs = require('fs');
const sharp = require('sharp');
const { PNG } = require('pngjs');

// 1. Read original PNG
const origBuf = fs.readFileSync('C:/Users/LENOVO/.gemini/antigravity/brain/befa312a-7864-4714-a43a-988f44c88df7/.user_uploaded/media_1792244281585_66e5cbb8.png');
const origPng = PNG.sync.read(origBuf);

// 2. Extract base layer:
// - All original left icons (Facebook, Instagram, TikTok, avatars, music bubble)
// - Original bottom badge (FACEBOOK - TIKTOK - INSTAGRAM)
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
            // Music bubble
            const dist = Math.hypot(x - 286, y - 88);
            if (dist < 46) {
                keep = true;
            }
        }

        // Original bottom badge: y >= 355 && y <= 417 && x >= 330 && x <= 960
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

// Read fonts
const montserratBase64 = fs.readFileSync('scripts/Montserrat-BlackItalic.ttf').toString('base64');
const kanitBase64 = fs.readFileSync('scripts/Kanit-ExtraBoldItalic.ttf').toString('base64');

function makeSvgText(brandText, fontChoice, fontSize, startX, startY) {
    const fontBase64 = fontChoice === 'montserrat' ? montserratBase64 : kanitBase64;
    const fontFamily = fontChoice === 'montserrat' ? 'Montserrat' : 'Kanit';

    return `<svg width="1024" height="472" viewBox="0 0 1024 472" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: '${fontFamily}';
        font-style: italic;
        font-weight: 900;
        src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
      }
      .brand-title {
        font-family: '${fontFamily}', sans-serif;
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

  <!-- Text Group -->
  <g transform="translate(${startX}, ${startY})">
    <!-- Layer 1: Solid Black 3D Shadow -->
    <text class="brand-title" x="4" y="6" fill="#000000" stroke="#000000" stroke-width="22" stroke-linejoin="round" stroke-linecap="round">${brandText}</text>
    
    <!-- Layer 2: Bright Yellow Outline -->
    <text class="brand-title" x="0" y="0" fill="#ffe238" stroke="#ffe238" stroke-width="18" stroke-linejoin="round" stroke-linecap="round">${brandText}</text>
    
    <!-- Layer 3: Crisp White Outline -->
    <text class="brand-title" x="0" y="0" fill="#ffffff" stroke="#ffffff" stroke-width="9" stroke-linejoin="round" stroke-linecap="round">${brandText}</text>
    
    <!-- Layer 4: Gradient Blue Face -->
    <text class="brand-title" x="0" y="0" fill="url(#textGrad)">${brandText}</text>
  </g>
</svg>`;
}

async function run() {
    console.log('Rendering logos with perfect base composition...');

    // Version 1: Kimcss.tech with Kanit (fontSize 142)
    const svg1 = Buffer.from(makeSvgText('Kimcss.tech', 'kanit', 142, 266, 290));
    const txt1Buf = await sharp(svg1).png().toBuffer();
    await sharp(baseBuffer)
        .composite([{ input: txt1Buf, left: 0, top: 0 }])
        .png()
        .toFile('scripts/logo_Kimcss_kanit.png');

    // Version 2: kimcss.tech (lowercase) with Kanit (fontSize 145)
    const svg2 = Buffer.from(makeSvgText('kimcss.tech', 'kanit', 145, 260, 290));
    const txt2Buf = await sharp(svg2).png().toBuffer();
    await sharp(baseBuffer)
        .composite([{ input: txt2Buf, left: 0, top: 0 }])
        .png()
        .toFile('scripts/logo_kimcss_kanit.png');

    // Version 3: Kimcss.tech with Montserrat (fontSize 135)
    const svg3 = Buffer.from(makeSvgText('Kimcss.tech', 'montserrat', 135, 266, 290));
    const txt3Buf = await sharp(svg3).png().toBuffer();
    await sharp(baseBuffer)
        .composite([{ input: txt3Buf, left: 0, top: 0 }])
        .png()
        .toFile('scripts/logo_Kimcss_montserrat.png');

    // Version 4: kimcss.tech (lowercase) with Montserrat (fontSize 138)
    const svg4 = Buffer.from(makeSvgText('kimcss.tech', 'montserrat', 138, 260, 290));
    const txt4Buf = await sharp(svg4).png().toBuffer();
    await sharp(baseBuffer)
        .composite([{ input: txt4Buf, left: 0, top: 0 }])
        .png()
        .toFile('scripts/logo_kimcss_montserrat.png');

    console.log('All 4 variations generated successfully!');
}

run().catch(console.error);
