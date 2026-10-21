const fs = require('fs');
const path = require('path');

const authPath = path.join('C:', 'Users', '0xSZN', '.base44', 'auth', 'auth.json');
const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
const token = auth.accessToken;

async function run() {
  try {
    const res = await fetch('https://base44.app/api/workspaces/69cffd43324fabb7ca9621d3/apps', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      data.forEach(app => {
        console.log(`ID: ${app.id} | Name: ${app.name} | Slug: ${app.slug}`);
      });
    } else {
      console.log(`Error: ${res.status}`);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
