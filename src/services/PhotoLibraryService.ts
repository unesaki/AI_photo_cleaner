import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { PhotoMetadata } from '../types';

export class PhotoLibraryService {
  private hasPermission = false;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      this.hasPermission = status === 'granted';
      console.log('📱 Photo library permission:', status);
      return this.hasPermission;
    } catch (error) {
      console.error('Failed to request media library permissions:', error);
      return false;
    }
  }

  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return false;
    }
  }

  async loadPhotos(
    onProgress?: (current: number, total: number) => void
  ): Promise<PhotoMetadata[]> {
    if (!this.hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        throw new Error('Media library permission denied');
      }
    }

    try {
      console.log('📸 Loading photos from device...');
      
      // Get total count first
      const { totalCount } = await MediaLibrary.getAssetsAsync({
        first: 0,
        mediaType: MediaLibrary.MediaType.photo
      });

      console.log(`📸 Found ${totalCount} photos in library`);

      // Load photos in batches
      const batchSize = 50;
      const allPhotos: PhotoMetadata[] = [];
      let hasNextPage = true;
      let endCursor: string | undefined;

      while (hasNextPage && allPhotos.length < Math.min(totalCount, 200)) { // Limit to 200 for performance
        const { assets, hasNextPage: hasNext, endCursor: nextCursor } = await MediaLibrary.getAssetsAsync({
          first: batchSize,
          after: endCursor,
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: MediaLibrary.SortBy.creationTime
        });

        // Process each asset
        for (const asset of assets) {
          try {
            const photoMetadata = await this.convertAssetToPhotoMetadata(asset);
            allPhotos.push(photoMetadata);

            // Report progress
            if (onProgress) {
              onProgress(allPhotos.length, Math.min(totalCount, 200));
            }
          } catch (error) {
            console.warn(`Failed to process asset ${asset.id}:`, error);
          }
        }

        hasNextPage = hasNext;
        endCursor = nextCursor;
      }

      console.log(`📸 Successfully loaded ${allPhotos.length} photos`);
      return allPhotos;

    } catch (error) {
      console.error('Failed to load photos:', error);
      throw error;
    }
  }

  async getPhotoCount(): Promise<number> {
    if (!this.hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        return 0;
      }
    }

    try {
      const { totalCount } = await MediaLibrary.getAssetsAsync({
        first: 0,
        mediaType: MediaLibrary.MediaType.photo
      });
      return totalCount;
    } catch (error) {
      console.error('Failed to get photo count:', error);
      return 0;
    }
  }

  private async convertAssetToPhotoMetadata(asset: MediaLibrary.Asset): Promise<PhotoMetadata> {
    // Get detailed asset info
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
    
    // Get file size
    let fileSize = 0;
    try {
      if (assetInfo.localUri) {
        const fileInfo = await FileSystem.getInfoAsync(assetInfo.localUri);
        fileSize = (fileInfo as any).size || 0;
      }
    } catch (error) {
      console.warn(`Could not get file size for ${asset.filename}:`, error);
    }

    const now = Date.now().toString();

    return {
      id: asset.id,
      localIdentifier: asset.id,
      filePath: asset.uri,
      fileName: asset.filename,
      fileSize,
      width: asset.width,
      height: asset.height,
      creationDate: asset.creationTime.toString(),
      modificationDate: (asset.modificationTime || asset.creationTime).toString(),
      hashValue: undefined, // Will be calculated during analysis
      qualityScore: 1.0,
      isDuplicate: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now
    };
  }

  async deletePhotoFromLibrary(photoId: string): Promise<boolean> {
    if (!this.hasPermission) {
      throw new Error('Media library permission denied');
    }

    try {
      const result = await MediaLibrary.deleteAssetsAsync([photoId]);
      console.log(`🗑️ Delete result for ${photoId}:`, result);
      return result === true;
    } catch (error) {
      console.error(`Failed to delete photo ${photoId}:`, error);
      return false;
    }
  }

  async getPhotoInfo(photoId: string): Promise<PhotoMetadata | null> {
    try {
      const asset = await MediaLibrary.getAssetInfoAsync(photoId);
      if (asset) {
        return await this.convertAssetToPhotoMetadata(asset as MediaLibrary.Asset);
      }
      return null;
    } catch (error) {
      console.error('Failed to get photo info:', error);
      return null;
    }
  }

  async refreshPhotoLibrary(): Promise<PhotoMetadata[]> {
    console.log('🔄 Refreshing photo library');
    return this.loadPhotos();
  }

  async exportPhoto(photoId: string, targetPath: string): Promise<boolean> {
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(photoId);
      if (!assetInfo.localUri) {
        return false;
      }

      await FileSystem.copyAsync({
        from: assetInfo.localUri,
        to: targetPath
      });

      console.log(`📤 Exported photo ${photoId} to ${targetPath}`);
      return true;
    } catch (error) {
      console.error('Failed to export photo:', error);
      return false;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

export const photoLibraryService = new PhotoLibraryService();