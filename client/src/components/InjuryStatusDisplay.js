import React from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, Info } from 'lucide-react';

function InjuryStatusDisplay({ player }) {
  if (!player) return null;

  const getStatusInfo = () => {
    const status = player.status;
    const chanceThisRound = player.chance_of_playing_this_round;
    const chanceNextRound = player.chance_of_playing_next_round;
    const news = player.news;

    // Determine status display
    if (status === 'a') {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
        text: 'Available',
        color: 'text-green-800',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else if (status === 'i') {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        text: 'Injured',
        color: 'text-red-800',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    } else if (status === 's') {
      return {
        icon: <XCircle className="h-4 w-4 text-orange-600" />,
        text: 'Suspended',
        color: 'text-orange-800',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    } else if (status === 'u') {
      return {
        icon: <Info className="h-4 w-4 text-gray-600" />,
        text: 'Unavailable',
        color: 'text-gray-800',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      };
    } else {
      return {
        icon: <Clock className="h-4 w-4 text-yellow-600" />,
        text: 'Unknown',
        color: 'text-yellow-800',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    }
  };

  const getChanceDisplay = () => {
    const chanceThisRound = player.chance_of_playing_this_round;
    const chanceNextRound = player.chance_of_playing_next_round;

    if (chanceThisRound !== null && chanceThisRound !== undefined) {
      return {
        thisRound: `${chanceThisRound}%`,
        nextRound: chanceNextRound ? `${chanceNextRound}%` : 'N/A',
        isDoubtful: chanceThisRound < 75
      };
    }
    return null;
  };

  const getInjuryType = () => {
    if (!player.news) return null;
    
    const news = player.news.toLowerCase();
    if (news.includes('hamstring')) return 'Hamstring';
    if (news.includes('knee')) return 'Knee';
    if (news.includes('ankle')) return 'Ankle';
    if (news.includes('muscle')) return 'Muscle';
    if (news.includes('suspension') || news.includes('suspended')) return 'Suspension';
    if (news.includes('illness') || news.includes('sick')) return 'Illness';
    return 'Other';
  };

  const statusInfo = getStatusInfo();
  const chanceInfo = getChanceDisplay();
  const injuryType = getInjuryType();

  return (
    <div className={`p-3 rounded-md border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {statusInfo.icon}
          <span className={`text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>
        {injuryType && (
          <span className={`text-xs px-2 py-1 rounded ${statusInfo.bgColor} ${statusInfo.color}`}>
            {injuryType}
          </span>
        )}
      </div>

      {chanceInfo && (
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>This Round:</span>
            <span className={chanceInfo.isDoubtful ? 'text-yellow-600 font-medium' : ''}>
              {chanceInfo.thisRound}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Next Round:</span>
            <span>{chanceInfo.nextRound}</span>
          </div>
        </div>
      )}

      {player.news && (
        <div className="mt-2 text-xs text-gray-600">
          <div className="font-medium mb-1">Latest News:</div>
          <div className="italic">{player.news}</div>
          {player.news_added && (
            <div className="text-xs text-gray-500 mt-1">
              Updated: {new Date(player.news_added).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Strategic insight for injured players */}
      {statusInfo.text === 'Injured' && chanceInfo && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
          <div className="font-medium text-blue-800 mb-1">💡 Strategic Insight:</div>
          <div className="text-blue-700">
            {chanceInfo.isDoubtful ? (
              <>This player might be a good long-term pick if you can wait for their return.</>
            ) : (
              <>This player is likely to return soon - consider adding them to your squad.</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default InjuryStatusDisplay;
