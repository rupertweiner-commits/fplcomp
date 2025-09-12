import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trophy, 
  Target, 
  TrendingUp, 
  Crown,
  Award,
  BarChart3,
  Calendar,
  User,
  Star
} from 'lucide-react';

function GameweekBreakdown({ currentUser, gameweek, season = '2024-25' }) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('players'); // 'players', 'users', 'ownership'

  useEffect(() => {
    if (gameweek) {
      fetchGameweekBreakdown();
    }
  }, [gameweek, season]);

  const fetchGameweekBreakdown = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/player-ownership-scores?action=get-gameweek-breakdown&gameweek=${gameweek}&season=${season}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch gameweek breakdown');
      }

      setBreakdown(data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch gameweek breakdown:', err);
      setError('Failed to load gameweek breakdown');
    } finally {
      setLoading(false);
    }
  };

  const getPositionColor = (position) => {
    switch (position) {
      case 'GK': return 'bg-green-100 text-green-800';
      case 'DEF': return 'bg-blue-100 text-blue-800';
      case 'MID': return 'bg-yellow-100 text-yellow-800';
      case 'FWD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Award className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Award className="w-4 h-4 text-orange-500" />;
    return <span className="text-sm font-medium text-gray-600">#{rank}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading gameweek breakdown...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 mr-2">⚠️</div>
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  if (!breakdown) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">No gameweek breakdown data found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Gameweek {breakdown.gameweek} Breakdown
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('players')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                viewMode === 'players' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Players
            </button>
            <button
              onClick={() => setViewMode('users')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                viewMode === 'users' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              User Scores
            </button>
            <button
              onClick={() => setViewMode('ownership')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                viewMode === 'ownership' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Ownership
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {breakdown.total_players}
            </div>
            <div className="text-sm text-gray-600">Players</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {breakdown.total_owners}
            </div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {breakdown.players.reduce((sum, p) => sum + p.total_owners, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Ownership</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {breakdown.players.reduce((sum, p) => sum + p.captain_owners, 0)}
            </div>
            <div className="text-sm text-gray-600">Captain Picks</div>
          </div>
        </div>
      </div>

      {/* Players View */}
      {viewMode === 'players' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Player Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Goals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assists
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clean Sheets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owners
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Captains
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {breakdown.players.map((player, index) => (
                  <tr key={player.player_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {player.player?.name || player.player_name}
                        </div>
                        {index < 3 && (
                          <div className="ml-2">
                            {getRankIcon(index + 1)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPositionColor(player.position)}`}>
                        {player.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {player.total_points}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.goals_scored}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.assists}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.clean_sheets}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-1" />
                        {player.total_owners}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Crown className="w-4 h-4 text-yellow-500 mr-1" />
                        {player.captain_owners}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Scores View */}
      {viewMode === 'users' && (
        <div className="space-y-4">
          {breakdown.players
            .filter(player => player.ownership.length > 0)
            .map(player => (
              <div key={player.player_id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {player.player?.name || player.player_name}
                    </h4>
                    <span className={`ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPositionColor(player.position)}`}>
                      {player.position}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {player.total_points} pts
                    </div>
                    <div className="text-sm text-gray-500">
                      {player.goals_scored}G {player.assists}A {player.clean_sheets}CS
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {player.ownership.map((owner, index) => (
                    <div key={`${owner.user_id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">
                          {owner.user?.first_name} {owner.user?.last_name}
                        </span>
                        {owner.is_captain && (
                          <Crown className="w-4 h-4 text-yellow-500 ml-2" title="Captain" />
                        )}
                        {owner.is_vice_captain && (
                          <Star className="w-4 h-4 text-blue-500 ml-2" title="Vice Captain" />
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {owner.is_captain ? player.total_points * 2 :
                           owner.is_vice_captain ? player.total_points * 1.5 :
                           player.total_points} pts
                        </div>
                        <div className="text-xs text-gray-500">
                          {owner.is_captain ? 'Captain (2x)' :
                           owner.is_vice_captain ? 'Vice (1.5x)' :
                           'Regular'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Ownership View */}
      {viewMode === 'ownership' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Ownership Distribution</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {breakdown.players
                .filter(player => player.total_owners > 0)
                .map(player => (
                  <div key={player.player_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {player.player?.name || player.player_name}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPositionColor(player.position)}`}>
                        {player.position}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {player.total_points} pts
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Total Owners:</span>
                        <span className="font-medium">{player.total_owners}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Captains:</span>
                        <span className="font-medium text-yellow-600">{player.captain_owners}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vice Captains:</span>
                        <span className="font-medium text-blue-600">{player.vice_captain_owners}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameweekBreakdown;
