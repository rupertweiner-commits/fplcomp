import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Activity, User, TrendingUp, BarChart3, Clock } from 'lucide-react';
const UserActivity = ({ userId, isAdmin = false }) => {
  const [activityData, setActivityData] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const fetchUserActivity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/activity/user/${userId}/summary?days=${selectedPeriod}`);
      if (response.data && response.data.success) {
        setActivityData(response.data.data || []);
      } else {
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('Failed to fetch activity summary:', err);
      setError(err.response?.data?.error || 'Failed to fetch activity summary');
      setActivityData([]);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedPeriod]);

  const fetchRecentActivity = useCallback(async () => {
    try {
      setError(null);
      const response = await axios.get(`/api/activity/user/${userId}/recent?limit=20`);
      if (response.data && response.data.success) {
        setRecentActivity(response.data.data || []);
      } else {
        setRecentActivity([]);
      }
    } catch (err) {
      console.error('Failed to fetch recent activity:', err);
      setRecentActivity([]);
    }
  }, [userId]);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const response = await axios.get(`/api/activity/stats?days=${selectedPeriod}&userId=${userId}`);
      if (response.data && response.data.success) {
        setStats(response.data.data || []);
      } else {
        setStats([]);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setStats([]);
    }
  }, [userId, selectedPeriod]);

  useEffect(() => {
    if (userId) {
      fetchUserActivity();
      fetchRecentActivity();
      if (isAdmin) {
        fetchStats();
      }
    }
  }, [userId, selectedPeriod, isAdmin, fetchUserActivity, fetchRecentActivity, fetchStats]);

  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) return 'Unknown time';
      return new Date(timestamp).toLocaleString();
    } catch (err) {
      console.error('Error formatting timestamp:', err);
      return 'Invalid time';
    }
  };

  const getActionIcon = (actionType) => {
    if (!actionType) return <Activity className="w-4 h-4 text-gray-400" />;
    
    switch (actionType) {
      case 'LOGIN':
        return <User className="w-4 h-4 text-green-500" />;
      case 'LOGOUT':
        return <User className="w-4 h-4 text-red-500" />;
      case 'TRANSFER':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'CHIP_USED':
        return <TrendingUp className="w-4 h-4 text-purple-500" />;
      case 'CAPTAIN_CHANGE':
        return <BarChart3 className="w-4 h-4 text-orange-500" />;
      case 'BENCH_CHANGE':
        return <BarChart3 className="w-4 h-4 text-yellow-500" />;
      case 'SIMULATION_ACTION':
        return <Activity className="w-4 h-4 text-indigo-500" />;
      case 'PROFILE_CHANGE':
        return <User className="w-4 h-4 text-gray-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionColor = (actionType) => {
    if (!actionType) return 'bg-gray-100 text-gray-800';
    
    switch (actionType) {
      case 'LOGIN':
        return 'bg-green-100 text-green-800';
      case 'LOGOUT':
        return 'bg-red-100 text-red-800';
      case 'TRANSFER':
        return 'bg-blue-100 text-blue-800';
      case 'CHIP_USED':
        return 'bg-purple-100 text-purple-800';
      case 'CAPTAIN_CHANGE':
        return 'bg-orange-100 text-orange-800';
      case 'BENCH_CHANGE':
        return 'bg-yellow-100 text-yellow-800';
      case 'SIMULATION_ACTION':
        return 'bg-indigo-100 text-indigo-800';
      case 'PROFILE_CHANGE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePeriodChange = (e) => {
    try {
      const value = parseInt(e.target.value);
      if (!isNaN(value) && value > 0) {
        setSelectedPeriod(value);
      }
    } catch (err) {
      console.error('Error changing period:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={fetchUserActivity}
          className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Activity Period:</label>
        <select
          value={selectedPeriod}
          onChange={handlePeriodChange}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Activity Summary */}
      {activityData && Array.isArray(activityData) && activityData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Activity Summary ({selectedPeriod} days)
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activityData.map((item, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{item?.count || 0}</div>
                <div className="text-sm text-gray-600 capitalize">
                  {item?.action_type ? item.action_type.replace(/_/g, ' ').toLowerCase() : 'Unknown'}
                </div>
                <div className="text-xs text-gray-500">{item?.date || 'Unknown date'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Recent Activity
        </h3>
        
        {recentActivity && Array.isArray(recentActivity) && recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {getActionIcon(activity?.action_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(activity?.action_type)}`}>
                      {activity?.action_type ? activity.action_type.replace(/_/g, ' ') : 'Unknown'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatTimestamp(activity?.timestamp)}
                    </span>
                  </div>
                  
                  {activity?.action_details && (
                    <div className="text-sm text-gray-700 mt-1">
                      {(() => {
                        try {
                          const details = JSON.parse(activity.action_details);
                          if (details && typeof details === 'object') {
                            return Object.entries(details)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ');
                          }
                          return activity.action_details;
                        } catch {
                          return activity.action_details;
                        }
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No recent activity found</p>
        )}
      </div>

      {/* Admin Stats */}
      {isAdmin && stats && Array.isArray(stats) && stats.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Overall Activity Statistics
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stat?.total_count || 0}</div>
                <div className="text-sm text-gray-600 capitalize">
                  {stat?.action_type ? stat.action_type.replace(/_/g, ' ').toLowerCase() : 'Unknown'}
                </div>
                <div className="text-xs text-gray-500">
                  {stat?.unique_users || 0} unique users
                </div>
                <div className="text-xs text-gray-500">{stat?.date || 'Unknown date'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserActivity;
