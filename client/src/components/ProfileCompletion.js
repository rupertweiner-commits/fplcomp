import React, { useState, useEffect, useCallback } from 'react';
import { User, Mail, AlertCircle, Camera, CheckCircle, Save } from 'lucide-react';
import { supabase } from '../config/supabase';
import ProfilePictureUpload from './ProfilePictureUpload';

const ProfileCompletion = ({ currentUser, onProfileComplete }) => {
  const [profile, setProfile] = useState({
    email: '',
    firstName: '',
    lastName: '',
    profilePicture: null,
    notificationPreferences: {
      deadlineReminders: true,
      deadlineSummaries: true,
      transferNotifications: true,
      chipNotifications: true,
      liveScoreUpdates: false,
      weeklyReports: true,
      emailNotifications: true,
      pushNotifications: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPictureUpload, setShowPictureUpload] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const fetchProfile = useCallback(async() => {
    try {
      // Use Supabase to fetch user profile
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error('Failed to fetch profile:', error);
        return;
      }

      if (userProfile) {
        setProfile({
          email: userProfile.email || '',
          firstName: userProfile.first_name || '',
          lastName: userProfile.last_name || '',
          profilePicture: userProfile.profile_picture || null,
          notificationPreferences: {
            deadlineReminders: true,
            deadlineSummaries: true,
            transferNotifications: true,
            chipNotifications: true,
            liveScoreUpdates: false,
            weeklyReports: true,
            emailNotifications: true,
            pushNotifications: true
          }
        });
        checkCompletion(userProfile);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (currentUser) {
      fetchProfile();
    }
  }, [currentUser, fetchProfile]);

  // Check completion whenever profile state changes
  useEffect(() => {
    checkCompletion(profile);
  }, [profile]);

  const checkCompletion = (userProfile) => {
    const required = ['email', 'firstName', 'lastName']; // Removed profilePicture as it's optional
    const isProfileComplete = required.every(field => {
      return userProfile[field] && userProfile[field].trim() !== '';
    });

    setIsComplete(isProfileComplete);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!profile.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!profile.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!profile.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // Profile picture is optional - no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleProfilePictureUpdate = (pictureUrl) => {
    setProfile(prev => ({ ...prev, profilePicture: pictureUrl }));
    if (errors.profilePicture) {
      setErrors(prev => ({ ...prev, profilePicture: '' }));
    }
    setShowPictureUpload(false);
  };

  const handleNotificationPreferenceChange = (key, value) => {
    setProfile(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [key]: value
      }
    }));
  };

  const handleSubmit = async(e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    // Debug logging
    const formData = {
      email: profile.email.trim(),
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      profilePicture: profile.profilePicture,
      notificationPreferences: profile.notificationPreferences
    };

    console.log('🔍 Submitting profile data:');
    console.log('  - Form data:', formData);
    console.log('  - Email value:', JSON.stringify(formData.email));
    console.log('  - Email type:', typeof formData.email);
    console.log('  - Email length:', formData.email.length);

    try {
      // Update profile in Supabase
      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          profile_picture: formData.profilePicture,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Profile update failed:', error);
        setErrors({ submit: error.message });
        return;
      }

      console.log('✅ Profile update successful');

      // Update the current user with new profile data
      const updatedUser = {
        ...currentUser,
        ...formData,
        profileComplete: true
      };

      // Store in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(updatedUser));

      onProfileComplete(updatedUser);
    } catch (error) {
      console.error('❌ Profile update failed:', error);
      setErrors({ submit: 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const getCompletionPercentage = () => {
    const fields = ['email', 'firstName', 'lastName']; // Removed profilePicture as it's optional
    const completed = fields.filter(field => {
      return profile[field] && profile[field].trim() !== '';
    }).length;

    return Math.round((completed / fields.length) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600">
            Welcome to KPG's Annual Chelsea Competition! Please complete your profile to continue.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Profile Completion</span>
            <span>
              {getCompletionPercentage()}
              %
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${getCompletionPercentage()}%` }}
            />
          </div>
        </div>


        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline w-4 h-4 mr-2" />
              Email Address *
            </label>
            <input
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email address"
              type="email"
              value={profile.email}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter your first name"
                type="text"
                value={profile.firstName}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.firstName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter your last name"
                type="text"
                value={profile.lastName}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>


          {/* Profile Picture */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Camera className="inline w-4 h-4 mr-2" />
              Profile Picture (Optional)
            </label>

            <div className="text-center">
              {profile.profilePicture ? (
                <div className="relative inline-block">
                  <img
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-green-200"
                    src={profile.profilePicture}
                  />
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-2">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mx-auto border-4 border-dashed border-gray-300">
                  <Camera className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>

            <div className="text-center mt-4">
              <button
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => setShowPictureUpload(true)}
                type="button"
              >
                <Camera className="w-5 h-5 mr-2" />
                {profile.profilePicture ? 'Change Picture' : 'Upload Picture'}
              </button>
            </div>

            {errors.profilePicture && (
              <p className="mt-2 text-sm text-red-600 text-center flex items-center justify-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.profilePicture}
              </p>
            )}
          </div>

          {/* Notification Preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              🔔 Notification Preferences
            </label>

            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Deadline Notifications */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800 text-sm">⏰ Deadline Notifications</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input
                        checked={profile.notificationPreferences.deadlineReminders}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        onChange={(e) => handleNotificationPreferenceChange('deadlineReminders', e.target.checked)}
                        type="checkbox"
                      />
                      <span className="text-sm text-gray-700">Deadline reminders (24h & 1h before)</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        checked={profile.notificationPreferences.deadlineSummaries}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        onChange={(e) => handleNotificationPreferenceChange('deadlineSummaries', e.target.checked)}
                        type="checkbox"
                      />
                      <span className="text-sm text-gray-700">Post-deadline summaries</span>
                    </label>
                  </div>
                </div>

                {/* Game Notifications */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800 text-sm">⚽ Game Notifications</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input
                        checked={profile.notificationPreferences.transferNotifications}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        onChange={(e) => handleNotificationPreferenceChange('transferNotifications', e.target.checked)}
                        type="checkbox"
                      />
                      <span className="text-sm text-gray-700">Transfer confirmations</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        checked={profile.notificationPreferences.chipNotifications}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        onChange={(e) => handleNotificationPreferenceChange('chipNotifications', e.target.checked)}
                        type="checkbox"
                      />
                      <span className="text-sm text-gray-700">Chip usage alerts</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        checked={profile.notificationPreferences.liveScoreUpdates}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        onChange={(e) => handleNotificationPreferenceChange('liveScoreUpdates', e.target.checked)}
                        type="checkbox"
                      />
                      <span className="text-sm text-gray-700">Live score updates</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Weekly Reports */}
              <div className="pt-3 border-t border-gray-200">
                <label className="flex items-center space-x-3">
                  <input
                    checked={profile.notificationPreferences.weeklyReports}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    onChange={(e) => handleNotificationPreferenceChange('weeklyReports', e.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-sm text-gray-700">Weekly performance reports</span>
                </label>
              </div>

              {/* Delivery Methods */}
              <div className="pt-3 border-t border-gray-200">
                <h4 className="font-medium text-gray-800 text-sm mb-2">📱 Delivery Methods</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3">
                    <input
                      checked={profile.notificationPreferences.emailNotifications}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      onChange={(e) => handleNotificationPreferenceChange('emailNotifications', e.target.checked)}
                      type="checkbox"
                    />
                    <span className="text-sm text-gray-700">Email notifications</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      checked={profile.notificationPreferences.pushNotifications}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      onChange={(e) => handleNotificationPreferenceChange('pushNotifications', e.target.checked)}
                      type="checkbox"
                    />
                    <span className="text-sm text-gray-700">Push notifications</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {errors.submit}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            className={`w-full py-4 px-6 rounded-lg font-medium transition-all duration-200 ${
              isComplete && !loading ?
                'bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700 transform hover:scale-105' :
                'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={loading || !isComplete}
            type="submit"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Completing Profile...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Save className="w-5 h-5 mr-2" />
                Complete Profile & Continue
              </div>
            )}
          </button>
        </form>

        {/* Profile Picture Upload Modal */}
        {showPictureUpload && (
          <ProfilePictureUpload
            currentPicture={profile.profilePicture}
            onClose={() => setShowPictureUpload(false)}
            onPictureUpdate={handleProfilePictureUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default ProfileCompletion;
