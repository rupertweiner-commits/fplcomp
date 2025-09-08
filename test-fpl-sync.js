// Test script to check FPL sync API
// Run this in your browser console on the deployed app

async function testFPLSync() {
  try {
    console.log('Testing FPL sync API...');
    
    // Test the sync endpoint
    const response = await fetch('/api/fpl-sync?action=sync-chelsea-players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.success) {
      console.log('✅ FPL sync successful!');
      console.log(`Players created: ${data.data.playersCreated}`);
      console.log(`Players updated: ${data.data.playersUpdated}`);
      console.log(`Total players: ${data.data.totalPlayers}`);
    } else {
      console.error('❌ FPL sync failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ API call failed:', error);
  }
}

// Run the test
testFPLSync();
