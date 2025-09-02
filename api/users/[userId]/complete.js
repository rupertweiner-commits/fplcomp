import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { userId } = req.query;
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    // Get user profile from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('email, first_name, last_name, profile_picture')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if profile is complete
    const required = ['email', 'first_name', 'last_name', 'profile_picture'];
    const isComplete = required.every(field => {
      if (field === 'profile_picture') {
        return user[field] && user[field].trim() !== '';
      }
      return user[field] && user[field].trim() !== '';
    });

    res.json({
      success: true,
      data: {
        isComplete,
        completedFields: required.filter(field => {
          if (field === 'profile_picture') {
            return user[field] && user[field].trim() !== '';
          }
          return user[field] && user[field].trim() !== '';
        }),
        missingFields: required.filter(field => {
          if (field === 'profile_picture') {
            return !user[field] || user[field].trim() === '';
          }
          return !user[field] || user[field].trim() === '';
        })
      }
    });
  } catch (error) {
    console.error('Error checking user completion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check user completion'
    });
  }
}

