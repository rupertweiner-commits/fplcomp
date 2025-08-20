import { DraftService } from './draftService.js';

export class ChipService {
  constructor(draftServiceInstance = null) {
    this.draftService = draftServiceInstance || new DraftService();
    
    // Chip definitions with rarities and descriptions
    this.chipDefinitions = {
      COMMON: [
        {
          name: 'Captain Chaos',
          description: 'Force another user\'s captain choice to be randomized',
          weight: 20
        },
        {
          name: 'Bench Boost',
          description: 'Your bench player\'s points count this gameweek',
          weight: 25
        }
      ],
      RARE: [
        {
          name: 'Point Vampire',
          description: 'Steal 25% of another user\'s total gameweek points',
          weight: 15
        },
        {
          name: 'Transfer Hijack',
          description: 'Intercept another player\'s planned transfer and steal their target player',
          weight: 12
        },
        {
          name: 'Injury Report',
          description: 'Force another user to bench their highest-scoring player for 1 gameweek',
          weight: 10
        }
      ],
      EPIC: [
        {
          name: 'Team Scrambler',
          description: 'All users\' teams get randomly redistributed for 1 gameweek',
          weight: 8
        },
        {
          name: 'Reverse Psychology',
          description: 'Lowest scorer this gameweek gets highest scorer\'s points instead',
          weight: 6
        }
      ],
      LEGENDARY: [
        {
          name: 'Team Swap',
          description: 'Temporarily swap teams with another user for one gameweek',
          weight: 3
        }
      ]
    };

    // Gameweek-based drop chances (percentage chance per gameweek)
    this.dropChances = {
      1: 0.15,   // 15% chance in early gameweeks
      2: 0.20,
      3: 0.25,
      4: 0.20,
      5: 0.15,
      6: 0.30,   // Mid-season ramp up
      7: 0.35,
      8: 0.40,
      9: 0.45,
      10: 0.35,
      11: 0.40,
      12: 0.45,
      13: 0.50,  // Peak season
      14: 0.55,
      15: 0.60,
      16: 0.55,
      17: 0.50,
      18: 0.45,
      19: 0.50,  // Christmas period
      20: 0.55,
      21: 0.60,
      22: 0.65,
      23: 0.60,
      24: 0.55,
      25: 0.50,
      26: 0.45,
      27: 0.50,  // Final push
      28: 0.55,
      29: 0.60,
      30: 0.65,
      31: 0.70,
      32: 0.75,
      33: 0.80,
      34: 0.85,  // End season chaos
      35: 0.90,
      36: 0.95,
      37: 1.00,  // Final gameweeks guaranteed chips
      38: 1.00
    };

    // Position-based rarity modifiers (lower position = better chips)
    this.positionModifiers = {
      1: { COMMON: 0.7, RARE: 0.2, EPIC: 0.08, LEGENDARY: 0.02 }, // 1st place
      2: { COMMON: 0.6, RARE: 0.25, EPIC: 0.12, LEGENDARY: 0.03 }, // 2nd place
      3: { COMMON: 0.5, RARE: 0.30, EPIC: 0.15, LEGENDARY: 0.05 }, // 3rd place
      4: { COMMON: 0.4, RARE: 0.35, EPIC: 0.20, LEGENDARY: 0.05 }  // 4th place
    };
  }

  async initialize() {
    await this.draftService.initialize();
  }

  // Main method to check and distribute chips for a gameweek
  async processGameweekChips(gameweek) {
    try {
      // Get current standings to determine position-based bonuses
      const standings = await this.getCurrentStandings();
      const dropChance = this.dropChances[gameweek] || 0.3;

      console.log(`🎮 Processing chips for Gameweek ${gameweek} (${(dropChance * 100).toFixed(0)}% base chance)`);

      const chipDrops = [];

      // Check each user for chip drops
      for (let position = 1; position <= standings.length; position++) {
        const user = standings[position - 1];
        const shouldDrop = Math.random() < dropChance;

        if (shouldDrop) {
          const chip = this.generateChipForPosition(position, gameweek);
          if (chip) {
            await this.draftService.giveChipToUser(user.id, chip);
            chipDrops.push({
              user: user.username,
              position,
              chip: chip.name,
              rarity: chip.rarity
            });
            console.log(`📦 ${user.username} (${position}${this.getOrdinalSuffix(position)}) received ${chip.rarity} chip: ${chip.name}`);
          }
        }
      }

      return {
        gameweek,
        dropsProcessed: chipDrops.length,
        totalUsers: standings.length,
        dropChance: (dropChance * 100).toFixed(0) + '%',
        drops: chipDrops
      };

    } catch (error) {
      console.error('Error processing gameweek chips:', error);
      throw error;
    }
  }

