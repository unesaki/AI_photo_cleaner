// Web Mock version of PhotoLibraryService for testing
import { databaseService } from './DatabaseService.web';
import type { PhotoMetadata } from '../types';

class MockPhotoLibraryService {
  async requestPermissions(): Promise<boolean> {
    // Simulate permission request
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Mock: Photo library permissions granted');
    return true;
  }

  async hasPermissions(): Promise<boolean> {
    // Always return true for web mock
    return true;
  }

  async loadPhotos(
    onProgress?: (current: number, total: number) => void
  ): Promise<PhotoMetadata[]> {
    // Generate mock photos with random images
    const mockPhotos: Omit<PhotoMetadata, 'id'>[] = [];
    const total = 20; // Generate 20 mock photos

    for (let i = 1; i <= total; i++) {
      if (onProgress) {
        onProgress(i, total);
      }

      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 100));

      const photo: Omit<PhotoMetadata, 'id'> = {
        filePath: `https://picsum.photos/400/600?random=${i}`,
        fileName: `mock_photo_${i}.jpg`,
        fileSize: Math.floor(Math.random() * 3000000) + 500000, // 0.5MB - 3.5MB
        width: 400,
        height: 600,
        createdAt: Date.now() - (Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000), // Random date within last 30 days
        modifiedAt: Date.now() - (Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        hash: undefined, // Will be calculated during analysis
        isDuplicate: false
      };

      mockPhotos.push(photo);
    }

    // Add some intentional duplicates for testing
    if (mockPhotos.length >= 4) {
      // Make photos 2 and 3 duplicates
      mockPhotos[2] = {
        ...mockPhotos[1],
        fileName: 'mock_photo_3_duplicate.jpg',
        filePath: mockPhotos[1].filePath, // Same image
      };

      // Make photos 5 and 6 duplicates
      if (mockPhotos.length >= 6) {
        mockPhotos[5] = {
          ...mockPhotos[4],
          fileName: 'mock_photo_6_duplicate.jpg',
          filePath: mockPhotos[4].filePath, // Same image
        };
      }
    }

    // Save photos to mock database
    const savedPhotos: PhotoMetadata[] = [];
    for (const photo of mockPhotos) {
      const id = await databaseService.addPhoto(photo);
      savedPhotos.push({ ...photo, id });
    }

    console.log(`Mock: Loaded ${savedPhotos.length} photos`);
    return savedPhotos;
  }

  async getPhotoCount(): Promise<number> {
    // Simulate getting photo count
    await new Promise(resolve => setTimeout(resolve, 100));
    return 20; // Mock count
  }

  async refreshPhotoLibrary(): Promise<PhotoMetadata[]> {
    console.log('Mock: Refreshing photo library');
    return this.loadPhotos();
  }

  async deletePhotoFromLibrary(photoId: string): Promise<boolean> {
    // Simulate photo deletion
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      await databaseService.deletePhoto(photoId);
      console.log(`Mock: Deleted photo ${photoId}`);
      return true;
    } catch (error) {
      console.error('Mock: Failed to delete photo:', error);
      return false;
    }
  }

  async getPhotoInfo(photoId: string): Promise<PhotoMetadata | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const photos = await databaseService.getAllPhotos();
    return photos.find(p => p.id === photoId) || null;
  }

  async exportPhoto(photoId: string, targetPath: string): Promise<boolean> {
    // Mock export functionality
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Mock: Exported photo ${photoId} to ${targetPath}`);
    return true;
  }
}

export const photoLibraryService = new MockPhotoLibraryService();