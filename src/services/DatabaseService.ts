import * as SQLite from 'expo-sqlite';
import { PhotoMetadata, DuplicateGroup, AnalysisSession, UserSettings } from '../types';

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('photo_cleaner.db');
      await this.createTables();
      await this.initializeSettings();
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Photos table
    await this.db.execAsync(`
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
    await this.db.execAsync(`
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
    await this.db.execAsync(`
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
    await this.db.execAsync(`
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
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_photos_hash ON photos(hash_value);
      CREATE INDEX IF NOT EXISTS idx_photos_duplicate ON photos(is_duplicate, is_deleted);
      CREATE INDEX IF NOT EXISTS idx_dgp_group ON duplicate_group_photos(group_id);
      CREATE INDEX IF NOT EXISTS idx_dgp_photo ON duplicate_group_photos(photo_id);
    `);
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
  }

  async getPhoto(id: number): Promise<PhotoMetadata | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(`
      SELECT * FROM photos WHERE id = ?
    `, [id]);

    return result ? this.mapRowToPhoto(result as any) : null;
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

    try {
      // Start transaction
      await this.db.execAsync('BEGIN TRANSACTION');

      // Create group
      const groupResult = await this.db.runAsync(`
        INSERT INTO duplicate_groups (group_hash, photo_count, total_size)
        VALUES (?, ?, 0)
      `, [groupHash, photoIds.length]);

      const groupId = groupResult.lastInsertRowId;

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

  // Analysis sessions operations
  async createAnalysisSession(totalPhotos: number): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const sessionUuid = Date.now().toString() + Math.random().toString(36).substr(2, 9);

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