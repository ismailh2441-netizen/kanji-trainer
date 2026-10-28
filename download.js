const https = require('https');
const fs = require('fs');
https.get('https://unpkg.com/wanakana@5.3.1/umd/wanakana.min.js', (res) => {
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => {
    fs.writeFileSync('wanakana.min.js', Buffer.concat(chunks));
    console.log('done');
  });
});
