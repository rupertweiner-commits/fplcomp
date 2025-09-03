import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, User, Settings, X, Menu, LogOut } from 'lucide-react';
const MobileNavigation = ({ currentUser, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Competition Draft', icon: Shield },
    { path: '/profile', label: 'Profile', icon: User, requiresAuth: true },
    { path: '/settings', label: 'Settings', icon: Settings, requiresAuth: true },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    closeMenu();
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          onClick={toggleMenu}
          className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          aria-expanded="false"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {isMenuOpen && (
        <div className="lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40"
            onClick={closeMenu}
          />
          
          {/* Menu panel */}
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-xl z-50">
            <div className="h-full flex flex-col py-6 bg-white shadow-xl">
              {/* Close button */}
              <div className="px-4 flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Menu</h2>
                <button
                  onClick={closeMenu}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* User info */}
              {currentUser && (
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {currentUser.email}
                      </p>
                      {currentUser.isAdmin && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          👑 Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation items */}
              <nav className="flex-1 px-4 py-4 space-y-1">
                {navItems.map(({ path, label, icon: Icon, requiresAuth }) => {
                  if (requiresAuth && !currentUser) return null;
                  
                  const isActive = location.pathname === path;
                  
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={closeMenu}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Logout button */}
              {currentUser && (
                <div className="px-4 py-4 border-t border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 w-full px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNavigation;
