import React, { useState, useEffect } from 'react';
import { Users, Trophy, RefreshCw, CheckCircle, AlertCircle, User, Target, ArrowRight } from 'lucide-react';
import { supabase } from '../config/supabase';

const AdminPlayerAllocation = ({ currentUser }) => {
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [users, setUsers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [allocationOrder, setAllocationOrder] = useState(1);

  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async() => {
    try {
      setLoading(true);

      // Fetch available Chelsea players
      const { data: players, error: playersError } = await supabase
        .from('chelsea_players')
        .select('*')
        .eq('is_available', true)
        .order('position', { ascending: true });

      if (playersError) throw playersError;

      // Fetch all active users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('first_name');

      if (usersError) throw usersError;

      // Fetch existing allocations
      const { data: allocationsData, error: allocationsError } = await supabase
        .from('draft_allocations')
        .select(`
          *,
          target_user:users!draft_allocations_target_user_id_fkey(id, first_name, last_name, email)
        `)
        .order('allocation_round', { ascending: true })
        .order('allocation_order', { ascending: true });

      if (allocationsError) throw allocationsError;

      setAvailablePlayers(players);
      setUsers(usersData);
      setAllocations(allocationsData || []);

      // Calculate current round and order
      const maxRound = Math.max(0, ...allocationsData.map(a => a.allocation_round));
      const currentRoundAllocations = allocationsData.filter(a => a.allocation_round === maxRound);
      const maxOrder = Math.max(0, ...currentRoundAllocations.map(a => a.allocation_order));

      setCurrentRound(maxRound + 1);
      setAllocationOrder(maxOrder + 1);
    } catch (err) {
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const allocatePlayer = async() => {
    if (!selectedUser || !selectedPlayer) {
      setError('Please select both a user and a player');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Check if player is already allocated
      const existingAllocation = allocations.find(a => a.player_id === selectedPlayer.id);

      if (existingAllocation) {
        setError(`Player ${selectedPlayer.name} is already allocated to ${existingAllocation.target_user.first_name}`);
        return;
      }

      // Check if user already has 5 players
      const userAllocations = allocations.filter(a => a.target_user_id === selectedUser.id);

      if (userAllocations.length >= 5) {
        setError(`${selectedUser.first_name} already has 5 players allocated`);
        return;
      }

      // Create allocation
      const { error: allocationError } = await supabase
        .from('draft_allocations')
        .insert({
          admin_user_id: currentUser.id,
          target_user_id: selectedUser.id,
          player_id: selectedPlayer.id,
          player_name: selectedPlayer.name,
          player_position: selectedPlayer.position,
          player_price: selectedPlayer.price,
          allocation_round: currentRound,
          allocation_order: allocationOrder
        });

      if (allocationError) throw allocationError;

      setSuccess(`Successfully allocated ${selectedPlayer.name} to ${selectedUser.first_name}`);

      // Clear selections
      setSelectedUser(null);
      setSelectedPlayer(null);

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(`Failed to allocate player: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const removeAllocation = async(allocationId) => {
    if (!window.confirm('Are you sure you want to remove this allocation?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Remove from draft_allocations
      const { error: deleteError } = await supabase
        .from('draft_allocations')
        .delete()
        .eq('id', allocationId);

      if (deleteError) throw deleteError;

      // Remove from player_ownership
      const allocation = allocations.find(a => a.id === allocationId);

      if (allocation) {
        const { error: ownershipError } = await supabase
          .from('player_ownership')
          .delete()
          .eq('user_id', allocation.target_user_id)
          .eq('player_id', allocation.player_id);

        if (ownershipError) throw ownershipError;
      }

      setSuccess('Allocation removed successfully');
      await fetchData();
    } catch (err) {
      setError(`Failed to remove allocation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getPositionColor = (position) => {
    switch (position) {
      case 'GK': return 'bg-yellow-100 text-yellow-800';
      case 'DEF': return 'bg-blue-100 text-blue-800';
      case 'MID': return 'bg-green-100 text-green-800';
      case 'FWD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPositionIcon = (position) => {
    switch (position) {
      case 'GK': return '🥅';
      case 'DEF': return '🛡️';
      case 'MID': return '⚽';
      case 'FWD': return '🎯';
      default: return '⚽';
    }
  };

  const getAvailablePlayersForUser = (userId) => {
    const userAllocations = allocations.filter(a => a.target_user_id === userId);
    const allocatedPlayerIds = userAllocations.map(a => a.player_id);

    return availablePlayers.filter(p => !allocatedPlayerIds.includes(p.id));
  };

  const getUserAllocations = (userId) => {
    return allocations.filter(a => a.target_user_id === userId);
  };

  if (!currentUser?.isAdmin) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
        <p className="text-gray-600">Only administrators can access the player allocation portal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          <Trophy className="inline w-8 h-8 mr-2" style={{ color: '#034694' }} />
          Admin Player Allocation Portal
        </h2>
        <p className="text-gray-600">
          Manually allocate Chelsea players to users for the draft
        </p>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-700">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Allocation Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Allocate Player</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* User Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select User
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => {
                const user = users.find(u => u.id === e.target.value);

                setSelectedUser(user);
              }}
              value={selectedUser?.id || ''}
            >
              <option value="">Choose a user...</option>
              {users.map(user => {
                const userAllocations = getUserAllocations(user.id);

                return (
                  <option key={user.id} value={user.id}>
                    {user.first_name}
                    {' '}
                    {user.last_name}
                    {' '}
                    (
                    {userAllocations.length}
                    /5 players)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Player Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Player
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => {
                const player = availablePlayers.find(p => p.id === parseInt(e.target.value));

                setSelectedPlayer(player);
              }}
              value={selectedPlayer?.id || ''}
            >
              <option value="">Choose a player...</option>
              {selectedUser ? (
                getAvailablePlayersForUser(selectedUser.id).map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                    {' '}
                    (
                    {player.position}
                    ) -
                    {player.price}
                    M
                  </option>
                ))
              ) : (
                availablePlayers.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                    {' '}
                    (
                    {player.position}
                    ) -
                    {player.price}
                    M
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Allocation Button */}
        <button
          className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg ${
            loading || !selectedUser || !selectedPlayer ?
              'bg-gray-400 cursor-not-allowed' :
              'bg-green-600 hover:bg-green-700'
          }`}
          disabled={loading || !selectedUser || !selectedPlayer}
          onClick={allocatePlayer}
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          {loading ? 'Allocating...' : 'Allocate Player'}
        </button>

        {/* Current Round Info */}
        <div className="mt-4 text-sm text-gray-600">
          <p>
            Current Round:
            {currentRound}
            {' '}
            | Next Allocation Order:
            {allocationOrder}
          </p>
        </div>
      </div>

      {/* User Teams Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => {
          const userAllocations = getUserAllocations(user.id);
          const totalValue = userAllocations.reduce((sum, a) => sum + parseFloat(a.player_price), 0);

          return (
            <div className="bg-white rounded-lg shadow p-6" key={user.id}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {user.first_name}
                  {' '}
                  {user.last_name}
                </h3>
                <div className="text-sm text-gray-600">
                  {userAllocations.length}
                  /5 players
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-1">Total Value</div>
                <div className="text-lg font-bold" style={{ color: '#034694' }}>
                  {totalValue.toFixed(1)}
                  M
                </div>
              </div>

              <div className="space-y-2">
                {userAllocations.length === 0 ? (
                  <p className="text-gray-500 text-sm">No players allocated yet</p>
                ) : (
                  userAllocations.map(allocation => (
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded" key={allocation.id}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPositionColor(allocation.player_position)}`}>
                          {getPositionIcon(allocation.player_position)}
                          {' '}
                          {allocation.player_position}
                        </span>
                        <span className="text-sm font-medium">{allocation.player_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {allocation.player_price}
                          M
                        </span>
                        <button
                          className="text-red-500 hover:text-red-700 text-xs"
                          onClick={() => removeAllocation(allocation.id)}
                          title="Remove allocation"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Available Players */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Available Players</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {availablePlayers
            .filter(player => !allocations.some(a => a.player_id === player.id))
            .map(player => (
              <div className="p-3 border rounded-lg" key={player.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{player.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPositionColor(player.position)}`}>
                    {getPositionIcon(player.position)}
                    {' '}
                    {player.position}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  Price:
                  {' '}
                  {player.price}
                  M
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPlayerAllocation;
