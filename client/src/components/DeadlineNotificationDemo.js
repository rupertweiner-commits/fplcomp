import React, { useState } from 'react';
import DeadlineNotification from './DeadlineNotification';

const DeadlineNotificationDemo = () => {
  const [activeNotifications, setActiveNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now();

    setActiveNotifications(prev => [...prev, { ...notification, id }]);
  };

  const removeNotification = (id) => {
    setActiveNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setActiveNotifications([]);
  };

  // Sample data for different notification types
  const sampleData = {
    reminder24h: {
      type: 'reminder',
      data: {
        gameweek: 3,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        currentPosition: '2nd',
        transfersRemaining: 1,
        chipsAvailable: 'Wildcard, Free Hit'
      }
    },

    reminder1h: {
      type: 'reminder',
      data: {
        gameweek: 3,
        deadline: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        currentPosition: '2nd',
        transfersRemaining: 1,
        chipsAvailable: 'Wildcard, Free Hit'
      }
    },
    summary: {
      type: 'summary',
      data: {
        gameweek: 3,
        timestamp: new Date().toISOString(),
        headline: '🚨 DEADLINE DAY DRAMA: Gameweek 3 Edition! 🚨',
        activeManagers: '4 out of 5',
        totalActions: 12,
        transferCount: 8,
        chipCount: 2,
        topPerformer: 'Will'
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚨 Deadline Notifications Demo
          </h1>
          <p className="text-xl text-gray-600">
            See how deadline reminders and summaries will look in the KPG's Competition app
          </p>
        </div>

        {/* Demo Controls */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🎮 Demo Controls</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">⏰ Deadline Reminders</h3>
              <div className="space-y-2">
                <button
                  className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  onClick={() => addNotification(sampleData.reminder24h)}
                >
                  📅 24 Hours Before Deadline
                </button>

                <button
                  className="w-full py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  onClick={() => addNotification(sampleData.reminder1h)}
                >
                  🚨 1 Hour Before Deadline
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">📊 Post-Deadline Summaries</h3>
              <div className="space-y-2">
                <button
                  className="w-full py-2 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  onClick={() => addNotification(sampleData.summary)}
                >
                  🏆 Deadline Summary Report
                </button>
                <button
                  className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  onClick={clearAll}
                >
                  🗑️ Clear All Notifications
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Examples */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📱 Notification Examples</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reminder Examples */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">⏰ Deadline Reminders</h3>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">24 Hours Before</h4>
                  <div className="bg-blue-500 text-white rounded-lg p-3 text-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <span>⏰</span>
                      <span className="font-bold">REMINDER</span>
                    </div>
                    <p className="font-bold">Transfer Deadline Reminder</p>
                    <p className="text-blue-100">Gameweek 3 closes in: 24h 0m</p>
                    <p className="text-blue-100 text-xs">Saturday, 2:00 PM GMT</p>
                  </div>
                </div>


                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">1 Hour Before</h4>
                  <div className="bg-red-500 text-white rounded-lg p-3 text-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <span>🚨</span>
                      <span className="font-bold">FINAL COUNTDOWN</span>
                    </div>
                    <p className="font-bold">DEADLINE IMMINENT!</p>
                    <p className="text-red-100">Gameweek 3 closes in: 1h 0m</p>
                    <p className="text-red-100 text-xs">Saturday, 2:00 PM GMT</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Examples */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">📊 Post-Deadline Summaries</h3>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Immediate Summary</h4>
                  <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-lg p-3 text-sm">
                    <div className="flex items-center space-x-2 mb-2">
                      <span>🏆</span>
                      <span className="font-bold">DEADLINE SUMMARY</span>
                    </div>
                    <p className="font-bold">🚨 DEADLINE DAY DRAMA: Gameweek 3 Edition! 🚨</p>
                    <div className="mt-2 space-y-1 text-purple-100">
                      <p>⏰ Deadline: Saturday, 2:00 PM GMT</p>
                      <p>👥 Active Managers: 4 out of 5</p>
                      <p>📊 Total Actions: 12</p>
                    </div>
                  </div>
                </div>


              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">✨ Notification Features</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Timing</h3>
              <p className="text-gray-600 text-sm">
                Notifications appear at optimal times: 24h and 1h before deadline
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Visual Urgency</h3>
              <p className="text-gray-600 text-sm">
                Color-coded urgency levels: Blue → Red for maximum impact
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Push & In-App</h3>
              <p className="text-gray-600 text-sm">
                Both push notifications and in-app notifications for maximum engagement
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Notifications */}
      {activeNotifications.map(notification => (
        <DeadlineNotification
          data={notification.data}
          key={notification.id}
          onAction={() => console.log('Action clicked for notification:', notification.id)}
          onClose={() => removeNotification(notification.id)}
          type={notification.type}
        />
      ))}
    </div>
  );
};

export default DeadlineNotificationDemo;
