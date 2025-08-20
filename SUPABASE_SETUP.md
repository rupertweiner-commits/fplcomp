# 🗄️ Supabase Backend Setup for KPG's Competition

This guide will help you set up the complete backend infrastructure for your KPG's Annual Chelsea Competition app.

## 🚀 **Step 1: Run the Database Setup Script**

1. **Go to your Supabase dashboard**: https://supabase.com/dashboard
2. **Select your project**: `qtksftbezmrbwllqbhuc`
3. **Navigate to "SQL Editor"**
4. **Create a new query** and paste the entire contents of `supabase-setup.sql`
5. **Click "Run"** to execute the script

This will create:
- ✅ All necessary database tables
- ✅ Row Level Security policies
- ✅ Helper functions
- ✅ Sample Chelsea players data
- ✅ Initial draft status

## 🔧 **Step 2: Deploy Edge Functions**

### **Option A: Using Supabase CLI (Recommended)**

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref qtksftbezmrbwllqbhuc
   ```

4. **Deploy the functions**:
   ```bash
   supabase functions deploy auth/login
   supabase functions deploy draft/status
   supabase functions deploy draft/chelsea-players
   ```

### **Option B: Manual Upload**

1. **Go to your Supabase dashboard**
2. **Navigate to "Edge Functions"**
3. **Create new functions** for each endpoint:
   - `auth/login`
   - `draft/status`
   - `draft/chelsea-players`
4. **Copy the code** from the corresponding `.ts` files

## 🌐 **Step 3: Update Vercel Environment Variables**

In your Vercel dashboard, add these environment variables:

```
REACT_APP_SUPABASE_URL=https://qtksftbezmrbwllqbhuc.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0a3NmdGJlem1yYndsbHFiaHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTU1MjEsImV4cCI6MjA3MTI5MTUyMX0.E7bbjVpBuNxqbpXBGc3K77BqcpBGv50FK4Haenxo_9Q
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

## 🔐 **Step 4: Get Your Service Role Key**

1. **In Supabase dashboard** → **Settings** → **API**
2. **Copy the "service_role" key** (not the anon key)
3. **Add it to Vercel** as `REACT_APP_SUPABASE_SERVICE_ROLE_KEY`

## 📱 **Step 5: Test the API Endpoints**

Once deployed, test these endpoints:

- **Login**: `https://qtksftbezmrbwllqbhuc.supabase.co/functions/v1/auth/login`
- **Draft Status**: `https://qtksftbezmrbwllqbhuc.supabase.co/functions/v1/draft/status`
- **Chelsea Players**: `https://qtksftbezmrbwllqbhuc.supabase.co/functions/v1/draft/chelsea-players`

## 🎯 **What This Gives You:**

✅ **User Authentication** - Login/create accounts  
✅ **Draft Management** - Track draft status and turns  
✅ **Team Management** - Store user teams and players  
✅ **Player Database** - Chelsea players with stats  
✅ **Real-time Updates** - Live draft updates  
✅ **Activity Logging** - Track user actions  
✅ **Security** - Row Level Security policies  

## 🚨 **Troubleshooting:**

### **Common Issues:**

1. **"Function not found"**: Make sure Edge Functions are deployed
2. **"Permission denied"**: Check RLS policies are enabled
3. **"Table doesn't exist"**: Run the SQL setup script first

### **Testing:**

1. **Test login endpoint** with Postman or curl
2. **Check Supabase logs** for any errors
3. **Verify environment variables** in Vercel

## 🎉 **Next Steps:**

Once this is set up:
1. **Your app will connect to Supabase** instead of local backend
2. **Users can log in and create accounts**
3. **Draft functionality will work** with real-time updates
4. **Data will persist** across sessions

**Let me know when you've completed these steps and we can test the full functionality!**
