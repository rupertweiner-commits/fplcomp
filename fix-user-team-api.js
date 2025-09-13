// Fix for UserTeamManagement API calls
// This addresses potential issues with user ID format and table queries

// Add this to your UserTeamManagement.js component to debug and fix the issue

const debugUserTeamFetch = async (currentUser) => {
  console.log('🔍 DEBUG: Starting user team fetch');
  console.log('🔍 DEBUG: currentUser object:', currentUser);
  console.log('🔍 DEBUG: currentUser.id:', currentUser?.id, 'Type:', typeof currentUser?.id);

  try {
    // 1. First, verify the user exists in user_profiles
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name')
      .eq('id', currentUser.id)
      .single();

    console.log('🔍 DEBUG: User profile check:', { userProfile, userError });

    if (userError) {
      console.error('❌ User profile not found:', userError);
      return { error: 'User profile not found', data: [] };
    }

    // 2. Check all three possible tables for player data
    console.log('🔍 DEBUG: Checking chelsea_players table...');
    const { data: chelseaPlayers, error: chelseaError } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('assigned_to_user_id', currentUser.id);

    console.log('🔍 DEBUG: Chelsea players result:', { 
      count: chelseaPlayers?.length || 0, 
      players: chelseaPlayers?.map(p => p.name) || [],
      error: chelseaError 
    });

    console.log('🔍 DEBUG: Checking draft_allocations table...');
    const { data: draftAllocations, error: draftError } = await supabase
      .from('draft_allocations')
      .select('*')
      .eq('target_user_id', currentUser.id);

    console.log('🔍 DEBUG: Draft allocations result:', { 
      count: draftAllocations?.length || 0, 
      players: draftAllocations?.map(p => p.player_name) || [],
      error: draftError 
    });

    console.log('🔍 DEBUG: Checking user_teams table...');
    const { data: userTeams, error: userTeamsError } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_id', currentUser.id);

    console.log('🔍 DEBUG: User teams result:', { 
      count: userTeams?.length || 0, 
      players: userTeams?.map(p => p.player_name) || [],
      error: userTeamsError 
    });

    // 3. Return the data from whichever table has players
    if (chelseaPlayers && chelseaPlayers.length > 0) {
      console.log('✅ Found players in chelsea_players table');
      return { 
        source: 'chelsea_players',
        data: chelseaPlayers.map(player => ({
          id: player.id,
          name: player.web_name || player.name,
          position: player.position,
          total_points: player.total_points || 0,
          price: player.price || 0,
          is_captain: player.is_captain || false,
          is_vice_captain: player.is_vice_captain || false,
          ...player
        }))
      };
    } else if (userTeams && userTeams.length > 0) {
      console.log('✅ Found players in user_teams table');
      return { 
        source: 'user_teams',
        data: userTeams.map(team => ({
          id: team.player_id,
          name: team.player_name,
          position: team.position,
          total_points: 0, // user_teams doesn't store points
          price: team.price || 0,
          is_captain: team.is_captain || false,
          is_vice_captain: team.is_vice_captain || false
        }))
      };
    } else if (draftAllocations && draftAllocations.length > 0) {
      console.log('✅ Found players in draft_allocations table');
      return { 
        source: 'draft_allocations',
        data: draftAllocations.map(allocation => ({
          id: allocation.player_id,
          name: allocation.player_name,
          position: allocation.player_position,
          total_points: 0, // draft_allocations doesn't store points
          price: allocation.player_price || 0,
          is_captain: false,
          is_vice_captain: false
        }))
      };
    } else {
      console.log('❌ No players found in any table');
      return { 
        source: 'none',
        data: [],
        message: 'No allocated players found. You may need to allocate players first.'
      };
    }

  } catch (error) {
    console.error('❌ DEBUG: Error in user team fetch:', error);
    return { error: error.message, data: [] };
  }
};

// Usage in UserTeamManagement component:
// Replace the existing fetchMyTeam function with this enhanced version
const fetchMyTeam = async () => {
  if (!currentUser?.id) return;

  setLoading(true);
  try {
    const result = await debugUserTeamFetch(currentUser);
    
    if (result.error) {
      console.error('Team fetch error:', result.error);
      setMyTeam([]);
    } else {
      console.log(`✅ Loaded ${result.data.length} players from ${result.source}`);
      setMyTeam(result.data);
      
      if (result.message) {
        console.warn('⚠️', result.message);
      }
    }
    
  } catch (error) {
    console.error('Failed to fetch team:', error);
    setMyTeam([]);
  } finally {
    setLoading(false);
  }
};
