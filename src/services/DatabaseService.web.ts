// Web Mock version of DatabaseService for testing
import type { PhotoMetadata, DuplicateGroup, UserSettings, MigrationStatus } from '../types';

class MockDatabaseService {
  private mockPhotos: PhotoMetadata[] = [
    {
      id: '1',
      filePath: 'https://picsum.photos/400/400?random=1',
      fileName: 'photo1.jpg',
      fileSize: 2048000,
      width: 400,
      height: 400,
      createdAt: Date.now() - 86400000,
      modifiedAt: Date.now() - 86400000,
      hash: 'hash1',
      isDuplicate: false
    },
    {
      id: '2',
      filePath: 'https://picsum.photos/400/400?random=2',
      fileName: 'photo2.jpg',
      fileSize: 1536000,
      width: 400,
      height: 400,
      createdAt: Date.now() - 172800000,
      modifiedAt: Date.now() - 172800000,
      hash: 'hash2',
      isDuplicate: true
    },
    {
      id: '3',
      filePath: 'https://picsum.photos/400/400?random=3',
      fileName: 'photo3.jpg',
      fileSize: 1536000,
      width: 400,
      height: 400,
      createdAt: Date.now() - 172800000,
      modifiedAt: Date.now() - 172800000,
      hash: 'hash2', // Same hash as photo2
      isDuplicate: true
    },
    {
      id: '4',
      filePath: 'https://picsum.photos/400/400?random=4',
      fileName: 'photo4.jpg',
      fileSize: 3072000,
      width: 400,
      height: 400,
      createdAt: Date.now() - 259200000,
      modifiedAt: Date.now() - 259200000,
      hash: 'hash4',
      isDuplicate: false
    },
    {
      id: '5',
      filePath: 'https://picsum.photos/400/400?random=5',
      fileName: 'photo5.jpg',
      fileSize: 2560000,
      width: 400,
      height: 400,
      createdAt: Date.now() - 345600000,
      modifiedAt: Date.now() - 345600000,
      hash: 'hash5',
      isDuplicate: true
    },
    {
      id: '6',
      filePath: 'https://picsum.photos/400/400?random=6',
      fileName: 'photo6.jpg',
      fileSize: 2560000,
      width: 400,
      height: 400,
      createdAt: Date.now() - 345600000,
      modifiedAt: Date.now() - 345600000,
      hash: 'hash5', // Same hash as photo5
      isDuplicate: true
    }
  ];

  private mockDuplicateGroups: DuplicateGroup[] = [
    {
      id: 'group1',
      hash: 'hash2',
      photos: [
        this.mockPhotos[1], // photo2
        this.mockPhotos[2]  // photo3
      ],
      photoCount: 2,
      totalSize: 3072000,
      recommendedKeepId: '2',
      createdAt: Date.now() - 86400000
    },
    {
      id: 'group2',
      hash: 'hash5',
      photos: [
        this.mockPhotos[4], // photo5
        this.mockPhotos[5]  // photo6
      ],
      photoCount: 2,
      totalSize: 5120000,
      recommendedKeepId: '5',
      createdAt: Date.now() - 86400000
    }
  ];

  private mockSettings: UserSettings = {
    autoDeleteDuplicates: false,
    confirmBeforeDelete: true,
    showAnalysisProgress: true,
    animateTransitions: true,
    firstLaunchCompleted: true
  };

  private mockAnalysisSessions: any[] = [];

  async initialize(): Promise<void> {
    console.log('Mock DatabaseService initialized for web');
    // Simulate async initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async getAllPhotos(): Promise<PhotoMetadata[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    return [...this.mockPhotos];
  }

