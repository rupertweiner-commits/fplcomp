import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  RefreshCw,
  Crown,
  Trophy,
  Users,
  Target,
  Zap
} from 'lucide-react';
import supabase from '../../config/supabase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { handleApiError } from '../../utils/errorHandler';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../utils/constants';

function SimulationTab({
  currentUser,
  draftStatus,
  simulationStatus,
  leaderboard,
  onRefresh,
  onStartSimulation,
  onSimulateGameweek,
  onRefreshLeaderboard
}) {
  const [loading, setLoading] = useState(false);
  const [gameweekHistory, setGameweekHistory] = useState([]);

  const fetchSimulationData = async() => {
    try {
      const response = await fetch('/api/simulation?action=status');
      const data = await response.json();

      if (data.success) {
        setGameweekHistory(data.data?.gameweekHistory || []);
      }
    } catch (error) {
      console.error('Failed to fetch simulation data:', error);
    }
  };

  useEffect(() => {
    fetchSimulationData();
  }, []);

  const handleSimulateGameweek = async() => {
    if (!currentUser?.isAdmin) {
      alert('Admin access required');
      return;
    }

    try {
      setLoading(true);
      console.log('🎯 Starting gameweek simulation...');

      const response = await fetch('/api/simulation?action=simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameweek: simulationStatus?.current_gameweek || 1
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Gameweek simulation completed:', data.data);
        alert(`Gameweek ${simulationStatus?.current_gameweek || 1} simulated successfully!`);
        await onRefresh();
        await fetchSimulationData();
        await onRefreshLeaderboard();
      } else {
        console.error('❌ Simulation failed:', data.error);
        alert(`Simulation failed: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Simulation error:', error);
      alert('Simulation failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSimulation = async() => {
    if (!currentUser?.isAdmin) {
      alert('Admin access required');
      return;
    }

    if (!window.confirm('Are you sure you want to reset the entire simulation? This will clear all data.')) {
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Resetting simulation...');

      const response = await fetch('/api/simulation?action=reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Simulation reset successfully');
        await onRefresh();
        await fetchSimulationData();
        await onRefreshLeaderboard();
        alert('Simulation reset successfully!');
      } else {
        console.error('❌ Reset failed:', data.error);
        alert(`Reset failed: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Reset error:', error);
      alert('Reset failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNextGameweek = async() => {
    if (!currentUser?.isAdmin) {
      alert('Admin access required');
      return;
    }

    try {
      setLoading(true);
      console.log('📅 Simulating next gameweek...');

      const response = await fetch('/api/simulation?action=simulate-next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Next gameweek simulated successfully:', data.data);
        alert(`Gameweek ${data.data.gameweek} simulated! ${data.data.results.length} players updated.`);
        // Refresh the leaderboard and simulation status
        if (onRefreshLeaderboard) onRefreshLeaderboard();
        if (onRefresh) onRefresh();
      } else {
        console.error('❌ Next gameweek simulation failed:', data.error);
        alert(`Next gameweek simulation failed: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Next gameweek simulation error:', error);
      alert(`Next gameweek simulation error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentGameweek = simulationStatus?.current_gameweek || 1;
  const isDraftComplete = simulationStatus?.is_draft_complete || false;

  return (
    <div className="space-y-8">
      {/* Simulation Controls */}
      <Card className="shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Live FPL Mode</h2>
              <p className="text-gray-600">Use real FPL data and current gameweek status.</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              LIVE
            </div>
            <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium flex items-center space-x-1">
              <Crown className="w-4 h-4" />
              <span>Admin Access</span>
            </div>
          </div>
        </div>

        {/* Admin Access Status */}
        {currentUser?.isAdmin ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fillRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Admin Access Granted
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Welcome Rupert! You have full access to all simulation features.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path clipRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" fillRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Admin Access Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Simulation features are only available to Rupert (Admin). Rupert must be logged in to access these features.</p>
                  <p className="mt-1">
                    <strong>To use simulation:</strong>
                    {' '}
                    Contact Rupert for access.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: '#034694' }}>{typeof currentGameweek === 'number' ? currentGameweek : 1}</div>
            <div className="text-sm text-gray-600">Current Gameweek</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: '#034694' }}>{draftStatus?.users?.length || 0}</div>
            <div className="text-sm text-gray-600">Players</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: '#034694' }}>{draftStatus?.draftedCount || 0}</div>
            <div className="text-sm text-gray-600">Drafted Players</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: '#034694' }}>{leaderboard.length}</div>
            <div className="text-sm text-gray-600">Active Teams</div>
          </div>
        </div>

        {/* Simulation Actions */}
        <div className="flex flex-wrap gap-4">
          <Button
            disabled={loading || !currentUser?.isAdmin}
            loading={loading}
            onClick={onStartSimulation}
            size="large"
            variant="primary"
          >
            <Play className="w-5 h-5 mr-2" />
            Enter Simulation
          </Button>

          <Button
            disabled={loading || !currentUser?.isAdmin || !isDraftComplete}
            loading={loading}
            onClick={handleSimulateGameweek}
            size="large"
            variant="success"
          >
            <Play className="w-4 h-4 mr-2" />
            Simulate Current Gameweek
          </Button>

          <Button
            disabled={loading || !currentUser?.isAdmin}
            loading={loading}
            onClick={handleNextGameweek}
            size="large"
            variant="primary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Next Gameweek
          </Button>

          <Button
            disabled={loading || !currentUser?.isAdmin}
            loading={loading}
            onClick={handleResetSimulation}
            size="large"
            variant="danger"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
        </div>

        {/* Mode Hint */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <Zap className="w-5 h-5 text-blue-600 mr-2" />
            <p className="text-sm text-blue-800">
              <strong>Live Mode:</strong>
              {' '}
              Using real FPL data and current gameweek status. Switch to simulation mode to test features.
            </p>
          </div>
        </div>
      </Card>

      {/* Gameweek History */}
      {gameweekHistory.length > 0 && (
        <Card className="shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gameweek History</h3>
          <div className="space-y-2">
            {gameweekHistory.map((week, index) => (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" key={index}>
                <span className="font-medium">
                  Gameweek
                  {week.gameweek}
                </span>
                <span className="text-sm text-gray-600">
                  {new Date(week.simulated_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Test Transfer Section (Admin Only) */}
      {currentUser?.isAdmin && (
        <Card className="shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Transfer System</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4" />
                Test Transfer
              </button>
              <div className="text-sm text-gray-600">
                Test the transfer system with sample data
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default SimulationTab;
