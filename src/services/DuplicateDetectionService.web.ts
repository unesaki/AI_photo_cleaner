// Web Mock version of DuplicateDetectionService for testing
import { databaseService } from './DatabaseService.web';
import type { PhotoMetadata, DuplicateGroup } from '../types';

class MockDuplicateDetectionService {
  private isAnalyzing = false;

  async analyzePhotos(
    onProgress?: (current: number, total: number) => void
  ): Promise<{
    duplicateGroups: DuplicateGroup[];
    totalDuplicates: number;
    spaceSaved: number;
  }> {
    if (this.isAnalyzing) {
      throw new Error('Analysis already in progress');
    }

    this.isAnalyzing = true;

    try {
      const photos = await databaseService.getAllPhotos();
      
      // Simulate analysis progress
      const total = photos.length;
      for (let i = 0; i <= total; i++) {
        if (onProgress) {
          onProgress(i, total);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Get existing duplicate groups (already mocked in DatabaseService)
      const duplicateGroups = await databaseService.getDuplicateGroups();
      
      const totalDuplicates = duplicateGroups.reduce(
        (sum, group) => sum + (group.photoCount - 1), 
        0
      );
      
      const spaceSaved = duplicateGroups.reduce(
        (sum, group) => {
          // Calculate space saved by keeping only one photo per group
          const groupSpaceSaved = group.photos
            .filter(photo => photo.id !== group.recommendedKeepId)
            .reduce((groupSum, photo) => groupSum + photo.fileSize, 0);
          return sum + groupSpaceSaved;
        },
        0
      );

      return {
        duplicateGroups,
        totalDuplicates,
        spaceSaved
      };
    } finally {
      this.isAnalyzing = false;
    }
  }

  async deleteDuplicatePhotos(
    groupId: string, 
    photoIds: string[]
  ): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deletedCount = 0;

    // Simulate deletion process
    for (const photoId of photoIds) {
      try {
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate deletion time
        await databaseService.deletePhoto(photoId);
        deletedCount++;
      } catch (error) {
        errors.push(`Failed to delete photo ${photoId}: ${error}`);
      }
    }

    // Update or remove the duplicate group if necessary
    const duplicateGroups = await databaseService.getDuplicateGroups();
    const group = duplicateGroups.find(g => g.id === groupId);
    
    if (group && group.photos.length <= 1) {
      // Remove the group if it has 1 or fewer photos left
      await databaseService.deleteDuplicateGroup(groupId);
    }

    return {
      deletedCount,
      errors
    };
  }

  isAnalysisInProgress(): boolean {
    return this.isAnalyzing;
  }

  async calculatePhotoHash(photoPath: string): Promise<string> {
    // Mock hash calculation
    await new Promise(resolve => setTimeout(resolve, 50));
    return `mock_hash_${photoPath.split('/').pop()}_${Date.now()}`;
  }

  async findSimilarPhotos(
    targetHash: string, 
    threshold: number = 0.95
  ): Promise<PhotoMetadata[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const photos = await databaseService.getAllPhotos();
    return photos.filter(photo => 
      photo.hash === targetHash && photo.hash !== undefined
    );
  }

  async generateDuplicateReport(): Promise<{
    totalGroups: number;
    totalDuplicates: number;
    potentialSpaceSaved: number;
    groupDetails: Array<{
      groupId: string;
      photoCount: number;
      groupSize: number;
      recommendedAction: string;
    }>;
  }> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const duplicateGroups = await databaseService.getDuplicateGroups();
    
    const totalGroups = duplicateGroups.length;
    const totalDuplicates = duplicateGroups.reduce(
      (sum, group) => sum + (group.photoCount - 1), 
      0
    );
    const potentialSpaceSaved = duplicateGroups.reduce(
      (sum, group) => {
        const spaceSaved = group.photos
          .filter(photo => photo.id !== group.recommendedKeepId)
          .reduce((groupSum, photo) => groupSum + photo.fileSize, 0);
        return sum + spaceSaved;
      },
      0
    );

    const groupDetails = duplicateGroups.map(group => ({
      groupId: group.id,
      photoCount: group.photoCount,
      groupSize: group.totalSize,
      recommendedAction: `Keep photo ${group.recommendedKeepId}, delete ${group.photoCount - 1} duplicates`
    }));

    return {
      totalGroups,
      totalDuplicates,
      potentialSpaceSaved,
      groupDetails
    };
  }
}

export const duplicateDetectionService = new MockDuplicateDetectionService();