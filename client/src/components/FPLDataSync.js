import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Database, ExternalLink } from 'lucide-react';
import fplApiService from '../services/fplApiService';

const FPLDataSync = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);

  const handleSyncPlayers = async () => {
    setLoading(true);
    setError('');
    setStatus('');

    try {
      setStatus('Fetching Chelsea players from FPL API...');
      
      const players = await fplApiService.syncChelseaPlayersToDatabase();
      
      setStatus(`✅ Successfully synced ${players.length} Chelsea players!`);
      setLastSync(new Date().toLocaleString());
      
    } catch (err) {
      console.error('Sync failed:', err);
      setError(`Failed to sync players: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setError('');
    setStatus('');

    try {
      setStatus('Testing FPL API connection...');
      
      const players = await fplApiService.fetchChelseaPlayers();
      
      setStatus(`✅ FPL API connection successful! Found ${players.length} Chelsea players.`);
      
    } catch (err) {
      console.error('Connection test failed:', err);
      setError(`FPL API connection failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Database className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">FPL Data Sync</h2>
        </div>
        <a 
          href="https://fantasy.premierleague.com/api/bootstrap-static/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
        >
          <ExternalLink className="w-4 h-4" />
          <span>FPL API</span>
        </a>
      </div>

      <div className="space-y-4">
        {/* Status Messages */}
        {status && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">{status}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Last Sync Info */}
        {lastSync && (
          <div className="text-sm text-gray-600">
            Last sync: {lastSync}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleTestConnection}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Test FPL API</span>
          </button>

          <button
            onClick={handleSyncPlayers}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Chelsea Players</span>
          </button>
        </div>

        {/* Info */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-1">What this does:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Fetches real Chelsea player data from the official FPL API</li>
            <li>Updates player prices, form, total points, and availability</li>
            <li>Replaces any existing player data with current FPL data</li>
            <li>Includes injury news and playing chances</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FPLDataSync;
