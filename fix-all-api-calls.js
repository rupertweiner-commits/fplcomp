// Script to fix all non-existent API calls in the codebase
// This identifies and provides fixes for all components making API calls to non-existent endpoints

const fs = require('fs');
const path = require('path');

// List of components that need API call fixes
const componentsToFix = [
  {
    file: 'client/src/components/UserActivity.js',
    issues: [
      'axios.get(`/api/activity/user/${userId}/summary?days=${selectedPeriod}`)',
      'axios.get(`/api/activity/user/${userId}/recent?limit=20`)',
      'axios.get(`/api/activity/stats?days=${selectedPeriod}&userId=${userId}`)'
    ],
    fix: 'Replace with Supabase calls or placeholder functions'
  },
  {
    file: 'client/src/components/ProfileManager.js',
    issues: [
      'axios.get(`/api/auth/profile/${userId}`)',
      'axios.put(`/api/auth/profile/${userId}`, updates)',
      'axios.post(`/api/auth/profile/${userId}/password`, {...})',
      'axios.post(`/api/auth/profile/${userId}/username`, {...})',
      'axios.post(`/api/auth/profile/${userId}/initial-password`, {...})'
    ],
    fix: 'Replace with Supabase calls or placeholder functions'
  },
  {
    file: 'client/src/components/DraftQueue.js',
    issues: [
      'axios.get(\'/api/draft-queue/status\')',
      'axios.get(\'/api/draft-queue/progress\')',
      'axios.get(\'/api/draft-queue/current-turn\')',
      'axios.post(\'/api/draft-queue/initialize\', {...})',
      'axios.post(\'/api/draft-queue/start\', {...})',
      'axios.post(\'/api/draft-queue/pause\', {...})',
      'axios.post(\'/api/draft-queue/resume\', {...})',
      'axios.post(\'/api/draft-queue/reset\', {...})',
      'axios.post(\'/api/draft-queue/skip-turn\', {...})'
    ],
    fix: 'Replace with Supabase calls or placeholder functions'
  },
  {
    file: 'client/src/components/LiveTracker.js',
    issues: [
      'axios.get(\'/api/fpl/current-gameweek\')',
      'axios.get(`/api/fpl/gameweek/${gameweek}/live`)',
      'axios.get(`/api/fpl/fixtures?event=${gameweek}`)',
      'axios.get(`/api/fpl/top-performers/${gameweek}?limit=10`)',
      'axios.get(\'/api/fpl/bootstrap\')'
    ],
    fix: 'Keep /api/fpl/current-gameweek and /api/fpl/bootstrap, replace others'
  },
  {
    file: 'client/src/components/Dashboard.js',
    issues: [
      'axios.get(\'/api/fpl/dashboard\')'
    ],
    fix: 'Replace with Supabase calls or placeholder functions'
  },
  {
    file: 'client/src/components/ManagerAnalysis.js',
    issues: [
      'axios.get(\'/api/fpl/current-gameweek\')',
      'axios.get(`/api/fpl/manager/${managerId}`)',
      'axios.get(`/api/fpl/manager/${managerId}/history`)',
      'axios.get(`/api/fpl/manager/${managerId}/team/${gameweek}`)'
    ],
    fix: 'Keep /api/fpl/current-gameweek, replace others'
  },
  {
    file: 'client/src/components/LeagueStandings.js',
    issues: [
      'axios.get(`/api/fpl/league/${id.trim()}?page=${page}`)'
    ],
    fix: 'Replace with Supabase calls or placeholder functions'
  },
  {
    file: 'client/src/components/ForgotPassword.js',
    issues: [
      'axios.post(\'/api/auth/forgot-password\', { email })',
      'axios.post(\'/api/auth/reset-password\', {...})'
    ],
    fix: 'Replace with Supabase auth functions'
  }
];

// Existing API endpoints that are working
const workingEndpoints = [
  '/api/fpl/bootstrap',
  '/api/fpl/current-gameweek'
];

console.log('🔍 API Endpoint Audit Results:');
console.log('================================');
console.log(`✅ Working endpoints: ${workingEndpoints.length}`);
workingEndpoints.forEach(endpoint => console.log(`  - ${endpoint}`));

console.log(`\n❌ Components with non-existent API calls: ${componentsToFix.length}`);
componentsToFix.forEach(component => {
  console.log(`\n📁 ${component.file}`);
  console.log(`   Issues: ${component.issues.length} API calls`);
  component.issues.forEach(issue => console.log(`     - ${issue}`));
  console.log(`   Fix: ${component.fix}`);
});

console.log('\n🚀 Recommended Actions:');
console.log('1. Fix UserActivity.js first (causing crashes)');
console.log('2. Fix ProfileManager.js (username functionality)');
console.log('3. Fix remaining components with placeholder functions');
console.log('4. Implement Supabase alternatives for critical features');
