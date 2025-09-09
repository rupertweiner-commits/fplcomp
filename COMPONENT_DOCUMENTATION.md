# FPL App Component Documentation

## 📚 **Overview**
This document provides comprehensive documentation for all components in the FPL Competition app, including usage examples, props, and best practices.

## 🎯 **UI Components**

### **Button Component**
**Location:** `client/src/components/ui/Button.js`

A highly customizable button component with multiple variants, sizes, and states.

#### **Props**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | **required** | Button content |
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'success' \| 'warning' \| 'outline' \| 'ghost' \| 'link'` | `'primary'` | Button style variant |
| `size` | `'small' \| 'medium' \| 'large' \| 'xl'` | `'medium'` | Button size |
| `disabled` | `boolean` | `false` | Whether button is disabled |
| `loading` | `boolean` | `false` | Whether button is in loading state |
| `onClick` | `function` | - | Click handler |
| `className` | `string` | `''` | Additional CSS classes |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Button type |
| `fullWidth` | `boolean` | `false` | Whether button takes full width |

#### **Usage Examples**
```jsx
// Basic button
<Button onClick={handleClick}>Click me</Button>

// Primary button with loading state
<Button variant="primary" loading={isLoading}>
  Save Changes
</Button>

// Danger button
<Button variant="danger" onClick={handleDelete}>
  Delete Item
</Button>

// Full width button
<Button fullWidth variant="success">
  Complete Action
</Button>

// Small button with icon
<Button size="small" variant="outline">
  <Icon className="w-4 h-4 mr-2" />
  Action
</Button>
```

#### **Variants**
- **Primary:** Blue background, white text (default)
- **Secondary:** Gray background, dark text
- **Danger:** Red background, white text
- **Success:** Green background, white text
- **Warning:** Yellow background, white text
- **Outline:** Transparent background, colored border
- **Ghost:** Transparent background, colored text
- **Link:** Styled as a link

---

### **Card Component**
**Location:** `client/src/components/ui/Card.js`

A flexible container component for grouping related content.

#### **Props**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | **required** | Card content |
| `padding` | `'none' \| 'small' \| 'medium' \| 'large' \| 'xl'` | `'medium'` | Internal padding |
| `shadow` | `'none' \| 'small' \| 'medium' \| 'large' \| 'xl'` | `'medium'` | Shadow depth |
| `rounded` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| 'full'` | `'lg'` | Border radius |
| `hover` | `boolean` | `false` | Whether to show hover effects |
| `onClick` | `function` | - | Click handler |
| `className` | `string` | `''` | Additional CSS classes |

#### **Usage Examples**
```jsx
// Basic card
<Card>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>

// Card with custom padding and shadow
<Card padding="large" shadow="xl">
  <h3>Featured Content</h3>
  <p>This card has extra padding and shadow</p>
</Card>

// Clickable card with hover effect
<Card hover onClick={handleCardClick}>
  <h3>Clickable Card</h3>
  <p>This card responds to clicks</p>
</Card>

// Card with no padding
<Card padding="none">
  <img src="image.jpg" alt="Full width image" />
</Card>
```

---

### **Modal Component**
**Location:** `client/src/components/ui/Modal.js`

A modal dialog component with overlay and keyboard navigation.

#### **Props**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | **required** | Whether modal is open |
| `onClose` | `function` | **required** | Close handler |
| `title` | `string` | - | Modal title |
| `children` | `ReactNode` | **required** | Modal content |
| `size` | `'small' \| 'medium' \| 'large' \| 'xl' \| 'full'` | `'medium'` | Modal size |
| `showCloseButton` | `boolean` | `true` | Whether to show close button |
| `closeOnOverlayClick` | `boolean` | `true` | Whether to close on overlay click |
| `className` | `string` | `''` | Additional CSS classes |

#### **Usage Examples**
```jsx
// Basic modal
<Modal isOpen={isOpen} onClose={handleClose}>
  <p>Modal content goes here</p>
</Modal>

// Modal with title
<Modal 
  isOpen={isOpen} 
  onClose={handleClose}
  title="Confirm Action"
>
  <p>Are you sure you want to proceed?</p>
  <Button onClick={handleConfirm}>Confirm</Button>
</Modal>

// Large modal
<Modal 
  isOpen={isOpen} 
  onClose={handleClose}
  size="large"
  title="Detailed View"
>
  <div>Large content area</div>
</Modal>

// Modal that doesn't close on overlay click
<Modal 
  isOpen={isOpen} 
  onClose={handleClose}
  closeOnOverlayClick={false}
>
  <p>This modal requires explicit close action</p>
</Modal>
```

---

### **LoadingSpinner Component**
**Location:** `client/src/components/ui/LoadingSpinner.js`

