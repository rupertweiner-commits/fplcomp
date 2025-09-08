# FPL Competition - Complete System Architecture

## 🏗️ System Overview

This is a **Supabase + Vercel** FPL competition app with the following architecture:

- **Frontend**: React app (deployed on Vercel)
- **Backend**: Vercel serverless functions (`/api` directory)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth (NOT custom auth)
- **Deployment**: Vercel auto-deploys from GitHub main branch

## 📊 Database Schema

### Core Tables

#### 1. `auth.users` (Supabase managed)
- **Purpose**: Supabase authentication table
- **Key Fields**: `id`, `email`, `created_at`
- **Access**: Managed by Supabase Auth

#### 2. `public.users` (Custom user profiles)
- **Purpose**: Extended user profiles synced with auth.users
- **Key Fields**: 
  - `id` (UUID, references auth.users.id)
  - `email`, `username`, `first_name`, `last_name`
  - `is_admin` (BOOLEAN) - **CRITICAL for admin features**
  - `is_active` (BOOLEAN)
- **RLS**: Users can read/update own data, admins can read/update all
- **Sync**: Trigger syncs with auth.users on signup

#### 3. `public.simulation_status`
- **Purpose**: Tracks simulation state
- **Key Fields**: 
  - `is_simulation_mode` (BOOLEAN)
  - `current_gameweek` (INTEGER)
  - `is_draft_complete` (BOOLEAN)
  - `total_users` (INTEGER)
- **RLS**: Anyone can read, only admins can update

#### 4. `public.gameweek_results`
- **Purpose**: Stores gameweek scores
- **Key Fields**: 
  - `user_id` (UUID, references auth.users.id)
  - `gameweek` (INTEGER)
  - `total_points`, `captain_points`, `bench_points`
- **RLS**: Users can read own results, admins can manage all

#### 5. `public.user_teams`
- **Purpose**: Stores team assignments
- **Key Fields**: 
  - `user_id` (UUID, references auth.users.id)
  - `player_id`, `player_name`, `position`, `price`
  - `is_captain`, `is_vice_captain`
- **RLS**: Users can read own team, admins can manage all

#### 6. `public.user_chips`
- **Purpose**: Tracks chip usage
- **Key Fields**: 
  - `user_id` (UUID, references auth.users.id)
  - `chip_type` (TEXT: 'wildcard', 'free_hit', 'bench_boost', 'triple_captain')
  - `gameweek` (INTEGER)
- **RLS**: Users can read own chips, admins can manage all

#### 7. `public.chelsea_players`
- **Purpose**: Chelsea player data from FPL API
- **Key Fields**: 
  - `fpl_id`, `name`, `position`, `price`, `is_available`
- **RLS**: Anyone can read, only admins can update

#### 8. `public.draft_status`
- **Purpose**: Tracks draft state
- **Key Fields**: 
  - `is_draft_active`, `is_draft_complete`
  - `current_turn`, `total_picks`
- **RLS**: Anyone can read, only admins can update

#### 9. `public.draft_picks`
- **Purpose**: Records draft picks
- **Key Fields**: 
  - `user_id` (UUID, references auth.users.id)
  - `player_id`, `pick_order`
- **RLS**: Users can read own picks, admins can manage all

### Notification Tables

#### 10. `public.user_notification_preferences`
- **Purpose**: User notification settings
- **Key Fields**: 
  - `user_id` (UUID, references auth.users.id)
  - `email_notifications`, `push_notifications`
  - `deadline_reminders`, `transfer_notifications`
- **RLS**: Users can read/update own preferences

#### 11. `public.notification_log`
- **Purpose**: Logs sent notifications
- **Key Fields**: 
  - `user_id` (UUID, references auth.users.id)
  - `type`, `title`, `message`, `sent_at`
- **RLS**: Users can read own notifications, admins can read all

## 🔐 Authentication Flow

### 1. Sign Up Process
```
User signs up → Supabase Auth creates auth.users entry → 
Trigger creates public.users entry → User completes profile
```

### 2. Sign In Process
```
User signs in → Supabase Auth validates → 
App fetches public.users profile → Sets currentUser state
```

### 3. Admin Recognition
- **Frontend**: Checks `currentUser.isAdmin` flag
- **Backend**: Uses email-based check `user.email === 'rupertweiner@gmail.com'`
- **Database**: `public.users.is_admin` field

## 🎯 Frontend Components

### Core Components

#### 1. `App.js`
- **Purpose**: Main app container, manages authentication state
- **Key State**: `currentUser` (passed to all child components)
- **Key Functions**: 
  - `onAuthStateChange` - handles Supabase auth state changes
  - Profile fetching with timeout and fallback

#### 2. `Draft.js`
- **Purpose**: Main application component
- **Key State**: 
  - `profileComplete` - determines if profile completion screen shows
  - `currentUser` - received as prop from App.js
- **Key Functions**:
  - `checkProfileCompletion` - checks if user profile is complete
  - `startSimulation` - calls `/api/simulation?action=start`

