export class LiveUpdateService {
  constructor() {
    this.subscribers = new Set();
    this.fplService = null;
    this.wss = null;
    this.currentGameweek = 1;
    this.updateInterval = null;
    this.isLiveGameweek = false;
    this.lastUpdateTime = null;
  }

  async initialize(fplService, wss) {
    this.fplService = fplService;
    this.wss = wss;
    
    try {
      this.currentGameweek = await this.fplService.getCurrentGameweek();
      await this.checkGameweekStatus();
      console.log(`✅ Live Update Service initialized for gameweek ${this.currentGameweek}`);
    } catch (error) {
      console.error('❌ Failed to initialize Live Update Service:', error);
      throw error;
    }
  }

  subscribe(ws) {
    this.subscribers.add(ws);
    console.log(`📡 WebSocket subscribed. Total subscribers: ${this.subscribers.size}`);
  }

  unsubscribe(ws) {
    this.subscribers.delete(ws);
    console.log(`📡 WebSocket unsubscribed. Total subscribers: ${this.subscribers.size}`);
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    let successCount = 0;
    let errorCount = 0;

    this.subscribers.forEach(ws => {
      try {
        if (ws.readyState === ws.OPEN) {
          ws.send(message);
          successCount++;
        } else {
          this.subscribers.delete(ws);
        }
      } catch (error) {
        console.error('❌ Failed to send message to WebSocket:', error);
        this.subscribers.delete(ws);
        errorCount++;
      }
    });

    if (successCount > 0) {
      console.log(`📡 Broadcast sent to ${successCount} clients${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
    }
  }

  async checkGameweekStatus() {
    try {
      const eventStatus = await this.fplService.getEventStatus();
      const fixtures = await this.fplService.getFixturesByGameweek(this.currentGameweek);
      
      // Check if any fixtures are currently being played
      const now = new Date();
      this.isLiveGameweek = fixtures.some(fixture => {
        if (!fixture.started || fixture.finished) return false;
        
        const kickoffTime = new Date(fixture.kickoff_time);
        const timeDiff = now - kickoffTime;
        
        // Consider a fixture live if it started less than 3 hours ago and isn't finished
        return timeDiff >= 0 && timeDiff < (3 * 60 * 60 * 1000);
      });

      console.log(`🏁 Gameweek ${this.currentGameweek} status: ${this.isLiveGameweek ? 'LIVE' : 'NOT LIVE'}`);
      
      return {
        isLive: this.isLiveGameweek,
        eventStatus,
        liveFixtures: fixtures.filter(f => f.started && !f.finished)
      };
    } catch (error) {
      console.error('❌ Failed to check gameweek status:', error);
      return { isLive: false, eventStatus: null, liveFixtures: [] };
    }
  }

  async updateLiveData() {
    try {
      const updateStartTime = Date.now();
      
      // Check current gameweek status
      const status = await this.checkGameweekStatus();
      
      // Get current gameweek data
      const currentGameweek = await this.fplService.getCurrentGameweek();
      if (currentGameweek !== this.currentGameweek) {
        this.currentGameweek = currentGameweek;
        console.log(`🔄 Gameweek changed to ${this.currentGameweek}`);
      }

      // Prepare update data
      const updateData = {
        type: 'liveUpdate',
        timestamp: new Date().toISOString(),
        gameweek: this.currentGameweek,
        isLive: status.isLive,
        liveFixtures: status.liveFixtures,
        updateDuration: Date.now() - updateStartTime
      };

      // Get live gameweek data if it's live
      if (status.isLive) {
        try {
          const liveData = await this.fplService.getGameweekLiveData(this.currentGameweek);
          const topPerformers = await this.fplService.getTopPerformers(this.currentGameweek, 5);
          
          updateData.liveStats = {
            totalPlayers: liveData.elements.length,
            playersWithPoints: liveData.elements.filter(p => p.stats.total_points > 0).length,
            topPerformers: topPerformers.map(p => ({
              id: p.id,
              name: p.web_name,
              points: p.stats.total_points,
              goals: p.stats.goals_scored,
              assists: p.stats.assists
            }))
          };
        } catch (error) {
          console.error('❌ Failed to get live gameweek data:', error);
          updateData.error = 'Failed to fetch live gameweek data';
        }
      }

      // Broadcast update to all connected clients
      this.broadcast(updateData);
      
      this.lastUpdateTime = new Date();
      console.log(`🔄 Live data update completed in ${updateData.updateDuration}ms`);
      
      return updateData;
    } catch (error) {
      console.error('❌ Live data update failed:', error);
      
      // Broadcast error to clients
      this.broadcast({
        type: 'updateError',
        timestamp: new Date().toISOString(),
        error: error.message
      });
      
      throw error;
    }
  }

  async updateGameweekLiveData() {
    try {
      if (!this.isLiveGameweek) {
        return null;
      }

      const liveData = await this.fplService.getGameweekLiveData(this.currentGameweek);
      const eventStatus = await this.fplService.getEventStatus();
      
      const quickUpdate = {
        type: 'quickLiveUpdate',
        timestamp: new Date().toISOString(),
        gameweek: this.currentGameweek,
        bonusAdded: eventStatus.status.every(s => s.bonus_added),
        playersScored: liveData.elements.filter(p => p.stats.total_points > 0).length,
        topScorer: this.getTopScorer(liveData.elements)
      };

      this.broadcast(quickUpdate);
      console.log('⚡ Quick live update sent');
      
      return quickUpdate;
    } catch (error) {
      console.error('❌ Quick live update failed:', error);
      return null;
    }
  }

  getTopScorer(elements) {
    const topElement = elements
      .filter(e => e.stats.total_points > 0)
      .sort((a, b) => b.stats.total_points - a.stats.total_points)[0];
    
    if (!topElement) return null;
    
    return {
      id: topElement.id,
      points: topElement.stats.total_points,
      goals: topElement.stats.goals_scored,
      assists: topElement.stats.assists
    };
  }

  async getLeagueUpdates(leagueIds = []) {
    if (!Array.isArray(leagueIds) || leagueIds.length === 0) {
      return [];
    }

    const leagueUpdates = [];
    
    for (const leagueId of leagueIds) {
      try {
        const standings = await this.fplService.getClassicLeagueStandings(leagueId);
        leagueUpdates.push({
          leagueId,
          name: standings.league.name,
          updated: new Date().toISOString(),
          topThree: standings.standings.results.slice(0, 3).map(entry => ({
            position: entry.rank,
            managerName: entry.player_name,
            teamName: entry.entry_name,
            total: entry.total
          }))
        });
      } catch (error) {
        console.error(`❌ Failed to get league ${leagueId} updates:`, error);
      }
    }

    return leagueUpdates;
  }

  async broadcastLeagueUpdates(leagueIds) {
    try {
      const updates = await this.getLeagueUpdates(leagueIds);
      
      if (updates.length > 0) {
        this.broadcast({
          type: 'leagueUpdates',
          timestamp: new Date().toISOString(),
          leagues: updates
        });
        
        console.log(`📊 League updates sent for ${updates.length} leagues`);
      }
    } catch (error) {
      console.error('❌ Failed to broadcast league updates:', error);
    }
  }

  getStatus() {
    return {
      subscribers: this.subscribers.size,
      currentGameweek: this.currentGameweek,
      isLiveGameweek: this.isLiveGameweek,
      lastUpdateTime: this.lastUpdateTime,
      uptime: process.uptime()
    };
  }

  // Cleanup method
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.subscribers.clear();
    console.log('🧹 Live Update Service destroyed');
  }
}
