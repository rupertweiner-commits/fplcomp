import React, { useState, useEffect } from 'react';
import { Users, Trophy, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../config/supabase';

const TeamAssignment = ({ currentUser }) => {
  const [userTeam, setUserTeam] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchUserTeam();
      fetchAllTeams();
      fetchAllocations();
    }
  }, [currentUser]);

  const fetchUserTeam = async() => {
    try {
      const response = await fetch(`/api/teams?action=user&userId=${currentUser.id}`);
      const data = await response.json();

      if (response.ok) {
        setUserTeam(data.team);
      } else {
        setUserTeam(null);
      }
    } catch (error) {
      console.error('Failed to fetch user team:', error);
    }
  };

  const fetchAllTeams = async() => {
    try {
      const response = await fetch('/api/teams?action=all');
      const data = await response.json();

      if (response.ok) {
        setAllTeams(data.teams);
      }
    } catch (error) {
      console.error('Failed to fetch all teams:', error);
    }
  };

  const fetchAllocations = async() => {
    try {
      const response = await fetch('/api/users?action=validate-all-teams', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      const data = await response.json();

      if (response.ok) {
        setAllocations(data.data.allocations);
      }
    } catch (error) {
      console.error('Failed to fetch allocations:', error);
    }
  };

  const assignTeams = async() => {
    if (!currentUser?.isAdmin) {
      setError('Only admins can assign teams');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/teams?action=assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Teams assigned successfully!');
        fetchUserTeam();
        fetchAllTeams();
      } else {
        setError(data.error || 'Failed to assign teams');
      }
    } catch (error) {
      setError('Failed to assign teams');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          <Trophy className="inline w-8 h-8 mr-2" style={{ color: '#034694' }} />
          Draft Allocations
        </h2>
        <p className="text-gray-600">
          View current player allocations from the offline draft
        </p>
      </div>

      {/* Admin Notice */}
      {currentUser?.isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            👑 Admin Notice
          </h3>
          <p className="text-blue-800 mb-3">
            Use the "Admin Allocation" tab to manually allocate players to users from the offline draft.
          </p>
          <div className="text-sm text-blue-700">
            <p>• Each user should have exactly 5 players</p>
            <p>• Allocations are tracked in the database with transfer/chip support</p>
            <p>• Players can be moved between users via transfers and chips</p>
          </div>
        </div>
      )}

      {/* User's Team */}
      {userTeam && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">
            Your Team (
            {userTeam.totalValue}
            M)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTeam.players.map((player, index) => (
              <div className="border rounded-lg p-3" key={player.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{player.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPositionColor(player.position)}`}>
                    {getPositionIcon(player.position)}
                    {' '}
                    {player.position}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Price:
                  {' '}
                  {player.price}
                  M
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Draft Allocations */}
      {allocations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Draft Allocations</h3>

          <div className="space-y-4">
            {Object.entries(
              allocations.reduce((acc, allocation) => {
                const userId = allocation.target_user_id;

                if (!acc[userId]) {
                  acc[userId] = {
                    user: allocation.target_user,
                    allocations: []
                  };
                }
                acc[userId].allocations.push(allocation);
                return acc;
              }, {})
            ).map(([userId, userData]) => {
              const totalValue = userData.allocations.reduce((sum, a) => sum + parseFloat(a.player_price), 0);

              return (
                <div className="border rounded-lg p-4" key={userId}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">
                      {userData.user.first_name}
                      {' '}
                      {userData.user.last_name}
                    </h4>
                    <span className="text-sm text-gray-600">
                      {userData.allocations.length}
                      /5 players • Total Value:
                      {totalValue.toFixed(1)}
                      M
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {userData.allocations.map((allocation) => (
                      <div className="text-center" key={allocation.id}>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPositionColor(allocation.player_position)}`}>
                          {getPositionIcon(allocation.player_position)}
                          {' '}
                          {allocation.player_position}
                        </div>
                        <div className="text-sm font-medium mt-1">{allocation.player_name}</div>
                        <div className="text-xs text-gray-600">
                          {allocation.player_price}
                          M
                        </div>
                        <div className="text-xs text-gray-500">
                          R
                          {allocation.allocation_round}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Teams Assigned */}
      {!userTeam && allTeams.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>No teams have been assigned yet.</p>
          {currentUser?.isAdmin && (
            <p className="mt-2">Click "Assign Teams" above to get started!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamAssignment;
