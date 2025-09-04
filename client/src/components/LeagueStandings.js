import React, { useState, useEffect } from 'react';
import { Trophy, Users, Search, RefreshCw, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

function LeagueStandings() {
  const [leagueId, setLeagueId] = useState('');
  const [leagueData, setLeagueData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('rank');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    // Load search history from localStorage
    const saved = localStorage.getItem('fpl-league-history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load search history:', e);
      }
    }
  }, []);

  const fetchLeagueData = async (id = leagueId, page = 1) => {
    if (!id || !id.trim()) {
      setError('Please enter a league ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/fpl/league/${id.trim()}?page=${page}`);
      const data = await response.json();
      setLeagueData(data.data);
      setCurrentPage(page);
      
      // Add to search history
      const historyItem = {
        id: id.trim(),
        name: response.data.data.league.name,
        timestamp: new Date().toISOString()
      };
      
      const newHistory = [historyItem, ...searchHistory.filter(item => item.id !== id.trim())].slice(0, 5);
      setSearchHistory(newHistory);
      localStorage.setItem('fpl-league-history', JSON.stringify(newHistory));
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch league data');
      setLeagueData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLeagueData();
  };

  const handleHistoryClick = (id) => {
    setLeagueId(id);
    setCurrentPage(1);
    fetchLeagueData(id);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortedStandings = () => {
    if (!leagueData?.standings?.results) return [];
    
    const sorted = [...leagueData.standings.results];
    
    sorted.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'rank':
          aVal = a.rank;
          bVal = b.rank;
          break;
        case 'total':
          aVal = a.total;
          bVal = b.total;
          break;
        case 'event_total':
          aVal = a.event_total;
          bVal = b.event_total;
          break;
        case 'player_name':
          aVal = a.player_name.toLowerCase();
          bVal = b.player_name.toLowerCase();
          break;
        case 'entry_name':
          aVal = a.entry_name.toLowerCase();
          bVal = b.entry_name.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    return sorted;
  };

  const SortHeader = ({ field, children, className = '' }) => (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortBy === field && (
          sortOrder === 'asc' ? 
            <ChevronUp className="w-4 h-4" /> : 
            <ChevronDown className="w-4 h-4" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
          <Trophy className="w-8 h-8 text-fpl-primary" />
          <span>League Standings</span>
        </h1>
        <p className="text-gray-600 mt-1">
          Search and view FPL league standings and rankings
        </p>
      </div>

      {/* Search Form */}
      <div className="fpl-card p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <label htmlFor="leagueId" className="block text-sm font-medium text-gray-700 mb-2">
                League ID
              </label>
              <input
                type="text"
                id="leagueId"
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                placeholder="Enter league ID (e.g., 314)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fpl-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find your league ID in the URL when viewing your league on the FPL website
              </p>
            </div>
            
            <div className="flex-shrink-0 flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="fpl-button-primary flex items-center space-x-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>{loading ? 'Searching...' : 'Search'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Searches</h3>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleHistoryClick(item.id)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  {item.name} (ID: {item.id})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-800">
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* League Data */}
      {leagueData && (
        <div className="space-y-6">
          {/* League Info */}
          <div className="fpl-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{leagueData.league.name}</h2>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{leagueData.standings.results.length} managers</span>
                  </span>
                  <span>League ID: {leagueData.league.id}</span>
                  <span>Admin: {leagueData.league.admin_entry || 'N/A'}</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-500">Created</div>
                <div className="font-medium">
                  {new Date(leagueData.league.created).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Standings Table */}
          <div className="fpl-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Current Standings</h3>
              <p className="text-sm text-gray-600 mt-1">
                Page {currentPage} of {Math.ceil((leagueData.standings.has_next ? 50 : leagueData.standings.results.length) / 50)}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortHeader field="rank">Rank</SortHeader>
                    <SortHeader field="player_name">Manager</SortHeader>
                    <SortHeader field="entry_name">Team Name</SortHeader>
                    <SortHeader field="event_total">GW Points</SortHeader>
                    <SortHeader field="total">Total Points</SortHeader>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedStandings().map((entry, index) => (
                    <StandingsRow 
                      key={entry.entry} 
                      entry={entry} 
                      index={index}
                      isTopThree={entry.rank <= 3}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(leagueData.standings.has_next || currentPage > 1) && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => fetchLeagueData(leagueId, currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="fpl-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="text-sm text-gray-700">
                  Page {currentPage}
                </span>
                
                <button
                  onClick={() => fetchLeagueData(leagueId, currentPage + 1)}
                  disabled={!leagueData.standings.has_next || loading}
                  className="fpl-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      {!leagueData && !loading && (
        <div className="fpl-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How to find your League ID</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-fpl-primary text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <p className="font-medium">Go to your league page on the FPL website</p>
                <p>Navigate to fantasy.premierleague.com and go to your league</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-fpl-primary text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <div>
                <p className="font-medium">Check the URL</p>
                <p>The league ID is the number in the URL: /leagues-classic/<strong>123456</strong>/standings/</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-fpl-primary text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <div>
                <p className="font-medium">Enter the ID above</p>
                <p>Copy the number and paste it into the search box</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StandingsRow({ entry, index, isTopThree }) {
  const getRankDisplay = () => {
    if (entry.rank === 1) return '🥇';
    if (entry.rank === 2) return '🥈';
    if (entry.rank === 3) return '🥉';
    return entry.rank;
  };

  const getChangeIndicator = () => {
    if (entry.rank_sort > entry.last_rank) {
      return <TrendingUp className="w-4 h-4 text-red-500" title="Rank dropped" />;
    } else if (entry.rank_sort < entry.last_rank) {
      return <TrendingUp className="w-4 h-4 text-green-500 transform rotate-180" title="Rank improved" />;
    }
    return null;
  };

  return (
    <tr className={`hover:bg-gray-50 ${isTopThree ? 'bg-yellow-50' : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className={`text-lg ${isTopThree ? 'font-bold' : 'font-medium'}`}>
            {getRankDisplay()}
          </span>
          {getChangeIndicator()}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{entry.player_name}</div>
        <div className="text-xs text-gray-500">ID: {entry.entry}</div>
      </td>
      
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900">{entry.entry_name}</div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{entry.event_total}</div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`text-sm font-bold ${isTopThree ? 'text-fpl-primary' : 'text-gray-900'}`}>
          {entry.total.toLocaleString()}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <a
          href={`/manager/${entry.entry}`}
          className="text-fpl-primary hover:text-fpl-primary/80 font-medium"
        >
          View Team
        </a>
      </td>
    </tr>
  );
}

export default LeagueStandings;
