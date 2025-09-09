import React, { useState } from 'react';
import { RefreshCw, Download, CheckCircle, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import LoadingSpinner from './ui/LoadingSpinner';

function FPLSync({ currentUser, onSyncComplete }) {
  const [loading, setLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);

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

      const response = await fetch('/api/fpl-sync?action=sync-chelsea-players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.access_token || ''}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.success) {
        setSyncResult(data.data);
        console.log('✅ FPL sync completed:', data.data);
        
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
      const response = await fetch('/api/fpl-sync?action=sync-status');
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
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">What this does:</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Fetches current Chelsea squad from FPL API</li>
              <li>• Updates player names, positions, and prices</li>
              <li>• Adds new players and marks unavailable ones</li>
              <li>• Ensures your app has the latest Chelsea data</li>
            </ul>
          </div>

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
