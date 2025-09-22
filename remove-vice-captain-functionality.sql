-- Remove vice-captain functionality from the game
-- Simplify to only use captain (2x multiplier) and regular players (1x multiplier)

DO $$
DECLARE
    vice_captains_found INTEGER;
    updated_count INTEGER;
BEGIN
    RAISE NOTICE '=== REMOVING VICE-CAPTAIN FUNCTIONALITY ===';
    
    -- Check how many vice-captains currently exist
    SELECT COUNT(*) INTO vice_captains_found 
    FROM chelsea_players 
    WHERE is_vice_captain = true;
    
    RAISE NOTICE 'Found % vice-captains to remove', vice_captains_found;
    
    -- Remove all vice-captain assignments
    UPDATE chelsea_players 
    SET is_vice_captain = false
    WHERE is_vice_captain = true;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Removed vice-captain status from % players', updated_count;
    
    -- Show current captain assignments (these remain unchanged)
    RAISE NOTICE 'Current captains remain:';
    FOR captain_record IN 
        SELECT up.first_name, cp.name as player_name
        FROM chelsea_players cp
        JOIN user_profiles up ON up.id = cp.assigned_to_user_id
        WHERE cp.is_captain = true
    LOOP
        RAISE NOTICE '- %: %', captain_record.first_name, captain_record.player_name;
    END LOOP;
    
END $$;

-- Show updated team compositions without vice-captains
SELECT 
    'Updated Team Compositions (No Vice-Captains)' as result_type,
    up.first_name as user_name,
    STRING_AGG(
        CASE 
            WHEN cp.is_captain THEN cp.name || ' (C - 2x points)'
            ELSE cp.name || ' (1x points)'
        END,
        ', '
        ORDER BY (cp.total_points - COALESCE(cp.baseline_points, 0)) DESC
    ) as team_breakdown,
    SUM(CASE 
        WHEN cp.is_captain THEN (cp.total_points - COALESCE(cp.baseline_points, 0)) * 2
        ELSE (cp.total_points - COALESCE(cp.baseline_points, 0))
    END) as total_competition_points
FROM user_profiles up
JOIN chelsea_players cp ON cp.assigned_to_user_id = up.id
WHERE up.first_name IS NOT NULL
GROUP BY up.id, up.first_name
ORDER BY total_competition_points DESC;

-- Verify no vice-captains remain
SELECT 
    'Vice-Captain Verification' as result_type,
    COUNT(*) as total_players,
    COUNT(CASE WHEN is_captain = true THEN 1 END) as captains,
    COUNT(CASE WHEN is_vice_captain = true THEN 1 END) as vice_captains_remaining
FROM chelsea_players 
WHERE assigned_to_user_id IS NOT NULL;

DO $$
BEGIN
    RAISE NOTICE '=== VICE-CAPTAIN REMOVAL COMPLETE ===';
    RAISE NOTICE '✅ All vice-captain assignments removed';
    RAISE NOTICE '✅ Captain assignments remain (2x multiplier)';
    RAISE NOTICE '✅ Regular players get 1x multiplier';
    RAISE NOTICE '🔄 Refresh Enhanced Leaderboard to see simplified scoring';
    RAISE NOTICE '';
    RAISE NOTICE 'New scoring system:';
    RAISE NOTICE '- Captain: 2x competition points';
    RAISE NOTICE '- All other players: 1x competition points';
    RAISE NOTICE '- No vice-captain multipliers';
END $$;
