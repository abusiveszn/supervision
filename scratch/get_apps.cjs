const fs = require('fs');
const path = require('path');

const authPath = path.join('C:', 'Users', '0xSZN', '.base44', 'auth', 'auth.json');
const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
const token = auth.accessToken;

const endpoints = [
  'https://base44.app/api/workspaces',
  'https://base44.app/api/workspaces/69cffd43324fabb7ca9621d3',
  'https://base44.app/api/workspaces/69cffd43324fabb7ca9621d3/apps',
  'https://base44.app/api/apps'
];

async function run() {
  for (const url of endpoints) {
    try {
      console.log(`Fetching ${url}...`);
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
      } else {
        const text = await res.text();
        console.log(`Error body: ${text.slice(0, 200)}`);
      }
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
    console.log('-'.repeat(40));
  }
}

run();
