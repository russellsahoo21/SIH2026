import { createApp } from '../src/app.js';
import { pool } from '../src/db/connection.js';

async function testEndpoints() {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log('Testing Health Endpoint...');
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const healthJson = await healthRes.json();
  console.log('Health:', healthJson);

  console.log('\nTesting Login with officer.rb1...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'officer.rb1', password: 'Demo@123' })
  });
  const loginJson = await loginRes.json();
  console.log('Login Status:', loginRes.status, 'User:', loginJson.data?.user?.username);
  const token = loginJson.data?.token;

  console.log('\nTesting Auth Me...');
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Me Status:', meRes.status, await meRes.json());

  console.log('\nTesting Bureaus List...');
  const bureausRes = await fetch(`${baseUrl}/api/bureaus`);
  console.log('Bureaus Status:', bureausRes.status, await bureausRes.json());

  console.log('\nTesting Register Case...');
  // Find first available institution
  const instRes = await pool.query('SELECT id, name FROM institutions LIMIT 1');
  const testInstId = instRes.rows[0]?.id || 1;

  const registerRes = await fetch(`${baseUrl}/api/cases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      institutionId: testInstId,
      category: 'FEES',
      sourceChannel: 'CPGRAMS',
      receivedOn: '2026-10-25',
      description: 'College is charging unapproved development fees.'
    })
  });
  const registerJson = await registerRes.json();
  console.log('Register Case Status:', registerRes.status, registerJson);

  if (registerJson.data?.case?.id) {
    const caseId = encodeURIComponent(registerJson.data.case.id);
    console.log(`\nTesting Get Case Details (${caseId})...`);
    const caseRes = await fetch(`${baseUrl}/api/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Get Case Status:', caseRes.status, await caseRes.json());
  }

  server.close();
  await pool.end();
}

testEndpoints().catch((err) => {
  console.error(err);
  process.exit(1);
});
