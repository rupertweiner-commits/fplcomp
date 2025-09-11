// FPL API Service for fetching real player data
import { supabase } from '../config/supabase';

class FPLApiService {
  constructor() {
    this.baseUrl = 'https://fantasy.premierleague.com/api';
    this.chelseaTeamId = 4; // Chelsea's team ID in FPL
  }

  // Fetch all teams from FPL API
  async fetchTeams() {
    try {
      const response = await fetch(`${this.baseUrl}/bootstrap-static/`);
      const data = await response.json();

      return data.teams;
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      throw error;
    }
  }

  // Fetch all players from FPL API
  async fetchAllPlayers() {
    try {
      const response = await fetch(`${this.baseUrl}/bootstrap-static/`);
      const data = await response.json();

      return data.elements; // All players
    } catch (error) {
      console.error('Failed to fetch players:', error);
      throw error;
    }
  }

  // Fetch Chelsea players specifically
  async fetchChelseaPlayers() {
    try {
      const response = await fetch(`${this.baseUrl}/bootstrap-static/`);
      const data = await response.json();

      // Filter for Chelsea players (team_id = 4)
      const chelseaPlayers = data.elements.filter(player =>
        player.team === this.chelseaTeamId
      );

      return chelseaPlayers;
    } catch (error) {
      console.error('Failed to fetch Chelsea players:', error);
      throw error;
    }
  }

  // Transform FPL player data to our database format
  transformPlayerData(fplPlayer) {
    return {
      fpl_id: fplPlayer.id,
      name: fplPlayer.web_name,
      full_name: fplPlayer.first_name + ' ' + fplPlayer.second_name,
      position: this.mapPosition(fplPlayer.element_type),
      price: fplPlayer.now_cost / 10, // FPL prices are in tenths
      team: 'Chelsea',
      web_name: fplPlayer.web_name,
      is_available: fplPlayer.status === 'a', // 'a' = available
      total_points: fplPlayer.total_points,
      form: fplPlayer.form,
      selected_by_percent: fplPlayer.selected_by_percent,
      
      // Enhanced injury/availability data
      status: fplPlayer.status, // 'a' = available, 'i' = injured, 's' = suspended, 'u' = unavailable
      news: fplPlayer.news, // Injury/suspension details and updates
      news_added: fplPlayer.news_added, // When the news was last updated
      chance_of_playing_this_round: fplPlayer.chance_of_playing_this_round, // Percentage chance for current gameweek
      chance_of_playing_next_round: fplPlayer.chance_of_playing_next_round, // Percentage chance for next gameweek
      
      // Additional strategic data
      minutes: fplPlayer.minutes || 0,
      goals_scored: fplPlayer.goals_scored || 0,
      assists: fplPlayer.assists || 0,
      clean_sheets: fplPlayer.clean_sheets || 0,
      yellow_cards: fplPlayer.yellow_cards || 0,
      red_cards: fplPlayer.red_cards || 0,
      saves: fplPlayer.saves || 0,
      bonus: fplPlayer.bonus || 0,
      bps: fplPlayer.bps || 0, // Bonus points system
      
      // Advanced stats for strategic analysis
      influence: fplPlayer.influence || '0.0',
      creativity: fplPlayer.creativity || '0.0',
      threat: fplPlayer.threat || '0.0',
      ict_index: fplPlayer.ict_index || '0.0',
      
      // Transfer data
      transfers_in: fplPlayer.transfers_in || 0,
      transfers_out: fplPlayer.transfers_out || 0,
      transfers_in_event: fplPlayer.transfers_in_event || 0,
      transfers_out_event: fplPlayer.transfers_out_event || 0
    };
  }

  // Map FPL position numbers to our position strings
  mapPosition(elementType) {
    const positionMap = {
      1: 'GK',  // Goalkeeper
      2: 'DEF', // Defender
      3: 'MID', // Midfielder
      4: 'FWD'  // Forward
    };

    return positionMap[elementType] || 'UNKNOWN';
  }

  // Sync Chelsea players to our database
  async syncChelseaPlayersToDatabase() {
    try {
      console.log('🔄 Fetching Chelsea players from FPL API...');

      // Fetch Chelsea players from FPL API
      const fplPlayers = await this.fetchChelseaPlayers();

      console.log(`📊 Found ${fplPlayers.length} Chelsea players in FPL API`);

      // Transform the data
      const transformedPlayers = fplPlayers.map(player => this.transformPlayerData(player));

      // Clear existing Chelsea players from our database
      const { error: deleteError } = await supabase
        .from('chelsea_players')
        .delete()
        .neq('id', 0); // Delete all records

      if (deleteError) {
        console.error('Failed to clear existing players:', deleteError);
        throw deleteError;
      }

      // Insert new players
      const { data, error: insertError } = await supabase
        .from('chelsea_players')
        .insert(transformedPlayers)
        .select();

      if (insertError) {
        console.error('Failed to insert players:', insertError);
        throw insertError;
      }

      console.log(`✅ Successfully synced ${data.length} Chelsea players to database`);
      return data;
    } catch (error) {
      console.error('Failed to sync Chelsea players:', error);
      throw error;
    }
  }

  // Get player stats for a specific gameweek
  async getPlayerStats(playerId, gameweek = null) {
    try {
      const url = gameweek ?
        `${this.baseUrl}/element-summary/${playerId}/` :
        `${this.baseUrl}/element-summary/${playerId}/`;

      const response = await fetch(url);
      const data = await response.json();

      return data;
    } catch (error) {
      console.error(`Failed to fetch stats for player ${playerId}:`, error);
      throw error;
    }
  }

  // Get current gameweek
  async getCurrentGameweek() {
    try {
      const response = await fetch(`${this.baseUrl}/bootstrap-static/`);
      const data = await response.json();

      const currentEvent = data.events.find(event => event.is_current);

      return currentEvent ? currentEvent.id : 1;
    } catch (error) {
      console.error('Failed to fetch current gameweek:', error);
      return 1; // Default to gameweek 1
    }
  }
}

export default new FPLApiService();
