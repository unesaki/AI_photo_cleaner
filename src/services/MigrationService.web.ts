// Web Mock version of MigrationService for testing
import type { MigrationStatus } from '../types';

class MockMigrationService {
  private currentVersion = 1;
  private targetVersion = 1;

  async getCurrentVersion(): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return this.currentVersion;
  }

  async getTargetVersion(): Promise<number> {
    return this.targetVersion;
  }

  async getMigrationStatus(): Promise<MigrationStatus> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      currentVersion: this.currentVersion,
      targetVersion: this.targetVersion,
      isUpToDate: this.currentVersion >= this.targetVersion,
      pendingMigrations: this.currentVersion < this.targetVersion 
        ? [`migration_${this.currentVersion + 1}`]
        : [],
      lastMigrationDate: Date.now() - 86400000 // 1 day ago
    };
  }

  async runMigrations(
    onProgress?: (current: number, total: number, description: string) => void
  ): Promise<void> {
    const migrationsToRun = this.targetVersion - this.currentVersion;
    
    if (migrationsToRun <= 0) {
      console.log('Mock: No migrations needed');
      return;
    }

    console.log(`Mock: Running ${migrationsToRun} migrations`);

    for (let i = 0; i < migrationsToRun; i++) {
      const migrationNumber = this.currentVersion + i + 1;
      const description = `Migration ${migrationNumber}: Mock migration`;
      
      if (onProgress) {
        onProgress(i, migrationsToRun, description);
      }

      // Simulate migration work
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`Mock: Completed migration ${migrationNumber}`);
    }

    if (onProgress) {
      onProgress(migrationsToRun, migrationsToRun, 'All migrations completed');
    }

    this.currentVersion = this.targetVersion;
    console.log('Mock: All migrations completed successfully');
  }

  async rollbackMigration(targetVersion: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (targetVersion >= this.currentVersion) {
      throw new Error('Cannot rollback to a version higher than or equal to current version');
    }

    console.log(`Mock: Rolling back from version ${this.currentVersion} to ${targetVersion}`);
    this.currentVersion = targetVersion;
    console.log('Mock: Rollback completed successfully');
  }

  async checkMigrationIntegrity(): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log('Mock: Migration integrity check passed');
    return true;
  }

  async resetMigrations(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    this.currentVersion = 0;
    console.log('Mock: Migration history reset');
  }

  async createBackup(): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const backupId = `mock_backup_${Date.now()}`;
    console.log(`Mock: Created backup with ID: ${backupId}`);
    return backupId;
  }

  async restoreBackup(backupId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(`Mock: Restored backup: ${backupId}`);
  }
}

export const migrationService = new MockMigrationService();