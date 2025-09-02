import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { userId } = req.query;
  const { method } = req;

  if (method === 'GET') {
    try {
      // Get user profile from Supabase
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email || '',
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          phone: user.phone || '',
          profilePicture: user.profile_picture || '',
          notificationPreferences: user.notification_preferences || {
            deadlineReminders: true,
            deadlineSummaries: true,
            transferNotifications: true,
            chipNotifications: true,
            liveScoreUpdates: false,
            weeklyReports: true,
            emailNotifications: true,
            pushNotifications: true
          },
          isAdmin: user.is_admin || false,
          createdAt: user.created_at || new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile'
      });
    }
  } else if (method === 'PUT') {
    try {
      const { email, firstName, lastName, phone, profilePicture, notificationPreferences } = req.body;

      // Validate required fields
      if (!email || !firstName || !lastName || !profilePicture) {
        return res.status(400).json({
          success: false,
          error: 'Email, first name, last name, and profile picture are required'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }

      // Update user profile in Supabase
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone ? phone.trim() : '',
          profile_picture: profilePicture.trim(),
          notification_preferences: notificationPreferences || {
            deadlineReminders: true,
            deadlineSummaries: true,
            transferNotifications: true,
            chipNotifications: true,
            liveScoreUpdates: false,
            weeklyReports: true,
            emailNotifications: true,
            pushNotifications: true
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update user profile'
        });
      }

      res.json({
        success: true,
        data: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          phone: updatedUser.phone,
          profilePicture: updatedUser.profile_picture,
          notificationPreferences: updatedUser.notification_preferences,
          isAdmin: updatedUser.is_admin,
          createdAt: updatedUser.created_at
        },
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user profile'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}




