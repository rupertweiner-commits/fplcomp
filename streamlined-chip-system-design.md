# 🎮 Streamlined Chip System Design

## 🎯 **6 Focused Chips**

### **🔄 Player Swap** (Rare - 25% drop rate)
- **Visual**: Red poker chip with swap arrows
- **Effect**: Steal any player from another user's team for 1 gameweek
- **Target**: Select opponent + their player + your player to swap
- **Strategy**: Steal their best performer, give them your worst
- **Example**: Swap your Sterling (45 pts) for their Salah (120 pts)

### **💀 Bench Banish** (Rare - 25% drop rate)
- **Visual**: Black poker chip with bench icon
- **Effect**: Force another user to bench a specific player for 1 gameweek
- **Target**: Select opponent + their player to bench
- **Strategy**: Remove their key player from scoring
- **Example**: Force their top scorer to the bench

### **🛡️ Shield** (Rare - 25% drop rate)
- **Visual**: Blue poker chip with shield icon
- **Effect**: Block all chip effects targeting you for 1 gameweek
- **Target**: Self (defensive)
- **Strategy**: Protect yourself when you're ahead
- **Example**: All chips used on you have no effect

### **⚡ Captain Curse** (Legendary - 5% drop rate)
- **Visual**: Gold poker chip with lightning bolt
- **Effect**: Another user's captain scores negative points for 1 gameweek
- **Target**: Select opponent
- **Strategy**: Devastating blow to their main scorer
- **Example**: Their captain gets -10 points instead of +20

### **⭐ Triple Captain** (Epic - 15% drop rate)
- **Visual**: Silver poker chip with "3x" symbol
- **Effect**: Your captain scores triple points for 1 gameweek
- **Target**: Self
- **Strategy**: Maximize captain points when confident
- **Example**: Captain scores 30 points instead of 10

### **🚀 Bench Boost** (Epic - 15% drop rate)
- **Visual**: Green poker chip with rocket icon
- **Effect**: Your bench players score points for 1 gameweek
- **Target**: Self
- **Strategy**: Get points from your entire squad
- **Example**: All 5 players score points, not just starters

## 🎲 **FPL Gameweek Integration**

### **Gameweek Active/Inactive System**
- **Active Period**: Monday 11:30 AM - Friday 11:00 AM (UK time)
- **Inactive Period**: Friday 11:00 AM - Monday 11:30 AM (UK time)
- **Chip Usage**: Only during active periods
- **Effect Timing**: Chips take effect for the next gameweek

### **FPL API Integration**
```javascript
// Check if gameweek is active for chip usage
const isGameweekActive = (gameweek) => {
  const now = new Date();
  const gameweekStart = new Date(gameweek.deadline_time);
  const gameweekEnd = new Date(gameweek.deadline_time);
  gameweekEnd.setHours(gameweekEnd.getHours() + 24);
  
  return now >= gameweekStart && now <= gameweekEnd;
};

// Get current gameweek status
const getGameweekStatus = async () => {
  const response = await fetch('/api/fpl-gameweek-status');
  const data = await response.json();
  return {
    current: data.current,
    isActive: isGameweekActive(data.current),
    nextDeadline: data.current.deadline_time
  };
};
```

## 🎨 **Poker Chip Visual Design**

### **Chip Styling System**
```css
.poker-chip {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 4px solid #333;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.poker-chip:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 12px rgba(0,0,0,0.4);
}

.poker-chip.rare {
  background: linear-gradient(45deg, #ff6b6b, #ff8e8e);
  border-color: #ff4757;
}

.poker-chip.epic {
  background: linear-gradient(45deg, #a55eea, #c44569);
  border-color: #8b5cf6;
}

.poker-chip.legendary {
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  border-color: #f59e0b;
}
```

### **Chip Icons & Symbols**
- **Player Swap**: 🔄 (swap arrows)
- **Bench Banish**: 🪑 (bench icon)
- **Shield**: 🛡️ (shield)
- **Captain Curse**: ⚡ (lightning bolt)
- **Triple Captain**: 3x (bold text)
- **Bench Boost**: 🚀 (rocket)

