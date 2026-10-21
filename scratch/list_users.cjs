const fs = require('fs');
const path = require('path');

const authPath = path.join('C:', 'Users', '0xSZN', '.base44', 'auth', 'auth.json');
const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
const token = auth.accessToken;

const appId = '6a6f388fb31a0b2fab0872cd';

const endpoints = [
  `https://base44.app/api/apps/${appId}/users`,
  `https://base44.app/api/apps/${appId}/members`,
  `https://base44.app/api/apps/${appId}/entities/User`,
  `https://base44.app/api/apps/${appId}/entities/User/records`
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
