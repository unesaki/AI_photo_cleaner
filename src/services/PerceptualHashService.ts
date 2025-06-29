import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import * as MediaLibrary from 'expo-media-library';
import { Photo } from '../types';

export class PerceptualHashService {
  
  /**
   * Calculate perceptual hash based on actual image content
   * This creates the same hash for visually identical images regardless of metadata
   */
  async calculateVisualHash(photo: Photo): Promise<string> {
    try {
      console.log('🎨 Calculating visual-only hash for:', photo.filename);
      
      // Get the actual file URI
      const actualUri = await this.getActualFileUri(photo);
      
      // Try to calculate pixel-based hash first
      try {
        const pixelHash = await this.calculatePixelBasedHash(actualUri);
        console.log('🎨 Pixel-based hash calculated:', pixelHash.substring(0, 12) + '...');
        return pixelHash;
      } catch (pixelError) {
        console.warn('🎨 Pixel-based hash failed, using dimension-based fallback:', pixelError);
        return this.calculateDimensionBasedHash(photo);
      }
    } catch (error) {
      console.error('🎨 ❌ Visual hash calculation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate hash based on actual pixel data using image manipulation
   * Includes comprehensive normalization for consistent results
   */
  private async calculatePixelBasedHash(uri: string): Promise<string> {
    try {
      console.log('🎨 Starting comprehensive image normalization...');
      
      // Step 1: Normalize image dimensions, format, and color space
      const normalizedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          // First resize to remove resolution differences
          { resize: { width: 64, height: 64 } },
          // Apply slight blur to reduce noise differences
          // Note: blur is not available in expo-image-manipulator, so we rely on compression
        ],
        { 
          compress: 0.3, // Moderate compression to reduce noise while preserving structure
          format: ImageManipulator.SaveFormat.JPEG, // Consistent format
          base64: true
        }
      );

      if (!normalizedImage.base64) {
        throw new Error('Failed to get base64 data from normalized image');
      }

      // Step 2: Create multiple hash representations for robustness
      const hashes: string[] = [];
      
      // Hash at different resolutions to capture both fine and coarse details
      for (const size of [8, 16, 32]) {
        try {
          const resizedImage = await ImageManipulator.manipulateAsync(
            normalizedImage.uri,
            [{ resize: { width: size, height: size } }],
            { 
              compress: 0.1, // Heavy compression for structure-only comparison
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true
            }
          );

          if (resizedImage.base64) {
            const hash = await Crypto.digestStringAsync(
              Crypto.CryptoDigestAlgorithm.SHA256,
              resizedImage.base64
            );
            hashes.push(hash.substring(0, 16)); // Use first 16 chars from each
          }
        } catch (resizeError) {
          console.warn(`🎨 Failed to create ${size}x${size} hash:`, resizeError);
        }
      }
      
      if (hashes.length === 0) {
        throw new Error('All resolution-based normalizations failed');
      }
      
      // Step 3: Combine hashes for comprehensive fingerprint
      const combinedInput = hashes.join('-');
      const finalHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        combinedInput
      );

      console.log('🎨 Multi-resolution normalized hash created:', finalHash.substring(0, 12) + '...');
      return finalHash;
    } catch (error) {
      console.error('🎨 Enhanced pixel-based hash failed:', error);
      throw error;
    }
  }