A loading indicator component with multiple sizes and text options.

#### **Props**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'small' \| 'medium' \| 'large' \| 'xl'` | `'medium'` | Spinner size |
| `text` | `string` | `''` | Loading text |
| `className` | `string` | `''` | Additional CSS classes |
| `fullScreen` | `boolean` | `false` | Whether to cover full screen |

#### **Usage Examples**
```jsx
// Basic spinner
<LoadingSpinner />

// Spinner with text
<LoadingSpinner text="Loading data..." />

// Large spinner
<LoadingSpinner size="large" text="Processing..." />

// Full screen spinner
<LoadingSpinner 
  fullScreen 
  text="Loading application..." 
/>
```

---

### **ErrorBoundary Component**
**Location:** `client/src/components/ui/ErrorBoundary.js`

A React error boundary that catches JavaScript errors anywhere in the component tree.

#### **Features**
- Catches JavaScript errors in child components
- Displays fallback UI instead of crashing
- Logs errors for debugging
- Provides retry functionality
- Shows error details in development mode
- Tracks error frequency and prevents infinite loops

#### **Usage Examples**
```jsx
// Wrap components that might throw errors
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// Wrap entire app sections
<ErrorBoundary>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/profile" element={<ProfilePage />} />
  </Routes>
</ErrorBoundary>
```

---

## 🏗️ **Tab Components**

### **SimulationTab Component**
**Location:** `client/src/components/tabs/SimulationTab.js`

Admin interface for managing simulation controls and gameweek operations.

#### **Props**
| Prop | Type | Description |
|------|------|-------------|
| `currentUser` | `Object` | Current user object with admin status |
| `draftStatus` | `Object` | Current draft status |
| `simulationStatus` | `Object` | Current simulation status |
| `leaderboard` | `Array` | Current leaderboard data |
| `onRefresh` | `function` | Callback to refresh draft data |
| `onStartSimulation` | `function` | Callback to start simulation |
| `onSimulateGameweek` | `function` | Callback to simulate gameweek |
| `onRefreshLeaderboard` | `function` | Callback to refresh leaderboard |

#### **Features**
- Admin access control
- Simulation controls (start, simulate, reset)
- Gameweek statistics display
- Real-time status updates
- Error handling and user feedback

#### **Usage Example**
```jsx
<SimulationTab
  currentUser={currentUser}
  draftStatus={draftStatus}
  simulationStatus={simulationStatus}
  leaderboard={leaderboard}
  onRefresh={fetchDraftData}
  onStartSimulation={startSimulation}
  onSimulateGameweek={simulateGameweek}
  onRefreshLeaderboard={fetchLeaderboard}
/>
```

---

### **TeamManagementTab Component**
**Location:** `client/src/components/tabs/TeamManagementTab.js`

Admin interface for managing team assignments and player transfers.

#### **Props**
| Prop | Type | Description |
|------|------|-------------|
| `currentUser` | `Object` | Current user object |
| `draftStatus` | `Object` | Current draft status |
| `onRefresh` | `function` | Callback to refresh data |

#### **Features**
- User selection dropdown
- Player assignment interface
- Team composition management
- Transfer system
- Chips management
- Auto-save functionality

#### **Usage Example**
```jsx
<TeamManagementTab
  currentUser={currentUser}
  draftStatus={draftStatus}
  onRefresh={fetchDraftData}
/>
```

---

### **StatsTab Component**
**Location:** `client/src/components/tabs/StatsTab.js`

Statistics and performance metrics display.

#### **Props**
| Prop | Type | Description |
|------|------|-------------|
| `liveScores` | `Object` | Live scores data |
| `draftStatus` | `Object` | Current draft status |
| `currentUser` | `Object` | Current user object |
| `chelseaPlayers` | `Array` | Chelsea players data |

#### **Features**
- Overview statistics
- Live scores summary
- Player performance tables
- Simulation status display
- Admin refresh controls

#### **Usage Example**
```jsx
<StatsTab
  liveScores={liveScores}
  draftStatus={draftStatus}
  currentUser={currentUser}
  chelseaPlayers={chelseaPlayers}
/>
```

---

### **LeaderboardTab Component**
**Location:** `client/src/components/tabs/LeaderboardTab.js`

Live leaderboard and championship podium display.

#### **Props**
| Prop | Type | Description |
|------|------|-------------|
| `liveScores` | `Object` | Live scores data |
| `draftStatus` | `Object` | Current draft status |
| `currentUser` | `Object` | Current user object |
| `allPlayers` | `Array` | All players data |

#### **Features**
- Championship podium display
- Detailed leaderboard
- Player score breakdowns
- Real-time updates
- User highlighting

