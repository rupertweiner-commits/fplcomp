import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  Shield, 
  Clock, 
  TrendingUp, 
  Target, 
  Users,
  Award,
  Activity,
  Calendar,
  BarChart3
} from 'lucide-react';

function PlayerProfile({ player, isOpen, onClose, showCaptainBadge = false, showViceCaptainBadge = false }) {
  const [activeTab, setActiveTab] = useState('history');

  if (!isOpen || !player) return null;

  const getPositionColor = (position) => {
    switch (position) {
      case 'GK': return 'from-green-500 to-green-600';
      case 'DEF': return 'from-blue-500 to-blue-600';
      case 'MID': return 'from-yellow-500 to-yellow-600';
      case 'FWD': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getPositionSymbol = (position) => {
    switch (position) {
      case 'GK': return '🥅';
      case 'DEF': return '🛡️';
      case 'MID': return '⚽';
      case 'FWD': return '🎯';
      default: return '⚽';
    }
  };

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'Available': return 'text-green-700 bg-green-100 border-green-200';
      case 'Unavailable': return 'text-red-700 bg-red-100 border-red-200';
      case 'Doubtful': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'Injured': return 'text-red-700 bg-red-100 border-red-200';
      case 'Suspended': return 'text-orange-700 bg-orange-100 border-orange-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return typeof num === 'number' ? num.toFixed(1) : num;
  };

  const formatPercent = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return typeof num === 'number' ? `${num}%` : num;
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`h-32 bg-gradient-to-r ${getPositionColor(player.position)} relative rounded-t-2xl`}>
          {/* Close Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 transition-all z-10"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Player Image Placeholder */}
          <div className="absolute left-6 top-6 w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl">
            {getPositionSymbol(player.position)}
          </div>

          {/* Player Details */}
          <div className="absolute left-32 top-6 right-6">
            <div className="text-white/80 text-sm font-medium">{player.position_name || player.position}</div>
            <div className="text-white text-2xl font-bold">{player.first_name}</div>
            <div className="text-white text-3xl font-bold">{player.second_name}</div>
            <div className="text-white/80 text-sm">Chelsea</div>
            
            {/* Captain/Vice Captain Badges */}
            <div className="flex space-x-2 mt-2">
              {showCaptainBadge && (
                <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold flex items-center">
                  <Crown className="h-4 w-4 mr-1" />
                  Captain
                </div>
              )}
              {showViceCaptainBadge && (
                <div className="bg-purple-400 text-purple-900 px-3 py-1 rounded-full text-sm font-bold flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  Vice Captain
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Statistics */}
        <div className="p-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{player.total_points || 0}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{formatNumber(player.form)}</div>
              <div className="text-sm text-gray-600">Form</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{formatNumber(player.points_per_game)}</div>
              <div className="text-sm text-gray-600">Pts / Match</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{player.bonus || 0}</div>
              <div className="text-sm text-gray-600">Total Bonus</div>
            </div>
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-gray-900">{player.ict_index || 0}</div>
              <div className="text-sm text-gray-600">ICT Index</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-gray-900">{player.minutes || 0}</div>
              <div className="text-sm text-gray-600">Minutes</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-gray-900">{player.starts || 0}</div>
              <div className="text-sm text-gray-600">Starts</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-gray-900">{player.goals_scored || 0}</div>
              <div className="text-sm text-gray-600">Goals</div>
            </div>
          </div>

          {/* Availability Status */}
          {player.availability_status && player.availability_status !== 'Available' && (
            <div className={`mb-6 p-4 rounded-lg border ${getAvailabilityColor(player.availability_status)}`}>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span className="font-medium text-lg">{player.availability_status}</span>
              </div>
              {player.availability_reason && (
                <p className="mt-2 text-sm opacity-90">{player.availability_reason}</p>
              )}
              {player.chance_of_playing_this_round && player.chance_of_playing_this_round > 0 && (
                <p className="mt-1 text-sm opacity-90">
                  {player.chance_of_playing_this_round}% chance this round
                </p>
              )}
            </div>
          )}

          {/* Performance Stats */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Statistics</h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Attacking Stats */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Attacking
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Goals Scored:</span>
                    <span className="font-medium">{player.goals_scored || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Assists:</span>
                    <span className="font-medium">{player.assists || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bonus Points:</span>
                    <span className="font-medium">{player.bonus || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Threat:</span>
                    <span className="font-medium">{formatNumber(player.threat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Creativity:</span>
                    <span className="font-medium">{formatNumber(player.creativity)}</span>
                  </div>
                </div>
              </div>

              {/* Defensive Stats */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Defensive
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Clean Sheets:</span>
                    <span className="font-medium">{player.clean_sheets || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Goals Conceded:</span>
                    <span className="font-medium">{player.goals_conceded || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saves:</span>
                    <span className="font-medium">{player.saves || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Influence:</span>
                    <span className="font-medium">{formatNumber(player.influence)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">BPS:</span>
                    <span className="font-medium">{player.bps || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Discipline & Advanced Stats */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Discipline */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Award className="h-4 w-4 mr-2" />
                  Discipline
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Yellow Cards:</span>
                    <span className="font-medium">{player.yellow_cards || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Red Cards:</span>
                    <span className="font-medium">{player.red_cards || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Penalties Saved:</span>
                    <span className="font-medium">{player.penalties_saved || 0}</span>
                  </div>
                </div>
              </div>

              {/* Advanced Stats */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Advanced
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ICT Index:</span>
                    <span className="font-medium">{formatNumber(player.ict_index)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected Goals:</span>
                    <span className="font-medium">{formatNumber(player.expected_goals)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected Assists:</span>
                    <span className="font-medium">{formatNumber(player.expected_assists)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected Goal Involvement:</span>
                    <span className="font-medium">{formatNumber(player.expected_goal_involvements)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* News Section */}
          {player.news && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Latest News</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{player.news}</p>
                {player.news_added && (
                  <p className="text-sm text-gray-500 mt-2">
                    Added: {new Date(player.news_added).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Season History Table */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Season History</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">GW</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Opponent</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">PTS</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">ST</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">MP</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">GS</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">A</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">CS</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">GC</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Saves</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {/* Sample data - in real app, this would come from API */}
                      <tr>
                        <td className="px-4 py-3 font-medium">3</td>
                        <td className="px-4 py-3">FUL (H)</td>
                        <td className="px-4 py-3 font-bold text-green-600">6</td>
                        <td className="px-4 py-3">1</td>
                        <td className="px-4 py-3">90</td>
                        <td className="px-4 py-3">0</td>
                        <td className="px-4 py-3">0</td>
                        <td className="px-4 py-3">1</td>
                        <td className="px-4 py-3">0</td>
                        <td className="px-4 py-3">2</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">2</td>
                        <td className="px-4 py-3">WHU (A)</td>
                        <td className="px-4 py-3 font-bold text-green-600">3</td>
                        <td className="px-4 py-3">1</td>
                        <td className="px-4 py-3">90</td>
                        <td className="px-4 py-3">0</td>
                        <td className="px-4 py-3">0</td>
                        <td className="px-4 py-3">0</td>
                        <td className="px-4 py-3">1</td>
                        <td className="px-4 py-3">1</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">1</td>
                        <td className="px-4 py-3">CRY (H)</td>
                        <td className="px-4 py-3 font-bold text-green-600">8</td>
                        <td className="px-4 py-3">1</td>
                        <td className="px-4 py-3">90</td>
                        <td className="px-4 py-3">0</td>
                        <td className="px-4 py-3">0</td>
                        <td className="px-4 py-3">1</td>
                        <td className="px-4 py-3">0</td>
                        <td className="px-4 py-3">3</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerProfile;
