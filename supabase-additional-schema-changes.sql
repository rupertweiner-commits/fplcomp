-- Additional Supabase Schema Changes Needed
-- Run this in Supabase SQL Editor to support the new features

-- Step 1: Check current database structure
SELECT 
  'Current tables:' as info,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Step 2: Create user_activity table for activity tracking
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for user_activity
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_action_type ON public.user_activity(action_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at);

-- Step 4: Enable RLS on user_activity
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for user_activity
CREATE POLICY "Users can view own activity" ON public.user_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON public.user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity" ON public.user_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Step 6: Create draft_queue table for draft management
CREATE TABLE IF NOT EXISTS public.draft_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused', 'completed')),
  current_round INTEGER DEFAULT 1,
  current_turn_user_id UUID REFERENCES public.users(id),
  time_per_turn INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Enable RLS on draft_queue
ALTER TABLE public.draft_queue ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for draft_queue
CREATE POLICY "Everyone can view draft queue" ON public.draft_queue
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage draft queue" ON public.draft_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Step 9: Create draft_picks table for tracking picks
CREATE TABLE IF NOT EXISTS public.draft_picks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  draft_queue_id UUID REFERENCES public.draft_queue(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL,
  pick_number INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(draft_queue_id, pick_number),
  UNIQUE(draft_queue_id, player_id)
);

-- Step 10: Enable RLS on draft_picks
ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies for draft_picks
CREATE POLICY "Everyone can view draft picks" ON public.draft_picks
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own picks" ON public.draft_picks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 12: Create a function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_action_type VARCHAR(50),
  p_action_data JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.user_activity (
    user_id,
    action_type,
    action_data,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_action_type,
    p_action_data,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Create a function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  action_type VARCHAR(50),
  total_count BIGINT,
  last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.action_type,
    COUNT(*) as total_count,
    MAX(ua.created_at) as last_activity
  FROM public.user_activity ua
  WHERE ua.user_id = p_user_id
    AND ua.created_at >= NOW() - INTERVAL '1 day' * p_days
  GROUP BY ua.action_type
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Create a function to get recent user activity
CREATE OR REPLACE FUNCTION get_recent_user_activity(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  action_type VARCHAR(50),
  action_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.id,
    ua.action_type,
    ua.action_data,
    ua.created_at
  FROM public.user_activity ua
  WHERE ua.user_id = p_user_id
  ORDER BY ua.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Verify the new tables and functions
SELECT 
  'New tables created:' as info,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_activity', 'draft_queue', 'draft_picks')
ORDER BY table_name;

SELECT 
  'New functions created:' as info,
  routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('log_user_activity', 'get_user_activity_summary', 'get_recent_user_activity')
ORDER BY routine_name;
