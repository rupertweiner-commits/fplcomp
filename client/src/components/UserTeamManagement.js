import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trophy, 
  Target, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Crown,
  Shield,
  RotateCcw,
  Zap,
  Calendar,
  TrendingUp
} from 'lucide-react';
import supabase from '../config/supabase';
import ChipManagement from './ChipManagement';
import PlayerCard from './PlayerCard';
import PlayerProfile from './PlayerProfile';

function UserTeamManagement({ currentUser }) {
  const [myTeam, setMyTeam] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [viceCaptain, setViceCaptain] = useState(null);
  const [benchedPlayer, setBenchedPlayer] = useState(null);
  const [availableChips, setAvailableChips] = useState([]);
  const [usedChips, setUsedChips] = useState([]);
  const [currentGameweek, setCurrentGameweek] = useState(1);
  const [isTransferWeek, setIsTransferWeek] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      fetchMyTeam();
      fetchChips();
      fetchGameweekInfo();
    }
  }, [currentUser]);

  const fetchMyTeam = async () => {
    if (!currentUser?.id) return;

    setLoading(true);
    try {
      console.log('Fetching team for user:', currentUser.id, 'Type:', typeof currentUser.id);
      
      // First, let's check what players are actually assigned to this user
      const { data: allAssignedPlayers, error: checkError } = await supabase
        .from('chelsea_players')
        .select('id, name, web_name, assigned_to_user_id')
        .not('assigned_to_user_id', 'is', null);
      
      console.log('All assigned players:', allAssignedPlayers);
      
      // Fetch my assigned players from chelsea_players table where assigned_to_user_id matches current user
      const { data: userTeamData, error } = await supabase
        .from('chelsea_players')
        .select('*')
        .eq('assigned_to_user_id', currentUser.id)
        .order('total_points', { ascending: false });

      console.log('Team data response:', { userTeamData, error });

      if (error) {
        throw error;
      }

      // Transform the data to match the expected format
      const players = userTeamData?.map(player => ({
        id: player.id,
        name: player.web_name || player.name || 'Unknown Player',
        web_name: player.web_name,
        position: player.position || 'UNKNOWN',
        total_points: player.total_points || 0,
        price: player.price || 0,
        availability_status: player.availability_status,
        news: player.news,
        is_strategic_pick: player.is_strategic_pick,
        is_captain: player.is_captain || false,
        is_vice_captain: player.is_vice_captain || false,
        ...player // Include all player data for PlayerCard component
      })) || [];

      console.log('Processed players:', players);
      setMyTeam(players);
      
      // Set captain and vice captain
      const captainPlayer = players?.find(p => p.is_captain);
      const viceCaptainPlayer = players?.find(p => p.is_vice_captain);
      console.log('Captain:', captainPlayer, 'Vice Captain:', viceCaptainPlayer);
      setCaptain(captainPlayer || null);
      setViceCaptain(viceCaptainPlayer || null);

      // Set benched player (first non-captain player if we have 5+ players)
      if (players && players.length > 4) {
        const nonCaptainPlayers = players.filter(p => !p.is_captain && !p.is_vice_captain);
        setBenchedPlayer(nonCaptainPlayers[0] || null);
      }

    } catch (error) {
      console.error('Error fetching my team:', error);
      setMessage({ type: 'error', text: 'Failed to load team data' });
    } finally {
      setLoading(false);
    }
  };

  const fetchChips = async () => {
    if (!currentUser?.id) return;

    try {
      // Fetch available chips for this user
      const { data: chips, error } = await supabase
        .from('user_chips')
        .select('*')
        .eq('user_id', currentUser.id);

      if (error) {
        throw error;
      }

      const available = chips?.filter(chip => !chip.used) || [];
      const used = chips?.filter(chip => chip.used) || [];
      
      setAvailableChips(available);
      setUsedChips(used);

    } catch (error) {
      console.error('Error fetching chips:', error);
    }
  };

  const fetchGameweekInfo = async () => {
    try {
      // Fetch current gameweek and transfer info
      const { data: status, error } = await supabase
        .from('draft_status')
        .select('current_gameweek, is_draft_complete')
        .single();

      if (error) {
        throw error;
      }

      setCurrentGameweek(status?.current_gameweek || 1);
      
      // Determine if it's a transfer week (every 2nd gameweek)
      setIsTransferWeek((status?.current_gameweek || 1) % 2 === 0);

    } catch (error) {
      console.error('Error fetching gameweek info:', error);
    }
  };

  const handleSetCaptain = async (playerId) => {
    if (!currentUser?.id) return;

    setLoading(true);
    try {
      // First, remove captain from all players assigned to this user
      await supabase
        .from('chelsea_players')
        .update({ is_captain: false })
        .eq('assigned_to_user_id', currentUser.id);

      // Set new captain
      const { error } = await supabase
        .from('chelsea_players')
        .update({ is_captain: true })
        .eq('id', playerId)
        .eq('assigned_to_user_id', currentUser.id);

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: 'Captain updated successfully!' });
      fetchMyTeam(); // Refresh team data

    } catch (error) {
      console.error('Error setting captain:', error);
      setMessage({ type: 'error', text: 'Failed to update captain' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetViceCaptain = async (playerId) => {
    if (!currentUser?.id) return;

    setLoading(true);
    try {
      // First, remove vice captain from all players assigned to this user
      await supabase
        .from('chelsea_players')
        .update({ is_vice_captain: false })
        .eq('assigned_to_user_id', currentUser.id);

      // Set new vice captain
      const { error } = await supabase
        .from('chelsea_players')
        .update({ is_vice_captain: true })
        .eq('id', playerId)
        .eq('assigned_to_user_id', currentUser.id);

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: 'Vice Captain updated successfully!' });
      fetchMyTeam(); // Refresh team data

    } catch (error) {
      console.error('Error setting vice captain:', error);
      setMessage({ type: 'error', text: 'Failed to update vice captain' });
    } finally {
      setLoading(false);
    }
  };

  const handleUseChip = async (chipType) => {
    if (!currentUser?.id) return;

    setLoading(true);
    try {
      // Mark chip as used
      const { error } = await supabase
        .from('user_chips')
        .update({ 
          used: true, 
          used_in_gameweek: currentGameweek,
          used_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.id)
        .eq('chip_type', chipType)
        .eq('used', false);

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: `${chipType} chip used successfully!` });
      fetchChips(); // Refresh chips data

    } catch (error) {
      console.error('Error using chip:', error);
      setMessage({ type: 'error', text: 'Failed to use chip' });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerClick = (player) => {
    setSelectedPlayer(player);
    setShowPlayerProfile(true);
  };

  const handleClosePlayerProfile = () => {
    setShowPlayerProfile(false);
    setSelectedPlayer(null);
  };

  const getPositionColor = (position) => {
    switch (position) {
      case 'GK': return 'bg-green-100 text-green-800 border-green-300';
      case 'DEF': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MID': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'FWD': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getChipIcon = (chipType) => {
    switch (chipType) {
      case 'WILDCARD': return <RotateCcw className="h-4 w-4" />;
      case 'FREE_HIT': return <Zap className="h-4 w-4" />;
      case 'TRIPLE_CAPTAIN': return <Crown className="h-4 w-4" />;
      case 'BENCH_BOOST': return <Shield className="h-4 w-4" />;
      default: return <Trophy className="h-4 w-4" />;
    }
  };

  const getChipColor = (chipType) => {
    switch (chipType) {
      case 'WILDCARD': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'FREE_HIT': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'TRIPLE_CAPTAIN': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'BENCH_BOOST': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Please Log In</h1>
          <p className="text-gray-600">You need to be logged in to manage your team.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Users className="h-8 w-8 mr-3 text-blue-600" />
                My Team Management
              </h1>
              <p className="text-gray-600 mt-2">Manage your team, captain, bench, and chips</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">Gameweek</div>
                <div className="text-2xl font-bold text-blue-600">{currentGameweek}</div>
              </div>
              <button
                onClick={fetchMyTeam}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Team */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chip Management Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Chip System</h2>
              <ChipManagement currentUser={currentUser} />
            </div>
            {/* Team Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">My Team ({myTeam.length}/5 players)</h2>
              
              {myTeam.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No players assigned to your team yet.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {currentUser?.isAdmin ? 
                      'Go to Admin Dashboard to allocate players to users.' : 
                      'Contact an admin to get players allocated.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myTeam.map((player, index) => (
                      <div key={player.id} className="relative">
                        <PlayerCard
                          player={player}
                          showCaptainBadge={player.is_captain}
                          showViceCaptainBadge={player.is_vice_captain}
                          onPlayerClick={handlePlayerClick}
                          compact={false}
                        />
                        {/* Action Buttons Overlay - Right side */}
                        <div className="absolute top-2 right-2 flex space-x-1">
                          <button
                            onClick={() => handleSetCaptain(player.id)}
                            disabled={loading}
                            className={`px-2 py-1 text-xs font-bold rounded-full ${
                              player.is_captain
                                ? 'bg-yellow-400 text-yellow-900'
                                : 'bg-white/90 text-gray-600 hover:bg-yellow-100'
                            } disabled:opacity-50`}
                            title={player.is_captain ? 'Remove Captain' : 'Set Captain'}
                          >
                            <Crown className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleSetViceCaptain(player.id)}
                            disabled={loading}
                            className={`px-2 py-1 text-xs font-bold rounded-full ${
                              player.is_vice_captain
                                ? 'bg-purple-400 text-purple-900'
                                : 'bg-white/90 text-gray-600 hover:bg-purple-100'
                            } disabled:opacity-50`}
                            title={player.is_vice_captain ? 'Remove Vice Captain' : 'Set Vice Captain'}
                          >
                            <Shield className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Transfer Week Notice */}
            {isTransferWeek && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <h3 className="font-medium text-blue-900">Transfer Week Active</h3>
                    <p className="text-sm text-blue-700">This is a transfer week! You can make changes to your team.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Captain & Vice Captain */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Leadership</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Captain</label>
                  <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    {captain ? (
                      <div className="flex items-center">
                        <Crown className="h-4 w-4 text-yellow-600 mr-2" />
                        <span className="font-medium">{captain.name}</span>
                        <span className="ml-2 text-sm text-gray-600">({captain.total_points} pts)</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">No captain selected</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Vice Captain</label>
                  <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md">
                    {viceCaptain ? (
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 text-green-600 mr-2" />
                        <span className="font-medium">{viceCaptain.name}</span>
                        <span className="ml-2 text-sm text-gray-600">({viceCaptain.total_points} pts)</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">No vice captain selected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Available Chips */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Chips</h3>
              
              {availableChips.length === 0 ? (
                <p className="text-gray-500 text-sm">No chips available</p>
              ) : (
                <div className="space-y-3">
                  {availableChips.map((chip, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full mr-3 ${getChipColor(chip.chip_type)}`}>
                          {getChipIcon(chip.chip_type)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{chip.chip_type.replace('_', ' ')}</div>
                          <div className="text-sm text-gray-600">{chip.description}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUseChip(chip.chip_type)}
                        disabled={loading}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Use
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Used Chips */}
            {usedChips.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Used Chips</h3>
                
                <div className="space-y-3">
                  {usedChips.map((chip, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-50 rounded-md opacity-75">
                      <div className={`p-2 rounded-full mr-3 ${getChipColor(chip.chip_type)}`}>
                        {getChipIcon(chip.chip_type)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{chip.chip_type.replace('_', ' ')}</div>
                        <div className="text-sm text-gray-600">
                          Used in GW{chip.used_in_gameweek}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Statistics</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Points</span>
                  <span className="font-medium">{myTeam.reduce((sum, player) => sum + (player.total_points || 0), 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Value</span>
                  <span className="font-medium">{myTeam.reduce((sum, player) => sum + (player.price || 0), 0)}M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Points</span>
                  <span className="font-medium">
                    {myTeam.length > 0 ? Math.round(myTeam.reduce((sum, player) => sum + (player.total_points || 0), 0) / myTeam.length) : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Profile Modal */}
      <PlayerProfile
        player={selectedPlayer}
        isOpen={showPlayerProfile}
        onClose={handleClosePlayerProfile}
        showCaptainBadge={selectedPlayer?.is_captain}
        showViceCaptainBadge={selectedPlayer?.is_vice_captain}
      />
    </div>
  );
}

export default UserTeamManagement;
