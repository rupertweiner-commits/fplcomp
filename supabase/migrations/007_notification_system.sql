-- Create user notification preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    email_draft_updates BOOLEAN NOT NULL DEFAULT true,
    email_gameweek_results BOOLEAN NOT NULL DEFAULT true,
    email_transfer_notifications BOOLEAN NOT NULL DEFAULT true,
    email_weekly_summary BOOLEAN NOT NULL DEFAULT true,
    push_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
    push_draft_updates BOOLEAN NOT NULL DEFAULT false,
    push_gameweek_results BOOLEAN NOT NULL DEFAULT false,
    push_transfer_notifications BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create user push subscriptions table
CREATE TABLE IF NOT EXISTS user_push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) NOT NULL, -- 'email', 'push'
    notification_subtype VARCHAR(50) NOT NULL, -- 'draft_update', 'gameweek_results', etc.
    status VARCHAR(20) NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_notification_preferences
CREATE POLICY "Users can read their own notification preferences" ON user_notification_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences" ON user_notification_preferences
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can read all notification preferences" ON user_notification_preferences
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create RLS policies for user_push_subscriptions
CREATE POLICY "Users can manage their own push subscriptions" ON user_push_subscriptions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can read all push subscriptions" ON user_push_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create RLS policies for notification_logs
CREATE POLICY "Users can read their own notification logs" ON notification_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all notification logs" ON notification_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_user_id ON user_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_endpoint ON user_push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- Create function to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION public.create_notification_preferences_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default notification preferences for new user
  INSERT INTO public.user_notification_preferences (
    user_id,
    email_notifications_enabled,
    email_draft_updates,
    email_gameweek_results,
    email_transfer_notifications,
    email_weekly_summary,
    push_notifications_enabled,
    push_draft_updates,
    push_gameweek_results,
    push_transfer_notifications
  ) VALUES (
    NEW.id,
    true,  -- Email notifications enabled by default
    true,  -- Draft updates enabled
    true,  -- Gameweek results enabled
    true,  -- Transfer notifications enabled
    true,  -- Weekly summary enabled
    false, -- Push notifications disabled by default
    false, -- Push draft updates disabled
    false, -- Push gameweek results disabled
    false  -- Push transfer notifications disabled
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user notification preferences
DROP TRIGGER IF EXISTS on_user_created_notification_preferences ON auth.users;
CREATE TRIGGER on_user_created_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_notification_preferences_for_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_notification_preferences_for_new_user() TO service_role;
