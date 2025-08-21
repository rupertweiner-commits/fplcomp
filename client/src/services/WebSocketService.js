// Dummy WebSocketService for frontend-only deployment
// This prevents any WebSocket connections from being attempted
export class WebSocketService {
  constructor() {
    // Do nothing - prevent WebSocket connections
  }

  connect() {
    // Do nothing
  }

  disconnect() {
    // Do nothing
  }

  subscribe() {
    // Return dummy unsubscribe function
    return () => {};
  }

  unsubscribe() {
    // Do nothing
  }

  send() {
    // Do nothing
  }

  isConnected() {
    return false;
  }

  getStatus() {
    return 'disconnected';
  }
}
