import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ForgotPassword = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('request'); // 'request', 'reset', 'success'

  const handleRequestReset = async(e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Use Supabase's built-in password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({
          type: 'success',
          text: 'Password reset email sent! Please check your email and click the link to reset your password.'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to send password reset email. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async(e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Password updated successfully!' });
        setStep('success');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to reset password'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderRequestForm = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Forgot your password?</h2>
        <p className="text-gray-600 mt-2">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleRequestReset}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
            Email address
          </label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            type="email"
            value={email}
          />
        </div>

        <button
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          disabled={isLoading || !email}
          type="submit"
        >
          {isLoading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </div>
  );

  const renderResetForm = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Reset your password</h2>
        <p className="text-gray-600 mt-2">
          Enter your new password below.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleResetPassword}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newPassword">
            New password
          </label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            id="newPassword"
            minLength={8}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min 8 characters)"
            required
            type="password"
            value={newPassword}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
            Confirm new password
          </label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            id="confirmPassword"
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            type="password"
            value={confirmPassword}
          />
        </div>

        <button
          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          disabled={isLoading || !newPassword || !confirmPassword}
          type="submit"
        >
          {isLoading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
        <CheckCircle className="h-6 w-6 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Password reset successfully!</h2>
      <p className="text-gray-600">
        Your password has been reset. You can now log in with your new password.
      </p>
      <button
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        onClick={onBackToLogin}
      >
        Back to login
      </button>
    </div>
  );

  const renderMessage = () => {
    if (!message.text) return null;

    const bgColor = message.type === 'success' ? 'bg-green-50' : 'bg-red-50';
    const textColor = message.type === 'success' ? 'text-green-800' : 'text-red-800';
    const iconColor = message.type === 'success' ? 'text-green-400' : 'text-red-400';

    return (
      <div className={`rounded-lg p-4 ${bgColor} border border-${message.type === 'success' ? 'green' : 'red'}-200`}>
        <div className="flex items-center">
          <AlertCircle className={`h-5 w-5 ${iconColor} mr-2`} />
          <p className={`text-sm ${textColor}`}>{message.text}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Back button */}
        <button
          className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          onClick={onBackToLogin}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to login
        </button>

        {/* Message */}
        {renderMessage()}

        {/* Content based on step */}
        {step === 'request' && renderRequestForm()}
        {step === 'reset' && renderResetForm()}
        {step === 'success' && renderSuccess()}

        {/* Development info */}
      </div>
    </div>
  );
};

export default ForgotPassword;

