# 🎮 Chip System Flow Diagram

## 📊 **Complete Chip System Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHIP SYSTEM FLOW                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DAILY LOOT    │    │   CHIP USAGE    │    │   EFFECTS       │
│     BOX         │    │     FLOW        │    │   ENGINE        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ 1. Open Loot Box│    │ 1. Select Chip  │    │ 1. Apply Effect │
│ 2. Get Random   │    │ 2. Choose Target│    │ 2. Update Teams │
│    Chip         │    │ 3. Select Player│    │ 3. Send Notify  │
│ 3. Add to Inv   │    │ 4. Confirm Use  │    │ 4. Set Cooldown │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   COOLDOWN      │    │   VALIDATION    │    │   NOTIFICATIONS │
│   SYSTEM        │    │     CHECKS      │    │     SYSTEM      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 **Chip Categories Breakdown**

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHIP CATEGORIES                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SWAP CHIPS    │    │ SABOTAGE CHIPS  │    │ PROTECTION CHIPS│
│                 │    │                 │    │                 │
│ • Player Swap   │    │ • Bench Banish  │    │ • Shield        │
│ • Captain Swap  │    │ • Points Steal  │    │ • Counter Attack│
│ • Position Swap │    │ • Transfer Block│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐
│ TARGETING CHIPS │    │ CLASSIC FPL     │
│                 │    │ CHIPS           │
│ • Captain Curse │    │                 │
│ • Team Chaos    │    │ • Triple Captain│
│                 │    │ • Bench Boost   │
│                 │    │ • Wildcard      │
│                 │    │ • Free Hit      │
└─────────────────┘    └─────────────────┘
```

## 🎲 **Loot Box Drop Rates by Position**

```
┌─────────────────────────────────────────────────────────────────┐
│                    DROP RATES BY POSITION                      │
└─────────────────────────────────────────────────────────────────┘

Position 1:  [████████████████████████████████████████] 100%
             Common:40% Rare:35% Epic:20% Legendary:5%

Position 5:  [████████████████████████████████████████] 100%
             Common:50% Rare:30% Epic:15% Legendary:5%

Position 10: [████████████████████████████████████████] 100%
             Common:55% Rare:28% Epic:12% Legendary:5%
             +5% rare bonus

Position 15: [████████████████████████████████████████] 100%
             Common:60% Rare:25% Epic:10% Legendary:5%
             +10% rare bonus

Position 20: [████████████████████████████████████████] 100%
             Common:65% Rare:22% Epic:8% Legendary:5%
             +15% rare +5% epic bonus
```

## 🎮 **Chip Usage Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                      CHIP USAGE FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. OPEN LOOT BOX
   └── Daily reset at midnight
   └── Position-based drop rates
   └── Animated opening sequence

2. SELECT CHIP
   └── View available chips
   └── Check cooldowns
   └── Read chip description

3. CHOOSE TARGET
   └── Select opponent from leaderboard
   └── Check position restrictions
   └── Verify target availability

4. SELECT PLAYER (if required)
   └── Choose specific player
   └── View player stats
   └── Confirm selection

5. PREVIEW EFFECT
   └── Show what will happen
   └── Display duration
   └── Confirm or cancel

6. EXECUTE CHIP
   └── Apply effect to target
   └── Update both teams
   └── Send notifications

7. SET COOLDOWNS
   └── Chip cooldown (24h)
   └── Target cooldown (48h)
   └── Update timers
```

## 🛡️ **Anti-Gaming Measures**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANTI-GAMING MEASURES                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   COOLDOWNS     │    │   RESTRICTIONS  │    │   PROTECTIONS   │
│                 │    │                 │    │                 │
│ • Chip: 24h     │    │ • Position Lock │    │ • Shield Effect │
│ • Target: 48h   │    │ • Revenge Block │    │ • Counter Attack│
│ • Shield: 72h   │    │ • Distance Rule │    │ • Admin Review  │
│ • Legendary: 1w │    │ • Streak Bonus  │    │ • Fair Play     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 **Strategic Examples**

```
┌─────────────────────────────────────────────────────────────────┐
│                      STRATEGIC EXAMPLES                        │
└─────────────────────────────────────────────────────────────────┘

EARLY GAME (Weeks 1-5):
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Transfer Block  │    │ Position Swap   │    │ Shield          │
│                 │    │                 │    │                 │
│ Prevent rivals  │    │ Weaken their    │    │ Protect early   │
│ from building   │    │ strongest pos   │    │ advantage       │
│ teams           │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘

MID GAME (Weeks 6-15):
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Player Swap     │    │ Bench Banish    │    │ Points Steal    │
│                 │    │                 │    │                 │
│ Steal their     │    │ Remove key      │    │ Direct point    │
│ best players    │    │ players         │    │ advantage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘

LATE GAME (Weeks 16-20):
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Captain Curse   │    │ Team Chaos      │    │ Counter Attack  │
│                 │    │                 │    │                 │
│ Devastating     │    │ Complete        │    │ Turn their      │
│ blow to captain │    │ disruption      │    │ attack against  │
│                 │    │                 │    │ them            │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🗄️ **Database Schema Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ chip_definitions│    │user_chip_inventory│   │  chip_effects   │
│                 │    │                 │    │                 │
│ • id            │    │ • user_id       │    │ • user_id       │
│ • name          │    │ • chip_def_id   │    │ • target_user_id│
│ • description   │    │ • quantity      │    │ • chip_type     │
│ • rarity        │    │ • acquired_at   │    │ • effect_data   │
│ • effect_type   │    │ • used_at       │    │ • active_until  │
│ • effect_value  │    │ • is_active     │    │ • is_active     │
└─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│chip_notifications│   │ chip_cooldowns  │    │loot_box_cooldowns│
│                 │    │                 │    │                 │
│ • user_id       │    │ • user_id       │    │ • user_id       │
│ • from_user_id  │    │ • target_user_id│    │ • last_opened   │
│ • chip_type     │    │ • chip_type     │    │ • next_available│
│ • message       │    │ • used_at       │    │ • streak_count  │
│ • read_at       │    │ • cooldown_until│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

This comprehensive chip system would create an incredibly engaging, strategic experience where every decision matters and players are constantly interacting with each other!
