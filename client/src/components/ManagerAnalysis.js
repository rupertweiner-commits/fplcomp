import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, TrendingUp, Trophy, Calendar, RefreshCw, Award, Target } from 'lucide-react';

function ManagerAnalysis() {
  const { managerId } = useParams();
  const [managerData, setManagerData] = useState(null);
  const [managerHistory, setManagerHistory] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGameweek, setSelectedGameweek] = useState(null);
  const [currentGameweek, setCurrentGameweek] = useState(1);

  useEffect(() => {
    if (managerId) {
      fetchManagerData();
    }
  }, [managerId]);

  const fetchManagerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current gameweek first
      const gwResponse = await fetch('/api/fpl/current-gameweek');
      const gwData = await gwResponse.json();
      const gameweek = gwData.data.currentGameweek;
      setCurrentGameweek(gameweek);
      setSelectedGameweek(gameweek);

      // Fetch manager data in parallel
      const [managerResponse, historyResponse, teamResponse] = await Promise.all([
        fetch(`/api/fpl/manager/${managerId}`).then(r => r.json()),
        fetch(`/api/fpl/manager/${managerId}/history`).then(r => r.json()),
        fetch(`/api/fpl/manager/${managerId}/team/${gameweek}`).then(r => r.json())
      ]);

      setManagerData(managerResponse.data.data);
      setManagerHistory(historyResponse.data.data);
      setCurrentTeam(teamResponse.data.data);

    } catch (err) {
      setError(err.message || 'Failed to load manager data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamForGameweek = async (gameweek) => {
    try {
      const response = await fetch(`/api/fpl/manager/${managerId}/team/${gameweek}`);
      const data = await response.json();
      setCurrentTeam(data.data.data);
      setSelectedGameweek(gameweek);
    } catch (err) {
      console.error('Failed to fetch team for gameweek:', err);
    }
  };

  const getGameweekHistory = () => {
    if (!managerHistory?.current) return [];
    return managerHistory.current.slice().reverse(); // Most recent first
  };

  const getSeasonSummary = () => {
    if (!managerHistory?.current || managerHistory.current.length === 0) return null;
    
    const gameweeks = managerHistory.current;
    const totalPoints = gameweeks.reduce((sum, gw) => sum + gw.points, 0);
    const averagePoints = totalPoints / gameweeks.length;
    const bestGameweek = gameweeks.reduce((best, gw) => gw.points > best.points ? gw : best);
    const worstGameweek = gameweeks.reduce((worst, gw) => gw.points < worst.points ? gw : worst);
    
    return {
      totalPoints,
      averagePoints: Math.round(averagePoints * 10) / 10,
      bestGameweek,
      worstGameweek,
      gamesPlayed: gameweeks.length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-fpl-primary" />
          <span className="text-lg text-gray-600">Loading manager data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-4">
          <User className="w-12 h-12 mx-auto mb-2" />
          <p className="text-lg font-medium">Failed to load manager data</p>
          <p className="text-sm">{error}</p>
        </div>
        <button onClick={fetchManagerData} className="fpl-button-primary">
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Retry
        </button>
      </div>
    );
  }

  const seasonSummary = getSeasonSummary();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="fpl-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-fpl-primary text-white rounded-full flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {managerData.player_first_name} {managerData.player_last_name}
              </h1>
              <p className="text-lg text-gray-600">{managerData.name}</p>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                <span>Manager ID: {managerId}</span>
                <span>Started: {managerData.started_event ? `GW${managerData.started_event}` : 'GW1'}</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold text-fpl-primary">
              {managerData.summary_overall_points?.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-600">Total Points</div>
            <div className="text-xs text-gray-500">
              Overall Rank: {managerData.summary_overall_rank?.toLocaleString() || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Season Summary */}
      {seasonSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            icon={Trophy}
            title="Average Points"
            value={seasonSummary.averagePoints}
            subtitle="per gameweek"
            color="blue"
          />
          <SummaryCard
            icon={TrendingUp}
            title="Best Gameweek"
            value={seasonSummary.bestGameweek.points}
            subtitle={`GW${seasonSummary.bestGameweek.event}`}
            color="green"
          />
          <SummaryCard
            icon={Calendar}
            title="Gameweeks Played"
            value={seasonSummary.gamesPlayed}
            subtitle="this season"
            color="purple"
          />
          <SummaryCard
            icon={Target}
            title="Current Rank"
            value={managerData.summary_overall_rank?.toLocaleString() || 'N/A'}
            subtitle="overall"
            color="orange"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Team */}
        <div className="lg:col-span-2">
          <div className="fpl-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <User className="w-5 h-5 text-fpl-primary" />
                <span>Team - Gameweek {selectedGameweek}</span>
              </h2>
              
              <select
                value={selectedGameweek}
                onChange={(e) => fetchTeamForGameweek(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-fpl-primary focus:border-transparent"
              >
                {Array.from({ length: currentGameweek }, (_, i) => i + 1).reverse().map(gw => (
                  <option key={gw} value={gw}>Gameweek {gw}</option>
                ))}
              </select>
            </div>
            
            {currentTeam ? (
              <div className="space-y-6">
                {/* Team Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{currentTeam.entry_history?.points || 0}</div>
                    <div className="text-xs text-gray-500">Points This GW</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{currentTeam.entry_history?.total_points || 0}</div>
                    <div className="text-xs text-gray-500">Total Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{currentTeam.entry_history?.bank || 0}</div>
                    <div className="text-xs text-gray-500">Bank</div>
                  </div>
                </div>

                {/* Starting XI */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Starting XI</h3>
                  <div className="space-y-2">
                    {currentTeam.picks?.filter(pick => pick.multiplier > 0).map(pick => (
                      <TeamPlayerCard 
                        key={pick.element} 
                        pick={pick} 
                        isCaptain={pick.is_captain}
                        isViceCaptain={pick.is_vice_captain}
                      />
                    ))}
                  </div>
                </div>

                {/* Bench */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Bench</h3>
                  <div className="space-y-2">
                    {currentTeam.picks?.filter(pick => pick.multiplier === 0).map(pick => (
                      <TeamPlayerCard 
                        key={pick.element} 
                        pick={pick} 
                        isBench={true}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No team data available for this gameweek</p>
              </div>
            )}
          </div>
        </div>

        {/* Gameweek History */}
        <div className="fpl-card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-fpl-primary" />
            <span>Recent Form</span>
          </h2>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {getGameweekHistory().slice(0, 10).map((gameweek, index) => (
              <GameweekCard 
                key={gameweek.event} 
                gameweek={gameweek} 
                isRecent={index < 3}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Chips Used */}
      {managerHistory?.chips && managerHistory.chips.length > 0 && (
        <div className="fpl-card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
            <Award className="w-5 h-5 text-fpl-primary" />
            <span>Chips Used</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {managerHistory.chips.map((chip, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900 capitalize">{chip.name}</div>
                <div className="text-sm text-gray-600">Gameweek {chip.event}</div>
                <div className="text-xs text-gray-500">
                  {new Date(chip.time).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, title, value, subtitle, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
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

function TeamPlayerCard({ pick, isCaptain, isViceCaptain, isBench }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${
      isBench ? 'bg-gray-100' : 'bg-white border border-gray-200'
    }`}>
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">Player {pick.element}</span>
          {isCaptain && (
            <span className="px-1 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded font-bold">C</span>
          )}
          {isViceCaptain && (
            <span className="px-1 py-0.5 text-xs bg-gray-100 text-gray-800 rounded font-bold">VC</span>
          )}
        </div>
      </div>
      
      <div className="text-right">
        <div className="text-sm font-medium text-gray-900">
          {pick.multiplier > 0 ? `${pick.multiplier}x` : 'Bench'}
        </div>
        <div className="text-xs text-gray-500">Position {pick.position}</div>
      </div>
    </div>
  );
}

function GameweekCard({ gameweek, isRecent }) {
  const getRankChange = () => {
    if (!gameweek.rank || !gameweek.overall_rank) return null;
    
    const change = gameweek.rank - gameweek.overall_rank;
    if (change > 0) {
      return <TrendingUp className="w-4 h-4 text-green-500 transform rotate-180" />;
    } else if (change < 0) {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  return (
    <div className={`p-3 rounded-lg border ${
      isRecent ? 'border-fpl-primary bg-fpl-primary/5' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">GW{gameweek.event}</div>
          <div className="text-sm text-gray-600">{gameweek.points} points</div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-900">
              Rank: {gameweek.overall_rank?.toLocaleString()}
            </span>
            {getRankChange()}
          </div>
          <div className="text-xs text-gray-500">
            GW Rank: {gameweek.rank?.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManagerAnalysis;
