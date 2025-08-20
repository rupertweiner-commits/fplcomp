import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Shield, Search, TrendingUp, Award, Target } from 'lucide-react';
import axios from 'axios';

function PlayerStats() {
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [sortBy, setSortBy] = useState('total_points');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentGameweek, setCurrentGameweek] = useState(1);

  useEffect(() => {
    // eslint-disable-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
  }, [players, searchTerm, selectedTeam, selectedPosition, sortBy, sortOrder]);

  const fetchPlayersData = async () => {
    try {
      setLoading(true);
      
      const [bootstrapResponse, gameweekResponse] = await Promise.all([
        axios.get('/api/fpl/bootstrap'),
        axios.get('/api/fpl/current-gameweek')
      ]);
      
      const bootstrap = bootstrapResponse.data.data;
      setCurrentGameweek(gameweekResponse.data.currentGameweek);
      
      // Filter to show only Chelsea players (team ID = 7)
      const chelseaPlayers = bootstrap.elements.filter(player => player.team === 7);
      
      setPlayers(chelseaPlayers);
      setTeams(bootstrap.teams);
      setPositions(bootstrap.element_types);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load player data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...players];
    
    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(player => 
        player.web_name.toLowerCase().includes(term) ||
        player.first_name.toLowerCase().includes(term) ||
        player.second_name.toLowerCase().includes(term)
      );
    }
    
    // Team filter removed - only showing Chelsea players
    
    // Position filter
    if (selectedPosition) {
      filtered = filtered.filter(player => player.element_type.toString() === selectedPosition);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle special sorting cases
      if (sortBy === 'value') {
        aVal = parseFloat(a.now_cost) / 10;
        bVal = parseFloat(b.now_cost) / 10;
      } else if (sortBy === 'form') {
        aVal = parseFloat(a.form) || 0;
        bVal = parseFloat(b.form) || 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal - bVal;
      } else {
        return bVal - aVal;
      }
    });
    
    setFilteredPlayers(filtered);
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.short_name : 'Unknown';
  };

  const getPositionName = (elementType) => {
    const position = positions.find(p => p.id === elementType);
    return position ? position.singular_name_short : 'Unknown';
  };

  const formatPrice = (price) => {
    return `£${(price / 10).toFixed(1)}m`;
  };

  const getPlayerForm = (player) => {
    const form = parseFloat(player.form);
    if (form >= 6) return { color: 'text-green-600', label: 'Excellent' };
    if (form >= 4) return { color: 'text-blue-600', label: 'Good' };
    if (form >= 2) return { color: 'text-yellow-600', label: 'Average' };
    return { color: 'text-red-600', label: 'Poor' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-fpl-primary" />
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
        <button onClick={fetchPlayersData} className="fpl-button-primary">
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
              <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3" style={{color: '#034694'}}>
            <Shield className="w-8 h-8" style={{color: '#034694'}} />
            <span>Chelsea Players</span>
          </h1>
          <p className="text-gray-600 mt-1">
            KPG's Annual Chelsea Competition - Gameweek {currentGameweek}
          </p>
        </div>

      {/* Filters */}
      <div className="fpl-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Players
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fpl-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Team Display - Chelsea Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team
            </label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-blue-50 text-blue-800 font-medium">
              Chelsea FC Only
            </div>
          </div>

          {/* Position Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position
            </label>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fpl-primary focus:border-transparent"
            >
              <option value="">All Positions</option>
              {positions.map(position => (
                <option key={position.id} value={position.id}>
                  {position.plural_name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fpl-primary focus:border-transparent"
            >
              <option value="total_points-desc">Total Points (High to Low)</option>
              <option value="total_points-asc">Total Points (Low to High)</option>
              <option value="value-desc">Price (High to Low)</option>
              <option value="value-asc">Price (Low to High)</option>
              <option value="form-desc">Form (Best to Worst)</option>
              <option value="selected_by_percent-desc">Ownership % (High to Low)</option>
              <option value="goals_scored-desc">Goals Scored</option>
              <option value="assists-desc">Assists</option>
              <option value="clean_sheets-desc">Clean Sheets</option>
            </select>
          </div>
        </div>
        
        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredPlayers.length} of {players.length} players
        </div>
      </div>

      {/* Player Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPlayers.slice(0, 50).map(player => (
          <PlayerCard 
            key={player.id} 
            player={player} 
            getTeamName={getTeamName}
            getPositionName={getPositionName}
            formatPrice={formatPrice}
            getPlayerForm={getPlayerForm}
          />
        ))}
      </div>

      {/* Load More */}
      {filteredPlayers.length > 50 && (
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Showing 50 of {filteredPlayers.length} players
          </p>
          <button 
            onClick={() => {/* Implement pagination */}}
            className="fpl-button-secondary"
          >
            Load More Players
          </button>
        </div>
      )}

      {/* No Results */}
      {filteredPlayers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
          <p className="text-gray-600">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, getTeamName, getPositionName, formatPrice, getPlayerForm }) {
  const form = getPlayerForm(player);
  
  return (
    <div className="fpl-card p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg truncate">
            {player.web_name}
          </h3>
          <p className="text-sm text-gray-600 truncate">
            {player.first_name} {player.second_name}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
              {getTeamName(player.team)}
            </span>
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
              {getPositionName(player.element_type)}
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold text-fpl-primary">
            {formatPrice(player.now_cost)}
          </div>
          <div className="text-xs text-gray-500">price</div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        {/* Points and Form */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Total Points</span>
          </div>
          <span className="font-semibold text-gray-900">{player.total_points}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Form</span>
          </div>
          <span className={`font-semibold ${form.color}`}>
            {player.form || '0.0'}
          </span>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
          <div className="text-center">
            <Target className="w-4 h-4 text-green-600 mx-auto mb-1" />
            <div className="text-sm font-semibold text-gray-900">{player.goals_scored}</div>
            <div className="text-xs text-gray-500">Goals</div>
          </div>
          
          <div className="text-center">
            <Award className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <div className="text-sm font-semibold text-gray-900">{player.assists}</div>
            <div className="text-xs text-gray-500">Assists</div>
          </div>
          
          <div className="text-center">
            <Shield className="w-4 h-4 text-purple-600 mx-auto mb-1" />
            <div className="text-sm font-semibold text-gray-900">{player.clean_sheets}</div>
            <div className="text-xs text-gray-500">CS</div>
          </div>
        </div>

        {/* Ownership */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-sm text-gray-600">Ownership</span>
          <span className="text-sm font-semibold text-gray-900">
            {parseFloat(player.selected_by_percent).toFixed(1)}%
          </span>
        </div>

        {/* Status indicators */}
        <div className="flex items-center space-x-2 pt-2">
          {player.status !== 'a' && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
              {player.status === 'i' ? 'Injured' : 
               player.status === 's' ? 'Suspended' : 
               player.status === 'd' ? 'Doubtful' : 'Unavailable'}
            </span>
          )}
          
          {parseFloat(player.chance_of_playing_next_round) < 100 && (
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
              {player.chance_of_playing_next_round}% chance
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <button 
          onClick={() => {/* Implement player details modal */}}
          className="w-full text-center text-sm text-fpl-primary hover:text-fpl-primary/80 font-medium"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

export default PlayerStats;
