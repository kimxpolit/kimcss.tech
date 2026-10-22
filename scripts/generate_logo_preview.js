const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// 1. Prepare clean left icon
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
            // Facebook icon and all left floating items
            keep = true;
        } else if (y < 140) {
            // Pink music bubble
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
const leftBase64 = leftPngBuffer.toString('base64');
const leftDataUri = `data:image/png;base64,${leftBase64}`;

// 2. Generate HTML template for rendering
const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:ital,wght@1,800;1,900&family=Montserrat:ital,wght@1,800;1,900&family=Oswald:wght@700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            width: 1024px;
            height: 472px;
            background: transparent;
            overflow: hidden;
            position: relative;
        }

        .canvas-container {
            width: 1024px;
            height: 472px;
            position: relative;
        }

        .left-artwork {
            position: absolute;
            left: 0;
            top: 0;
            width: 330px;
            height: 472px;
            z-index: 2;
        }

        .brand-svg {
            position: absolute;
            left: 0;
            top: 0;
            width: 1024px;
            height: 472px;
            z-index: 10;
        }

        .brand-text {
            font-family: 'Kanit', sans-serif;
            font-style: italic;
            font-weight: 900;
            font-size: 148px;
            letter-spacing: -2px;
        }

        .badge-text {
            font-family: 'Oswald', sans-serif;
            font-weight: 700;
            font-size: 42px;
            letter-spacing: 2px;
            fill: #ffffff;
        }
    </style>
</head>
<body>
    <div class="canvas-container">
        <!-- Left Artwork (Original High-Res Icons) -->
        <img class="left-artwork" src="${leftDataUri}" alt="Icons">

        <!-- Right Side Brand Text and Sub-banner in Vector SVG -->
        <svg class="brand-svg" viewBox="0 0 1024 472">
            <defs>
                <!-- Main Text Blue Gradient -->
                <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#4f79fc" />
                    <stop offset="35%" stop-color="#3d66f5" />
                    <stop offset="100%" stop-color="#2c51e8" />
                </linearGradient>

                <!-- Badge Blue Gradient -->
                <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#3b66f5" />
                    <stop offset="100%" stop-color="#436ef8" />
                </linearGradient>

                <!-- Filter for deep 3D drop shadow -->
                <filter id="shadow3D" x="-10%" y="-10%" width="130%" height="130%">
                    <feDropShadow dx="4" dy="8" stdDeviation="0" flood-color="#000000" flood-opacity="1" />
                </filter>
            </defs>

            <!-- Text Group: kimcss.tech -->
            <g transform="translate(255, 290)">
                <!-- 1. Hard Black 3D Extrusion Layer -->
                <text class="brand-text" x="5" y="8"
                      fill="#000000"
                      stroke="#000000"
                      stroke-width="32"
                      stroke-linejoin="round"
                      stroke-linecap="round">kimcss.tech</text>

                <!-- 2. Yellow/Gold Outer Stroke Layer -->
                <text class="brand-text" x="0" y="0"
                      fill="#ffe243"
                      stroke="#ffe243"
                      stroke-width="26"
                      stroke-linejoin="round"
                      stroke-linecap="round">kimcss.tech</text>

                <!-- 3. White Inner Stroke Layer -->
                <text class="brand-text" x="0" y="0"
                      fill="#ffffff"
                      stroke="#ffffff"
                      stroke-width="12"
                      stroke-linejoin="round"
                      stroke-linecap="round">kimcss.tech</text>

                <!-- 4. Front Gradient Fill Layer -->
                <text class="brand-text" x="0" y="0"
                      fill="url(#textGrad)">kimcss.tech</text>
            </g>

            <!-- Bottom Sub-banner Badge: FACEBOOK - TIKTOK - INSTAGRAM -->
            <g transform="translate(330, 355)">
                <!-- Blue Pill / Rectangle -->
                <rect x="0" y="0" width="620" height="60" rx="6" ry="6" fill="url(#badgeGrad)" />
                <text class="badge-text" x="310" y="44" text-anchor="middle">FACEBOOK - TIKTOK - INSTAGRAM</text>
            </g>
        </svg>
    </div>
</body>
</html>`;

fs.writeFileSync('scripts/logo_preview.html', html, 'utf8');
console.log('Generated scripts/logo_preview.html');
