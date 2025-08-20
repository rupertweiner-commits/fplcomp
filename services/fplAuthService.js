import axios from 'axios';

export class FPLAuthService {
  constructor() {
    this.baseURL = 'https://fantasy.premierleague.com/api';
    this.authHeaders = null;
    this.authenticatedManagerId = null;
  }

  /**
   * Set authentication headers using session cookie
   * To get the cookie:
   * 1. Log into FPL website
   * 2. Open browser dev tools > Network tab
   * 3. Find a request to 'me/' endpoint
   * 4. Copy the 'cookie' header value
   */
  setAuthenticationCookie(cookieHeader) {
    if (!cookieHeader || typeof cookieHeader !== 'string') {
      throw new Error('Invalid cookie header provided');
    }

    this.authHeaders = {
      'Cookie': cookieHeader,
      'User-Agent': 'FPL-Live-Tracker/1.0.0',
      'Accept': 'application/json',
      'Referer': 'https://fantasy.premierleague.com/'
    };

    console.log('🔐 Authentication headers set');
  }

  /**
   * Verify authentication by fetching manager data
   */
  async verifyAuthentication() {
    if (!this.authHeaders) {
      throw new Error('No authentication headers set. Call setAuthenticationCookie() first.');
    }

    try {
      const response = await axios.get(`${this.baseURL}/me/`, {
        headers: this.authHeaders,
        timeout: 10000
      });

      if (response.data && response.data.player) {
        this.authenticatedManagerId = response.data.player.entry;
        console.log(`✅ Authentication verified for manager ${this.authenticatedManagerId}`);
        return {
          success: true,
          managerId: this.authenticatedManagerId,
          playerName: `${response.data.player.player_first_name} ${response.data.player.player_last_name}`,
          teamName: response.data.player.name
        };
      } else {
        throw new Error('Invalid response format from FPL API');
      }
    } catch (error) {
      console.error('❌ Authentication verification failed:', error.message);
      this.authHeaders = null;
      this.authenticatedManagerId = null;
      
      if (error.response?.status === 403) {
        throw new Error('Authentication failed: Invalid or expired session cookie');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limited by FPL API. Please try again later.');
      } else {
        throw new Error(`Authentication verification failed: ${error.message}`);
      }
    }
  }

  /**
   * Get authenticated manager's current team
   */
  async getMyTeam(managerId = null) {
    const targetManagerId = managerId || this.authenticatedManagerId;
    
    if (!targetManagerId) {
      throw new Error('No manager ID available. Authenticate first or provide manager ID.');
    }

    if (!this.authHeaders) {
      throw new Error('Authentication required for this endpoint');
    }

    try {
      const response = await axios.get(`${this.baseURL}/my-team/${targetManagerId}/`, {
        headers: this.authHeaders,
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('Access denied: You can only access your own team data');
      }
      throw new Error(`Failed to fetch team data: ${error.message}`);
    }
  }

  /**
   * Get authenticated manager's latest transfers
   */
  async getMyTransfers(managerId = null) {
    const targetManagerId = managerId || this.authenticatedManagerId;
    
    if (!targetManagerId) {
      throw new Error('No manager ID available. Authenticate first or provide manager ID.');
    }

    if (!this.authHeaders) {
      throw new Error('Authentication required for this endpoint');
    }

    try {
      const response = await axios.get(`${this.baseURL}/entry/${targetManagerId}/transfers-latest/`, {
        headers: this.authHeaders,
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('Access denied: You can only access your own transfer data');
      }
      throw new Error(`Failed to fetch transfer data: ${error.message}`);
    }
  }

  /**
   * Get authenticated manager's complete data
   */
  async getMyManagerData() {
    if (!this.authHeaders) {
      throw new Error('Authentication required for this endpoint');
    }

    try {
      const response = await axios.get(`${this.baseURL}/me/`, {
        headers: this.authHeaders,
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch manager data: ${error.message}`);
    }
  }

  /**
   * Check if the service is authenticated
   */
  isAuthenticated() {
    return this.authHeaders !== null && this.authenticatedManagerId !== null;
  }

  /**
   * Get the authenticated manager ID
   */
  getAuthenticatedManagerId() {
    return this.authenticatedManagerId;
  }

  /**
   * Clear authentication
   */
  clearAuthentication() {
    this.authHeaders = null;
    this.authenticatedManagerId = null;
    console.log('🔓 Authentication cleared');
  }

  /**
   * Create authenticated axios instance for external use
   */
  getAuthenticatedAxiosInstance() {
    if (!this.authHeaders) {
      throw new Error('No authentication available');
    }

    return axios.create({
      baseURL: this.baseURL,
      headers: this.authHeaders,
      timeout: 10000
    });
  }

  /**
   * Test authentication with a simple request
   */
  async testAuthentication() {
    if (!this.authHeaders) {
      return { success: false, message: 'No authentication headers set' };
    }

    try {
      const response = await axios.get(`${this.baseURL}/me/`, {
        headers: this.authHeaders,
        timeout: 5000
      });

      return {
        success: true,
        message: 'Authentication working',
        data: {
          managerId: response.data.player?.entry,
          name: response.data.player?.player_first_name + ' ' + response.data.player?.player_last_name
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.status === 403 ? 'Invalid authentication' : error.message
      };
    }
  }

  /**
   * Extract manager ID from cookie (helper method)
   */
  static extractManagerIdFromCookie(cookieHeader) {
    try {
      // Look for sessionid or similar patterns in cookie
      const matches = cookieHeader.match(/sessionid=([^;]+)/);
      if (matches) {
        // This is a simplified approach - actual implementation may vary
        console.log('Cookie found, but manager ID extraction requires verification call');
        return null; // Return null to force verification call
      }
      return null;
    } catch (error) {
      console.error('Failed to extract manager ID from cookie:', error);
      return null;
    }
  }

  /**
   * Get authentication instructions for users
   */
  static getAuthenticationInstructions() {
    return {
      title: 'How to Get Your FPL Session Cookie',
      steps: [
        {
          step: 1,
          title: 'Log into FPL Website',
          description: 'Go to fantasy.premierleague.com and log into your account'
        },
        {
          step: 2,
          title: 'Open Browser Developer Tools',
          description: 'Press F12 or right-click and select "Inspect Element"'
        },
        {
          step: 3,
          title: 'Go to Network Tab',
          description: 'Click on the "Network" tab in the developer tools'
        },
        {
          step: 4,
          title: 'Navigate to Your Team',
          description: 'Click on "Pick Team" or navigate to any page that loads your team data'
        },
        {
          step: 5,
          title: 'Find the Request',
          description: 'Look for a request to "me/" in the network requests list'
        },
        {
          step: 6,
          title: 'Copy Cookie Header',
          description: 'Click on the request, find the "Cookie" header in Request Headers, and copy its value'
        }
      ],
      warnings: [
        'Never share your session cookie with others',
        'Session cookies expire and need to be updated periodically',
        'Only use this on trusted applications',
        'This gives access to your private FPL data'
      ]
    };
  }
}

export const fplAuthService = new FPLAuthService();

