import React, { useState } from 'react';
import { RefreshCw, Download, CheckCircle, AlertCircle, Users, Eye, EyeOff } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import LoadingSpinner from './ui/LoadingSpinner';
import { getPositionColor } from '../utils/helpers';

function FPLSync({ currentUser, onSyncComplete }) {
  const [loading, setLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);
  const [showDataTable, setShowDataTable] = useState(false);
  const [syncedPlayers, setSyncedPlayers] = useState([]);
  const [supabasePlayers, setSupabasePlayers] = useState([]);
  const [showSupabaseData, setShowSupabaseData] = useState(false);

  const handleSyncPlayers = async () => {
    if (!currentUser?.isAdmin) {
      setError('Admin access required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSyncResult(null);

      console.log('🔄 Starting FPL sync...');

      const response = await fetch('/api/players?action=sync-chelsea-players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.access_token || ''}`
        }
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('❌ Non-JSON response received:', textResponse);
        throw new Error(`Server returned non-JSON response: ${textResponse.substring(0, 100)}...`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.success) {
        setSyncResult(data.data);
        setSyncedPlayers(data.data.players || []);
        console.log('✅ FPL sync completed:', data.data);
        console.log('📊 Synced players:', data.data.players?.length || 0);
        
        // Notify parent component that sync completed
        if (onSyncComplete) {
          onSyncComplete(data.data);
        }
      } else {
        throw new Error(data.error || 'Sync failed');
      }

    } catch (err) {
      console.error('❌ FPL sync error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSyncStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/players?action=sync-status');
      const data = await response.json();
      
      if (data.success) {
        console.log('📊 Sync status:', data.data);
        // You could display this data if needed
      }
    } catch (err) {
      console.error('Failed to check sync status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSupabaseData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Checking Supabase Chelsea players...');
      
      const response = await fetch('/api/players?action=get-chelsea-players');
      const data = await response.json();
      
      if (data.success) {
        setSupabasePlayers(data.data.players || []);
        console.log('📊 Supabase data:', data.data);
        console.log(`Found ${data.data.totalPlayers} players in Supabase`);
        console.log('Position counts:', data.data.positionCounts);
      } else {
        throw new Error(data.error || 'Failed to fetch Supabase data');
      }
    } catch (err) {
      console.error('Failed to check Supabase data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  if (!currentUser?.isAdmin) {
    return (
      <Card>
        <div className="text-center py-6">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Access Required</h3>
          <p className="text-gray-600">Only admins can sync FPL data.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">FPL Data Sync</h2>
            <p className="text-gray-600">Sync Chelsea players from the official FPL API</p>
          </div>
          <Download className="w-8 h-8 text-blue-600" />
        </div>

        {loading && (
          <div className="mb-6">
            <LoadingSpinner text="Syncing FPL data..." />
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-800 font-medium">Sync Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {syncResult && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center mb-2">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-green-800 font-medium">Sync Completed Successfully!</span>
            </div>
            <div className="text-green-700 text-sm space-y-1">
              <p>• Players created: <strong>{syncResult.playersCreated}</strong></p>
              <p>• Players updated: <strong>{syncResult.playersUpdated}</strong></p>
              <p>• Total players: <strong>{syncResult.totalPlayers}</strong></p>
            </div>
            
            {/* Data Table Toggle */}
            <div className="mt-4 pt-4 border-t border-green-200">
              <Button
                onClick={() => setShowDataTable(!showDataTable)}
                variant="secondary"
                size="small"
              >
                {showDataTable ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showDataTable ? 'Hide' : 'Show'} Synced Data
              </Button>
            </div>
          </div>
        )}

        {/* Data Table */}
        {syncResult && showDataTable && syncedPlayers.length > 0 && (
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Synced Chelsea Players ({syncedPlayers.length})
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Player
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Form
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Selected %
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Goals
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assists
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Clean Sheets
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Availability
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {syncedPlayers.map((player, index) => (
                        <tr key={player.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {player.web_name || player.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {player.first_name} {player.second_name}
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPositionColor(player.position)}`}>
                              {player.position}
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            £{player.price || 0}m
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="font-semibold text-blue-600">{player.total_points || 0}</div>
                            <div className="text-xs text-gray-500">BPS: {player.bps || 0}</div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="font-semibold text-purple-600">{player.form || 0}</div>
                            <div className="text-xs text-gray-500">ICT: {player.ict_index || 0}</div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.selected_by_percent ? `${player.selected_by_percent}%` : 'N/A'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="font-semibold text-green-600">{player.goals_scored || 0}</div>
                            <div className="text-xs text-gray-500">Threat: {player.threat || 0}</div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="font-semibold text-orange-600">{player.assists || 0}</div>
                            <div className="text-xs text-gray-500">Creativity: {player.creativity || 0}</div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="font-semibold text-blue-600">{player.clean_sheets || 0}</div>
                            <div className="text-xs text-gray-500">Saves: {player.saves || 0}</div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              player.is_available 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {player.is_available ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
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
                              {(player.chance_of_playing_this_round || player.chance_of_playing_next_round) && (
                                <div className="text-gray-500 mt-1">
                                  {player.chance_of_playing_this_round && (
                                    <span>This: {player.chance_of_playing_this_round}%</span>
                                  )}
                                  {player.chance_of_playing_this_round && player.chance_of_playing_next_round && (
                                    <span className="mx-1">•</span>
                                  )}
                                  {player.chance_of_playing_next_round && (
                                    <span>Next: {player.chance_of_playing_next_round}%</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              
              {/* Availability Summary */}
              {syncResult && syncResult.availability_breakdown && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">Availability Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {syncResult.availability_breakdown.available || 0}
                      </div>
                      <div className="text-gray-600">Available</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {syncResult.availability_breakdown.unavailable || 0}
                      </div>
                      <div className="text-gray-600">Unavailable</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {syncResult.availability_breakdown.doubtful || 0}
                      </div>
                      <div className="text-gray-600">Doubtful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {syncResult.availability_breakdown.injured || 0}
                      </div>
                      <div className="text-gray-600">Injured</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Supabase Data Table */}
        {supabasePlayers.length > 0 && showSupabaseData && (
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Current Supabase Data ({supabasePlayers.length} players)
                </h3>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        FPL ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supabasePlayers.map((player, index) => (
                      <tr key={player.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {player.name}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {player.fpl_id || 'N/A'}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {player.updated_at ? new Date(player.updated_at).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">What this does:</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Fetches current Chelsea squad from FPL API</li>
              <li>• Clears existing data and replaces with fresh data</li>
              <li>• Updates player names, positions, and prices</li>
              <li>• Ensures your app has the latest Chelsea data</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="flex space-x-3">
              <Button
                onClick={handleSyncPlayers}
                disabled={loading}
                loading={loading}
                variant="primary"
                size="large"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Chelsea Players from FPL
              </Button>

              <Button
                onClick={handleCheckSyncStatus}
                disabled={loading}
                variant="secondary"
                size="large"
              >
                Check Sync Status
              </Button>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleCheckSupabaseData}
                disabled={loading}
                variant="secondary"
                size="large"
              >
                <Users className="w-4 h-4 mr-2" />
                Check Supabase Data
              </Button>

              {supabasePlayers.length > 0 && (
                <Button
                  onClick={() => setShowSupabaseData(!showSupabaseData)}
                  variant="secondary"
                  size="large"
                >
                  {showSupabaseData ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showSupabaseData ? 'Hide' : 'Show'} Supabase Data
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            <strong>Note:</strong> This will fetch live data from the official Fantasy Premier League API.
            Run this whenever you want to update the Chelsea squad with the latest transfers and player information.
          </p>
        </div>
      </div>
    </Card>
  );
}

export default FPLSync;
