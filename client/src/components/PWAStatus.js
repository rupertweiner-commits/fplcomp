import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Download, CheckCircle, AlertCircle } from 'lucide-react';

const PWAStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Check online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Check if PWA is installed
    const checkInstallStatus = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true;
      setIsStandalone(standalone);
      setIsInstalled(standalone);
    };

    // Check if service worker is registered
    const checkServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          setShowStatus(true);
        }
      }
    };

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('load', checkInstallStatus);
    window.addEventListener('load', checkServiceWorker);

    // Check periodically
    const interval = setInterval(checkInstallStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('load', checkInstallStatus);
      window.removeEventListener('load', checkServiceWorker);
      clearInterval(interval);
    };
  }, []);

  // Don't show if not a PWA or if installed
  if (!showStatus || isInstalled) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-40 animate-fade-in">
      <div className="flex items-center gap-3">
        {/* Online/Offline Status */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-600" />
          )}
          <span className="text-xs font-medium text-gray-700">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* PWA Status */}
        <div className="flex items-center gap-2">
          {isStandalone ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-600">Installed</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">Install Available</span>
            </>
          )}
        </div>

        {/* Connection Quality Indicator */}
        {isOnline && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Good</span>
          </div>
        )}
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs text-red-700">
              You're offline. Some features may be limited.
            </span>
          </div>
        </div>
      )}

      {/* PWA Benefits */}
      {!isStandalone && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-700">
              Install for better experience
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAStatus;

