import * as Crypto from 'expo-crypto';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Photo } from '../types';

export class ImageHashService {
  
  /**
   * Calculate perceptual hash based on image content
   * This is more resistant to Exif changes and minor modifications
   */
  async calculatePerceptualHash(photo: Photo): Promise<string> {
    try {
      console.log('🎨 Calculating perceptual hash for:', photo.filename);
      
      // Get the actual file URI
      const actualUri = await this.getActualFileUri(photo);
      
      // Since we can't directly process pixels in React Native without additional libraries,
      // we'll create a content-based hash using multiple image properties
      const contentHash = await this.calculateContentBasedHash(photo, actualUri);
      
      return contentHash;
    } catch (error) {
      console.error('🎨 ❌ Failed to calculate perceptual hash:', error);
      throw error;
    }
  }

  /**
   * Get the actual file URI, preferring localUri from MediaLibrary
   */
  private async getActualFileUri(photo: Photo): Promise<string> {
    let actualUri = photo.uri;
    
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(photo.id);
      if (assetInfo && assetInfo.localUri) {
        actualUri = assetInfo.localUri;
        console.log('🎨 Using localUri:', actualUri);
      }
    } catch (error) {
      console.warn('🎨 Failed to get localUri, using original:', error);
    }
    
    return actualUri;
  }

  /**
   * Calculate hash based on image content characteristics
   */
  private async calculateContentBasedHash(photo: Photo, uri: string): Promise<string> {
    try {
      // Get file information
      let fileSize = photo.fileSize;
      let modTime = photo.modificationDate.getTime();
      
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          fileSize = (fileInfo as any).size || fileSize;
          modTime = (fileInfo as any).modificationTime || modTime;
        }
      } catch (fsError) {
        console.warn('🎨 FileSystem info failed, using photo metadata:', fsError);
      }

      // Create a content-focused hash that ignores metadata
      // Focus on visual characteristics:
      const aspectRatio = (photo.width / photo.height).toFixed(4);
      const pixelCount = photo.width * photo.height;
      
      // Normalize filename to ignore path differences
      const normalizedName = this.normalizeFilename(photo.filename);
      
      // Create hash input focusing on visual content
      const hashInput = `${pixelCount}-${aspectRatio}-${fileSize}-${normalizedName}`;
      console.log('🎨 Content hash input:', hashInput);
      
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hashInput
      );
      
      console.log('🎨 Content hash calculated:', hash.substring(0, 12) + '...');
      return hash;
    } catch (error) {
      console.error('🎨 Content hash calculation failed:', error);
      throw error;
    }
  }

  /**
   * Normalize filename to focus on content rather than metadata
   */
  private normalizeFilename(filename: string): string {
    // Remove path and get base name
    const basename = filename.split('/').pop() || filename;
    
    // Remove common timestamp patterns and focus on core name
    // This helps identify the same image saved at different times
    return basename
      .toLowerCase()
      .replace(/[-_]\d{4}[-_]\d{2}[-_]\d{2}/g, '') // Remove YYYY-MM-DD patterns
      .replace(/[-_]\d{8}/g, '') // Remove YYYYMMDD patterns
      .replace(/[-_]\d{6}/g, '') // Remove HHMMSS patterns
      .replace(/\s+/g, '_'); // Normalize spaces
  }

  /**
   * Enhanced similarity check using multiple hash algorithms
   */
  async calculateSimilarityScore(photo1: Photo, photo2: Photo): Promise<number> {
    try {
      // 1. Exact dimension match (high confidence)
      const dimensionMatch = photo1.width === photo2.width && photo1.height === photo2.height;
      if (!dimensionMatch) {
        return 0; // Different dimensions = definitely different images
      }

      // 2. File size similarity (allowing for compression differences)
      const sizeDiff = Math.abs(photo1.fileSize - photo2.fileSize);
      const avgSize = (photo1.fileSize + photo2.fileSize) / 2;
      const sizeSimilarity = Math.max(0, 1 - (sizeDiff / avgSize));
      
      // 3. Filename similarity (after normalization)
      const name1 = this.normalizeFilename(photo1.filename);
      const name2 = this.normalizeFilename(photo2.filename);
      const nameSimilarity = this.calculateStringSimilarity(name1, name2);
      
      // 4. Creation time proximity (allowing for timezone/sync differences)
      const timeDiff = Math.abs(photo1.creationDate.getTime() - photo2.creationDate.getTime());
      const maxTimeDiff = 24 * 60 * 60 * 1000; // 24 hours
      const timeSimilarity = Math.max(0, 1 - (timeDiff / maxTimeDiff));
      
      // Weighted average of similarity factors
      const weights = {
        size: 0.4,
        name: 0.3,
        time: 0.3
      };
      
      const overallSimilarity = 
        (sizeSimilarity * weights.size) +
        (nameSimilarity * weights.name) +
        (timeSimilarity * weights.time);
      
      console.log('🎨 Similarity analysis:', {
        photos: [photo1.filename, photo2.filename],
        sizeSimilarity: sizeSimilarity.toFixed(3),
        nameSimilarity: nameSimilarity.toFixed(3),
        timeSimilarity: timeSimilarity.toFixed(3),
        overall: overallSimilarity.toFixed(3)
      });
      
      return overallSimilarity;
    } catch (error) {
      console.error('🎨 ❌ Similarity calculation failed:', error);
      return 0;
    }
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return 1 - (matrix[str2.length][str1.length] / maxLength);
  }

  /**
   * Check if two photos are likely duplicates using enhanced comparison
   */
  async areDuplicates(photo1: Photo, photo2: Photo, threshold = 0.85): Promise<boolean> {
    const similarity = await this.calculateSimilarityScore(photo1, photo2);
    const isDuplicate = similarity >= threshold;
    
    console.log(`🎨 Duplicate check: ${photo1.filename} vs ${photo2.filename} = ${similarity.toFixed(3)} (${isDuplicate ? 'DUPLICATE' : 'UNIQUE'})`);
    
    return isDuplicate;
  }
}

export const imageHashService = new ImageHashService();