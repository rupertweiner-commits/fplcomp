import express from 'express';
import { FPLApiService } from '../services/fplApiService.js';

const router = express.Router();
const fplService = new FPLApiService();

// Initialize the service - removed await to prevent top-level await issues
fplService.initialize().catch(err => {
  console.error('Failed to initialize FPL service in routes:', err.message);
  console.log('⚠️  Routes will continue with limited functionality');
});

// General Information Routes

/**
 * GET /api/fpl/bootstrap
 * Get general FPL information (teams, players, gameweeks)
 */
router.get('/bootstrap', async (req, res) => {
  try {
    const data = await fplService.getBootstrapStatic();
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Try to provide fallback data if available
    const cachedData = fplService.getFromCache(fplService.getCacheKey('bootstrap-static'));
    if (cachedData) {
      res.json({
        success: true,
        data: cachedData,
        timestamp: new Date().toISOString(),
        note: 'Using cached data due to API connectivity issues'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * GET /api/fpl/fixtures
 * Get all fixtures or fixtures for a specific gameweek
 */
router.get('/fixtures', async (req, res) => {
  try {
    const { event } = req.query;
    const data = event 
      ? await fplService.getFixturesByGameweek(parseInt(event))
      : await fplService.getFixtures();
    
    res.json({
      success: true,
      data,
      gameweek: event || 'all',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/fpl/gameweek/:eventId/live
 * Get live data for a specific gameweek
 */
router.get('/gameweek/:eventId/live', async (req, res) => {
  try {
    const { eventId } = req.params;
    const data = await fplService.getGameweekLiveData(parseInt(eventId));
    
    res.json({
      success: true,
      data,
      gameweek: eventId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      gameweek: req.params.eventId,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/fpl/current-gameweek
 * Get current gameweek number
 */
router.get('/current-gameweek', async (req, res) => {
  try {
    const currentGameweek = await fplService.getCurrentGameweek();
    res.json({
      success: true,
      currentGameweek,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/fpl/top-performers/:eventId
 * Get top performing players for a gameweek
 */
router.get('/top-performers/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 10 } = req.query;
    
    const data = await fplService.getTopPerformers(parseInt(eventId), parseInt(limit));
    
    res.json({
      success: true,
      data,
      gameweek: eventId,
      limit: parseInt(limit),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      gameweek: req.params.eventId,
      timestamp: new Date().toISOString()
    });
  }
});

// Player Routes

/**
 * GET /api/fpl/player/:elementId
 * Get detailed data for a specific player
 */
router.get('/player/:elementId', async (req, res) => {
  try {
    const { elementId } = req.params;
    const data = await fplService.getPlayerDetails(parseInt(elementId));
    
    res.json({
      success: true,
      data,
      playerId: elementId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      playerId: req.params.elementId,
      timestamp: new Date().toISOString()
    });
  }
});

// Manager Routes

/**
 * GET /api/fpl/manager/:managerId
 * Get manager summary
 */
router.get('/manager/:managerId', async (req, res) => {
  try {
    const { managerId } = req.params;
    const data = await fplService.getManagerSummary(parseInt(managerId));
    
    res.json({
      success: true,
      data,
      managerId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      managerId: req.params.managerId,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/fpl/manager/:managerId/history
 * Get manager's FPL history
 */
router.get('/manager/:managerId/history', async (req, res) => {
  try {
    const { managerId } = req.params;
    const data = await fplService.getManagerHistory(parseInt(managerId));
    
    res.json({
      success: true,
      data,
      managerId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      managerId: req.params.managerId,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/fpl/manager/:managerId/team/:eventId
 * Get manager's team for a specific gameweek
 */
router.get('/manager/:managerId/team/:eventId', async (req, res) => {
  try {
    const { managerId, eventId } = req.params;
    const data = await fplService.getManagerTeam(parseInt(managerId), parseInt(eventId));
    
    res.json({
      success: true,
      data,
      managerId,
      gameweek: eventId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      managerId: req.params.managerId,
      gameweek: req.params.eventId,
      timestamp: new Date().toISOString()
    });
  }
});

// League Routes

/**
 * GET /api/fpl/league/:leagueId
 * Get classic league standings
 */
router.get('/league/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { page = 1 } = req.query;
    
    const data = await fplService.getClassicLeagueStandings(parseInt(leagueId), parseInt(page));
    
    res.json({
      success: true,
      data,
      leagueId,
      page: parseInt(page),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      leagueId: req.params.leagueId,
      timestamp: new Date().toISOString()
    });
  }
});

// Status and Utility Routes

/**
 * GET /api/fpl/event-status
 * Get current event status (bonus points, league updates)
 */
router.get('/event-status', async (req, res) => {
  try {
    const data = await fplService.getEventStatus();
    
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/fpl/dream-team/:eventId
 * Get dream team for a gameweek
 */
router.get('/dream-team/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const data = await fplService.getDreamTeam(parseInt(eventId));
    
    res.json({
      success: true,
      data,
      gameweek: eventId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      gameweek: req.params.eventId,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/fpl/teams
 * Get all teams with their mappings
 */
router.get('/teams', async (req, res) => {
  try {
    const bootstrap = await fplService.getBootstrapStatic();
    
    res.json({
      success: true,
      data: bootstrap.teams.map(team => ({
        id: team.id,
        name: team.name,
        short_name: team.short_name,
        code: team.code
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/fpl/clear-cache
 * Clear API cache (useful for forcing fresh data)
 */
router.post('/clear-cache', async (req, res) => {
  try {
    fplService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Multi-data endpoint for dashboard
/**
 * GET /api/fpl/dashboard
 * Get combined data for dashboard view
 */
router.get('/dashboard', async (req, res) => {
  try {
    const currentGameweek = await fplService.getCurrentGameweek();
    
    const [
      bootstrap,
      fixtures,
      eventStatus,
      topPerformers
    ] = await Promise.all([
      fplService.getBootstrapStatic(),
      fplService.getFixturesByGameweek(currentGameweek),
      fplService.getEventStatus(),
      fplService.getTopPerformers(currentGameweek, 5).catch(() => [])
    ]);

    res.json({
      success: true,
      data: {
        currentGameweek,
        summary: {
          totalPlayers: bootstrap.elements.length,
          totalTeams: bootstrap.teams.length,
          totalGameweeks: bootstrap.events.length,
          teams: bootstrap.teams // Include teams data for name lookup
        },
        fixtures: fixtures.filter(f => f.started),
        eventStatus,
        topPerformers
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
