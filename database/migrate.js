import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Path to the current data file
const draftDataPath = path.join(__dirname, '../data/draft.json');

async function migrateData() {
  try {
    console.log('🚀 Starting data migration from local files to PostgreSQL...');
    
    // Check if database is accessible
    const client = await pool.connect();
    console.log('✅ Database connection established');
    
    // Read current draft data
    let draftData;
    try {
      const dataContent = await fs.readFile(draftDataPath, 'utf8');
      draftData = JSON.parse(dataContent);
      console.log('✅ Current draft data loaded from file');
    } catch (error) {
      console.log('⚠️ No existing draft data found, starting fresh');
      draftData = {
        users: [
          { id: 1, username: 'Portia', team: [], activePlayers: [], benchedPlayer: null, captain: null, chips: [], usedChips: [] },
          { id: 2, username: 'Yasmin', team: [], activePlayers: [], benchedPlayer: null, captain: null, chips: [], usedChips: [] },
          { id: 3, username: 'Rupert', isAdmin: true, team: [], activePlayers: [], benchedPlayer: null, captain: null, chips: [], usedChips: [] },
          { id: 4, username: 'Will', team: [], activePlayers: [], benchedPlayer: null, captain: null, chips: [], usedChips: [] }
        ],
        draftedPlayers: [],
        draftOrder: [1, 2, 3, 4],
        currentDraftPick: 0,
        isDraftComplete: false,
        currentGameweek: 1,
        transfers: [],
        chipHistory: [],
        simulationHistory: {},
        simulationMode: false,
        realGameweek: null,
        lastUpdated: new Date().toISOString()
      };
    }

    // Start transaction
    await client.query('BEGIN');
    
    try {
      // Migrate users
      console.log('📊 Migrating users...');
      for (const user of draftData.users) {
        const { team, activePlayers, benchedPlayer, captain, chips, usedChips, ...userData } = user;
        
        // Insert or update user
        const userResult = await client.query(`
          INSERT INTO users (id, username, is_admin, created_at, updated_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            is_admin = EXCLUDED.is_admin,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `, [userData.id, userData.username, userData.isAdmin || false]);
        
        const userId = userResult.rows[0].id;
        console.log(`  ✅ User migrated: ${userData.username} (ID: ${userId})`);
        
        // Migrate user's team
        if (team && team.length > 0) {
          console.log(`  📋 Migrating team for ${userData.username}...`);
          
          for (let i = 0; i < team.length; i++) {
            const playerId = team[i];
            const isActive = activePlayers.includes(playerId);
            const isCaptain = captain === playerId;
            const isBenched = benchedPlayer === playerId;
            
            await client.query(`
              INSERT INTO user_teams (user_id, player_id, is_active, is_captain, is_benched)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (user_id, player_id) DO UPDATE SET
                is_active = EXCLUDED.is_active,
                is_captain = EXCLUDED.is_captain,
                is_benched = EXCLUDED.is_benched
            `, [userId, playerId, isActive, isCaptain, isBenched]);
          }
          
          console.log(`    ✅ Team migrated: ${team.length} players`);
        }
        
        // Migrate chip usage
        if (usedChips && usedChips.length > 0) {
          console.log(`  🎯 Migrating chip usage for ${userData.username}...`);
          
          for (const chip of usedChips) {
            await client.query(`
              INSERT INTO chip_usage (user_id, chip_type, gameweek, used_at)
              VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            `, [userId, chip.type || 'unknown', chip.gameweek || 1]);
          }
          
          console.log(`    ✅ Chip usage migrated: ${usedChips.length} chips`);
        }
      }
      
      // Migrate draft data
      console.log('📊 Migrating draft data...');
      await client.query(`
        UPDATE draft_data SET
          is_draft_complete = $1,
          current_draft_pick = $2,
          current_gameweek = $3,
          real_gameweek = $4,
          simulation_mode = $5,
          draft_order = $6,
          last_updated = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [
        draftData.isDraftComplete || false,
        draftData.currentDraftPick || 0,
        draftData.currentGameweek || 1,
        draftData.realGameweek,
        draftData.simulationMode || false,
        draftData.draftOrder || [1, 2, 3, 4]
      ]);
      console.log('  ✅ Draft data migrated');
      
      // Migrate drafted players
      if (draftData.draftedPlayers && draftData.draftedPlayers.length > 0) {
        console.log('📊 Migrating drafted players...');
        
        for (let i = 0; i < draftData.draftedPlayers.length; i++) {
          const playerId = draftData.draftedPlayers[i];
          const userIndex = i % draftData.users.length;
          const userId = draftData.users[userIndex].id;
          
          await client.query(`
            INSERT INTO drafted_players (player_id, user_id, draft_position)
            VALUES ($1, $2, $3)
            ON CONFLICT (player_id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              draft_position = EXCLUDED.draft_position
          `, [playerId, userId, i + 1]);
        }
        
        console.log(`  ✅ Drafted players migrated: ${draftData.draftedPlayers.length} players`);
      }
      
      // Migrate transfers
      if (draftData.transfers && draftData.transfers.length > 0) {
        console.log('📊 Migrating transfers...');
        
        for (const transfer of draftData.transfers) {
          await client.query(`
            INSERT INTO transfers (user_id, player_in_id, player_out_id, transfer_type, gameweek)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            transfer.userId || 1,
            transfer.playerInId,
            transfer.playerOutId,
            transfer.type || 'IN',
            transfer.gameweek || 1
          ]);
        }
        
        console.log(`  ✅ Transfers migrated: ${draftData.transfers.length} transfers`);
      }
      
      // Migrate simulation history
      if (draftData.simulationHistory && Object.keys(draftData.simulationHistory).length > 0) {
        console.log('📊 Migrating simulation history...');
        
        for (const [gameweek, data] of Object.entries(draftData.simulationHistory)) {
          await client.query(`
            INSERT INTO simulation_history (gameweek, simulation_data)
            VALUES ($1, $2)
            ON CONFLICT (gameweek) DO UPDATE SET
              simulation_data = EXCLUDED.simulation_data,
              created_at = CURRENT_TIMESTAMP
          `, [parseInt(gameweek), JSON.stringify(data)]);
        }
        
        console.log(`  ✅ Simulation history migrated: ${Object.keys(draftData.simulationHistory).length} gameweeks`);
      }
      
      // Commit transaction
      await client.query('COMMIT');
      console.log('✅ Data migration completed successfully!');
      
      // Create backup of original data
      const backupPath = path.join(__dirname, '../data/draft_backup_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
      await fs.writeFile(backupPath, JSON.stringify(draftData, null, 2));
      console.log(`💾 Original data backed up to: ${backupPath}`);
      
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Data migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateData();
}

export { migrateData };

