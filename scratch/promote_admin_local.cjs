const { createClient } = require('@base44/sdk');

const appId = '6a6f388fb31a0b2fab0872cd';

const base44 = createClient({
  appId,
  serverUrl: 'http://localhost:4400',
  requiresAuth: false,
});

async function run() {
  console.log("Connecting to local database at http://localhost:4400...");
  try {
    const users = await base44.entities.User.list();
    console.log(`Found ${users.length} user profiles:`);
    console.log(JSON.stringify(users, null, 2));

    if (users.length === 0) {
      console.log("No user profiles found in the local database. Please register a user first in the UI!");
      return;
    }

    // Promote all users or a specific user
    for (const user of users) {
      console.log(`Promoting user ID ${user.id} to role 'admin'...`);
      await base44.entities.User.update(user.id, { role: 'admin' });
      console.log(`Successfully promoted ${user.id}!`);
    }

    console.log("All done! You can now log in using the promoted user credentials.");
  } catch (e) {
    console.error("Error executing script:", e.message);
    console.log("Note: Make sure your local server is running (npx base44 dev --app-id 6a6f388fb31a0b2fab0872cd) before running this script.");
  }
}

run();
