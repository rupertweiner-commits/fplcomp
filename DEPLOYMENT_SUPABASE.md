# 🚀 **SUPABASE DEPLOYMENT GUIDE**

## **Overview**
This guide will help you deploy your FPL Live Tracker application to Supabase, providing a production-ready PostgreSQL database with authentication, real-time subscriptions, and automatic backups.

## **Why Supabase?**
- ✅ **Free Tier**: 500MB database, 50MB file storage, 2GB bandwidth
- ✅ **PostgreSQL**: Full SQL database with real-time subscriptions
- ✅ **Authentication**: Built-in user management with JWT
- ✅ **Row Level Security**: Multi-tenant data protection
- ✅ **Real-time**: WebSocket-like subscriptions for live updates
- ✅ **Backups**: Automatic daily backups
- ✅ **Edge Functions**: Serverless functions for complex logic

## **Step 1: Create Supabase Project**

### **1.1 Sign Up**
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub or create account

### **1.2 Create Project**
1. Click "New Project"
2. Choose organization
3. Enter project details:
   - **Name**: `fpl-live-tracker`
   - **Database Password**: Generate strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for setup (2-3 minutes)

### **1.3 Get Connection Details**
1. Go to **Settings** → **Database**
2. Copy the connection string
3. Save these details:
   ```
   Host: db.xxxxxxxxxxxxx.supabase.co
   Database: postgres
   Port: 5432
   User: postgres
   Password: [your-password]
   ```

## **Step 2: Set Up Database Schema**

### **2.1 SQL Editor**
1. Go to **SQL Editor** in Supabase dashboard
2. Click "New Query"
3. Copy and paste the entire content of `database/schema.sql`
4. Click "Run" to execute

### **2.2 Verify Tables**
1. Go to **Table Editor**
2. Verify these tables exist:
   - `users`
   - `draft_data`
   - `user_teams`
   - `drafted_players`
   - `transfers`
   - `chip_usage`
   - `simulation_history`
   - `user_activity`
   - `user_sessions`
   - `push_subscriptions`
   - `draft_queue`

## **Step 3: Configure Environment Variables**

### **3.1 Create .env.production**
```bash
# Database
DATABASE_URL=postgresql://postgres:[password]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRES_IN=24h

# Security
NODE_ENV=production
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Uploads
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads/

# Logging
LOG_LEVEL=info
```

### **3.2 Get Supabase Keys**
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

## **Step 4: Install Dependencies**

### **4.1 Add PostgreSQL Client**
```bash
npm install pg
```

### **4.2 Update package.json**
```json
{
  "dependencies": {
    "pg": "^8.11.3"
  }
}
```

## **Step 5: Run Data Migration**

### **5.1 Install Dependencies**
```bash
npm install
```

### **5.2 Run Migration**
```bash
node database/migrate.js
```

**Expected Output:**
```
🚀 Starting data migration from local files to PostgreSQL...
✅ Database connection established
✅ Current draft data loaded from file
📊 Migrating users...
  ✅ User migrated: Portia (ID: 1)
  ✅ User migrated: Yasmin (ID: 2)
  ✅ User migrated: Rupert (ID: 3)
  ✅ User migrated: Will (ID: 4)
📊 Migrating draft data...
  ✅ Draft data migrated
📊 Migrating drafted players...
  ✅ Drafted players migrated: 0 players
📊 Migrating transfers...
  ✅ Transfers migrated: 0 transfers
📊 Migrating simulation history...
  ✅ Simulation history migrated: 0 gameweeks
✅ Data migration completed successfully!
💾 Original data backed up to: data/draft_backup_2024-01-15T10-30-00-000Z.json
```

## **Step 6: Test Database Connection**

### **6.1 Health Check**
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "services": {
    "database": "operational",
    "fpl": "operational",
    "liveUpdates": "operational",
    "websocket": "operational"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.456,
  "note": "Service running with full functionality"
}
```

### **6.2 Test User Authentication**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Rupert","password":"pass3"}'
```

## **Step 7: Configure Row Level Security**

### **7.1 Enable RLS Policies**
The schema.sql already includes RLS policies, but verify they're active:

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Enable RLS if needed
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
```

### **7.2 Test RLS**
```sql
-- Test as different users
-- This should only show Rupert's data
SELECT * FROM users WHERE id = 3;

