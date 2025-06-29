import { AnalysisResult, DuplicateGroup, Photo } from '../types';
import { databaseService } from './DatabaseService';
import { photoService } from './PhotoService';
import { perceptualHashService } from './PerceptualHashService';

export class DuplicateDetectionService {
  
  // メタデータキャッシュ - 処理開始時に一度だけ全写真データを取得
  private photoMetadataCache: Map<string, any> = new Map();
  
  /**
   * Initialize metadata cache to avoid repeated database queries
   */
  private async initializeMetadataCache(): Promise<void> {
    try {
      console.log('🔬 Initializing photo metadata cache...');
      const allPhotos = await databaseService.getAllPhotos();
      this.photoMetadataCache.clear();
      
      for (const photo of allPhotos) {
        this.photoMetadataCache.set(photo.localIdentifier, photo);
      }
      
      console.log(`🔬 Metadata cache initialized with ${this.photoMetadataCache.size} photos`);
    } catch (error) {
      console.error('🔬 ❌ Failed to initialize metadata cache:', error);
      throw error;
    }
  }
  
  /**
   * Get the stored hash for a photo from cache (no database query)
   */
  private getPhotoHashFromCache(photo: Photo): string | null {
    const metadata = this.photoMetadataCache.get(photo.localIdentifier);
    if (!metadata) {
      console.warn(`🔬 ⚠️ Photo metadata not found in cache for: ${photo.filename} (${photo.localIdentifier})`);
      console.warn('🔬 ⚠️ This photo will be excluded from duplicate comparison');
      return null;
    }
    
    if (!metadata.hashValue) {
      console.warn(`🔬 ⚠️ Hash value missing for photo: ${photo.filename} (${photo.localIdentifier})`);
      console.warn('🔬 ⚠️ This photo will be excluded from duplicate comparison');
      return null;
    }
    
    return metadata.hashValue;
  }
  
  /**
   * Clear all existing duplicate groups for fresh analysis
   */
  private async clearAllDuplicateGroups(): Promise<void> {
    try {
      await databaseService.clearAllDuplicateGroups();
      console.log('🔬 ✅ Cleared all existing duplicate groups');
    } catch (error) {
      console.error('🔬 ❌ Failed to clear duplicate groups:', error);
      throw error;
    }
  }
  
