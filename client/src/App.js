import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Wifi, WifiOff, Shield, User } from 'lucide-react';

// Import components
import Draft from './components/Draft';
import MobileNavigation from './components/MobileNavigation';
import ProfileManager from './components/ProfileManager';

// Import services
import { WebSocketService } from './services/WebSocketService';
import { authService } from './services/authService';
import { pushNotificationService } from './services/pushNotificationService';

// Import contexts
import { ToastProvider } from './contexts/ToastContext';

// KPG FPL Competition - Deployed to Vercel
function App() {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connected');
  const [wsService, setWsService] = useState(null);
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());

  useEffect(() => {
    // Initialize WebSocket connection
    const ws = new WebSocketService();
    setWsService(ws);

    ws.connect(
      // On connect
      () => {
        setIsConnected(true);
        setConnectionStatus('Connected');
      },
      // On disconnect
      () => {
        setIsConnected(false);
        setConnectionStatus('Disconnected');
      },
      // On error
      (error) => {
        setIsConnected(false);
        setConnectionStatus(`Error: ${error.message}`);
      }
    );

    // Initialize push notifications
    pushNotificationService.initialize();

    return () => {
      ws.disconnect();
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

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
            <Route path="/" element={<Draft wsService={wsService} />} />
            <Route path="/draft" element={<Draft wsService={wsService} />} />
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
