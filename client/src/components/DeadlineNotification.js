import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, X, Bell, Trophy, Users, TrendingUp } from 'lucide-react';

const DeadlineNotification = ({ type = 'reminder', data, onClose, onAction }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (type === 'reminder' && data.deadline) {
      const updateTimeRemaining = () => {
        const now = new Date().getTime();
        const deadline = new Date(data.deadline).getTime();
        const difference = deadline - now;

        if (difference > 0) {
          const hours = Math.floor(difference / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          
          if (hours > 0) {
            setTimeRemaining(`${hours}h ${minutes}m`);
          } else {
            setTimeRemaining(`${minutes}m`);
          }
        } else {
          setTimeRemaining('DEADLINE PASSED');
        }
      };

      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [type, data.deadline]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleAction = () => {
    onAction?.();
  };

  if (!isVisible) return null;

  // Reminder Notification
  if (type === 'reminder') {
    const getUrgencyLevel = () => {
      const now = new Date().getTime();
      const deadline = new Date(data.deadline).getTime();
      const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
      
      if (hoursUntilDeadline <= 1) return 'critical';
      if (hoursUntilDeadline <= 6) return 'urgent';
      if (hoursUntilDeadline <= 24) return 'warning';
      return 'info';
    };

    const urgencyLevel = getUrgencyLevel();
    
    const urgencyStyles = {
      critical: 'bg-red-500 border-red-600 text-white',
      urgent: 'bg-orange-500 border-orange-600 text-white',
      warning: 'bg-yellow-500 border-yellow-600 text-gray-800',
      info: 'bg-blue-500 border-blue-600 text-white'
    };

    const urgencyIcons = {
      critical: <AlertTriangle className="w-5 h-5" />,
      urgent: <Clock className="w-5 h-5" />,
      warning: <Bell className="w-5 h-5" />,
      info: <Clock className="w-5 h-5" />
    };

    return (
      <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${urgencyStyles[urgencyLevel]} rounded-lg shadow-xl border-2 transform transition-all duration-300 hover:scale-105`}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {urgencyIcons[urgencyLevel]}
              <span className="font-bold text-lg">
                {urgencyLevel === 'critical' ? '🚨 FINAL COUNTDOWN' :
                 urgencyLevel === 'urgent' ? '⚠️ URGENT' :
                 urgencyLevel === 'warning' ? '⏰ REMINDER' : '📅 UPCOMING'}
              }
            </span>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg">
              {urgencyLevel === 'critical' ? 'DEADLINE IMMINENT!' :
               urgencyLevel === 'urgent' ? 'Deadline Approaching!' :
               'Transfer Deadline Reminder'}
            </h3>
            
            <div className="space-y-2">
              <p className="text-sm opacity-90">
                Gameweek {data.gameweek} closes in:
              </p>
              <div className="text-2xl font-bold font-mono">
                {timeRemaining}
              </div>
              <p className="text-sm opacity-90">
                {new Date(data.deadline).toLocaleString()}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="bg-white bg-opacity-20 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>🏆 Position:</span>
                <span className="font-bold">{data.currentPosition || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>🔄 Transfers:</span>
                <span className="font-bold">{data.transfersRemaining || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>🎴 Chips:</span>
                <span className="font-bold">{data.chipsAvailable || 'N/A'}</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleAction}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                urgencyLevel === 'critical' 
                  ? 'bg-white text-red-600 hover:bg-red-50' 
                  : 'bg-white bg-opacity-20 hover:bg-opacity-30'
              }`}
            >
              {urgencyLevel === 'critical' ? '🚨 MAKE CHANGES NOW' :
               urgencyLevel === 'urgent' ? '⚡ Quick Actions' :
               '📱 Open App'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Summary Notification
  if (type === 'summary') {
    return (
      <div className="fixed top-4 right-4 z-50 max-w-md w-full bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-lg shadow-xl border-2 border-purple-500 transform transition-all duration-300 hover:scale-105">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span className="font-bold text-lg">🏆 DEADLINE SUMMARY</span>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg">
              {data.headline || `Gameweek ${data.gameweek} Deadline Report`}
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Deadline: {new Date(data.timestamp).toLocaleString()}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Active Managers: {data.activeManagers || 'N/A'}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Total Actions: {data.totalActions || 'N/A'}</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white bg-opacity-20 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>🔄 Transfers:</span>
                <span className="font-bold">{data.transferCount || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>🎴 Chips Used:</span>
                <span className="font-bold">{data.chipCount || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>🏆 Top Performer:</span>
                <span className="font-bold">{data.topPerformer || 'N/A'}</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleAction}
              className="w-full py-2 px-4 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors"
            >
              📊 View Full Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DeadlineNotification;
