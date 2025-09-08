# FPL Competition - Project Context

## Current State (December 2024)

### Working Architecture
- ✅ **Frontend**: React app in `/client` directory
- ✅ **Backend**: Vercel serverless functions in `/api` directory  
- ✅ **Database**: Supabase PostgreSQL
- ✅ **Authentication**: Supabase Auth with custom user profiles
- ✅ **Deployment**: Vercel auto-deploys from GitHub

### Key Components
- **App.js**: Manages authentication state, passes currentUser to child components
- **AuthForm.js**: Main login/signup component (replaces old SupabaseLoginForm)
- **Draft.js**: Main application component (receives currentUser as prop)
- **ForgotPassword.js**: Password reset using Supabase auth

### Database Schema
- **auth.users**: Supabase's built-in authentication table
- **public.users**: Custom user profiles table (synced via database triggers)
- **draft_status**: Draft game state
- **chelsea_players**: Player data
- **draft_picks**: User draft selections

### API Endpoints (Vercel Functions)
- `/api/fpl/*`: FPL data endpoints
- `/api/sync/*`: Data synchronization
- `/api/cron/*`: Scheduled tasks

## Recent Fixes Applied

### Authentication State Management
- **Problem**: Draft component was managing its own currentUser state
- **Solution**: Centralized authentication in App.js, pass currentUser as props
- **Result**: Users can now access the main app after login

