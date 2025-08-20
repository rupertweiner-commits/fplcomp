import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Desktop } from 'lucide-react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches ||
          window.navigator.standalone === true) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    // Check device type
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
      setIsAndroid(/android/.test(userAgent));
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      console.log('PWA was installed');
    };

    // Check initial state
    checkDevice();
    if (!checkIfInstalled()) {
      // Only show prompt if not already installed
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowPrompt(false);
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal in localStorage to avoid showing again immediately
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  const handleIOSInstall = () => {
    // Show iOS-specific installation instructions
    setShowPrompt(false);
    // You could show a modal with iOS instructions here
  };

  const handleAndroidInstall = () => {
    // Show Android-specific installation instructions
    setShowPrompt(false);
    // You could show a modal with Android instructions here
  };

  // Don't show if already installed or recently dismissed
  if (isInstalled || !showPrompt) {
    return null;
  }

  // Check if recently dismissed (within 24 hours)
  const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
  if (lastDismissed && Date.now() - parseInt(lastDismissed) < 24 * 60 * 60 * 1000) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
                            <h3 className="font-semibold text-gray-900">Install KPG's Annual Chelsea Competition</h3>
            <p className="text-sm text-gray-600">Get the app experience</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          Install this app on your device for quick and easy access when you're on the go.
        </p>

        {isIOS ? (
          <button
            onClick={handleIOSInstall}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            Install on iOS
          </button>
        ) : isAndroid ? (
          <button
            onClick={handleAndroidInstall}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            Install on Android
          </button>
        ) : (
          <button
            onClick={handleInstallClick}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Desktop className="w-4 h-4" />
            Install App
          </button>
        )}

        <div className="text-xs text-gray-500 text-center">
          {isIOS && "Tap the share button and 'Add to Home Screen'"}
          {isAndroid && "Tap the menu button and 'Add to Home Screen'"}
          {!isIOS && !isAndroid && "Click install to add to your device"}
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;

