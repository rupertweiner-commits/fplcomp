// Completely disabled WebSocketService for frontend-only deployment
// This prevents ANY WebSocket connections from being attempted
export class WebSocketService {
  constructor() {
    // Do absolutely nothing - prevent any instantiation side effects
    console.log('🚫 WebSocketService disabled - no connections allowed');
  }

  connect() {
    console.log('🚫 WebSocket connections are disabled');
    return false;
  }

  disconnect() {
    console.log('🚫 WebSocket disconnect called but no connection exists');
  }

  subscribe() {
    console.log('🚫 WebSocket subscriptions are disabled');
    return () => {}; // Return empty unsubscribe function
  }

  unsubscribe() {
    console.log('🚫 WebSocket unsubscriptions are disabled');
  }

  send() {
    console.log('🚫 WebSocket sending is disabled');
    return false;
  }

  getConnectionState() {
    return 'DISABLED';
  }

  isConnected() {
    return false;
  }

  getStatus() {
    return 'disabled';
  }

  // Override any other methods that might exist
  getWebSocketUrl() {
    return null;
  }

  scheduleReconnect() {
    console.log('🚫 WebSocket reconnection is disabled');
  }

  handleMessage() {
    console.log('🚫 WebSocket message handling is disabled');
  }
}
