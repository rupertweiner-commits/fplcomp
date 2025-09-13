import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Trophy, 
  Medal,
  Crown,
  Target,
  Award,
  TrendingUp,
  Users,
  Calendar,
  Star,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

function EnhancedLeaderboardTab({ currentUser, draftStatus }) {
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [activeView, setActiveView] = useState('leaderboard'); // 'leaderboard', 'awards', 'stats'

  // Fetch enhanced leaderboard data
  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching enhanced leaderboard...');

      const response = await fetch('/api/enhanced-leaderboard?action=get_leaderboard');
      const data = await response.json();

      if (data.success) {
        setLeaderboardData(data);
        console.log('✅ Enhanced leaderboard loaded:', data);
      } else {
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }
    } catch (err) {
      console.error('❌ Error fetching leaderboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch awards data
  const fetchAwards = async () => {
    try {
      const response = await fetch('/api/enhanced-leaderboard?action=get_awards');
      const data = await response.json();

      if (data.success) {
        setAwards(data.awards);
        console.log('✅ Awards loaded:', data.awards);
      }
    } catch (err) {
      console.error('❌ Error fetching awards:', err);
    }
  };

  // Calculate awards
  const calculateAwards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/enhanced-leaderboard?action=calculate_awards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season: '2024-25' })
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchAwards(); // Refresh awards
        console.log('✅ Awards calculated:', data.awards);
      }
    } catch (err) {
      console.error('❌ Error calculating awards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
    fetchAwards();
  }, []);

  const getPositionColor = (position) => {
    switch (position) {
      case 'GK': return 'bg-green-100 text-green-800';
      case 'DEF': return 'bg-blue-100 text-blue-800';
      case 'MID': return 'bg-yellow-100 text-yellow-800';
      case 'FWD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { bg: 'bg-yellow-500', text: 'text-white', icon: Crown };
    if (rank === 2) return { bg: 'bg-gray-400', text: 'text-white', icon: Medal };
    if (rank === 3) return { bg: 'bg-orange-500', text: 'text-white', icon: Medal };
    return { bg: 'bg-blue-500', text: 'text-white', icon: null };
  };

  const formatStatValue = (value, type) => {
    if (type === 'points' && value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value || 0;
  };

  if (loading && !leaderboardData) {
    return (
      <LoadingSpinner 
        size="large" 
        text="Loading enhanced leaderboard..." 
        className="py-8"
      />
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <div className="text-red-600 mb-4">❌ Error loading leaderboard</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={fetchLeaderboardData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </Card>
    );
  }

  const sortedTeams = leaderboardData?.leaderboard || [];

  return (
    <div className="space-y-8">
      {/* Header with Navigation */}
      <Card className="shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🏆 Enhanced Championship</h2>
              <p className="text-gray-600">Complete performance tracking and awards</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              GW {leaderboardData?.meta?.current_gameweek || 1} • {new Date().toLocaleTimeString()}
            </div>
            <button
              onClick={fetchLeaderboardData}
              disabled={loading}
              className="flex items-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* View Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            { id: 'awards', label: 'Awards', icon: Award },
            { id: 'stats', label: 'Stats', icon: TrendingUp }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                activeView === id 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Leaderboard View */}
      {activeView === 'leaderboard' && (
        <>
          {/* Podium */}
          <Card className="shadow-lg">
            <div className="flex items-end justify-center space-x-4 mb-8 py-8">
              {/* 2nd Place */}
              {sortedTeams[1] && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                    2
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {sortedTeams[1].first_name || sortedTeams[1].email}
                  </div>
                  <div className="text-xl font-bold text-gray-600">
                    {formatStatValue(sortedTeams[1].competition_points_with_multiplier, 'points')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ⚽ {sortedTeams[1].total_goals} • 🎯 {sortedTeams[1].total_assists}
                  </div>
                </div>
              )}
              
              {/* 1st Place */}
              {sortedTeams[0] && (
                <div className="text-center">
                  <div className="w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2 relative">
                    1
                    <Crown className="w-6 h-6 absolute -top-2 -right-2 text-yellow-300" />
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {sortedTeams[0].first_name || sortedTeams[0].email}
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatStatValue(sortedTeams[0].competition_points_with_multiplier, 'points')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ⚽ {sortedTeams[0].total_goals} • 🎯 {sortedTeams[0].total_assists}
                  </div>
                </div>
              )}
              
              {/* 3rd Place */}
              {sortedTeams[2] && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                    3
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {sortedTeams[2].first_name || sortedTeams[2].email}
                  </div>
                  <div className="text-xl font-bold text-orange-600">
                    {formatStatValue(sortedTeams[2].competition_points_with_multiplier, 'points')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ⚽ {sortedTeams[2].total_goals} • 🎯 {sortedTeams[2].total_assists}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Detailed Leaderboard */}
          <Card className="overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Complete Leaderboard</h3>
              
              <div className="space-y-4">
                {sortedTeams.map((team, index) => {
                  const rankBadge = getRankBadge(team.rank);
                  const isExpanded = expandedUser === team.user_id;
                  const isCurrentUser = team.user_id === currentUser?.id;
                  
                  return (
                    <div key={team.user_id} className={`relative ${
                      isCurrentUser ? 'ring-2 ring-blue-500' : ''
                    } p-4 bg-gray-50 rounded-lg`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${rankBadge.bg} ${rankBadge.text}`}>
                            {team.rank}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 flex items-center">
                              {team.first_name || team.email}
                              {team.is_admin && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Admin</span>}
                              {team.total_awards > 0 && <Award className="w-4 h-4 ml-2 text-yellow-500" />}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {team.allocated_players} players • ⚽ {team.total_goals} • 🎯 {team.total_assists} • 🛡️ {team.total_clean_sheets}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatStatValue(team.competition_points_with_multiplier, 'points')}
                            </div>
                            <div className="text-sm text-gray-600">
                              competition pts
                            </div>
                          </div>
                          <button
                            onClick={() => setExpandedUser(isExpanded ? null : team.user_id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-white rounded">
                              <div className="text-lg font-bold text-blue-600">{team.total_fpl_points}</div>
                              <div className="text-xs text-gray-600">Total FPL Points</div>
                            </div>
                            <div className="text-center p-3 bg-white rounded">
                              <div className="text-lg font-bold text-green-600">{team.total_bonus_points}</div>
                              <div className="text-xs text-gray-600">Bonus Points</div>
                            </div>
                            <div className="text-center p-3 bg-white rounded">
                              <div className="text-lg font-bold text-red-600">{team.total_yellow_cards}</div>
                              <div className="text-xs text-gray-600">Yellow Cards</div>
                            </div>
                            <div className="text-center p-3 bg-white rounded">
                              <div className="text-lg font-bold text-purple-600">{Math.round(team.total_minutes_played / 90)}</div>
                              <div className="text-xs text-gray-600">Games Played</div>
                            </div>
                          </div>

                          {/* Team Players */}
                          {team.team_players && (
                            <div className="mt-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Team:</h5>
                              <p className="text-sm text-gray-600">{team.team_players}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Awards View */}
      {activeView === 'awards' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">🏆 Season Awards</h3>
            <button
              onClick={calculateAwards}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              <Award className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Calculate Awards
            </button>
          </div>

          {awards.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Awards Yet</h4>
              <p className="text-gray-500">Calculate awards to see who's winning what!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {awards.map((award, index) => (
                <div key={index} className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                  <div className="text-2xl mb-2">{award.award_name}</div>
                  <div className="font-medium text-gray-900">
                    {award.user_profiles?.first_name || award.user_profiles?.email}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{award.award_description}</div>
                  <div className="text-lg font-bold text-yellow-600 mt-2">{award.value}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Stats View */}
      {activeView === 'stats' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">📊 League Statistics</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{leaderboardData?.meta?.total_users || 0}</div>
              <div className="text-sm text-gray-600">Total Managers</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {sortedTeams.reduce((sum, team) => sum + (team.total_goals || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Goals</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {sortedTeams.reduce((sum, team) => sum + (team.total_assists || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Assists</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {sortedTeams.reduce((sum, team) => sum + (team.total_clean_sheets || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Clean Sheets</div>
            </div>
          </div>
        </Card>
      )}

      {/* Live Updates Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Target className="w-5 h-5 text-blue-600 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Enhanced Tracking</h4>
            <p className="text-sm text-blue-700">
              Complete performance tracking with goals, assists, clean sheets, and end-of-season awards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnhancedLeaderboardTab;
