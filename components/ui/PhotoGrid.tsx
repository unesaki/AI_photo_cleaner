import React, { useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '../ThemedText';
import { Colors, Spacing, Typography } from '../../src/utils/constants';
import type { PhotoMetadata } from '../../src/types';

interface PhotoGridProps {
  photos: PhotoMetadata[];
  selectedPhotos?: Set<string>;
  onPhotoSelect?: (photoId: string) => void;
  onPhotoPress?: (photo: PhotoMetadata) => void;
  showSelection?: boolean;
  showFileSize?: boolean;
  numColumns?: number;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
}

const screenWidth = Dimensions.get('window').width;

export function PhotoGrid({
  photos,
  selectedPhotos = new Set(),
  onPhotoSelect,
  onPhotoPress,
  showSelection = false,
  showFileSize = true,
  numColumns = 3,
  loading = false,
  refreshing = false,
  onRefresh,
  onEndReached,
  onEndReachedThreshold = 0.1,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
}: PhotoGridProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  
  const cardWidth = (screenWidth - Spacing.lg * 2 - (numColumns - 1) * Spacing.sm) / numColumns;

  const handlePhotoPress = useCallback((photo: PhotoMetadata) => {
    if (showSelection && onPhotoSelect) {
      onPhotoSelect(photo.id);
    } else if (onPhotoPress) {
      onPhotoPress(photo);
    }
  }, [showSelection, onPhotoSelect, onPhotoPress]);

  const handleImageError = useCallback((photoId: string) => {
    setImageErrors(prev => new Set(prev).add(photoId));
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  const renderPhotoItem = useCallback(({ item: photo }: { item: PhotoMetadata }) => {
    const isSelected = selectedPhotos.has(photo.id);
    const hasError = imageErrors.has(photo.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.photoItem,
          { width: cardWidth, height: cardWidth },
          isSelected && styles.selectedPhoto
        ]}
        onPress={() => handlePhotoPress(photo)}
        activeOpacity={0.8}
      >
        {!hasError ? (
          <Image
            source={{ uri: photo.filePath }}
            style={styles.photoImage}
            contentFit="cover"
            onError={() => handleImageError(photo.id)}
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={200}
          />
        ) : (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>📷</ThemedText>
            <ThemedText style={styles.errorSubtext}>読み込み失敗</ThemedText>
          </View>
        )}

        {/* Selection indicator */}
        {showSelection && (
          <View style={styles.selectionOverlay}>
            <View style={[
              styles.selectionIndicator,
              isSelected && styles.selectedIndicator
            ]}>
              {isSelected && (
                <ThemedText style={styles.checkmark}>✓</ThemedText>
              )}
            </View>
          </View>
        )}

        {/* Photo info overlay */}
        <View style={styles.infoOverlay}>
          {showFileSize && (
            <View style={styles.fileInfo}>
              <ThemedText style={styles.fileSize}>
                {formatFileSize(photo.fileSize)}
              </ThemedText>
            </View>
          )}
          
          {photo.isDuplicate && (
            <View style={styles.duplicateBadge}>
              <ThemedText style={styles.duplicateText}>重複</ThemedText>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [
    cardWidth, 
    selectedPhotos, 
    imageErrors, 
    showSelection, 
    showFileSize, 
    handlePhotoPress, 
    handleImageError, 
    formatFileSize
  ]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: cardWidth + Spacing.sm,
    offset: Math.floor(index / numColumns) * (cardWidth + Spacing.sm),
    index,
  }), [cardWidth, numColumns]);

  const keyExtractor = useCallback((item: PhotoMetadata) => item.id, []);

  if (loading && photos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <ThemedText style={styles.loadingText}>写真を読み込み中...</ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={photos}
      renderItem={renderPhotoItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={20}
      windowSize={10}
      initialNumToRender={20}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent || (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>📷 写真がありません</ThemedText>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  photoItem: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.gray100,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedPhoto: {
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
  },
  errorText: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  errorSubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  selectionOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicator: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 4,
  },
  fileInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fileSize: {
    ...Typography.caption,
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  duplicateBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  duplicateText: {
    ...Typography.caption,
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});