#### **Usage Example**
```jsx
<LeaderboardTab
  liveScores={liveScores}
  draftStatus={draftStatus}
  currentUser={currentUser}
  allPlayers={chelseaPlayers}
/>
```

---

## 🎣 **Custom Hooks**

### **useDraftState Hook**
**Location:** `client/src/hooks/useDraftState.js`

Centralized state management for draft-related data and operations.

#### **Returns**
| Property | Type | Description |
|----------|------|-------------|
| `draftStatus` | `Object` | Current draft status |
| `simulationStatus` | `Object` | Current simulation status |
| `chelseaPlayers` | `Array` | Chelsea players data |
| `draftPicks` | `Array` | Draft picks data |
| `leaderboard` | `Array` | Leaderboard data |
| `liveScores` | `Object` | Live scores data |
| `loading` | `boolean` | Loading state |
| `error` | `Object` | Error state |
| `fetchDraftData` | `function` | Fetch draft data |
| `fetchLiveScores` | `function` | Fetch live scores |
| `fetchLeaderboard` | `function` | Fetch leaderboard |
| `startSimulation` | `function` | Start simulation |
| `simulateGameweek` | `function` | Simulate gameweek |
| `draftPlayer` | `function` | Draft a player |

#### **Usage Example**
```jsx
const {
  draftStatus,
  simulationStatus,
  chelseaPlayers,
  loading,
  error,
  fetchDraftData,
  startSimulation
} = useDraftState(currentUser);
```

---

## 🎯 **Context Providers**

### **DraftContext**
**Location:** `client/src/contexts/DraftContext.js`

React Context for managing draft state across components.

#### **Provider Props**
| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Child components |
| `currentUser` | `Object` | Current user object |

#### **Context Value**
- `state` - Current draft state
- `actions` - State update actions
- `isDraftComplete` - Draft completion status
- `isSimulationActive` - Simulation status
- `currentGameweek` - Current gameweek number
- `totalPlayers` - Total player count
- `totalPicks` - Total picks count
- `isLoading` - Global loading state
- `hasError` - Global error state

#### **Usage Example**
```jsx
<DraftProvider currentUser={currentUser}>
  <App />
</DraftProvider>

// In component
const { state, actions, isLoading } = useDraftContext();
```

---

## 🛠️ **Utility Functions**

### **Error Handling**
**Location:** `client/src/utils/errorHandler.js`

Centralized error handling utilities.

#### **Functions**
- `handleApiError(error, context, options)` - Handle API errors
- `handleComponentError(error, componentName, errorInfo)` - Handle component errors
- `handleValidationError(validationErrors, field)` - Handle validation errors
- `trackError(error, context, metadata)` - Track errors for monitoring
- `getUserFriendlyMessage(error)` - Get user-friendly error messages
- `isRetryableError(error)` - Check if error is retryable
- `retryWithBackoff(fn, maxRetries, baseDelay)` - Retry with exponential backoff

#### **Usage Example**
```jsx
import { handleApiError, retryWithBackoff } from '../utils/errorHandler';

try {
  const result = await retryWithBackoff(
    () => fetch('/api/data'),
    3,
    1000
  );
} catch (error) {
  const errorInfo = handleApiError(error, 'fetchData');
  console.error(errorInfo.message);
}
```

---

### **Helper Functions**
**Location:** `client/src/utils/helpers.js`

Common utility functions for data manipulation and validation.

#### **Functions**
- `safeExtract(obj, path, defaultValue)` - Safely extract nested properties
- `safeExtractString(obj, path, defaultValue)` - Safely extract string values
- `formatNumber(num)` - Format numbers with commas
- `formatCurrency(amount, currency)` - Format currency values
- `formatDate(date, options)` - Format dates
- `formatRelativeTime(date)` - Format relative time
- `isValidEmail(email)` - Validate email addresses
- `validatePassword(password)` - Validate password strength
- `getPositionColor(position)` - Get position color classes
- `debounce(func, wait, immediate)` - Debounce function calls
- `throttle(func, limit)` - Throttle function calls
- `generateId(length)` - Generate unique IDs
- `deepClone(obj)` - Deep clone objects
- `isEmpty(obj)` - Check if object is empty
- `capitalize(str)` - Capitalize strings
- `toTitleCase(str)` - Convert to title case
- `truncate(str, length, suffix)` - Truncate strings
- `sleep(ms)` - Sleep function
- `isAdmin(user)` - Check if user is admin
- `getUserDisplayName(user)` - Get user display name
- `sortBy(array, property, direction)` - Sort arrays
- `groupBy(array, property)` - Group arrays