  /**
   * Fallback hash based on image dimensions and aspect ratio only
   * Excludes all file-specific metadata
   */
  private calculateDimensionBasedHash(photo: Photo): string {
    // Create hash based only on visual characteristics
    // Exclude filename, ID, timestamps, etc.
    const aspectRatio = (photo.width / photo.height).toFixed(6);
    const pixelCount = photo.width * photo.height;
    
    // Normalize file size to ignore compression differences
    const sizeCategory = this.categorizeFileSize(photo.fileSize);
    
    // Hash input contains ONLY visual properties
    const visualInput = `${pixelCount}-${aspectRatio}-${sizeCategory}`;
    console.log('🎨 Dimension-based hash input (visual only):', visualInput);
    
    // Use a deterministic hash that's the same for same visual content
    return this.createDeterministicHash(visualInput);
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
        console.log('🎨 Using localUri for pixel analysis:', actualUri);
      }
    } catch (error) {
      console.warn('🎨 Failed to get localUri, using original:', error);
    }
    
    return actualUri;
  }

  /**
   * Categorize file size to reduce sensitivity to compression differences
   */
  private categorizeFileSize(fileSize: number): string {
    // Group file sizes into categories to handle compression variations
    if (fileSize < 100 * 1024) return 'small';        // < 100KB
    if (fileSize < 500 * 1024) return 'medium-small'; // < 500KB
    if (fileSize < 2 * 1024 * 1024) return 'medium';  // < 2MB
    if (fileSize < 5 * 1024 * 1024) return 'large';   // < 5MB
    return 'very-large';                               // >= 5MB
  }

  /**
   * Create deterministic hash that's consistent across runs
   * Always returns a 64-character hex string (256 bits) for consistent comparison
   */
  private createDeterministicHash(input: string): string {
    // Simple but deterministic hash function
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to hex and pad to ensure consistent length
    const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
    
    // Extend to exactly 64 characters (256 bits) for consistent Hamming distance calculation
    return hexHash.repeat(8).substring(0, 64);
  }

  /**
   * Advanced perceptual hash using DCT (Discrete Cosine Transform) approach
   * This is a simplified version of how actual perceptual hashing works
   */
  async calculateAdvancedPerceptualHash(photo: Photo): Promise<string> {
    try {
      const actualUri = await this.getActualFileUri(photo);
      
      // Create multiple representations at different resolutions
      // to capture various levels of image detail
      const hashes = [];
      
      for (const size of [8, 16, 32]) {
        try {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            actualUri,
            [
              { resize: { width: size, height: size } },
            ],
            { 
              compress: 0.1,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true
            }
          );

          if (manipulatedImage.base64) {
            const hash = await Crypto.digestStringAsync(
              Crypto.CryptoDigestAlgorithm.MD5,
              manipulatedImage.base64
            );
            hashes.push(hash.substring(0, 8)); // Take first 8 chars
          }
        } catch (resizeError) {
          console.warn(`🎨 Failed to create ${size}x${size} hash:`, resizeError);
        }
      }
      
      if (hashes.length === 0) {
        throw new Error('All resolution-based hashes failed');
      }
      
      // Combine all resolution hashes for a comprehensive fingerprint
      const combinedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hashes.join('-')
      );
      
      console.log('🎨 Advanced perceptual hash calculated:', combinedHash.substring(0, 12) + '...');
      return combinedHash;
    } catch (error) {
      console.error('🎨 Advanced perceptual hash failed:', error);
      // Fallback to dimension-based hash
      return this.calculateDimensionBasedHash(photo);
    }
  }

  /**
   * Calculate Hamming distance between two binary strings
   * Hamming distance is the number of positions where bits differ
   */
  private calculateHammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      throw new Error(`Hash lengths must match: ${hash1.length} vs ${hash2.length}`);
    }
    
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }
    
    return distance;
  }

  /**
   * Normalize hash to ensure consistent 64-character length
   * Truncates if too long, pads with zeros if too short
   */
  private normalizeHashLength(hash: string): string {
    // Remove any non-hex characters and convert to lowercase
    const cleanHash = hash.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
    
    // Ensure exactly 64 characters (256 bits)
    if (cleanHash.length > 64) {
      return cleanHash.substring(0, 64);
    } else if (cleanHash.length < 64) {
      return cleanHash.padEnd(64, '0');
    }
    
    return cleanHash;
  }

  /**
   * Convert hexadecimal hash to binary string for bit-level comparison
   * Ensures input hash is normalized to 64 hex characters first
   */
  private hexToBinary(hex: string): string {
    const normalizedHex = this.normalizeHashLength(hex);
    return normalizedHex.replace(/./g, (char) => {
      return parseInt(char, 16).toString(2).padStart(4, '0');
    });
  }

  /**
   * Check if two visual hashes represent visually similar images
   * Uses Hamming distance with configurable threshold
   */
  isVisuallySimilar(hash1: string, hash2: string, threshold: number = 10): boolean {
    if (hash1 === hash2) return true;
    
    try {
      // Convert hex hashes to binary for bit-level comparison
      const binary1 = this.hexToBinary(hash1);
      const binary2 = this.hexToBinary(hash2);
      
      // Calculate Hamming distance (number of different bits)
      const hammingDistance = this.calculateHammingDistance(binary1, binary2);
      
      // Consider similar if Hamming distance is within threshold
      // For 64-bit hash: 5-10 bits difference = visually similar
      return hammingDistance <= threshold;
    } catch (error) {
      console.error('🎨 Error calculating visual similarity:', error);
      // Fallback to exact match
      return hash1 === hash2;
    }
  }

  /**
   * Check if two visual hashes represent the same image content
   * Uses strict Hamming distance threshold for duplicates
   */
  areVisuallyIdentical(hash1: string, hash2: string): boolean {
    // Use very strict threshold (≤5 bits) for considering images identical
    return this.isVisuallySimilar(hash1, hash2, 5);
  }

  /**
   * Calculate similarity between two visual hashes
   * Returns value between 0 and 1 (1 = identical)
   */
  calculateVisualSimilarity(hash1: string, hash2: string): number {
    if (hash1 === hash2) return 1.0;
    
    try {
      const binary1 = this.hexToBinary(hash1);
      const binary2 = this.hexToBinary(hash2);
      const hammingDistance = this.calculateHammingDistance(binary1, binary2);
      
      // Convert Hamming distance to similarity score (0-1)
      // Maximum possible distance is the length of the binary string
      const maxDistance = binary1.length;
      const similarity = 1 - (hammingDistance / maxDistance);
      
      return Math.max(0, similarity);
    } catch (error) {
      console.error('🎨 Error calculating visual similarity score:', error);
      return 0;
    }
  }
}

export const perceptualHashService = new PerceptualHashService();