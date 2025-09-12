# API Endpoints Documentation

## Overview
This document provides a comprehensive overview of all API endpoints in the FPL Competition application, organized by functionality and status.

## Current API Structure

### ✅ **LIVE & ACTIVE ENDPOINTS**

#### Core System APIs (`/api/draft-allocation-simple.js`)
**Status**: ✅ Active - Consolidated endpoint handling multiple draft operations

| Action | Method | Purpose | Status |
|--------|--------|---------|--------|
| `get-draft-status` | GET | Get current draft status | ✅ Working |
| `get-mock-users` | GET | Get all active users for draft | ✅ Working |
| `get-available-players` | GET | Get unassigned Chelsea players | ✅ Working |
| `get-allocations` | GET | Get current player allocations | ✅ Working |
| `allocate-player` | POST | Assign player to user | ✅ Working |
| `remove-player` | POST | Remove player from user | ✅ Working |
| `set-captain` | POST | Set captain/vice captain | ✅ Working |
| `complete-draft` | POST | Finalize all allocations | ✅ Working |

#### Simulation APIs (`/api/simulation.js`)
**Status**: ✅ Active - Handles simulation mode and gameweek management

| Action | Method | Purpose | Status |
|--------|--------|---------|--------|
| `status` | GET | Get simulation status | ✅ Working |
| `start` | POST | Start simulation mode | ✅ Working |
| `simulate` | POST | Simulate specific gameweek | ✅ Working |
| `simulate-next` | POST | Simulate next gameweek | ✅ Working |
| `get-gameweek-results` | GET | Get gameweek results | ✅ Working |
| `calculate-user-scores` | POST | Calculate user scores | ✅ Working |
| `leaderboard` | GET | Get simulation leaderboard | ✅ Working |

#### FPL Sync APIs (`/api/fpl-sync.js`)
**Status**: ✅ Active - Handles FPL data synchronization

| Action | Method | Purpose | Status |
|--------|--------|---------|--------|
| `test` | GET | Test FPL sync connectivity | ✅ Working |
| `sync-status` | GET | Get last sync status | ⚠️ Needs fpl_sync_log table |
| `get-chelsea-players` | GET | Get current Chelsea players | ✅ Working |
| `sync-chelsea-players` | POST | Sync players from FPL API | ✅ Working |

#### FPL Data APIs (`/api/fpl.js`)
**Status**: ✅ Active - Direct FPL API access

| Action | Method | Purpose | Status |
|--------|--------|---------|--------|
| `bootstrap` | GET | Get FPL bootstrap data | ✅ Working |
| `current-gameweek` | GET | Get current gameweek info | ✅ Working |

#### User & Activity APIs
**Status**: ✅ Active - User management and activity tracking

| Endpoint | Action | Method | Purpose | Status |
|----------|--------|--------|---------|--------|
| `/api/activity.js` | `recent` | GET | Get recent user activity | ✅ Working |
| `/api/activity.js` | `user` | GET | Get user-specific activity | ✅ Working |
| `/api/leaderboard.js` | - | GET | Get user leaderboard | ✅ Working |

#### Notification APIs
**Status**: ✅ Active - Email and push notifications

| Endpoint | Action | Method | Purpose | Status |
|----------|--------|--------|---------|--------|
| `/api/notifications/email.js` | `send` | POST | Send email notification | ✅ Working |
| `/api/notifications/email.js` | `preferences` | GET/POST | Manage email preferences | ✅ Working |
| `/api/notifications/email.js` | `subscribe` | POST | Subscribe to emails | ✅ Working |
| `/api/notifications/email.js` | `unsubscribe` | POST | Unsubscribe from emails | ✅ Working |
| `/api/notifications/push.js` | Various | POST | Push notification management | ✅ Working |

### ⚠️ **REDUNDANT/LEGACY ENDPOINTS**

#### Duplicate Leaderboard Endpoints
- **`/api/leaderboard.js`** - Simple leaderboard (legacy)
- **`/api/simulation.js?action=leaderboard`** - Simulation leaderboard (preferred)

**Recommendation**: Use simulation leaderboard for consistency.

#### Potential Redundancies
- **`/api/admin.js`** - May have overlapping functionality with draft-allocation-simple
- **`/api/chips.js`** - Chip system functionality (may be unused)
- **`/api/user-chips.js`** - User chip management (may be unused)

### 🔧 **API TESTING TOOL**

The Admin Dashboard now includes a comprehensive API testing tool that:

1. **Categorizes endpoints** by functionality (Core, Simulation, FPL Sync, User & Activity)
2. **Tests individual endpoints** with real-time results
3. **Runs bulk tests** to check all endpoints at once
4. **Shows response times** and status codes
5. **Exports results** for debugging and documentation
6. **Provides clear error messages** for failed tests

### 📊 **API HEALTH MONITORING**

The testing tool provides:
- ✅ **Success indicators** for working endpoints
- ❌ **Error indicators** for failed endpoints
- ⚠️ **Warning indicators** for slow responses
- 📈 **Response time tracking**
- 📝 **Detailed error messages**

### 🚀 **RECOMMENDATIONS**

1. **Consolidate Redundant Endpoints**:
   - Remove duplicate leaderboard endpoints
   - Merge similar functionality where possible

2. **Standardize Response Format**:
   - All endpoints should return consistent JSON structure
   - Include success/error status in all responses

3. **Add Rate Limiting**:
   - Implement rate limiting for API endpoints
   - Add request throttling for bulk operations

4. **Improve Error Handling**:
   - Standardize error response format
   - Add more descriptive error messages
   - Include error codes for programmatic handling

5. **Add API Documentation**:
   - Generate OpenAPI/Swagger documentation
   - Add endpoint descriptions and examples
   - Document required parameters and response formats

### 📈 **PERFORMANCE METRICS**

The API testing tool tracks:
- **Response Time**: Average response time per endpoint
- **Success Rate**: Percentage of successful requests
- **Error Rate**: Percentage of failed requests
- **Uptime**: Endpoint availability over time

### 🔍 **DEBUGGING FEATURES**

- **Real-time Testing**: Test endpoints individually or in bulk
- **Error Logging**: Detailed error messages and stack traces
- **Export Functionality**: Download test results for analysis
- **Historical Results**: Track endpoint performance over time

---

## Quick Reference

### Most Used Endpoints
1. **Draft Management**: `/api/draft-allocation-simple`
2. **Simulation Control**: `/api/simulation`
3. **FPL Data Sync**: `/api/fpl-sync`
4. **User Activity**: `/api/activity`

### Testing Endpoints
- Use the Admin Dashboard → API Test section
- Run individual tests or bulk tests
- Export results for debugging
- Monitor endpoint health in real-time

### Maintenance
- Regular testing recommended
- Monitor error rates and response times
- Update documentation when adding new endpoints
- Remove unused endpoints to reduce complexity
