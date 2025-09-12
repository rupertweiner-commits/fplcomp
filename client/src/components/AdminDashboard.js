import React, { useState, useEffect } from 'react';
import { Users, Trophy, Target, CheckCircle, AlertCircle, Settings, BarChart3, UserCheck, RefreshCw, Database, TestTube } from 'lucide-react';
import TeamCompositionValidator from './TeamCompositionValidator';
import InjuryStatusDisplay from './InjuryStatusDisplay';

function AdminDashboard({ currentUser }) {
  const [activeSection, setActiveSection] = useState('draft-allocation');
  const [mockUsers, setMockUsers] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [isCaptain, setIsCaptain] = useState(false);
  const [isViceCaptain, setIsViceCaptain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Simulation state
  const [simulationStatus, setSimulationStatus] = useState(null);
  const [draftStatus, setDraftStatus] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  // API Testing state
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch mock users
      const usersResponse = await fetch('/api/draft-allocation-simple?action=get-mock-users', {
        headers: {
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        }
      });
      const usersData = await usersResponse.json();
      if (usersData.success && usersData.data && usersData.data.users) {
        setMockUsers(usersData.data.users);
        if (usersData.data.users.length > 0) {
          setSelectedUser(usersData.data.users[0].id);
        }
      }

      // Fetch available players
      const playersResponse = await fetch('/api/draft-allocation-simple?action=get-available-players', {
        headers: {
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        }
      });
      const playersData = await playersResponse.json();
      if (playersData.success && playersData.data && playersData.data.players) {
        setAvailablePlayers(playersData.data.players);
      }

      // Fetch current allocations
      const allocationsResponse = await fetch('/api/draft-allocation-simple?action=get-allocations', {
        headers: {
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        }
      });
      const allocationsData = await allocationsResponse.json();
      if (allocationsData.success && allocationsData.data && allocationsData.data.allocations) {
        setAllocations(allocationsData.data.allocations);
      }

      // Fetch simulation status
      const simulationResponse = await fetch('/api/simulation?action=get-status', {
        headers: {
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        }
      });
      const simulationData = await simulationResponse.json();
      if (simulationData.success) {
        setSimulationStatus(simulationData.data);
      }

      // Fetch draft status
      const draftResponse = await fetch('/api/draft-allocation-simple?action=get-draft-status', {
        headers: {
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        }
      });
      const draftData = await draftResponse.json();
      if (draftData.success) {
        setDraftStatus(draftData.data);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleAllocatePlayer = async () => {
    if (!selectedUser || !selectedPlayer) {
      setMessage({ type: 'error', text: 'Please select both a user and a player' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/draft-allocation-simple?action=allocate-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        },
        body: JSON.stringify({
          targetUserId: selectedUser,
          playerId: parseInt(selectedPlayer),
          isCaptain: isCaptain,
          isViceCaptain: isViceCaptain
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Player allocated successfully!' });
        setSelectedPlayer('');
        setIsCaptain(false);
        setIsViceCaptain(false);
        fetchData(); // Refresh data
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to allocate player' });
      }
    } catch (error) {
      console.error('Error allocating player:', error);
      setMessage({ type: 'error', text: 'Failed to allocate player' });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDraft = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/draft-allocation-simple?action=complete-draft', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Draft completed successfully!' });
        fetchData(); // Refresh data
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to complete draft' });
      }
    } catch (error) {
      console.error('Error completing draft:', error);
      setMessage({ type: 'error', text: 'Failed to complete draft' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSimulation = async () => {
    setLoading(true);
    try {
      const action = simulationStatus?.is_simulation_mode ? 'exit-simulation' : 'start-simulation';
      const response = await fetch(`/api/simulation?action=${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Simulation mode toggled' });
        fetchData(); // Refresh data
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to toggle simulation' });
      }
    } catch (error) {
      console.error('Error toggling simulation:', error);
      setMessage({ type: 'error', text: 'Failed to toggle simulation' });
    } finally {
      setLoading(false);
    }
  };

  const getTotalAllocations = () => {
    return allocations.reduce((total, allocation) => {
      return total + (allocation.players ? allocation.players.length : 0);
    }, 0);
  };

  const getUsersWithCompleteTeams = () => {
    return allocations.filter(allocation => 
      allocation.players && allocation.players.length === 5
    ).length;
  };

  const getUsersWithIncompleteTeams = () => {
    return allocations.filter(allocation => 
      allocation.players && allocation.players.length < 5
    ).length;
  };

  // API Testing Functions
  const testApiEndpoint = async (endpoint, action, method = 'GET') => {
    const startTime = Date.now();
    const testName = action ? `${endpoint}?action=${action}` : endpoint;
    
    try {
      let url = `/api/${endpoint}`;
      if (action) {
        url += `?action=${action}`;
      }

      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.access_token || ''}`
        }
      };

      const response = await fetch(url, options);
      const responseTime = Date.now() - startTime;
      const data = await response.json();

      const result = {
        endpoint: testName,
        method,
        status: response.ok ? 'success' : 'error',
        responseTime,
        statusCode: response.status,
        message: response.ok ? 
          (data.message || `${method} request successful`) : 
          (data.error || `HTTP ${response.status}: ${response.statusText}`),
        timestamp: new Date().toISOString()
      };

      setTestResults(prev => [result, ...prev]);
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result = {
        endpoint: testName,
        method,
        status: 'error',
        responseTime,
        statusCode: 0,
        message: error.message || 'Network error',
        timestamp: new Date().toISOString()
      };

      setTestResults(prev => [result, ...prev]);
      return result;
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    const tests = [
      // Core System APIs
      { endpoint: 'draft-allocation-simple', action: 'get-draft-status', method: 'GET' },
      { endpoint: 'draft-allocation-simple', action: 'get-mock-users', method: 'GET' },
      { endpoint: 'draft-allocation-simple', action: 'get-available-players', method: 'GET' },
      { endpoint: 'draft-allocation-simple', action: 'get-allocations', method: 'GET' },
      
      // Simulation APIs
      { endpoint: 'simulation', action: 'status', method: 'GET' },
      { endpoint: 'simulation', action: 'leaderboard', method: 'GET' },
      { endpoint: 'simulation', action: 'get-gameweek-results', method: 'GET' },
      
      // FPL Sync APIs
      { endpoint: 'fpl-sync', action: 'test', method: 'GET' },
      { endpoint: 'fpl-sync', action: 'sync-status', method: 'GET' },
      { endpoint: 'fpl-sync', action: 'get-chelsea-players', method: 'GET' },
      
      // User & Activity APIs
      { endpoint: 'activity', action: 'recent', method: 'GET' },
      { endpoint: 'leaderboard', action: null, method: 'GET' }
    ];

    // Run tests sequentially to avoid overwhelming the server
    for (const test of tests) {
      await testApiEndpoint(test.endpoint, test.action, test.method);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setLoading(false);
    setMessage({ type: 'success', text: `Completed ${tests.length} API tests` });
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const exportTestResults = () => {
    const dataStr = JSON.stringify(testResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api-test-results-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Settings className="h-8 w-8 mr-3 text-purple-600" />
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Manage draft allocation and simulation controls</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                👑 Admin Access
              </span>
              {simulationStatus?.is_simulation_mode && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  🎮 Simulation Mode
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'draft-allocation' ?
                  'border-blue-500 text-blue-600' :
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveSection('draft-allocation')}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Draft Allocation
            </button>
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'simulation' ?
                  'border-blue-500 text-blue-600' :
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveSection('simulation')}
            >
              <Trophy className="h-4 w-4 inline mr-2" />
              Simulation Controls
            </button>
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'fpl-sync' ?
                  'border-blue-500 text-blue-600' :
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveSection('fpl-sync')}
            >
              <RefreshCw className="h-4 w-4 inline mr-2" />
              FPL Sync
            </button>
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'api-test' ?
                  'border-blue-500 text-blue-600' :
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveSection('api-test')}
            >
              <Settings className="h-4 w-4 inline mr-2" />
              API Test
            </button>
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'user-activity' ?
                  'border-blue-500 text-blue-600' :
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveSection('user-activity')}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              User Activity
            </button>
          </nav>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Draft Allocation Section */}
        {activeSection === 'draft-allocation' && (
          <div className="space-y-8">
            {/* Draft Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Draft Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Total Users</p>
                      <p className="text-2xl font-bold text-blue-900">{mockUsers.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Target className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Total Allocations</p>
                      <p className="text-2xl font-bold text-green-900">{getTotalAllocations()}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600">Complete Teams</p>
                      <p className="text-2xl font-bold text-purple-900">{getUsersWithCompleteTeams()}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-8 w-8 text-orange-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-orange-600">Incomplete Teams</p>
                      <p className="text-2xl font-bold text-orange-900">{getUsersWithIncompleteTeams()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Player Allocation */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Allocate Player</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a user...</option>
                    {mockUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Player</label>
                  <select
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a player...</option>
                    {availablePlayers.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.web_name || player.name} ({player.position}) - {player.total_points || 0} pts - {player.availability_status || 'Available'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Captain/Vice Captain Selection */}
              <div className="mt-4 flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isCaptain}
                    onChange={(e) => {
                      setIsCaptain(e.target.checked);
                      if (e.target.checked) setIsViceCaptain(false);
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Captain</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isViceCaptain}
                    onChange={(e) => {
                      setIsViceCaptain(e.target.checked);
                      if (e.target.checked) setIsCaptain(false);
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Vice Captain</span>
                </label>
              </div>

              {/* Player Details and Availability Context */}
              {selectedPlayer && (
                <div className="mt-4">
                  {(() => {
                    const player = availablePlayers.find(p => p.id === parseInt(selectedPlayer));
                    if (!player) return null;
                    
                    return (
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {player.web_name || player.name} ({player.position})
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">{player.total_points || 0} pts</span>
                            {player.is_strategic_pick && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                💡 Strategic Pick
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <InjuryStatusDisplay player={player} />
                        
                        {player.availability_reason && (
                          <div className="mt-3 text-sm text-gray-600">
                            <strong>Status:</strong> {player.availability_reason}
                          </div>
                        )}
                        
                        {player.news && (
                          <div className="mt-2 text-sm text-gray-600">
                            <strong>Latest News:</strong> {player.news}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Allocate Button */}
              <div className="mt-6">
                <button
                  onClick={handleAllocatePlayer}
                  disabled={loading || !selectedUser || !selectedPlayer}
                  className={`px-6 py-2 rounded-md font-medium ${
                    loading || !selectedUser || !selectedPlayer
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Allocating...' : 'Allocate Player'}
                </button>
              </div>
            </div>

            {/* Current Allocations */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Allocations</h2>
              <div className="space-y-4">
                {allocations.map((userAllocation, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {userAllocation.user?.first_name} {userAllocation.user?.last_name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {userAllocation.players ? userAllocation.players.length : 0}/5 players
                        </span>
                        <span className="text-sm text-gray-500">
                          {userAllocation.players ? userAllocation.players.filter(player => player.position === 'GK' || player.position === 'DEF').length : 0} GK/DEF, {userAllocation.players ? userAllocation.players.filter(player => player.position === 'MID' || player.position === 'FWD').length : 0} MID/FWD
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <TeamCompositionValidator 
                        players={userAllocation.players || []} 
                        availablePlayers={availablePlayers} 
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(userAllocation.players || []).map((player, playerIndex) => (
                          <div key={playerIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm font-medium">{player.name}</span>
                            <div className="flex space-x-2">
                              {player.is_captain && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">C</span>
                              )}
                              {player.is_vice_captain && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">VC</span>
                              )}
                              <span className="text-xs text-gray-500">{player.total_points} pts</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete Draft Button */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Complete Draft</h2>
                  <p className="text-gray-600 mt-1">Finalize all player allocations and start the competition</p>
                </div>
                <button
                  onClick={handleCompleteDraft}
                  disabled={loading}
                  className={`px-6 py-2 rounded-md font-medium ${
                    loading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {loading ? 'Completing...' : 'Complete Draft'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Simulation Controls Section */}
        {activeSection === 'simulation' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Simulation Controls</h2>
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-800">
                    {simulationStatus?.is_simulation_mode ? '🎮 Simulation Mode' : '🏆 Live FPL Mode'}
                  </h3>
                  <p className="text-gray-600">
                    {simulationStatus?.is_simulation_mode ?
                      'Test features with simulated scores and custom gameweek progression' :
                      'Use real FPL data and current gameweek status'
                    }
                  </p>
                </div>
                <button
                  onClick={handleToggleSimulation}
                  disabled={loading}
                  className={`px-6 py-2 rounded-md font-medium ${
                    simulationStatus?.is_simulation_mode ?
                      'bg-red-600 hover:bg-red-700 text-white' :
                      'bg-blue-600 hover:bg-blue-700 text-white'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Toggling...' : 
                   simulationStatus?.is_simulation_mode ? 'Exit Simulation' : 'Enter Simulation'}
                </button>
              </div>

              {simulationStatus && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800">Current Gameweek</h4>
                    <p className="text-2xl font-bold text-blue-600">{simulationStatus.current_gameweek || 1}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800">Draft Complete</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {simulationStatus.is_draft_complete ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800">Mode</h4>
                    <p className="text-2xl font-bold text-purple-600">
                      {simulationStatus.is_simulation_mode ? 'Simulation' : 'Live'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Activity Section */}
        {activeSection === 'user-activity' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">User Activity</h2>
              <p className="text-gray-600">User activity monitoring and analytics will be displayed here.</p>
              {/* TODO: Implement user activity display */}
            </div>
          </div>
        )}

        {/* FPL Sync Section */}
        {activeSection === 'fpl-sync' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <RefreshCw className="h-6 w-6 mr-2 text-blue-600" />
                FPL Data Synchronization
              </h2>
              
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Sync Status</h3>
                  <p className="text-sm text-blue-700">
                    Keep your Chelsea player data synchronized with the latest FPL information.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">Last Sync</h4>
                    <p className="text-sm text-gray-600">Never synced</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">Players Synced</h4>
                    <p className="text-sm text-gray-600">{availablePlayers.length} players</p>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setMessage({ type: 'info', text: 'FPL sync functionality will be implemented here' })}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <RefreshCw className="h-4 w-4 inline mr-2" />
                    Sync FPL Data
                  </button>
                  <button
                    onClick={() => setMessage({ type: 'info', text: 'Force refresh will be implemented here' })}
                    className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    <Database className="h-4 w-4 inline mr-2" />
                    Force Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Test Section */}
        {activeSection === 'api-test' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <TestTube className="h-6 w-6 mr-2 text-green-600" />
                API Testing & Diagnostics
              </h2>
              
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">API Health Check</h3>
                  <p className="text-sm text-green-700">
                    Test all API endpoints and verify system connectivity. This tool helps identify which endpoints are working and which need attention.
                  </p>
                </div>

                {/* API Endpoint Categories */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Core System APIs */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                      <Database className="h-5 w-5 mr-2 text-blue-600" />
                      Core System APIs
                    </h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => testApiEndpoint('draft-allocation-simple', 'get-draft-status', 'GET')}
                        className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-blue-50 text-sm"
                      >
                        📊 Draft Status
                      </button>
                      <button
                        onClick={() => testApiEndpoint('draft-allocation-simple', 'get-mock-users', 'GET')}
                        className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-blue-50 text-sm"
                      >
                        👥 Mock Users
                      </button>
                      <button
                        onClick={() => testApiEndpoint('draft-allocation-simple', 'get-available-players', 'GET')}
                        className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-blue-50 text-sm"
                      >
                        ⚽ Available Players
                      </button>
                      <button
                        onClick={() => testApiEndpoint('draft-allocation-simple', 'get-allocations', 'GET')}
                        className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-blue-50 text-sm"
                      >
                        🎯 Current Allocations
                      </button>
                    </div>
                  </div>

                  {/* Simulation APIs */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                      <Trophy className="h-5 w-5 mr-2 text-purple-600" />
                      Simulation APIs
                    </h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => testApiEndpoint('simulation', 'status', 'GET')}
                        className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-purple-50 text-sm"
                      >
                        🎮 Simulation Status
                      </button>
                      <button
                        onClick={() => testApiEndpoint('simulation', 'leaderboard', 'GET')}
                        className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-purple-50 text-sm"
                      >
                        🏆 Leaderboard
                      </button>
                      <button
                        onClick={() => testApiEndpoint('simulation', 'get-gameweek-results', 'GET')}
                        className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-purple-50 text-sm"
                      >
                        📈 Gameweek Results
                      </button>
                    </div>
                  </div>

                  {/* FPL Sync APIs */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                      <RefreshCw className="h-5 w-5 mr-2 text-orange-600" />
                      FPL Sync APIs
                    </h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => testApiEndpoint('fpl-sync', 'test', 'GET')}
                        className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-orange-50 text-sm"
                      >
                        🔧 FPL Sync Test
                      </button>
                      <button
                        onClick={() => testApiEndpoint('fpl-sync', 'sync-status', 'GET')}
                        className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-orange-50 text-sm"
                      >
                        📊 Sync Status
                      </button>
                      <button
                        onClick={() => testApiEndpoint('fpl-sync', 'get-chelsea-players', 'GET')}
                        className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-orange-50 text-sm"
                      >
                        ⚽ Chelsea Players
                      </button>
                    </div>
                  </div>

                  {/* User & Activity APIs */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                      <UserCheck className="h-5 w-5 mr-2 text-green-600" />
                      User & Activity APIs
                    </h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => testApiEndpoint('activity', 'recent', 'GET')}
                        className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-green-50 text-sm"
                      >
                        📝 Recent Activity
                      </button>
                      <button
                        onClick={() => testApiEndpoint('leaderboard', null, 'GET')}
                        className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-green-50 text-sm"
                      >
                        🏆 Leaderboard (Legacy)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Test Results */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3">Test Results</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {testResults.map((result, index) => (
                      <div key={index} className={`p-3 rounded border-l-4 ${
                        result.status === 'success' ? 'bg-green-50 border-green-400' :
                        result.status === 'error' ? 'bg-red-50 border-red-400' :
                        'bg-yellow-50 border-yellow-400'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{result.endpoint}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            result.status === 'success' ? 'bg-green-100 text-green-800' :
                            result.status === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {result.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {result.method} - {result.responseTime}ms
                        </div>
                        {result.message && (
                          <div className="text-xs text-gray-700 mt-1">
                            {result.message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex space-x-4">
                  <button
                    onClick={runAllTests}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Run All Tests
                  </button>
                  <button
                    onClick={clearTestResults}
                    className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Clear Results
                  </button>
                  <button
                    onClick={exportTestResults}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Export Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