#### **Usage Example**
```jsx
import { 
  safeExtract, 
  formatCurrency, 
  isAdmin, 
  debounce 
} from '../utils/helpers';

const userName = safeExtract(user, 'profile.name', 'Unknown');
const price = formatCurrency(player.price);
const isUserAdmin = isAdmin(currentUser);
const debouncedSearch = debounce(handleSearch, 300);
```

---

### **Constants**
**Location:** `client/src/utils/constants.js`

Application constants and configuration values.

#### **Exports**
- `API_ENDPOINTS` - API endpoint URLs
- `USER_ROLES` - User role constants
- `ADMIN_EMAIL` - Admin email address
- `GAME_STATES` - Game state constants
- `PLAYER_POSITIONS` - Player position constants
- `POSITION_COLORS` - Position color classes
- `CHIP_TYPES` - Chip type constants
- `ERROR_MESSAGES` - Error message constants
- `SUCCESS_MESSAGES` - Success message constants
- `LOADING_MESSAGES` - Loading message constants
- `VALIDATION_RULES` - Validation rule constants
- `API_TIMEOUTS` - API timeout values
- `POLLING_INTERVALS` - Polling interval values
- `STORAGE_KEYS` - Local storage keys
- `THEME_COLORS` - Theme color values
- `BREAKPOINTS` - Responsive breakpoints
- `ANIMATION_DURATIONS` - Animation duration values
- `Z_INDEX` - Z-index layer values

#### **Usage Example**
```jsx
import { 
  API_ENDPOINTS, 
  ERROR_MESSAGES, 
  VALIDATION_RULES 
} from '../utils/constants';

const response = await fetch(API_ENDPOINTS.SIMULATION);
const errorMsg = ERROR_MESSAGES.NETWORK_ERROR;
const isValid = VALIDATION_RULES.EMAIL_REGEX.test(email);
```

---

## 🧪 **Testing**

### **Test Structure**
```
client/src/__tests__/
├── components/
│   ├── ui/
│   │   ├── Button.test.js
│   │   ├── Card.test.js
│   │   └── Modal.test.js
│   └── tabs/
│       ├── SimulationTab.test.js
│       ├── TeamManagementTab.test.js
│       └── StatsTab.test.js
├── hooks/
│   └── useDraftState.test.js
└── utils/
    ├── errorHandler.test.js
    └── helpers.test.js
```

### **Running Tests**
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci

# Run specific test file
npm test Button.test.js
```

### **Test Examples**
```jsx
// Component testing
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../Button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});

// Hook testing
import { renderHook, act } from '@testing-library/react';
import { useDraftState } from '../useDraftState';

test('initializes with loading state', () => {
  const { result } = renderHook(() => useDraftState({ id: '1' }));
  expect(result.current.loading).toBe(true);
});
```

---

## 📝 **Best Practices**

### **Component Development**
1. **Single Responsibility** - Each component should have one clear purpose
2. **PropTypes** - Always define PropTypes for better development experience
3. **Default Props** - Provide sensible defaults for optional props
4. **Error Boundaries** - Wrap components that might throw errors
5. **Loading States** - Always handle loading and error states
6. **Accessibility** - Include proper ARIA labels and keyboard navigation

### **State Management**
1. **Context for Global State** - Use Context for state shared across components
2. **Local State for UI** - Use useState for component-specific state
3. **Custom Hooks** - Extract reusable state logic into custom hooks
4. **Immutable Updates** - Always update state immutably
5. **Error Handling** - Handle errors gracefully with fallbacks

### **Testing**
1. **Test Behavior** - Test what users see and do, not implementation details
2. **Mock Dependencies** - Mock external dependencies and APIs
3. **Test Edge Cases** - Test error states, loading states, and edge cases
4. **Maintain Coverage** - Aim for at least 70% test coverage
5. **Fast Tests** - Keep tests fast and focused

### **Performance**
1. **Memoization** - Use React.memo, useMemo, and useCallback appropriately
2. **Lazy Loading** - Load components only when needed
3. **Bundle Size** - Monitor and optimize bundle size
4. **API Calls** - Debounce and throttle API calls
5. **Error Tracking** - Track errors and performance metrics

---

## 🚀 **Getting Started**

### **1. Install Dependencies**
```bash
cd client
npm install
```

### **2. Start Development Server**
```bash
npm start
```

### **3. Run Tests**
```bash
npm test
```

### **4. Build for Production**
```bash
npm run build
```

### **5. Lint and Format Code**
```bash
npm run lint
npm run format
```

---

## 📞 **Support**

For questions or issues with components:

1. Check this documentation first
2. Look at existing usage examples
3. Check the test files for expected behavior
4. Review the error handling patterns
5. Contact the development team

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Maintainer:** FPL Development Team
