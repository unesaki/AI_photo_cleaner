// Platform-specific service imports
import { Platform } from 'react-native';

// Import services based on platform
export const databaseService = Platform.OS === 'web' 
  ? require('./DatabaseService.web').databaseService
  : require('./DatabaseService').databaseService;

export const duplicateDetectionService = Platform.OS === 'web'
  ? require('./DuplicateDetectionService.web').duplicateDetectionService
  : require('./DuplicateDetectionService').duplicateDetectionService;

export const photoLibraryService = Platform.OS === 'web'
  ? require('./PhotoLibraryService.web').photoLibraryService
  : require('./PhotoLibraryService').photoLibraryService;

// Migration service is accessed through databaseService
// export const migrationService = Platform.OS === 'web'
//   ? require('./MigrationService.web').migrationService
//   : require('./MigrationService').migrationService;