import React, { useState } from 'react';
import { 
  Crown, 
  Shield, 
  AlertCircle, 
  TrendingUp, 
  Target, 
  Clock, 
  Users,
  Zap,
  Calendar,
  Info,
  ChevronDown,
  ChevronUp,
  Star,
  Award,
  Activity
} from 'lucide-react';

function PlayerCard({ player, showCaptainBadge = false, showViceCaptainBadge = false, compact = false }) {
  const [expanded, setExpanded] = useState(false);

  if (!player) return null;

  const getPositionColor = (position) => {
    switch (position) {
      case 'GK': return 'from-green-400 to-green-600';
      case 'DEF': return 'from-blue-400 to-blue-600';
      case 'MID': return 'from-yellow-400 to-yellow-600';
      case 'FWD': return 'from-red-400 to-red-600';
      default: return 'from-gray-400 to-gray-600';
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
      case 'Available': return 'text-green-600 bg-green-100';
      case 'Unavailable': return 'text-red-600 bg-red-100';
      case 'Doubtful': return 'text-yellow-600 bg-yellow-100';
      case 'Injured': return 'text-red-600 bg-red-100';
      case 'Suspended': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
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

  if (compact) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-gray-900">{player.web_name || player.name}</h3>
              <span className={`px-2 py-1 text-xs font-bold rounded-full bg-gradient-to-r ${getPositionColor(player.position)} text-white`}>
                {getPositionSymbol(player.position)} {player.position}
              </span>
              {showCaptainBadge && (
                <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-full flex items-center">
                  <Crown className="h-3 w-3 mr-1" />
                  Captain
                </span>
              )}
              {showViceCaptainBadge && (
                <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-full flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  Vice Captain
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">{player.total_points || 0}</div>
            <div className="text-xs text-gray-500">pts • {player.price || 0}M</div>
          </div>
        </div>
        {player.availability_status && player.availability_status !== 'Available' && (
          <div className="mt-2 text-xs text-red-600 font-medium">
            {player.availability_status}: {player.availability_reason || 'No details available'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden">
      {/* Card Header with Gradient */}
      <div className={`h-24 bg-gradient-to-r ${getPositionColor(player.position)} relative`}>
        {/* Position Symbol in Corner */}
        <div className="absolute top-2 left-3 text-2xl">
          {getPositionSymbol(player.position)}
        </div>
        
        {/* Captain/Vice Captain Badges */}
        <div className="absolute top-2 right-3 flex space-x-1">
          {showCaptainBadge && (
            <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center">
              <Crown className="h-3 w-3 mr-1" />
              C
            </div>
          )}
          {showViceCaptainBadge && (
            <div className="bg-purple-400 text-purple-900 px-2 py-1 rounded-full text-xs font-bold flex items-center">
              <Shield className="h-3 w-3 mr-1" />
              VC
            </div>
          )}
        </div>

        {/* Player Name and Position */}
        <div className="absolute bottom-2 left-3 right-3">
          <h3 className="text-white font-bold text-lg drop-shadow-lg">
            {player.web_name || player.name}
          </h3>
          <p className="text-white/90 text-sm drop-shadow">
            {player.first_name} {player.second_name} • {player.position_name || player.position}
          </p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{player.total_points || 0}</div>
            <div className="text-xs text-gray-600 font-medium">Points</div>
          </div>
          <div className="text-center bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{player.price || 0}M</div>
            <div className="text-xs text-gray-600 font-medium">Price</div>
          </div>
          <div className="text-center bg-purple-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600">{formatNumber(player.form)}</div>
            <div className="text-xs text-gray-600 font-medium">Form</div>
          </div>
          <div className="text-center bg-orange-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600">{formatPercent(player.selected_by_percent)}</div>
            <div className="text-xs text-gray-600 font-medium">Selected</div>
          </div>
        </div>

        {/* Key Performance Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Goals</span>
              <span className="font-bold text-gray-900">{player.goals_scored || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Assists</span>
              <span className="font-bold text-gray-900">{player.assists || 0}</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Clean Sheets</span>
              <span className="font-bold text-gray-900">{player.clean_sheets || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Saves</span>
              <span className="font-bold text-gray-900">{player.saves || 0}</span>
            </div>
          </div>
        </div>

        {/* Availability Status */}
        {player.availability_status && player.availability_status !== 'Available' && (
          <div className={`mb-4 p-3 rounded-lg border-2 ${getAvailabilityColor(player.availability_status)}`}>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-bold text-sm">
                {player.availability_status}
              </span>
            </div>
            {player.availability_reason && (
              <p className="text-xs mt-1 opacity-90">{player.availability_reason}</p>
            )}
            {(player.chance_of_playing_this_round || player.chance_of_playing_next_round) && (
              <div className="mt-2 text-xs">
                {player.chance_of_playing_this_round && (
                  <span>This round: {player.chance_of_playing_this_round}%</span>
                )}
                {player.chance_of_playing_this_round && player.chance_of_playing_next_round && (
                  <span className="mx-2">•</span>
                )}
                {player.chance_of_playing_next_round && (
                  <span>Next: {player.chance_of_playing_next_round}%</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expandable Details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center space-x-2 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <span className="text-sm font-medium">
            {expanded ? 'Hide Details' : 'Show All Stats'}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Expanded Stats */}
        {expanded && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Attacking Stats */}
              <div className="space-y-2">
                <h5 className="font-bold text-gray-700 text-sm flex items-center">
                  <Target className="h-4 w-4 mr-1" />
                  Attacking
                </h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Goals:</span>
                    <span className="font-bold">{player.goals_scored || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Assists:</span>
                    <span className="font-bold">{player.assists || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bonus:</span>
                    <span className="font-bold">{player.bonus || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Threat:</span>
                    <span className="font-bold">{formatNumber(player.threat)}</span>
                  </div>
                </div>
              </div>

              {/* Defensive Stats */}
              <div className="space-y-2">
                <h5 className="font-bold text-gray-700 text-sm flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  Defensive
                </h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Clean Sheets:</span>
                    <span className="font-bold">{player.clean_sheets || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Goals Conceded:</span>
                    <span className="font-bold">{player.goals_conceded || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saves:</span>
                    <span className="font-bold">{player.saves || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Influence:</span>
                    <span className="font-bold">{formatNumber(player.influence)}</span>
                  </div>
                </div>
              </div>

              {/* Minutes & Discipline */}
              <div className="space-y-2">
                <h5 className="font-bold text-gray-700 text-sm flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Minutes & Cards
                </h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minutes:</span>
                    <span className="font-bold">{player.minutes || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Starts:</span>
                    <span className="font-bold">{player.starts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Yellow:</span>
                    <span className="font-bold">{player.yellow_cards || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Red:</span>
                    <span className="font-bold">{player.red_cards || 0}</span>
                  </div>
                </div>
              </div>

              {/* Advanced Stats */}
              <div className="space-y-2">
                <h5 className="font-bold text-gray-700 text-sm flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Advanced
                </h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">BPS:</span>
                    <span className="font-bold">{player.bps || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Creativity:</span>
                    <span className="font-bold">{formatNumber(player.creativity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ICT Index:</span>
                    <span className="font-bold">{formatNumber(player.ict_index)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Penalties Saved:</span>
                    <span className="font-bold">{player.penalties_saved || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* News Section */}
            {player.news && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h5 className="font-bold text-blue-900 text-sm mb-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Latest News
                </h5>
                <p className="text-xs text-blue-800">{player.news}</p>
                {player.news_added && (
                  <p className="text-xs text-blue-600 mt-1">
                    Added: {new Date(player.news_added).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerCard;