  // Generate a chip based on user's current position
  generateChipForPosition(position, gameweek) {
    const modifiers = this.positionModifiers[position] || this.positionModifiers[4];
    const rarityRoll = Math.random();

    let selectedRarity;
    let cumulativeChance = 0;

    // Determine rarity based on position modifiers
    for (const [rarity, chance] of Object.entries(modifiers)) {
      cumulativeChance += chance;
      if (rarityRoll <= cumulativeChance) {
        selectedRarity = rarity;
        break;
      }
    }

    if (!selectedRarity || !this.chipDefinitions[selectedRarity]) {
      selectedRarity = 'COMMON'; // Fallback
    }

    // Select specific chip from rarity pool
    const rarityPool = this.chipDefinitions[selectedRarity];
    if (rarityPool.length === 0) return null;

    const chipIndex = Math.floor(Math.random() * rarityPool.length);
    const chipTemplate = rarityPool[chipIndex];

    return {
      ...chipTemplate,
      rarity: selectedRarity,
      gameweekReceived: gameweek
    };
  }

  // Get current user standings (simplified - would integrate with live scoring)
  async getCurrentStandings() {
    const draftStatus = this.draftService.getDraftStatus();
    
    // For now, return users in order. In production, this would be based on actual scores
    const users = draftStatus.users.map((user, index) => ({
      id: user.id,
      username: user.username,
      // Mock scoring for position calculation
      totalPoints: Math.floor(Math.random() * 100) + (4 - index) * 20 // Higher user IDs get slightly lower scores
    }));

    // Sort by points (highest first)
    return users.sort((a, b) => b.totalPoints - a.totalPoints);
  }

  // Simulate chip drops for testing
  async simulateChipDropsForGameweek(gameweek) {
    console.log(`🧪 Simulating chip drops for Gameweek ${gameweek}...`);
    return await this.processGameweekChips(gameweek);
  }

  // Schedule automatic chip processing (would be called by a cron job)
  async scheduleWeeklyChipDrop() {
    const draftStatus = this.draftService.getDraftStatus();
    const currentGameweek = draftStatus.currentGameweek || 1;
    
    // Only process if gameweek has progressed
    const lastProcessedGameweek = draftStatus.lastChipGameweek || 0;
    
    if (currentGameweek > lastProcessedGameweek) {
      const result = await this.processGameweekChips(currentGameweek);
      
      // Update last processed gameweek
      const status = this.draftService.getDraftStatus();
      status.lastChipGameweek = currentGameweek;
      await this.draftService.saveDraftData();
      
      return result;
    }
    
    return null;
  }

  // Utility methods
  getOrdinalSuffix(num) {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const remainder = num % 100;
    return suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0];
  }

  // Get chip statistics
  getChipStatistics() {
    return {
      totalChipTypes: Object.values(this.chipDefinitions).flat().length,
      rarityDistribution: Object.fromEntries(
        Object.entries(this.chipDefinitions).map(([rarity, chips]) => [rarity, chips.length])
      ),
      gameweekDropChances: this.dropChances,
      positionModifiers: this.positionModifiers
    };
  }

  // Manual chip distribution for testing/admin purposes
  async giveSpecificChip(userId, chipName, rarity = 'COMMON') {
    const allChips = Object.values(this.chipDefinitions).flat();
    const chipTemplate = allChips.find(chip => chip.name === chipName);
    
    if (!chipTemplate) {
      throw new Error(`Chip "${chipName}" not found`);
    }

    const chip = {
      ...chipTemplate,
      rarity,
      gameweekReceived: this.draftService.getDraftStatus().currentGameweek || 1
    };

    return await this.draftService.giveChipToUser(userId, chip);
  }
}
