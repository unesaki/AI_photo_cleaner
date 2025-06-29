import { AnalysisResult, DuplicateGroup, Photo } from '../types';
import { databaseService } from './DatabaseService';
import { photoService } from './PhotoService';
import { perceptualHashService } from './PerceptualHashService';

export class DuplicateDetectionService {
  
  /**
   * Get the stored hash for a photo from database
   */
  private async getPhotoHash(photo: Photo): Promise<string | null> {
    try {
      const allPhotos = await databaseService.getAllPhotos();
      const metadata = allPhotos.find(p => p.localIdentifier === photo.localIdentifier);
      return metadata?.hashValue || null;
    } catch (error) {
      console.error('🔬 Failed to get photo hash:', error);
      return null;
    }
  }
  
  async analyzePhotos(
    photos: Photo[], 
    onProgress?: (progress: number, message: string) => void
  ): Promise<AnalysisResult> {
    console.log('🔬 analyzePhotos started with', photos.length, 'photos');
    const startTime = Date.now();
    let analyzedCount = 0;
    
    try {
      // Create analysis session
      console.log('🔬 Creating analysis session...');
      const sessionUuid = await databaseService.createAnalysisSession(photos.length);
      console.log('🔬 Analysis session created:', sessionUuid);
    
      onProgress?.(0, '写真を準備中...');
      
      // Save photos to database and calculate hashes
      console.log('🔬 Initializing data structures...');
      const photoMap = new Map<string, Photo>();
      const hashMap = new Map<string, Photo[]>();
      console.log('🔬 Data structures initialized');
      
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        try {
          console.log(`🔬 Processing photo ${i + 1}/${photos.length}: ${photo.filename}`);
          
          // Calculate visual-only hash for duplicate detection  
          console.log('🔬 Calculating visual-only hash for:', photo.filename);
          const hash = await perceptualHashService.calculateVisualHash(photo);
          console.log('🔬 Visual hash calculated:', hash.substring(0, 8) + '...');
          
          // Save photo metadata to database
          console.log('🔬 Converting to photo metadata...');
          const photoMetadata = photoService.convertToPhotoMetadata(photo);
          photoMetadata.hashValue = hash;
          console.log('🔬 Photo metadata created, saving to database...');
          
          await databaseService.savePhoto(photoMetadata);
          console.log('🔬 Photo saved to database');
          
          // Group by hash for duplicate detection
          if (!hashMap.has(hash)) {
            hashMap.set(hash, []);
          }
          hashMap.get(hash)!.push(photo);
          photoMap.set(photo.id, photo);
          
          analyzedCount++;
          const progress = (analyzedCount / photos.length) * 100;
          onProgress?.(progress, `分析中: ${analyzedCount}/${photos.length}枚`);
          
        } catch (error) {
          console.error('🔬 ❌ Failed to process photo:', photo.filename);
          console.error('🔬 ❌ Error details:', error);
          console.error('🔬 ❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
          // Continue with next photo
        }
      }
      
      onProgress?.(90, '重複グループを作成中...');
      
      // Enhanced duplicate detection using Hamming distance for visual similarity
      console.log('🔬 Starting visual duplicate detection with Hamming distance...');
      const duplicateGroups: DuplicateGroup[] = [];
      let totalDuplicates = 0;
      let totalSpaceSaved = 0;
      
      // Group photos by similarity using Hamming distance
      const allPhotos = Array.from(photoMap.values());
      const processedPhotos = new Set<string>();
      const confirmedDuplicates: Photo[][] = [];
      
      for (let i = 0; i < allPhotos.length; i++) {
        if (processedPhotos.has(allPhotos[i].id)) continue;
        
        const currentPhoto = allPhotos[i];
        const currentHash = await this.getPhotoHash(currentPhoto);
        if (!currentHash) continue;
        
        const similarGroup: Photo[] = [currentPhoto];
        processedPhotos.add(currentPhoto.id);
        
        // Find all photos similar to current photo using Hamming distance
        for (let j = i + 1; j < allPhotos.length; j++) {
          if (processedPhotos.has(allPhotos[j].id)) continue;
          
          const comparePhoto = allPhotos[j];
          const compareHash = await this.getPhotoHash(comparePhoto);
          if (!compareHash) continue;
          
          // Use perceptual hash service to check visual similarity
          if (perceptualHashService.isVisuallySimilar(currentHash, compareHash, 10)) {
            similarGroup.push(comparePhoto);
            processedPhotos.add(comparePhoto.id);
            console.log(`🔬 Found visually similar photo: ${comparePhoto.filename} (Hamming distance ≤10)`);
          }
        }
        
        // Only create group if we found duplicates
        if (similarGroup.length > 1) {
          confirmedDuplicates.push(similarGroup);
          console.log(`🔬 Created duplicate group with ${similarGroup.length} visually similar photos`);
        }
      }
          
      // Create duplicate groups for confirmed duplicates
      for (const duplicateSet of confirmedDuplicates) {
        try {
          // Get photo metadata from database
          const photoMetadataList = [];
          for (const photo of duplicateSet) {
            const allPhotos = await databaseService.getAllPhotos();
            const metadata = allPhotos.find(p => p.localIdentifier === photo.localIdentifier);
            if (metadata) {
              photoMetadataList.push(metadata);
            }
          }
          
          if (photoMetadataList.length > 1) {
            // Use hash from first photo as group hash
            const groupHash = photoMetadataList[0].hashValue || 'unknown';
            
            // Create duplicate group in database
            const photoIds = photoMetadataList.map(p => typeof p.id === 'string' ? parseInt(p.id) : p.id);
            const groupId = await databaseService.createDuplicateGroup(groupHash, photoIds);
            
            // Calculate space that could be saved (all but one photo)
            const totalSize = duplicateSet.reduce((sum, p) => sum + p.fileSize, 0);
            const largestPhoto = duplicateSet.reduce((largest, current) => 
              current.fileSize > largest.fileSize ? current : largest
            );
            const spaceSaved = totalSize - largestPhoto.fileSize;
            
            duplicateGroups.push({
              id: groupId.toString(),
              groupHash: groupHash,
              photoCount: duplicateSet.length,
              totalSize: totalSize,
              photos: photoMetadataList,
              recommendedKeepId: photoMetadataList.find(p => p.localIdentifier === largestPhoto.localIdentifier)?.id || photoMetadataList[0].id
            });
            
            totalDuplicates += duplicateSet.length - 1; // Count duplicates to remove
            totalSpaceSaved += spaceSaved;
            
            console.log(`🔬 ✅ Created duplicate group: ${duplicateSet.length} photos, ${(spaceSaved / 1024 / 1024).toFixed(1)}MB savings`);
          }
        } catch (error) {
          console.error('🔬 ❌ Failed to create duplicate group:', error);
        }
      }
      
      const processingTime = Date.now() - startTime;
      
      // Update analysis session
      await databaseService.updateAnalysisSession(sessionUuid, {
        analyzedPhotos: analyzedCount,
        duplicatesFound: totalDuplicates,
        totalSizeAnalyzed: photos.reduce((sum, p) => sum + p.fileSize, 0),
        potentialSpaceSaved: totalSpaceSaved,
        endTime: new Date().toISOString(),
        status: 'completed'
      });
      
      onProgress?.(100, '分析完了！');
      
      return {
        totalPhotos: photos.length,
        duplicatesFound: totalDuplicates,
        duplicateGroups,
        potentialSpaceSaved: totalSpaceSaved,
        processingTime
      };
      
    } catch (error) {
      console.error('🔬 ❌ Analysis failed at top level:', error);
      console.error('🔬 ❌ Error type:', typeof error);
      console.error('🔬 ❌ Error message:', error instanceof Error ? error.message : String(error));
      console.error('🔬 ❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      try {
        // Update session with error
        console.log('🔬 Updating session with error...');
        const sessionUuid = 'error-session'; // Fallback if sessionUuid is not available
        await databaseService.updateAnalysisSession(sessionUuid, {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          endTime: new Date().toISOString()
        });
      } catch (updateError) {
        console.error('🔬 ❌ Failed to update session with error:', updateError);
      }
      
      throw error;
    }
  }
  
  
  async deleteDuplicatePhotos(_groupId: string, photoIdsToDelete: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deletedCount = 0;
    
    try {
      // Delete from device
      const deleteResult = await photoService.deletePhotos(photoIdsToDelete);
      deletedCount = deleteResult.deletedCount;
      
      // Mark as deleted in database
      for (const photoId of photoIdsToDelete) {
        try {
          const id = typeof photoId === 'string' ? parseInt(photoId) : photoId;
          await databaseService.updatePhoto(id, { isDeleted: true });
        } catch {
          errors.push(`Failed to update database for photo ${photoId}`);
        }
      }
      
      return {
        success: deletedCount > 0,
        deletedCount,
        errors
      };
      
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        deletedCount: 0,
        errors
      };
    }
  }
  
  formatAnalysisResult(result: AnalysisResult): string {
    const { totalPhotos, duplicatesFound, potentialSpaceSaved, processingTime } = result;
    
    const spaceMB = (potentialSpaceSaved / (1024 * 1024)).toFixed(1);
    const timeSeconds = (processingTime / 1000).toFixed(1);
    
    return `分析完了: ${totalPhotos}枚中${duplicatesFound}枚の重複を発見。` +
           `${spaceMB}MBの容量削減が可能です。処理時間: ${timeSeconds}秒`;
  }
}

export const duplicateDetectionService = new DuplicateDetectionService();