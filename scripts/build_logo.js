const fs = require('fs');
const sharp = require('sharp');
const { PNG } = require('pngjs');

// 1. Prepare clean left icon from original
const origBuf = fs.readFileSync('C:/Users/LENOVO/.gemini/antigravity/brain/befa312a-7864-4714-a43a-988f44c88df7/.user_uploaded/media_1792244281585_66e5cbb8.png');
const origPng = PNG.sync.read(origBuf);

// Create left icon PNG with clean transparent background
const leftW = 330;
const leftH = origPng.height;
const cleanLeftPng = new PNG({ width: leftW, height: leftH });

for (let y = 0; y < leftH; y++) {
    for (let x = 0; x < leftW; x++) {
        const srcIdx = (origPng.width * y + x) * 4;
        const dstIdx = (leftW * y + x) * 4;

        const r = origPng.data[srcIdx];
        const g = origPng.data[srcIdx + 1];
        const b = origPng.data[srcIdx + 2];
        const a = origPng.data[srcIdx + 3];

        let keep = false;
        if (x < 254) {
            keep = true;
        } else if (y < 140) {
            const dist = Math.hypot(x - 286, y - 88);
            if (dist < 46) {
                keep = true;
            }
        }

        if (keep && a > 0) {
            cleanLeftPng.data[dstIdx] = r;
            cleanLeftPng.data[dstIdx + 1] = g;
            cleanLeftPng.data[dstIdx + 2] = b;
            cleanLeftPng.data[dstIdx + 3] = a;
        }
    }
}

const leftPngBuffer = PNG.sync.write(cleanLeftPng);

// Read fonts
const kanitFontBase64 = fs.readFileSync('scripts/Kanit-ExtraBoldItalic.ttf').toString('base64');
const oswaldFontBase64 = fs.readFileSync('scripts/Oswald-Bold.ttf').toString('base64');

function generateSvgText(brandText) {
    return `<svg width="1024" height="472" viewBox="0 0 1024 472" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Kanit';
        font-style: italic;
        font-weight: 800;
        src: url(data:font/truetype;charset=utf-8;base64,${kanitFontBase64}) format('truetype');
      }
      @font-face {
        font-family: 'Oswald';
        font-style: normal;
        font-weight: 700;
        src: url(data:font/truetype;charset=utf-8;base64,${oswaldFontBase64}) format('truetype');
      }
      .brand-title {
        font-family: 'Kanit', sans-serif;
        font-style: italic;
        font-weight: 800;
        font-size: 152px;
        letter-spacing: -2px;
      }
      .badge-sub {
        font-family: 'Oswald', sans-serif;
        font-weight: 700;
        font-size: 42px;
        letter-spacing: 2.5px;
        fill: #ffffff;
      }
    </style>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#5885fe" />
      <stop offset="30%" stop-color="#426ef8" />
      <stop offset="75%" stop-color="#325ce8" />
      <stop offset="100%" stop-color="#224ad6" />
    </linearGradient>
    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3c67f6" />
      <stop offset="100%" stop-color="#4470f8" />
    </linearGradient>
  </defs>

  <!-- Text Group -->
  <g transform="translate(262, 292)">
    <!-- Layer 1: Solid Black 3D Shadow -->
    <text class="brand-title" x="5" y="8" fill="#000000" stroke="#000000" stroke-width="28" stroke-linejoin="round" stroke-linecap="round">${brandText}</text>
    
    <!-- Layer 2: Yellow/Gold Outline -->
    <text class="brand-title" x="0" y="0" fill="#ffe243" stroke="#ffe243" stroke-width="24" stroke-linejoin="round" stroke-linecap="round">${brandText}</text>
    
    <!-- Layer 3: White Outline -->
    <text class="brand-title" x="0" y="0" fill="#ffffff" stroke="#ffffff" stroke-width="12" stroke-linejoin="round" stroke-linecap="round">${brandText}</text>
    
    <!-- Layer 4: Gradient Blue Core -->
    <text class="brand-title" x="0" y="0" fill="url(#textGrad)">${brandText}</text>
  </g>

  <!-- Bottom Badge -->
  <g transform="translate(335, 355)">
    <rect x="0" y="0" width="615" height="60" rx="6" ry="6" fill="url(#badgeGrad)" />
    <text class="badge-sub" x="307" y="44" text-anchor="middle">FACEBOOK - TIKTOK - INSTAGRAM</text>
  </g>
</svg>`;
}

async function buildLogos() {
    console.log('Rendering logos with Sharp...');

    // 1. Kimcss.tech
    const svgKim = Buffer.from(generateSvgText('Kimcss.tech'));
    const textKimBuffer = await sharp(svgKim).png().toBuffer();

    const resultKim = await sharp({
        create: {
            width: 1024,
            height: 472,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite([
        { input: leftPngBuffer, left: 0, top: 0 },
        { input: textKimBuffer, left: 0, top: 0 }
    ])
    .png()
    .toFile('scripts/test_logo_Kimcss.png');

    console.log('Rendered scripts/test_logo_Kimcss.png');

    // 2. kimcss.tech (all lowercase)
    const svgLower = Buffer.from(generateSvgText('kimcss.tech'));
    const textLowerBuffer = await sharp(svgLower).png().toBuffer();

    const resultLower = await sharp({
        create: {
            width: 1024,
            height: 472,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite([
        { input: leftPngBuffer, left: 0, top: 0 },
        { input: textLowerBuffer, left: 0, top: 0 }
    ])
    .png()
    .toFile('scripts/test_logo_kimcss_lower.png');

    console.log('Rendered scripts/test_logo_kimcss_lower.png');
}

buildLogos().catch(console.error);
