import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { User, Edit3, Camera, Save, Lock, Activity } from 'lucide-react';
import UserActivity from './UserActivity.js';
import ProfilePictureUpload from './ProfilePictureUpload.js';
const ProfileManager = ({ userId, onProfileUpdate }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPictureUpload, setShowPictureUpload] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [usernameForm, setUsernameForm] = useState({
    currentPassword: '',
    newUsername: ''
  });
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [initialPasswordForm, setInitialPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showInitialPasswordForm, setShowInitialPasswordForm] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to fetch profile'
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId, fetchProfile]);

  const handleProfileUpdate = async (updates) => {
    try {
      setLoading(true);
      
      // Add updated_at timestamp
      const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .update(updatesWithTimestamp)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }

      setMessage({
        type: 'success',
        text: 'Profile updated successfully!'
      });
      setEditing(false);
      await fetchProfile();
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to update profile'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'New passwords do not match'
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({
        type: 'error',
        text: 'New password must be at least 6 characters long'
      });
      return;
    }

    try {
      setLoading(true);
      // Update password using Supabase auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) {
        throw updateError;
      }

      const response = { data: { success: true, message: 'Password updated successfully!' } };

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'Password changed successfully!'
        });
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordForm(false);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to change password'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = async (e) => {
    e.preventDefault();
    
    if (usernameForm.newUsername.length < 3) {
      setMessage({
        type: 'error',
        text: 'Username must be at least 3 characters long'
      });
      return;
    }

    if (usernameForm.newUsername.length > 20) {
      setMessage({
        type: 'error',
        text: 'Username must be less than 20 characters long'
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(usernameForm.newUsername)) {
      setMessage({
        type: 'error',
        text: 'Username can only contain letters, numbers, and underscores'
      });
      return;
    }

    try {
      setLoading(true);
      // Update username in the users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          username: usernameForm.newUsername,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      const response = { data: { success: true, message: 'Username updated successfully!' } };

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'Username changed successfully!'
        });
        setUsernameForm({
          currentPassword: '',
          newUsername: ''
        });
        setShowUsernameForm(false);
        await fetchProfile(); // Refresh profile to show new username
        if (onProfileUpdate) {
          onProfileUpdate();
        }
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to change username'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitialPasswordSet = async (e) => {
    e.preventDefault();
    
    if (initialPasswordForm.newPassword !== initialPasswordForm.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Passwords do not match'
      });
      return;
    }

    if (initialPasswordForm.newPassword.length < 6) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 6 characters long'
      });
      return;
    }

    try {
      setLoading(true);
      // Set initial password using Supabase auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: initialPasswordForm.newPassword
      });

      if (updateError) {
        throw updateError;
      }

      const response = { data: { success: true, message: 'Password set successfully!' } };

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'Initial password set successfully!'
        });
        setInitialPasswordForm({
          newPassword: '',
          confirmPassword: ''
        });
        setShowInitialPasswordForm(false);
        await fetchProfile(); // Refresh profile
        if (onProfileUpdate) {
          onProfileUpdate();
        }
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to set initial password'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpdate = (newPicturePath) => {
    setProfile(prev => ({
      ...prev,
      profilePicture: newPicturePath
    }));
    setMessage({
      type: 'success',
      text: 'Profile picture updated successfully!'
    });
    if (onProfileUpdate) {
      onProfileUpdate();
    }
  };

  const handleSaveProfile = () => {
    try {
      const updates = {};
      const form = document.getElementById('profile-form');
      
      if (!form) {
        console.error('Profile form not found');
        return;
      }
      
      const formData = new FormData(form);

      for (const [key, value] of formData.entries()) {
        if (value && typeof value === 'string' && value.trim()) {
          updates[key] = value.trim();
        }
      }

      if (Object.keys(updates).length > 0) {
        handleProfileUpdate(updates);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save profile. Please try again.'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <User className="mr-2 h-6 w-6" />
          Profile Management
        </h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Picture Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Profile Picture</h3>
          
          <div className="text-center">
            {profile.profilePicture ? (
              <div className="relative inline-block">
                <img
                  src={profile.profilePicture}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
                <button
                  onClick={() => setShowPictureUpload(true)}
                  className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 transition-colors"
                  title="Update profile picture"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mx-auto">
                <User className="h-16 w-16 text-gray-400" />
              </div>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowPictureUpload(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Camera className="mr-2 h-4 w-4" />
              {profile.profilePicture ? 'Update Picture' : 'Add Picture'}
            </button>
          </div>
        </div>

        {/* Profile Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Profile Information</h3>
          
          <form id="profile-form" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={profile.username}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                name="displayName"
                defaultValue={profile.displayName}
                disabled={!editing}
                className={`w-full px-3 py-2 border rounded-lg ${
                  editing 
                    ? 'border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                    : 'border-gray-300 bg-gray-50'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                defaultValue={profile.email || ''}
                disabled={!editing}
                className={`w-full px-3 py-2 border rounded-lg ${
                  editing 
                    ? 'border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                    : 'border-gray-300 bg-gray-50'
                }`}
              />
            </div>

            {editing && (
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center">
            <Lock className="mr-2 h-5 w-5" />
            Change Password
          </h3>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPasswordForm && (
          <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({
                  ...passwordForm,
                  currentPassword: e.target.value
                })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({
                  ...passwordForm,
                  newPassword: e.target.value
                })}
                required
                minLength="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({
                  ...passwordForm,
                  confirmPassword: e.target.value
                })}
                required
                minLength="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Username Change Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center">
            <User className="mr-2 h-5 w-5" />
            Change Username
          </h3>
          <button
            onClick={() => setShowUsernameForm(!showUsernameForm)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {showUsernameForm ? 'Cancel' : 'Change Username'}
          </button>
        </div>

        {showUsernameForm && (
          <form onSubmit={handleUsernameChange} className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={usernameForm.currentPassword}
                onChange={(e) => setUsernameForm({
                  ...usernameForm,
                  currentPassword: e.target.value
                })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Username
              </label>
              <input
                type="text"
                value={usernameForm.newUsername}
                onChange={(e) => setUsernameForm({
                  ...usernameForm,
                  newUsername: e.target.value
                })}
                required
                minLength="3"
                maxLength="20"
                pattern="[a-zA-Z0-9_]+"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Username must be 3-20 characters long and can only contain letters, numbers, and underscores.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Change Username
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Initial Password Section - Only show if user has no password */}
      {profile && !profile.passwordUpdatedAt && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              Set Initial Password
            </h3>
            <button
              onClick={() => setShowInitialPasswordForm(!showInitialPasswordForm)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {showInitialPasswordForm ? 'Cancel' : 'Set Password'}
            </button>
          </div>

          {showInitialPasswordForm && (
            <form onSubmit={handleInitialPasswordSet} className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={initialPasswordForm.newPassword}
                  onChange={(e) => setInitialPasswordForm({
                    ...initialPasswordForm,
                    newPassword: e.target.value
                  })}
                  required
                  minLength="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={initialPasswordForm.confirmPassword}
                  onChange={(e) => setInitialPasswordForm({
                    ...initialPasswordForm,
                    confirmPassword: e.target.value
                  })}
                  required
                  minLength="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Set Initial Password
                  </>
                )}
              </button>
            </form>
          )}
                </div>
      )}
      
      {/* Profile Picture Upload Modal */}
      {showPictureUpload && (
        <ProfilePictureUpload
          userId={userId}
          currentPicture={profile?.profilePicture}
          onPictureUpdate={handleProfilePictureUpdate}
          onClose={() => setShowPictureUpload(false)}
        />
      )}
      
      {/* User Activity Section - Admin Only */}
      {profile && profile.isAdmin && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              User Activity Logs
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              View detailed activity logs for all users (Admin only)
            </p>
          </div>
          
          <UserActivity userId={userId} isAdmin={true} />
        </div>
      )}
      
      {/* Stats Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Account Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{profile.teamSize}</div>
            <div className="text-sm text-blue-800">Players</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{profile.totalPoints}</div>
            <div className="text-sm text-green-800">Total Points</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{profile.chipsCount}</div>
            <div className="text-sm text-purple-800">Available Chips</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">{profile.usedChipsCount}</div>
            <div className="text-sm text-orange-800">Used Chips</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileManager;
