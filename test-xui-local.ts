import { XuiApiClient } from './services/xuiClient';

async function testXui() {
  console.log('Testing X-UI API locally...\n');

  const baseUrl = process.env.XUI_BASE_URL;
  const username = process.env.XUI_USERNAME;
  const password = process.env.XUI_PASSWORD;

  console.log('Environment check:');
  console.log('  XUI_BASE_URL:', baseUrl ? 'Set' : 'Missing');
  console.log('  XUI_USERNAME:', username ? 'Set' : 'Missing');
  console.log('  XUI_PASSWORD:', password ? 'Set' : 'Missing');

  if (!baseUrl || !username || !password) {
    console.error('\nMissing environment variables!');
    console.log('Create .env.local with:');
    console.log('  XUI_BASE_URL=https://your-xui-server:port/path');
    console.log('  XUI_USERNAME=admin');
    console.log('  XUI_PASSWORD=yourpassword');
    process.exit(1);
  }

  const xui = new XuiApiClient({
    baseUrl: baseUrl.replace(/\/$/, ''),
    username,
    password,
  });

  console.log('\nTesting X-UI connection...');
  console.log('  URL:', baseUrl);

  console.log('\nTesting login...');
  const loggedIn = await xui.login();
  
  if (!loggedIn) {
    console.error('Login failed!');
    console.log('Check:');
    console.log('  - Username/password');
    console.log('  - Server accessibility');
    console.log('  - SSL certificate issues');
    process.exit(1);
  }

  console.log('Login successful!');

  console.log('\nFetching inbounds...');
  const inbounds = await xui.getInbounds();
  console.log(`Found ${inbounds.length} inbound(s)`);

  if (inbounds.length === 0) {
    console.error('No inbounds found!');
    console.log('Create an inbound in X-UI panel first.');
    process.exit(1);
  }

  inbounds.forEach((inbound, i) => {
    console.log(`  [${i + 1}] ID: ${inbound.id}, Port: ${inbound.port}, Protocol: ${inbound.protocol}`);
  });

  console.log('\nTesting client creation...');
  const testEmail = `test-${Date.now()}@example.com`;
  const inbound = inbounds[0];
  
  console.log(`Creating client for inbound ${inbound.id}...`);
  console.log(`Email: ${testEmail}`);
  
  const client = await xui.createClient(inbound.id, testEmail, 3, 1);

  if (!client) {
    console.error('Failed to create client!');
    console.log('Check:');
    console.log('  - API endpoint format');
    console.log('  - Permissions');
    console.log('  - X-UI version compatibility');
    process.exit(1);
  }

  console.log('Client created successfully!');
  console.log('  UUID:', client.uuid);
  console.log('  Email:', client.email);
  console.log('  Expiry:', new Date(client.expiryTime * 1000).toISOString());

  console.log('\nAll tests passed!');
}

testXui().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
