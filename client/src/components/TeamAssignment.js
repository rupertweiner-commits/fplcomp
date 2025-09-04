import React, { useState, useEffect } from 'react';
import { Users, Trophy, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const TeamAssignment = ({ currentUser }) => {
  const [userTeam, setUserTeam] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchUserTeam();
      fetchAllTeams();
    }
  }, [currentUser]);

  const fetchUserTeam = async () => {
    try {
      const response = await fetch(`/api/teams/user/${currentUser.id}`);
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

  const fetchAllTeams = async () => {
    try {
      const response = await fetch('/api/teams/all');
      const data = await response.json();
      
      if (response.ok) {
        setAllTeams(data.teams);
      }
    } catch (error) {
      console.error('Failed to fetch all teams:', error);
    }
  };

  const assignTeams = async () => {
    if (!currentUser?.isAdmin) {
      setError('Only admins can assign teams');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/teams/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
          <Trophy className="inline w-8 h-8 mr-2" style={{color: '#034694'}} />
          Team Assignment
        </h2>
        <p className="text-gray-600">
          Each user gets 5 players: 2 defenders + 3 attackers
        </p>
      </div>

      {/* Admin Controls */}
      {currentUser?.isAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            👑 Admin Controls
          </h3>
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-700">{success}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          <button
            onClick={assignTeams}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            {loading ? 'Assigning Teams...' : 'Assign Teams to All Users'}
          </button>
        </div>
      )}

      {/* User's Team */}
      {userTeam && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">
            Your Team ({userTeam.totalValue}M)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTeam.players.map((player, index) => (
              <div key={player.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{player.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPositionColor(player.position)}`}>
                    {getPositionIcon(player.position)} {player.position}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Price: {player.price}M
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Teams */}
      {allTeams.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">All Teams</h3>
          
          <div className="space-y-4">
            {allTeams.map((team, index) => (
              <div key={team.user.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{team.user.name}</h4>
                  <span className="text-sm text-gray-600">
                    Total Value: {team.totalValue}M
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {team.team.map((player) => (
                    <div key={player.id} className="text-center">
                      <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPositionColor(player.position)}`}>
                        {getPositionIcon(player.position)} {player.position}
                      </div>
                      <div className="text-sm font-medium mt-1">{player.name}</div>
                      <div className="text-xs text-gray-600">{player.price}M</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
