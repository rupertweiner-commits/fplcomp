import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Users, Shield, Search, TrendingUp, Award, Target } from 'lucide-react';

function PlayerStats({ players: propPlayers }) {
  const [players, setPlayers] = useState(propPlayers || []);
  const [loading, setLoading] = useState(!propPlayers);
  const [error, setError] = useState(null);
  const [currentGameweek, setCurrentGameweek] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [sortField, setSortField] = useState('total_points');
  const [sortDirection, setSortDirection] = useState('desc');

  // Update players when prop changes
  useEffect(() => {
    if (propPlayers) {
      setPlayers(propPlayers);
      setLoading(false);
    }
  }, [propPlayers]);

  const fetchPlayersData = async() => {
    try {
      setLoading(true);

      // Fetch synced Chelsea players from our database
      const response = await fetch('/api/fpl-sync?action=get-chelsea-players');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log('🔍 FPL Sync API Response:', data);

      if (!data.success || !data.data?.players) {
        throw new Error('No Chelsea players found in database');
      }

      // Use the synced Chelsea players data
      const chelseaPlayers = data.data.players;
      
      console.log('🔍 Chelsea Players Data:', chelseaPlayers.slice(0, 2)); // Log first 2 players for debugging

      if (chelseaPlayers.length === 0) {
        throw new Error('No Chelsea players found in database. Please sync FPL data first.');
      }

      setPlayers(chelseaPlayers);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch Chelsea players from database:', err);
      setError('Failed to load Chelsea players. Please sync FPL data first.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch data if no players are provided as props
    if (!propPlayers || propPlayers.length === 0) {
      fetchPlayersData();
    }
  }, [propPlayers]);

  const fetchLiveData = async() => {
    try {
      setLoading(true);
      const response = await fetch('/api/fpl-sync?action=live-scores');
      const data = await response.json();

      if (data.success) {
        // Update current gameweek
        setCurrentGameweek(data.current?.event || 1);
      }
    } catch (err) {
      console.error('Failed to fetch live data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort players
  const filteredPlayers = players.filter(player => {
    const matchesSearch = !searchTerm || 
      player.web_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.second_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = !selectedPosition || player.position === selectedPosition;
    
    return matchesSearch && matchesPosition;
  });

  // Sort filtered players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const aValue = a[sortField] || 0;
    const bValue = b[sortField] || 0;
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Group players by position category
  const groupedPlayers = sortedPlayers.reduce((groups, player) => {
    const position = player.position;
    let category = 'DEF';
    
    if (position === 'GK' || position === 'DEF') {
      category = 'DEF';
    } else if (position === 'MID' || position === 'FWD') {
      category = 'ATT';
    }
    
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(player);
    return groups;
  }, {});

  // Get unique positions for filter dropdown
  const positions = [...new Set(players.map(p => p.position))].sort();

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
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

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'Available': return 'text-green-600';
      case 'Doubtful': return 'text-yellow-600';
      case 'Injured': return 'text-red-600';
      case 'Unavailable': return 'text-gray-600';
      case 'Suspended': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Loading player data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-4">
          <Users className="w-12 h-12 mx-auto mb-2" />
          <p className="text-lg font-medium">Failed to load player data</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={fetchPlayersData}
        >
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
          <h1 className="text-3xl font-bold flex items-center space-x-3" style={{ color: '#034694' }}>
            <Shield className="w-8 h-8" style={{ color: '#034694' }} />
            <span>Chelsea Players</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Live FPL Data - KPG's Annual Chelsea Competition - Gameweek {currentGameweek}
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:opacity-90 text-white disabled:opacity-50"
            disabled={loading}
            onClick={fetchPlayersData}
            style={{ backgroundColor: '#034694' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Player Data</span>
          </button>
          <button
            className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:opacity-90 text-white disabled:opacity-50"
            disabled={loading}
            onClick={fetchLiveData}
            style={{ backgroundColor: '#10B981' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Scores</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Players
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name..."
                type="text"
                value={searchTerm}
              />
            </div>
          </div>

          {/* Position Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => setSelectedPosition(e.target.value)}
              value={selectedPosition}
            >
              <option value="">All Positions</option>
              {positions.map(position => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => setSortField(e.target.value)}
              value={sortField}
            >
              <option value="total_points">Total Points</option>
              <option value="form">Form</option>
              <option value="price">Price</option>
              <option value="goals_scored">Goals</option>
              <option value="assists">Assists</option>
              <option value="clean_sheets">Clean Sheets</option>
              <option value="saves">Saves</option>
              <option value="bonus">Bonus Points</option>
              <option value="selected_by_percent">Ownership %</option>
              <option value="ict_index">ICT Index</option>
            </select>
          </div>

          {/* Sort Direction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Direction
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => setSortDirection(e.target.value)}
              value={sortDirection}
            >
              <option value="desc">High to Low</option>
              <option value="asc">Low to High</option>
            </select>
          </div>
        </div>

        {/* Results count and clear filters */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredPlayers.length} of {players.length} players
          </div>
          {(searchTerm || selectedPosition) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedPosition('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Player Statistics by Position */}
      {Object.keys(groupedPlayers).map(category => (
        <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {category === 'DEF' ? 'Defenders & Goalkeepers' : 'Attackers & Midfielders'}
            </h2>
            <p className="text-sm text-gray-600">
              {groupedPlayers[category].length} players
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('price')}
                  >
                    Price {getSortIcon('price')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('total_points')}
                  >
                    Points {getSortIcon('total_points')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('form')}
                  >
                    Form {getSortIcon('form')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('goals_scored')}
                  >
                    Goals {getSortIcon('goals_scored')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('assists')}
                  >
                    Assists {getSortIcon('assists')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('clean_sheets')}
                  >
                    Clean Sheets {getSortIcon('clean_sheets')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('saves')}
                  >
                    Saves {getSortIcon('saves')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('bonus')}
                  >
                    Bonus {getSortIcon('bonus')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Availability
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupedPlayers[category].map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {player.web_name?.charAt(0) || player.name?.charAt(0) || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {player.web_name || player.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {player.first_name} {player.second_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPositionColor(player.position)}`}>
                        {player.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      £{player.price || 0}m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="font-semibold text-blue-600">{player.total_points || 0}</div>
                      <div className="text-xs text-gray-500">BPS: {player.bps || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-semibold text-purple-600">{player.form || 0}</div>
                      <div className="text-xs text-gray-500">ICT: {player.ict_index || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-semibold text-green-600">{player.goals_scored || 0}</div>
                      <div className="text-xs text-gray-500">Threat: {player.threat || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-semibold text-orange-600">{player.assists || 0}</div>
                      <div className="text-xs text-gray-500">Creativity: {player.creativity || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-semibold text-blue-600">{player.clean_sheets || 0}</div>
                      <div className="text-xs text-gray-500">Saves: {player.saves || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.saves || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.bonus || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        player.is_available 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {player.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs">
                        <div className={`font-medium ${
                          player.availability_status === 'Available' ? 'text-green-600' :
                          player.availability_status === 'Injured' ? 'text-red-600' :
                          player.availability_status === 'Doubtful' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {player.availability_status || 'Unknown'}
                        </div>
                        {player.availability_reason && (
                          <div className="text-gray-500 mt-1 max-w-xs truncate" title={player.availability_reason}>
                            {player.availability_reason}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {filteredPlayers.length === players.length ? 'Team Summary' : 'Filtered Results Summary'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredPlayers.length}
            </div>
            <div className="text-sm text-gray-600">
              {filteredPlayers.length === players.length ? 'Total Players' : 'Filtered Players'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredPlayers.reduce((sum, p) => sum + (p.total_points || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredPlayers.reduce((sum, p) => sum + (p.goals_scored || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Goals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {filteredPlayers.reduce((sum, p) => sum + (p.assists || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Assists</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerStats;