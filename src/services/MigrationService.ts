import * as SQLite from 'expo-sqlite';
import { Migration, MigrationRecord } from '../types';

export class MigrationService {
  private db: SQLite.SQLiteDatabase | null = null;
  private migrations: Migration[] = [];

  constructor(database: SQLite.SQLiteDatabase) {
    this.db = database;
    this.initializeMigrations();
  }

  private initializeMigrations() {
    this.migrations = [
      {
        version: 1,
        name: 'initial_schema',
        description: 'Create initial database schema',
        up: async (db: SQLite.SQLiteDatabase) => {
          // This migration represents the current schema
          // Photos table
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS photos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              local_identifier TEXT UNIQUE NOT NULL,
              file_path TEXT,
              file_name TEXT,
              file_size INTEGER,
              width INTEGER,
              height INTEGER,
              creation_date DATETIME,
              modification_date DATETIME,
              hash_value TEXT,
              quality_score REAL DEFAULT 0.0,
              is_duplicate BOOLEAN DEFAULT FALSE,
              is_deleted BOOLEAN DEFAULT FALSE,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
          `);

          // Duplicate groups table
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS duplicate_groups (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              group_hash TEXT UNIQUE NOT NULL,
              photo_count INTEGER DEFAULT 0,
              total_size INTEGER DEFAULT 0,
              recommended_keep_id INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (recommended_keep_id) REFERENCES photos(id)
            );
          `);

          // Duplicate group photos junction table
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS duplicate_group_photos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              group_id INTEGER NOT NULL,
              photo_id INTEGER NOT NULL,
              is_recommended_keep BOOLEAN DEFAULT FALSE,
              FOREIGN KEY (group_id) REFERENCES duplicate_groups(id) ON DELETE CASCADE,
              FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
              UNIQUE(group_id, photo_id)
            );
          `);

          // Analysis sessions table
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS analysis_sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_uuid TEXT UNIQUE NOT NULL,
              total_photos INTEGER NOT NULL,
              analyzed_photos INTEGER DEFAULT 0,
              duplicates_found INTEGER DEFAULT 0,
              total_size_analyzed INTEGER DEFAULT 0,
              potential_space_saved INTEGER DEFAULT 0,
              start_time DATETIME NOT NULL,
              end_time DATETIME,
              status TEXT DEFAULT 'running',
              error_message TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
          `);

          // User settings table
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS user_settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
          `);

          // Create indexes for better performance
          await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_photos_hash ON photos(hash_value);
            CREATE INDEX IF NOT EXISTS idx_photos_duplicate ON photos(is_duplicate, is_deleted);
            CREATE INDEX IF NOT EXISTS idx_dgp_group ON duplicate_group_photos(group_id);
            CREATE INDEX IF NOT EXISTS idx_dgp_photo ON duplicate_group_photos(photo_id);
          `);
        }
      },
      // Future migrations will be added here
      {
        version: 2,
        name: 'add_photo_quality_indexes',
        description: 'Add performance indexes for photo quality queries',
        up: async (db: SQLite.SQLiteDatabase) => {
          await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_photos_quality ON photos(quality_score DESC);
            CREATE INDEX IF NOT EXISTS idx_photos_creation_date ON photos(creation_date DESC);
          `);
        },
        down: async (db: SQLite.SQLiteDatabase) => {
          await db.execAsync(`
            DROP INDEX IF EXISTS idx_photos_quality;
            DROP INDEX IF EXISTS idx_photos_creation_date;
          `);
        }
      }
    ];
  }

  async setupMigrationTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async getCurrentVersion(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync(`
        SELECT MAX(version) as version FROM migrations
      `);
      return (result as any)?.version || 0;
    } catch {
      // If migrations table doesn't exist, return 0
      return 0;
    }
  }

  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const results = await this.db.getAllAsync(`
        SELECT * FROM migrations ORDER BY version ASC
      `);
      return results.map(row => ({
        id: (row as any).id,
        version: (row as any).version,
        name: (row as any).name,
        applied_at: (row as any).applied_at
      }));
    } catch {
      return [];
    }
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const currentVersion = await this.getCurrentVersion();
    return this.migrations.filter(migration => migration.version > currentVersion);
  }

  async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.setupMigrationTable();
    
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Running ${pendingMigrations.length} migrations...`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`Applying migration ${migration.version}: ${migration.name}`);
        
        await this.db.execAsync('BEGIN TRANSACTION');
        
        // Run the migration
        await migration.up(this.db);
        
        // Record the migration
        await this.db.runAsync(`
          INSERT INTO migrations (version, name) VALUES (?, ?)
        `, [migration.version, migration.name]);
        
        await this.db.execAsync('COMMIT');
        
        console.log(`Migration ${migration.version} applied successfully`);
      } catch (error) {
        await this.db.execAsync('ROLLBACK');
        console.error(`Migration ${migration.version} failed:`, error);
        throw new Error(`Migration ${migration.version} failed: ${error}`);
      }
    }

    console.log('All migrations completed successfully');
  }

  async rollbackMigration(targetVersion: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const currentVersion = await this.getCurrentVersion();
    
    if (targetVersion >= currentVersion) {
      console.log('No rollback needed');
      return;
    }

    const migrationsToRollback = this.migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version); // Reverse order for rollback

    console.log(`Rolling back ${migrationsToRollback.length} migrations...`);

    for (const migration of migrationsToRollback) {
      if (!migration.down) {
        throw new Error(`Migration ${migration.version} does not support rollback`);
      }

      try {
        console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
        
        await this.db.execAsync('BEGIN TRANSACTION');
        
        // Run the rollback
        await migration.down(this.db);
        
        // Remove the migration record
        await this.db.runAsync(`
          DELETE FROM migrations WHERE version = ?
        `, [migration.version]);
        
        await this.db.execAsync('COMMIT');
        
        console.log(`Migration ${migration.version} rolled back successfully`);
      } catch (error) {
        await this.db.execAsync('ROLLBACK');
        console.error(`Rollback of migration ${migration.version} failed:`, error);
        throw new Error(`Rollback of migration ${migration.version} failed: ${error}`);
      }
    }

    console.log('Rollback completed successfully');
  }

  async resetDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('Resetting database...');

    try {
      await this.db.execAsync('BEGIN TRANSACTION');

      // Drop all tables in reverse dependency order
      const tables = [
        'duplicate_group_photos',
        'duplicate_groups', 
        'analysis_sessions',
        'user_settings',
        'photos',
        'migrations'
      ];

      for (const table of tables) {
        await this.db.execAsync(`DROP TABLE IF EXISTS ${table}`);
      }

      // Drop all indexes
      const indexes = [
        'idx_photos_hash',
        'idx_photos_duplicate',
        'idx_dgp_group',
        'idx_dgp_photo',
        'idx_photos_quality',
        'idx_photos_creation_date'
      ];

      for (const index of indexes) {
        await this.db.execAsync(`DROP INDEX IF EXISTS ${index}`);
      }

      await this.db.execAsync('COMMIT');
      
      console.log('Database reset completed');
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      console.error('Database reset failed:', error);
      throw error;
    }
  }

  getMigrationInfo(): { 
    total: number; 
    applied: number; 
    pending: number; 
    latestVersion: number 
  } {
    const totalMigrations = this.migrations.length;
    const latestVersion = Math.max(...this.migrations.map(m => m.version));
    
    return {
      total: totalMigrations,
      applied: 0, // Will be updated by async method
      pending: 0, // Will be updated by async method
      latestVersion
    };
  }

  async getMigrationStatus(): Promise<{
    currentVersion: number;
    latestVersion: number;
    appliedMigrations: MigrationRecord[];
    pendingMigrations: Migration[];
    isUpToDate: boolean;
  }> {
    const currentVersion = await this.getCurrentVersion();
    const latestVersion = Math.max(...this.migrations.map(m => m.version));
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = await this.getPendingMigrations();

    return {
      currentVersion,
      latestVersion,
      appliedMigrations,
      pendingMigrations,
      isUpToDate: currentVersion === latestVersion
    };
  }
}

export const createMigrationService = (database: SQLite.SQLiteDatabase): MigrationService => {
  return new MigrationService(database);
};