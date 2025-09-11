-- Fix user_profiles table structure and ensure it exists
-- Run this in Supabase SQL Editor to resolve login issues

-- Step 1: Check if user_profiles table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') 
    THEN 'user_profiles table EXISTS'
    ELSE 'user_profiles table MISSING'
  END as table_status;

-- Step 2: Drop and recreate user_profiles table with correct structure
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Step 3: Create user_profiles table with correct structure
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    profile_picture TEXT,
    notification_preferences JSONB DEFAULT '{
        "deadlineReminders": true,
        "deadlineSummaries": true,
        "transferNotifications": true,
        "chipNotifications": true,
        "liveScoreUpdates": false,
        "weeklyReports": true,
        "emailNotifications": true,
        "pushNotifications": true
    }',
    is_admin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
CREATE POLICY "Users can read own profile" ON public.user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Anyone can read all profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON public.user_profiles(is_admin);

-- Step 7: Sync existing auth users to user_profiles
INSERT INTO public.user_profiles (
    id,
    email,
    username,
    first_name,
    last_name,
    is_active,
    is_admin,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    true,
    CASE WHEN au.email = 'rupertweiner@gmail.com' THEN true ELSE false END,
    au.created_at,
    NOW()
FROM auth.users au
WHERE au.deleted_at IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    is_admin = EXCLUDED.is_admin,
    updated_at = NOW();

-- Step 8: Verify the fix
SELECT 'user_profiles table created successfully!' as status;
SELECT 
    'Current user_profiles:' as info,
    id,
    email,
    username,
    is_admin,
    is_active
FROM public.user_profiles
ORDER BY created_at DESC;
