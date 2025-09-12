import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { User, Edit3, Camera, Save, Lock, Activity } from 'lucide-react';
import UserActivity from './UserActivity.js';
import ProfilePictureUpload from './ProfilePictureUpload.js';

const ProfileManagerClean = ({ userId, onProfileUpdate }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPictureUpload, setShowPictureUpload] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchProfile = useCallback(async() => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
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

  const handleProfileUpdate = async(updates) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        throw error;
      }

      setProfile({ ...profile, ...updates });
      setMessage({
        type: 'success',
        text: 'Profile updated successfully'
      });
      
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

  const handleSaveProfile = async(e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updates = {
      displayName: formData.get('displayName'),
      email: formData.get('email')
    };

    await handleProfileUpdate(updates);
    setEditing(false);
  };

  const handlePasswordChange = async(e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'New passwords do not match'
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) {
        throw error;
      }

      setMessage({
        type: 'success',
        text: 'Password updated successfully'
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to update password'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto"></div>
            </div>
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center py-12">
          <p className="text-gray-600">Profile not found</p>
        </div>
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
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => setEditing(true)}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Message Display */}
      {message.text && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            message.type === 'success' ?
              'bg-green-100 text-green-800 border border-green-200' :
              'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
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
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                  src={profile.profilePicture}
                />
                <button
                  className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 transition-colors"
                  onClick={() => setShowPictureUpload(true)}
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
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => setShowPictureUpload(true)}
            >
              <Camera className="mr-2 h-4 w-4" />
              {profile.profilePicture ? 'Update Picture' : 'Add Picture'}
            </button>
          </div>
        </div>

        {/* Profile Information Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-700">Profile Information</h3>

          {!editing ? (
            // View Mode - Clean display
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Username</label>
                    <div className="text-lg font-medium text-gray-900">{profile.username}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Display Name</label>
                    <div className="text-lg font-medium text-gray-900">{profile.displayName || 'Not set'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    <div className="text-lg font-medium text-gray-900">{profile.email || 'Not set'}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Edit Mode - Form fields
            <form className="space-y-4" id="profile-form" onSubmit={handleSaveProfile}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  disabled
                  name="username"
                  type="text"
                  value={profile.username}
                />
                <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  defaultValue={profile.displayName}
                  name="displayName"
                  type="text"
                  placeholder="Enter your display name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  defaultValue={profile.email || ''}
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  type="submit"
                  disabled={loading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </button>
                <button
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  onClick={() => setEditing(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Password Change Section - Only show when editing */}
      {editing && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center mb-4">
            <Lock className="mr-2 h-5 w-5" />
            Change Password
          </h3>

          <form className="max-w-md space-y-4" onSubmit={handlePasswordChange}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onChange={(e) => setPasswordForm({
                  ...passwordForm,
                  currentPassword: e.target.value
                })}
                required
                type="password"
                value={passwordForm.currentPassword}
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                minLength="6"
                onChange={(e) => setPasswordForm({
                  ...passwordForm,
                  newPassword: e.target.value
                })}
                required
                type="password"
                value={passwordForm.newPassword}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                minLength="6"
                onChange={(e) => setPasswordForm({
                  ...passwordForm,
                  confirmPassword: e.target.value
                })}
                required
                type="password"
                value={passwordForm.confirmPassword}
                placeholder="Confirm new password"
              />
            </div>

            <button
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Profile Picture Upload Modal */}
      {showPictureUpload && (
        <ProfilePictureUpload
          currentPicture={profile.profilePicture}
          onClose={() => setShowPictureUpload(false)}
          onUploadSuccess={(newPictureUrl) => {
            handleProfileUpdate({ profilePicture: newPictureUrl });
            setShowPictureUpload(false);
          }}
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

          <UserActivity isAdmin={true} userId={userId} />
        </div>
      )}
    </div>
  );
};

export default ProfileManagerClean;
