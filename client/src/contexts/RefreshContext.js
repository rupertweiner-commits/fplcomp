import React, { createContext, useContext, useState, useCallback } from 'react';

const RefreshContext = createContext();

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};

export const RefreshProvider = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshCallbacks, setRefreshCallbacks] = useState(new Set());

  // Register a refresh callback
  const registerRefreshCallback = useCallback((callback) => {
    setRefreshCallbacks(prev => new Set([...prev, callback]));
    
    // Return cleanup function
    return () => {
      setRefreshCallbacks(prev => {
        const newSet = new Set(prev);
        newSet.delete(callback);
        return newSet;
      });
    };
  }, []);

  // Trigger refresh for all registered callbacks
  const triggerRefresh = useCallback((source = 'unknown') => {
    console.log(`🔄 Triggering refresh from: ${source}`);
    setRefreshTrigger(prev => prev + 1);
    
    // Call all registered callbacks
    refreshCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('❌ Error in refresh callback:', error);
      }
    });
  }, [refreshCallbacks]);

  // Refresh specific data types
  const refreshPlayers = useCallback(() => {
    console.log('🔄 Refreshing player data...');
    triggerRefresh('players');
  }, [triggerRefresh]);

  const refreshAll = useCallback(() => {
    console.log('🔄 Refreshing all data...');
    triggerRefresh('all');
  }, [triggerRefresh]);

  const value = {
    refreshTrigger,
    registerRefreshCallback,
    triggerRefresh,
    refreshPlayers,
    refreshAll
  };

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
};
