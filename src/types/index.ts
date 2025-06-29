export interface Photo {
  id: string;
  localIdentifier: string;
  uri: string;
  filename: string;
  fileSize: number;
  width: number;
  height: number;
  creationDate: Date;
  modificationDate: Date;
  mediaType: 'photo' | 'video';
}

export interface PhotoMetadata {
  id: string;
  localIdentifier: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  creationDate: string;
  modificationDate: string;
  hashValue?: string;
  qualityScore?: number;
  isDuplicate: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateGroup {
  id: string;
  groupHash: string;
  photoCount: number;
  totalSize: number;
  photos: PhotoMetadata[];
  recommendedKeepId?: string;
}

export interface AnalysisResult {
  totalPhotos: number;
  duplicatesFound: number;
  duplicateGroups: DuplicateGroup[];
  potentialSpaceSaved: number;
  processingTime: number;
}

export interface AnalysisSession {
  id: string;
  sessionUuid: string;
  totalPhotos: number;
  analyzedPhotos: number;
  duplicatesFound: number;
  totalSizeAnalyzed: number;
  potentialSpaceSaved: number;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'cancelled' | 'error';
  errorMessage?: string;
}

export interface UserSettings {
  autoDeleteDuplicates: boolean;
  confirmBeforeDelete: boolean;
  showAnalysisProgress: boolean;
  animateTransitions: boolean;
  firstLaunchCompleted: boolean;
}

export interface Migration {
  version: number;
  name: string;
  description: string;
  up: (db: any) => Promise<void>;
  down?: (db: any) => Promise<void>;
}

export interface MigrationRecord {
  id: number;
  version: number;
  name: string;
  applied_at: string;
}

export interface MigrationStatus {
  currentVersion: number;
  latestVersion: number;
  pendingMigrations: Migration[];
  appliedMigrations: MigrationRecord[];
  needsUpdate: boolean;
}