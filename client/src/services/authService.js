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

  // Check if user has a valid session (localStorage-first approach)
  async checkSession() {
    try {
      console.log('🔍 Checking session (localStorage-first approach)...');

      // First, try to restore from localStorage
      const storedUser = localStorage.getItem(this.userKey);
      const storedToken = localStorage.getItem(this.tokenKey);

      if (storedUser && storedToken) {
        console.log('📦 Found stored user data, restoring...');

        try {
          this.user = JSON.parse(storedUser);
          this.token = storedToken;

          console.log('✅ Restored user from localStorage:', this.user.email);

          // Validate session in background (don't wait for it)
          this.validateSessionInBackground();

          return true;
        } catch (error) {
          console.error('❌ Error parsing stored user:', error);
          // Clear invalid data
          localStorage.removeItem(this.userKey);
          localStorage.removeItem(this.tokenKey);
        }
      }

      // No stored data, try Supabase with short timeout
      console.log('🔄 No stored data, trying Supabase session...');
      return await this.trySupabaseSession();
    } catch (error) {
      console.error('❌ Session check error:', error);
      return false;
    }
  }

  // Try to get Supabase session without timeout
  async trySupabaseSession() {
    try {
      console.log('🔄 Checking Supabase session...');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ Supabase session error:', error);
        return false;
      }

      if (!session) {
        console.log('⚠️ No Supabase session found');
        return false;
      }

      // Session exists, create user object
      console.log('✅ Supabase session found, creating user object...');
      this.user = {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.user_metadata?.first_name || '',
        lastName: session.user.user_metadata?.last_name || '',
        isAdmin: false, // Will be updated when profile is fetched
        profileComplete: false
      };
      this.token = session.access_token;

      // Store the user data
      localStorage.setItem(this.userKey, JSON.stringify(this.user));
      localStorage.setItem(this.tokenKey, session.access_token);

      // Try to fetch profile in background
      this.fetchUserProfileInBackground(session.user.id);

      return true;
    } catch (error) {
      console.error('❌ Supabase session check failed:', error);
      return false;
    }
  }

  // Validate session in background (non-blocking)
  async validateSessionInBackground() {
    try {
      console.log('🔄 Validating session in background...');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.log('⚠️ Background validation failed, session may be invalid');
        return;
      }

      // Update token if it changed
      if (session.access_token !== this.token) {
        this.token = session.access_token;
        localStorage.setItem(this.tokenKey, session.access_token);
        console.log('🔄 Updated token from background validation');
      }

      console.log('✅ Background session validation successful');
    } catch (error) {
      console.log('⚠️ Background validation error (non-critical):', error);
    }
  }

  // Fetch user profile in background (non-blocking)
  async fetchUserProfileInBackground(userId) {
    try {
      console.log('🔄 Fetching user profile in background...');
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && userProfile) {
        // Update user object with profile data
        this.user = {
          ...this.user,
          firstName: userProfile.first_name || '',
          lastName: userProfile.last_name || '',
          isAdmin: userProfile.is_admin || false,
          profileComplete: !!(userProfile.first_name && userProfile.last_name)
        };

        // Update stored data
        localStorage.setItem(this.userKey, JSON.stringify(this.user));
        console.log('✅ User profile updated in background:', this.user.email);
      } else {
        console.log('⚠️ Background profile fetch failed (non-critical):', error);
      }
    } catch (error) {
      console.log('⚠️ Background profile fetch error (non-critical):', error);
    }
  }


  // Initialize auth state on app start
  async initialize() {
    return await this.checkSession();
  }
}

export const authService = new AuthService();
