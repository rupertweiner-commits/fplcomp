# API Consolidation Mapping

## Current API Usage Analysis

### 1. Game Management API (`/api/game.js`)
**Consolidates:** simulation.js + competition-points.js + draft-allocation-simple.js

**Frontend Calls:**
- `/api/simulation?action=status` → `/api/game?action=simulation-status`
- `/api/simulation?action=leaderboard` → `/api/game?action=leaderboard`
- `/api/simulation?action=start` → `/api/game?action=start-simulation`
- `/api/simulation?action=simulate` → `/api/game?action=simulate-gameweek`
- `/api/simulation?action=reset` → `/api/game?action=reset-simulation`
- `/api/simulation?action=simulate-next` → `/api/game?action=simulate-next`
- `/api/draft-allocation-simple?action=get-mock-users` → `/api/game?action=get-users`
- `/api/draft-allocation-simple?action=get-available-players` → `/api/game?action=get-available-players`
- `/api/draft-allocation-simple?action=allocate-player` → `/api/game?action=allocate-player`
- `/api/draft-allocation-simple?action=get-user-team` → `/api/game?action=get-user-team`
- `/api/competition-points?action=get-competition-status` → `/api/game?action=competition-status`
- `/api/competition-points?action=update-baseline` → `/api/game?action=update-baseline`

**Files to Update:**
- `client/src/components/Draft.js` (4 calls)
- `client/src/components/tabs/SimulationTab.js` (4 calls)
- `client/src/hooks/useDraftState.js` (4 calls)
- `client/src/components/AdminDashboard.js` (multiple calls)

### 2. Players API (`/api/players.js`)
**Consolidates:** fpl-sync.js + gameweek-scores.js + player-ownership-scores.js

**Frontend Calls:**
- `/api/fpl-sync?action=get-chelsea-players` → `/api/players?action=get-chelsea-players`
- `/api/fpl-sync?action=login-sync` → `/api/players?action=login-sync`
- `/api/fpl-sync?action=live-scores` → `/api/players?action=live-scores`
- `/api/fpl-sync?action=sync-chelsea-players` → `/api/players?action=sync-chelsea-players`
- `/api/fpl-sync?action=sync-status` → `/api/players?action=sync-status`
- `/api/fpl-sync?action=bootstrap` → `/api/players?action=bootstrap`
- `/api/fpl-sync?action=current-gameweek` → `/api/players?action=current-gameweek`
- `/api/fpl-sync?action=dashboard` → `/api/players?action=dashboard`

**Files to Update:**
- `client/src/components/PlayerStats.js` (4 calls)
- `client/src/components/FPLSync.js` (3 calls)
- `client/src/App.js` (1 call)
- `client/src/components/ChipManagement.js` (1 call)
- `client/src/components/Dashboard.js` (1 call)
- `client/src/components/LiveTracker.js` (2 calls)
- `client/src/components/FPLDataSync.js` (2 calls)
- `client/src/components/ManagerAnalysis.js` (1 call)
- `client/src/hooks/useDraftState.js` (1 call)
- `client/src/components/AuthForm.js` (1 call)

### 3. Users API (`/api/users.js`)
**Consolidates:** enhanced-leaderboard.js + activity.js + admin.js

**Frontend Calls:**
- `/api/enhanced-leaderboard?action=get_leaderboard` → `/api/users?action=get-leaderboard`
- `/api/enhanced-leaderboard?action=get_awards` → `/api/users?action=get-awards`
- `/api/enhanced-leaderboard?action=calculate_awards` → `/api/users?action=calculate-awards`
- `/api/enhanced-leaderboard?action=get_user_stats` → `/api/users?action=get-user-stats`
- `/api/admin?action=validate-team` → `/api/users?action=validate-team`
- `/api/admin?action=validate-all-teams` → `/api/users?action=validate-all-teams`
- `/api/admin?action=enforce-composition` → `/api/users?action=enforce-composition`
- `/api/activity?action=user` → `/api/users?action=user-activity`
- `/api/activity?action=recent` → `/api/users?action=recent-activity`

**Files to Update:**
- `client/src/components/tabs/EnhancedLeaderboardTab.js` (3 calls)
- `client/src/components/AdminDashboard.js` (multiple admin calls)

### 4. Features API (`/api/features.js`)
**Consolidates:** notifications.js + chips.js + chelsea-fixtures.js + user-chips.js

**Frontend Calls:**
- `/api/notifications?type=email&action=preferences` → `/api/features?action=email-preferences`
- `/api/notifications?type=push&action=subscribe` → `/api/features?action=push-subscribe`
- `/api/user-chips?userId=X` → `/api/features?action=get-user-chips`
- `/api/chelsea-fixtures` → `/api/features?action=chelsea-fixtures`
- `/api/chips?action=use` → `/api/features?action=use-chip`
- `/api/leaderboard` → `/api/features?action=basic-leaderboard` (deprecated)

**Files to Update:**
- `client/src/components/UserTeamManagement.js` (1 call)
- `client/src/components/NotificationPreferences.js` (3 calls)
- `client/src/components/ChipManagement.js` (2 calls)
- `client/src/components/ChelseaNextGame.js` (1 call)

### 5. Files to Remove After Migration:
- `api/simulation.js`
- `api/competition-points.js`
- `api/draft-allocation-simple.js`
- `api/fpl-sync.js`
- `api/gameweek-scores.js`
- `api/player-ownership-scores.js`
- `api/enhanced-leaderboard.js`
- `api/activity.js`
- `api/admin.js`
- `api/notifications.js`
- `api/chips.js`
- `api/chelsea-fixtures.js`
- `api/user-chips.js`
- `api/leaderboard.js` (already deprecated)

## Migration Strategy:
1. Create new consolidated APIs with all existing functionality
2. Update frontend calls systematically
3. Test each consolidated API thoroughly
4. Remove old APIs only after full testing
5. Update documentation and deployment
