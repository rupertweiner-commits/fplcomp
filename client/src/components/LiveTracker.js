import React, { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  Clock,
  Zap,
  RefreshCw,
  Users,
  Target,
  Award
} from 'lucide-react';

function LiveTracker({ wsService }) {
  const [gameweekData, setGameweekData] = useState(null);
  const [currentGameweek, setCurrentGameweek] = useState(1);
  const [topPerformers, setTopPerformers] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveUpdates, setLiveUpdates] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchInitialData();

    // Subscribe to WebSocket updates
    if (wsService) {
      const unsubscribeLive = wsService.subscribe('liveUpdate', handleLiveUpdate);
      const unsubscribeQuick = wsService.subscribe('quickLiveUpdate', handleQuickUpdate);

      return () => {
        unsubscribeLive();
        unsubscribeQuick();
      };
    }
  }, [wsService]);

  const fetchInitialData = async() => {
    try {
      setLoading(true);

      // Get current gameweek
      const gwResponse = await fetch('/api/fpl?action=current-gameweek');
      const gwData = await gwResponse.json();
      const gameweek = gwData.data || 1;

      setCurrentGameweek(gameweek);

      // Fetch gameweek data in parallel
      const [liveResponse, fixturesResponse, performersResponse, bootstrapResponse] = await Promise.all([
        fetch(`/api/fpl?action=gameweek-live&gameweek=${gameweek}`).then(r => r.json()).catch(() => ({ data: null })),
        fetch(`/api/fpl?action=fixtures&event=${gameweek}`).then(r => r.json()),
        fetch(`/api/fpl?action=top-performers&gameweek=${gameweek}&limit=10`).then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/fpl?action=bootstrap').then(r => r.json())
      ]);

      setGameweekData(liveResponse.data);
      setFixtures(fixturesResponse.data);
      setTopPerformers(performersResponse.data);
      setTeams(bootstrapResponse.data.teams);

      // Check if any fixtures are live
      const liveFixtures = fixturesResponse.data.filter(f => f.started && !f.finished);

      setIsLive(liveFixtures.length > 0);

      setError(null);
    } catch (err) {
      console.error('Error fetching live data:', err);
      setError(err.message || 'Failed to load live data');
    } finally {
      setLoading(false);
    }
  };

  const handleLiveUpdate = (data) => {
    console.log('Live update received:', data);

    setIsLive(data.isLive);
    setLastUpdate(new Date(data.timestamp));

    if (data.liveStats) {
      // Update top performers if available
      if (data.liveStats.topPerformers) {
        setTopPerformers(data.liveStats.topPerformers);
      }
    }

    // Add to live updates feed
    setLiveUpdates(prev => [
      {
        id: Date.now(),
        timestamp: data.timestamp,
        type: 'update',
        message: `Live data updated - ${data.liveStats?.playersWithPoints || 0} players with points`,
        data: data.liveStats
      },
      ...prev.slice(0, 9) // Keep last 10 updates
    ]);
  };

  const handleQuickUpdate = (data) => {
    console.log('Quick update received:', data);

    setLastUpdate(new Date(data.timestamp));

    // Add to live updates feed
    setLiveUpdates(prev => [
      {
        id: Date.now(),
        timestamp: data.timestamp,
        type: 'quick',
        message: `${data.playersScored || 0} players have scored points`,
        data: {
          playersScored: data.playersScored,
          bonusAdded: data.bonusAdded,
          topScorer: data.topScorer
        }
      },
      ...prev.slice(0, 9)
    ]);
  };

  const refreshData = () => {
    fetchInitialData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-fpl-primary" />
          <span className="text-lg text-gray-600">Loading live data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-4">
          <Activity className="w-12 h-12 mx-auto mb-2" />
          <p className="text-lg font-medium">Failed to load live data</p>
          <p className="text-sm">{error}</p>
        </div>
        <button className="fpl-button-primary" onClick={refreshData}>
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Activity className="w-8 h-8 text-fpl-primary" />
            <span>Live Tracker</span>
            {isLive && (
              <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                LIVE
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-1">
            Gameweek
            {' '}
            {currentGameweek}
            {' '}
            - Real-time player performance
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <div className="text-sm text-gray-500">
              Last update:
              {' '}
              {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          <button
            className="fpl-button-secondary"
            onClick={refreshData}
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Live Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <LiveStatCard
          color="blue"
          icon={Users}
          isLive={isLive}
          subtitle="scoring today"
          title="Players with Points"
          value={gameweekData?.elements.filter(p => p.stats.total_points > 0).length || 0}
        />
        <LiveStatCard
          color="green"
          icon={Target}
          isLive={isLive}
          subtitle="total goals"
          title="Goals Scored"
          value={gameweekData?.elements.reduce((sum, p) => sum + (p.stats.goals_scored || 0), 0) || 0}
        />
        <LiveStatCard
          color="purple"
          icon={Award}
          isLive={isLive}
          subtitle="total assists"
          title="Assists"
          value={gameweekData?.elements.reduce((sum, p) => sum + (p.stats.assists || 0), 0) || 0}
        />
        <LiveStatCard
          color="orange"
          icon={Zap}
          isLive={isLive}
          subtitle="points per player"
          title="Average Score"
          value={gameweekData?.elements.length > 0 ?
            Math.round(gameweekData.elements.reduce((sum, p) => sum + (p.stats.total_points || 0), 0) / gameweekData.elements.length * 10) / 10 : 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Performers */}
        <div className="lg:col-span-2">
          <div className="fpl-card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-fpl-primary" />
              <span>Top Performers</span>
            </h2>

            {topPerformers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No performance data available yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topPerformers.map((player, index) => (
                  <PlayerPerformanceCard
                    isLive={isLive}
                    key={player.id}
                    player={player}
                    rank={index + 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Updates Feed */}
        <div className="fpl-card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-fpl-primary" />
            <span>Live Updates</span>
          </h2>

          {liveUpdates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No live updates yet</p>
              <p className="text-sm">Updates will appear here during matches</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {liveUpdates.map((update) => (
                <LiveUpdateCard key={update.id} update={update} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixtures */}
      <div className="fpl-card p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-fpl-primary" />
          <span>
            Gameweek
            {currentGameweek}
            {' '}
            Fixtures
          </span>
        </h2>

        {fixtures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No fixtures available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fixtures.map((fixture) => (
              <FixtureCard fixture={fixture} key={fixture.id} teams={teams} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveStatCard({ icon: Icon, title, value, subtitle, color, isLive }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className={`fpl-card p-6 ${isLive ? 'ring-2 ring-red-200' : ''}`}>
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]} ${isLive ? 'animate-pulse-slow' : ''}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-600">{title}</div>
          <div className="text-xs text-gray-500">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function PlayerPerformanceCard({ player, rank, isLive }) {
  return (
    <div className={`flex items-center space-x-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors ${isLive ? 'animate-fade-in' : ''}`}>
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
          rank === 1 ? 'bg-yellow-500' :
            rank === 2 ? 'bg-gray-400' :
              rank === 3 ? 'bg-amber-600' :
                'bg-fpl-primary'
        }`}
      >
        {rank}
      </div>

      <div className="flex-1">
        <div className="font-medium text-gray-900">{player.name || `Player ${player.id}`}</div>
        <div className="text-sm text-gray-500 space-x-4">
          <span>
            ⚽
            {player.goals || 0}
          </span>
          <span>
            🅰️
            {player.assists || 0}
          </span>
          {player.saves && <span>
            🧤
            {player.saves}
                           </span>}
        </div>
      </div>

      <div className="text-right">
        <div className={`text-xl font-bold ${rank <= 3 ? 'text-fpl-primary' : 'text-gray-900'}`}>
          {player.points}
        </div>
        <div className="text-xs text-gray-500">points</div>
      </div>
    </div>
  );
}

function LiveUpdateCard({ update }) {
  const getIcon = () => {
    switch (update.type) {
      case 'quick':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'update':
        return <Activity className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg animate-slide-up">
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-900">{update.message}</p>
        <p className="text-xs text-gray-500">
          {new Date(update.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

function FixtureCard({ fixture, teams = [] }) {
  const isLive = fixture.started && !fixture.finished;
  const isFinished = fixture.finished;

  // Get team names from the teams data
  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);

    return team ? team.short_name : `Team ${teamId}`;
  };

  const homeTeam = getTeamName(fixture.team_h);
  const awayTeam = getTeamName(fixture.team_a);

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-colors ${
        isLive ? 'border-red-300 bg-red-50' :
          isFinished ? 'border-gray-200 bg-white' :
            'border-blue-200 bg-blue-50'
      }`}
    >
      <div className="text-center">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">{homeTeam}</div>
          <div className="text-xs text-gray-500">vs</div>
          <div className="text-sm font-medium">{awayTeam}</div>
        </div>

        {isFinished ? (
          <div className="text-lg font-bold text-gray-900">
            {fixture.team_h_score}
            {' '}
            -
            {fixture.team_a_score}
          </div>
        ) : isLive ? (
          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm font-medium text-red-600">LIVE</span>
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            {new Date(fixture.kickoff_time).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveTracker;
