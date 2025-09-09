// Completely disabled WebSocketService for frontend-only deployment
// This prevents ANY WebSocket connections from being attempted
// Version: v3 - Force rebuild with timestamp: 2024-08-21 14:30

console.log('🚫 WebSocketService: Service is completely disabled');

export class WebSocketService {
  constructor() {
    // Do absolutely nothing - prevent any instantiation side effects
    console.log('🚫 WebSocketService: Constructor called - service is disabled');
    console.log('🚫 WebSocketService: No connections will be attempted');

    // Override any properties that might be accessed
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 0;
    this.reconnectInterval = 0;
    this.isConnecting = false;
    this.listeners = new Map();
    this.url = null;
  }

  connect() {
    console.log('🚫 WebSocketService: connect() called - connections are disabled');
    return false;
  }

  disconnect() {
    console.log('🚫 WebSocketService: disconnect() called but no connection exists');
  }

  subscribe() {
    console.log('🚫 WebSocketService: subscribe() called - subscriptions are disabled');
    return () => {}; // Return empty unsubscribe function
  }

  unsubscribe() {
    console.log('🚫 WebSocketService: unsubscribe() called - subscriptions are disabled');
  }

  send() {
    console.log('🚫 WebSocketService: send() called - sending is disabled');
    return false;
  }

  getConnectionState() {
    console.log('🚫 WebSocketService: getConnectionState() called - returning DISABLED');
    return 'DISABLED';
  }

  isConnected() {
    console.log('🚫 WebSocketService: isConnected() called - returning false');
    return false;
  }

  getStatus() {
    console.log('🚫 WebSocketService: getStatus() called - returning disabled');
    return 'disabled';
  }

  // Override any other methods that might exist
  getWebSocketUrl() {
    console.log('🚫 WebSocketService: getWebSocketUrl() called - returning null');
    return null;
  }

  scheduleReconnect() {
    console.log('🚫 WebSocketService: scheduleReconnect() called - reconnection is disabled');
  }

  handleMessage() {
    console.log('🚫 WebSocketService: handleMessage() called - message handling is disabled');
  }
}

// Also disable any static methods or properties
WebSocketService.disabled = true;
WebSocketService.version = 'v3-disabled';
