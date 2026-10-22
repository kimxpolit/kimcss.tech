const fs = require('fs');

async function downloadFonts() {
    console.log('Downloading Kanit ExtraBold Italic TTF...');
    const r1 = await fetch('https://fonts.gstatic.com/s/kanit/v17/nKKS-Go6G5tXcraQI6WmVaQ.ttf');
    const b1 = await r1.arrayBuffer();
    fs.writeFileSync('scripts/Kanit-ExtraBoldItalic.ttf', Buffer.from(b1));

    console.log('Downloading Oswald Bold TTF...');
    const r2 = await fetch('https://fonts.gstatic.com/s/oswald/v57/TK3_WkUHHAIjg75cFRf3bXL8LICs1xZogUE.ttf');
    const b2 = await r2.arrayBuffer();
    fs.writeFileSync('scripts/Oswald-Bold.ttf', Buffer.from(b2));

    console.log('Fonts downloaded successfully!');
}

downloadFonts().catch(console.error);
