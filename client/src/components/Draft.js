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
import ProfileManager from './ProfileManager';
import UserActivity from './UserActivity.js';
import UserTeamManagement from './UserTeamManagement';
import AdminDashboard from './AdminDashboard';
import DraftQueue from './DraftQueue.js';
import ForgotPassword from './ForgotPassword.js';
import ProfileCompletion from './ProfileCompletion.js';
import AuthForm from './AuthForm.js';
import FPLDataSync from './FPLDataSync.js';
import TeamAssignment from './TeamAssignment.js';
import AdminPlayerAllocation from './AdminPlayerAllocation.js';
import NotificationPreferences from './NotificationPreferences.js';

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

  // No API connection test needed - using Supabase directly

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

  // Smart sync removed - not needed for current functionality
  // The app works fine without this sync call

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
        .select('*')
;

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
            const baseTabs = ['team-management', 'stats', 'profile', 'notifications'];
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
              {tab === 'profile' && '👤 Profile'}
              {tab === 'notifications' && '🔔 Notifications'}
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
        <ProfileManager
          onProfileUpdate={fetchDraftData}
          userId={currentUser?.id}
        />
      )}

      {selectedTab === 'notifications' && (
        <NotificationPreferences currentUser={currentUser} />
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

      {selectedTab === 'user-activity' && currentUser?.isAdmin && (
        <div className="mt-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Activity className="mr-3 h-8 w-8" />
              Admin Dashboard
            </h2>
            <p className="text-gray-600 mt-2">
              Admin tools and user activity monitoring
            </p>
          </div>

          {/* FPL Data Sync */}
          <div className="mb-8">
            <FPLDataSync />
          </div>

          {/* User Activity */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity</h3>
            {currentUser ? (
              <UserActivity isAdmin={currentUser.isAdmin} userId={currentUser.id} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Please log in to view user activity.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// LoginForm component removed - now using AuthForm

function DraftTab({ draftStatus, chelseaPlayers, currentUser, onDraftPlayer, error }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDraft = async(playerId) => {
    setDrafting(true);
    try {
      await onDraftPlayer(playerId);
      setSelectedPlayer(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setDrafting(false);
    }
  };

  const handleStartDraft = async() => {
    try {
      setLoading(true);

      // Get all active users
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('id');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        alert('Failed to fetch users');
        return;
      }

      if (users.length < 2) {
        alert('Need at least 2 users to start a draft!');
        return;
      }

      // Set first user as current turn
      const firstUserId = users[0].id;

      const { error: updateError } = await supabase
        .from('draft_status')
        .update({
          is_draft_active: true,
          current_turn: firstUserId,
          is_draft_complete: false,
          is_paused: false
        })
        .eq('id', 1);

      if (updateError) {
        console.error('Error starting draft:', updateError);
        alert('Failed to start draft');
        return;
      }

      alert(`🚀 Draft started! First turn: ${users[0].email}`);
      window.location.reload(); // Refresh to update UI
    } catch (error) {
      console.error('Error starting draft:', error);
      alert('Failed to start draft');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseDraft = async() => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('draft_status')
        .update({ is_paused: true })
        .eq('id', 1);

      if (error) {
        console.error('Error pausing draft:', error);
        alert('Failed to pause draft');
        return;
      }

      alert('⏸️ Draft paused');
      window.location.reload();
    } catch (error) {
      console.error('Error pausing draft:', error);
      alert('Failed to pause draft');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeDraft = async() => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('draft_status')
        .update({ is_paused: false })
        .eq('id', 1);

      if (error) {
        console.error('Error resuming draft:', error);
        alert('Failed to resume draft');
        return;
      }

      alert('▶️ Draft resumed');
      window.location.reload();
    } catch (error) {
      console.error('Error resuming draft:', error);
      alert('Failed to resume draft');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDraft = async() => {
    if (!window.confirm('Are you sure you want to reset the draft? This will clear all picks and start over.')) {
      return;
    }

    try {
      setLoading(true);

      // Clear all draft picks
      const { error: clearPicksError } = await supabase
        .from('draft_picks')
        .delete()
        .neq('id', 0);

      if (clearPicksError) {
        console.error('Error clearing draft picks:', clearPicksError);
      }

      // Clear user teams
      const { error: clearTeamsError } = await supabase
        .from('user_teams')
        .delete()
        .neq('id', 0);

      if (clearTeamsError) {
        console.error('Error clearing user teams:', clearTeamsError);
      }

      // Reset draft status
      const { error: resetError } = await supabase
        .from('draft_status')
        .update({
          is_draft_active: false,
          is_draft_complete: false,
          current_turn: null,
          is_paused: false
        })
        .eq('id', 1);

      if (resetError) {
        console.error('Error resetting draft status:', resetError);
        alert('Failed to reset draft status');
        return;
      }

      alert('🔄 Draft reset successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error resetting draft:', error);
      alert('Failed to reset draft');
    } finally {
      setLoading(false);
    }
  };

  const getPositionColor = (elementType) => {
    switch (elementType) {
      case 1: return 'bg-yellow-100 text-yellow-800'; // GK
      case 2: return 'bg-blue-100 text-blue-800';   // DEF
      case 3: return 'bg-green-100 text-green-800';  // MID
      case 4: return 'bg-red-100 text-red-800';     // FWD
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlayerDetails = (playerId) => {
    const player = chelseaPlayers.find(p => p.id === playerId);

    if (!player) return { name: 'Unknown Player', position: 'N/A', price: '0.0' };

    const positionMap = {
      1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD'
    };

    // Handle price as either string or number
    const priceValue = typeof player.price === 'string' ? parseFloat(player.price) : player.price;

    return {
      name: player.web_name || `${player.first_name} ${player.second_name}`,
      position: positionMap[player.element_type] || 'N/A',
      price: priceValue.toFixed(1),
      points: player.total_points || 0,
      form: player.form || '0.0',
      elementType: player.element_type
    };
  };

  const isMyTurn = draftStatus?.currentTurn === currentUser?.id;
  const myTeam = draftStatus?.users?.find(u => u.id === currentUser?.id);

  return (
    <div className="space-y-6">
      {/* Draft Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Draft Status</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {draftStatus?.users?.map((user) => (
            <div
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                selectedUser?.id === user.id ? 'border-purple-500 bg-purple-50' :
                  user.id === currentUser?.id ? 'border-blue-500 bg-blue-50' :
                    user.id === draftStatus?.currentTurn ? 'border-green-500 bg-green-50' :
                      'border-gray-200 hover:border-gray-300'
              }`}
              key={user.id}
              onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
            >
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span className="font-medium">{user.username}</span>
                {user.id === draftStatus?.currentTurn && !draftStatus?.isDraftComplete && (
                  <Clock className="w-4 h-4 text-green-600" />
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {user.teamSize}
                /5 players
              </div>
              {selectedUser?.id === user.id && (
                <div className="text-xs text-purple-600 mt-1 font-medium">
                  Click to hide team
                </div>
              )}
              {selectedUser?.id !== user.id && user.teamSize > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Click to view team
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Admin Controls */}
        {currentUser?.isAdmin && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">👑 Admin Controls</h3>
            <div className="flex flex-wrap gap-3">
              {!draftStatus?.isDraftActive && !draftStatus?.isDraftComplete && (
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  onClick={handleStartDraft}
                >
                  🚀 Start Draft
                </button>
              )}

              {draftStatus?.isDraftActive && (
                <button
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  onClick={handlePauseDraft}
                >
                  ⏸️ Pause Draft
                </button>
              )}

              {draftStatus?.isDraftActive && draftStatus?.isPaused && (
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={handleResumeDraft}
                >
                  ▶️ Resume Draft
                </button>
              )}

              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                onClick={handleResetDraft}
              >
                🔄 Reset Draft
              </button>
            </div>
          </div>
        )}

        {/* Selected User Team Details */}
        {selectedUser && selectedUser.teamSize > 0 && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900 mb-3">
              {selectedUser.username}
              's Team (
              {selectedUser.teamSize}
              /5 players)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedUser.team && selectedUser.team.map((playerId, index) => {
                const playerDetails = getPlayerDetails(playerId);

                return (
                  <div className="p-3 bg-white rounded-lg border border-gray-200" key={playerId}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{playerDetails.name}</div>
                        <div className="text-sm text-gray-600">
                          {playerDetails.position}
                          {' '}
                          - £
                          {playerDetails.price}
                          m
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {playerDetails.points}
                          {' '}
                          pts •
                          {playerDetails.form}
                          {' '}
                          form
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPositionColor(playerDetails.elementType)}`}>
                        {playerDetails.position}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedUser && selectedUser.teamSize === 0 && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-center text-gray-500">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">
                {selectedUser.username}
                {' '}
                hasn't selected any players yet
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-4">
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              draftStatus?.isDraftComplete ?
                'bg-green-100 text-green-800' :
                'bg-blue-100 text-blue-800'
            }`}
          >
            {draftStatus?.isDraftComplete ? (
              <>
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Draft Complete
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 inline mr-1" />
                {isMyTurn ? 'Your Turn!' : `${draftStatus?.currentTurn ? `User${draftStatus.currentTurn}'s` : 'Unknown'} Turn`}
              </>
            )}
          </div>

          <div className="text-sm text-gray-600">
            {draftStatus?.draftedCount || 0}
            {' '}
            /
            {draftStatus?.totalPicks || 20}
            {' '}
            picks made
          </div>
        </div>
      </div>

      {/* Team Formation Rules */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Formation Rules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Defenders (Max 2)</h3>
            <div className="space-y-1 text-sm text-blue-700">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-yellow-400 rounded-full" />
                <span>Goalkeepers (GK)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-blue-400 rounded-full" />
                <span>Defenders (DEF)</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Attackers (Max 3)</h3>
            <div className="space-y-1 text-sm text-green-700">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-green-400 rounded-full" />
                <span>Midfielders (MID)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-red-400 rounded-full" />
                <span>Forwards (FWD)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Players */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Chelsea Players</h2>

        {myTeam?.teamSize >= 5 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="text-lg font-medium">Your team is complete!</p>
            <p className="text-sm">You have selected all 5 players.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Defenders Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <span className="w-4 h-4 bg-blue-500 rounded-full" />
                <span>Defenders (GK/DEF) - Max 2</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chelseaPlayers
                  .filter(player => player.element_type === 1 || player.element_type === 2)
                  .map((player) => (
                    <PlayerCard
                      canDraft={isMyTurn && !draftStatus?.isDraftComplete}
                      getPositionColor={getPositionColor}
                      isDrafting={drafting}
                      isSelected={selectedPlayer?.id === player.id}
                      key={player.id}
                      onDraft={() => handleDraft(player.id)}
                      onSelect={() => setSelectedPlayer(player)}
                      player={player}
                    />
                  ))}
              </div>
            </div>

            {/* Attackers Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <span className="w-4 h-4 bg-green-500 rounded-full" />
                <span>Attackers (MID/FWD) - Max 3</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chelseaPlayers
                  .filter(player => player.element_type === 3 || player.element_type === 4)
                  .map((player) => (
                    <PlayerCard
                      canDraft={isMyTurn && !draftStatus?.isDraftComplete}
                      getPositionColor={getPositionColor}
                      isDrafting={drafting}
                      isSelected={selectedPlayer?.id === player.id}
                      key={player.id}
                      onDraft={() => handleDraft(player.id)}
                      onSelect={() => setSelectedPlayer(player)}
                      player={player}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}

        {chelseaPlayers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No Chelsea players available for drafting</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerCard({ player, onSelect, onDraft, isSelected, canDraft, isDrafting, getPositionColor }) {
  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{player.web_name}</h3>
          <p className="text-sm text-gray-600">
            {player.first_name}
            {' '}
            {player.second_name}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${getPositionColor(player.element_type)}`}>
          {player.position_short}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex justify-between">
          <span>Price:</span>
          <span className="font-medium">
            £
            {(player.now_cost / 10).toFixed(1)}
            m
          </span>
        </div>
        <div className="flex justify-between">
          <span>Points:</span>
          <span className="font-medium">{player.total_points || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Form:</span>
          <span className="font-medium">{player.form || '0.0'}</span>
        </div>
        <div className="flex justify-between">
          <span>Goals:</span>
          <span className="font-medium">{player.goals_scored || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Assists:</span>
          <span className="font-medium">{player.assists || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Minutes:</span>
          <span className="font-medium">{player.minutes || 0}</span>
        </div>
      </div>

      <button
        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
          canDraft ?
            'bg-blue-600 text-white hover:bg-blue-700' :
            'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
        disabled={!canDraft || isDrafting}
        onClick={(e) => {
          e.stopPropagation();
          onDraft();
        }}
      >
        {isDrafting ? (
          <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
        ) : canDraft ? (
          'Draft Player'
        ) : (
          'Not Available'
        )}
      </button>
    </div>
  );
}

function LeaderboardTab({ liveScores, draftStatus, currentUser, allPlayers }) {
  // Get helper functions from PreviewTab
  const getPositionBgColor = (elementType) => {
    switch (elementType) {
      case 1: return 'bg-yellow-500'; // GK
      case 2: return 'bg-blue-500';   // DEF
      case 3: return 'bg-green-500';  // MID
      case 4: return 'bg-red-500';    // FWD
      default: return 'bg-gray-500';
    }
  };

  const getPlayerPosition = (elementType, playerIndex = 0, totalPlayersOfType = 1) => {
    // Define row positions from bottom to top: GK -> DEF -> MID -> FWD
    const rowPositions = {
      1: '85%',  // GK at bottom
      2: '65%',  // DEF
      3: '45%',  // MID
      4: '25%'   // FWD at top
    };

    const top = rowPositions[elementType] || '50%';

    // Calculate horizontal positions to center players in each row
    let left = '50%'; // Default center position

    if (totalPlayersOfType === 1) {
      // Single player - center
      left = '50%';
    } else if (totalPlayersOfType === 2) {
      // Two players - equidistant from center
      left = playerIndex === 0 ? '35%' : '65%';
    } else if (totalPlayersOfType === 3) {
      // Three players - left, center, right
      const positions = ['25%', '50%', '75%'];

      left = positions[playerIndex] || '50%';
    } else if (totalPlayersOfType === 4) {
      // Four players - evenly spaced
      const positions = ['20%', '40%', '60%', '80%'];

      left = positions[playerIndex] || '50%';
    } else if (totalPlayersOfType === 5) {
      // Five players - all across the row
      const positions = ['15%', '30%', '50%', '70%', '85%'];

      left = positions[playerIndex] || '50%';
    }

    return {
      coordinates: { top, left },
      style: 'z-10'
    };
  };

  // Get player details helper
  const getPlayerDetails = (playerId) => {
    if (!allPlayers || allPlayers.length === 0) return null;
    return allPlayers.find(p => p.id === playerId);
  };

  if (!liveScores || !draftStatus?.users) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-400" />
        <p className="text-gray-600">Loading live scores...</p>
      </div>
    );
  }

  // Get sorted team scores for leaderboard (ensure we have data)
  const sortedTeams = liveScores.teamScores ? [...liveScores.teamScores].sort((a, b) => b.totalScore - a.totalScore) : [];

  return (
    <div className="space-y-8">
      {/* Live Leaderboard Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-dashed" style={{ borderColor: '#034694' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#034694' }}>🏆 Live Leaderboard</h2>
          <p className="text-gray-600 mb-4">KPG's Annual Chelsea Competition - Live Results</p>
          <div className="text-sm text-white rounded-full px-4 py-2 inline-block" style={{ backgroundColor: '#034694' }}>
            {draftStatus.simulationMode ? '🎮 Simulation Mode' : '📡 Live FPL Data'}
            {' '}
            - Gameweek
            {draftStatus.activeGameweek || draftStatus.currentGameweek}
          </div>
        </div>
      </div>

      {/* Podium Style Leaderboard */}
      {sortedTeams.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">🏆 Championship Podium</h3>
            <div className="text-sm text-gray-600">
              Gameweek
              {' '}
              {draftStatus.activeGameweek || draftStatus.currentGameweek}
              {' '}
              • Updated:
              {' '}
              {new Date().toLocaleTimeString()}
            </div>
          </div>

          <div className="flex items-end justify-center space-x-4 mb-8">
            {/* 4th Place - Bench (Left) */}
            {sortedTeams[3] && (
              <div className="flex flex-col items-center mr-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-lg font-bold mb-2 shadow-lg border-2 border-white overflow-hidden">
                  {(() => {
                    const user = draftStatus.users.find(u => u.username === sortedTeams[3]?.username);

                    return user?.profilePicture ? (
                      <img alt={sortedTeams[3]?.username} className="w-full h-full object-cover" src={user.profilePicture} />
                    ) : (
                      sortedTeams[3]?.username.charAt(0)
                    );
                  })()}
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{sortedTeams[3]?.username}</div>
                  <div className="text-xs text-gray-600">Participating</div>
                  <div className="text-lg font-bold text-gray-700">{sortedTeams[3]?.totalScore}</div>
                </div>
                {/* Bench graphic */}
                <div className="w-20 h-6 bg-amber-600 rounded-sm mt-2" />
                <div className="w-24 h-2 bg-amber-800 rounded-sm" />
              </div>
            )}

            {/* 2nd Place */}
            {sortedTeams[1] && (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white text-xl font-bold mb-2 relative shadow-lg border-2 border-white overflow-hidden">
                  {(() => {
                    const user = draftStatus.users.find(u => u.username === sortedTeams[1]?.username);

                    return user?.profilePicture ? (
                      <img alt={sortedTeams[1]?.username} className="w-full h-full object-cover" src={user.profilePicture} />
                    ) : (
                      sortedTeams[1]?.username.charAt(0)
                    );
                  })()}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">2</div>
                </div>
                <div className="text-center mb-4">
                  <div className="text-lg font-bold">{sortedTeams[1]?.username}</div>
                  <div className="text-2xl font-bold text-gray-600">{sortedTeams[1]?.totalScore}</div>
                  <div className="text-xs text-gray-600">🥈 Silver Medal</div>
                </div>
                {/* Silver podium */}
                <div className="w-24 h-20 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg flex items-center justify-center">
                  <span className="text-white font-bold">2nd</span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {sortedTeams[0] && (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-white text-2xl font-bold mb-2 relative animate-pulse shadow-xl border-4 border-yellow-200 overflow-hidden">
                  {(() => {
                    const user = draftStatus.users.find(u => u.username === sortedTeams[0]?.username);

                    return user?.profilePicture ? (
                      <img alt={sortedTeams[0]?.username} className="w-full h-full object-cover" src={user.profilePicture} />
                    ) : (
                      sortedTeams[0]?.username.charAt(0)
                    );
                  })()}
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg">👑</div>
                </div>
                <div className="text-center mb-4">
                  <div className="text-xl font-bold text-yellow-600">{sortedTeams[0]?.username}</div>
                  <div className="text-3xl font-bold text-yellow-600">{sortedTeams[0]?.totalScore}</div>
                  <div className="text-sm text-yellow-600">🏆 Champion!</div>
                </div>
                {/* Gold podium */}
                <div className="w-28 h-28 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">1st</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {sortedTeams[2] && (
              <div className="flex flex-col items-center">
                <div className="w-18 h-18 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-lg font-bold mb-2 relative shadow-lg border-2 border-white overflow-hidden">
                  {(() => {
                    const user = draftStatus.users.find(u => u.username === sortedTeams[2]?.username);

                    return user?.profilePicture ? (
                      <img alt={sortedTeams[2]?.username} className="w-full h-full object-cover" src={user.profilePicture} />
                    ) : (
                      sortedTeams[2]?.username.charAt(0)
                    );
                  })()}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">3</div>
                </div>
                <div className="text-center mb-4">
                  <div className="text-base font-bold">{sortedTeams[2]?.username}</div>
                  <div className="text-xl font-bold text-amber-600">{sortedTeams[2]?.totalScore}</div>
                  <div className="text-xs text-gray-600">🥉 Bronze Medal</div>
                </div>
                {/* Bronze podium */}
                <div className="w-20 h-16 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg flex items-center justify-center">
                  <span className="text-white font-bold">3rd</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Formations - Mini Pitches with Live Data */}
      {draftStatus.users && draftStatus.users.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6" style={{ color: '#034694' }}>⚽ Live Team Formations - 5-a-Side Pitches</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {draftStatus.users.map((user) => {
              const teamScore = sortedTeams.find(t => t.userId === user.id || t.username === user.username);
              const userTeamPlayers = user.team ? user.team.map(playerId => getPlayerDetails(playerId)).filter(Boolean) : [];

              return (
                <div
                  className={`relative ${
                    user.id === currentUser?.id ? 'ring-2' : ''
                  }`}
                  key={user.id}
                  style={user.id === currentUser?.id ? { ringColor: '#034694' } : {}}
                >
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-lg font-bold text-white shadow-lg border-2 border-white overflow-hidden">
                        {user.profilePicture ? (
                          <img alt={user.username} className="w-full h-full object-cover" src={user.profilePicture} />
                        ) : (
                          user.username.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {user.username}
                          's Team
                        </h4>
                        <span className="text-sm text-gray-600">
                          {userTeamPlayers.length}
                          /5 players
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mini Football Pitch */}
                  <div className="relative bg-gradient-to-b from-green-400 to-green-500 rounded-lg p-4 h-80 border-4 border-white shadow-lg overflow-hidden">
                    {/* Pitch markings */}
                    <div className="absolute inset-2 border-2 border-white rounded opacity-60" />
                    <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-white opacity-60" />
                    <div className="absolute top-1/2 left-1/2 w-4 h-4 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-60" />

                    {/* Goal areas */}
                    <div className="absolute top-2 left-1/2 w-16 h-6 border-2 border-white border-t-0 transform -translate-x-1/2 opacity-60" />
                    <div className="absolute bottom-2 left-1/2 w-16 h-6 border-2 border-white border-b-0 transform -translate-x-1/2 opacity-60" />

                    {/* Players positioned on pitch */}
                    <div className="relative h-full">
                      {userTeamPlayers.map((player, playerIndex) => {
                        if (!player) return null;
                        // Count players of the same position type
                        const samePositionPlayers = userTeamPlayers.filter(p => p && p.element_type === player.element_type);
                        const positionIndex = samePositionPlayers.findIndex(p => p && p.id === player.id);
                        const totalPlayersOfType = samePositionPlayers.length;
                        const position = getPlayerPosition(player.element_type, positionIndex, totalPlayersOfType);
                        const playerScore = teamScore?.playerScores?.find(ps => ps.playerId === player.id);

                        return (
                          <div
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${position.style} group`}
                            key={player.id}
                            style={position.coordinates}
                          >
                            {/* Player card */}
                            <div className={`w-16 h-16 rounded-full border-2 border-white shadow-lg flex flex-col items-center justify-center text-white text-xs font-bold ${getPositionBgColor(player.element_type)} hover:scale-105 transition-transform cursor-pointer`}>
                              <div className="truncate max-w-full px-1 text-center text-xs">{player.web_name}</div>
                              <div className="text-xs opacity-90">{playerScore?.points || player.total_points || 0}</div>
                            </div>

                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                              <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg min-w-48">
                                <div className="font-bold text-center mb-2">
                                  {player.first_name}
                                  {' '}
                                  {player.second_name}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span>Position:</span>
                                    <span className="font-medium">{player.position_short}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Points:</span>
                                    <span className="font-medium">{player.total_points || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Current GW:</span>
                                    <span className="font-medium">{playerScore?.points || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Form:</span>
                                    <span className="font-medium">{player.form || 'N/A'}</span>
                                  </div>
                                </div>
                                {/* Arrow pointing down */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Team Summary Below Pitch */}
                  <div className="mt-4 bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold" style={{ color: '#034694' }}>
                      {teamScore?.totalScore || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Points</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatsTab({ liveScores, draftStatus, currentUser, chelseaPlayers }) {
  const [activeStatsTab, setActiveStatsTab] = useState('leaderboard');
  const [simulationLeaderboard, setSimulationLeaderboard] = useState([]);

  // Fetch simulation data when in simulation mode
  const fetchSimulationData = useCallback(async() => {
    try {
      // TODO: Implement simulation data fetching with Supabase
      console.log('Simulation data fetch requested for user:', currentUser?.id);
      setSimulationLeaderboard([]);
    } catch (error) {
      console.error('Failed to fetch simulation data for stats:', error);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (draftStatus?.simulationMode) {
      fetchSimulationData();
    }
  }, [draftStatus?.simulationMode, draftStatus?.currentGameweek, draftStatus?.activeGameweek, fetchSimulationData]);

  return (
    <div className="space-y-6">
      {/* Stats Navigation */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ color: '#034694' }}>📊 Competition Statistics</h2>
          {draftStatus?.simulationMode && (
            <button
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              onClick={fetchSimulationData}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Stats</span>
            </button>
          )}
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {['leaderboard', 'players'].map((tab) => (
              <button
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeStatsTab === tab ?
                    'border-blue-500 text-blue-600' :
                    'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                key={tab}
                onClick={() => setActiveStatsTab(tab)}
              >
                {tab === 'leaderboard' && '🏆 Live Leaderboard'}
                {tab === 'players' && '👥 All Players'}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Stats Content */}
      {activeStatsTab === 'leaderboard' && (
        <LeaderboardTab
          allPlayers={chelseaPlayers}
          currentUser={currentUser}
          draftStatus={draftStatus}
          liveScores={draftStatus?.simulationMode ? {
            teamScores: simulationLeaderboard.map(user => ({
              userId: user.userId,
              username: user.username,
              totalScore: user.totalPoints,
              playerScores: [],
              teamSize: 5
            }))
          } : liveScores}
        />
      )}

      {activeStatsTab === 'players' && (
        <PlayerStats />
      )}
    </div>
  );
}

// PreviewTab removed - functionality moved to Stats tab

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
        // If users table doesn't exist or has issues, use empty array
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
              ��
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

function TeamManagementTab({ currentUser, draftStatus, onRefresh }) {
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedTeamPlayers, setSelectedTeamPlayers] = useState([]);
  const [benchedPlayer, setBenchedPlayer] = useState(null);
  const [captain, setCaptain] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);

  // Chips-related state
  const [activeManagementTab, setActiveManagementTab] = useState('lineup');

  // Define myTeam safely with null check
  const myTeam = draftStatus?.users?.find(u => u.id === currentUser?.id);
  const availableChips = myTeam?.chips || [];
  const usedChips = myTeam?.usedChips || [];
  const currentGameweek = draftStatus?.activeGameweek || draftStatus?.currentGameweek || 1;

  // State for user teams from database
  const [userTeamPlayers, setUserTeamPlayers] = useState([]);

  useEffect(() => {
    if (myTeam) {
      setSelectedTeamPlayers(myTeam.activePlayers || []);
      setBenchedPlayer(myTeam.benchedPlayer);
      setCaptain(myTeam.captain);
    }
  }, [myTeam]);

  useEffect(() => {
    if (draftStatus) {
      fetchAvailablePlayers();
      fetchAllPlayers();
      fetchUserTeam();
    }
  }, [draftStatus, currentUser]);

  const fetchUserTeam = async() => {
    if (!currentUser?.id) return;

    try {
      const { data: teamData, error } = await supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Failed to fetch user team:', error);
        return;
      }

      setUserTeamPlayers(teamData || []);
    } catch (error) {
      console.error('Failed to fetch user team:', error);
    }
  };

  // Add null check for draftStatus after hooks
  if (!draftStatus) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
            <p className="text-gray-600">Loading team management data...</p>
            <p className="text-sm text-gray-500 mt-2">
              If this continues, please check that the database tables are properly set up.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fetchAvailablePlayers = async() => {
    try {
      // Fetch available players from Supabase
      const { data: playersData, error } = await supabase
        .from('chelsea_players')
        .select('*')
        .eq('is_available', true)
        .order('position', { ascending: true });

      if (error) {
        console.error('Failed to fetch available players:', error);
        return;
      }

      const transformedPlayers = playersData.map(player => ({
        id: player.id,
        name: player.name,
        position: player.position,
        price: parseFloat(player.price),
        team: player.team,
        web_name: player.web_name,
        is_available: player.is_available
      }));

      setAvailablePlayers(transformedPlayers);
    } catch (error) {
      console.error('Failed to fetch available players:', error);
    }
  };

  const fetchAllPlayers = async() => {
    try {
      // Fetch all players from Supabase
      const { data: playersData, error } = await supabase
        .from('chelsea_players')
        .select('*')
        .order('position', { ascending: true });

      if (error) {
        console.error('Failed to fetch all players:', error);
        return;
      }

      const transformedPlayers = playersData.map(player => ({
        id: player.id,
        name: player.name,
        position: player.position,
        price: parseFloat(player.price),
        team: player.team,
        web_name: player.web_name,
        is_available: player.is_available
      }));

      setAllPlayers(transformedPlayers);
    } catch (error) {
      console.error('Failed to fetch all players:', error);
    }
  };

  const getPlayerName = (playerId) => {
    const player = allPlayers.find(p => p.id === playerId);

    return player ? player.web_name : `Player ${playerId}`;
  };

  const getPlayerDetails = (playerId) => {
    const player = allPlayers.find(p => p.id === playerId);

    return player ? {
      name: player.web_name,
      position: player.position_short,
      price: (player.now_cost / 10).toFixed(1)
    } : {
      name: `Player ${playerId}`,
      position: 'UNK',
      price: '0.0'
    };
  };

  const handleTransfer = async(playerOutId, playerInId) => {
    try {
      setLoading(true);

      const response = await fetch('/api/teams?action=transfer', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          playerOutId: playerOutId,
          playerInId: playerInId,
          gameweek: currentGameweek
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Transfer successful! ${data.data.playerOut.name} → ${data.data.playerIn.name}`);
        await onRefresh();
        await fetchAvailablePlayers();
      } else {
        alert(`Transfer failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Transfer error:', error);
      alert('Transfer failed');
    } finally {
      setLoading(false);
    }
  };


  // Helper function to automatically save team changes
  const autoSaveTeam = async(newActivePlayers, newBenchedPlayer, newCaptain) => {
    try {
      const response = await fetch('/api/teams?action=save', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          activePlayers: newActivePlayers,
          benchedPlayer: newBenchedPlayer,
          captain: newCaptain,
          gameweek: currentGameweek
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save team');
      }

      console.log('✅ Team saved successfully');
      await onRefresh();
    } catch (error) {
      console.error('Failed to auto-save team:', error);
      // Don't show alert for auto-save failures to avoid spam
    }
  };

  const togglePlayerSelection = async(playerId) => {
    let newActivePlayers; let newBenchedPlayer; let newCaptain;

    if (selectedTeamPlayers.includes(playerId)) {
      newActivePlayers = selectedTeamPlayers.filter(id => id !== playerId);
      newBenchedPlayer = benchedPlayer;
      newCaptain = captain === playerId ? null : captain;

      setSelectedTeamPlayers(newActivePlayers);
      if (captain === playerId) setCaptain(null);
    } else if (selectedTeamPlayers.length < 4) {
      newActivePlayers = [...selectedTeamPlayers, playerId];
      newBenchedPlayer = benchedPlayer;
      newCaptain = captain;

      setSelectedTeamPlayers(newActivePlayers);
    }

    // Auto-save if we have valid team composition
    if (newActivePlayers && newActivePlayers.length === 4 && newBenchedPlayer && newCaptain) {
      await autoSaveTeam(newActivePlayers, newBenchedPlayer, newCaptain);
    }
  };

  // Helper function to handle bench changes with auto-save
  const handleBenchChange = async(playerId) => {
    const newBenchedPlayer = benchedPlayer === playerId ? null : playerId;

    setBenchedPlayer(newBenchedPlayer);

    // Auto-save if we have valid team composition
    if (selectedTeamPlayers.length === 4 && captain) {
      await autoSaveTeam(selectedTeamPlayers, newBenchedPlayer, captain);
    }
  };

  // Helper function to handle captain changes with auto-save
  const handleCaptainChange = async(playerId) => {
    const newCaptain = captain === playerId ? null : playerId;

    setCaptain(newCaptain);

    // Auto-save if we have valid team composition
    if (selectedTeamPlayers.length === 4 && benchedPlayer) {
      await autoSaveTeam(selectedTeamPlayers, benchedPlayer, newCaptain);
    }
  };

  const handleUseChip = async(chipId, chipName) => {
    let targetUserId = null;

    // For chips that require targets
    if (['Point Vampire', 'Captain Chaos', 'Transfer Hijack', 'Injury Report'].includes(chipName)) {
      const otherUsers = draftStatus?.users?.filter(u => u.id !== currentUser.id) || [];

      if (otherUsers.length === 0) {
        alert('No other users to target');
        return;
      }

      const userNames = otherUsers.map(u => u.username);
      const targetName = prompt(`Select target user:\n${userNames.join(', ')}`);
      const targetUser = otherUsers.find(u => u.username === targetName);

      if (!targetUser) {
        alert('Invalid target user');
        return;
      }

      targetUserId = targetUser.id;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/chips?action=use', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          chipId: chipId,
          chipName: chipName,
          targetUserId: targetUserId,
          gameweek: currentGameweek
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`${chipName} used successfully!`);
        await onRefresh();
      } else {
        alert(`Failed to use chip: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to use chip');
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'COMMON': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'RARE': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'EPIC': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'LEGENDARY': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Management Navigation */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ color: '#034694' }}>⚽ Team Management</h2>
          <div className="text-sm text-gray-600">
            {myTeam?.team?.length || 0}
            /5 players • GW
            {currentGameweek}
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {['lineup', 'transfers', 'chips'].map((tab) => (
              <button
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeManagementTab === tab ?
                    'border-blue-500 text-blue-600' :
                    'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                key={tab}
                onClick={() => setActiveManagementTab(tab)}
              >
                {tab === 'lineup' && '👥 My Team & Lineup'}
                {tab === 'transfers' && '🔄 Transfers'}
                {tab === 'chips' && '🎮 Chips'}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Lineup Tab Content */}
      {activeManagementTab === 'lineup' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#034694' }}>⚽ Gameweek Team Selection</h3>
          <p className="text-gray-600 mb-6">Select 4 active players, 1 bench player, and choose your captain (2x points)</p>

          {userTeamPlayers?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800">
                <strong>
                  Welcome,
                  {currentUser?.username}
                  !
                </strong>
                {' '}
                This is your team of
                {userTeamPlayers.length}
                {' '}
                players.
              </p>
            </div>
          )}

          {userTeamPlayers?.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {userTeamPlayers.map((player) => {
                  const isActive = selectedTeamPlayers.includes(player.player_id);
                  const isBenched = benchedPlayer === player.player_id;
                  const isCaptain = captain === player.player_id;

                  const playerDetails = {
                    name: player.player_name,
                    position: player.position,
                    price: player.price,
                    total_points: player.total_points || 0,
                    form: player.form || '0.0',
                    goals_scored: player.goals_scored || 0,
                    assists: player.assists || 0,
                    minutes: player.minutes || 0
                  };

                  return (
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isActive ? 'border-green-500 bg-green-50' :
                          isBenched ? 'border-yellow-500 bg-yellow-50' :
                            'border-gray-200 hover:border-gray-300'
                      }`}
                      key={player.player_id}
                    >
                      <div className="text-center">
                        <div className="font-medium">{playerDetails.name}</div>
                        <div className="text-xs text-gray-500">
                          {playerDetails.position}
                          {' '}
                          - £
                          {playerDetails.price}
                          m
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {playerDetails.total_points} pts • {playerDetails.form} form
                        </div>
                        <div className="text-xs text-gray-600">
                          {playerDetails.goals_scored}G {playerDetails.assists}A • {playerDetails.minutes}min
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          {isCaptain && <Star className="w-4 h-4 inline text-yellow-500 mr-1" />}
                          {isActive && 'Active'}
                          {isBenched && 'Benched'}
                          {!isActive && !isBenched && 'Not Selected'}
                        </div>

                        <div className="mt-3 space-y-2">
                          <button
                            className={`w-full py-1 px-2 text-xs rounded ${
                              isActive ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            disabled={!isActive && selectedTeamPlayers.length >= 4}
                            onClick={() => togglePlayerSelection(player.player_id)}
                          >
                            {isActive ? 'Remove from Active' : 'Add to Active'}
                          </button>

                          <button
                            className={`w-full py-1 px-2 text-xs rounded ${
                              isBenched ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            }`}
                            disabled={benchedPlayer && !isBenched}
                            onClick={() => handleBenchChange(player.player_id)}
                          >
                            {isBenched ? 'Remove from Bench' : 'Bench Player'}
                          </button>

                          {isActive && (
                            <button
                              className={`w-full py-1 px-2 text-xs rounded ${
                                isCaptain ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              onClick={() => handleCaptainChange(player.player_id)}
                            >
                              {isCaptain ? 'Remove Captain' : 'Make Captain'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                No team found for
                {currentUser?.username || 'current user'}
              </p>
              <p className="text-sm">Go to the 🎮 Simulation tab and click "Enter Simulation" to assign teams to all users.</p>
              {!currentUser && <p className="text-xs text-red-500 mt-2">You may need to log in first.</p>}
              {currentUser?.isAdmin && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <strong>Admin:</strong>
                    {' '}
                    As an admin, you can start the simulation and assign teams to all users.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transfers Tab Content */}
      {activeManagementTab === 'transfers' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#034694' }}>🔄 Transfer Market</h3>
          <p className="text-gray-600 mb-4">Swap players with available Chelsea players not in other teams</p>

          {/* Transfer Rotation Info */}
          {draftStatus?.currentTransferUser && (
            <div
              className={`p-4 mb-6 rounded-lg border ${
                draftStatus.currentTransferUser.id === currentUser?.id ?
                  'bg-green-50 border-green-200' :
                  'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center">
                <ArrowLeftRight className="w-5 h-5 mr-2" style={{ color: '#034694' }} />
                <div>
                  <p
                    className={`font-medium ${
                      draftStatus.currentTransferUser.id === currentUser?.id ?
                        'text-green-800' :
                        'text-gray-700'
                    }`}
                  >
                    {draftStatus.currentTransferUser.id === currentUser?.id ?
                      `🎯 It's your turn to transfer in Gameweek ${currentGameweek}!` :
                      `⏳ ${draftStatus.currentTransferUser.username}'s turn to transfer in Gameweek ${currentGameweek}`
                    }
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Transfer rotation: Portia → Yasmin → Rupert → Will (every 4 gameweeks)
                  </p>
                </div>
              </div>
            </div>
          )}

          {availablePlayers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availablePlayers.map((player) => (
                <div className="p-4 border rounded-lg" key={player.id}>
                  <div className="text-center">
                    <div className="font-medium">{player.web_name}</div>
                    <div className="text-sm text-gray-600">
                      {player.position_short}
                      {' '}
                      - £
                      {player.price}
                      m
                    </div>
                    <div className="text-xs text-gray-500">
                      {player.total_points}
                      {' '}
                      points
                    </div>

                    {myTeam?.team?.length > 0 && (
                      <div className="mt-3">
                        <select
                          className="w-full text-xs p-1 border rounded disabled:opacity-50"
                          disabled={loading || draftStatus?.currentTransferUser?.id !== currentUser?.id}
                          onChange={(e) => e.target.value && handleTransfer(parseInt(e.target.value), player.id)}
                          title={draftStatus?.currentTransferUser?.id !== currentUser?.id ?
                            `Only ${draftStatus?.currentTransferUser?.username || 'another user'} can transfer in this gameweek` :
                            'Select a player to swap'
                          }
                        >
                          <option value="">
                            {draftStatus?.currentTransferUser?.id === currentUser?.id ?
                              'Swap with...' :
                              `${draftStatus?.currentTransferUser?.username || 'Another user'}'s turn`
                            }
                          </option>
                          {draftStatus?.currentTransferUser?.id === currentUser?.id && myTeam.team.map(playerId => (
                            <option key={playerId} value={playerId}>{getPlayerName(playerId)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No available players for transfer</p>
            </div>
          )}
        </div>
      )}

      {/* Chips Tab Content */}
      {activeManagementTab === 'chips' && (
        <div className="space-y-6">
          {/* Available Chips */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#034694' }}>🎮 My Chips</h3>
              <div className="text-sm text-gray-500">
                {availableChips.length}
                {' '}
                available •
                {usedChips.length}
                {' '}
                used
              </div>
            </div>

            {availableChips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableChips.map((chip) => (
                  <div className={`p-4 border-2 rounded-lg ${getRarityColor(chip.rarity)}`} key={chip.id}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold">{chip.name}</h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-white">{chip.rarity}</span>
                    </div>
                    <p className="text-sm mb-3">{chip.description}</p>
                    <div className="text-xs text-gray-600 mb-3">
                      Received: GW
                      {chip.receivedGameweek}
                      {' '}
                      | Expires: GW
                      {chip.expiresGameweek}
                    </div>
                    <button
                      className="w-full py-2 text-white rounded-lg text-sm font-medium"
                      disabled={loading}
                      onClick={() => handleUseChip(chip.id, chip.name)}
                      style={{ backgroundColor: '#034694' }}
                    >
                      Use Chip
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No chips available. They will appear randomly during gameweeks!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Draft;