-- This should fail for non-admin users
SELECT * FROM user_activity;
```

## **Step 8: Set Up Authentication**

### **8.1 Configure Auth Settings**
1. Go to **Authentication** → **Settings**
2. Configure:
   - **Site URL**: Your production domain
   - **Redirect URLs**: Add your frontend URLs
   - **JWT Expiry**: 24 hours (86400 seconds)

### **8.2 Email Templates**
1. Go to **Authentication** → **Email Templates**
2. Customize:
   - **Confirm signup**
   - **Reset password**
   - **Change email**

## **Step 9: Configure Storage**

### **9.1 Create Storage Bucket**
1. Go to **Storage**
2. Click "New Bucket"
3. Create bucket:
   - **Name**: `profile-pictures`
   - **Public**: Yes (for profile pictures)
   - **File size limit**: 5MB

### **9.2 Storage Policies**
```sql
-- Allow users to upload their own profile pictures
CREATE POLICY "Users can upload own profile pictures" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-pictures' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view profile pictures
CREATE POLICY "Anyone can view profile pictures" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-pictures');

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update own profile pictures" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-pictures' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## **Step 10: Real-time Subscriptions**

### **10.1 Enable Realtime**
1. Go to **Database** → **Replication**
2. Enable realtime for:
   - `user_teams`
   - `draft_data`
   - `user_activity`
   - `draft_queue`

### **10.2 Test Real-time**
```javascript
// In your frontend
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Subscribe to draft updates
const subscription = supabase
  .channel('draft_updates')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'draft_data' },
    (payload) => {
      console.log('Draft updated:', payload)
      // Update your UI
    }
  )
  .subscribe()
```

## **Step 11: Monitoring & Backups**

### **11.1 Database Monitoring**
1. Go to **Database** → **Logs**
2. Monitor:
   - Slow queries
   - Connection errors
   - Performance metrics

### **11.2 Automatic Backups**
- **Daily backups**: Automatic at 2 AM UTC
- **Retention**: 7 days
- **Manual backup**: Available in dashboard

### **11.3 Performance Insights**
1. Go to **Database** → **Reports**
2. Monitor:
   - Query performance
   - Index usage
   - Connection pool status

## **Step 12: Production Deployment**

### **12.1 Update Server Configuration**
```javascript
// In server.js
import { databaseService } from './services/databaseService.js';

// Initialize database
await databaseService.connect();

// Health check includes database
app.get('/health', async (req, res) => {
  const dbHealthy = await databaseService.healthCheck();
  
  res.json({
    status: dbHealthy ? 'healthy' : 'degraded',
    services: {
      database: dbHealthy ? 'operational' : 'down',
      fpl: 'operational',
      liveUpdates: 'operational'
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### **12.2 Environment Variables**
Ensure all environment variables are set in your production environment.

### **12.3 SSL Configuration**
Supabase automatically provides SSL. Your connection string should include `?sslmode=require`.

## **Troubleshooting**

### **Common Issues**

#### **1. Connection Refused**
```bash
# Check if DATABASE_URL is correct
echo $DATABASE_URL

# Test connection manually
psql "postgresql://postgres:[password]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres"
```

#### **2. Authentication Errors**
```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# Check Supabase keys
echo $SUPABASE_ANON_KEY
```

#### **3. RLS Policy Issues**
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

#### **4. Performance Issues**
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### **Support Resources**
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Discord](https://discord.supabase.com)

## **Next Steps**

After successful Supabase deployment:

1. **Test all functionality** with the new database
2. **Monitor performance** and optimize queries
3. **Set up alerts** for database issues
4. **Configure backup verification**
5. **Plan scaling strategy** for when you exceed free tier

## **Cost Estimation**

### **Free Tier (Current)**
- Database: 500MB
- File Storage: 50MB
- Bandwidth: 2GB/month
- **Cost: $0/month**

### **Pro Tier (When needed)**
- Database: 8GB
- File Storage: 100GB
- Bandwidth: 250GB/month
- **Cost: $25/month**

### **Team Tier (For multiple apps)**
- Database: 100GB
- File Storage: 1TB
- Bandwidth: 2TB/month
- **Cost: $599/month**

---

**🎉 Congratulations! Your FPL Live Tracker now has a production-ready database with enterprise-grade security, real-time capabilities, and automatic backups.**

