// API Endpoints
export const API_ENDPOINTS = {
  SIMULATION: '/api/simulation',
  TEAMS: '/api/teams',
  ADMIN: '/api/admin',
  ACTIVITY: '/api/activity',
  CHIPS: '/api/chips',
  FPL: '/api/fpl',
  NOTIFICATIONS: '/api/notifications'
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

// Admin Email
export const ADMIN_EMAIL = 'rupertweiner@gmail.com';

// Game States
export const GAME_STATES = {
  DRAFT: 'draft',
  SIMULATION: 'simulation',
  COMPLETED: 'completed'
};

// Player Positions
export const PLAYER_POSITIONS = {
  GK: 'GK',
  DEF: 'DEF',
  MID: 'MID',
  FWD: 'FWD'
};

// Position Colors
export const POSITION_COLORS = {
  GK: 'bg-green-100 text-green-800',
  DEF: 'bg-blue-100 text-blue-800',
  MID: 'bg-yellow-100 text-yellow-800',
  FWD: 'bg-red-100 text-red-800'
};

// Chip Types
export const CHIP_TYPES = {
  WILDCARD: 'Wildcard',
  FREE_HIT: 'Free Hit',
  BENCH_BOOST: 'Bench Boost',
  TRIPLE_CAPTAIN: 'Triple Captain'
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  TIMEOUT: 'Request timed out. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully!',
  DELETED: 'Item deleted successfully!',
  UPDATED: 'Item updated successfully!',
  CREATED: 'Item created successfully!',
  SIMULATION_STARTED: 'Simulation started successfully!',
  SIMULATION_COMPLETED: 'Simulation completed successfully!',
  TEAM_SAVED: 'Team saved successfully!',
  TRANSFER_COMPLETED: 'Transfer completed successfully!'
};

// Loading Messages
export const LOADING_MESSAGES = {
  LOADING: 'Loading...',
  SAVING: 'Saving...',
  PROCESSING: 'Processing...',
  FETCHING_DATA: 'Fetching data...',
  SIMULATING: 'Simulating...',
  UPDATING: 'Updating...'
};

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MIN_PASSWORD_LENGTH: 6,
  MAX_TEAM_SIZE: 5,
  MIN_TEAM_SIZE: 5
};

// API Timeouts
export const API_TIMEOUTS = {
  DEFAULT: 10000, // 10 seconds
  UPLOAD: 30000,  // 30 seconds
  SIMULATION: 60000 // 60 seconds
};

// Polling Intervals
export const POLLING_INTERVALS = {
  LIVE_SCORES: 30000, // 30 seconds
  DRAFT_STATUS: 5000,  // 5 seconds
  SIMULATION: 10000    // 10 seconds
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'fpl_auth_token',
  USER_PREFERENCES: 'fpl_user_preferences',
  DRAFT_STATE: 'fpl_draft_state',
  THEME: 'fpl_theme'
};

// Theme Colors
export const THEME_COLORS = {
  PRIMARY: '#034694',
  SECONDARY: '#6B7280',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6'
};

// Breakpoints
export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  '2XL': '1536px'
};

// Animation Durations
export const ANIMATION_DURATIONS = {
  FAST: '150ms',
  NORMAL: '300ms',
  SLOW: '500ms'
};

// Z-Index Layers
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070
};
