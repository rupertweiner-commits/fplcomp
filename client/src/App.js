// KPG FPL Competition - Deployed to Vercel (v3 - Force rebuild with timestamp: 2024-08-21 14:30)
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Wifi, WifiOff, Shield, User } from 'lucide-react';

// Import components
import Draft from './components/Draft';
import MobileNavigation from './components/MobileNavigation';
import ProfileManager from './components/ProfileManager';

// Import services
import { authService } from './services/authService';
import { supabase } from './config/supabase';
// TEMPORARILY DISABLED - Push notifications causing app to crash
// import { pushNotificationService } from './services/pushNotificationService';

// Import contexts
import { ToastProvider } from './contexts/ToastContext';

// Debug: Log which version is running
  console.log('🚀 App version: v16 - Added Supabase debug logging - 2024-09-02 21:15');
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
    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing authentication...');
        const isAuthenticated = await authService.initialize();
        
        if (isAuthenticated) {
          const user = authService.getCurrentUser();
          console.log('✅ User authenticated:', user?.email);
          setCurrentUser(user);
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

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        // User signed in - get their profile
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!profileError && userProfile) {
          const user = {
            id: userProfile.id,
            email: userProfile.email,
            firstName: userProfile.first_name || '',
            lastName: userProfile.last_name || '',
            isAdmin: userProfile.is_admin || false,
            profileComplete: !!(userProfile.first_name && userProfile.last_name)
          };
          setCurrentUser(user);
          console.log('✅ User signed in:', user.email);
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
    
    const checkApiConnection = async () => {
      try {
        console.log('🔍 Checking API connection...');
        console.log('🔧 WebSocket service should be disabled in this version');
        
        // Test connection to Supabase Edge Function
        const response = await fetch('https://lhkurlcdrzuncibcehfp.supabase.co/functions/v1/draft-status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add mode: 'cors' to ensure CORS is handled properly
          mode: 'cors',
        });
        
        console.log('📡 API response status:', response.status);
        console.log('📡 API response ok:', response.ok);
        
        if (response.ok || response.status === 401 || response.status === 403) {
          // API is accessible (even if we get auth errors, the connection works)
          console.log('✅ API connection successful');
          setIsConnected(true);
          setConnectionStatus('Connected');
        } else {
          console.log('❌ API responded with unexpected status:', response.status);
          throw new Error(`API responded with status: ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Primary API connection failed:', error);
        
        // Try fallback endpoint
        try {
          console.log('🔄 Trying fallback endpoint...');
          const fallbackResponse = await fetch('https://lhkurlcdrzuncibcehfp.supabase.co/functions/v1/draft-chelsea-players', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            mode: 'cors',
          });
          
          console.log('🔄 Fallback response status:', fallbackResponse.status);
          
          if (fallbackResponse.ok || fallbackResponse.status === 401 || fallbackResponse.status === 403) {
            console.log('✅ Fallback API connection successful');
            setIsConnected(true);
            setConnectionStatus('Connected');
          } else {
            throw new Error(`Fallback API responded with status: ${fallbackResponse.status}`);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback API connection also failed:', fallbackError);
          setIsConnected(false);
          setConnectionStatus('API Unavailable');
        }
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
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Logo and Title */}
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#034694'}}>
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
                  <div className={`hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                    isConnected 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
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
          <Routes>
            <Route path="/" element={<Draft wsService={null} />} />
            <Route path="/draft" element={<Draft wsService={null} />} />
            <Route path="/profile" element={
              currentUser ? (
                <ProfileManager userId={currentUser.id} onProfileUpdate={() => {}} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">Please log in to access your profile.</p>
                </div>
              )
            } />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
              <div className="text-sm text-gray-500">
                © 2024 KPG's Annual Chelsea Competition. Data from{' '}
                <a 
                  href="https://fantasy.premierleague.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-fpl-primary hover:underline"
                >
                  Premier League
                </a>
              </div>
              <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-500">
                <span>API Reference: </span>
                <a 
                  href="https://www.oliverlooney.com/blogs/FPL-APIs-Explained" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-fpl-primary hover:underline"
                >
                  Oliver Looney's FPL API Guide
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
      </Router>
    </ToastProvider>
  );
}

function Navigation({ currentUser }) {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Competition Draft', icon: Shield },
    { path: '/profile', label: 'Profile', icon: User, requiresAuth: true },
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
                key={path}
                to={path}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'border-transparent text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={isActive ? {
                  borderBottomColor: '#034694',
                  color: '#034694'
                } : {}}
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
