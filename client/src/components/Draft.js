import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  User,
  Shield,
  LogOut,
  RefreshCw,
  Clock,
  CheckCircle,
  ArrowLeftRight,
  Star,
  Gift,
  Play,
  RotateCcw,
  Activity
} from 'lucide-react';
import { supabase } from '../config/supabase';
import PlayerStats from './PlayerStats';
import ProfileManagerClean from './ProfileManagerClean';
import UserTeamManagement from './UserTeamManagement';
import AdminDashboard from './AdminDashboard';
import DraftQueue from './DraftQueue.js';
import ForgotPassword from './ForgotPassword.js';
import ProfileCompletion from './ProfileCompletion.js';
import AuthForm from './AuthForm.js';
import NotificationPreferences from './NotificationPreferences.js';
import ChelseaNextGame from './ChelseaNextGame.js';

function Draft({ wsService, currentUser }) {
  const [draftStatus, setDraftStatus] = useState(null);
  const [chelseaPlayers, setChelseaPlayers] = useState([]);
  const [liveScores, setLiveScores] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('team-management');
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Debug logging
  console.log('🚀 Draft component rendering');
  console.log('👤 currentUser:', currentUser);
  if (error) {
    console.log('❌ error:', error);
  }

  // Check profile completion when currentUser changes
  useEffect(() => {
    if (currentUser) {
      checkProfileCompletion(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchDraftData();
      fetchSimulationStatus();
      fetchLeaderboard();

      // Subscribe to WebSocket updates for live scores if available
      if (wsService) {
        const unsubscribe = wsService.subscribe('liveUpdate', handleLiveUpdate);
        return unsubscribe;
      } else {
        // For frontend-only deployment, use polling for live updates
        const interval = setInterval(() => {
          fetchLiveScores();
        }, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
      }
    }
  }, [currentUser, wsService]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDraftData = async() => {
    try {
      setLoading(true);

      // Fetch draft status from Supabase
      let { data: draftStatusData, error: draftStatusError } = await supabase
        .from('draft_status')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      if (draftStatusError) {
        console.error('Failed to fetch draft status:', draftStatusError);

        // If table doesn't exist or no records, create default data
        if (draftStatusError.code === 'PGRST116' || draftStatusError.message.includes('relation "draft_status" does not exist')) {
          console.log('Draft status table/record not found, using default values');
          const defaultDraftStatus = {
            id: 1,
            is_draft_active: false,
            is_draft_complete: false,
            simulation_mode: false,
            current_turn: null,
            is_paused: false,
            active_gameweek: 1,
            current_gameweek: 1
          };

          // Try to insert default record
          const { error: insertError } = await supabase
            .from('draft_status')
            .insert(defaultDraftStatus);

          if (insertError) {
            console.error('Failed to create default draft status:', insertError);
          }

          // Use default values
          draftStatusData = defaultDraftStatus;
        } else {
          throw draftStatusError;
        }
      }

      // Fetch Chelsea players from Supabase
      let { data: playersData, error: playersError } = await supabase
        .from('chelsea_players')
        .select('*')
        .order('position', { ascending: true });

      if (playersError) {
        console.error('Failed to fetch Chelsea players:', playersError);
        // If table doesn't exist, use empty array
        if (playersError.message.includes('relation "chelsea_players" does not exist')) {
          console.log('Chelsea players table not found, using empty array');
          playersData = [];
        } else {
          throw playersError;
        }
      }

      // Fetch all users for draft
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('id');

      if (usersError) {
        console.error('Failed to fetch users:', usersError);
        throw usersError;
      }

      // Fetch draft picks to calculate team sizes
      let { data: draftPicks, error: picksError } = await supabase
        .from('draft_picks')
        .select('user_id, player_id');

      if (picksError) {
        console.error('Failed to fetch draft picks:', picksError);
        // If table doesn't exist, use empty array
        if (picksError.message.includes('relation "draft_picks" does not exist')) {
          console.log('Draft picks table not found, using empty array');
          draftPicks = [];
        } else {
          throw picksError;
        }
      }

      // Calculate team sizes for each user
      const userTeamSizes = {};

      draftPicks.forEach(pick => {
        userTeamSizes[pick.user_id] = (userTeamSizes[pick.user_id] || 0) + 1;
      });

      // Transform users with team sizes
      const usersWithTeams = usersData.map(user => ({
        id: user.id,
        username: user.email,
        teamSize: userTeamSizes[user.id] || 0,
        team: [] // Will be populated if needed
      }));

      // Transform draft status data
      const transformedDraftStatus = {
        isActive: draftStatusData.is_draft_active,
        isDraftActive: draftStatusData.is_draft_active,
        isDraftComplete: draftStatusData.is_draft_complete,
        currentTurn: draftStatusData.current_turn,
        currentRound: draftStatusData.current_round,
        currentPick: draftStatusData.current_pick,
        totalRounds: draftStatusData.total_rounds,
        timePerPick: draftStatusData.time_per_pick,
        isPaused: draftStatusData.is_paused,
        currentPlayer: draftStatusData.current_player_id,
        draftOrder: draftStatusData.draft_order || [],
        completedPicks: draftStatusData.completed_picks || [],
        users: usersWithTeams
      };

      // Transform players data
      const transformedPlayers = playersData.map(player => ({
        id: player.id,
        name: player.name,
        position: player.position,
        price: parseFloat(player.price),
        team: player.team,
        web_name: player.web_name,
        is_available: player.is_available
      }));

      setDraftStatus(transformedDraftStatus);
      setChelseaPlayers(transformedPlayers);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch draft data:', err);
      setError('Failed to load draft data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSimulationStatus = async() => {
    try {
      const response = await fetch('/api/simulation?action=status');
      const data = await response.json();

      if (data.success) {
        setSimulationStatus(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch simulation status:', err);
    }
  };

  const fetchLeaderboard = async() => {
    try {
      const response = await fetch('/api/simulation?action=leaderboard');
      const data = await response.json();

      if (data.success) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  };

  const startSimulation = async() => {
    if (!currentUser?.isAdmin) {
      alert('Only admins can start simulation');
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 Starting global simulation (affects all users)');

      // First, start the simulation via API
      const response = await fetch('/api/simulation?action=start', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Simulation API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Simulation API error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        alert(`Failed to start simulation: ${data.error}`);
        return;
      }

      // Then, randomize teams (integrated from handleRandomizeTeams)
      console.log('Simulation started, now randomizing teams...');

      // Get all active users
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('*');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        alert('Failed to fetch users for team randomization');
        return;
      }

      // Get Chelsea players
      const { data: chelseaPlayers, error: playersError } = await supabase
        .from('chelsea_players')
        .select('*');

      if (playersError) {
        console.error('Error fetching Chelsea players:', playersError);
        alert('Failed to fetch Chelsea players for team randomization');
        return;
      }

      if (chelseaPlayers.length < users.length * 5) {
        alert('Not enough Chelsea players for team randomization');
        return;
      }

      // Shuffle players
      const shuffledPlayers = [...chelseaPlayers].sort(() => Math.random() - 0.5);

      // Assign 5 players to each user
      const teamAssignments = [];
      let playerIndex = 0;

      for (const user of users) {
        const userTeam = shuffledPlayers.slice(playerIndex, playerIndex + 5);

        // Insert team assignment
        for (const player of userTeam) {
          teamAssignments.push({
            user_id: user.id,
            player_id: player.id,
            player_name: player.name,
            position: player.position,
            price: player.price,
            is_captain: false,
            is_vice_captain: false,
            assigned_at: new Date().toISOString()
          });
        }

        playerIndex += 5;
        console.log(`👥 ${user.email}: ${userTeam.map(p => p.name).join(', ')}`);
      }

      // Insert all team assignments
      const { error: insertError } = await supabase
        .from('user_teams')
        .insert(teamAssignments);

      if (insertError) {
        console.error('Error inserting team assignments:', insertError);
        alert('Failed to save team assignments');
        return;
      }

      // Mark draft as complete
      const { error: updateError } = await supabase
        .from('draft_status')
        .update({ is_draft_complete: true })
        .eq('id', 1);

      if (updateError) {
        console.error('Error updating draft status:', updateError);
        // Don't fail the whole operation for this
      }

      console.log('✅ Simulation started and teams randomized successfully');
      await fetchDraftData();
      await fetchSimulationStatus();
      alert('Simulation started successfully! Teams have been randomized and assigned to all users.');
    } catch (err) {
      console.error('Failed to start simulation:', err);
      alert('Failed to start simulation');
    } finally {
      setLoading(false);
    }
  };

  const simulateGameweek = async(gameweek) => {
    if (!currentUser?.isAdmin) {
      alert('Only admins can simulate gameweeks');
      return;
    }

    try {
      const response = await fetch('/api/simulation?action=simulate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameweek })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Gameweek ${gameweek} simulated successfully!`);
        fetchLeaderboard();
      } else {
        alert(`Failed to simulate gameweek: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to simulate gameweek:', err);
      alert('Failed to simulate gameweek');
    }
  };

  const handleLiveUpdate = (data) => {
    // Refresh live scores when we get updates
    if (data.type === 'liveUpdate' || data.type === 'quickLiveUpdate') {
      fetchLiveScores();
    }
  };

  const fetchLiveScores = async() => {
    try {
      // For now, we'll skip live scores until we implement that endpoint
      setLiveScores(null);
    } catch (err) {
      console.error('Failed to fetch live scores:', err);
    }
  };

  const handleLogout = async() => {
    try {
      // Logout handled by Supabase auth service
      console.log('Logging out user:', currentUser?.email);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const checkProfileCompletion = async(user) => {
    try {
      setCheckingProfile(true);

      // If user object already has profileComplete flag, use it
      if (user.profileComplete !== undefined) {
        setProfileComplete(user.profileComplete);
        return;
      }

      // For admin users, always consider profile complete to avoid blocking
      if (user.isAdmin) {
        console.log('Admin user detected, skipping profile completion check');
        setProfileComplete(true);
        return;
      }

      // Otherwise, fetch the profile from database to check completion
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Failed to fetch profile for completion check:', error);
        // If we can't fetch profile, assume it's complete to avoid blocking
        setProfileComplete(true);
        return;
      }

      // Check if profile has required fields
      const isComplete = !!(userProfile?.first_name && userProfile?.last_name && userProfile?.email);

      setProfileComplete(isComplete);

      console.log('Profile completion check:', {
        hasFirstName: !!userProfile?.first_name,
        hasLastName: !!userProfile?.last_name,
        hasEmail: !!userProfile?.email,
        isComplete
      });
    } catch (error) {
      console.error('Failed to check profile completion:', error);
      // If there's an error, assume profile is complete to avoid blocking
      setProfileComplete(true);
    } finally {
      setCheckingProfile(false);
    }
  };

  const handleProfileComplete = (updatedUser) => {
    // Profile completion is now handled by App.js
    setProfileComplete(true);
  };

  const handleDraftPlayer = async(playerId) => {
    try {
      console.log('Drafting player:', playerId, 'for user:', currentUser.id);

      // Check if it's the user's turn
      if (draftStatus?.currentTurn !== currentUser.id) {
        throw new Error('It\'s not your turn to draft!');
      }

      // Check if draft is active
      if (!draftStatus?.isDraftActive) {
        throw new Error('Draft is not currently active!');
      }

      // Check if player is already drafted
      const { data: existingPick, error: checkError } = await supabase
        .from('draft_picks')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking if player is drafted:', checkError);
        throw new Error('Failed to check player availability');
      }

      if (existingPick) {
        throw new Error('This player has already been drafted!');
      }

      // Check if user already has 5 players
      const { data: userPicks, error: userPicksError } = await supabase
        .from('draft_picks')
        .select('*')
        .eq('user_id', currentUser.id);

      if (userPicksError) {
        console.error('Error checking user picks:', userPicksError);
        throw new Error('Failed to check user team size');
      }

      if (userPicks && userPicks.length >= 5) {
        throw new Error('You already have 5 players!');
      }

      // Draft the player
      const { error: draftError } = await supabase
        .from('draft_picks')
        .insert({
          user_id: currentUser.id,
          player_id: playerId,
          gameweek: 1,
          created_at: new Date().toISOString()
        });

      if (draftError) {
        console.error('Error drafting player:', draftError);
        throw new Error('Failed to draft player');
      }

      // Update user's team in user_teams table
      const { error: teamError } = await supabase
        .from('user_teams')
        .insert({
          user_id: currentUser.id,
          player_id: playerId,
          gameweek: 1,
          created_at: new Date().toISOString()
        });

      if (teamError) {
        console.error('Error updating user team:', teamError);
        // Don't fail the whole operation for this
      }

      // Determine next turn
      const { data: allUsers, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('id');

      if (usersError) {
        console.error('Error fetching users for next turn:', usersError);
        throw new Error('Failed to determine next turn');
      }

      const currentUserIndex = allUsers.findIndex(u => u.id === currentUser.id);
      const nextUserIndex = (currentUserIndex + 1) % allUsers.length;
      const nextUserId = allUsers[nextUserIndex].id;

      // Check if draft is complete (all users have 5 players)
      const { data: allPicks, error: allPicksError } = await supabase
        .from('draft_picks')
        .select('user_id');

      if (allPicksError) {
        console.error('Error checking draft completion:', allPicksError);
        throw new Error('Failed to check draft completion');
      }

      const userPickCounts = {};

      allPicks.forEach(pick => {
        userPickCounts[pick.user_id] = (userPickCounts[pick.user_id] || 0) + 1;
      });

      const allUsersHave5Players = allUsers.every(user => userPickCounts[user.id] >= 5);

      // Update draft status
      const updateData = {
        current_turn: allUsersHave5Players ? null : nextUserId,
        is_draft_complete: allUsersHave5Players,
        is_draft_active: !allUsersHave5Players
      };

      const { error: statusError } = await supabase
        .from('draft_status')
        .update(updateData)
        .eq('id', 1);

      if (statusError) {
        console.error('Error updating draft status:', statusError);
        throw new Error('Failed to update draft status');
      }

      console.log('✅ Player drafted successfully');
      await fetchDraftData();

      if (allUsersHave5Players) {
        alert('🎉 Draft Complete! All users now have 5 players each.');
      } else {
        alert(`✅ Player drafted! Next turn: ${allUsers[nextUserIndex].email}`);
      }

      return { success: true };
    } catch (err) {
      console.error('Error drafting player:', err);
      throw new Error(err.message || 'Failed to draft player');
    }
  };

  if (!currentUser) {
    if (showForgotPassword) {
      return <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />;
    }
    return (
      <AuthForm
        error={error}
        onForgotPassword={() => setShowForgotPassword(true)}
        onLogin={() => {}}
      />
    );
  }

  // Check if profile is complete
  if (!profileComplete && !checkingProfile) {
    return (
      <ProfileCompletion
        currentUser={currentUser}
        onProfileComplete={handleProfileComplete}
      />
    );
  }

  if (checkingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center justify-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Checking profile completion...</span>
        </div>
      </div>
    );
  }

  if (loading && !draftStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center justify-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Loading Chelsea Draft League...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Chelsea Next Game */}
      <ChelseaNextGame />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3" style={{ color: '#034694' }}>
            <Shield className="w-8 h-8" style={{ color: '#034694' }} />
            <span>KPG's Competition</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome
            {' '}
            {currentUser.email}
            ! Pick your 5-a-side Chelsea team for the annual competition.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(() => {
            const baseTabs = ['team-management', 'stats', 'profile'];
            // Add admin-only tab
            if (currentUser?.isAdmin) {
              baseTabs.push('admin');
            }
            return baseTabs;
          })().map((tab) => (
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab ?
                  'border-blue-500 text-blue-600' :
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              key={tab}
              onClick={() => setSelectedTab(tab)}
            >
              {tab === 'team-management' && '⚽ My Team'}
              {tab === 'stats' && '📊 Stats'}
              {tab === 'profile' && '👤 Profile & Settings'}
              {tab === 'admin' && '👑 Admin'}
            </button>
          ))}
        </nav>

        {/* Admin Status Indicator */}
        {currentUser && (
          <div className="mt-2 text-sm">
            {currentUser.isAdmin ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                👑 Admin:
                {' '}
                {currentUser.email}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                👤 User:
                {' '}
                {currentUser.email}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {selectedTab === 'team-management' && (
        <UserTeamManagement currentUser={currentUser} />
      )}

      {selectedTab === 'admin' && (
        <AdminDashboard currentUser={currentUser} />
      )}

      {selectedTab === 'stats' && (
        <StatsTab
          chelseaPlayers={chelseaPlayers}
          currentUser={currentUser}
          draftStatus={draftStatus}
          liveScores={liveScores}
        />
      )}

      {selectedTab === 'profile' && (
        <div className="space-y-8">
          <ProfileManagerClean
            onProfileUpdate={fetchDraftData}
            userId={currentUser?.id}
          />
          <NotificationPreferences currentUser={currentUser} />
        </div>
      )}

      {selectedTab === 'draft-queue' && (
        <div className="mt-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="mr-3 h-8 w-8" />
              Draft Queue Management
            </h2>
            <p className="text-gray-600 mt-2">
              Manage sequential draft turns and notifications
            </p>
          </div>

          <DraftQueue currentUser={currentUser} onDraftUpdate={fetchDraftData} />
        </div>
      )}
    </div>
  );
}

// Smaller components that can stay in the same file
function StatsTab({ liveScores, draftStatus, currentUser, chelseaPlayers }) {
  const [activeStatsTab, setActiveStatsTab] = useState('leaderboard');
  const [simulationLeaderboard, setSimulationLeaderboard] = useState([]);

  // Fetch simulation data when in simulation mode
  const fetchSimulationData = useCallback(async() => {
    try {
      const response = await fetch('/api/simulation?action=leaderboard');
      const data = await response.json();

      if (data.success) {
        setSimulationLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('Failed to fetch simulation data:', err);
    }
  }, []);

  useEffect(() => {
    if (draftStatus?.simulationMode) {
      fetchSimulationData();
    }
  }, [draftStatus?.simulationMode, fetchSimulationData]);

  return (
    <div className="space-y-6">
      <div className="flex space-x-4">
        <button
          className={`px-4 py-2 rounded-lg ${
            activeStatsTab === 'leaderboard' ?
              'bg-blue-600 text-white' :
              'bg-gray-200 text-gray-700'
          }`}
          onClick={() => setActiveStatsTab('leaderboard')}
        >
          Leaderboard
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            activeStatsTab === 'player-stats' ?
              'bg-blue-600 text-white' :
              'bg-gray-200 text-gray-700'
          }`}
          onClick={() => setActiveStatsTab('player-stats')}
        >
          Player Stats
        </button>
      </div>

      {activeStatsTab === 'leaderboard' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current Leaderboard</h2>
          <div className="space-y-3">
            {simulationLeaderboard.map((user, index) => (
              <div
                key={user.userId}
                className={`p-4 rounded-lg flex items-center justify-between ${
                  user.userId === currentUser?.id ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
                }`}
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
                    <div className="font-medium">{user.username}</div>
                    <div className="text-sm text-gray-600">
                      {user.gameweeksPlayed || 0}
                      {' '}
                      gameweeks played
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {user.totalPoints || 0}
                  </div>
                  <div className="text-sm text-gray-600">total points</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeStatsTab === 'player-stats' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Player Statistics</h2>
          <PlayerStats players={chelseaPlayers} />
        </div>
      )}
    </div>
  );
}

export default Draft;

