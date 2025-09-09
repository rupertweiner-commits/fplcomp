import { useState, useEffect, useCallback } from 'react';
import supabase from '../config/supabase';

export function useDraftState(currentUser) {
  const [draftStatus, setDraftStatus] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState(null);
  const [chelseaPlayers, setChelseaPlayers] = useState([]);
  const [draftPicks, setDraftPicks] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [liveScores, setLiveScores] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDraftData = useCallback(async() => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching draft data...');

      // Fetch draft status
      const { data: draftData, error: draftError } = await supabase
        .from('draft_status')
        .select('*')
        .single();

      if (draftError) {
        console.error('❌ Error fetching draft status:', draftError);
        setError('Failed to fetch draft status');
        return;
      }

      // Fetch simulation status
      const { data: simData, error: simError } = await supabase
        .from('simulation_status')
        .select('*')
        .single();

      if (simError) {
        console.warn('⚠️ Simulation status not found (non-critical):', simError);
      }

      // Fetch Chelsea players
      const { data: playersData, error: playersError } = await supabase
        .from('chelsea_players')
        .select('*')
        .order('name');

      if (playersError) {
        console.error('❌ Error fetching Chelsea players:', playersError);
        setError('Failed to fetch Chelsea players');
        return;
      }

      console.log('✅ Chelsea players fetched:', playersData?.length || 0, 'players');

      // Fetch draft picks
      const { data: picksData, error: picksError } = await supabase
        .from('draft_picks')
        .select('*')
        .order('created_at');

      if (picksError) {
        console.warn('⚠️ Draft picks not found (non-critical):', picksError);
      }

      // Fetch users for leaderboard
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('is_active', true);

      if (usersError) {
        console.warn('⚠️ Users not found (non-critical):', usersError);
      }

      // Build leaderboard from draft picks
      const leaderboardData = (picksData || []).map(pick => ({
        id: pick.user_id,
        username: pick.username || 'Unknown',
        totalScore: pick.total_score || 0,
        gameweekScore: pick.gameweek_score || 0,
        isCaptain: pick.is_captain || false,
        isViceCaptain: pick.is_vice_captain || false
      }));

      setDraftStatus(draftData);
      setSimulationStatus(simData);
      setChelseaPlayers(playersData || []);
      setDraftPicks(picksData || []);
      setLeaderboard(leaderboardData);

      console.log('✅ Draft data fetched successfully');
    } catch (error) {
      console.error('❌ Error fetching draft data:', error);
      setError('Failed to fetch draft data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLiveScores = useCallback(async() => {
    try {
      console.log('🔄 Fetching live scores...');

      const response = await fetch('/api/fpl?action=live-scores');
      const data = await response.json();

      if (data.success) {
        setLiveScores(data.data);
        console.log('✅ Live scores fetched successfully');
      } else {
        console.warn('⚠️ Live scores not available:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching live scores:', error);
    }
  }, []);

  const fetchLeaderboard = useCallback(async() => {
    try {
      console.log('🔄 Fetching leaderboard...');

      const response = await fetch('/api/simulation?action=leaderboard');
      const data = await response.json();

      if (data.success) {
        setLeaderboard(data.data || []);
        console.log('✅ Leaderboard fetched successfully');
      } else {
        console.warn('⚠️ Leaderboard not available:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
    }
  }, []);

  const startSimulation = useCallback(async() => {
    if (!currentUser?.isAdmin) {
      alert('Admin access required');
      return;
    }

    try {
      console.log('🚀 Starting simulation...');

      const response = await fetch('/api/simulation?action=start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.access_token || ''}`
        }
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Simulation started successfully');
        await fetchDraftData();
        alert('Simulation started successfully!');
      } else {
        console.error('❌ Simulation failed:', data.error);
        alert('Failed to start simulation: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Simulation error:', error);
      alert('Simulation failed: ' + error.message);
    }
  }, [currentUser, fetchDraftData]);

  const simulateGameweek = useCallback(async() => {
    if (!currentUser?.isAdmin) {
      alert('Admin access required');
      return;
    }

    try {
      console.log('🎯 Simulating gameweek...');

      const response = await fetch('/api/simulation?action=simulate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.access_token || ''}`
        },
        body: JSON.stringify({
          gameweek: simulationStatus?.current_gameweek || 1
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Gameweek simulated successfully');
        await fetchDraftData();
        await fetchLeaderboard();
        alert('Gameweek simulated successfully!');
      } else {
        console.error('❌ Simulation failed:', data.error);
        alert('Simulation failed: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Simulation error:', error);
      alert('Simulation failed: ' + error.message);
    }
  }, [currentUser, simulationStatus, fetchDraftData, fetchLeaderboard]);

  const draftPlayer = useCallback(async(playerId) => {
    if (!currentUser) {
      alert('Please log in to draft players');
      return;
    }

    try {
      console.log('🎯 Drafting player:', playerId);

      const response = await fetch('/api/draft?action=draft-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Player drafted successfully');
        await fetchDraftData();
        alert('Player drafted successfully!');
      } else {
        console.error('❌ Draft failed:', data.error);
        alert('Draft failed: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Draft error:', error);
      alert('Draft failed: ' + error.message);
    }
  }, [currentUser, fetchDraftData]);

  useEffect(() => {
    if (currentUser) {
      fetchDraftData();
    }
  }, [currentUser, fetchDraftData]);

  return {
    // State
    draftStatus,
    simulationStatus,
    chelseaPlayers,
    draftPicks,
    leaderboard,
    liveScores,
    loading,
    error,

    // Actions
    fetchDraftData,
    fetchLiveScores,
    fetchLeaderboard,
    startSimulation,
    simulateGameweek,
    draftPlayer
  };
}
