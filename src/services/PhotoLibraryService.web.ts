// Web Mock version of PhotoLibraryService for testing
import { databaseService } from './DatabaseService.web';
import { MockDataService } from './MockDataService';
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
    console.log('🔄 PhotoLibraryService.web: Loading mock photos...');
    const mockPhotos = MockDataService.getMockPhotos();
    const total = mockPhotos.length;
    console.log(`🔄 Total mock photos: ${total}`);
    
    // Print mock data stats
    MockDataService.getStats();

    // Simulate loading progress
    for (let i = 1; i <= total; i++) {
      if (onProgress) {
        onProgress(i, total);
      }
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Save photos to mock database (simulate real database operations)
    const savedPhotos: PhotoMetadata[] = [];
    for (const photo of mockPhotos) {
      try {
        const id = await databaseService.savePhoto({
          localIdentifier: photo.localIdentifier,
          filePath: photo.filePath,
          fileName: photo.fileName,
          fileSize: photo.fileSize,
          width: photo.width,
          height: photo.height,
          creationDate: photo.creationDate,
          modificationDate: photo.modificationDate,
          hashValue: photo.hashValue,
          qualityScore: photo.qualityScore,
          isDuplicate: photo.isDuplicate,
          isDeleted: photo.isDeleted
        });
        savedPhotos.push({ ...photo, id: id.toString() });
      } catch (error) {
        console.error('Failed to save mock photo:', error);
        // Include the photo anyway for testing
        savedPhotos.push(photo);
      }
    }

    console.log(`Mock: Loaded ${savedPhotos.length} photos with ${MockDataService.getStats().duplicateGroups} duplicate groups`);
    return savedPhotos;
  }

  async getPhotoCount(): Promise<number> {
    // Simulate getting photo count
    await new Promise(resolve => setTimeout(resolve, 100));
    return MockDataService.getMockPhotoCount();
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