import React, { useState, useEffect } from 'react';
import {
  Shield,
  LogOut,
  Clock,
  CheckCircle,
  ArrowLeftRight,
  BarChart3,
  Users,
  Bell,
  Activity,
  RefreshCw
} from 'lucide-react';
import { useDraftState } from '../hooks/useDraftState';
import { useRefresh } from '../contexts/RefreshContext';
import supabase from '../config/supabase';
import AuthForm from './AuthForm';
import ProfileCompletion from './ProfileCompletion';
import ForgotPassword from './ForgotPassword';
import NotificationPreferences from './NotificationPreferences';
import FPLSync from './FPLSync';
import APITester from './APITester';
import PWAStatus from './PWAStatus';
import PWAInstallPrompt from './PWAInstallPrompt';
import ErrorBoundary from './ErrorBoundary';

// Import tab components
import SimulationTab from './tabs/SimulationTab';
import TeamManagementTab from './tabs/TeamManagementTab';
import ConsolidatedStatsTab from './tabs/ConsolidatedStatsTab';

function DraftRefactored({ wsService, currentUser }) {
  const [activeTab, setActiveTab] = useState('simulation');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  const { refreshAll } = useRefresh();

  const {
    draftStatus,
    simulationStatus,
    chelseaPlayers,
    draftPicks,
    leaderboard,
    liveScores,
    loading,
    error,
    fetchDraftData,
    fetchLiveScores,
    fetchLeaderboard,
    startSimulation,
    simulateGameweek,
    draftPlayer
  } = useDraftState(currentUser);

  // Check profile completion
  useEffect(() => {
    const checkProfileCompletion = async() => {
      if (!currentUser) {
        setCheckingProfile(false);
        return;
      }

      try {
        setCheckingProfile(true);

        // Bypass profile completion for admin users
        if (currentUser.isAdmin) {
          setProfileComplete(true);
          setCheckingProfile(false);
          return;
        }

        const response = await fetch('/api/users?action=profile-completion');
        const data = await response.json();

        if (data.success) {
          setProfileComplete(data.data.isComplete);
        } else {
          console.warn('Profile completion check failed:', data.error);
          setProfileComplete(true); // Default to complete to avoid blocking
        }
      } catch (error) {
        console.error('Profile completion check error:', error);
        setProfileComplete(true); // Default to complete to avoid blocking
      } finally {
        setCheckingProfile(false);
      }
    };

    checkProfileCompletion();
  }, [currentUser]);

  // Fetch live scores periodically
  useEffect(() => {
    if (currentUser && draftStatus) {
      fetchLiveScores();

      const interval = setInterval(() => {
        fetchLiveScores();
      }, 30000); // Poll every 30 seconds

      return () => clearInterval(interval);
    }
  }, [currentUser, draftStatus, fetchLiveScores]);

  const handleLogout = async() => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      // Clear local state
      setProfileComplete(false);
      setActiveTab('simulation');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Logout failed: ' + error.message);
    }
  };

  const handleFPLSyncComplete = (syncData) => {
    console.log('🔄 FPL sync completed, refreshing all data...', syncData);
    // Refresh all data when FPL sync completes
    refreshAll();
  };

  // Show auth form if not logged in
  if (!currentUser) {
    if (showForgotPassword) {
      return <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />;
    }
    return (
      <AuthForm
        onForgotPassword={() => setShowForgotPassword(true)}
        onLogin={() => {}}
      />
    );
  }

  // Check if profile is complete
  if (!profileComplete && !checkingProfile) {
    return (
      <ProfileCompletion
        currentUser={currentUser}
        onProfileComplete={() => setProfileComplete(true)}
      />
    );
  }

  if (checkingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center justify-center space-x-3">
          <Clock className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Checking profile completion...</span>
        </div>
      </div>
    );
  }

  if (loading && !draftStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center justify-center space-x-3">
          <Clock className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Loading Chelsea Draft League...</span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">KPG's Competition</h1>
                <p className="text-gray-600">
                  Welcome
                  {' '}
                  {currentUser.email}
                  ! Pick your 5-a-side Chelsea team for the annual competition.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Admin Status */}
        {currentUser.isAdmin && (
          <div className="bg-purple-100 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-purple-800">
                Admin:
                {' '}
                {currentUser.email}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-lg">
          <nav className="flex space-x-8 px-6 py-4 border-b border-gray-200">
            <button
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'simulation' ?
                  'border-blue-500 text-blue-600' :
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('simulation')}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Simulation</span>
            </button>

            <button
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'team-management' ?
                  'border-blue-500 text-blue-600' :
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('team-management')}
            >
              <Users className="w-4 h-4" />
              <span>Team Management</span>
            </button>

            <button
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats' ?
                  'border-blue-500 text-blue-600' :
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('stats')}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Stats</span>
            </button>

            <button
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notifications' ?
                  'border-blue-500 text-blue-600' :
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </button>

            {currentUser?.isAdmin && (
              <>
                <button
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'fpl-sync' ?
                      'border-blue-500 text-blue-600' :
                      'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('fpl-sync')}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>FPL Sync</span>
                </button>

                <button
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'api-test' ?
                      'border-blue-500 text-blue-600' :
                      'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('api-test')}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>API Test</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === 'simulation' && (
            <SimulationTab
              currentUser={currentUser}
              draftStatus={draftStatus}
              leaderboard={leaderboard}
              onRefresh={fetchDraftData}
              onRefreshLeaderboard={fetchLeaderboard}
              onSimulateGameweek={simulateGameweek}
              onStartSimulation={startSimulation}
              simulationStatus={simulationStatus}
            />
          )}

          {activeTab === 'team-management' && (
            <TeamManagementTab
              currentUser={currentUser}
              draftStatus={draftStatus}
              onRefresh={fetchDraftData}
            />
          )}

          {activeTab === 'stats' && (
            <ConsolidatedStatsTab
              chelseaPlayers={chelseaPlayers}
              currentUser={currentUser}
              draftStatus={draftStatus}
              liveScores={liveScores}
              leaderboard={leaderboard}
              onRefresh={fetchDraftData}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationPreferences currentUser={currentUser} />
          )}

          {activeTab === 'fpl-sync' && (
            <FPLSync currentUser={currentUser} onSyncComplete={handleFPLSyncComplete} />
          )}

          {activeTab === 'api-test' && (
            <APITester currentUser={currentUser} />
          )}
        </div>

        {/* PWA Components */}
        <PWAStatus />
        <PWAInstallPrompt />

      </div>
    </ErrorBoundary>
  );
}

export default DraftRefactored;
