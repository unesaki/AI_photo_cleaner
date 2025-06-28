import React, { useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '../ThemedText';
import { ActionButton } from './ActionButton';
import { Colors, Spacing, Typography } from '../../src/utils/constants';
import type { DuplicateGroup, PhotoMetadata } from '../../src/types';

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  selectedPhotos: Set<string>;
  deletedPhotos?: Set<string>;
  onPhotoSelect: (photoId: string) => void;
  onSelectAllDuplicates: (group: DuplicateGroup) => void;
  showPhotoDetails?: boolean;
  compactMode?: boolean;
}

const screenWidth = Dimensions.get('window').width;

export function DuplicateGroupCard({
  group,
  selectedPhotos,
  deletedPhotos = new Set(),
  onPhotoSelect,
  onSelectAllDuplicates,
  showPhotoDetails = true,
  compactMode = false
}: DuplicateGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compactMode);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const cardWidth = compactMode 
    ? (screenWidth - Spacing.lg * 3) / 3
    : (screenWidth - Spacing.lg * 3) / 2;

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  const handleImageError = useCallback((photoId: string) => {
    setImageErrors(prev => new Set(prev).add(photoId));
  }, []);

  const formatCreatedDate = useCallback((timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const getSelectedCountInGroup = useCallback(() => {
    return group.photos.filter(photo => selectedPhotos.has(photo.id)).length;
  }, [group.photos, selectedPhotos]);

  const getDuplicateCount = useCallback(() => {
    return group.photos.filter(photo => photo.id !== group.recommendedKeepId).length;
  }, [group.photos, group.recommendedKeepId]);

  const getTotalSavingsIfAllSelected = useCallback(() => {
    return group.photos
      .filter(photo => photo.id !== group.recommendedKeepId)
      .reduce((sum, photo) => sum + photo.fileSize, 0);
  }, [group.photos, group.recommendedKeepId]);

  const renderPhotoItem = useCallback((photo: PhotoMetadata) => {
    const isSelected = selectedPhotos.has(photo.id);
    const isRecommendedKeep = photo.id === group.recommendedKeepId;
    const isDeleted = deletedPhotos.has(photo.id);
    const hasError = imageErrors.has(photo.id);

    return (
      <TouchableOpacity
        key={photo.id}
        style={[
          styles.photoItem,
          { width: cardWidth, height: cardWidth },
          isSelected && styles.selectedPhoto,
          isRecommendedKeep && styles.recommendedPhoto,
          isDeleted && styles.deletedPhoto
        ]}
        onPress={() => !isDeleted && onPhotoSelect(photo.id)}
        disabled={isRecommendedKeep || isDeleted}
        activeOpacity={isDeleted ? 1 : 0.8}
      >
        {!hasError ? (
          <Image
            source={{ uri: photo.filePath }}
            style={[styles.photoImage, isDeleted && styles.deletedImage]}
            contentFit="cover"
            onError={() => handleImageError(photo.id)}
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={200}
          />
        ) : (
          <View style={[styles.errorContainer, isDeleted && styles.deletedImage]}>
            <ThemedText style={styles.errorText}>📷</ThemedText>
            <ThemedText style={styles.errorSubtext}>読み込み失敗</ThemedText>
          </View>
        )}

        {/* Deleted state overlay */}
        {isDeleted && (
          <View style={styles.deletedOverlay}>
            <ThemedText style={styles.deletedText}>削除済み</ThemedText>
          </View>
        )}

        {/* Selection and recommendation badges */}
        <View style={styles.photoOverlay}>
          {isRecommendedKeep && (
            <View style={styles.recommendedBadge}>
              <ThemedText style={styles.badgeText}>保持推奨</ThemedText>
            </View>
          )}
          
          {isSelected && !isRecommendedKeep && (
            <View style={styles.selectedBadge}>
              <ThemedText style={styles.checkmark}>✓</ThemedText>
            </View>
          )}

          {/* Photo info overlay */}
          {showPhotoDetails && (
            <View style={styles.photoInfo}>
              <View style={styles.fileInfo}>
                <ThemedText style={styles.fileSize}>
                  {formatFileSize(photo.fileSize)}
                </ThemedText>
              </View>
              {photo.createdAt && (
                <View style={styles.dateInfo}>
                  <ThemedText style={styles.dateText}>
                    {formatCreatedDate(photo.createdAt)}
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [cardWidth, selectedPhotos, deletedPhotos, imageErrors, group.recommendedKeepId, showPhotoDetails, onPhotoSelect, handleImageError, formatFileSize, formatCreatedDate]);

  const renderCompactHeader = () => (
    <TouchableOpacity
      style={styles.compactHeader}
      onPress={() => setIsExpanded(!isExpanded)}
      activeOpacity={0.7}
    >
      <View style={styles.compactHeaderLeft}>
        <ThemedText style={styles.compactTitle}>
          重複グループ ({group.photoCount}枚)
        </ThemedText>
        <ThemedText style={styles.compactSubtitle}>
          {formatFileSize(group.totalSize)} • {getDuplicateCount()}枚削除可能
        </ThemedText>
      </View>
      <View style={styles.compactHeaderRight}>
        {getSelectedCountInGroup() > 0 && (
          <View style={styles.selectedCountBadge}>
            <ThemedText style={styles.selectedCountText}>
              {getSelectedCountInGroup()}
            </ThemedText>
          </View>
        )}
        <ThemedText style={styles.expandIcon}>
          {isExpanded ? '▼' : '▶'}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  const renderFullHeader = () => (
    <View style={styles.groupHeader}>
      <View style={styles.headerLeft}>
        <ThemedText style={styles.groupTitle}>
          重複グループ ({group.photoCount}枚)
        </ThemedText>
        <View style={styles.groupStats}>
          <ThemedText style={styles.statsText}>
            合計: {formatFileSize(group.totalSize)}
          </ThemedText>
          <ThemedText style={styles.statsText}>
            • 削除可能: {getDuplicateCount()}枚
          </ThemedText>
          <ThemedText style={styles.statsText}>
            • 節約可能: {formatFileSize(getTotalSavingsIfAllSelected())}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.headerRight}>
        {getSelectedCountInGroup() > 0 && (
          <View style={styles.selectionInfo}>
            <ThemedText style={styles.selectionText}>
              {getSelectedCountInGroup()}枚選択中
            </ThemedText>
          </View>
        )}
        <ActionButton
          title="重複を選択"
          onPress={() => onSelectAllDuplicates(group)}
          variant="secondary"
          size="small"
          style={styles.selectAllButton}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, compactMode && styles.compactContainer]}>
      {compactMode ? renderCompactHeader() : renderFullHeader()}
      
      {isExpanded && (
        <View style={styles.photosContainer}>
          <View style={[
            styles.photosGrid,
            compactMode && styles.compactPhotosGrid
          ]}>
            {group.photos.map(renderPhotoItem)}
          </View>
          
          {!compactMode && getSelectedCountInGroup() > 0 && (
            <View style={styles.selectionSummary}>
              <ThemedText style={styles.summaryText}>
                選択中: {getSelectedCountInGroup()}枚 ({formatFileSize(
                  group.photos
                    .filter(photo => selectedPhotos.has(photo.id))
                    .reduce((sum, photo) => sum + photo.fileSize, 0)
                )})
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  compactContainer: {
    marginBottom: Spacing.md,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  compactHeaderLeft: {
    flex: 1,
  },
  compactTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  compactSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  compactHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectedCountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  selectedCountText: {
    ...Typography.caption,
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 11,
  },
  expandIcon: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  groupTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  groupStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  statsText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  selectionInfo: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectionText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  selectAllButton: {
    minWidth: 80,
  },
  photosContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'flex-start',
  },
  compactPhotosGrid: {
    gap: Spacing.xs,
  },
  photoItem: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.gray100,
  },
  selectedPhoto: {
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  recommendedPhoto: {
    borderWidth: 2,
    borderColor: Colors.success,
  },
  deletedPhoto: {
    opacity: 0.5,
  },
  deletedImage: {
    opacity: 0.5,
  },
  deletedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletedText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
    backgroundColor: Colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
    fontSize: 24,
    marginBottom: 4,
  },
  errorSubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 10,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  photoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
    gap: 2,
    padding: 4,
  },
  fileInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  fileSize: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '500',
  },
  dateInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  dateText: {
    fontSize: 8,
    color: '#ffffff',
  },
  selectionSummary: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.primary + '10',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  summaryText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
});