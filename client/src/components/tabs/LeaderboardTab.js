import React from 'react';
import { 
  RefreshCw, 
  Trophy, 
  Medal,
  Crown,
  Target
} from 'lucide-react';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { getPositionColor } from '../../utils/helpers';

function LeaderboardTab({ liveScores, draftStatus, currentUser, allPlayers }) {
  const getPlayerDetails = (playerId) => {
    return allPlayers?.find(p => p.id === playerId) || { name: 'Unknown Player', position: 'UNK' };
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

  if (!liveScores || !draftStatus?.users) {
    return (
      <LoadingSpinner 
        size="large" 
        text="Loading live scores..." 
        className="py-8"
      />
    );
  }

  const sortedTeams = liveScores.teamScores ? [...liveScores.teamScores].sort((a, b) => b.totalScore - a.totalScore) : [];

  return (
    <div className="space-y-8">
      {/* Live Leaderboard Header */}
      <Card className="shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🏆 Championship Podium</h2>
              <p className="text-gray-600">Live scores and current standings</p>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            Gameweek {draftStatus.activeGameweek || draftStatus.currentGameweek} • Updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
        
        <div className="flex items-end justify-center space-x-4 mb-8">
          {/* 4th Place - Bench (Left) */}
          {sortedTeams[3] && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2">
                4
              </div>
              <div className="text-sm font-medium text-gray-900">
                {sortedTeams[3].username || `User ${sortedTeams[3].userId}`}
              </div>
              <div className="text-lg font-bold text-gray-600">
                {sortedTeams[3].totalScore || 0}
              </div>
            </div>
          )}
          
          {/* 2nd Place - Silver (Left) */}
          {sortedTeams[1] && (
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                2
              </div>
              <div className="text-sm font-medium text-gray-900">
                {sortedTeams[1].username || `User ${sortedTeams[1].userId}`}
              </div>
              <div className="text-xl font-bold text-gray-600">
                {sortedTeams[1].totalScore || 0}
              </div>
            </div>
          )}
          
          {/* 1st Place - Gold (Center) */}
          {sortedTeams[0] && (
            <div className="text-center">
              <div className="w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2 relative">
                1
                <Crown className="w-6 h-6 absolute -top-2 -right-2 text-yellow-300" />
              </div>
              <div className="text-sm font-medium text-gray-900">
                {sortedTeams[0].username || `User ${sortedTeams[0].userId}`}
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {sortedTeams[0].totalScore || 0}
              </div>
            </div>
          )}
          
          {/* 3rd Place - Bronze (Right) */}
          {sortedTeams[2] && (
            <div className="text-center">
              <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                3
              </div>
              <div className="text-sm font-medium text-gray-900">
                {sortedTeams[2].username || `User ${sortedTeams[2].userId}`}
              </div>
              <div className="text-xl font-bold text-orange-600">
                {sortedTeams[2].totalScore || 0}
              </div>
            </div>
          )}
          
          {/* 5th Place - Bench (Right) */}
          {sortedTeams[4] && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2">
                5
              </div>
              <div className="text-sm font-medium text-gray-900">
                {sortedTeams[4].username || `User ${sortedTeams[4].userId}`}
              </div>
              <div className="text-lg font-bold text-gray-600">
                {sortedTeams[4].totalScore || 0}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Detailed Leaderboard */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Complete Leaderboard</h3>
        
        <div className="space-y-4">
          {sortedTeams.map((team, index) => {
            const user = draftStatus.users.find(u => u.id === team.userId);
            const userTeamPlayers = user?.team ? user.team.map(playerId => getPlayerDetails(playerId)).filter(Boolean) : [];
            
            return (
              <div key={team.userId} className={`relative ${
                user?.id === currentUser?.id ? 'ring-2 ring-blue-500' : ''
              } p-4 bg-gray-50 rounded-lg`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-500' :
                      'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {team.username || user?.email || `User ${team.userId}`}
                        {user?.isAdmin && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Admin</span>}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {userTeamPlayers.length} players • {team.playerScores?.length || 0} active
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {team.totalScore || 0}
                    </div>
                    <div className="text-sm text-gray-600">points</div>
                  </div>
                </div>
                
                {/* Player Scores */}
                {team.playerScores && team.playerScores.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {team.playerScores.map((playerScore) => {
                      const player = getPlayerDetails(playerScore.playerId);
                      const playerScoreData = team?.playerScores?.find(ps => ps.playerId === player.id);
                      
                      return (
                        <div 
                          key={player.id}
                          className="p-2 bg-white rounded border text-center"
                        >
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {player.name}
                          </div>
                          <div className={`text-xs px-1 py-0.5 rounded mt-1 ${getPositionColor(player.position)}`}>
                            {player.position}
                          </div>
                          <div className="text-sm font-bold text-gray-900 mt-1">
                            {playerScoreData?.score || 0}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Updates Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Target className="w-5 h-5 text-blue-600 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Live Updates</h4>
            <p className="text-sm text-blue-700">
              Scores are updated in real-time. Refresh the page to see the latest standings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaderboardTab;
