import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  Trophy,
  Clock,
  Zap,
  Activity,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

function Dashboard({ wsService }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [liveData, setLiveData] = useState(null);

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to WebSocket updates
    if (wsService) {
      const unsubscribeLive = wsService.subscribe('liveUpdate', handleLiveUpdate);
      const unsubscribeQuick = wsService.subscribe('quickLiveUpdate', handleQuickUpdate);

      return () => {
        unsubscribeLive();
        unsubscribeQuick();
      };
    }
  }, [wsService]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async() => {
    try {
      setLoading(true);
      const response = await fetch('/api/fpl?action=dashboard');
      const data = await response.json();

      if (data && data.success) {
        setDashboardData(data.data);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLiveUpdate = (data) => {
    setLiveData(data);
    setLastUpdate(new Date());
  };

  const handleQuickUpdate = (data) => {
    if (liveData) {
      setLiveData({ ...liveData, ...data });
    } else {
      setLiveData(data);
    }
    setLastUpdate(new Date());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-fpl-primary" />
          <span className="text-lg text-gray-600">Loading dashboard data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-4">
          <Activity className="w-12 h-12 mx-auto mb-2" />
          <p className="text-lg font-medium">Failed to load dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          className="fpl-button-primary"
          onClick={fetchDashboardData}
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Retry
        </button>
      </div>
    );
  }

  const { summary, fixtures, topPerformers, currentGameweek } = dashboardData;
  const isLive = liveData?.isLive || false;

  return (
    <div className="space-y-8">
      {/* Header with Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FPL Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Gameweek
            {' '}
            {currentGameweek}
            {' '}
            {isLive && (
              <span className="inline-flex items-center px-2 py-1 ml-2 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse" />
                LIVE
              </span>
            )}
          </p>
        </div>

        {lastUpdate && (
          <div className="text-sm text-gray-500">
            Last updated:
            {' '}
            {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          color="blue"
          icon={Users}
          subtitle="in database"
          title="Total Players"
          value={summary.totalPlayers.toLocaleString()}
        />
        <StatCard
          color="green"
          icon={Trophy}
          subtitle="Premier League"
          title="Teams"
          value={summary.totalTeams}
        />
        <StatCard
          color="purple"
          icon={Clock}
          subtitle="completed"
          title="Gameweeks"
          value={`${currentGameweek}/${summary.totalGameweeks}`}
        />
        <StatCard
          color={isLive ? 'red' : 'gray'}
          icon={Zap}
          subtitle={isLive ? 'in progress' : 'completed'}
          title="Live Fixtures"
          value={fixtures.length}
        />
      </div>

      {/* Live Data Section */}
      {liveData && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-red-900">Live Updates</h2>
            {liveData.isLive && (
              <span className="animate-pulse text-red-600 text-sm font-medium">
                Data updating in real-time
              </span>
            )}
          </div>

          {liveData.liveStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {liveData.liveStats.playersWithPoints}
                </div>
                <div className="text-sm text-gray-600">Players with points</div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {liveData.playersScored || 0}
                </div>
                <div className="text-sm text-gray-600">Players scored</div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {liveData.bonusAdded ? 'Yes' : 'No'}
                </div>
                <div className="text-sm text-gray-600">Bonus points added</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Performers */}
      {topPerformers && topPerformers.length > 0 && (
        <div className="fpl-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Top Performers</h2>
            <Link
              className="text-fpl-primary hover:text-fpl-primary/80 flex items-center space-x-1"
              to="/players"
            >
              <span>View all</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {topPerformers.map((player, index) => (
              <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50" key={player.id}>
                <div className="flex-shrink-0 w-8 h-8 bg-fpl-primary text-white rounded-full flex items-center justify-center font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{player.name}</div>
                  <div className="text-sm text-gray-500">
                    {player.goals}
                    {' '}
                    goals,
                    {player.assists}
                    {' '}
                    assists
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-fpl-primary">{player.points}</div>
                  <div className="text-xs text-gray-500">points</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Fixtures */}
      <div className="fpl-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Fixtures</h2>
          <Link
            className="text-fpl-primary hover:text-fpl-primary/80 flex items-center space-x-1"
            to="/live"
          >
            <span>Live tracker</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {fixtures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recent fixtures available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fixtures.slice(0, 5).map((fixture) => (
              <FixtureCard fixture={fixture} key={fixture.id} teams={dashboardData?.summary?.teams || []} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionCard
          color="red"
          description="Follow live scores and player performance"
          icon={TrendingUp}
          title="Live Tracker"
          to="/live"
        />
        <ActionCard
          color="green"
          description="Check your mini-league positions"
          icon={Trophy}
          title="League Standings"
          to="/leagues"
        />
        <ActionCard
          color="blue"
          description="Detailed stats and performance data"
          icon={Users}
          title="Player Analysis"
          to="/players"
        />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600'
  };

  return (
    <div className="fpl-card p-6">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
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

function FixtureCard({ fixture, teams = [] }) {
  const isFinished = fixture.finished;
  const hasStarted = fixture.started;

  // Get team names from the teams data
  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);

    return team ? team.short_name : `Team ${teamId}`;
  };

  const homeTeam = getTeamName(fixture.team_h);
  const awayTeam = getTeamName(fixture.team_a);

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="text-center min-w-0">
          <div className="font-medium text-gray-900 truncate">{homeTeam}</div>
          <div className="text-sm text-gray-500">vs</div>
          <div className="font-medium text-gray-900 truncate">{awayTeam}</div>
        </div>
      </div>

      <div className="text-right">
        {isFinished ? (
          <div className="text-lg font-bold text-gray-900">
            {fixture.team_h_score}
            {' '}
            -
            {fixture.team_a_score}
          </div>
        ) : hasStarted ? (
          <div className="text-sm font-medium text-red-600">LIVE</div>
        ) : (
          <div className="text-sm text-gray-500">
            {new Date(fixture.kickoff_time).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, description, color }) {
  const colorClasses = {
    red: 'group-hover:bg-red-50 text-red-600',
    green: 'group-hover:bg-green-50 text-green-600',
    blue: 'group-hover:bg-blue-50 text-blue-600'
  };

  return (
    <Link className="group" to={to}>
      <div className="fpl-card p-6 group-hover:shadow-lg transition-all duration-200">
        <div className={`p-3 rounded-lg ${colorClasses[color]} inline-flex mb-4`}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
        <div className="mt-4 flex items-center text-fpl-primary">
          <span className="text-sm font-medium">Get started</span>
          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

export default Dashboard;