  async analyzePhotos(
    photos: Photo[], 
    onProgress?: (progress: number, message: string) => void,
    clearExistingGroups: boolean = false
  ): Promise<AnalysisResult> {
    console.log('🔬 analyzePhotos started with', photos.length, 'photos');
    const startTime = Date.now();
    let analyzedCount = 0;
    
    try {
      // Clear existing duplicate groups if requested
      if (clearExistingGroups) {
        console.log('🔬 Clearing existing duplicate groups...');
        await this.clearAllDuplicateGroups();
        onProgress?.(5, '既存のグループをクリア中...');
      }
      
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
          console.log(`🔬 Photo details: ${photo.width}x${photo.height}, ${photo.fileSize} bytes, URI: ${photo.uri.substring(0, 50)}...`);
          
          const hash = await perceptualHashService.calculateVisualHash(photo);
          console.log('🔬 Visual hash calculated:', hash.substring(0, 8) + '...');
          console.log(`🔬 Full hash: ${hash}`);
          
          // Ensure hash is always exactly 64 characters before any processing
          const finalHash = perceptualHashService.normalizeHashLength(hash);
          console.log(`🔬 === HASH PROCESSING ===`);
          console.log(`🔬 Original hash: ${hash}`);
          console.log(`🔬 Final hash: ${finalHash}`);
          console.log(`🔬 Hash length: ${finalHash.length} characters`);
          console.log(`🔬 ========================`);
          
          // Save photo metadata to database with normalized hash
          console.log('🔬 Converting to photo metadata...');
          const photoMetadata = photoService.convertToPhotoMetadata(photo);
          photoMetadata.hashValue = finalHash;
          
          console.log(`🔬 Saving photo with hash: ${finalHash.substring(0, 16)}...`);
          await databaseService.savePhoto(photoMetadata);
          console.log('🔬 ✅ Photo saved to database successfully');
          
          if (!hashMap.has(finalHash)) {
            hashMap.set(finalHash, []);
          }
          hashMap.get(finalHash)!.push(photo);
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
      
      // Initialize metadata cache before duplicate detection
      console.log('🔬 Initializing metadata cache for performance optimization...');
      await this.initializeMetadataCache();
      
      // Enhanced duplicate detection using Hamming distance for visual similarity
      console.log('🔬 Starting visual duplicate detection with Hamming distance...');
      const duplicateGroups: DuplicateGroup[] = [];
      let totalDuplicates = 0;
      let totalSpaceSaved = 0;
      
      // Group photos by similarity using Hamming distance
      const allPhotos = Array.from(photoMap.values());
      const processedPhotos = new Set<string>();
      const confirmedDuplicates: Photo[][] = [];
      
      // Filter photos that have valid hashes in cache
      const photosWithHashes = allPhotos.filter(photo => {
        const hash = this.getPhotoHashFromCache(photo);
        return hash !== null;
      });
      
      console.log(`🔬 Processing ${photosWithHashes.length}/${allPhotos.length} photos with valid hashes`);
      
      for (let i = 0; i < photosWithHashes.length; i++) {
        if (processedPhotos.has(photosWithHashes[i].id)) continue;
        
        const currentPhoto = photosWithHashes[i];
        const currentHash = this.getPhotoHashFromCache(currentPhoto);
        if (!currentHash) continue; // Should not happen due to filtering above
        
        const similarGroup: Photo[] = [currentPhoto];
        processedPhotos.add(currentPhoto.id);
        
        // Find all photos similar to current photo using Hamming distance
        for (let j = i + 1; j < photosWithHashes.length; j++) {
          if (processedPhotos.has(photosWithHashes[j].id)) continue;
          
          const comparePhoto = photosWithHashes[j];
          const compareHash = this.getPhotoHashFromCache(comparePhoto);
          if (!compareHash) continue; // Should not happen due to filtering above
          
          // Use perceptual hash service to check visual similarity with relaxed threshold
          if (perceptualHashService.isVisuallySimilar(currentHash, compareHash, 15)) {
            similarGroup.push(comparePhoto);
            processedPhotos.add(comparePhoto.id);
            console.log(`🔬 Found visually similar photo: ${comparePhoto.filename} (Hamming distance ≤15)`);
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
          // Get photo metadata from cache (no database queries)
          const photoMetadataList = [];
          for (const photo of duplicateSet) {
            const metadata = this.photoMetadataCache.get(photo.localIdentifier);
            if (metadata) {
              photoMetadataList.push(metadata);
            } else {
              console.warn(`🔬 ⚠️ Metadata not found in cache for duplicate group photo: ${photo.filename}`);
            }
          }
          
          if (photoMetadataList.length > 1) {
            // Create a representative group hash from all similar photos
            // Sort hashes to ensure consistent group identification
            const allHashes = photoMetadataList
              .map(p => p.hashValue)
              .filter(h => h)
              .sort();
            
            // Use the most common hash pattern or first hash as group representative
            const groupHash = allHashes[0] || 'unknown';
            
            console.log(`📊 Creating group with ${photoMetadataList.length} photos`);
            console.log(`📊 Representative hash: ${groupHash.substring(0, 16)}...`);
            console.log(`📊 All hashes: ${allHashes.map(h => h?.substring(0, 8)).join(', ')}`);
            
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
      console.log('🗑️ Starting deletion process...');
      console.log('🗑️ Photo IDs to delete:', photoIdsToDelete);
      
      // Get photo metadata including localIdentifier for actual deletion
      const photosToDelete = [];
      for (const photoId of photoIdsToDelete) {
        try {
          const id = typeof photoId === 'string' ? parseInt(photoId) : photoId;
          const photo = await databaseService.getPhoto(id);
          if (photo) {
            photosToDelete.push(photo);
            console.log(`🗑️ Found photo to delete: ${photo.fileName} (${photo.localIdentifier})`);
          } else {
            console.warn(`🗑️ ⚠️ Photo not found in database: ID ${photoId}`);
            errors.push(`Photo not found: ${photoId}`);
          }
        } catch (error) {
          console.error(`🗑️ ❌ Failed to get photo metadata for ID ${photoId}:`, error);
          errors.push(`Failed to get photo metadata: ${photoId}`);
        }
      }
      
      if (photosToDelete.length === 0) {
        console.warn('🗑️ ⚠️ No photos found to delete');
        return {
          success: false,
          deletedCount: 0,
          errors: ['No photos found to delete']
        };
      }
      
      // Delete from device using localIdentifiers
      console.log('🗑️ Deleting from device...');
      const localIdentifiers = photosToDelete.map(photo => photo.localIdentifier);
      const deleteResult = await photoService.deletePhotos(localIdentifiers);
      deletedCount = deleteResult.deletedCount;
      console.log(`🗑️ Device deletion result: ${deletedCount}/${localIdentifiers.length} deleted`);
      
      // Mark as deleted in database
      console.log('🗑️ Updating database...');
      for (const photo of photosToDelete) {
        try {
          const id = typeof photo.id === 'string' ? parseInt(photo.id) : photo.id;
          await databaseService.updatePhoto(id, { isDeleted: true });
          console.log(`🗑️ ✅ Marked as deleted in DB: ${photo.fileName}`);
        } catch (error) {
          console.error(`🗑️ ❌ Failed to update database for photo ${photo.fileName}:`, error);
          errors.push(`Failed to update database for photo ${photo.fileName}`);
        }
      }
      
      const success = deletedCount > 0;
      console.log(`🗑️ Deletion complete: success=${success}, deleted=${deletedCount}, errors=${errors.length}`);
      
      return {
        success,
        deletedCount,
        errors
      };
      
    } catch (error) {
      console.error('🗑️ ❌ Deletion process failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      return {
        success: false,
        deletedCount: 0,
        errors
      };
    }
  }
  
  /**
   * Update analysis session statistics after deletion
   */
  async updateSessionAfterDeletion(deletedCount: number, spaceSaved: number): Promise<void> {
    try {
      console.log('📊 Updating session statistics after deletion...');
      console.log(`📊 Deleted photos: ${deletedCount}, Space saved: ${spaceSaved} bytes`);
      
      const latestSession = await databaseService.getLatestAnalysisSession();
      if (!latestSession) {
        console.warn('📊 ⚠️ No analysis session found to update');
        return;
      }
      
      // Calculate actual space saved
      const spaceMB = (spaceSaved / (1024 * 1024)).toFixed(1);
      console.log(`📊 Space saved: ${spaceMB}MB`);
      
      // Update session with actual deletion results
      await databaseService.updateAnalysisSession(latestSession.sessionUuid, {
        potentialSpaceSaved: spaceSaved,
        duplicatesFound: deletedCount,
        endTime: new Date().toISOString(),
        status: 'completed'
      });
      
      console.log('📊 ✅ Session statistics updated successfully');
    } catch (error) {
      console.error('📊 ❌ Failed to update session statistics:', error);
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