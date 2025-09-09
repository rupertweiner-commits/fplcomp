# 🗄️ Consolidated Database Schema Setup Guide

## 🎯 **What This Fixes**

The previous database had **multiple conflicting user table systems**:
- ❌ `users` table (old system with integer IDs)
- ❌ `user_profiles` table (new system with UUID IDs)
- ❌ Foreign key constraints pointing to wrong tables
- ❌ Confusion about which table to use where

## ✅ **New Consolidated System**

Now we have **ONE unified system**:
- ✅ **Single `user_profiles` table** (extends Supabase auth.users)
- ✅ **All foreign keys point to user_profiles**
- ✅ **Consistent UUID-based user IDs throughout**
- ✅ **No more table confusion or constraint errors**

---

## 📋 **Setup Instructions**

### **Step 1: Run the Consolidated Schema**

**Run `consolidated-database-schema.sql` in Supabase SQL Editor:**

This script will:
- 🗑️ Drop all conflicting tables
- 🏗️ Create the new consolidated schema
- 🔐 Set up proper RLS policies
- 📊 Create all necessary indexes
- ✅ Insert initial data

### **Step 2: Create Mock Users**

**Run `create-mock-users-consolidated.sql` in Supabase SQL Editor:**

This creates:
- 👥 3 mock users: `alex_manager`, `sarah_coach`, `mike_tactician`
- 📊 User activity entries
- 🎯 Draft status (ready for manual draft)
- 🏆 Simulation status (ready for testing)

---

## 🏗️ **New Database Structure**

### **Core Tables**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `user_profiles` | User data (extends auth.users) | `id` (UUID), `username`, `email`, `is_admin` |
| `draft_status` | Draft management | `is_draft_complete`, `draft_order`, `completed_picks` |
| `draft_picks` | Player selections | `user_id` → `user_profiles.id` |
| `user_teams` | Team compositions | `user_id` → `user_profiles.id` |
| `simulation_status` | Simulation state | `is_simulation_mode`, `current_gameweek` |
| `gameweek_results` | Gameweek scores | `gameweek`, `player_id`, `points` |
| `user_gameweek_scores` | User weekly scores | `user_id` → `user_profiles.id` |
| `user_total_points` | User total points | `user_id` → `user_profiles.id` |
| `user_activity` | User activity logs | `user_id` → `user_profiles.id` |

### **Key Benefits**

1. **Single Source of Truth**: All user data in `user_profiles`
2. **Consistent IDs**: UUID-based throughout the system
3. **Proper Foreign Keys**: All constraints point to correct tables
4. **RLS Security**: Proper row-level security policies
5. **Performance**: Optimized indexes for fast queries

---

## 🔧 **Updated Components**

### **API Endpoints Updated**
- ✅ `api/simulation.js` - Uses `user_profiles`
- ✅ `api/activity.js` - Uses `user_profiles`
- ✅ All foreign key references updated

### **Frontend Components Updated**
- ✅ `ProfileManager.js` - Uses `user_profiles`
- ✅ `useDraftState.js` - Uses `user_profiles`
- ✅ All database queries updated

### **Database Queries Updated**
- ✅ All `users` table references → `user_profiles`
- ✅ All foreign key constraints updated
- ✅ All RLS policies updated

---

## 🧪 **Testing the System**

### **1. Verify Schema**
```sql
-- Check that all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### **2. Check Mock Users**
```sql
-- Verify mock users were created
SELECT username, email, is_admin FROM user_profiles 
WHERE username IN ('alex_manager', 'sarah_coach', 'mike_tactician');
```

### **3. Test Draft Status**
```sql
-- Check draft is ready for manual selection
SELECT is_draft_complete, total_picks, draft_order FROM draft_status WHERE id = 1;
```

### **4. Test Simulation Status**
```sql
-- Check simulation is ready
SELECT is_simulation_mode, current_gameweek, is_draft_complete FROM simulation_status WHERE id = 1;
```

---

## 🎮 **Next Steps**

1. **Run the SQL scripts** (consolidated-database-schema.sql, then create-mock-users-consolidated.sql)
2. **Test the app** - All foreign key errors should be resolved
3. **Start the draft process** - Assign players to the 3 mock users manually
4. **Test simulation** - Run gameweek simulations with the mock users

---

## 🚨 **Important Notes**

- **Backup First**: The consolidated schema script drops existing tables
- **No Data Loss**: The script preserves `chelsea_players` and other important data
- **Test Environment**: Run this in a test environment first if possible
- **Admin Access**: You'll need admin access to run the schema changes

---

## ✅ **Success Indicators**

After running the scripts, you should see:
- ✅ No more foreign key constraint errors
- ✅ Mock users appear in the app
- ✅ Draft process works without errors
- ✅ Simulation can be started
- ✅ All API endpoints respond correctly

The system is now **unified, consistent, and ready for testing**! 🎉
