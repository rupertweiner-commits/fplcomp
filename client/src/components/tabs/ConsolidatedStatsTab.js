import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  BarChart3,
  TrendingUp,
  Users,
  Trophy,
  Target,
  Medal,
  Crown,
  Activity
} from 'lucide-react';
import { useRefresh } from '../../contexts/RefreshContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { handleApiError } from '../../utils/errorHandler';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../utils/constants';
import { getPositionColor } from '../../utils/helpers';

function ConsolidatedStatsTab({ liveScores, draftStatus, currentUser, chelseaPlayers, leaderboard, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [activeSection, setActiveSection] = useState('leaderboard'); // 'leaderboard' or 'player-stats'

  const { registerRefreshCallback } = useRefresh();

  const fetchSimulationData = async() => {
    try {
      setLoading(true);
      const response = await fetch('/api/game?action=simulation-status');
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
      console.log('🔄 Refreshing consolidated stats data...');
      // Refresh both simulation data and parent data (Chelsea players, leaderboard)
      fetchSimulationData();
      if (onRefresh) {
        onRefresh();
      }
    });
    return cleanup;
  }, [registerRefreshCallback, onRefresh]);

  // Debug: Log when Chelsea players data changes
  useEffect(() => {
    console.log('📊 Chelsea players data updated:', chelseaPlayers?.length || 0, 'players');
  }, [chelseaPlayers]);

  const safeExtract = (obj, path, defaultValue = 0) => {
    try {
      return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const getPlayerDetails = (playerId) => {
    return chelseaPlayers?.find(p => p.id === playerId) || { name: 'Unknown Player', position: 'UNK' };
  };

  const getPositionIcon = (position) => {
    switch (position) {
      case 'GK': return '🥅';
      case 'DEF': return '🛡️';
      case 'MID': return '⚽';
      case 'FWD': return '🎯';
      default: return '❓';
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <span className="text-sm font-medium text-gray-500">#{rank}</span>;
    }
  };

  // KPG Leaderboard Section
  const renderLeaderboardSection = () => {
    if (!leaderboard || leaderboard.length === 0) {
      return (
        <Card className="p-6">
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Leaderboard Data</h3>
            <p className="text-gray-500">Start a simulation to see the leaderboard</p>
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Leaderboard Header */}
        <Card className="shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">🏆 KPG Championship Leaderboard</h2>
                <p className="text-gray-600">Current standings and performance</p>
              </div>
            </div>
            <Button
              onClick={() => {
                fetchSimulationData();
                if (onRefresh) onRefresh();
              }}
              disabled={loading}
              variant="secondary"
              size="small"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </Card>

        {/* Leaderboard Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gameweeks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.map((entry, index) => (
                  <tr key={entry.user_id} className={index < 3 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRankIcon(entry.rank)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {entry.user?.first_name?.[0] || entry.user?.email?.[0] || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.user?.first_name && entry.user?.last_name 
                              ? `${entry.user.first_name} ${entry.user.last_name}`
                              : entry.user?.email || 'Unknown User'
                            }
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {entry.totalPoints || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.gameweeksPlayed || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.averagePoints ? entry.averagePoints.toFixed(1) : '0.0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  // Chelsea Player Stats Section
  const renderPlayerStatsSection = () => {
    if (!chelseaPlayers || chelseaPlayers.length === 0) {
      return (
        <Card className="p-6">
          <div className="text-center py-8">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Player Data</h3>
            <p className="text-gray-500">Sync FPL data to see Chelsea player statistics</p>
          </div>
        </Card>
      );
    }

    // Group players by position
    const playersByPosition = chelseaPlayers.reduce((acc, player) => {
      const position = player.position || 'UNK';
      if (!acc[position]) acc[position] = [];
      acc[position].push(player);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        {/* Player Stats Header */}
        <Card className="shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-blue-500" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">📊 Chelsea Player Statistics</h2>
                <p className="text-gray-600">Current squad performance and statistics</p>
              </div>
            </div>
            <Button
              onClick={() => {
                fetchSimulationData();
                if (onRefresh) onRefresh();
              }}
              disabled={loading}
              variant="secondary"
              size="small"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </Card>

        {/* Position-based Player Stats */}
        {Object.entries(playersByPosition).map(([position, players]) => (
          <Card key={position} className="overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                {getPositionIcon(position)} {position} ({players.length} players)
              </h3>
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
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Form
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Goals
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assists
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Minutes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {players.map((player) => (
                    <tr key={player.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {player.web_name || player.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {player.first_name} {player.second_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPositionColor(player.position)}`}>
                          {player.position}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        £{((player.now_cost || 0) / 10).toFixed(1)}m
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {player.total_points || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.form || '0.0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.goals_scored || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.assists || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.minutes || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          player.is_available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {player.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

        {/* Simulation Data Summary */}
        {simulationData && (
          <Card className="bg-blue-50 border-blue-200">
            <div className="px-6 py-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Simulation Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">
                    {simulationData.current_gameweek || 1}
                  </div>
                  <div className="text-sm text-blue-700">Current Gameweek</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">
                    {simulationData.is_simulation_mode ? 'Active' : 'Inactive'}
                  </div>
                  <div className="text-sm text-blue-700">Simulation Mode</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">
                    {simulationData.total_users || 0}
                  </div>
                  <div className="text-sm text-blue-700">Total Users</div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };

  if (loading && !simulationData) {
    return (
      <LoadingSpinner 
        size="large" 
        text="Loading statistics..." 
        className="py-8"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Toggle */}
      <Card className="p-4">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveSection('leaderboard')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'leaderboard'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Trophy className="w-4 h-4 inline mr-2" />
            KPG Leaderboard
          </button>
          <button
            onClick={() => setActiveSection('player-stats')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'player-stats'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Chelsea Player Stats
          </button>
        </div>
      </Card>

      {/* Dynamic Content Based on Active Section */}
      {activeSection === 'leaderboard' ? renderLeaderboardSection() : renderPlayerStatsSection()}
    </div>
  );
}

export default ConsolidatedStatsTab;
