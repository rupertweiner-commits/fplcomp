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

  async login(username, email) {
    try {
      const response = await axios.post('https://qtksftbezmrbwllqbhuc.supabase.co/functions/v1/auth-login', { 
        username, 
        email: email || `${username}@example.com` 
      });
      
      if (response.data.success) {
        const { user } = response.data.data;
        
        // Store user data (no token for now)
        this.token = 'temp-token';
        this.user = user;
        localStorage.setItem(this.tokenKey, 'temp-token');
        localStorage.setItem(this.userKey, JSON.stringify(user));
        
        return { success: true, user };
      }
      
      return { success: false, error: response.data.error };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await axios.post(`/api/auth/profile/${this.user.id}/password`, {
        currentPassword,
        newPassword
      });
      
      if (response.data.success) {
        return { success: true, message: 'Password changed successfully' };
      }
      
      return { success: false, error: response.data.error };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Password change failed' 
      };
    }
  }

  async changeUsername(currentPassword, newUsername) {
    try {
      const response = await axios.post(`/api/auth/profile/${this.user.id}/username`, {
        currentPassword,
        newUsername
      });
      
      if (response.data.success) {
        // Update local user data
        this.user.username = newUsername;
        localStorage.setItem(this.userKey, JSON.stringify(this.user));
        
        return { success: true, message: 'Username changed successfully' };
      }
      
      return { success: false, error: response.data.error };
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
