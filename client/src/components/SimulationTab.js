import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Play, RotateCcw } from 'lucide-react';
import { supabase } from '../config/supabase';

function SimulationTab({
  currentUser,
  draftStatus,
  simulationStatus,
  leaderboard,
  onRefresh,
  onStartSimulation,
  onSimulateGameweek,
  onRefreshLeaderboard
}) {
  const [loading, setLoading] = useState(false);
  const [gameweekHistory, setGameweekHistory] = useState([]);
  const simulationMode = simulationStatus?.is_simulation_mode || false;
  const [simulationData, setSimulationData] = useState(null);

  // Utility function to safely extract values from potentially malformed data
  const safeExtract = (obj, key, fallback = 0) => {
    if (!obj || typeof obj !== 'object') return fallback;
    const value = obj[key];

    return typeof value === 'number' ? value : fallback;
  };

  const safeExtractString = (obj, key, fallback = 'Unknown') => {
    if (!obj || typeof obj !== 'object') return fallback;
    const value = obj[key];

    return typeof value === 'string' ? value : fallback;
  };

  const fetchSimulationData = useCallback(async() => {
    try {
      console.log('Simulation data fetch requested for user:', currentUser?.id);

      // Get draft status
      const { data: draftStatusData, error: statusError } = await supabase
        .from('draft_status')
        .select('*')
        .eq('id', 1)
        .single();

      if (statusError) {
        console.error('Error fetching draft status:', statusError);
        return;
      }

      // Get gameweek history
      const { data: gameweekData, error: gameweekError } = await supabase
        .from('draft_picks')
        .select('*')
        .order('gameweek', { ascending: true });

      if (gameweekError) {
        console.error('Error fetching gameweek data:', gameweekError);
      }

      // Get users for mapping
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email');

      const userMap = {};

      if (users) {
        users.forEach(user => {
          userMap[user.id] = user.email;
        });
      }

      // Process gameweek history
      const gameweekHistory = [];

      if (gameweekData) {
        const gameweeks = {};

        gameweekData.forEach(pick => {
          if (!gameweeks[pick.gameweek]) {
            gameweeks[pick.gameweek] = {
              gameweek: pick.gameweek,
              userScores: [],
              timestamp: pick.created_at
            };
          }

          gameweeks[pick.gameweek].userScores.push({
            userId: pick.user_id,
            username: userMap[pick.user_id] || 'Unknown',
            totalScore: pick.total_score || 0
          });
        });

        gameweekHistory.push(...Object.values(gameweeks));
      }

      // Get user teams
      const { data: userTeams, error: teamsError } = await supabase
        .from('user_teams')
        .select('*');

      if (teamsError) {
        console.error('Error fetching user teams:', teamsError);
      }

      const simulationData = {
        currentGameweek: draftStatusData?.current_gameweek || 1,
        activeGameweek: draftStatusData?.active_gameweek || 1,
        isDraftComplete: draftStatusData?.is_draft_complete || false,
        simulationMode: draftStatusData?.simulation_mode || false,
        gameweekHistory,
        userTeams: userTeams || []
      };

      setSimulationData(simulationData);
      setGameweekHistory(gameweekHistory);

      console.log('✅ Simulation data fetched successfully:', simulationData);
    } catch (error) {
      console.error('Failed to fetch simulation data:', error);
    }
  }, [currentUser?.id]);

  const fetchLeaderboard = useCallback(async() => {
    try {
      console.log('Leaderboard fetch requested for user:', currentUser?.id);

      // Get all users with their total scores
      let { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
;

      if (usersError) {
        console.error('Error fetching users for leaderboard:', usersError);
        // If user_profiles table doesn't exist or has issues, use empty array
        if (usersError.message.includes('relation "user_profiles" does not exist') ||
            usersError.message.includes('PGRST200')) {
          console.log('User profiles table not found or has issues, using empty array');
          users = [];
        } else {
          return;
        }
      }

      // Get total scores for each user
      let { data: scores, error: scoresError } = await supabase
        .from('draft_picks')
        .select('user_id, total_score');

      if (scoresError) {
        console.error('Error fetching scores for leaderboard:', scoresError);
        // If draft_picks table doesn't exist, use empty array
        if (scoresError.message.includes('relation "draft_picks" does not exist') ||
            scoresError.message.includes('PGRST200')) {
          console.log('Draft picks table not found, using empty array');
          scores = [];
        } else {
          return;
        }
      }

      // Calculate total scores for each user
      const userTotals = {};

      users.forEach(user => {
        userTotals[user.id] = {
          userId: user.id,
          username: user.email,
          totalPoints: 0,
          gameweeksPlayed: 0
        };
      });

      scores.forEach(score => {
        if (userTotals[score.user_id]) {
          userTotals[score.user_id].totalPoints += score.total_score || 0;
          userTotals[score.user_id].gameweeksPlayed += 1;
        }
      });

      // Sort by total points
      const leaderboard = Object.values(userTotals).sort((a, b) => b.totalPoints - a.totalPoints);

      console.log('✅ Leaderboard fetched successfully:', leaderboard);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchLeaderboard();
    fetchSimulationData();
  }, [draftStatus?.simulationMode, fetchLeaderboard, fetchSimulationData]);


  // Transfer system for testing
  const handleMakeTransfer = async(userTeam, playerOut, playerIn) => {
    try {
      console.log('🔄 Making transfer:', playerOut.name, '→', playerIn.name);

      const currentGameweek = draftStatus?.activeGameweek || 1;

      // Check if user has free transfers
      const { data: userHistory } = await supabase
        .from('user_gameweek_history')
        .select('transfers_made')
        .eq('user_id', currentUser.id)
        .eq('gameweek', currentGameweek)
        .single();

      const transfersMade = userHistory?.transfers_made || 0;
      const isFreeTransfer = transfersMade === 0;
      const transferCost = isFreeTransfer ? 0 : 4;

      // Record the transfer
      const { error: transferError } = await supabase
        .from('user_transfers')
        .insert({
          user_id: currentUser.id,
          gameweek: currentGameweek,
          player_out_id: playerOut.id,
          player_out_name: playerOut.name,
          player_in_id: playerIn.id,
          player_in_name: playerIn.name,
          transfer_cost: transferCost,
          is_free_transfer: isFreeTransfer
        });

      if (transferError) {
        console.error('Transfer error:', transferError);
        return { success: false, error: transferError.message };
      }

      // Update user team
      const { error: teamError } = await supabase
        .from('user_teams')
        .update({
          player_id: playerIn.id,
          player_name: playerIn.name,
          position: playerIn.position,
          purchase_price: playerIn.price,
          current_price: playerIn.price
        })
        .eq('user_id', currentUser.id)
        .eq('player_id', playerOut.id);

      if (teamError) {
        console.error('Team update error:', teamError);
        return { success: false, error: teamError.message };
      }

      console.log('✅ Transfer completed successfully');
      return { success: true, transferCost };
    } catch (error) {
      console.error('Transfer error:', error);
      return { success: false, error: error.message };
    }
  };

  // Chip system for testing
  const handleUseChip = async(chipType) => {
    try {
      console.log('🎯 Using chip:', chipType);

      const currentGameweek = simulationStatus?.current_gameweek || 1;

      // Check if chip is available
      const { data: chipData, error: chipError } = await supabase
        .from('user_chips')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('chip_type', chipType)
        .eq('is_available', true)
        .single();

      if (chipError || !chipData) {
        return { success: false, error: 'Chip not available or already used' };
      }

      // Mark chip as used
      const { error: updateError } = await supabase
        .from('user_chips')
        .update({
          is_available: false,
          gameweek_used: currentGameweek
        })
        .eq('id', chipData.id);

      if (updateError) {
        console.error('Chip update error:', updateError);
        return { success: false, error: updateError.message };
      }

      // Update user gameweek history to record chip usage
      const { error: historyError } = await supabase
        .from('user_gameweek_history')
        .upsert({
          user_id: currentUser.id,
          gameweek: currentGameweek,
          chip_used: chipType
        }, { onConflict: 'user_id,gameweek' });

      if (historyError) {
        console.error('History update error:', historyError);
      }

      console.log('✅ Chip activated successfully');
      return { success: true, chipType, gameweek: currentGameweek };
    } catch (error) {
      console.error('Chip error:', error);
      return { success: false, error: error.message };
    }
  };

  const handleSimulateGameweek = async() => {
    if (!currentUser?.isAdmin) {
      alert('Only admins can simulate gameweeks');
      return;
    }

    try {
      setLoading(true);
      const currentGameweek = simulationStatus?.current_gameweek || 1;

      console.log('Simulate gameweek requested:', currentGameweek, 'for user:', currentUser?.id);

      await onSimulateGameweek(currentGameweek);
    } catch (error) {
      console.error('Error simulating gameweek:', error);
      alert('Failed to simulate gameweek');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSimulationMode = async() => {
    if (!currentUser?.isAdmin) {
      alert('Only admins can toggle simulation mode');
      return;
    }

    try {
      setLoading(true);

      if (!simulationStatus?.is_simulation_mode) {
        // Start simulation
        await onStartSimulation();
      } else {
        // Exit simulation - for now just show a message
        alert('To exit simulation mode, please contact the admin or restart the system.');
      }
    } catch (error) {
      console.error('❌ Error toggling simulation mode:', error);
      alert(`Failed to toggle simulation mode: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSimulation = async() => {
    if (window.confirm('Are you sure you want to reset all simulation data? This cannot be undone.')) {
      try {
        setLoading(true);
        console.log('Reset simulation requested for user:', currentUser?.id);

        // Clear all simulation data
        const { error: clearPicksError } = await supabase
          .from('draft_picks')
          .delete()
          .neq('id', 0); // Delete all records

        if (clearPicksError) {
          console.error('Error clearing draft picks:', clearPicksError);
        }

        const { error: clearTeamsError } = await supabase
          .from('user_teams')
          .delete()
          .neq('id', 0); // Delete all records

        if (clearTeamsError) {
          console.error('Error clearing user teams:', clearTeamsError);
        }

        // Reset draft status
        const { error: resetStatusError } = await supabase
          .from('draft_status')
          .update({
            is_draft_complete: false,
            simulation_mode: false,
            active_gameweek: 1,
            current_gameweek: 1
          })
          .eq('id', 1);

        if (resetStatusError) {
          console.error('Error resetting draft status:', resetStatusError);
        }

        console.log('✅ Simulation reset successfully');
        await onRefresh();
        await fetchSimulationData();
        await fetchLeaderboard();
        alert('Simulation reset successfully!');
      } catch (error) {
        console.error('Error resetting simulation:', error);
        alert('Failed to reset simulation');
      } finally {
        setLoading(false);
      }
    }
  };

  const currentGameweek = simulationStatus?.current_gameweek || 1;
  const isDraftComplete = simulationStatus?.is_draft_complete || false;

  return (
    <div className="space-y-8">
      {/* Simulation Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ color: '#034694' }}>
            {simulationMode ? '🎮' : '🏆'}
            {' '}
            {simulationMode ? 'Simulation Mode' : 'Live FPL Mode'}
          </h2>
          {currentUser?.isAdmin && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              👑 Admin Access
            </span>
          )}
          <div className="flex items-center gap-4">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                simulationMode ?
                  'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
              }`}
            >
              {simulationMode ? 'SIMULATION' : 'LIVE'}
            </span>
            <button
              className={`px-4 py-2 rounded-lg text-white font-medium ${
                simulationMode ?
                  'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
              } ${!currentUser?.isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={loading || !currentUser?.isAdmin}
              onClick={handleToggleSimulationMode}
            >
              {simulationMode ? 'Exit Simulation' : 'Enter Simulation'}
            </button>
          </div>
        </div>
        <p className="text-gray-600 mb-6">
          {simulationMode ?
            'Test features with simulated scores and custom gameweek progression' :
            'Use real FPL data and current gameweek status'
          }
        </p>

        {currentUser?.isAdmin && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fillRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Admin Access Granted
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Welcome Rupert! You have full access to all simulation features.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!currentUser?.isAdmin && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path clipRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" fillRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Admin Access Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Simulation features are only available to Rupert (Admin). Rupert must be logged in to access these features.</p>
                  <p className="mt-1">
                    <strong>To use simulation:</strong>
                    {' '}
                    Contact Rupert for access.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: '#034694' }}>{typeof currentGameweek === 'number' ? currentGameweek : 1}</div>
            <div className="text-sm text-gray-600">Current Gameweek</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: '#034694' }}>{draftStatus?.users?.length || 0}</div>
            <div className="text-sm text-gray-600">Players</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: '#034694' }}>{draftStatus?.draftedCount || 0}</div>
            <div className="text-sm text-gray-600">Drafted Players</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: '#034694' }}>{leaderboard.length}</div>
            <div className="text-sm text-gray-600">Active Teams</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">

          {simulationMode && (
            <>
              <button
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  !currentUser?.isAdmin ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={loading || !isDraftComplete || !currentUser?.isAdmin}
                onClick={handleSimulateGameweek}
                style={{ backgroundColor: '#034694' }}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Simulate Current Gameweek
              </button>

              <button
                className={`flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 ${
                  !currentUser?.isAdmin ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={loading || !currentUser?.isAdmin}
                onClick={handleResetSimulation}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Reset All
              </button>

              {/* Transfer Testing Section */}
            </>
          )}

          {simulationMode && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#034694' }}>
                🔄 Transfer System Testing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                  onClick={() => alert('Transfer functionality - select players to swap')}
                >
                  <RefreshCw className="w-4 h-4" />
                  Test Transfer
                </button>
                <div className="text-sm text-gray-600">
                  <p>
                    <strong>Free Transfers:</strong>
                    {' '}
                    1 per gameweek
                  </p>
                  <p>
                    <strong>Extra Transfers:</strong>
                    {' '}
                    -4 points each
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Chips Testing Section */}
          {simulationMode && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#034694' }}>
                🎯 Chips System Testing
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['wildcard', 'free_hit', 'bench_boost', 'triple_captain'].map(chip => (
                  <button
                    className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 capitalize"
                    disabled={loading}
                    key={chip}
                    onClick={() => handleUseChip(chip)}
                  >
                    {chip.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-600 mt-2">
                <p>
                  <strong>Wildcard:</strong>
                  {' '}
                  Free unlimited transfers
                </p>
                <p>
                  <strong>Free Hit:</strong>
                  {' '}
                  One-week team change
                </p>
                <p>
                  <strong>Bench Boost:</strong>
                  {' '}
                  All 15 players score
                </p>
                <p>
                  <strong>Triple Captain:</strong>
                  {' '}
                  Captain gets 3x points
                </p>
              </div>
            </div>
          )}
          )}
        </div>

        {!isDraftComplete && simulationMode && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              🚀
              {' '}
              <strong>Start here:</strong>
              {' '}
              Click "Randomize Teams" to give each user a balanced 5-player Chelsea team, then simulate gameweeks to experience the chip mechanics!
            </p>
          </div>
        )}

        {!simulationMode && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              📡
              {' '}
              <strong>Live Mode:</strong>
              {' '}
              Using real FPL data and current gameweek status. Switch to simulation mode to test features.
            </p>
          </div>
        )}
      </div>

      {/* Current Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#034694' }}>🏆 Overall Leaderboard</h2>
          <div className="space-y-3">
            {leaderboard.map((user, index) => (
              <div
                className={`p-4 rounded-lg flex items-center justify-between ${
                  user.userId === currentUser?.id ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
                }`}
                key={user.userId}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{safeExtractString(user, 'username', 'Unknown User')}</div>
                    <div className="text-sm text-gray-600">
                      {safeExtract(user, 'gameweeksPlayed', 0)}
                      {' '}
                      gameweeks played
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: '#034694' }}>
                    {safeExtract(user, 'totalPoints', 0)}
                  </div>
                  <div className="text-sm text-gray-600">total points</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gameweek History */}
      {gameweekHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#034694' }}>📈 Gameweek History</h2>
          <div className="space-y-3">
            {gameweekHistory.slice(-5).reverse().map((gameweek, index) => (
              <div className="p-4 bg-gray-50 rounded-lg" key={gameweek.gameweek}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">
                    Gameweek
                    {gameweek.gameweek}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {gameweek.timestamp ? new Date(gameweek.timestamp).toLocaleDateString() : 'Simulated'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {Object.entries(gameweek.userScores || {}).map(([userId, score]) => {
                    const user = draftStatus?.users?.find(u => u.id === parseInt(userId));

                    // Safely extract the score value using our utility function
                    const displayScore = safeExtract(score, 'totalScore', 0);

                    return (
                      <div className="text-center" key={userId}>
                        <div className="font-medium">{safeExtractString(user, 'username', `User ${userId}`)}</div>
                        <div className="text-lg font-bold text-blue-600">{displayScore}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SimulationTab;
