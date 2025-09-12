import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, ExternalLink } from 'lucide-react';

function ChelseaNextGame() {
  const [nextGame, setNextGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNextGame();
  }, []);

  const fetchNextGame = async () => {
    try {
      // For now, we'll use a mock next game since we don't have a live API
      // In a real implementation, this would fetch from a fixtures API
      const mockNextGame = {
        opponent: "Brighton & Hove Albion",
        venue: "Stamford Bridge",
        date: "2024-01-15",
        time: "15:00",
        competition: "Premier League",
        isHome: true
      };
      
      setNextGame(mockNextGame);
    } catch (error) {
      console.error('Error fetching next game:', error);
    } finally {
      setLoading(false);
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

  if (!nextGame) {
    return null;
  }

  const gameDate = new Date(nextGame.date);
  const formattedDate = gameDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg mb-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span className="font-semibold">Next Game</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>{formattedDate} at {nextGame.time}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>{nextGame.isHome ? 'vs' : '@'} {nextGame.opponent}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm opacity-90">{nextGame.competition}</div>
          <div className="text-xs opacity-75">{nextGame.venue}</div>
        </div>
      </div>
    </div>
  );
}

export default ChelseaNextGame;