### Code Cleanup
- **Removed**: SupabaseLoginForm.js (replaced by AuthForm.js)
- **Removed**: Service worker and push notification code
- **Removed**: Supabase Edge Function calls (don't exist in this project)
- **Updated**: All axios calls to use fetch()
- **Fixed**: JSX syntax errors and unused imports

### Build Issues
- **Problem**: Multiple build failures due to undefined references
- **Solution**: Comprehensive cleanup of unused imports and variables
- **Result**: Build now succeeds with only minor warnings

## Common Issues and Solutions

### Authentication Problems
- **Issue**: User can sign in but app doesn't load
- **Cause**: currentUser state not passed to components
- **Solution**: Ensure App.js passes currentUser as props

### Build Failures
- **Issue**: "setCurrentUser is not defined" or similar
- **Cause**: Legacy references to removed state management
- **Solution**: Remove all references to removed functions/variables

### API Errors
- **Issue**: 404 errors on API calls
- **Cause**: Calling non-existent Supabase Edge Functions
- **Solution**: Use Vercel API functions in /api directory

### Database Issues
- **Issue**: Profile fetch fails
- **Cause**: User doesn't exist in public.users table
- **Solution**: Check database triggers or manually create user profile

## Environment Setup

### Required Environment Variables (Vercel)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Local Development
- `cd client && npm install`
- `cd client && npm start`
- App runs on http://localhost:3000

### Deployment
- Push to GitHub main branch
- Vercel auto-deploys
- App available at Vercel URL

## Testing Checklist

Before deploying:
1. ✅ Build succeeds: `cd client && npm run build`
2. ✅ No ESLint errors
3. ✅ Authentication works (sign in/out)
4. ✅ User can access main app
5. ✅ Profile data loads correctly
6. ✅ API endpoints respond

## Known Limitations

### Supabase Auth
- Built-in email service has rate limits (2 emails/hour)
- Custom SMTP recommended for production
- Email confirmations disabled for immediate access

### Vercel Functions
- Cold start delays on first request
- 10-second timeout limit
- No persistent connections

### Database
- User sync depends on database triggers
- Manual profile creation may be needed for existing users
- RLS policies must be properly configured

## Supabase SQL Migration Guide

### ⚠️ IMPORTANT: Avoiding "Unable to find snippet" Errors

**Problem**: When trying to run SQL migrations, you may see "Unable to find snippet with ID..." errors.

**Cause**: The SQL files in `/supabase/migrations/` are local project files, NOT Supabase snippets.

**Solution**: 
1. **DO NOT** look for snippets in Supabase Dashboard
2. **DO** copy SQL directly from the migration files
3. **DO** paste into Supabase SQL Editor manually

### ⚠️ IMPORTANT: Avoiding "Policy Already Exists" Errors

**Problem**: When running migrations multiple times, you may see "policy 'X' for table 'Y' already exists" errors.

**Cause**: RLS policies, functions, triggers, or tables already exist from previous migrations.

**Solution**: 
1. **ALWAYS** use `DROP POLICY IF EXISTS` before creating policies
2. **ALWAYS** use `DROP TRIGGER IF EXISTS` before creating triggers
3. **ALWAYS** use `CREATE OR REPLACE FUNCTION` for functions
4. **ALWAYS** use `CREATE TABLE IF NOT EXISTS` for tables

### How to Run SQL Migrations Properly

1. **Open Supabase Dashboard** → **SQL Editor**
2. **Click "New Query"**
3. **Copy SQL from migration files** (e.g., `supabase/migrations/006a_basic_auth_sync.sql`)
4. **Paste directly into SQL Editor**
5. **Click "Run"** (or Ctrl+Enter)

### Migration Files Available (in order)
- `001_create_users_table.sql` - Basic users table with RLS policies
- `002_add_password_auth.sql` - Password authentication columns
- `003_simulation_tables.sql` - Simulation and team management tables
- `004_team_management_tables.sql` - Chips, transfers, and team management
- `005_player_ownership_system.sql` - Player ownership and draft allocations
- `006a_basic_auth_sync.sql` - Basic user sync triggers
- `006b_sync_existing_users.sql` - Sync existing users
- `006c_sync_status_checker.sql` - Check sync status
- `007_notification_system.sql` - Notification preferences and push subscriptions

### Existing Database Schema

#### Tables Created:
- `users` - User profiles (synced with auth.users)
- `simulation_status` - Draft/simulation state
- `gameweek_results` - Gameweek results data
- `user_teams` - User team configurations
- `user_chips` - Available chips per user
- `chip_usage` - Chip usage history
- `transfer_history` - Transfer history
- `player_ownership` - Player ownership tracking
- `player_transfers` - Player transfer records
- `user_teams_weekly` - Weekly team lineups
- `draft_allocations` - Admin draft allocations
- `user_notification_preferences` - Notification settings
- `user_push_subscriptions` - Push notification subscriptions
- `notification_logs` - Notification delivery logs

#### RLS Policies Already Created:
- **users table**: "Users can read own profile", "Users can update own profile", "Admins can read all profiles", "Admins can update all profiles"
- **simulation_status**: "Anyone can read simulation status", "Admins can update simulation status"
- **gameweek_results**: "Anyone can read gameweek results", "Admins can manage gameweek results"
- **user_teams**: "Users can read their own teams", "Users can read all teams", "Admins can manage all teams"
- **user_chips**: "Users can read their own chips", "Users can read all chips", "Admins can manage all chips"
- **chip_usage**: "Users can read chip usage", "Users can insert their own chip usage", "Admins can manage all chip usage"
- **transfer_history**: "Users can read transfer history", "Users can insert their own transfers", "Admins can manage all transfers"
- **player_ownership**: "Users can read their own player ownership", "Users can read all player ownership", "Admins can manage all player ownership"
- **player_transfers**: "Users can read all transfers", "Users can insert their own transfers", "Admins can manage all transfers"
- **user_teams_weekly**: "Users can read their own weekly teams", "Users can read all weekly teams", "Users can manage their own weekly teams", "Admins can manage all weekly teams"
- **draft_allocations**: "Users can read draft allocations", "Admins can manage draft allocations"

#### Functions Already Created:
- `handle_new_user()` - Syncs new auth.users to public.users
- `sync_existing_auth_users()` - Syncs existing auth users
- `check_user_sync_status()` - Checks sync status
- `create_player_ownership_from_draft()` - Creates ownership from draft allocations
- `update_player_ownership_on_transfer()` - Updates ownership on transfers
- `create_notification_preferences_for_new_user()` - Creates notification preferences

#### Triggers Already Created:
- `on_auth_user_created` - Triggers on new user creation
- `trigger_create_player_ownership` - Triggers on draft allocations
- `trigger_update_player_ownership` - Triggers on player transfers
- `on_user_created_notification_preferences` - Triggers on new user creation

### Testing Migrations
After running migrations, test with:
```sql
-- Check if trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check sync status
SELECT * FROM public.check_user_sync_status();

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### Common Migration Issues
- **Permission errors**: Ensure using service_role key for admin operations
- **Function not found**: Run migrations in correct order
- **Trigger not working**: Check if function was created successfully
- **Policy already exists**: Use `DROP POLICY IF EXISTS` before creating policies
- **Table already exists**: Use `CREATE TABLE IF NOT EXISTS` for tables
- **Function already exists**: Use `CREATE OR REPLACE FUNCTION` for functions
