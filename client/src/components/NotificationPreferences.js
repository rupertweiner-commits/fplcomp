import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../config/supabase';

const NotificationPreferences = ({ currentUser }) => {
  const [preferences, setPreferences] = useState({
    email_notifications_enabled: true,
    email_draft_updates: true,
    email_gameweek_results: true,
    email_transfer_notifications: true,
    email_weekly_summary: true,
    push_notifications_enabled: false,
    push_draft_updates: false,
    push_gameweek_results: false,
    push_transfer_notifications: false
  });
  
  const [pushPermission, setPushPermission] = useState('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchPreferences();
      checkPushPermission();
    }
  }, [currentUser]);

  const fetchPreferences = async () => {
    try {
      const response = await fetch(`/api/notifications/email?action=preferences&userId=${currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setPreferences(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
  };

  const checkPushPermission = async () => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  };

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      setError('Push notifications are not supported in this browser');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === 'granted') {
        // Register service worker and get push subscription
        await registerServiceWorker();
        setSuccess('Push notifications enabled successfully!');
      } else {
        setError('Push notifications were denied');
      }
    } catch (error) {
      console.error('Failed to request push permission:', error);
      setError('Failed to enable push notifications');
    }
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
      });

      // Send subscription to server
      const response = await fetch('/api/notifications/push?action=subscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          subscription: subscription
        })
      });

      if (response.ok) {
        setPreferences(prev => ({
          ...prev,
          push_notifications_enabled: true,
          push_draft_updates: true,
          push_gameweek_results: true,
          push_transfer_notifications: true
        }));
      }
    } catch (error) {
      console.error('Failed to register service worker:', error);
      throw error;
    }
  };

  const updatePreferences = async (newPreferences) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/notifications/email?action=preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          preferences: newPreferences
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setPreferences(newPreferences);
        setSuccess('Notification preferences updated successfully!');
      } else {
        setError(data.error || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      setError('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailToggle = (key) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key]
    };
    updatePreferences(newPreferences);
  };

  const handlePushToggle = (key) => {
    if (key === 'push_notifications_enabled' && !preferences.push_notifications_enabled) {
      // Enable push notifications
      requestPushPermission();
    } else {
      const newPreferences = {
        ...preferences,
        [key]: !preferences[key]
      };
      updatePreferences(newPreferences);
    }
  };

  const getPushPermissionStatus = () => {
    switch (pushPermission) {
      case 'granted':
        return { status: 'enabled', color: 'text-green-600', icon: CheckCircle };
      case 'denied':
        return { status: 'denied', color: 'text-red-600', icon: AlertCircle };
      default:
        return { status: 'not-requested', color: 'text-gray-600', icon: Bell };
    }
  };

  const pushStatus = getPushPermissionStatus();
  const StatusIcon = pushStatus.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          <Settings className="inline w-8 h-8 mr-2" style={{color: '#034694'}} />
          Notification Preferences
        </h2>
        <p className="text-gray-600">
          Choose how you want to be notified about FPL updates
        </p>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-700">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Email Notifications */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Mail className="w-6 h-6 mr-3" style={{color: '#034694'}} />
          <h3 className="text-lg font-semibold">Email Notifications</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">Enable Email Notifications</label>
              <p className="text-sm text-gray-600">Receive notifications via email</p>
            </div>
            <button
              onClick={() => handleEmailToggle('email_notifications_enabled')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.email_notifications_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.email_notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {preferences.email_notifications_enabled && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Draft Updates</label>
                  <p className="text-sm text-gray-600">When players are allocated to your team</p>
                </div>
                <button
                  onClick={() => handleEmailToggle('email_draft_updates')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.email_draft_updates ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.email_draft_updates ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Gameweek Results</label>
                  <p className="text-sm text-gray-600">When gameweek results are published</p>
                </div>
                <button
                  onClick={() => handleEmailToggle('email_gameweek_results')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.email_gameweek_results ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.email_gameweek_results ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Transfer Notifications</label>
                  <p className="text-sm text-gray-600">When players are transferred between teams</p>
                </div>
                <button
                  onClick={() => handleEmailToggle('email_transfer_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.email_transfer_notifications ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.email_transfer_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Weekly Summary</label>
                  <p className="text-sm text-gray-600">Weekly performance summary</p>
                </div>
                <button
                  onClick={() => handleEmailToggle('email_weekly_summary')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.email_weekly_summary ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.email_weekly_summary ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Smartphone className="w-6 h-6 mr-3" style={{color: '#034694'}} />
          <h3 className="text-lg font-semibold">Push Notifications</h3>
          <StatusIcon className={`w-5 h-5 ml-2 ${pushStatus.color}`} />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">Enable Push Notifications</label>
              <p className="text-sm text-gray-600">Receive notifications on your device</p>
              <p className="text-xs text-gray-500">Status: {pushStatus.status}</p>
            </div>
            <button
              onClick={() => handlePushToggle('push_notifications_enabled')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.push_notifications_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.push_notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {preferences.push_notifications_enabled && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Draft Updates</label>
                  <p className="text-sm text-gray-600">When players are allocated to your team</p>
                </div>
                <button
                  onClick={() => handlePushToggle('push_draft_updates')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.push_draft_updates ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.push_draft_updates ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Gameweek Results</label>
                  <p className="text-sm text-gray-600">When gameweek results are published</p>
                </div>
                <button
                  onClick={() => handlePushToggle('push_gameweek_results')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.push_gameweek_results ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.push_gameweek_results ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Transfer Notifications</label>
                  <p className="text-sm text-gray-600">When players are transferred between teams</p>
                </div>
                <button
                  onClick={() => handlePushToggle('push_transfer_notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.push_transfer_notifications ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.push_transfer_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">About Notifications</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Email notifications are sent using your configured SMTP settings</li>
          <li>• Push notifications work even when the app is closed</li>
          <li>• You can change these preferences at any time</li>
          <li>• Notifications are sent in real-time for important updates</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationPreferences;
