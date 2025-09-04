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
