import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calendar, 
  Trophy, 
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Users,
  Award,
  Activity
} from 'lucide-react';

function GameweekHistory({ currentUser, season = '2024-25' }) {
  const [userHistory, setUserHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGameweek, setSelectedGameweek] = useState(null);
  const [viewMode, setViewMode] = useState('scores'); // 'scores', 'transfers', 'chips'

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserHistory();
    }
  }, [currentUser?.id, season]);

  const fetchUserHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/gameweek-scores?action=get-user-history&userId=${currentUser.id}&season=${season}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch user history');
      }

      setUserHistory(data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch user history:', err);
      setError('Failed to load your gameweek history');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (change) => {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const calculateAverageScore = () => {
    if (!userHistory?.scores || userHistory.scores.length === 0) return 0;
    const total = userHistory.scores.reduce((sum, score) => sum + (score.total_points || 0), 0);
    return (total / userHistory.scores.length).toFixed(1);
  };

  const getBestGameweek = () => {
    if (!userHistory?.scores || userHistory.scores.length === 0) return null;
    return userHistory.scores.reduce((best, current) => 
      (current.total_points || 0) > (best.total_points || 0) ? current : best
    );
  };

  const getWorstGameweek = () => {
    if (!userHistory?.scores || userHistory.scores.length === 0) return null;
    return userHistory.scores.reduce((worst, current) => 
      (current.total_points || 0) < (worst.total_points || 0) ? current : best
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading your gameweek history...</span>
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

  if (!userHistory || !userHistory.scores || userHistory.scores.length === 0) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Gameweek History</h3>
        <p className="text-gray-500">Your gameweek scores will appear here once the season starts.</p>
      </div>
    );
  }

  const averageScore = calculateAverageScore();
  const bestGameweek = getBestGameweek();
  const worstGameweek = getWorstGameweek();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Your Gameweek History</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('scores')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                viewMode === 'scores' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Scores
            </button>
            <button
              onClick={() => setViewMode('transfers')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                viewMode === 'transfers' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Transfers
            </button>
            <button
              onClick={() => setViewMode('chips')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                viewMode === 'chips' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Chips
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {userHistory.totals?.total_points || 0}
            </div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {averageScore}
            </div>
            <div className="text-sm text-gray-600">Average Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {userHistory.scores.length}
            </div>
            <div className="text-sm text-gray-600">Gameweeks Played</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {userHistory.totals?.current_rank || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Current Rank</div>
          </div>
        </div>
      </div>

      {/* Best/Worst Gameweeks */}
      {(bestGameweek || worstGameweek) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestGameweek && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Trophy className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="font-semibold text-green-800">Best Gameweek</h3>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {bestGameweek.total_points} points
              </div>
              <div className="text-sm text-green-700">
                Gameweek {bestGameweek.gameweek}
              </div>
            </div>
          )}

          {worstGameweek && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Target className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="font-semibold text-red-800">Worst Gameweek</h3>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {worstGameweek.total_points} points
              </div>
              <div className="text-sm text-red-700">
                Gameweek {worstGameweek.gameweek}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scores View */}
      {viewMode === 'scores' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Gameweek Scores</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gameweek
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Captain Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bench Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userHistory.scores.map((score, index) => {
                  const previousScore = index > 0 ? userHistory.scores[index - 1].total_points : null;
                  const change = previousScore ? score.total_points - previousScore : 0;
                  
                  return (
                    <tr key={score.gameweek} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        GW{score.gameweek}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-semibold text-blue-600">
                          {score.total_points}
                        </div>
                        <div className="text-xs text-gray-500">
                          {score.starting_xi_points} starting XI
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {score.captain_points || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {score.bench_points || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {score.rank_this_gameweek || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getTrendIcon(change)}
                          <span className={`ml-1 text-sm ${getTrendColor(change)}`}>
                            {change > 0 ? `+${change}` : change}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfers View */}
      {viewMode === 'transfers' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Transfer History</h3>
          </div>
          {userHistory.transfers && userHistory.transfers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gameweek
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userHistory.transfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        GW{transfer.gameweek}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.player_out_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.player_in_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.transfer_cost} points
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transfer.is_free_transfer 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transfer.is_free_transfer ? 'Free' : 'Paid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No transfers made yet</p>
            </div>
          )}
        </div>
      )}

      {/* Chips View */}
      {viewMode === 'chips' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Chip Usage History</h3>
          </div>
          {userHistory.chips && userHistory.chips.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gameweek
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chip Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Points Gained
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team Value Before
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team Value After
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userHistory.chips.map((chip) => (
                    <tr key={chip.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        GW{chip.gameweek}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          {chip.chip_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        +{chip.points_gained || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        £{chip.team_value_before || 0}m
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        £{chip.team_value_after || 0}m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No chips used yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GameweekHistory;
