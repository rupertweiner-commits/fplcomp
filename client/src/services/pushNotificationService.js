class PushNotificationService {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.registration = null;
    this.subscription = null;
  }

  async initialize() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');

      // Check notification permission
      const permission = await this.requestNotificationPermission();
      if (permission === 'granted') {
        await this.subscribeToPushNotifications();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  async requestNotificationPermission() {
    if (!this.isSupported) return 'denied';

    const permission = await Notification.requestPermission();
    return permission;
  }

  async subscribeToPushNotifications() {
    if (!this.registration) return false;

    try {
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY || '')
      });

      console.log('Push notification subscription:', this.subscription);
      
      // Send subscription to backend
      await this.sendSubscriptionToBackend();
      
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  async sendSubscriptionToBackend() {
    if (!this.subscription) return;

    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: this.subscription,
          userId: localStorage.getItem('fpl_user_id')
        })
      });
    } catch (error) {
      console.error('Failed to send subscription to backend:', error);
    }
  }

  async unsubscribeFromPushNotifications() {
    if (!this.subscription) return false;

    try {
      await this.subscription.unsubscribe();
      this.subscription = null;
      
      // Remove subscription from backend
      await this.removeSubscriptionFromBackend();
      
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  async removeSubscriptionFromBackend() {
    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: localStorage.getItem('fpl_user_id')
        })
      });
    } catch (error) {
      console.error('Failed to remove subscription from backend:', error);
    }
  }

  // Convert VAPID public key to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Send local notification
  async sendLocalNotification(title, options = {}) {
    if (!this.isSupported || Notification.permission !== 'granted') return false;

    try {
      const notification = new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return true;
    } catch (error) {
      console.error('Failed to send local notification:', error);
      return false;
    }
  }

  // Check if notifications are enabled
  isNotificationsEnabled() {
    return this.isSupported && Notification.permission === 'granted';
  }

  // Get subscription status
  getSubscriptionStatus() {
    return {
      isSupported: this.isSupported,
      permission: Notification.permission,
      isSubscribed: !!this.subscription,
      registration: !!this.registration
    };
  }
}

export const pushNotificationService = new PushNotificationService();
