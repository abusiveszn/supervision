const fs = require('fs');
const path = require('path');

const bundlePath = 'C:\\Users\\0xSZN\\AppData\\Local\\npm-cache\\_npx\\f03008262d76efee\\node_modules\\base44\\dist\\cli\\index.js';

function run() {
  if (!fs.existsSync(bundlePath)) {
    console.log("Bundle not found.");
    return;
  }
  const content = fs.readFileSync(bundlePath, 'utf8');
  console.log("Searching for URL patterns...");

  // Look for patterns like /api/apps/
  const regex = /\/api\/[a-zA-Z0-9\-\_\/]+/g;
  const matches = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[0].toLowerCase().includes('user') || match[0].toLowerCase().includes('member') || match[0].toLowerCase().includes('auth')) {
      matches.add(match[0]);
    }
  }

  console.log(`Found ${matches.size} matching endpoints:`);
  console.log(Array.from(matches).sort());
}

run();
