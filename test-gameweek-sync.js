// Test script to manually trigger gameweek sync
// Run this in browser console if the admin button doesn't work

async function testGameweekSync() {
  try {
    console.log('🔄 Starting gameweek sync test...');
    
    const response = await fetch('/api/players?action=sync-gameweek-points', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      }
    });
    
    console.log('📡 Response status:', response.status);
    
    const data = await response.json();
    console.log('📊 Sync result:', data);
    
    if (data.success) {
      console.log('✅ Sync completed successfully!');
      console.log(`📈 Players processed: ${data.data?.playersProcessed || 0}`);
      console.log(`📝 Records created: ${data.data?.recordsCreated || 0}`);
      console.log('🏆 Leaderboard should now show accurate GW4-5 points');
    } else {
      console.error('❌ Sync failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Sync error:', error);
  }
}

// Run the test
testGameweekSync();
