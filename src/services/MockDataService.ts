import { PhotoMetadata } from '../types';
import { ImageHashService, ImageHashResult } from './ImageHashService';

export class MockDataService {
  private static readonly MOCK_PHOTOS: PhotoMetadata[] = [
    // Group 1: Beach photo duplicates (3 photos with slight variations)
    {
      id: '1',
      localIdentifier: 'IMG_20240615_142301',
      filePath: '/storage/emulated/0/DCIM/Camera/IMG_20240615_142301.jpg',
      fileName: 'IMG_20240615_142301.jpg',
      fileSize: 4235000, // 4.2MB - original high quality
      width: 3024,
      height: 4032,
      creationDate: '1718452981000', // June 15, 2024
      modificationDate: '1718452981000',
      hashValue: 'a7f3c9e8b2d4f1a6', // Realistic MD5-like hash
      qualityScore: 0.96,
      isDuplicate: false,
      isDeleted: false,
      createdAt: '1718452981000',
      updatedAt: '1718452981000'
    },
    {
      id: '2',
      localIdentifier: 'IMG_20240615_142301_1',
      filePath: '/storage/emulated/0/Download/IMG_20240615_142301_1.jpg',
      fileName: 'IMG_20240615_142301_1.jpg',
      fileSize: 3892000, // 3.9MB - slightly compressed
      width: 3024,
      height: 4032,
      creationDate: '1718452981000',
      modificationDate: '1718453981000', // Modified 16 minutes later
      hashValue: 'a7f3c9e8b2d4f1a7', // Very similar hash (1 char diff)
      qualityScore: 0.94,
      isDuplicate: true,
      isDeleted: false,
      createdAt: '1718453981000',
      updatedAt: '1718453981000'
    },
    {
      id: '3',
      localIdentifier: 'beach_sunset_edited',
      filePath: '/storage/emulated/0/Pictures/Edited/beach_sunset_edited.jpg',
      fileName: 'beach_sunset_edited.jpg',
      fileSize: 3654000, // 3.7MB - edited version
      width: 3024,
      height: 4032,
      creationDate: '1718452981000',
      modificationDate: '1718459381000', // Modified ~2 hours later
      hashValue: 'a7f3c9e8b2d4f1a8', // Similar hash with slight variation
      qualityScore: 0.92,
      isDuplicate: true,
      isDeleted: false,
      createdAt: '1718459381000',
      updatedAt: '1718459381000'
    },

    // Group 2: Family portrait duplicates (2 photos - original and copy)
    {
      id: '4',
      localIdentifier: 'PXL_20241201_183445621',
      filePath: '/storage/emulated/0/DCIM/Camera/PXL_20241201_183445621.jpg',
      fileName: 'PXL_20241201_183445621.jpg',
      fileSize: 5120000, // 5.1MB - high resolution portrait
      width: 2268,
      height: 4032,
      creationDate: '1733078085000', // Dec 1, 2024
      modificationDate: '1733078085000',
      hashValue: 'f8e2a1c7d9b5e3f2', // Family portrait hash
      qualityScore: 0.98,
      isDuplicate: false,
      isDeleted: false,
      createdAt: '1733078085000',
      updatedAt: '1733078085000'
    },
    {
      id: '5',
      localIdentifier: 'family_christmas_2024',
      filePath: '/storage/emulated/0/Pictures/Family/family_christmas_2024.jpg',
      fileName: 'family_christmas_2024.jpg',
      fileSize: 5118000, // Nearly identical size
      width: 2268,
      height: 4032,
      creationDate: '1733078085000',
      modificationDate: '1733164485000', // Copied next day
      hashValue: 'f8e2a1c7d9b5e3f3', // Very similar hash
      qualityScore: 0.98,
      isDuplicate: true,
      isDeleted: false,
      createdAt: '1733164485000',
      updatedAt: '1733164485000'
    },

    // Group 3: Screenshot duplicates (2 photos - same screenshot saved twice)
    {
      id: '6',
      localIdentifier: 'Screenshot_20241220_094523',
      filePath: '/storage/emulated/0/Pictures/Screenshots/Screenshot_20241220_094523.png',
      fileName: 'Screenshot_20241220_094523.png',
      fileSize: 187000, // 187KB - screenshot
      width: 1080,
      height: 2400,
      creationDate: '1734686723000', // Dec 20, 2024
      modificationDate: '1734686723000',
      hashValue: '3d4e5f6a7b8c9d0e', // Screenshot hash
      qualityScore: 1.0, // Screenshots are pixel-perfect
      isDuplicate: false,
      isDeleted: false,
      createdAt: '1734686723000',
      updatedAt: '1734686723000'
    },
    {
      id: '7',
      localIdentifier: 'Screenshot_20241220_094523_copy',
      filePath: '/storage/emulated/0/Download/Screenshot_20241220_094523.png',
      fileName: 'Screenshot_20241220_094523.png',
      fileSize: 187000, // Identical size
      width: 1080,
      height: 2400,
      creationDate: '1734686723000',
      modificationDate: '1734687023000', // Saved 5 minutes later
      hashValue: '3d4e5f6a7b8c9d0e', // Identical hash for identical screenshot
      qualityScore: 1.0,
      isDuplicate: true,
      isDeleted: false,
      createdAt: '1734687023000',
      updatedAt: '1734687023000'
    },

    // Unique photos (6 clearly different photos)
    {
      id: '8',
      localIdentifier: 'IMG_20240322_120456',
      filePath: '/storage/emulated/0/DCIM/Camera/IMG_20240322_120456.jpg',
      fileName: 'IMG_20240322_120456.jpg',
      fileSize: 2945000, // 2.9MB - mountain landscape
      width: 4032,
      height: 3024,
      creationDate: '1711105496000', // March 22, 2024
      modificationDate: '1711105496000',
      hashValue: 'b1c2d3e4f5a6b7c8', // Completely different hash
      qualityScore: 0.91,
      isDuplicate: false,
      isDeleted: false,
      createdAt: '1711105496000',
      updatedAt: '1711105496000'
    },
    {
      id: '9',
      localIdentifier: 'PXL_20241115_080932154',
      filePath: '/storage/emulated/0/DCIM/Camera/PXL_20241115_080932154.jpg',
      fileName: 'PXL_20241115_080932154.jpg',
      fileSize: 1872000, // 1.9MB - city street photo
      width: 3024,
      height: 4032,
      creationDate: '1731657572000', // Nov 15, 2024
      modificationDate: '1731657572000',
      hashValue: '9e8d7c6b5a4f3e2d', // Different content hash
      qualityScore: 0.89,
      isDuplicate: false,
      isDeleted: false,
      createdAt: '1731657572000',
      updatedAt: '1731657572000'
    },
    {
      id: '10',
      localIdentifier: 'food_pizza_night',
      filePath: '/storage/emulated/0/Pictures/Food/food_pizza_night.jpg',
      fileName: 'food_pizza_night.jpg',
      fileSize: 3210000, // 3.2MB - food photo
      width: 2268,
      height: 4032,
      creationDate: '1733512885000', // Dec 6, 2024
      modificationDate: '1733512885000',
      hashValue: '4f3e2d1c0b9a8e7f', // Food photo hash
      qualityScore: 0.94,
      isDuplicate: false,
      isDeleted: false,
      createdAt: '1733512885000',
      updatedAt: '1733512885000'
    },
    {
      id: '11',
      localIdentifier: 'workout_gym_selfie',
      filePath: '/storage/emulated/0/Pictures/Selfies/workout_gym_selfie.jpg',
      fileName: 'workout_gym_selfie.jpg',
      fileSize: 1654000, // 1.7MB - selfie
      width: 1080,
      height: 1440,
      creationDate: '1733426485000', // Dec 5, 2024
      modificationDate: '1733426485000',
      hashValue: '7a6b5c4d3e2f1a0b', // Selfie hash
      qualityScore: 0.87,
      isDuplicate: false,
      isDeleted: false,
      createdAt: '1733426485000',
      updatedAt: '1733426485000'
    },
    {
      id: '12',
      localIdentifier: 'pet_cat_sleeping',
      filePath: '/storage/emulated/0/Pictures/Pets/pet_cat_sleeping.jpg',
      fileName: 'pet_cat_sleeping.jpg',
      fileSize: 2187000, // 2.2MB - pet photo
      width: 3024,
      height: 4032,
      creationDate: '1733340085000', // Dec 4, 2024
      modificationDate: '1733340085000',
      hashValue: 'c8d7e6f5a4b3c2d1', // Pet photo hash
      qualityScore: 0.93,
      isDuplicate: false,
      isDeleted: false,
      createdAt: '1733340085000',
      updatedAt: '1733340085000'
    }
  ];

