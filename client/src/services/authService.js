import { supabase } from '../config/supabase';

class AuthService {
  constructor() {
    this.tokenKey = 'fpl_auth_token';
    this.userKey = 'fpl_user_data';
    this.token = localStorage.getItem(this.tokenKey);
    this.user = JSON.parse(localStorage.getItem(this.userKey) || 'null');
  }

  async login(email, password) {
    try {
      // Try to login with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      // Get user profile from users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return { success: false, error: 'Login successful but profile not found. Please contact support.' };
      }

      // Create user object for the app
      const user = {
        id: userProfile.id,
        email: userProfile.email,
        firstName: userProfile.first_name || '',
        lastName: userProfile.last_name || '',
        isAdmin: userProfile.is_admin || false,
        profileComplete: !!(userProfile.first_name && userProfile.last_name)
      };

      // Store in localStorage
      this.token = authData.session.access_token;
      this.user = user;
      localStorage.setItem(this.tokenKey, authData.session.access_token);
      localStorage.setItem(this.userKey, JSON.stringify(user));

      return { success: true, user, token: authData.session.access_token };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  }

  async register(email, password, firstName, lastName) {
    try {
      // Check if email already exists
      const { data: existingEmail, error: emailError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single();

      if (existingEmail) {
        return { success: false, error: 'Email already exists' };
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      // Create user record in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          first_name: firstName || '',
          last_name: lastName || '',
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating user record:', userError);
        return { success: false, error: 'Account created but profile setup failed. Please try logging in.' };
      }

      return { 
        success: true, 
        message: 'Account created successfully! Please check your email to verify your account.',
        user: userData
      };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: 'Password updated successfully!' };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  }

  // Username functionality removed - using email-only authentication

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.token = null;
      this.user = null;
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  getCurrentUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  // Check if user has a valid session
  async checkSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        this.logout();
        return false;
      }

      // Update token if session exists
      this.token = session.access_token;
      localStorage.setItem(this.tokenKey, session.access_token);

      // Get user profile if we don't have it
      if (!this.user) {
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!profileError && userProfile) {
          this.user = {
            id: userProfile.id,
            email: userProfile.email,
            firstName: userProfile.first_name || '',
            lastName: userProfile.last_name || '',
            isAdmin: userProfile.is_admin || false,
            profileComplete: !!(userProfile.first_name && userProfile.last_name)
          };
          localStorage.setItem(this.userKey, JSON.stringify(this.user));
        }
      }

      return true;
    } catch (error) {
      console.error('Session check error:', error);
      this.logout();
      return false;
    }
  }

  // Initialize auth state on app start
  async initialize() {
    return await this.checkSession();
  }
}

export const authService = new AuthService();