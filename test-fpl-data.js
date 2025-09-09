/**
 * FPL Data Loading Test
 * Test if Chelsea players are being loaded correctly
 */

const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

async function testFPLDataLoading() {
  console.log('🧪 Testing FPL Data Loading...\n');
  
  try {
    // Test 1: Check if Chelsea players are loaded
    console.log('1️⃣ Testing Chelsea players loading...');
    const chelseaResponse = await fetch(`${BASE_URL}/api/fpl?action=chelsea-players`);
    const chelseaData = await chelseaResponse.json();
    
    if (chelseaResponse.ok && chelseaData.success) {
      console.log(`✅ Chelsea players loaded: ${chelseaData.data.length} players`);
      console.log(`   Sample players: ${chelseaData.data.slice(0, 3).map(p => p.name).join(', ')}`);
    } else {
      console.log(`❌ Chelsea players failed: ${chelseaData.error || 'Unknown error'}`);
    }
    
    // Test 2: Check FPL sync status
    console.log('\n2️⃣ Testing FPL sync status...');
    const syncResponse = await fetch(`${BASE_URL}/api/fpl-sync?action=sync-status`);
    const syncData = await syncResponse.json();
    
    if (syncResponse.ok && syncData.success) {
      console.log(`✅ FPL sync status: ${syncData.data.lastSync ? 'Last sync: ' + syncData.data.lastSync : 'No sync yet'}`);
    } else {
      console.log(`❌ FPL sync status failed: ${syncData.error || 'Unknown error'}`);
    }
    
    // Test 3: Test FPL sync (if admin)
    console.log('\n3️⃣ Testing FPL sync functionality...');
    const syncTestResponse = await fetch(`${BASE_URL}/api/fpl-sync?action=sync-chelsea-players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    const syncTestData = await syncTestResponse.json();
    
    if (syncTestResponse.ok && syncTestData.success) {
      console.log(`✅ FPL sync test successful: ${syncTestData.data.syncedCount} players synced`);
    } else {
      console.log(`❌ FPL sync test failed: ${syncTestData.error || 'Unknown error'}`);
    }
    
    console.log('\n🎯 FPL Data Loading Test Complete!');
    
  } catch (error) {
    console.log(`💥 Test failed with error: ${error.message}`);
    console.log('Make sure the server is running on localhost:3000 or set VERCEL_URL environment variable');
  }
}

// Run the test
testFPLDataLoading().catch(console.error);
