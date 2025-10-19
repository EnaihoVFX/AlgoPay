#!/usr/bin/env node
/**
 * Test the backend API server
 * 
 * This script will:
 * 1. Test all API endpoints
 * 2. Create test users
 * 3. Check balances
 * 
 * Usage: node scripts/testBackendAPI.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (err) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing StickerPay Backend API\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣  Testing health endpoint...');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response:`, JSON.stringify(health.data, null, 2));
    if (health.status === 200) {
      console.log('   ✅ PASS\n');
    } else {
      console.log('   ❌ FAIL\n');
    }
    
    // Test 2: Create user
    console.log('2️⃣  Testing create user endpoint...');
    const createUser = await makeRequest('POST', '/api/createUser', {
      userId: 'testuser1',
      name: 'Test User One'
    });
    console.log(`   Status: ${createUser.status}`);
    console.log(`   Response:`, JSON.stringify(createUser.data, null, 2));
    if (createUser.status === 201 || createUser.status === 409) {
      console.log('   ✅ PASS\n');
    } else {
      console.log('   ❌ FAIL\n');
    }
    
    // Test 3: Get balance
    console.log('3️⃣  Testing get balance endpoint...');
    const balance = await makeRequest('GET', '/api/balance/testuser1');
    console.log(`   Status: ${balance.status}`);
    console.log(`   Response:`, JSON.stringify(balance.data, null, 2));
    if (balance.status === 200) {
      console.log('   ✅ PASS\n');
    } else {
      console.log('   ❌ FAIL\n');
    }
    
    // Test 4: Get all users
    console.log('4️⃣  Testing get all users endpoint...');
    const users = await makeRequest('GET', '/api/users');
    console.log(`   Status: ${users.status}`);
    console.log(`   Response: Found ${users.data.count} user(s)`);
    if (users.status === 200) {
      console.log('   ✅ PASS\n');
    } else {
      console.log('   ❌ FAIL\n');
    }
    
    // Test 5: Get user details
    console.log('5️⃣  Testing get user details endpoint...');
    const userDetails = await makeRequest('GET', '/api/user/testuser1');
    console.log(`   Status: ${userDetails.status}`);
    console.log(`   Response:`, JSON.stringify(userDetails.data, null, 2));
    if (userDetails.status === 200) {
      console.log('   ✅ PASS\n');
    } else {
      console.log('   ❌ FAIL\n');
    }
    
    // Test 6: Get transactions
    console.log('6️⃣  Testing get transactions endpoint...');
    const transactions = await makeRequest('GET', '/api/transactions/testuser1');
    console.log(`   Status: ${transactions.status}`);
    console.log(`   Response: Found ${transactions.data.count} transaction(s)`);
    if (transactions.status === 200) {
      console.log('   ✅ PASS\n');
    } else {
      console.log('   ❌ FAIL\n');
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ All tests completed!\n');
    
  } catch (err) {
    console.error('\n❌ Test error:', err.message);
    console.error('   Make sure the server is running: node backend/index.js\n');
    process.exit(1);
  }
}

runTests();