  static getMockPhotos(): PhotoMetadata[] {
    return [...this.MOCK_PHOTOS];
  }

  static getMockPhotoCount(): number {
    return this.MOCK_PHOTOS.length;
  }

  static getDuplicateGroups() {
    const groups = new Map<string, PhotoMetadata[]>();
    
    this.MOCK_PHOTOS.forEach(photo => {
      // Group by similar hash values for beach photos (a7f3c9e8b2d4f1a6/a7/a8)
      let groupKey = photo.hashValue;
      if (photo.hashValue.startsWith('a7f3c9e8b2d4f1a')) {
        groupKey = 'beach_group';
      } else if (photo.hashValue.startsWith('f8e2a1c7d9b5e3f')) {
        groupKey = 'family_group';
      } else if (photo.hashValue === '3d4e5f6a7b8c9d0e') {
        groupKey = 'screenshot_group';
      }
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(photo);
    });

    // Only return groups with more than one photo (duplicates)
    return Array.from(groups.values()).filter(group => group.length > 1);
  }

  static getStats() {
    const duplicateGroups = this.getDuplicateGroups();
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + (group.length - 1), 0);
    const duplicateSize = duplicateGroups.reduce((sum, group) => {
      // Calculate size of duplicates (all photos except the first one)
      return sum + group.slice(1).reduce((groupSum, photo) => groupSum + photo.fileSize, 0);
    }, 0);

    const stats = {
      totalPhotos: this.MOCK_PHOTOS.length,
      duplicatePhotos: totalDuplicates,
      duplicateSize,
      duplicateGroups: duplicateGroups.length
    };

    console.log('📊 Mock Data Stats:', stats);
    console.log('📊 Duplicate Groups Detail:', duplicateGroups.map(group => ({
      hash: group[0]?.hashValue || 'unknown',
      count: group.length,
      photos: group.map(p => p.fileName)
    })));

    return stats;
  }
}

export const mockDataService = new MockDataService();