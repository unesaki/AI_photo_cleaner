// Web Mock version of DuplicateDetectionService for testing
import { databaseService } from './DatabaseService.web';
import { MockDataService } from './MockDataService';
import { ImageHashService } from './ImageHashService';
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
      console.log('🧠 Mock: Starting duplicate analysis...');
      
      // Use MockDataService for realistic duplicate detection
      const mockStats = MockDataService.getStats();
      const duplicateGroups = MockDataService.getDuplicateGroups();
      
      console.log('🧠 Mock: Found duplicate groups:', duplicateGroups.length);
      
      // Simulate analysis progress
      const total = mockStats.totalPhotos;
      for (let i = 0; i <= total; i++) {
        if (onProgress) {
          onProgress(i, total);
        }
        await new Promise(resolve => setTimeout(resolve, 150)); // Slower for better UX
      }

      // Apply advanced duplicate detection using ImageHashService
      console.log('🧠 Applying advanced duplicate detection...');
      const advancedGroups = await this.applyAdvancedDuplicateDetection(duplicateGroups);
      
      // Convert to proper DuplicateGroup format
      const formattedGroups: DuplicateGroup[] = advancedGroups.map((group, index) => {
        const groupId = `group_${index + 1}`;
        const totalSize = group.reduce((sum, photo) => sum + photo.fileSize, 0);
        
        // Select the highest quality photo as the one to keep
        const recommendedKeepId = group.reduce((best, current) => 
          (current.qualityScore || 0) > (best.qualityScore || 0) ? current : best
        ).id;
        
        return {
          id: groupId,
          groupHash: group[0].hashValue!,
          photoCount: group.length,
          totalSize,
          photos: group,
          recommendedKeepId
        };
      });
      
      const totalDuplicates = formattedGroups.reduce(
        (sum, group) => sum + (group.photoCount - 1), 
        0
      );
      
      const spaceSaved = formattedGroups.reduce(
        (sum, group) => {
          // Calculate space saved by keeping only the recommended photo
          const groupSpaceSaved = group.photos
            .filter(photo => photo.id !== group.recommendedKeepId)
            .reduce((groupSum, photo) => groupSum + photo.fileSize, 0);
          return sum + groupSpaceSaved;
        },
        0
      );
      
      console.log('🧠 Mock: Analysis complete!', {
        totalGroups: formattedGroups.length,
        totalDuplicates,
        spaceSaved: `${(spaceSaved / 1024 / 1024).toFixed(1)}MB`,
        groups: formattedGroups.map(group => ({
          id: group.id,
          photoCount: group.photoCount,
          photos: group.photos.map(p => p.fileName),
          recommendedKeep: group.photos.find(p => p.id === group.recommendedKeepId)?.fileName
        }))
      });

      return {
        duplicateGroups: formattedGroups,
        totalDuplicates,
        spaceSaved
      };
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Apply advanced duplicate detection using perceptual hashing and similarity analysis
   */
  private async applyAdvancedDuplicateDetection(basicGroups: PhotoMetadata[][]): Promise<PhotoMetadata[][]> {
    const allPhotos = MockDataService.getMockPhotos();
    const refinedGroups: PhotoMetadata[][] = [];
    const processedIds = new Set<string>();

    console.log('🔍 Starting advanced duplicate analysis...');
    
    for (const photo of allPhotos) {
      if (processedIds.has(photo.id)) continue;

      // Calculate advanced hash for this photo
      const hash1 = await ImageHashService.calculateImageHash(
        photo.filePath,
        photo.fileName,
        photo.fileSize,
        photo.width,
        photo.height
      );

      const similarPhotos: PhotoMetadata[] = [photo];
      processedIds.add(photo.id);

      // Find similar photos using advanced comparison
      for (const otherPhoto of allPhotos) {
        if (processedIds.has(otherPhoto.id)) continue;

        const hash2 = await ImageHashService.calculateImageHash(
          otherPhoto.filePath,
          otherPhoto.fileName,
          otherPhoto.fileSize,
          otherPhoto.width,
          otherPhoto.height
        );

        const similarity = ImageHashService.calculateSimilarity(hash1, hash2);
        
        // Moderate threshold for testing (85% similarity)
        if (similarity >= 0.85) {
          similarPhotos.push(otherPhoto);
          processedIds.add(otherPhoto.id);
          console.log(`✅ Found duplicate: ${photo.fileName} ↔ ${otherPhoto.fileName} (${(similarity * 100).toFixed(1)}% similar)`);
        } else if (similarity >= 0.7) {
          console.log(`⚠️ Similar but not duplicate: ${photo.fileName} ↔ ${otherPhoto.fileName} (${(similarity * 100).toFixed(1)}% similar)`);
        } else if (similarity > 0) {
          console.log(`ℹ️ Low similarity: ${photo.fileName} ↔ ${otherPhoto.fileName} (${(similarity * 100).toFixed(1)}% similar)`);
        }
      }

      // Only add groups with 2 or more photos
      if (similarPhotos.length > 1) {
        refinedGroups.push(similarPhotos);
      }
    }

    console.log(`🧠 Advanced detection complete: Found ${refinedGroups.length} duplicate groups`);
    return refinedGroups;
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