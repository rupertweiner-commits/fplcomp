// KPG FPL Competition - Deployed to Vercel (v3 - Force rebuild with timestamp: 2024-08-21 14:30)
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Wifi, WifiOff, Shield, User } from 'lucide-react';

// Import components
import Draft from './components/Draft';
import DraftRefactored from './components/DraftRefactored';
import MobileNavigation from './components/MobileNavigation';
import ProfileManager from './components/ProfileManager';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Import services
import { authService } from './services/authService';
import { supabase } from './config/supabase';
// TEMPORARILY DISABLED - Push notifications causing app to crash
// import { pushNotificationService } from './services/pushNotificationService';

// Import contexts
import { ToastProvider } from './contexts/ToastContext';
import { RefreshProvider } from './contexts/RefreshContext';

// Debug: Log which version is running
console.log('🚀 App version: v24 - Fixed sign in hanging with timeouts - 2024-09-02 23:30');
console.log('🔧 WebSocket should be completely disabled');
console.log('�� Push notifications completely removed');
console.log('🔧 Service Worker completely removed');

// KPG FPL Competition - Deployed to Vercel (v2 - Fixed connection status)
function App() {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connected');
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize authentication on app start
  useEffect(() => {
    const initializeAuth = async() => {
      try {
        console.log('🔐 Initializing authentication...');

        // Small delay to ensure Supabase is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));

        // Always try to initialize with Supabase first to validate session
        console.log('🔄 Starting auth initialization...');
        const isAuthenticated = await authService.initialize();

        console.log('📊 Auth initialization result:', isAuthenticated);

        if (isAuthenticated) {
          const user = authService.getCurrentUser();
          const token = authService.getToken();

          console.log('✅ User authenticated:', user?.email);
          setCurrentUser({
            ...user,
            access_token: token
          });
        } else {
          console.log('❌ No valid session found');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        setCurrentUser(null);
      } finally {
        setIsInitializing(false);
      }
    };

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Auth initialization timeout - forcing app to load');
      setIsInitializing(false);
    }, 3000); // 3 second timeout (localStorage-first should be fast)

    initializeAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async(event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email);

      if (event === 'SIGNED_IN' && session) {
        console.log('🔄 User signed in, fetching profile for:', session.user.email);

        try {
          console.log('🔍 Fetching profile for user ID:', session.user.id);

          // Add timeout to profile fetch
          const profilePromise = supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
          );

          const { data: userProfile, error: profileError } = await Promise.race([
            profilePromise,
            timeoutPromise
          ]);

          console.log('🔍 Profile fetch result:', { userProfile, profileError });

          if (!profileError && userProfile) {
            const user = {
              id: userProfile.id,
              email: userProfile.email,
              firstName: userProfile.first_name || '',
              lastName: userProfile.last_name || '',
              isAdmin: userProfile.is_admin || false,
              profileComplete: !!(userProfile.first_name && userProfile.last_name),
              access_token: authService.getToken()
            };

            setCurrentUser(user);
            console.log('✅ User profile loaded:', user.email, 'isAdmin:', user.isAdmin);
          } else {
            console.warn('⚠️ Profile fetch failed, creating user profile:', profileError?.message);

            // Try to create user profile if it doesn't exist
            try {
              const { data: newUserProfile, error: createError } = await supabase
                .from('user_profiles')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  username: session.user.email.split('@')[0],
                  first_name: session.user.user_metadata?.first_name || '',
                  last_name: session.user.user_metadata?.last_name || '',
                  is_admin: session.user.email === 'rupertweiner@gmail.com',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();

              if (!createError && newUserProfile) {
                const user = {
                  id: newUserProfile.id,
                  email: newUserProfile.email,
                  firstName: newUserProfile.first_name || '',
                  lastName: newUserProfile.last_name || '',
                  isAdmin: newUserProfile.is_admin || false,
                  profileComplete: !!(newUserProfile.first_name && newUserProfile.last_name),
                  access_token: authService.getToken()
                };

                setCurrentUser(user);
                console.log('✅ Created and loaded new user profile:', user.email, 'isAdmin:', user.isAdmin);
              } else {
                console.error('❌ Failed to create user profile:', createError);
                console.error('❌ Create error details:', {
                  code: createError?.code,
                  message: createError?.message,
                  details: createError?.details,
                  hint: createError?.hint
                });
                throw createError;
              }
            } catch (createError) {
              console.error('❌ Failed to create user profile:', createError);
              console.error('❌ Create error details:', {
                code: createError?.code,
                message: createError?.message,
                details: createError?.details,
                hint: createError?.hint
              });
              // Fallback to basic user - if it's the admin email, give admin privileges
              const isAdminEmail = session.user.email === 'rupertweiner@gmail.com';
              const basicUser = {
                id: session.user.id,
                email: session.user.email,
                firstName: isAdminEmail ? 'Rupert' : '',
                lastName: isAdminEmail ? 'Weiner' : '',
                isAdmin: isAdminEmail,
                profileComplete: isAdminEmail, // Admin users are always considered complete
                access_token: session.access_token
              };

              setCurrentUser(basicUser);
              console.log('⚠️ Using fallback user object:', basicUser.email, 'isAdmin:', basicUser.isAdmin);
            }
          }
        } catch (error) {
          console.error('❌ Error fetching profile:', error);
          // Fallback to basic user - if it's the admin email, give admin privileges
          const isAdminEmail = session.user.email === 'rupertweiner@gmail.com';
          const basicUser = {
            id: session.user.id,
            email: session.user.email,
            firstName: isAdminEmail ? 'Rupert' : '',
            lastName: isAdminEmail ? 'Weiner' : '',
            isAdmin: isAdminEmail,
            profileComplete: isAdminEmail, // Admin users are always considered complete
            access_token: session.access_token
          };

          setCurrentUser(basicUser);
          console.log('⚠️ Using fallback user object:', basicUser.email, 'isAdmin:', basicUser.isAdmin);
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        setCurrentUser(null);
        console.log('👋 User signed out');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token refreshed - update stored token
        localStorage.setItem('fpl_auth_token', session.access_token);
        console.log('🔄 Token refreshed');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // For frontend-only deployment, skip WebSocket connection
    // and show connected status based on API availability

    // SERVICE WORKER COMPLETELY REMOVED - No cleanup needed

    const checkApiConnection = async() => {
      try {
        console.log('🔍 Checking API connection...');
        console.log('🔧 WebSocket service should be disabled in this version');

        // Test connection to our Vercel API
        const response = await fetch('/api/fpl?action=bootstrap', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('📡 API response status:', response.status);
        console.log('📡 API response ok:', response.ok);

        if (response.ok) {
          console.log('✅ API connection successful');
          setIsConnected(true);
          setConnectionStatus('Connected');
        } else {
          console.log('❌ API responded with unexpected status:', response.status);
          throw new Error(`API responded with status: ${response.status}`);
        }
      } catch (error) {
        console.error('❌ API connection failed:', error);
        setIsConnected(false);
        setConnectionStatus('API Unavailable');
      }
    };

    // Check connection immediately and then every 30 seconds
    checkApiConnection();
    const interval = setInterval(checkApiConnection, 30000);

    // TEMPORARILY DISABLED - Push notifications causing app to crash
    // pushNotificationService.initialize();

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <RefreshProvider>
        <Router>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Logo and Title */}
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#034694' }}>
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-xl font-bold text-gray-900">KPG's</h1>
                    <p className="text-sm text-gray-500">Annual Chelsea Competition</p>
                  </div>
                  <div className="sm:hidden">
                    <h1 className="text-lg font-bold text-gray-900">Chelsea Competition</h1>
                  </div>
                </div>

                {/* Connection Status and Mobile Navigation */}
                <div className="flex items-center space-x-3">
                  {/* Connection Status - Hidden on mobile */}
                  <div
                    className={`hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                      isConnected ?
                        'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                    }`}
                  >
                    {isConnected ? (
                      <Wifi className="w-4 h-4" />
                    ) : (
                      <WifiOff className="w-4 h-4" />
                    )}
                    <span>{connectionStatus}</span>
                  </div>

                  {/* Mobile Navigation */}
                  <MobileNavigation
                    currentUser={currentUser}
                    onLogout={handleLogout}
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <Navigation currentUser={currentUser} />

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ErrorBoundary>
              <Routes>
                <Route element={<DraftRefactored currentUser={currentUser} wsService={null} />} path="/" />
                <Route element={<DraftRefactored currentUser={currentUser} wsService={null} />} path="/draft" />
                <Route
                  element={
                    currentUser ? (
                      <ProfileManager onProfileUpdate={() => {}} userId={currentUser.id} />
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-600">Please log in to access your profile.</p>
                      </div>
                    )
                  }
                  path="/profile"
                />
              </Routes>
            </ErrorBoundary>
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div className="text-sm text-gray-500">
                  © 2024 KPG's Annual Chelsea Competition. Data from
                  {' '}
                  <a
                    className="text-fpl-primary hover:underline"
                    href="https://fantasy.premierleague.com"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Premier League
                  </a>
                </div>
                <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-500">
                  <span>API Reference: </span>
                  <a
                    className="text-fpl-primary hover:underline"
                    href="https://www.oliverlooney.com/blogs/FPL-APIs-Explained"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Oliver Looney's FPL API Guide
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </Router>
      </RefreshProvider>
    </ToastProvider>
  );
}

function Navigation({ currentUser }) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Competition Draft', icon: Shield },
    { path: '/profile', label: 'Profile', icon: User, requiresAuth: true }
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navItems.map(({ path, label, icon: Icon, requiresAuth }) => {
            if (requiresAuth && !currentUser) return null;

            const isActive = location.pathname === path;

            return (
              <Link
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                  isActive ?
                    'border-transparent text-white' :
                    'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                key={path}
                style={isActive ? {
                  borderBottomColor: '#034694',
                  color: '#034694'
                } : {}}
                to={path}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default App;
