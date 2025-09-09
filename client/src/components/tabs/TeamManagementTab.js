import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Users, 
  Trophy, 
  Target,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import supabase from '../../config/supabase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import Modal from '../ui/Modal';
import { handleApiError } from '../../utils/errorHandler';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../utils/constants';

function TeamManagementTab({ currentUser, draftStatus, onRefresh }) {
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedTeamPlayers, setSelectedTeamPlayers] = useState([]);
  const [benchedPlayer, setBenchedPlayer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userTeamPlayers, setUserTeamPlayers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch available players from database
  const fetchAvailablePlayers = async () => {
    try {
      console.log('🔄 Fetching available players...');
      const { data, error } = await supabase
        .from('chelsea_players')
        .select('*')
        .eq('is_available', true)
        .order('name');

      if (error) {
        console.error('❌ Error fetching players:', error);
        return;
      }

      console.log('✅ Available players fetched:', data?.length || 0);
      setAvailablePlayers(data || []);
    } catch (error) {
      console.error('❌ Error fetching available players:', error);
    }
  };

  // Fetch user teams from database
  const fetchUserTeams = async () => {
    try {
      console.log('🔄 Fetching user teams...');
      const { data, error } = await supabase
        .from('user_teams')
        .select(`
          *,
          chelsea_players (
            id,
            name,
            position,
            price,
            is_available
          )
        `)
        .order('user_id');

      if (error) {
        console.error('❌ Error fetching user teams:', error);
        return;
      }

      console.log('✅ User teams fetched:', data?.length || 0);
      setUserTeamPlayers(data || []);
    } catch (error) {
      console.error('❌ Error fetching user teams:', error);
    }
  };

  useEffect(() => {
    if (draftStatus) {
      fetchAvailablePlayers();
      fetchUserTeams();
    }
  }, [draftStatus]);

  // Refresh function that can be called externally
  const refreshData = () => {
    fetchAvailablePlayers();
    fetchUserTeams();
  };

  // Expose refresh function to parent component
  useEffect(() => {
    if (onRefresh) {
      // Store the refresh function so parent can call it
      onRefresh.refreshTeamData = refreshData;
    }
  }, [onRefresh]);

  const handlePlayerSelect = (player) => {
    if (selectedTeamPlayers.length >= 5) {
      alert('Maximum 5 players allowed per team');
      return;
    }

    if (selectedTeamPlayers.find(p => p.id === player.id)) {
      alert('Player already selected');
      return;
    }

    setSelectedTeamPlayers([...selectedTeamPlayers, player]);
  };

  const handlePlayerRemove = (playerId) => {
    setSelectedTeamPlayers(selectedTeamPlayers.filter(p => p.id !== playerId));
  };

  const handleBenchPlayer = (playerId) => {
    const player = selectedTeamPlayers.find(p => p.id === playerId);
    if (player) {
      setBenchedPlayer(player);
      setSelectedTeamPlayers(selectedTeamPlayers.filter(p => p.id !== playerId));
    }
  };

  const handleSaveTeam = async () => {
    if (!selectedUser) {
      alert('Please select a user first');
      return;
    }

    if (selectedTeamPlayers.length !== 5) {
      alert('Please select exactly 5 players');
      return;
    }

    try {
      setLoading(true);
      console.log('💾 Saving team for user:', selectedUser.email);

      // Clear existing team for this user
      await supabase
        .from('user_teams')
        .delete()
        .eq('user_id', selectedUser.id);

      // Insert new team
      const teamData = selectedTeamPlayers.map((player, index) => ({
        user_id: selectedUser.id,
        player_id: player.id,
        player_name: player.name,
        position: player.position,
        price: player.price,
        is_captain: index === 0, // First player is captain
        is_vice_captain: index === 1 // Second player is vice captain
      }));

      const { error } = await supabase
        .from('user_teams')
        .insert(teamData);

      if (error) {
        console.error('❌ Error saving team:', error);
        alert('Failed to save team: ' + error.message);
        return;
      }

      console.log('✅ Team saved successfully');
      await onRefresh();
      alert('Team saved successfully!');
    } catch (error) {
      console.error('❌ Error saving team:', error);
      alert('Failed to save team: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (playerOut, playerIn) => {
    if (!selectedUser) {
      alert('Please select a user first');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Making transfer:', playerOut.name, '→', playerIn.name);
      
      const currentGameweek = draftStatus?.activeGameweek || 1;
      
      // Check if user has free transfers
      const { data: userHistory } = await supabase
        .from('user_gameweek_history')
        .select('*')
        .eq('user_id', selectedUser.id)
        .eq('gameweek', currentGameweek)
        .single();

      const freeTransfers = userHistory?.free_transfers || 1;
      
      if (freeTransfers <= 0) {
        alert('No free transfers remaining for this gameweek');
        return;
      }

      // Update user_teams table
      const { error: updateError } = await supabase
        .from('user_teams')
        .update({
          player_id: playerIn.id,
          player_name: playerIn.name,
          position: playerIn.position,
          price: playerIn.price
        })
        .eq('user_id', selectedUser.id)
        .eq('player_id', playerOut.id);

      if (updateError) {
        console.error('❌ Error updating team:', updateError);
        alert('Transfer failed: ' + updateError.message);
        return;
      }

      // Update user gameweek history
      const { error: historyError } = await supabase
        .from('user_gameweek_history')
        .upsert({
          user_id: selectedUser.id,
          gameweek: currentGameweek,
          free_transfers: freeTransfers - 1,
          transfers_made: (userHistory?.transfers_made || 0) + 1
        });

      if (historyError) {
        console.error('❌ Error updating history:', historyError);
      }

      console.log('✅ Transfer completed successfully');
      await onRefresh();
      alert(`Transfer successful! ${playerOut.name} → ${playerIn.name}`);
    } catch (error) {
      console.error('❌ Transfer error:', error);
      alert('Transfer failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseChip = async (chipType) => {
    if (!selectedUser) {
      alert('Please select a user first');
      return;
    }

    try {
      setLoading(true);
      console.log('🎯 Using chip:', chipType);
      
      const currentGameweek = simulationStatus?.current_gameweek || 1;
      
      // Check if chip is available
      const { data: chipData, error: chipError } = await supabase
        .from('user_chips')
        .select('*')
        .eq('user_id', selectedUser.id)
        .eq('chip_type', chipType)
        .eq('is_used', false)
        .single();

      if (chipError || !chipData) {
        alert('Chip not available or already used');
        return;
      }

      // Mark chip as used
      const { error: updateError } = await supabase
        .from('user_chips')
        .update({ 
          is_used: true,
          used_gameweek: currentGameweek,
          used_at: new Date().toISOString()
        })
        .eq('id', chipData.id);

      if (updateError) {
        console.error('❌ Error using chip:', updateError);
        alert('Failed to use chip: ' + updateError.message);
        return;
      }

      console.log('✅ Chip used successfully');
      await onRefresh();
      alert(`${chipType} used successfully!`);
    } catch (error) {
      console.error('❌ Chip error:', error);
      alert('Failed to use chip: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-save team when selection changes
  useEffect(() => {
    if (selectedTeamPlayers.length === 5 && selectedUser) {
      const autoSave = async () => {
        try {
          console.log('💾 Auto-saving team...');
          
          // Clear existing team for this user
          await supabase
            .from('user_teams')
            .delete()
            .eq('user_id', selectedUser.id);

          // Insert new team
          const teamData = selectedTeamPlayers.map((player, index) => ({
            user_id: selectedUser.id,
            player_id: player.id,
            player_name: player.name,
            position: player.position,
            price: player.price,
            is_captain: index === 0,
            is_vice_captain: index === 1
          }));

          await supabase
            .from('user_teams')
            .insert(teamData);

          console.log('✅ Team auto-saved successfully');
          await onRefresh();
        } catch (error) {
          console.error('Failed to auto-save team:', error);
          // Don't show alert for auto-save failures to avoid spam
        }
      };

      const timeoutId = setTimeout(autoSave, 2000); // Auto-save after 2 seconds
      return () => clearTimeout(timeoutId);
    }
  }, [selectedTeamPlayers, selectedUser]);

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

  const users = draftStatus?.users || [];
  const myTeam = draftStatus?.users?.find(u => u.id === currentUser?.id);
  const availableChips = myTeam?.chips || [];
  const usedChips = myTeam?.usedChips || [];
  const currentGameweek = draftStatus?.activeGameweek || draftStatus?.currentGameweek || 1;
  const simulationStatus = { is_simulation_mode: false, is_draft_complete: true };
  
  return (
    <div className="space-y-6">
      {/* Team Management Navigation */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
              <p className="text-gray-600">Assign players to teams and manage transfers.</p>
            </div>
          </div>
          <Button
            onClick={refreshData}
            disabled={loading}
            variant="secondary"
            size="small"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Players
          </Button>
        </div>

        {/* User Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select User to Manage
          </label>
          <select
            value={selectedUser?.id || ''}
            onChange={(e) => {
              const user = users.find(u => u.id === e.target.value);
              setSelectedUser(user);
              setSelectedTeamPlayers([]);
              setBenchedPlayer(null);
            }}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose a user...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.email} {user.isAdmin ? '(Admin)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Available Players */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Players</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availablePlayers.map(player => {
              const isActive = selectedTeamPlayers.find(p => p.id === player.id);
              const isBenched = benchedPlayer?.id === player.id;
              
              return (
                <div key={player.player_id} className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  isActive ? 'border-green-500 bg-green-50' :
                  isBenched ? 'border-yellow-500 bg-yellow-50' :
                  'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  if (isActive) {
                    handlePlayerRemove(player.id);
                  } else if (isBenched) {
                    setBenchedPlayer(null);
                    setSelectedTeamPlayers([...selectedTeamPlayers, player]);
                  } else {
                    handlePlayerSelect(player);
                  }
                }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{player.name}</h4>
                      <p className="text-sm text-gray-600">{player.position} • £{player.price}m</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isActive && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {isBenched && <XCircle className="w-5 h-5 text-yellow-500" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Team */}
        {selectedUser && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedUser.email}'s Team ({selectedTeamPlayers.length}/5)
            </h3>
            
            {selectedTeamPlayers.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {selectedTeamPlayers.map((player, index) => (
                  <div key={player.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{player.name}</h4>
                        <p className="text-sm text-gray-600">{player.position} • £{player.price}m</p>
                        {index === 0 && <span className="text-xs text-yellow-600 font-medium">Captain</span>}
                        {index === 1 && <span className="text-xs text-gray-600 font-medium">Vice Captain</span>}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleBenchPlayer(player.id)}
                          className="p-1 text-yellow-600 hover:text-yellow-700"
                          title="Bench player"
                        >
                          <Target className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePlayerRemove(player.id)}
                          className="p-1 text-red-600 hover:text-red-700"
                          title="Remove player"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bench */}
            {benchedPlayer && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Bench</h4>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{benchedPlayer.name}</h4>
                      <p className="text-sm text-gray-600">{benchedPlayer.position} • £{benchedPlayer.price}m</p>
                    </div>
                    <button
                      onClick={() => {
                        setBenchedPlayer(null);
                        setSelectedTeamPlayers([...selectedTeamPlayers, benchedPlayer]);
                      }}
                      className="p-1 text-green-600 hover:text-green-700"
                      title="Add to team"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Team Button */}
            <div className="flex space-x-4">
              <Button
                onClick={handleSaveTeam}
                disabled={loading || selectedTeamPlayers.length !== 5}
                variant={selectedTeamPlayers.length === 5 ? 'success' : 'secondary'}
                loading={loading}
              >
                Save Team
              </Button>
              
              <Button
                onClick={() => {
                  setSelectedTeamPlayers([]);
                  setBenchedPlayer(null);
                }}
                variant="secondary"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Chips Management */}
        {selectedUser && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Chips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['Wildcard', 'Free Hit', 'Bench Boost', 'Triple Captain'].map(chip => {
                const isAvailable = availableChips.includes(chip);
                const isUsed = usedChips.includes(chip);
                
                return (
                  <div key={chip} className={`p-4 rounded-lg border-2 ${
                    isAvailable ? 'border-green-200 bg-green-50' :
                    isUsed ? 'border-red-200 bg-red-50' :
                    'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{chip}</h4>
                        <p className="text-sm text-gray-600">
                          {isAvailable ? 'Available' : isUsed ? 'Used' : 'Not Available'}
                        </p>
                      </div>
                      {isAvailable && (
                        <button
                          onClick={() => handleUseChip(chip)}
                          disabled={loading}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Use
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default TeamManagementTab;