#### 3. `AuthForm.js`
- **Purpose**: Login/signup form
- **Key Functions**: 
  - `handleLogin` - calls `supabase.auth.signInWithPassword`
  - `handleSignup` - calls `supabase.auth.signUp`

### Admin Components

#### 4. `SimulationTab` (in Draft.js)
- **Purpose**: Simulation controls
- **Key Features**: 
  - "Enter Simulation" button → calls `startSimulation()`
  - Admin-only features (hidden if not admin)

#### 5. `TeamAssignment` (in Draft.js)
- **Purpose**: Team management for admins
- **Key Features**: 
  - Assign players to users
  - View all user teams

## 🔌 API Endpoints

### Authentication APIs
- **NONE** - All auth handled by Supabase client-side

### Simulation APIs (`/api/simulation.js`)
- `GET /api/simulation?action=status` - Get simulation status
- `POST /api/simulation?action=start` - Start simulation (admin only)
- `POST /api/simulation?action=simulate` - Simulate gameweek (admin only)
- `GET /api/simulation?action=leaderboard` - Get leaderboard

### Admin APIs (`/api/admin.js`)
- `POST /api/admin?action=allocate-player` - Assign player to user (admin only)
- `GET /api/admin?action=allocations` - Get all allocations (admin only)

### FPL APIs (`/api/fpl.js`)
- `GET /api/fpl?action=bootstrap` - Get FPL bootstrap data
- `GET /api/fpl?action=current-gameweek` - Get current gameweek
- `GET /api/fpl?action=dashboard` - Get FPL dashboard data

### Team APIs (`/api/teams.js`)
- `GET /api/teams?action=user&userId=X` - Get user team
- `GET /api/teams?action=all` - Get all teams
- `POST /api/teams?action=assign` - Assign teams (admin only)

## 🚨 Common Issues & Solutions

### 1. "Admin access required" Error
**Cause**: Backend API can't verify admin status
**Solution**: Use email-based admin check instead of database query

### 2. "Internal server error" 
**Cause**: Missing database tables
**Solution**: Create required tables with proper RLS policies

### 3. "Profile completion screen" showing for admin
**Cause**: Profile fetch failing or incomplete profile data
**Solution**: Add admin bypass in profile completion check

### 4. "Infinite RLS loop"
**Cause**: RLS policies referencing same table they protect
**Solution**: Use `auth.users` for admin checks, not `public.users`

### 5. "Unable to find snippet" Error
**Cause**: User trying to use Supabase snippets instead of SQL Editor
**Solution**: Always paste SQL directly into "New query" tab

## 📋 Development Checklist

### Before Making Any Change:

1. **Identify affected components**:
   - Which frontend components?
   - Which API endpoints?
   - Which database tables?

2. **Check database requirements**:
   - Do required tables exist?
   - Are RLS policies correct?
   - Are admin permissions set up?

3. **Verify authentication flow**:
   - Will admin users be recognized?
   - Will profile completion work?
   - Will RLS policies allow access?

4. **Test the complete flow**:
   - Sign in as admin
   - Check profile completion
   - Test admin features
   - Verify database operations

### When Adding New Features:

1. **Create database tables first** (if needed)
2. **Set up RLS policies**
3. **Create API endpoints**
4. **Update frontend components**
5. **Test complete user flow**

### When Fixing Issues:

1. **Check browser console** for frontend errors
2. **Check Vercel logs** for API errors
3. **Check Supabase logs** for database errors
4. **Verify RLS policies** aren't blocking access
5. **Test with admin user** first

## 🔧 Admin User Setup

### Required for Admin Features:
1. **Database**: `public.users.is_admin = true` for `rupertweiner@gmail.com`
2. **Frontend**: `currentUser.isAdmin = true` in user object
3. **Backend**: Email-based admin check in API endpoints
4. **RLS**: Admin policies allowing full access

### Admin Email: `rupertweiner@gmail.com`
- This email is hardcoded as admin in multiple places
- If changing admin, update all references

## 📝 SQL Migration Best Practices

1. **Always use `IF NOT EXISTS`** for table creation
2. **Always use `DROP POLICY IF EXISTS`** before creating policies
3. **Always use `CREATE OR REPLACE FUNCTION`** for functions
4. **Test policies** with actual user data
5. **Provide copy-paste ready SQL** (no snippets)

## 🚀 Deployment Process

1. **Make changes locally**
2. **Test build**: `cd client && npm run build`
3. **Commit and push** to GitHub
4. **Vercel auto-deploys** from main branch
5. **Run any required SQL** in Supabase
6. **Test deployed app**

## 🎯 Key Success Patterns

- **Admin recognition works**: User can access admin features
- **Profile completion works**: No stuck on completion screen
- **Database operations work**: No RLS blocking legitimate access
- **API calls succeed**: No internal server errors
- **Build succeeds**: No ESLint errors or undefined references

This architecture ensures all components work together seamlessly!
