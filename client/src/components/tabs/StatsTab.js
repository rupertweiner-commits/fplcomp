import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  BarChart3,
  TrendingUp,
  Users,
  Trophy,
  Target
} from 'lucide-react';
import { useRefresh } from '../../contexts/RefreshContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { handleApiError } from '../../utils/errorHandler';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../utils/constants';

function StatsTab({ liveScores, draftStatus, currentUser, chelseaPlayers }) {
  const [loading, setLoading] = useState(false);
  const [simulationData, setSimulationData] = useState(null);

  const { registerRefreshCallback } = useRefresh();

  const fetchSimulationData = async() => {
    try {
      setLoading(true);
      const response = await fetch('/api/simulation?action=status');
      const data = await response.json();

      if (data.success) {
        setSimulationData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch simulation data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulationData();
  }, []);

  // Register for refresh callbacks
  useEffect(() => {
    const cleanup = registerRefreshCallback(() => {
      console.log('🔄 Refreshing stats data...');
      fetchSimulationData();
    });
    return cleanup;
  }, [registerRefreshCallback]);

  const safeExtract = (obj, path, defaultValue = 0) => {
    try {
      return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const safeExtractString = (obj, path, defaultValue = 'Unknown') => {
    try {
      return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Navigation */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Statistics</h2>
              <p className="text-gray-600">View detailed statistics and performance metrics.</p>
            </div>
          </div>

          {currentUser?.isAdmin && (
            <Button
              loading={loading}
              onClick={fetchSimulationData}
              size="small"
              variant="primary"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Stats
            </Button>
          )}
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button className="whitespace-nowrap py-2 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600">
              Overview
            </button>
            <button className="whitespace-nowrap py-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Player Stats
            </button>
            <button className="whitespace-nowrap py-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Team Performance
            </button>
          </nav>
        </div>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Players</p>
              <p className="text-2xl font-semibold text-gray-900">
                {chelseaPlayers?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Trophy className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Teams</p>
              <p className="text-2xl font-semibold text-gray-900">
                {draftStatus?.users?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Target className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Drafted Players</p>
              <p className="text-2xl font-semibold text-gray-900">
                {draftStatus?.draftedCount || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Current Gameweek</p>
              <p className="text-2xl font-semibold text-gray-900">
                {simulationData?.current_gameweek || 1}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Scores Summary */}
      {liveScores && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Scores Summary</h3>

          {liveScores.teamScores && liveScores.teamScores.length > 0 ? (
            <div className="space-y-4">
              {liveScores.teamScores
                .sort((a, b) => b.totalScore - a.totalScore)
                .slice(0, 5)
                .map((team, index) => (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" key={team.userId}>
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                              index === 2 ? 'bg-orange-500' :
                                'bg-blue-500'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {safeExtractString(team, 'username', `User ${team.userId}`)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {safeExtract(team, 'playerScores.length', 0)}
                          {' '}
                          players
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {safeExtract(team, 'totalScore', 0)}
                      </p>
                      <p className="text-sm text-gray-600">points</p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No live scores available</p>
            </div>
          )}
        </div>
      )}

      {/* Player Performance */}
      {chelseaPlayers && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Player Performance</h3>

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
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chelseaPlayers.slice(0, 10).map((player) => (
                  <tr key={player.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{player.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          player.position === 'GK' ? 'bg-green-100 text-green-800' :
                            player.position === 'DEF' ? 'bg-blue-100 text-blue-800' :
                              player.position === 'MID' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                        }`}
                      >
                        {player.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      £
                      {player.price}
                      m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          player.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {player.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Simulation Status */}
      {simulationData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Simulation Status</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Current Status</h4>
              <p className="text-lg font-semibold text-gray-900">
                {simulationData.is_simulation_mode ? 'Simulation Active' : 'Live Mode'}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Draft Status</h4>
              <p className="text-lg font-semibold text-gray-900">
                {simulationData.is_draft_complete ? 'Complete' : 'In Progress'}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Current Gameweek</h4>
              <p className="text-lg font-semibold text-gray-900">
                {simulationData.current_gameweek || 1}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Last Updated</h4>
              <p className="text-lg font-semibold text-gray-900">
                {simulationData.updated_at ?
                  new Date(simulationData.updated_at).toLocaleString() :
                  'Never'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StatsTab;
