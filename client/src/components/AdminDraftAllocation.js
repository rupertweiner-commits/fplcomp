import React, { useState, useEffect } from 'react';
import { Users, Trophy, Target, CheckCircle, AlertCircle } from 'lucide-react';
import TeamCompositionValidator from './TeamCompositionValidator';
import InjuryStatusDisplay from './InjuryStatusDisplay';

function AdminDraftAllocation({ currentUser }) {
  const [mockUsers, setMockUsers] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [isCaptain, setIsCaptain] = useState(false);
  const [isViceCaptain, setIsViceCaptain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch mock users
      const usersResponse = await fetch('/api/game?action=get-users', {
        headers: {
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        }
      });
      const usersData = await usersResponse.json();
      if (usersData.success && usersData.data && usersData.data.users) {
        setMockUsers(usersData.data.users);
        if (usersData.data.users.length > 0) {
          setSelectedUser(usersData.data.users[0].id);
        }
      } else {
        console.error('Users API error:', usersData);
        setMockUsers([]);
      }

      // Fetch available players
      const playersResponse = await fetch('/api/game?action=get-available-players', {
        headers: {
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        }
      });
      const playersData = await playersResponse.json();
      if (playersData.success && playersData.data && playersData.data.players) {
        setAvailablePlayers(playersData.data.players);
      } else {
        console.error('Players API error:', playersData);
        setAvailablePlayers([]);
      }

      // Fetch current allocations
      const allocationsResponse = await fetch('/api/game?action=get-user-team', {
        headers: {
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        }
      });
      const allocationsData = await allocationsResponse.json();
      if (allocationsData.success && allocationsData.data && allocationsData.data.allocations) {
        setAllocations(allocationsData.data.allocations);
      } else {
        console.error('Allocations API error:', allocationsData);
        setAllocations([]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  const handleAllocatePlayer = async () => {
    if (!selectedUser || !selectedPlayer) {
      setMessage({ type: 'error', text: 'Please select both a user and a player' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const response = await fetch('/api/game?action=allocate-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        },
        body: JSON.stringify({
          targetUserId: selectedUser,
          playerId: selectedPlayer,
          isCaptain: isCaptain,
          isViceCaptain: isViceCaptain
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Player allocated successfully!' });
        setSelectedPlayer('');
        setIsCaptain(false);
        setIsViceCaptain(false);
        await fetchData(); // Refresh data
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to allocate player' });
      }
    } catch (error) {
      console.error('Error allocating player:', error);
      setMessage({ type: 'error', text: 'Failed to allocate player' });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDraft = async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const response = await fetch('/api/game?action=complete-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Draft completed successfully! Ready for simulation.' });
        await fetchData(); // Refresh data
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to complete draft' });
      }
    } catch (error) {
      console.error('Error completing draft:', error);
      setMessage({ type: 'error', text: 'Failed to complete draft' });
    } finally {
      setLoading(false);
    }
  };

  const getTotalAllocations = () => {
    return allocations.reduce((total, user) => total + (user.players ? user.players.length : 0), 0);
  };

  const getUsersWithCompleteTeams = () => {
    return allocations.filter(user => user.players && user.players.length === 5).length;
  };

  const getUsersWithIncompleteTeams = () => {
    return allocations.filter(user => !user.players || user.players.length < 5).length;
  };

  if (!currentUser?.isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Admin Access Required</h3>
        <p className="mt-1 text-sm text-gray-500">You need admin privileges to access this feature.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Target className="mr-3 h-8 w-8 text-blue-600" />
              Admin Draft Allocation
            </h2>
            <p className="text-gray-600 mt-2">
              Allocate Chelsea players to mock users for testing
            </p>
          </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Allocations</div>
              <div className="text-2xl font-bold text-blue-600">{getTotalAllocations()}</div>
              <div className="text-sm text-gray-500">
                {getUsersWithCompleteTeams()}/3 users with complete teams (5 players each)
              </div>
            </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Allocation Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Allocate Player</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* User Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a user...</option>
              {mockUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.first_name} {user.last_name})
                </option>
              ))}
            </select>
          </div>

          {/* Player Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Player
            </label>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a player...</option>
              {availablePlayers.map(player => (
                <option key={player.id} value={player.id}>
                  {player.web_name || player.name} ({player.position}) - {player.total_points || 0} pts - {player.availability_status || 'Available'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Captain/Vice Captain Selection */}
        <div className="mt-4 flex space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isCaptain}
              onChange={(e) => {
                setIsCaptain(e.target.checked);
                if (e.target.checked) setIsViceCaptain(false);
              }}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Captain</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isViceCaptain}
              onChange={(e) => {
                setIsViceCaptain(e.target.checked);
                if (e.target.checked) setIsCaptain(false);
              }}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Vice Captain</span>
          </label>
        </div>

        {/* Player Details and Availability Context */}
        {selectedPlayer && (
          <div className="mt-4">
            {(() => {
              const player = availablePlayers.find(p => p.id === parseInt(selectedPlayer));
              if (!player) return null;
              
              return (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {player.web_name || player.name} ({player.position})
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{player.total_points || 0} pts</span>
                      {player.is_strategic_pick && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          💡 Strategic Pick
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <InjuryStatusDisplay player={player} />
                  
                  {player.availability_reason && (
                    <div className="mt-3 text-sm text-gray-600">
                      <strong>Status:</strong> {player.availability_reason}
                    </div>
                  )}
                  
                  {player.news && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>Latest News:</strong> {player.news}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Allocate Button */}
        <div className="mt-6">
          <button
            onClick={handleAllocatePlayer}
            disabled={loading || !selectedUser || !selectedPlayer}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Allocating...' : 'Allocate Player'}
          </button>
        </div>

        {/* Team Composition Rules */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">Team Composition Rules</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>Each team must have exactly 5 players at all times</strong></li>
            <li>• 2 players from GK/DEF positions (no more, no less)</li>
            <li>• 3 players from MID/FWD positions (no more, no less)</li>
            <li>• One player must be set as Captain</li>
            <li>• One player must be set as Vice Captain</li>
            <li>• <strong>Draft cannot be completed until all teams have exactly 5 players</strong></li>
          </ul>
        </div>
      </div>

      {/* Current Allocations */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Trophy className="mr-2 h-5 w-5" />
          Current Allocations
        </h3>
        
        {allocations.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No players allocated yet</p>
        ) : (
          <div className="space-y-4">
            {allocations.map((userAllocation, index) => (
              <div key={userAllocation.user.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">
                    {userAllocation.user.username} ({userAllocation.user.first_name} {userAllocation.user.last_name})
                  </h4>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">
                      {userAllocation.players ? userAllocation.players.length : 0}/5 players
                    </span>
                    <span className="text-xs text-gray-400">
                      {userAllocation.players ? userAllocation.players.filter(player => player.position === 'GK' || player.position === 'DEF').length : 0} GK/DEF, {userAllocation.players ? userAllocation.players.filter(player => player.position === 'MID' || player.position === 'FWD').length : 0} MID/FWD
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <TeamCompositionValidator 
                    players={userAllocation.players || []} 
                    availablePlayers={availablePlayers} 
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(userAllocation.players || []).map((player, playerIndex) => (
                      <div key={playerIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm font-medium">{player.name}</span>
                        <div className="flex space-x-2">
                          {player.is_captain && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">C</span>
                          )}
                          {player.is_vice_captain && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">VC</span>
                          )}
                          <span className="text-xs text-gray-500">{player.total_points} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete Draft Button */}
      {getUsersWithCompleteTeams() === 3 && getTotalAllocations() === 15 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Complete Draft?</h3>
            <p className="text-gray-600 mb-4">
              All 3 users have exactly 5 players each (15 total). Complete the draft to start simulation.
            </p>
            <button
              onClick={handleCompleteDraft}
              disabled={loading}
              className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Completing...' : 'Complete Draft'}
            </button>
          </div>
        </div>
      )}

      {/* Incomplete Teams Warning */}
      {getUsersWithIncompleteTeams() > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Teams Incomplete</h3>
            <p className="text-red-700 mb-4">
              {getUsersWithIncompleteTeams()} user(s) have fewer than 5 players. 
              All teams must have exactly 5 players before the draft can be completed.
            </p>
            <div className="text-sm text-red-600">
              Complete teams: {getUsersWithCompleteTeams()}/3
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDraftAllocation;