## 🎮 **Chip Usage Flow**

### **1. Gameweek Status Check**
```
┌─────────────────────────────────────┐
│ 🎮 Chip System Status               │
├─────────────────────────────────────┤
│ Gameweek 15 - ACTIVE ✅             │
│ Deadline: Fri 11:00 AM (2 days)     │
│ Chips available: 3                  │
└─────────────────────────────────────┘
```

### **2. Chip Selection**
```
┌─────────────────────────────────────┐
│ 🎯 Your Chips (3 available)         │
├─────────────────────────────────────┤
│ [🔄] Player Swap (Rare)             │
│ [🛡️] Shield (Rare)                 │
│ [⭐] Triple Captain (Epic)          │
└─────────────────────────────────────┘
```

### **3. Target Selection**
```
┌─────────────────────────────────────┐
│ 🎯 Select Target                    │
├─────────────────────────────────────┤
│ 👤 John Smith (1st) - 150 pts      │
│ 👤 Sarah Jones (2nd) - 145 pts     │
│ 👤 Mike Wilson (3rd) - 140 pts     │
└─────────────────────────────────────┘
```

### **4. Effect Preview**
```
┌─────────────────────────────────────┐
│ ⚡ Chip Effect Preview              │
├─────────────────────────────────────┤
│ Chip: Player Swap (Rare)            │
│ Target: John Smith                  │
│ Effect: Swap Salah for Sterling     │
│ Duration: 1 gameweek                │
│ Active: Next gameweek               │
│                                     │
│ [Confirm] [Cancel]                  │
└─────────────────────────────────────┘
```

## 🗄️ **Database Schema**

### **Core Tables**
```sql
-- Chip definitions
CREATE TABLE chip_definitions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  rarity VARCHAR(20) NOT NULL,
  effect_type VARCHAR(30) NOT NULL,
  icon VARCHAR(10) NOT NULL,
  color VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User chip inventory
CREATE TABLE user_chip_inventory (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  chip_def_id INTEGER NOT NULL REFERENCES chip_definitions(id),
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT true
);

-- Active chip effects
CREATE TABLE chip_effects (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  target_user_id UUID NOT NULL REFERENCES user_profiles(id),
  chip_type VARCHAR(50) NOT NULL,
  effect_data JSONB NOT NULL,
  gameweek INTEGER NOT NULL,
  active_until TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Gameweek status
CREATE TABLE gameweek_status (
  id SERIAL PRIMARY KEY,
  gameweek INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT false,
  deadline_time TIMESTAMP NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

## 🎯 **Implementation Phases**

### **Phase 1: Core System (2-3 days)**
- Database schema setup
- FPL API gameweek integration
- Basic chip definitions
- Poker chip UI components

### **Phase 2: Chip Effects (3-4 days)**
- Player targeting system
- Chip effect implementation
- Gameweek validation
- Notification system

### **Phase 3: Polish (2-3 days)**
- Animated chip interactions
- Sound effects
- Mobile optimization
- Performance tuning

### **Total Estimated Time: 7-10 days**

## 🎮 **Strategic Examples**

### **Early Game (Weeks 1-5)**
- **Shield** to protect early advantage
- **Player Swap** to steal their best performers
- **Bench Banish** to weaken their team

### **Mid Game (Weeks 6-15)**
- **Triple Captain** when confident in captain
- **Bench Boost** when you have strong bench
- **Captain Curse** for devastating blows

### **Late Game (Weeks 16-20)**
- **Captain Curse** for maximum impact
- **Player Swap** for strategic steals
- **Shield** to protect late lead

## 🚀 **Key Features**
- **FPL Integration**: Respects gameweek deadlines
- **Poker Chip Aesthetics**: Beautiful, tactile UI
- **Strategic Depth**: 6 focused, powerful effects
- **Fair Play**: Position-based drop rates
- **Engagement**: Daily loot box system
- **Social Interaction**: Direct player vs player effects

This streamlined system is much more focused and manageable while still providing deep strategic gameplay!
