import axios from 'axios';
import https from 'https';

export class FPLApiService {
  constructor() {
    this.baseURL = 'https://fantasy.premierleague.com/api';
    
    // Create HTTPS agent with proper TLS configuration
    const httpsAgent = new https.Agent({ 
      rejectUnauthorized: false,
      // Remove conflicting TLS settings
      ciphers: 'ALL',
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      checkServerIdentity: () => undefined, // Disable hostname verification
      servername: 'fantasy.premierleague.com' // Set explicit servername
    });
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'User-Agent': 'FPL-Live-Tracker/1.0.0',
        'Accept': 'application/json'
      },
      httpsAgent
    });
    
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache for most endpoints
    this.liveCacheTimeout = 30000; // 30 seconds for live data
    
    // Add request/response interceptors for logging and error handling
    this.axiosInstance.interceptors.request.use(
      config => {
        console.log(`🔄 FPL API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      response => {
        console.log(`✅ FPL API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      error => {
        console.error(`❌ FPL API Error: ${error.response?.status} ${error.config?.url}`, error.message);
        return Promise.reject(error);
      }
    );
  }

  async initialize() {
    try {
      // Test API connectivity and cache initial data
      await this.getBootstrapStatic();
      console.log('✅ FPL API Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize FPL API Service:', error);
      console.log('⚠️  Service will continue with limited functionality');
      
      // Try to load any existing cached data
      const cachedBootstrap = this.getFromCache(this.getCacheKey('bootstrap-static'));
      if (cachedBootstrap) {
        console.log('✅ Using cached bootstrap data for initialization');
        return true;
      }
      
      // If no cached data, create a minimal fallback
      console.log('⚠️  No cached data available, creating fallback data');
      this.createFallbackData();
      return false; // Indicate partial initialization
    }
  }

  createFallbackData() {
    // Create minimal fallback data structure
    const fallbackData = {
      events: [],
      teams: [],
      elements: [],
      element_types: [],
      total_players: 0
    };
    
    this.setCache(this.getCacheKey('bootstrap-static'), fallbackData, 300000);
    console.log('✅ Fallback data created');
  }

  // Cache management
  getCacheKey(endpoint, params = {}) {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.timeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data, timeout = this.cacheTimeout) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      timeout
    });
  }

  // Core API Methods based on the FPL API documentation

  /**
   * Get general information about FPL - teams, players, gameweeks
   * Endpoint: bootstrap-static/
   */
  async getBootstrapStatic() {
    const cacheKey = this.getCacheKey('bootstrap-static');
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Retry logic for SSL issues
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries} to fetch bootstrap data...`);
        
        // Try with different SSL configurations
        let response;
        if (attempt === 1) {
          // First attempt: normal request
          response = await this.axiosInstance.get('/bootstrap-static/');
        } else if (attempt === 2) {
          // Second attempt: with more permissive SSL
          const tempAxios = axios.create({
            baseURL: this.baseURL,
            timeout: 15000,
            headers: {
              'User-Agent': 'FPL-Live-Tracker/1.0.0',
              'Accept': 'application/json'
            },
            httpsAgent: new https.Agent({ 
              rejectUnauthorized: false,
              ciphers: 'ALL',
              minVersion: 'TLSv1',
              maxVersion: 'TLSv1.3'
            })
          });
          response = await tempAxios.get('/bootstrap-static/');
        } else {
          // Third attempt: with HTTP fallback (if available)
          const tempAxios = axios.create({
            baseURL: this.baseURL.replace('https://', 'http://'),
            timeout: 15000,
            headers: {
              'User-Agent': 'FPL-Live-Tracker/1.0.0',
              'Accept': 'application/json'
            }
          });
          response = await tempAxios.get('/bootstrap-static/');
        }
        
        // Additional attempt: try with different User-Agent
        if (!response && attempt === 3) {
          const tempAxios = axios.create({
            baseURL: this.baseURL,
            timeout: 20000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive'
            },
            httpsAgent: new https.Agent({ 
              rejectUnauthorized: false,
              ciphers: 'ALL'
            })
          });
          response = await tempAxios.get('/bootstrap-static/');
        }

        this.setCache(cacheKey, response.data, 300000); // Cache for 5 minutes
        console.log(`✅ Bootstrap data fetched successfully on attempt ${attempt}`);
        return response.data;
      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(`Failed to fetch bootstrap data after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Get all fixtures
   * Endpoint: fixtures/
   */
  async getFixtures() {
    const cacheKey = this.getCacheKey('fixtures');
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.axiosInstance.get('/fixtures/');
      this.setCache(cacheKey, response.data, 600000); // Cache for 10 minutes
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch fixtures: ${error.message}`);
    }
  }

  /**
   * Get fixtures for a specific gameweek
   * Endpoint: fixtures/?event={event_id}
   */
  async getFixturesByGameweek(eventId) {
    const cacheKey = this.getCacheKey('fixtures-gameweek', { eventId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.axiosInstance.get(`/fixtures/?event=${eventId}`);
      this.setCache(cacheKey, response.data, 300000); // Cache for 5 minutes
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch fixtures for gameweek ${eventId}: ${error.message}`);
    }
  }

  /**
   * Get detailed data for a specific player
   * Endpoint: element-summary/{element_id}/
   */
  async getPlayerDetails(elementId) {
    const cacheKey = this.getCacheKey('player-details', { elementId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.axiosInstance.get(`/element-summary/${elementId}/`);
      this.setCache(cacheKey, response.data, 600000); // Cache for 10 minutes
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch player details for ${elementId}: ${error.message}`);
    }
  }

  /**
   * Get live data for a specific gameweek
   * Endpoint: event/{event_id}/live/
   */
  async getGameweekLiveData(eventId) {
    const cacheKey = this.getCacheKey('gameweek-live', { eventId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.axiosInstance.get(`/event/${eventId}/live/`);
      this.setCache(cacheKey, response.data, this.liveCacheTimeout);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch live gameweek data for ${eventId}: ${error.message}`);
    }
  }

  /**
   * Get manager summary
   * Endpoint: entry/{manager_id}/
   */
  async getManagerSummary(managerId) {
    const cacheKey = this.getCacheKey('manager-summary', { managerId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.axiosInstance.get(`/entry/${managerId}/`);
      this.setCache(cacheKey, response.data, 300000); // Cache for 5 minutes
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch manager summary for ${managerId}: ${error.message}`);
    }
  }

  /**
   * Get manager's history
   * Endpoint: entry/{manager_id}/history/
   */
  async getManagerHistory(managerId) {
    const cacheKey = this.getCacheKey('manager-history', { managerId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.axiosInstance.get(`/entry/${managerId}/history/`);
      this.setCache(cacheKey, response.data, 600000); // Cache for 10 minutes
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch manager history for ${managerId}: ${error.message}`);
    }
  }

  /**
   * Get manager's team for a specific gameweek
   * Endpoint: entry/{manager_id}/event/{event_id}/picks/
   */
  async getManagerTeam(managerId, eventId) {
    const cacheKey = this.getCacheKey('manager-team', { managerId, eventId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.axiosInstance.get(`/entry/${managerId}/event/${eventId}/picks/`);
      this.setCache(cacheKey, response.data, 300000); // Cache for 5 minutes
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch manager team for ${managerId}, gameweek ${eventId}: ${error.message}`);
    }
  }

  /**
   * Get classic league standings
   * Endpoint: leagues-classic/{league_id}/standings/
   */
  async getClassicLeagueStandings(leagueId, page = 1) {
    const cacheKey = this.getCacheKey('league-standings', { leagueId, page });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.axiosInstance.get(`/leagues-classic/${leagueId}/standings/`, {
        params: { page_standings: page }
      });
      this.setCache(cacheKey, response.data, 300000); // Cache for 5 minutes
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch league standings for ${leagueId}: ${error.message}`);
    }
  }

  /**
   * Get event status (bonus points, league updates)
   * Endpoint: event-status/
   */
  async getEventStatus() {
    const cacheKey = this.getCacheKey('event-status');
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.axiosInstance.get('/event-status/');
      this.setCache(cacheKey, response.data, this.liveCacheTimeout);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch event status: ${error.message}`);
    }
  }

  /**
   * Get dream team for a gameweek
   * Endpoint: dream-team/{event_id}/
   */
  async getDreamTeam(eventId) {
    const cacheKey = this.getCacheKey('dream-team', { eventId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.axiosInstance.get(`/dream-team/${eventId}/`);
      this.setCache(cacheKey, response.data, 600000); // Cache for 10 minutes
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch dream team for gameweek ${eventId}: ${error.message}`);
    }
  }

  /**
   * Get current gameweek number
   */
  async getCurrentGameweek() {
    try {
      const bootstrap = await this.getBootstrapStatic();
      const currentEvent = bootstrap.events.find(event => event.is_current) || 
                          bootstrap.events.find(event => event.is_next);
      return currentEvent?.id || 1;
    } catch (error) {
      console.error('Failed to get current gameweek:', error);
      return 1;
    }
  }

  /**
   * Get gameweek deadline information
   */
  async getGameweekDeadline(gameweekId = null) {
    try {
      const bootstrap = await this.getBootstrapStatic();
      let targetEvent;
      
      if (gameweekId) {
        targetEvent = bootstrap.events.find(event => event.id === gameweekId);
      } else {
        // Get next gameweek deadline
        targetEvent = bootstrap.events.find(event => event.is_next) || 
                     bootstrap.events.find(event => event.is_current);
      }
      
      if (!targetEvent) {
        throw new Error('Gameweek not found');
      }
      
      return {
        gameweekId: targetEvent.id,
        gameweekName: targetEvent.name,
        deadlineTime: targetEvent.deadline_time,
        isFinished: targetEvent.finished,
        isCurrent: targetEvent.is_current,
        isNext: targetEvent.is_next,
        deadlineTimestamp: new Date(targetEvent.deadline_time).getTime()
      };
    } catch (error) {
      console.error('Failed to get gameweek deadline:', error);
      return null;
    }
  }

  /**
   * Check if current time is before gameweek deadline
   */
  async isBeforeDeadline(gameweekId = null) {
    try {
      const deadlineInfo = await this.getGameweekDeadline(gameweekId);
      if (!deadlineInfo) return false;
      
      const now = Date.now();
      return now < deadlineInfo.deadlineTimestamp;
    } catch (error) {
      console.error('Failed to check deadline:', error);
      return false;
    }
  }

  /**
   * Get top players by points for current gameweek
   */
  async getTopPerformers(eventId, limit = 10) {
    try {
      const liveData = await this.getGameweekLiveData(eventId);
      const bootstrap = await this.getBootstrapStatic();
      
      const playersWithStats = liveData.elements
        .filter(element => element.stats.total_points > 0)
        .map(element => {
          const playerInfo = bootstrap.elements.find(p => p.id === element.id);
          return {
            ...element,
            web_name: playerInfo?.web_name,
            team: playerInfo?.team,
            element_type: playerInfo?.element_type
          };
        })
        .sort((a, b) => b.stats.total_points - a.stats.total_points)
        .slice(0, limit);

      return playersWithStats;
    } catch (error) {
      throw new Error(`Failed to get top performers: ${error.message}`);
    }
  }

  /**
   * Clear cache (useful for forcing fresh data)
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ FPL API cache cleared');
  }
}
