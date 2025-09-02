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
    const { username, email, firstName, lastName } = req.body;

    // Validate required fields
    if (!username || !email) {
      return res.status(400).json({
        success: false,
        error: 'Username and email are required'
      });
    }

    // Generate a UUID for the user
    const userId = crypto.randomUUID();

    // Insert user into user_profiles table
    const { data: user, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        username: username,
        email: email,
        first_name: firstName || null,
        last_name: lastName || null,
        is_admin: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user: ' + error.message
      });
    }

    res.json({
      success: true,
      data: { user },
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
