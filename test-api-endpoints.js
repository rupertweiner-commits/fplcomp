/**
 * API Endpoint Testing Script
 * Run this to test all API endpoints are working correctly
 */

const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

// Test endpoints
const endpoints = [
  // FPL API
  { method: 'GET', url: '/api/fpl?action=bootstrap', name: 'FPL Bootstrap' },
  { method: 'GET', url: '/api/fpl?action=current-gameweek', name: 'FPL Current Gameweek' },
  
  // Simulation API
  { method: 'GET', url: '/api/simulation?action=status', name: 'Simulation Status' },
  { method: 'GET', url: '/api/simulation?action=leaderboard', name: 'Simulation Leaderboard' },
  
  // Teams API
  { method: 'GET', url: '/api/teams?action=all', name: 'All Teams' },
  
  // Activity API
  { method: 'GET', url: '/api/activity?action=recent', name: 'Recent Activity' },
  
  // Chips API (will need auth)
  // { method: 'POST', url: '/api/chips?action=use', name: 'Use Chip' },
  
  // FPL Sync API
  { method: 'GET', url: '/api/fpl-sync?action=sync-status', name: 'FPL Sync Status' },
];

async function testEndpoint(endpoint) {
  try {
    console.log(`🧪 Testing ${endpoint.name}...`);
    
    const response = await fetch(`${BASE_URL}${endpoint.url}`, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${endpoint.name}: OK (${response.status})`);
      return { success: true, endpoint: endpoint.name, status: response.status };
    } else {
      console.log(`❌ ${endpoint.name}: Failed (${response.status}) - ${data.error || 'Unknown error'}`);
      return { success: false, endpoint: endpoint.name, status: response.status, error: data.error };
    }
  } catch (error) {
    console.log(`💥 ${endpoint.name}: Error - ${error.message}`);
    return { success: false, endpoint: endpoint.name, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting API Endpoint Tests...\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    console.log(''); // Add spacing
  }
  
  // Summary
  console.log('📊 Test Summary:');
  console.log('================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / results.length) * 100)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.endpoint}: ${r.error || `HTTP ${r.status}`}`);
    });
  }
  
  console.log('\n🎯 Next Steps:');
  if (failed === 0) {
    console.log('  All API endpoints are working! ✨');
    console.log('  Ready to test frontend features.');
  } else {
    console.log('  Fix the failed endpoints before testing frontend features.');
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests, testEndpoint };
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runTests().catch(console.error);
}
