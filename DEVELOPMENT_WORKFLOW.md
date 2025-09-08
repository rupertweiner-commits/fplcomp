# FPL Competition - Development Workflow

## 🎯 Before Making ANY Change

### 1. System Impact Analysis
Ask these questions:
- **Which frontend components** will be affected?
- **Which API endpoints** need to be updated?
- **Which database tables** are involved?
- **Will admin users** be able to access this feature?
- **Will regular users** be able to access this feature?

### 2. Database Requirements Check
Before coding, verify:
- [ ] Required tables exist in Supabase
- [ ] RLS policies allow the necessary operations
- [ ] Admin permissions are set up correctly
- [ ] User permissions are set up correctly

### 3. Authentication Flow Verification
Ensure:
- [ ] Admin users will be recognized (`rupertweiner@gmail.com`)
- [ ] Profile completion won't block access
- [ ] RLS policies won't cause infinite loops
- [ ] API endpoints can verify user permissions

## 🔄 Standard Development Process

### Step 1: Database First
```sql
-- Always create tables first
CREATE TABLE IF NOT EXISTS public.new_table (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  -- other fields
);

-- Set up RLS
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "policy_name" ON public.new_table;
CREATE POLICY "policy_name" ON public.new_table
  FOR SELECT USING (user_id = auth.uid());
```

### Step 2: API Endpoints
```javascript
// Always check admin status properly
const isAdmin = user.email === 'rupertweiner@gmail.com';
if (!isAdmin) {
  return res.status(403).json({ error: 'Admin access required' });
}

// Handle database operations with proper error handling
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id);

if (error) {
  console.error('Database error:', error);
  return res.status(500).json({ error: 'Database operation failed' });
}
```

### Step 3: Frontend Components
```javascript
// Always check admin status in components
if (!currentUser?.isAdmin) {
  return <div>Admin access required</div>;
}

// Handle API calls with proper error handling
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    'Content-Type': 'application/json'
  }
});

if (!response.ok) {
  const error = await response.json();
  alert(`Error: ${error.error}`);
  return;
}
```

### Step 4: Testing
1. **Test as admin user** (`rupertweiner@gmail.com`)
2. **Test as regular user** (if applicable)
3. **Test profile completion flow**
4. **Test database operations**
5. **Test API endpoints**

## 🚨 Common Anti-Patterns to Avoid

### ❌ Don't Do This:
```javascript
// Don't query users table for admin check in RLS policies
CREATE POLICY "admin_policy" ON public.users
  FOR ALL USING (
    (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
  );
```

### ✅ Do This Instead:
```javascript
// Use email-based admin check
const isAdmin = user.email === 'rupertweiner@gmail.com';
```

### ❌ Don't Do This:
```javascript
// Don't assume tables exist
const { data } = await supabase.from('non_existent_table').select('*');
```

### ✅ Do This Instead:
```javascript
// Check if table exists or create it first
// Always handle errors gracefully
const { data, error } = await supabase.from('table').select('*');
if (error) {
  console.error('Table access error:', error);
  return;
}
```

### ❌ Don't Do This:
```javascript
// Don't block admin users with profile completion
if (!profileComplete) {
  return <ProfileCompletion />;
}
```

### ✅ Do This Instead:
```javascript
// Bypass profile completion for admin users
if (!profileComplete && !currentUser?.isAdmin) {
  return <ProfileCompletion />;
}
```

## 🔧 Feature Implementation Template

### For New Features:

1. **Create SQL migration file**:
```sql
-- create-feature-name.sql
-- Step 1: Create tables
CREATE TABLE IF NOT EXISTS public.feature_table (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  -- fields
);

-- Step 2: Set up RLS
ALTER TABLE public.feature_table ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies
DROP POLICY IF EXISTS "Users can read own data" ON public.feature_table;
CREATE POLICY "Users can read own data" ON public.feature_table
  FOR SELECT USING (user_id = auth.uid());

-- Step 4: Test
SELECT 'Feature tables created successfully' as status;
```

2. **Create API endpoint**:
```javascript
// api/feature-name.js
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Admin check (if needed)
    const isAdmin = user.email === 'rupertweiner@gmail.com';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Feature logic
    const { action } = req.query;
    switch (action) {
      case 'create':
        return await handleCreate(req, res, user);
      case 'read':
        return await handleRead(req, res, user);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Feature API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
```

3. **Create frontend component**:
```javascript
// components/FeatureComponent.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

function FeatureComponent({ currentUser }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Admin check
  if (!currentUser?.isAdmin) {
    return <div>Admin access required</div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/feature-name?action=read', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Feature Component</h2>
      {/* Feature UI */}
    </div>
  );
}

export default FeatureComponent;
```

## 🧪 Testing Checklist

### Before Deploying:
- [ ] **Build succeeds**: `cd client && npm run build`
- [ ] **No ESLint errors**: Check console for warnings
- [ ] **Admin features work**: Test with `rupertweiner@gmail.com`
- [ ] **Regular user features work**: Test with non-admin user
- [ ] **Database operations work**: Check Supabase logs
- [ ] **API endpoints respond**: Test all endpoints
- [ ] **RLS policies work**: Verify permissions

### After Deploying:
- [ ] **App loads**: No profile completion screen for admin
- [ ] **Admin features accessible**: Can click admin buttons
- [ ] **No console errors**: Check browser console
- [ ] **No API errors**: Check Vercel function logs
- [ ] **Database accessible**: Check Supabase logs

## 🚀 Deployment Steps

1. **Local testing**:
   ```bash
   cd client && npm run build
   ```

2. **Commit changes**:
   ```bash
   git add .
   git commit -m "Feature: Add new feature with proper database setup"
   git push origin main
   ```

3. **Run SQL migrations** (if any):
   - Copy SQL from migration file
   - Paste into Supabase SQL Editor
   - Run and verify success

4. **Test deployed app**:
   - Hard refresh browser
   - Test admin features
   - Check for errors

## 📋 Issue Resolution Process

### When Something Breaks:

1. **Check browser console** for frontend errors
2. **Check Vercel function logs** for API errors
3. **Check Supabase logs** for database errors
4. **Verify RLS policies** aren't blocking access
5. **Test with admin user** first
6. **Check if tables exist** in Supabase
7. **Verify admin status** in database

### Emergency Fixes:

1. **Disable RLS temporarily** (if needed):
   ```sql
   ALTER TABLE public.problematic_table DISABLE ROW LEVEL SECURITY;
   ```

2. **Fix admin status**:
   ```sql
   UPDATE public.users 
   SET is_admin = true 
   WHERE email = 'rupertweiner@gmail.com';
   ```

3. **Create missing tables**:
   ```sql
   CREATE TABLE IF NOT EXISTS public.missing_table (
     id SERIAL PRIMARY KEY,
     -- fields
   );
   ```

This workflow ensures all changes consider the complete system architecture!
