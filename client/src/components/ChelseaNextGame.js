import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle } from 'lucide-react';

function ChelseaNextGame() {
  const [nextGame, setNextGame] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [canMakeChanges, setCanMakeChanges] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNextGame();
    // Refresh every minute to update deadline status
    const interval = setInterval(fetchNextGame, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchNextGame = async () => {
    try {
      const response = await fetch('/api/chelsea-fixtures');
      const data = await response.json();

      if (data.success) {
        setNextGame(data.data.nextGame);
        setDeadline(data.data.deadline);
        setCanMakeChanges(data.data.canMakeChanges);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch next game');
      }
    } catch (error) {
      console.error('Error fetching next game:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatKickoffTime = (kickoffTime) => {
    if (!kickoffTime) return 'TBD';
    const date = new Date(kickoffTime);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }) + ' at ' + date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Deadline passed';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m remaining`;
    } else {
      return `${diffMinutes}m remaining`;
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-600 text-white p-4 rounded-lg mb-6">
        <div className="flex items-center justify-center">
          <div className="animate-pulse">Loading next game...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-600 text-white p-4 rounded-lg mb-6">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load next game: {error}</span>
        </div>
      </div>
    );
  }

  if (!nextGame) {
    return (
      <div className="bg-gray-600 text-white p-4 rounded-lg mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>No upcoming games scheduled</span>
        </div>
      </div>
    );
  }

  const deadlineText = formatDeadline(deadline);
  const isDeadlinePassed = deadline && new Date() >= new Date(deadline);

  return (
    <div className={`${canMakeChanges ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-red-600 to-red-700'} text-white p-4 rounded-lg mb-6 shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span className="font-semibold">Next Game</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>{formatKickoffTime(nextGame.kickoff_time)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>{nextGame.is_home ? 'vs' : '@'} {nextGame.opponent}</span>
          </div>
          {deadlineText && (
            <div className="flex items-center space-x-2">
              {isDeadlinePassed ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span className="text-sm">
                {isDeadlinePassed ? 'Changes locked' : deadlineText}
              </span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm opacity-90">Gameweek {nextGame.gameweek}</div>
          <div className="text-xs opacity-75">{nextGame.venue}</div>
        </div>
      </div>
    </div>
  );
}

export default ChelseaNextGame;
