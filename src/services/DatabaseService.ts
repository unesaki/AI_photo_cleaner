import * as SQLite from 'expo-sqlite';
import { PhotoMetadata, DuplicateGroup, AnalysisSession, UserSettings } from '../types';
import { createMigrationService, MigrationService } from './MigrationService';

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private migrationService: MigrationService | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('photo_cleaner.db');
      this.migrationService = createMigrationService(this.db);
      
      // Run migrations instead of creating tables directly
      await this.migrationService.runMigrations();
      await this.initializeSettings();
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  // Migration related methods
  async getMigrationStatus() {
    if (!this.migrationService) throw new Error('Migration service not initialized');
    return await this.migrationService.getMigrationStatus();
  }

  async runMigrations(): Promise<void> {
    if (!this.migrationService) throw new Error('Migration service not initialized');
    await this.migrationService.runMigrations();
  }

  async rollbackToVersion(version: number): Promise<void> {
    if (!this.migrationService) throw new Error('Migration service not initialized');
    await this.migrationService.rollbackMigration(version);
  }

  async resetDatabase(): Promise<void> {
    if (!this.migrationService) throw new Error('Migration service not initialized');
    await this.migrationService.resetDatabase();
    
    // Reinitialize after reset
    await this.initialize();
  }

  private async initializeSettings(): Promise<void> {
    const defaultSettings = {
      autoDeleteDuplicates: 'false',
      confirmBeforeDelete: 'true',
      showAnalysisProgress: 'true',
      animateTransitions: 'true',
      firstLaunchCompleted: 'false'
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      await this.db!.runAsync(
        'INSERT OR IGNORE INTO user_settings (key, value) VALUES (?, ?)',
        [key, value]
      );
    }
  }

  // Photos CRUD operations
  async savePhoto(photo: Omit<PhotoMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if photo already exists
    const exists = await this.checkPhotoExists(photo.localIdentifier);
    if (exists) {
      console.log('Photo already exists, skipping:', photo.fileName);
      // Return existing photo ID
      const existingPhoto = await this.db.getFirstAsync(`
        SELECT id FROM photos WHERE local_identifier = ?
      `, [photo.localIdentifier]);
      return (existingPhoto as any).id;
    }

    try {
      const result = await this.db.runAsync(`
        INSERT INTO photos (
          local_identifier, file_path, file_name, file_size, width, height,
          creation_date, modification_date, hash_value, quality_score,
          is_duplicate, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        photo.localIdentifier,
        photo.filePath,
        photo.fileName,
        photo.fileSize,
        photo.width,
        photo.height,
        photo.creationDate,
        photo.modificationDate,
        photo.hashValue || null,
        photo.qualityScore || 0.0,
        photo.isDuplicate ? 1 : 0,
        photo.isDeleted ? 1 : 0
      ]);

      return result.lastInsertRowId;
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        console.warn('UNIQUE constraint failed for photo:', photo.fileName, 'This should have been caught by checkPhotoExists');
        // Fallback: return existing photo ID
        const existingPhoto = await this.db.getFirstAsync(`
          SELECT id FROM photos WHERE local_identifier = ?
        `, [photo.localIdentifier]);
        return existingPhoto ? (existingPhoto as any).id : 0;
      }
      throw error;
    }
  }

  async getPhoto(id: number): Promise<PhotoMetadata | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(`
      SELECT * FROM photos WHERE id = ?
    `, [id]);

    return result ? this.mapRowToPhoto(result as any) : null;
  }

  async checkPhotoExists(localIdentifier: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(`
      SELECT id FROM photos WHERE local_identifier = ?
    `, [localIdentifier]);

    return result !== null;
  }

  async getAllPhotos(): Promise<PhotoMetadata[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(`
      SELECT * FROM photos WHERE is_deleted = FALSE ORDER BY creation_date DESC
    `);

    return result.map(row => this.mapRowToPhoto(row as any));
  }

  async updatePhoto(id: number, updates: Partial<PhotoMetadata>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setClause = Object.keys(updates).map(key => `${this.camelToSnake(key)} = ?`).join(', ');
    const values = Object.values(updates);

    await this.db.runAsync(`
      UPDATE photos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [...values, id]);
  }

  // Duplicate groups operations
  async createDuplicateGroup(groupHash: string, photoIds: number[]): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    console.log(`📊 Creating duplicate group with hash: ${groupHash.substring(0, 16)}...`);
    console.log(`📊 Photo IDs: [${photoIds.join(', ')}]`);

    try {
      // Start transaction
      await this.db.execAsync('BEGIN TRANSACTION');

      // Check if group with this hash already exists
      const existingGroup = await this.db.getFirstAsync(`
        SELECT id FROM duplicate_groups WHERE group_hash = ?
      `, [groupHash]);

      if (existingGroup) {
        await this.db.execAsync('ROLLBACK');
        const existingId = (existingGroup as any).id;
        console.log(`📊 ⚠️ Group with hash ${groupHash.substring(0, 16)}... already exists (ID: ${existingId})`);
        console.log(`📊 🔄 Returning existing group ID instead of creating new one`);
        return existingId;
      }

      // Create group with unique group_hash
      const groupResult = await this.db.runAsync(`
        INSERT INTO duplicate_groups (group_hash, photo_count, total_size)
        VALUES (?, ?, 0)
      `, [groupHash, photoIds.length]);

      const groupId = groupResult.lastInsertRowId;
      console.log(`📊 ✅ Created new duplicate group with ID: ${groupId}`);

      // Add photos to group
      for (let i = 0; i < photoIds.length; i++) {
        const photoId = photoIds[i];
        const isRecommendedKeep = i === 0; // First photo is recommended to keep

        await this.db.runAsync(`
          INSERT INTO duplicate_group_photos (group_id, photo_id, is_recommended_keep)
          VALUES (?, ?, ?)
        `, [groupId, photoId, isRecommendedKeep ? 1 : 0]);

        // Update photo as duplicate
        await this.db.runAsync(`
          UPDATE photos SET is_duplicate = TRUE WHERE id = ?
        `, [photoId]);
      }

      // Update total size
      await this.updateGroupTotalSize(groupId);

      await this.db.execAsync('COMMIT');
      return groupId;
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      throw error;
    }
  }

  async getDuplicateGroups(): Promise<DuplicateGroup[]> {
    if (!this.db) throw new Error('Database not initialized');

    const groups = await this.db.getAllAsync(`
      SELECT * FROM duplicate_groups ORDER BY total_size DESC
    `);

    const result: DuplicateGroup[] = [];

    for (const group of groups) {
      const photos = await this.db.getAllAsync(`
        SELECT p.*, dgp.is_recommended_keep
        FROM photos p
        JOIN duplicate_group_photos dgp ON p.id = dgp.photo_id
        WHERE dgp.group_id = ? AND p.is_deleted = FALSE
        ORDER BY dgp.is_recommended_keep DESC, p.quality_score DESC
      `, [(group as any).id]);

      result.push({
        id: (group as any).id.toString(),
        groupHash: (group as any).group_hash,
        photoCount: (group as any).photo_count,
        totalSize: (group as any).total_size,
        photos: photos.map(photo => this.mapRowToPhoto(photo as any)),
        recommendedKeepId: (group as any).recommended_keep_id?.toString()
      });
    }

    return result;
  }

  private async updateGroupTotalSize(groupId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      UPDATE duplicate_groups 
      SET total_size = (
        SELECT COALESCE(SUM(p.file_size), 0)
        FROM photos p
        JOIN duplicate_group_photos dgp ON p.id = dgp.photo_id
        WHERE dgp.group_id = ? AND p.is_deleted = FALSE
      )
      WHERE id = ?
    `, [groupId, groupId]);
  }

  async markGroupAsNotDuplicate(groupId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const groupIdNum = parseInt(groupId);
    
    try {
      // Begin transaction
      await this.db.runAsync('BEGIN TRANSACTION');
      
      // Mark the group as not duplicate by setting a flag or deleting it
      // For now, we'll delete the group and its associations
      await this.db.runAsync(`
        DELETE FROM duplicate_group_photos WHERE group_id = ?
      `, [groupIdNum]);
      
      await this.db.runAsync(`
        DELETE FROM duplicate_groups WHERE id = ?
      `, [groupIdNum]);
      
      // Commit transaction
      await this.db.runAsync('COMMIT');
      
      console.log(`✅ Successfully marked group ${groupId} as not duplicate and removed from database`);
    } catch (error) {
      // Rollback on error
      await this.db.runAsync('ROLLBACK');
      console.error(`❌ Failed to mark group ${groupId} as not duplicate:`, error);
      throw error;
    }
  }

  // Analysis sessions operations
  async createAnalysisSession(totalPhotos: number): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const sessionUuid = Date.now().toString() + Math.random().toString(36).substring(2, 11);

    await this.db.runAsync(`
      INSERT INTO analysis_sessions (
        session_uuid, total_photos, start_time
      ) VALUES (?, ?, ?)
    `, [sessionUuid, totalPhotos, new Date().toISOString()]);

    return sessionUuid;
  }

  async updateAnalysisSession(sessionUuid: string, updates: Partial<AnalysisSession>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setClause = Object.keys(updates).map(key => `${this.camelToSnake(key)} = ?`).join(', ');
    const values = Object.values(updates);

    await this.db.runAsync(`
      UPDATE analysis_sessions SET ${setClause} WHERE session_uuid = ?
    `, [...values, sessionUuid]);
  }

  async getLatestAnalysisSession(): Promise<AnalysisSession | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(`
      SELECT * FROM analysis_sessions ORDER BY created_at DESC LIMIT 1
    `);

    return result ? this.mapRowToSession(result as any) : null;
  }

  // User settings operations
  async getSetting(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(`
      SELECT value FROM user_settings WHERE key = ?
    `, [key]);

    return result ? (result as any).value : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      INSERT OR REPLACE INTO user_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [key, value]);
  }

  async getUserSettings(): Promise<UserSettings> {
    const settings = await this.db!.getAllAsync('SELECT * FROM user_settings');
    const settingsMap = new Map(settings.map(s => [(s as any).key, (s as any).value]));

    return {
      autoDeleteDuplicates: settingsMap.get('autoDeleteDuplicates') === 'true',
      confirmBeforeDelete: settingsMap.get('confirmBeforeDelete') === 'true',
      showAnalysisProgress: settingsMap.get('showAnalysisProgress') === 'true',
      animateTransitions: settingsMap.get('animateTransitions') === 'true',
      firstLaunchCompleted: settingsMap.get('firstLaunchCompleted') === 'true'
    };
  }

  // Utility methods
  private mapRowToPhoto(row: any): PhotoMetadata {
    return {
      id: row.id.toString(),
      localIdentifier: row.local_identifier,
      filePath: row.file_path,
      fileName: row.file_name,
      fileSize: row.file_size,
      width: row.width,
      height: row.height,
      creationDate: row.creation_date,
      modificationDate: row.modification_date,
      hashValue: row.hash_value,
      qualityScore: row.quality_score,
      isDuplicate: Boolean(row.is_duplicate),
      isDeleted: Boolean(row.is_deleted),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToSession(row: any): AnalysisSession {
    return {
      id: row.id.toString(),
      sessionUuid: row.session_uuid,
      totalPhotos: row.total_photos,
      analyzedPhotos: row.analyzed_photos,
      duplicatesFound: row.duplicates_found,
      totalSizeAnalyzed: row.total_size_analyzed,
      potentialSpaceSaved: row.potential_space_saved,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      errorMessage: row.error_message
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // Clean up
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

// Singleton instance
export const databaseService = new DatabaseService();