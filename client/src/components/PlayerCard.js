import React, { useState } from 'react';
import { 
  Crown, 
  Shield, 
  Clock, 
  ChevronDown,
  ChevronUp
} from 'lucide-react';

function PlayerCard({ player, showCaptainBadge = false, showViceCaptainBadge = false, compact = false, onPlayerClick = null }) {
  const [expanded, setExpanded] = useState(false);

  if (!player) return null;

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

  const getInjuryEmoji = (status) => {
    switch (status) {
      case 'Injured': return '🤕';
      case 'Suspended': return '🚫';
      case 'Doubtful': return '⚠️';
      case 'Unavailable': return '❌';
      default: return null;
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

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${getPositionColor(player.position)} relative`}>
              {getPositionSymbol(player.position)}
              {/* Injury emoji overlay */}
              {getInjuryEmoji(player.availability_status) && (
                <span className="absolute -top-1 -right-1 text-xs">
                  {getInjuryEmoji(player.availability_status)}
                </span>
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900 text-sm">
                {player.web_name || player.name}
              </div>
              <div className="text-xs text-gray-500">{player.position}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-gray-900">{player.total_points || 0}</div>
            <div className="text-xs text-gray-500">£{player.price || 0}M</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => onPlayerClick && onPlayerClick(player)}
    >
      {/* Card Header */}
      <div className={`h-16 bg-gradient-to-r ${getPositionColor(player.position)} relative`}>
        {/* Player Name */}
        <div className="absolute bottom-2 left-3 right-16">
          <h3 className="text-white font-bold text-base truncate">
            {player.web_name || player.name}
          </h3>
          <p className="text-white/90 text-xs">
            {player.position}
          </p>
        </div>
        
        {/* Captain Badge - Top Right */}
        <div className="absolute top-2 right-3 flex space-x-1">
          {showCaptainBadge && (
            <div className="bg-yellow-400 text-yellow-900 p-1 rounded-full">
              <Crown className="h-3 w-3" />
            </div>
          )}
        </div>

        {/* Position Symbol and Injury Status - Bottom Right */}
        <div className="absolute bottom-2 right-3 flex items-center space-x-1">
          {/* Injury emoji if present */}
          {getInjuryEmoji(player.availability_status) && (
            <span className="text-lg drop-shadow-sm">
              {getInjuryEmoji(player.availability_status)}
            </span>
          )}
          {/* Position emoji */}
          <span className="text-white text-xl drop-shadow-sm">
            {getPositionSymbol(player.position)}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Key Stats - Clean 2-column layout */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{player.total_points || 0}</div>
            <div className="text-xs text-gray-500">Points</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{player.form || 0}</div>
            <div className="text-xs text-gray-500">Form</div>
          </div>
        </div>

        {/* Performance Stats - Clean 4-column layout */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{player.goals_scored || 0}</div>
            <div className="text-xs text-gray-500">Goals</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{player.assists || 0}</div>
            <div className="text-xs text-gray-500">Assists</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{player.clean_sheets || 0}</div>
            <div className="text-xs text-gray-500">CS</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{player.saves || 0}</div>
            <div className="text-xs text-gray-500">Saves</div>
          </div>
        </div>

        {/* Availability Status - Fixed height for consistent card sizing */}
        <div className="mb-3 h-8 flex items-center">
          {player.availability_status && player.availability_status !== 'Available' && (
            <div className={`p-2 rounded-lg border ${getAvailabilityColor(player.availability_status)} flex items-center space-x-2 w-full`}>
              <Clock className="h-3 w-3" />
              <span className="text-sm font-medium truncate">{player.availability_status}</span>
            </div>
          )}
        </div>

        {/* Expandable Details - Smaller button */}
        <button 
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center space-x-1 py-1 text-gray-500 hover:text-gray-700 transition-colors text-xs"
        >
          <span>{expanded ? 'Hide Details' : 'Show All Stats'}</span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {/* Expanded Stats - More compact */}
        {expanded && (
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Attacking Stats */}
              <div>
                <h4 className="font-medium text-gray-800 mb-2 text-xs">Attacking</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Goals:</span>
                    <span className="font-medium">{player.goals_scored || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Assists:</span>
                    <span className="font-medium">{player.assists || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bonus:</span>
                    <span className="font-medium">{player.bonus || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Threat:</span>
                    <span className="font-medium">{player.threat || 0}</span>
                  </div>
                </div>
              </div>

              {/* Defensive Stats */}
              <div>
                <h4 className="font-medium text-gray-800 mb-2 text-xs">Defensive</h4>
                <div className="space-y-1 text-xs">
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
                    <span className="font-medium">{player.influence || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* News Section - Only if exists */}
            {player.news && (
              <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-1 text-xs">Latest News</h4>
                <p className="text-xs text-gray-600">{player.news}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerCard;