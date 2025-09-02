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
    const { username, email } = req.body;

    // Validate required fields
    if (!username || !email) {
      return res.status(400).json({
        success: false,
        error: 'Username and email are required'
      });
    }

    // Update user email
    const { data: user, error } = await supabase
      .from('users')
      .update({ email: email })
      .eq('username', username)
      .select()
      .single();

    if (error) {
      console.error('Error updating user email:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update user email: ' + error.message
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user },
      message: 'User email updated successfully'
    });

  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