  async addPhoto(photo: Omit<PhotoMetadata, 'id'>): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const id = `mock_${Date.now()}`;
    const newPhoto: PhotoMetadata = {
      ...photo,
      id
    };
    this.mockPhotos.push(newPhoto);
    return id;
  }

  async savePhoto(photo: Omit<PhotoMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const id = Date.now();
    const now = new Date().toISOString();
    const newPhoto: PhotoMetadata = {
      ...photo,
      id: id.toString(),
      createdAt: now,
      updatedAt: now
    };
    this.mockPhotos.push(newPhoto);
    return id;
  }

  async updatePhoto(id: string, updates: Partial<PhotoMetadata>): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const index = this.mockPhotos.findIndex(p => p.id === id);
    if (index !== -1) {
      this.mockPhotos[index] = { ...this.mockPhotos[index], ...updates };
    }
  }

  async deletePhoto(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const index = this.mockPhotos.findIndex(p => p.id === id);
    if (index !== -1) {
      this.mockPhotos.splice(index, 1);
    }
    
    // Update duplicate groups
    this.mockDuplicateGroups.forEach(group => {
      group.photos = group.photos.filter(p => p.id !== id);
      group.photoCount = group.photos.length;
      group.totalSize = group.photos.reduce((sum, p) => sum + p.fileSize, 0);
    });
    
    // Remove empty groups
    this.mockDuplicateGroups = this.mockDuplicateGroups.filter(group => group.photos.length > 1);
  }

  async getDuplicateGroups(): Promise<DuplicateGroup[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...this.mockDuplicateGroups];
  }

  async addDuplicateGroup(group: Omit<DuplicateGroup, 'id'>): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const id = `group_${Date.now()}`;
    const newGroup: DuplicateGroup = {
      ...group,
      id
    };
    this.mockDuplicateGroups.push(newGroup);
    return id;
  }

  async deleteDuplicateGroup(groupId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const index = this.mockDuplicateGroups.findIndex(g => g.id === groupId);
    if (index !== -1) {
      this.mockDuplicateGroups.splice(index, 1);
    }
  }

  async getUserSettings(): Promise<UserSettings> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { ...this.mockSettings };
  }

  async setSetting(key: string, value: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (key in this.mockSettings) {
      (this.mockSettings as any)[key] = value === 'true' ? true : value === 'false' ? false : value;
    }
  }

  async clearAllData(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    this.mockPhotos = [];
    this.mockDuplicateGroups = [];
  }

  async resetDatabase(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Reset to initial state
    this.mockPhotos = [
      {
        id: '1',
        filePath: 'https://picsum.photos/400/400?random=1',
        fileName: 'photo1.jpg',
        fileSize: 2048000,
        width: 400,
        height: 400,
        createdAt: Date.now() - 86400000,
        modifiedAt: Date.now() - 86400000,
        hash: 'hash1',
        isDuplicate: false
      }
    ];
    this.mockDuplicateGroups = [];
  }

  async getStats(): Promise<{
    totalPhotos: number;
    duplicatePhotos: number;
    totalSize: number;
    duplicateSize: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const totalPhotos = this.mockPhotos.length;
    const duplicatePhotos = this.mockPhotos.filter(p => p.isDuplicate).length;
    const totalSize = this.mockPhotos.reduce((sum, p) => sum + p.fileSize, 0);
    const duplicateSize = this.mockPhotos
      .filter(p => p.isDuplicate)
      .reduce((sum, p) => sum + p.fileSize, 0);

    return {
      totalPhotos,
      duplicatePhotos,
      totalSize,
      duplicateSize
    };
  }

  // Migration methods (mocked)
  async getCurrentVersion(): Promise<number> {
    return 1;
  }

  async getMigrationStatus(): Promise<MigrationStatus> {
    return {
      currentVersion: 1,
      targetVersion: 1,
      isUpToDate: true,
      pendingMigrations: [],
      lastMigrationDate: Date.now()
    };
  }

  async runMigrations(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Mock migrations completed');
  }

  async createAnalysisSession(totalPhotos: number): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const sessionUuid = `session_${Date.now()}`;
    const session = {
      id: sessionUuid,
      sessionUuid,
      totalPhotos,
      analyzedPhotos: 0,
      duplicatesFound: 0,
      totalSizeAnalyzed: 0,
      potentialSpaceSaved: 0,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'running',
      errorMessage: null
    };
    this.mockAnalysisSessions.push(session);
    console.log('💾 Mock: Created analysis session:', sessionUuid);
    return sessionUuid;
  }

  async updateAnalysisSession(sessionUuid: string, updates: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const session = this.mockAnalysisSessions.find(s => s.sessionUuid === sessionUuid);
    if (session) {
      Object.assign(session, updates);
      console.log('💾 Mock: Updated analysis session:', sessionUuid, updates);
    }
  }

  async getLatestAnalysisSession(): Promise<any | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const sessions = this.mockAnalysisSessions.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    const latest = sessions[0] || null;
    console.log('💾 Mock: Latest analysis session:', latest);
    return latest;
  }
}

export const databaseService = new MockDatabaseService();