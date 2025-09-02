import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  User, 
  Shield, 
  LogIn,
  LogOut,
  RefreshCw,
  Clock,
  CheckCircle,
  ArrowLeftRight,
  Star,
  Gift,
  Dice6,
  Play,
  RotateCcw,
  Activity
} from 'lucide-react';
// import axios from 'axios'; // Not needed - using Supabase directly
import { authService } from '../services/authService';
import { supabase } from '../config/supabase';
import PlayerStats from './PlayerStats';
import ProfileManager from './ProfileManager';
import UserActivity from './UserActivity.js';
import DraftQueue from './DraftQueue.js';
import ForgotPassword from './ForgotPassword.js';
import ProfileCompletion from './ProfileCompletion.js';
import AuthForm from './AuthForm.js';
import FPLDataSync from './FPLDataSync.js';

function Draft({ wsService }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [draftStatus, setDraftStatus] = useState(null);
  const [chelseaPlayers, setChelseaPlayers] = useState([]);
  const [liveScores, setLiveScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('team-management');
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);

  // Debug logging
  console.log('🚀 Draft component rendering');
  console.log('👤 currentUser:', currentUser);
  console.log('❌ error:', error);

  // No API connection test needed - using Supabase directly

  useEffect(() => {
    if (currentUser) {
      fetchDraftData();
      
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

  const fetchDraftData = async () => {
    try {
      setLoading(true);
      
      // Fetch draft status from Supabase
      const { data: draftStatusData, error: draftStatusError } = await supabase
        .from('draft_status')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      if (draftStatusError) {
        console.error('Failed to fetch draft status:', draftStatusError);
        throw draftStatusError;
      }

      // Fetch Chelsea players from Supabase
      const { data: playersData, error: playersError } = await supabase
        .from('chelsea_players')
        .select('*')
        .order('position', { ascending: true });

      if (playersError) {
        console.error('Failed to fetch Chelsea players:', playersError);
        throw playersError;
      }

      // Transform draft status data
      const transformedDraftStatus = {
        isActive: draftStatusData.is_active,
        currentRound: draftStatusData.current_round,
        currentPick: draftStatusData.current_pick,
        totalRounds: draftStatusData.total_rounds,
        timePerPick: draftStatusData.time_per_pick,
        isPaused: draftStatusData.is_paused,
        currentPlayer: draftStatusData.current_player_id,
        draftOrder: draftStatusData.draft_order || [],
        completedPicks: draftStatusData.completed_picks || []
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

  const handleLiveUpdate = (data) => {
    // Refresh live scores when we get updates
    if (data.type === 'liveUpdate' || data.type === 'quickLiveUpdate') {
      fetchLiveScores();
    }
  };

  const fetchLiveScores = async () => {
    try {
      // For now, we'll skip live scores until we implement that endpoint
      setLiveScores(null);
    } catch (err) {
      console.error('Failed to fetch live scores:', err);
    }
  };

  const handleLogin = async (user) => {
    try {
      // The AuthForm now handles the login and passes the user object directly
      setCurrentUser(user);
      setError(null);
      
      // Check if user profile is complete
      await checkProfileCompletion(user);
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      // Logout handled by Supabase auth service
      console.log('Logging out user:', currentUser?.username);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentUser(null);
      setDraftStatus(null);
      setChelseaPlayers([]);
      setLiveScores(null);
      setProfileComplete(false);
    }
  };

  const checkProfileCompletion = async (user) => {
    try {
      setCheckingProfile(true);
      
      // Check if user has first_name and last_name in their profile
      const isComplete = !!(user.firstName && user.lastName);
      setProfileComplete(isComplete);
    } catch (error) {
      console.error('Failed to check profile completion:', error);
      setProfileComplete(false);
    } finally {
      setCheckingProfile(false);
    }
  };

  const handleProfileComplete = (updatedUser) => {
    setCurrentUser(updatedUser);
    setProfileComplete(true);
  };

  const handleDraftPlayer = async (playerId) => {
    try {
      // TODO: Implement draft player logic with Supabase
      console.log('Drafting player:', playerId, 'for user:', currentUser.id);
      
      // For now, just refresh data
      await fetchDraftData();
      
      return { success: true };
    } catch (err) {
      throw new Error('Failed to draft player');
    }
  };



  if (!currentUser) {
    return <AuthForm onLogin={handleLogin} error={error} />;
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
          <h1 className="text-3xl font-bold flex items-center space-x-3" style={{color: '#034694'}}>
            <Shield className="w-8 h-8" style={{color: '#034694'}} />
            <span>KPG's Competition</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome {currentUser.username}! Pick your 5-a-side Chelsea team for the annual competition.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={fetchDraftData}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:opacity-90 text-white"
            style={{backgroundColor: '#034694'}}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
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
            const baseTabs = ['simulation', 'draft', 'team-management', 'stats', 'profile'];
            // Add admin-only tab
            if (currentUser?.isAdmin) {
              baseTabs.push('user-activity');
            }
            return baseTabs;
          })().map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'simulation' && '🎲 Simulation'}
              {tab === 'draft' && 'Player Draft'}
              {tab === 'team-management' && '⚽ Team Management'}
              {tab === 'stats' && '📊 Stats'}
              {tab === 'profile' && '👤 Profile'}
              {tab === 'user-activity' && '📊 User Activity'}
            </button>
          ))}
        </nav>
        
        {/* Admin Status Indicator */}
        {currentUser && (
          <div className="mt-2 text-sm">
            {currentUser.isAdmin ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                👑 Admin: {currentUser.username}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                👤 User: {currentUser.username}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {selectedTab === 'simulation' && (
        <SimulationTab 
          currentUser={currentUser}
          draftStatus={draftStatus}
          onRefresh={fetchDraftData}
        />
      )}
      
      {selectedTab === 'draft' && (
        <DraftTab 
          draftStatus={draftStatus}
          chelseaPlayers={chelseaPlayers}
          currentUser={currentUser}
          onDraftPlayer={handleDraftPlayer}
          error={error}
        />
      )}
      
      {selectedTab === 'team-management' && (
        <TeamManagementTab 
          currentUser={currentUser}
          draftStatus={draftStatus}
          onRefresh={fetchDraftData}
        />
      )}
      
      {selectedTab === 'stats' && (
        <StatsTab 
          liveScores={liveScores}
          draftStatus={draftStatus}
          currentUser={currentUser}
          chelseaPlayers={chelseaPlayers}
        />
      )}
      
      {selectedTab === 'profile' && (
        <ProfileManager 
          userId={currentUser?.id}
          onProfileUpdate={fetchDraftData}
        />
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
            <UserActivity userId={currentUser.id} isAdmin={true} />
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

  const handleDraft = async (playerId) => {
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
              key={user.id} 
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                selectedUser?.id === user.id ? 'border-purple-500 bg-purple-50' :
                user.id === currentUser?.id ? 'border-blue-500 bg-blue-50' :
                user.id === draftStatus?.currentTurn ? 'border-green-500 bg-green-50' :
                'border-gray-200 hover:border-gray-300'
              }`}
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
                {user.teamSize}/5 players
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

        {/* Selected User Team Details */}
        {selectedUser && selectedUser.teamSize > 0 && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900 mb-3">
              {selectedUser.username}'s Team ({selectedUser.teamSize}/5 players)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedUser.team && selectedUser.team.map((playerId, index) => {
                const playerDetails = getPlayerDetails(playerId);
                return (
                  <div key={playerId} className="p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{playerDetails.name}</div>
                        <div className="text-sm text-gray-600">{playerDetails.position} - £{playerDetails.price}m</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {playerDetails.points} pts • {playerDetails.form} form
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
              <p className="font-medium">{selectedUser.username} hasn't selected any players yet</p>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            draftStatus?.isDraftComplete 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {draftStatus?.isDraftComplete ? (
              <>
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Draft Complete
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 inline mr-1" />
                {isMyTurn ? "Your Turn!" : `${draftStatus?.currentTurn ? `User${draftStatus.currentTurn}'s` : "Unknown"} Turn`}
              </>
            )}
          </div>
          
          <div className="text-sm text-gray-600">
            {draftStatus?.draftedCount || 0} / {draftStatus?.totalPicks || 20} picks made
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
                <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                <span>Goalkeepers (GK)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                <span>Defenders (DEF)</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Attackers (Max 3)</h3>
            <div className="space-y-1 text-sm text-green-700">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                <span>Midfielders (MID)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-red-400 rounded-full"></span>
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
                <span className="w-4 h-4 bg-blue-500 rounded-full"></span>
                <span>Defenders (GK/DEF) - Max 2</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chelseaPlayers
                  .filter(player => player.element_type === 1 || player.element_type === 2)
                  .map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onSelect={() => setSelectedPlayer(player)}
                      onDraft={() => handleDraft(player.id)}
                      isSelected={selectedPlayer?.id === player.id}
                      canDraft={isMyTurn && !draftStatus?.isDraftComplete}
                      isDrafting={drafting}
                      getPositionColor={getPositionColor}
                    />
                  ))}
              </div>
            </div>

            {/* Attackers Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                <span>Attackers (MID/FWD) - Max 3</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chelseaPlayers
                  .filter(player => player.element_type === 3 || player.element_type === 4)
                  .map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onSelect={() => setSelectedPlayer(player)}
                      onDraft={() => handleDraft(player.id)}
                      isSelected={selectedPlayer?.id === player.id}
                      canDraft={isMyTurn && !draftStatus?.isDraftComplete}
                      isDrafting={drafting}
                      getPositionColor={getPositionColor}
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
    <div className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    }`} onClick={onSelect}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{player.web_name}</h3>
          <p className="text-sm text-gray-600">{player.first_name} {player.second_name}</p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${getPositionColor(player.element_type)}`}>
          {player.position_short}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex justify-between">
          <span>Price:</span>
          <span className="font-medium">£{player.price}m</span>
        </div>
        <div className="flex justify-between">
          <span>Points:</span>
          <span className="font-medium">{player.total_points}</span>
        </div>
        <div className="flex justify-between">
          <span>Form:</span>
          <span className="font-medium">{player.form || '0.0'}</span>
        </div>
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDraft();
        }}
        disabled={!canDraft || isDrafting}
        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
          canDraft 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
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
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-dashed" style={{borderColor: '#034694'}}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2" style={{color: '#034694'}}>🏆 Live Leaderboard</h2>
          <p className="text-gray-600 mb-4">KPG's Annual Chelsea Competition - Live Results</p>
          <div className="text-sm text-white rounded-full px-4 py-2 inline-block" style={{backgroundColor: '#034694'}}>
            {draftStatus.simulationMode ? '🎮 Simulation Mode' : '📡 Live FPL Data'} - Gameweek {draftStatus.activeGameweek || draftStatus.currentGameweek}
          </div>
        </div>
      </div>

      {/* Podium Style Leaderboard */}
      {sortedTeams.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">🏆 Championship Podium</h3>
            <div className="text-sm text-gray-600">
              Gameweek {draftStatus.activeGameweek || draftStatus.currentGameweek} • Updated: {new Date().toLocaleTimeString()}
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
                      <img src={user.profilePicture} alt={sortedTeams[3]?.username} className="w-full h-full object-cover" />
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
                <div className="w-20 h-6 bg-amber-600 rounded-sm mt-2"></div>
                <div className="w-24 h-2 bg-amber-800 rounded-sm"></div>
              </div>
            )}
            
            {/* 2nd Place */}
            {sortedTeams[1] && (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white text-xl font-bold mb-2 relative shadow-lg border-2 border-white overflow-hidden">
                  {(() => {
                    const user = draftStatus.users.find(u => u.username === sortedTeams[1]?.username);
                    return user?.profilePicture ? (
                      <img src={user.profilePicture} alt={sortedTeams[1]?.username} className="w-full h-full object-cover" />
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
                      <img src={user.profilePicture} alt={sortedTeams[0]?.username} className="w-full h-full object-cover" />
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
                      <img src={user.profilePicture} alt={sortedTeams[2]?.username} className="w-full h-full object-cover" />
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
          <h3 className="text-xl font-semibold mb-6" style={{color: '#034694'}}>⚽ Live Team Formations - 5-a-Side Pitches</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {draftStatus.users.map((user) => {
              const teamScore = sortedTeams.find(t => t.userId === user.id || t.username === user.username);
              const userTeamPlayers = user.team ? user.team.map(playerId => getPlayerDetails(playerId)).filter(Boolean) : [];
              
              return (
                <div key={user.id} className={`relative ${
                  user.id === currentUser?.id ? 'ring-2' : ''
                }`}
                style={user.id === currentUser?.id ? {ringColor: '#034694'} : {}}>
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-lg font-bold text-white shadow-lg border-2 border-white overflow-hidden">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          user.username.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{user.username}'s Team</h4>
                        <span className="text-sm text-gray-600">{userTeamPlayers.length}/5 players</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mini Football Pitch */}
                  <div className="relative bg-gradient-to-b from-green-400 to-green-500 rounded-lg p-4 h-80 border-4 border-white shadow-lg overflow-hidden">
                    {/* Pitch markings */}
                    <div className="absolute inset-2 border-2 border-white rounded opacity-60"></div>
                    <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-white opacity-60"></div>
                    <div className="absolute top-1/2 left-1/2 w-4 h-4 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-60"></div>
                    
                    {/* Goal areas */}
                    <div className="absolute top-2 left-1/2 w-16 h-6 border-2 border-white border-t-0 transform -translate-x-1/2 opacity-60"></div>
                    <div className="absolute bottom-2 left-1/2 w-16 h-6 border-2 border-white border-b-0 transform -translate-x-1/2 opacity-60"></div>
                    
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
                            key={player.id}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${position.style} group`}
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
                                <div className="font-bold text-center mb-2">{player.first_name} {player.second_name}</div>
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
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Team Summary Below Pitch */}
                  <div className="mt-4 bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold" style={{color: '#034694'}}>
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
  const fetchSimulationData = useCallback(async () => {
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
          <h2 className="text-xl font-semibold" style={{color: '#034694'}}>📊 Competition Statistics</h2>
          {draftStatus?.simulationMode && (
            <button
              onClick={fetchSimulationData}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
                key={tab}
                onClick={() => setActiveStatsTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeStatsTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
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
          liveScores={draftStatus?.simulationMode ? { 
            teamScores: simulationLeaderboard.map(user => ({
              userId: user.userId,
              username: user.username,
              totalScore: user.totalPoints,
              playerScores: [],
              teamSize: 5
            }))
          } : liveScores}
          draftStatus={draftStatus}
          currentUser={currentUser}
          allPlayers={chelseaPlayers}
        />
      )}
      
      {activeStatsTab === 'players' && (
        <PlayerStats />
      )}
    </div>
  );
}

// PreviewTab removed - functionality moved to Stats tab

function SimulationTab({ currentUser, draftStatus, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameweekHistory, setGameweekHistory] = useState([]);
  const [simulationMode, setSimulationMode] = useState(false);
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

  const fetchSimulationData = useCallback(async () => {
    try {
      // TODO: Implement simulation data fetching with Supabase
      console.log('Simulation data fetch requested for user:', currentUser?.id);
      setSimulationData(null);
      setGameweekHistory([]);
    } catch (error) {
      console.error('Failed to fetch simulation data:', error);
    }
  }, [currentUser?.id]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      // TODO: Implement leaderboard fetching with Supabase
      console.log('Leaderboard fetch requested for user:', currentUser?.id);
      setLeaderboard([]);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchLeaderboard();
    fetchSimulationData();
    // Set simulation mode from draft status
    setSimulationMode(draftStatus?.simulationMode || false);
  }, [draftStatus?.simulationMode, fetchLeaderboard, fetchSimulationData]);

  const handleRandomizeTeams = async () => {
    try {
      setLoading(true);
      // TODO: Implement team randomization with Supabase
      console.log('Randomize teams requested for user:', currentUser?.id);
      await onRefresh();
      await fetchSimulationData();
      alert('Teams randomized successfully! Each user now has a balanced 5-player team.');
    } catch (error) {
      alert('Failed to randomize teams');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateGameweek = async () => {
    try {
      setLoading(true);
      const currentGameweek = draftStatus?.activeGameweek || draftStatus?.currentGameweek || 1;
      // TODO: Implement gameweek simulation with Supabase
      console.log('Simulate gameweek requested:', currentGameweek, 'for user:', currentUser?.id);
      await onRefresh();
      await fetchSimulationData();
      await fetchLeaderboard();
      alert(`Gameweek ${currentGameweek} simulated successfully!`);
    } catch (error) {
      alert('Failed to simulate gameweek');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSimulationMode = async () => {
    try {
      setLoading(true);
      const currentMode = draftStatus?.simulationMode || false;
      const newMode = !currentMode;
      
      // TODO: Implement simulation mode toggle with Supabase
      console.log('Toggle simulation mode requested:', newMode, 'for user:', currentUser?.id);
      await onRefresh();
      await fetchSimulationData();
    } catch (error) {
      alert('Failed to toggle simulation mode');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSimulation = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm('Are you sure you want to reset all simulation data? This cannot be undone.')) {
      try {
        setLoading(true);
        // TODO: Implement simulation reset with Supabase
        console.log('Reset simulation requested for user:', currentUser?.id);
        await onRefresh();
        await fetchSimulationData();
        await fetchLeaderboard();
        alert('Simulation reset successfully!');
      } catch (error) {
        alert('Failed to reset simulation');
      } finally {
        setLoading(false);
      }
    }
  };

  const currentGameweek = simulationData?.currentGameweek || 1;
  const isDraftComplete = simulationData?.isDraftComplete || false;

  return (
    <div className="space-y-8">
      {/* Simulation Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{color: '#034694'}}>
            {simulationMode ? '🎮' : '🏆'} {simulationMode ? 'Simulation Mode' : 'Live FPL Mode'}
          </h2>
          {currentUser?.isAdmin && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              👑 Admin Access
            </span>
          )}
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              simulationMode 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {simulationMode ? 'SIMULATION' : 'LIVE'}
            </span>
            <button
              onClick={handleToggleSimulationMode}
              disabled={loading || !currentUser?.isAdmin}
              className={`px-4 py-2 rounded-lg text-white font-medium ${
                simulationMode 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } ${!currentUser?.isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {simulationMode ? 'Exit Simulation' : 'Enter Simulation'}
            </button>
          </div>
        </div>
        <p className="text-gray-600 mb-6">
          {simulationMode 
            ? 'Test features with simulated scores and custom gameweek progression' 
            : 'Use real FPL data and current gameweek status'
          }
        </p>
        
        <>
          {currentUser?.isAdmin && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Admin Access Required
                  </h3>
                                  <div className="mt-2 text-sm text-yellow-700">
                  <p>Simulation features are only available to Rupert (Admin). Rupert must be logged in to access these features.</p>
                  <p className="mt-1"><strong>To use simulation:</strong> Contact Rupert for access.</p>
                </div>
                </div>
              </div>
            </div>
          )}
        </>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{color: '#034694'}}>{currentGameweek}</div>
            <div className="text-sm text-gray-600">Current Gameweek</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{color: '#034694'}}>{draftStatus?.users?.length || 0}</div>
            <div className="text-sm text-gray-600">Players</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{color: '#034694'}}>{draftStatus?.draftedCount || 0}</div>
            <div className="text-sm text-gray-600">Drafted Players</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{color: '#034694'}}>{leaderboard.length}</div>
            <div className="text-sm text-gray-600">Active Teams</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleRandomizeTeams}
            disabled={loading || !simulationMode || !currentUser?.isAdmin}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
              !currentUser?.isAdmin ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{backgroundColor: '#034694'}}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Dice6 className="w-4 h-4" />}
            Randomize Teams
          </button>
          
          {simulationMode && (
            <>
              <button
                onClick={handleSimulateGameweek}
                disabled={loading || !isDraftComplete || !currentUser?.isAdmin}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  !currentUser?.isAdmin ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{backgroundColor: '#034694'}}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Simulate Current Gameweek
              </button>
              
              <button
                onClick={handleResetSimulation}
                disabled={loading || !currentUser?.isAdmin}
                className={`flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 ${
                  !currentUser?.isAdmin ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Reset All
              </button>
            </>
          )}
        </div>

        {!isDraftComplete && simulationMode && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              �� <strong>Start here:</strong> Click "Randomize Teams" to give each user a balanced 5-player Chelsea team, then simulate gameweeks to experience the chip mechanics!
            </p>
          </div>
        )}
        
        {!simulationMode && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              📡 <strong>Live Mode:</strong> Using real FPL data and current gameweek status. Switch to simulation mode to test features.
            </p>
          </div>
        )}
      </div>

      {/* Current Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4" style={{color: '#034694'}}>🏆 Overall Leaderboard</h2>
          <div className="space-y-3">
            {leaderboard.map((user, index) => (
              <div key={user.userId} className={`p-4 rounded-lg flex items-center justify-between ${
                user.userId === currentUser?.id ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{safeExtractString(user, 'username', 'Unknown User')}</div>
                    <div className="text-sm text-gray-600">
                      {safeExtract(user, 'gameweeksPlayed', 0)} gameweeks played
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{color: '#034694'}}>
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
          <h2 className="text-xl font-semibold mb-4" style={{color: '#034694'}}>📈 Gameweek History</h2>
          <div className="space-y-3">
            {gameweekHistory.slice(-5).reverse().map((gameweek, index) => (
              <div key={gameweek.gameweek} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Gameweek {gameweek.gameweek}</h3>
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
                      <div key={userId} className="text-center">
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
    }
  }, [draftStatus]);

  // Add null check for draftStatus after hooks
  if (!draftStatus) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
            <p className="text-gray-600">Loading team management data...</p>
          </div>
        </div>
      </div>
    );
  }

  const fetchAvailablePlayers = async () => {
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

  const fetchAllPlayers = async () => {
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

  const handleTransfer = async (playerOutId, playerInId) => {
    try {
      setLoading(true);
      // TODO: Implement transfer logic with Supabase
      console.log('Transfer requested:', playerOutId, 'out,', playerInId, 'in for user:', currentUser.id);
      await onRefresh();
      await fetchAvailablePlayers();
    } catch (error) {
      alert('Transfer failed');
    } finally {
      setLoading(false);
    }
  };



  // Helper function to automatically save team changes
  const autoSaveTeam = async (newActivePlayers, newBenchedPlayer, newCaptain) => {
    try {
      // TODO: Implement team save logic with Supabase
      console.log('Auto-save team requested for user:', currentUser.id, {
        activePlayers: newActivePlayers,
        benchedPlayer: newBenchedPlayer,
        captain: newCaptain
      });
      await onRefresh();
    } catch (error) {
      console.error('Failed to auto-save team:', error);
      // Don't show alert for auto-save failures to avoid spam
    }
  };

  const togglePlayerSelection = async (playerId) => {
    let newActivePlayers, newBenchedPlayer, newCaptain;
    
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
  const handleBenchChange = async (playerId) => {
    const newBenchedPlayer = benchedPlayer === playerId ? null : playerId;
    setBenchedPlayer(newBenchedPlayer);
    
    // Auto-save if we have valid team composition
    if (selectedTeamPlayers.length === 4 && captain) {
      await autoSaveTeam(selectedTeamPlayers, newBenchedPlayer, captain);
    }
  };

  // Helper function to handle captain changes with auto-save
  const handleCaptainChange = async (playerId) => {
    const newCaptain = captain === playerId ? null : playerId;
    setCaptain(newCaptain);
    
    // Auto-save if we have valid team composition
    if (selectedTeamPlayers.length === 4 && benchedPlayer) {
      await autoSaveTeam(selectedTeamPlayers, benchedPlayer, newCaptain);
    }
  };

  const handleUseChip = async (chipId, chipName) => {
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
      // TODO: Implement chip usage logic with Supabase
      console.log('Use chip requested:', chipName, chipId, 'for user:', currentUser.id, 'target:', targetUserId);
      await onRefresh();
      alert(`${chipName} used successfully!`);
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
          <h2 className="text-xl font-semibold" style={{color: '#034694'}}>⚽ Team Management</h2>
          <div className="text-sm text-gray-600">
            {myTeam?.team?.length || 0}/5 players • GW {currentGameweek}
          </div>
        </div>
        
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {['lineup', 'transfers', 'chips'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveManagementTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeManagementTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
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
          <h3 className="text-lg font-semibold mb-4" style={{color: '#034694'}}>⚽ Gameweek Team Selection</h3>
          <p className="text-gray-600 mb-6">Select 4 active players, 1 bench player, and choose your captain (2x points)</p>
        
        {myTeam?.team?.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              <strong>Welcome, {currentUser?.username}!</strong> This is your team of {myTeam.team?.length || 0} players.
            </p>
          </div>
        )}
        
        {myTeam?.team?.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {myTeam.team.map((playerId) => {
                const isActive = selectedTeamPlayers.includes(playerId);
                const isBenched = benchedPlayer === playerId;
                const isCaptain = captain === playerId;
                
                const playerDetails = getPlayerDetails(playerId);
                
                return (
                  <div key={playerId} className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isActive ? 'border-green-500 bg-green-50' :
                    isBenched ? 'border-yellow-500 bg-yellow-50' :
                    'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="text-center">
                      <div className="font-medium">{playerDetails.name}</div>
                      <div className="text-xs text-gray-500">{playerDetails.position} - £{playerDetails.price}m</div>
                      <div className="text-sm text-gray-600 mt-2">
                        {isCaptain && <Star className="w-4 h-4 inline text-yellow-500 mr-1" />}
                        {isActive && 'Active'}
                        {isBenched && 'Benched'}
                        {!isActive && !isBenched && 'Not Selected'}
                      </div>
                      
                      <div className="mt-3 space-y-2">
                        <button
                          onClick={() => togglePlayerSelection(playerId)}
                          className={`w-full py-1 px-2 text-xs rounded ${
                            isActive ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                          disabled={!isActive && selectedTeamPlayers.length >= 4}
                        >
                          {isActive ? 'Remove from Active' : 'Add to Active'}
                        </button>
                        
                        <button
                          onClick={() => handleBenchChange(playerId)}
                          className={`w-full py-1 px-2 text-xs rounded ${
                            isBenched ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          }`}
                          disabled={benchedPlayer && !isBenched}
                        >
                          {isBenched ? 'Remove from Bench' : 'Bench Player'}
                        </button>
                        
                        {isActive && (
                          <button
                            onClick={() => handleCaptainChange(playerId)}
                            className={`w-full py-1 px-2 text-xs rounded ${
                              isCaptain ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
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
            <p className="text-lg font-medium text-gray-700 mb-2">No team found for {currentUser?.username || 'current user'}</p>
            <p className="text-sm">Go to the 🎮 Simulation tab and click "Randomize Teams" to assign teams to all users.</p>
            {!currentUser && <p className="text-xs text-red-500 mt-2">You may need to log in first.</p>}
          </div>
        )}
        </div>
      )}

      {/* Transfers Tab Content */}
      {activeManagementTab === 'transfers' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4" style={{color: '#034694'}}>🔄 Transfer Market</h3>
          <p className="text-gray-600 mb-4">Swap players with available Chelsea players not in other teams</p>
        
        {/* Transfer Rotation Info */}
        {draftStatus?.currentTransferUser && (
          <div className={`p-4 mb-6 rounded-lg border ${
            draftStatus.currentTransferUser.id === currentUser?.id 
              ? 'bg-green-50 border-green-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center">
              <ArrowLeftRight className="w-5 h-5 mr-2" style={{color: '#034694'}} />
              <div>
                <p className={`font-medium ${
                  draftStatus.currentTransferUser.id === currentUser?.id 
                    ? 'text-green-800' 
                    : 'text-gray-700'
                }`}>
                  {draftStatus.currentTransferUser.id === currentUser?.id 
                    ? `🎯 It's your turn to transfer in Gameweek ${currentGameweek}!`
                    : `⏳ ${draftStatus.currentTransferUser.username}'s turn to transfer in Gameweek ${currentGameweek}`
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
              <div key={player.id} className="p-4 border rounded-lg">
                <div className="text-center">
                  <div className="font-medium">{player.web_name}</div>
                  <div className="text-sm text-gray-600">{player.position_short} - £{player.price}m</div>
                  <div className="text-xs text-gray-500">{player.total_points} points</div>
                  
                  {myTeam?.team?.length > 0 && (
                    <div className="mt-3">
                      <select 
                        onChange={(e) => e.target.value && handleTransfer(parseInt(e.target.value), player.id)}
                        className="w-full text-xs p-1 border rounded disabled:opacity-50"
                        disabled={loading || draftStatus?.currentTransferUser?.id !== currentUser?.id}
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
              <h3 className="text-lg font-semibold" style={{color: '#034694'}}>🎮 My Chips</h3>
              <div className="text-sm text-gray-500">
                {availableChips.length} available • {usedChips.length} used
              </div>
            </div>
            
            {availableChips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableChips.map((chip) => (
                  <div key={chip.id} className={`p-4 border-2 rounded-lg ${getRarityColor(chip.rarity)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold">{chip.name}</h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-white">{chip.rarity}</span>
                    </div>
                    <p className="text-sm mb-3">{chip.description}</p>
                    <div className="text-xs text-gray-600 mb-3">
                      Received: GW{chip.receivedGameweek} | Expires: GW{chip.expiresGameweek}
                    </div>
                    <button
                      onClick={() => handleUseChip(chip.id, chip.name)}
                      disabled={loading}
                      className="w-full py-2 text-white rounded-lg text-sm font-medium"
                      style={{backgroundColor: '#034694'}}
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