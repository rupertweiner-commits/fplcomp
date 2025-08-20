import React, { useState, useEffect, useRef } from 'react';
import { Clock, Play, Pause, Trophy, User, SkipForward, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
const DraftQueue = ({ currentUser, onDraftUpdate }) => {
  const [draftStatus, setDraftStatus] = useState(null);
  const [draftProgress, setDraftProgress] = useState(null);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  
  const timerRef = useRef(null);
  const statusIntervalRef = useRef(null);

  // Fetch draft status on component mount
  useEffect(() => {
    fetchDraftStatus();
    
    // Set up polling for status updates
    statusIntervalRef.current = setInterval(fetchDraftStatus, 5000);
    
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Set up countdown timer when it's user's turn
  useEffect(() => {
    if (isMyTurn && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isMyTurn, timeRemaining]);

  // Check if it's current user's turn
  useEffect(() => {
    if (currentTurn && currentUser) {
      const isTurn = currentTurn.currentPlayer?.userId === currentUser.id;
      setIsMyTurn(isTurn);
      
      if (isTurn) {
        setTimeRemaining(currentTurn.timeRemaining || 60);
      }
    }
  }, [currentTurn, currentUser]);

  const fetchDraftStatus = async () => {
    try {
      const [statusRes, progressRes, turnRes] = await Promise.all([
        axios.get('/api/draft-queue/status'),
        axios.get('/api/draft-queue/progress'),
        axios.get('/api/draft-queue/current-turn')
      ]);

      setDraftStatus(statusRes.data.data);
      setDraftProgress(progressRes.data.data);
      setCurrentTurn(turnRes.data.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch draft status:', error);
      setError('Failed to fetch draft status');
    }
  };

  const initializeDraft = async () => {
    if (!currentUser?.isAdmin) return;
    
    setLoading(true);
    try {
      // Get users from your existing draft data
      const users = [
        { id: 1, username: 'Portia' },
        { id: 2, username: 'Yasmin' },
        { id: 3, username: 'Rupert' },
        { id: 4, username: 'Will' }
      ];

      await axios.post('/api/draft-queue/initialize', {
        userId: currentUser.id,
        users: users
      });

      setMessage('Draft initialized successfully!');
      fetchDraftStatus();
    } catch (error) {
      console.error('Failed to initialize draft:', error);
      setError(error.response?.data?.error || 'Failed to initialize draft');
    } finally {
      setLoading(false);
    }
  };

  const startDraft = async () => {
    if (!currentUser?.isAdmin) return;
    
    setLoading(true);
    try {
      await axios.post('/api/draft-queue/start', {
        userId: currentUser.id
      });

      setMessage('Draft started!');
      fetchDraftStatus();
    } catch (error) {
      console.error('Failed to start draft:', error);
      setError(error.response?.data?.error || 'Failed to start draft');
    } finally {
      setLoading(false);
    }
  };

  const pauseDraft = async () => {
    if (!currentUser?.isAdmin) return;
    
    setLoading(true);
    try {
      await axios.post('/api/draft-queue/pause', {
        userId: currentUser.id
      });

      setMessage('Draft paused');
      fetchDraftStatus();
    } catch (error) {
      console.error('Failed to pause draft:', error);
      setError(error.response?.data?.error || 'Failed to pause draft');
    } finally {
      setLoading(false);
    }
  };

  const resumeDraft = async () => {
    if (!currentUser?.isAdmin) return;
    
    setLoading(true);
    try {
      await axios.post('/api/draft-queue/resume', {
        userId: currentUser.id
      });

      setMessage('Draft resumed');
      fetchDraftStatus();
    } catch (error) {
      console.error('Failed to resume draft:', error);
      setError(error.response?.data?.error || 'Failed to resume draft');
    } finally {
      setLoading(false);
    }
  };

  const resetDraft = async () => {
    if (!currentUser?.isAdmin) return;
    
    if (!window.confirm('Are you sure you want to reset the draft? This will clear all picks.')) {
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/draft-queue/reset', {
        userId: currentUser.id
      });

      setMessage('Draft reset successfully');
      fetchDraftStatus();
    } catch (error) {
      console.error('Failed to reset draft:', error);
      setError(error.response?.data?.error || 'Failed to reset draft');
    } finally {
      setLoading(false);
    }
  };

  const skipTurn = async (targetUserId, reason) => {
    if (!currentUser?.isAdmin) return;
    
    setLoading(true);
    try {
      await axios.post('/api/draft-queue/skip-turn', {
        userId: currentUser.id,
        targetUserId,
        reason: reason || 'Admin skip'
      });

      setMessage('Turn skipped successfully');
      fetchDraftStatus();
    } catch (error) {
      console.error('Failed to skip turn:', error);
      setError(error.response?.data?.error || 'Failed to skip turn');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'text-yellow-600 bg-yellow-100';
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-orange-600 bg-orange-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'waiting': return <Clock className="w-4 h-4" />;
      case 'active': return <Play className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'completed': return <Trophy className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (!draftStatus) {
    return (
      <div className="mobile-card">
        <div className="mobile-loading">
          <div className="mobile-loading-spinner"></div>
          <p className="mt-4 text-gray-600">Loading draft status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Draft Status Header */}
      <div className="mobile-card">
        <div className="mobile-card-header">
          <div>
            <h2 className="mobile-card-title">Draft Queue</h2>
            <p className="mobile-card-subtitle">
              Sequential draft with turn notifications
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(draftStatus.status)}`}>
            <div className="flex items-center space-x-2">
              {getStatusIcon(draftStatus.status)}
              <span className="capitalize">{draftStatus.status}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {draftProgress && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{draftProgress.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${draftProgress.progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{draftProgress.completedPicks} picks made</span>
              <span>{draftProgress.remainingPicks} remaining</span>
            </div>
          </div>
        )}
      </div>

      {/* Current Turn Display */}
      {currentTurn?.currentPlayer && (
        <div className="mobile-card">
          <h3 className="mobile-card-title mb-4">Current Turn</h3>
          
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-lg">{currentTurn.currentPlayer.username}</p>
                <p className="text-sm text-gray-600">Position {currentTurn.currentPlayer.position}</p>
              </div>
            </div>
            
            {isMyTurn && (
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatTime(timeRemaining)}
                </div>
                <p className="text-xs text-gray-500">Time remaining</p>
              </div>
            )}
          </div>

          {/* Turn Actions */}
          {currentUser?.isAdmin && (
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => skipTurn(currentTurn.currentPlayer.userId, 'Admin skip')}
                disabled={loading}
                className="mobile-btn mobile-btn-secondary flex items-center space-x-2"
              >
                <SkipForward className="w-4 h-4" />
                <span>Skip Turn</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Next Player Preview */}
      {currentTurn?.nextPlayer && (
        <div className="mobile-card">
          <h3 className="mobile-card-title mb-4">Next Up</h3>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium">{currentTurn.nextPlayer.username}</p>
              <p className="text-sm text-gray-600">Position {currentTurn.nextPlayer.position}</p>
            </div>
          </div>
        </div>
      )}

      {/* Draft Queue List */}
      {draftProgress && (
        <div className="mobile-card">
          <h3 className="mobile-card-title mb-4">Draft Order</h3>
          <div className="space-y-2">
            {draftProgress.queue?.map((player, index) => (
              <div 
                key={player.userId}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  player.userId === currentTurn?.currentPlayer?.userId
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    player.hasPicked 
                      ? 'bg-green-100 text-green-600' 
                      : player.userId === currentTurn?.currentPlayer?.userId
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {player.position}
                  </div>
                  <div>
                    <p className="font-medium">{player.username}</p>
                    <p className="text-sm text-gray-600">
                      {player.hasPicked ? 'Picked' : 'Waiting'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {player.hasPicked && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  {player.userId === currentTurn?.currentPlayer?.userId && (
                    <div className="flex items-center space-x-1 text-purple-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {formatTime(player.timeRemaining || 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Controls */}
      {currentUser?.isAdmin && (
        <div className="mobile-card">
          <h3 className="mobile-card-title mb-4">Admin Controls</h3>
          <div className="grid grid-cols-2 gap-3">
            {draftStatus.status === 'waiting' && (
              <>
                <button
                  onClick={initializeDraft}
                  disabled={loading}
                  className="mobile-btn mobile-btn-primary"
                >
                  Initialize Draft
                </button>
                <button
                  onClick={startDraft}
                  disabled={loading}
                  className="mobile-btn mobile-btn-primary"
                >
                  Start Draft
                </button>
              </>
            )}
            
            {draftStatus.status === 'active' && (
              <button
                onClick={pauseDraft}
                disabled={loading}
                className="mobile-btn mobile-btn-secondary"
              >
                Pause Draft
              </button>
            )}
            
            {draftStatus.status === 'paused' && (
              <button
                onClick={resumeDraft}
                disabled={loading}
                className="mobile-btn mobile-btn-primary"
              >
                Resume Draft
              </button>
            )}
            
            <button
              onClick={resetDraft}
              disabled={loading}
              className="mobile-btn mobile-btn-danger"
            >
              Reset Draft
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className="mobile-notification mobile-notification-success show">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>{message}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="mobile-notification mobile-notification-error show">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Turn Notification for Current User */}
      {isMyTurn && (
        <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg shadow-lg z-50 animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">🎯 It's Your Turn!</p>
              <p className="text-sm opacity-90">Make your pick now</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatTime(timeRemaining)}</div>
              <p className="text-xs opacity-75">Time remaining</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftQueue;

