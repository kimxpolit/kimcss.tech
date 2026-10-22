const http = require('http');
const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');
const regex = /(?:src|href)=["']([^"'#]+)["']/g;
const links = new Set();
let m;
while ((m = regex.exec(html)) !== null) {
  const url = m[1];
  if (!url.startsWith('http') && !url.startsWith('javascript') && !url.startsWith('tel:') && !url.startsWith('mailto:')) {
    links.add(url.split('?')[0]);
  }
}

console.log('Testing', links.size, 'assets from index.html:');
async function test() {
  let failed = 0;
  for (const l of links) {
    const fullUrl = 'http://localhost:3000/' + (l.startsWith('/') ? l.slice(1) : l);
    await new Promise(resolve => {
      http.get(fullUrl, res => {
        if (res.statusCode !== 200) {
          console.error('FAIL (' + res.statusCode + '):', l);
          failed++;
        } else {
          console.log('OK (200):', l);
        }
        resolve();
      }).on('error', err => {
        console.error('ERR:', l, err.message);
        failed++;
        resolve();
      });
    });
  }
  console.log(`Test complete. Failed: ${failed}/${links.size}`);
}
test();
