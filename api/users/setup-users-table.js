import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Create users table if it doesn't exist
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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
      `
    });

    if (error) {
      console.error('Error creating users table:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create users table: ' + error.message
      });
    }

    // Insert test users
    const testUsers = [
      {
        username: 'Rupert',
        email: 'rupertweiner@gmail.com',
        first_name: 'Rupert',
        last_name: 'Weiner',
        is_admin: true
      },
      {
        username: 'Portia',
        email: 'portia@example.com',
        first_name: 'Portia',
        last_name: 'Demo',
        is_admin: false
      }
    ];

    const { data: users, error: insertError } = await supabase
      .from('users')
      .upsert(testUsers, { onConflict: 'username' })
      .select();

    if (insertError) {
      console.error('Error inserting test users:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to insert test users: ' + insertError.message
      });
    }

    res.json({
      success: true,
      data: { users },
      message: 'Users table created and test users inserted successfully'
    });

  } catch (error) {
    console.error('Setup users table error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
