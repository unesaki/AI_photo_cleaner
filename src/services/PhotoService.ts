import * as MediaLibrary from 'expo-media-library';
import { Photo, PhotoMetadata } from '../types';

export class PhotoService {
  private hasPermission = false;

  private safeToISOString(date: Date | null | undefined): string | null {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return null;
    }
    try {
      return date.toISOString();
    } catch (error) {
      console.warn('Failed to convert date to ISO string:', error);
      return null;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Failed to request media library permissions:', error);
      return false;
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return false;
    }
  }

  async getPhotos(limit: number = 1000): Promise<Photo[]> {
    if (!this.hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        throw new Error('Media library permission denied');
      }
    }

    try {
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: limit,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: MediaLibrary.SortBy.creationTime
      });

      return assets.map(asset => ({
        id: asset.id,
        localIdentifier: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        fileSize: asset.duration || 0, // MediaLibrary doesn't provide file size directly
        width: asset.width,
        height: asset.height,
        creationDate: new Date(asset.creationTime),
        modificationDate: new Date(asset.modificationTime || asset.creationTime),
        mediaType: 'photo'
      }));
    } catch (error) {
      console.error('Failed to get photos:', error);
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

  async deletePhotos(photoIds: string[]): Promise<{ success: boolean; deletedCount: number }> {
    if (!this.hasPermission) {
      throw new Error('Media library permission denied');
    }

    try {
      const deletePromises = photoIds.map(id => MediaLibrary.deleteAssetsAsync([id]));
      const results = await Promise.allSettled(deletePromises);
      
      const deletedCount = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;

      return {
        success: deletedCount > 0,
        deletedCount
      };
    } catch (error) {
      console.error('Failed to delete photos:', error);
      return { success: false, deletedCount: 0 };
    }
  }

  convertToPhotoMetadata(photo: Photo): Omit<PhotoMetadata, 'id' | 'createdAt' | 'updatedAt'> {
    const safeCreationDate = this.safeToISOString(photo.creationDate) || new Date().toISOString();
    const safeModificationDate = this.safeToISOString(photo.modificationDate) || new Date().toISOString();

    return {
      localIdentifier: photo.localIdentifier,
      filePath: photo.uri,
      fileName: photo.filename,
      fileSize: photo.fileSize,
      width: photo.width,
      height: photo.height,
      creationDate: safeCreationDate,
      modificationDate: safeModificationDate,
      isDuplicate: false,
      isDeleted: false
    };
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async getPhotoInfo(assetId: string): Promise<MediaLibrary.AssetInfo | null> {
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
      return assetInfo;
    } catch (error) {
      console.error('Failed to get photo info:', error);
      return null;
    }
  }
}

export const photoService = new PhotoService();