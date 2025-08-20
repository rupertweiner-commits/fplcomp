export class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.isConnecting = false;
    this.listeners = new Map();
    this.url = this.getWebSocketUrl();
  }

  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NODE_ENV === 'production' 
      ? window.location.host 
      : 'localhost:3000';
    return `${protocol}//${host}`;
  }

  connect(onConnect, onDisconnect, onError) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    console.log('🔌 Connecting to WebSocket:', this.url);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        if (onConnect) onConnect();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📥 WebSocket message received:', data.type);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        
        if (onDisconnect) onDisconnect();

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(onConnect, onDisconnect, onError);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnecting = false;
        if (onError) onError(error);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      if (onError) onError(error);
    }
  }

  scheduleReconnect(onConnect, onDisconnect, onError) {
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect(onConnect, onDisconnect, onError);
      }
    }, delay);
  }

  handleMessage(data) {
    // Emit to all listeners of this message type
    const typeListeners = this.listeners.get(data.type) || [];
    typeListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ Error in listener for ${data.type}:`, error);
      }
    });

    // Emit to all global listeners
    const globalListeners = this.listeners.get('*') || [];
    globalListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('❌ Error in global listener:', error);
      }
    });
  }

  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  unsubscribe(eventType, callback) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      console.log('📤 WebSocket message sent:', data.type || 'unknown');
    } else {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
    }
  }

  disconnect() {
    if (this.ws) {
      console.log('🔌 Manually disconnecting WebSocket');
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  getConnectionState() {
    if (!this.ws) return 'DISCONNECTED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'CONNECTED';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'DISCONNECTED';
      default:
        return 'UNKNOWN';
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}
