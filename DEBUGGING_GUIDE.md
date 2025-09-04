# FPL Competition - Debugging Guide

## Quick Debugging Checklist

### Authentication Issues
1. **Check browser console** for auth state changes
2. **Verify user exists** in both `auth.users` and `public.users` tables
3. **Check if currentUser prop** is being passed to components
4. **Verify Supabase environment variables** are set in Vercel

### Build Failures
1. **Run local build**: `cd client && npm run build`
2. **Check for undefined references** (setCurrentUser, deleted components)
3. **Remove unused imports** and variables
4. **Fix ESLint errors** before committing

### API Errors
1. **Check if endpoint exists** in `/api` directory
2. **Verify function exports** are correct
3. **Check Vercel function logs** for errors
4. **Test API endpoints** directly

## Common Error Messages and Solutions

### "setCurrentUser is not defined"
- **Cause**: Component trying to manage auth state
- **Solution**: Remove setCurrentUser calls, use currentUser prop instead

### "Module not found: Error: Can't resolve './services/authService'"
- **Cause**: File doesn't exist or import path is wrong
- **Solution**: Check if file exists, fix import path

### "Profile fetch failed"
- **Cause**: User doesn't exist in public.users table
- **Solution**: Check database triggers or manually create user profile

### "API responded with status: 404"
- **Cause**: Calling non-existent Supabase Edge Function
- **Solution**: Use Vercel API functions in /api directory

### "currentUser: null" in console
- **Cause**: Authentication state not being passed to component
- **Solution**: Ensure App.js passes currentUser as prop

## Debugging Steps

### 1. Check Browser Console
Look for these key messages:
- `🔄 Auth state changed: SIGNED_IN`
- `✅ User profile loaded:`
- `👤 currentUser:` (should not be null)

### 2. Check Network Tab
- Look for failed API requests (red entries)
- Check if Supabase calls are successful
- Verify API endpoints are being called

### 3. Check Supabase Dashboard
- **Authentication → Users**: Verify user exists
- **Table Editor → users**: Check if profile exists
- **Logs**: Look for authentication events

### 4. Check Vercel Dashboard
- **Functions**: Verify API functions are deployed
- **Environment Variables**: Check if Supabase keys are set
- **Logs**: Look for function execution errors

## Testing Commands

### Local Testing
```bash
# Test build
cd client && npm run build

# Test development server
cd client && npm start

# Check for linting errors
cd client && npm run lint
```

### Database Testing
```sql
-- Check if user exists in auth.users
SELECT * FROM auth.users WHERE email = 'user@example.com';

-- Check if user exists in public.users
SELECT * FROM public.users WHERE email = 'user@example.com';

-- Check database triggers
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

## Prevention Strategies

### Before Making Changes
1. **Read the .cursorrules file**
2. **Check PROJECT_CONTEXT.md** for current state
3. **Understand the architecture** (Vercel + Supabase)
4. **Test locally** before committing

### Code Review Checklist
1. ✅ No references to deleted components
2. ✅ No duplicate authentication logic
3. ✅ All imports are used
4. ✅ Build succeeds locally
5. ✅ No undefined variables

### Deployment Checklist
1. ✅ Build succeeds
2. ✅ Environment variables set
3. ✅ Database tables exist
4. ✅ API functions deployed
5. ✅ Authentication works

## Emergency Fixes

### If App Won't Load After Login
1. Check if currentUser prop is being passed
2. Verify user profile exists in database
3. Check browser console for errors
4. Test with a fresh user account

### If Build Fails
1. Remove all references to deleted code
2. Fix undefined variable references
3. Remove unused imports
4. Test build locally

### If API Calls Fail
1. Check if functions exist in /api directory
2. Verify function exports
3. Check Vercel function logs
4. Test endpoints directly

## Getting Help

### Information to Provide
1. **Error message** (exact text)
2. **Browser console logs**
3. **Steps to reproduce**
4. **Current state** of the app
5. **Recent changes** made

### Useful Logs to Check
- Browser console (F12)
- Vercel function logs
- Supabase authentication logs
- Build logs in Vercel dashboard
