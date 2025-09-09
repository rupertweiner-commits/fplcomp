import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import LoadingSpinner from './ui/LoadingSpinner';

function APITester({ currentUser }) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState([]);

  const endpoints = [
    { method: 'GET', url: '/api/fpl?action=bootstrap', name: 'FPL Bootstrap', public: true },
    { method: 'GET', url: '/api/fpl?action=current-gameweek', name: 'FPL Current Gameweek', public: true },
    { method: 'GET', url: '/api/simulation?action=status', name: 'Simulation Status', public: true },
    { method: 'GET', url: '/api/simulation?action=leaderboard', name: 'Simulation Leaderboard', public: true },
    { method: 'GET', url: '/api/teams?action=all', name: 'All Teams', public: true },
    { method: 'GET', url: '/api/activity?action=recent', name: 'Recent Activity', public: true },
    { method: 'GET', url: '/api/fpl-sync?action=sync-status', name: 'FPL Sync Status', public: true },
    { method: 'POST', url: '/api/fpl-sync?action=sync-chelsea-players', name: 'FPL Sync Chelsea Players', public: false },
    { method: 'GET', url: '/api/fpl-sync?action=test', name: 'FPL Sync Test', public: true },
    { method: 'GET', url: '/api/fpl-sync-minimal?action=test', name: 'FPL Sync Minimal Test', public: true },
    { method: 'GET', url: '/api/fpl-sync-minimal?action=sync-status', name: 'FPL Sync Minimal Status', public: true },
    { method: 'POST', url: '/api/fpl-sync-minimal?action=sync-chelsea-players', name: 'FPL Sync Minimal Players', public: false },
    { method: 'GET', url: '/api/fpl-sync-fixed?action=test', name: 'FPL Sync Fixed Test', public: true },
    { method: 'GET', url: '/api/fpl-sync-fixed?action=sync-status', name: 'FPL Sync Fixed Status', public: true },
    { method: 'POST', url: '/api/fpl-sync-fixed?action=sync-chelsea-players', name: 'FPL Sync Fixed Players', public: false },
  ];

  const testEndpoint = async (endpoint) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      if (currentUser?.access_token) {
        headers.Authorization = `Bearer ${currentUser.access_token}`;
      }

      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        data = { error: `Non-JSON response: ${textResponse.substring(0, 200)}...` };
      }
      
      return {
        name: endpoint.name,
        method: endpoint.method,
        url: endpoint.url,
        success: response.ok,
        status: response.status,
        error: response.ok ? null : (data.error || 'Unknown error'),
        data: response.ok ? data : null,
        responseTime: Date.now()
      };
    } catch (error) {
      return {
        name: endpoint.name,
        method: endpoint.method,
        url: endpoint.url,
        success: false,
        status: 0,
        error: error.message,
        data: null,
        responseTime: Date.now()
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);
    
    console.log('🚀 Starting API tests...');
    
    const testResults = [];
    
    for (const endpoint of endpoints) {
      console.log(`🧪 Testing ${endpoint.name}...`);
      const result = await testEndpoint(endpoint);
      testResults.push(result);
      setResults([...testResults]); // Update UI in real-time
      
      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setTesting(false);
    
    const passed = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;
    
    console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  };

  const getStatusIcon = (result) => {
    if (result.success) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (result) => {
    if (result.success) {
      return 'text-green-700 bg-green-50 border-green-200';
    } else {
      return 'text-red-700 bg-red-50 border-red-200';
    }
  };

  const passedCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  const totalCount = results.length;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">API Endpoint Tester</h2>
            <p className="text-gray-600">Test all API endpoints to ensure they're working correctly</p>
          </div>
          <Play className="w-8 h-8 text-blue-600" />
        </div>

        {testing && (
          <div className="mb-6">
            <LoadingSpinner text="Running API tests..." />
          </div>
        )}

        {results.length > 0 && !testing && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{passedCount}</div>
              <div className="text-sm text-green-600">Passed</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{failedCount}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Button
            onClick={runAllTests}
            disabled={testing}
            loading={testing}
            variant="primary"
            size="large"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Run API Tests
          </Button>

          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Test Results:</h3>
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getStatusColor(result)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(result)}
                      <div>
                        <div className="font-medium">{result.name}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          {result.method} {result.url}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-mono">
                      HTTP {result.status}
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-sm">
                      <div className="font-medium text-red-800 mb-1">Error Details:</div>
                      <div className="text-red-700 font-mono text-xs break-all">
                        {result.error}
                      </div>
                    </div>
                  )}
                  
                  {result.success && result.data && (
                    <div className="mt-3 p-2 bg-green-100 border border-green-200 rounded text-sm">
                      <div className="font-medium text-green-800 mb-1">Success Response:</div>
                      <div className="text-green-700 font-mono text-xs">
                        {JSON.stringify(result.data, null, 2).substring(0, 200)}
                        {JSON.stringify(result.data, null, 2).length > 200 && '...'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">What this tests:</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• FPL API endpoints (bootstrap data, gameweek info)</li>
              <li>• Simulation API (status, leaderboard)</li>
              <li>• Teams API (all teams data)</li>
              <li>• Activity API (recent activity)</li>
              <li>• FPL Sync API (sync status)</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default APITester;
