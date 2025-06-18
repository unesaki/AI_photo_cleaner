import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import { Photo, DuplicateGroup, AnalysisResult } from '../types';
import { databaseService } from './DatabaseService';
import { photoService } from './PhotoService';

export class DuplicateDetectionService {
  
  async analyzePhotos(
    photos: Photo[], 
    onProgress?: (progress: number, message: string) => void
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    let analyzedCount = 0;
    
    // Create analysis session
    const sessionUuid = await databaseService.createAnalysisSession(photos.length);
    
    try {
      onProgress?.(0, '写真を準備中...');
      
      // Save photos to database and calculate hashes
      const photoMap = new Map<string, Photo>();
      const hashMap = new Map<string, Photo[]>();
      
      for (const photo of photos) {
        try {
          // Calculate file hash for duplicate detection
          const hash = await this.calculateFileHash(photo.uri);
          
          // Save photo metadata to database
          const photoMetadata = photoService.convertToPhotoMetadata(photo);
          photoMetadata.hashValue = hash;
          
          await databaseService.savePhoto(photoMetadata);
          
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
          console.error('Failed to process photo:', photo.filename, error);
          // Continue with next photo
        }
      }
      
      onProgress?.(90, '重複グループを作成中...');
      
      // Find duplicate groups
      const duplicateGroups: DuplicateGroup[] = [];
      let totalDuplicates = 0;
      let totalSpaceSaved = 0;
      
      for (const [hash, photosWithSameHash] of hashMap) {
        if (photosWithSameHash.length > 1) {
          // This is a duplicate group
          try {
            // Get photo IDs from database
            const photoMetadataList = [];
            for (const photo of photosWithSameHash) {
              const allPhotos = await databaseService.getAllPhotos();
              const metadata = allPhotos.find(p => p.localIdentifier === photo.localIdentifier);
              if (metadata) {
                photoMetadataList.push(metadata);
              }
            }
            
            if (photoMetadataList.length > 1) {
              // Create duplicate group in database
              const photoIds = photoMetadataList.map(p => parseInt(p.id));
              const groupId = await databaseService.createDuplicateGroup(hash, photoIds);
              
              // Calculate space that could be saved (all but one photo)
              const totalSize = photosWithSameHash.reduce((sum, p) => sum + p.fileSize, 0);
              const largestPhoto = photosWithSameHash.reduce((largest, current) => 
                current.fileSize > largest.fileSize ? current : largest
              );
              const spaceSaved = totalSize - largestPhoto.fileSize;
              
              duplicateGroups.push({
                id: groupId.toString(),
                groupHash: hash,
                photoCount: photosWithSameHash.length,
                totalSize: totalSize,
                photos: photoMetadataList,
                recommendedKeepId: photoMetadataList[0].id // Recommend keeping the first one
              });
              
              totalDuplicates += photosWithSameHash.length - 1; // Count duplicates to remove
              totalSpaceSaved += spaceSaved;
            }
          } catch (error) {
            console.error('Failed to create duplicate group:', error);
          }
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
      console.error('Analysis failed:', error);
      
      // Update session with error
      await databaseService.updateAnalysisSession(sessionUuid, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        endTime: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  private async calculateFileHash(uri: string): Promise<string> {
    try {
      // For basic MVP, we'll use a simple approach
      // Read a portion of the file and hash it
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }
      
      // For performance, we'll hash the file metadata instead of content
      // In a real implementation, you might want to read the actual file content
      const hashInput = `${fileInfo.size}-${fileInfo.modificationTime}-${uri}`;
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.MD5,
        hashInput
      );
      
      return hash;
    } catch (error) {
      console.error('Failed to calculate file hash:', error);
      // Fallback to URI-based hash
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.MD5,
        uri
      );
    }
  }
  
  async deleteDuplicatePhotos(groupId: string, photoIdsToDelete: string[]): Promise<{
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
          await databaseService.updatePhoto(parseInt(photoId), { isDeleted: true });
        } catch (error) {
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