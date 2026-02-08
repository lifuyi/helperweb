#!/usr/bin/env node

/**
 * Test script to verify VPN API works correctly
 * Run this to test VPN client creation directly
 */

const LOCAL_API_URL = 'http://localhost:3001';

async function testVpnApi() {
  console.log('=== VPN API Test ===\n');
  
  const testData = {
    userId: '00000000-0000-0000-0000-000000000001',
    email: `test-${Date.now()}@example.com`,
    productId: 'vpn-3days',
    sessionId: 'test_session_' + Date.now()
  };
  
  console.log('Test data:', testData);
  console.log('\nCalling VPN API...\n');
  
  try {
    const response = await fetch(`${LOCAL_API_URL}/api/vpn/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.success) {
      console.log('\n✅ VPN API works correctly!');
      console.log('Client ID:', result.client?.id);
      console.log('VLESS URL:', result.client?.vlessUrl ? '✅ Generated' : '❌ Missing');
      return true;
    } else {
      console.log('\n❌ VPN API failed:', result.error);
      return false;
    }
  } catch (error) {
    console.log('\n❌ Error calling VPN API:', error.message);
    return false;
  }
}

// Run the test
testVpnApi().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});