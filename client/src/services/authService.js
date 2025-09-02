import axios from 'axios';

class AuthService {
  constructor() {
    this.tokenKey = 'fpl_auth_token';
    this.userKey = 'fpl_user_data';
    this.token = localStorage.getItem(this.tokenKey);
    this.user = JSON.parse(localStorage.getItem(this.userKey) || 'null');
    
    // Set up axios interceptor for authentication
    this.setupAxiosInterceptor();
  }

  setupAxiosInterceptor() {
    // Add token to all requests
    axios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Handle token expiration
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.reload();
        }
        return Promise.reject(error);
      }
    );
  }

  async login(username, password) {
    try {
      // Mock authentication for demo purposes
      const demoUsers = {
        'Rupert': { 
          id: 1, 
          username: 'Rupert', 
          email: 'rupertweiner@gmail.com', 
          firstName: 'Rupert', 
          lastName: 'Weiner', 
          isAdmin: true 
        },
        'Portia': { 
          id: 2, 
          username: 'Portia', 
          email: 'portia@example.com', 
          firstName: 'Portia', 
          lastName: 'Demo', 
          isAdmin: false 
        },
        'Yasmin': { 
          id: 3, 
          username: 'Yasmin', 
          email: 'yasmin@example.com', 
          firstName: 'Yasmin', 
          lastName: 'User', 
          isAdmin: false 
        },
        'Will': { 
          id: 4, 
          username: 'Will', 
          email: 'will@example.com', 
          firstName: 'Will', 
          lastName: 'User', 
          isAdmin: false 
        }
      };

      // Check if user exists and password is correct (demo password: password123)
      if (demoUsers[username] && password === 'password123') {
        const user = demoUsers[username];
        const token = `demo-token-${user.id}`;
        
        // Store user data and token
        this.token = token;
        this.user = user;
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
        
        return { success: true, user, token };
      }
      
      return { success: false, error: 'Invalid username or password' };
    } catch (error) {
      return { 
        success: false, 
        error: 'Login failed' 
      };
    }
  }

  async register(username, email, password, firstName, lastName) {
    try {
      // For now, registration is disabled - users are pre-created
      return { 
        success: false, 
        error: 'Registration is currently disabled. Please contact an administrator to create an account.' 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      // Password change functionality disabled for demo
      return { 
        success: false, 
        error: 'Password change is currently disabled in demo mode' 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Password change failed' 
      };
    }
  }

  async changeUsername(currentPassword, newUsername) {
    try {
      // Username change functionality disabled for demo
      return { 
        success: false, 
        error: 'Username change is currently disabled in demo mode' 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Username change failed' 
      };
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  getCurrentUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  // Check if token is expired
  isTokenExpired() {
    if (!this.token) return true;
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  // Refresh token if needed
  async refreshTokenIfNeeded() {
    if (this.isTokenExpired()) {
      // For now, just logout. In production, implement token refresh
      this.logout();
      return false;
    }
    return true;
  }
}

export const authService = new AuthService();
