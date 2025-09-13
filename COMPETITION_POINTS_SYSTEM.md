# Competition Points System - Preserves All FPL Data

## Overview
This system tracks competition points from today onwards while **preserving all existing FPL player data**.

## How It Works

### ✅ **What We DON'T Touch:**
- **`total_points`** - Always remains the actual FPL points (never modified)
- **Player stats** - All FPL data stays intact
- **Historical data** - Nothing is deleted or changed

### ✅ **What We DO Add:**
- **`baseline_points`** - Records today's FPL points as starting reference
- **Competition calculation** - `competition_points = total_points - baseline_points`
- **Leaderboard logic** - Only counts points earned since today

## Example:

**Before Competition (Today):**
- Cole Palmer has 45 FPL points total
- `baseline_points` = 45
- `competition_points` = 0

**After 1 Week:**
- Cole Palmer has 52 FPL points total (gained 7 new points)
- `baseline_points` = 45 (unchanged)
- `competition_points` = 52 - 45 = 7 ← **Only these count for leaderboard**

## Database Structure:

```sql
-- Original FPL data (never changed)
total_points: 52        -- Real FPL points
form: 3.2              -- Real FPL form
goals_scored: 8        -- Real FPL goals

-- Competition tracking (new)
baseline_points: 45    -- Starting point for competition
competition_points: 7  -- Points earned since competition start
```

## Benefits:

1. **Fair Competition** - Everyone starts at 0 competition points
2. **Data Integrity** - All FPL historical data preserved
3. **Transparency** - Can see both total FPL points and competition points
4. **Flexibility** - Can reset competition without losing FPL data

## Usage:

### Setup (Run Once):
```sql
-- Run setup-draft-start-today.sql
-- Sets baseline_points to current total_points for all players
```

### Leaderboard Calculation:
```sql
-- Uses the player_competition_stats view
SELECT 
    name,
    total_points,           -- Real FPL points (preserved)
    baseline_points,        -- Starting point (today's points)
    competition_points      -- Points earned since start (for leaderboard)
FROM player_competition_stats
WHERE assigned_to_user_id = 'user-id';
```

### API Endpoints:
- `GET /api/competition-points?action=get-leaderboard` - Competition standings
- `POST /api/competition-points?action=update-baseline` - Reset competition start
- `GET /api/competition-points?action=get-competition-status` - Competition info

## Result:
- **Players keep all their FPL history** 📊
- **Competition is fair from today** ⚖️  
- **Leaderboard only shows new points** 🏆
- **No data loss ever** ✅
