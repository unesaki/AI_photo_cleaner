import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '../ThemedText';
import { ActionButton } from './ActionButton';
import { Colors, Spacing, Typography } from '../../src/utils/constants';
import type { PhotoMetadata, DuplicateGroup } from '../../src/types';

interface DeletionConfirmDialogProps {
  visible: boolean;
  selectedPhotos: Set<string>;
  duplicateGroups: DuplicateGroup[];
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

const screenWidth = Dimensions.get('window').width;
const previewSize = 60;

export function DeletionConfirmDialog({
  visible,
  selectedPhotos,
  duplicateGroups,
  onCancel,
  onConfirm,
  isDeleting = false
}: DeletionConfirmDialogProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

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

  const getSelectedPhotosData = useCallback(() => {
    const photos: PhotoMetadata[] = [];
    let totalSize = 0;
    let groupsAffected = 0;
    const affectedGroups = new Set<string>();

    duplicateGroups.forEach(group => {
      let hasSelectedInGroup = false;
      group.photos.forEach(photo => {
        if (selectedPhotos.has(photo.id)) {
          photos.push(photo);
          totalSize += photo.fileSize;
          hasSelectedInGroup = true;
        }
      });
      if (hasSelectedInGroup) {
        affectedGroups.add(group.id);
        groupsAffected++;
      }
    });

    return {
      photos,
      totalSize,
      groupsAffected,
      count: photos.length
    };
  }, [selectedPhotos, duplicateGroups]);

  const getGroupAnalysis = useCallback(() => {
    const analysis: Array<{
      group: DuplicateGroup;
      selectedPhotos: PhotoMetadata[];
      willBeEmpty: boolean;
      remainingPhotos: number;
    }> = [];

    duplicateGroups.forEach(group => {
      const selectedInGroup = group.photos.filter(photo => selectedPhotos.has(photo.id));
      if (selectedInGroup.length > 0) {
        const remainingCount = group.photos.length - selectedInGroup.length;
        analysis.push({
          group,
          selectedPhotos: selectedInGroup,
          willBeEmpty: remainingCount === 0,
          remainingPhotos: remainingCount
        });
      }
    });

    return analysis;
  }, [selectedPhotos, duplicateGroups]);

  const selectedData = getSelectedPhotosData();
  const groupAnalysis = getGroupAnalysis();

  const renderPhotoPreview = (photo: PhotoMetadata) => {
    const hasError = imageErrors.has(photo.id);

    return (
      <View key={photo.id} style={styles.photoPreview}>
        {!hasError ? (
          <Image
            source={{ uri: photo.filePath }}
            style={styles.previewImage}
            contentFit="cover"
            onError={() => handleImageError(photo.id)}
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          />
        ) : (
          <View style={styles.errorPreview}>
            <ThemedText style={styles.errorIcon}>📷</ThemedText>
          </View>
        )}
        <View style={styles.previewOverlay}>
          <ThemedText style={styles.previewSize}>
            {formatFileSize(photo.fileSize)}
          </ThemedText>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={isDeleting ? undefined : onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <ThemedText style={styles.warningIcon}>⚠️</ThemedText>
            </View>
            <ThemedText style={styles.title}>削除の確認</ThemedText>
            <ThemedText style={styles.subtitle}>
              選択された写真を削除しようとしています
            </ThemedText>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Summary */}
            <View style={styles.summarySection}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>削除対象:</ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {selectedData.count}枚の写真
                  </ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>削減容量:</ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {formatFileSize(selectedData.totalSize)}
                  </ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>影響グループ:</ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {selectedData.groupsAffected}グループ
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Photo Previews */}
            <View style={styles.previewSection}>
              <ThemedText style={styles.sectionTitle}>削除される写真</ThemedText>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.previewScroll}
              >
                <View style={styles.previewGrid}>
                  {selectedData.photos.slice(0, 10).map(renderPhotoPreview)}
                  {selectedData.photos.length > 10 && (
                    <View style={styles.morePhotos}>
                      <ThemedText style={styles.morePhotosText}>
                        +{selectedData.photos.length - 10}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Group Impact Analysis */}
            <View style={styles.analysisSection}>
              <ThemedText style={styles.sectionTitle}>グループへの影響</ThemedText>
              {groupAnalysis.map(({ group, selectedPhotos: selected, willBeEmpty, remainingPhotos }) => (
                <View key={group.id} style={styles.groupImpact}>
                  <View style={styles.groupImpactHeader}>
                    <ThemedText style={styles.groupImpactTitle}>
                      重複グループ ({group.photoCount}枚)
                    </ThemedText>
                    {willBeEmpty ? (
                      <View style={styles.emptyBadge}>
                        <ThemedText style={styles.emptyBadgeText}>空になります</ThemedText>
                      </View>
                    ) : (
                      <ThemedText style={styles.remainingText}>
                        {remainingPhotos}枚残る
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.groupImpactDetails}>
                    {selected.length}枚削除 → {formatFileSize(
                      selected.reduce((sum, photo) => sum + photo.fileSize, 0)
                    )} 削減
                  </ThemedText>
                </View>
              ))}
            </View>

            {/* Warning */}
            <View style={styles.warningSection}>
              <View style={styles.warningCard}>
                <ThemedText style={styles.warningTitle}>⚠️ 重要な注意事項</ThemedText>
                <ThemedText style={styles.warningText}>
                  • この操作は取り消すことができません
                </ThemedText>
                <ThemedText style={styles.warningText}>
                  • 写真は端末から完全に削除されます
                </ThemedText>
                <ThemedText style={styles.warningText}>
                  • 削除前にバックアップを確認してください
                </ThemedText>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <ActionButton
              title="キャンセル"
              onPress={onCancel}
              variant="secondary"
              style={styles.cancelButton}
              disabled={isDeleting}
            />
            <ActionButton
              title={isDeleting ? "削除中..." : "削除実行"}
              onPress={onConfirm}
              variant="danger"
              style={styles.confirmButton}
              loading={isDeleting}
              disabled={isDeleting}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialog: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  warningIcon: {
    fontSize: 24,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    maxHeight: 400,
  },
  summarySection: {
    padding: Spacing.lg,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  summaryValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  previewSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  previewScroll: {
    marginHorizontal: -Spacing.lg,
  },
  previewGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  photoPreview: {
    width: previewSize,
    height: previewSize,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.gray100,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  errorPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
  },
  errorIcon: {
    fontSize: 20,
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  previewSize: {
    fontSize: 8,
    color: '#ffffff',
    textAlign: 'center',
  },
  morePhotos: {
    width: previewSize,
    height: previewSize,
    borderRadius: 6,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gray300,
    borderStyle: 'dashed',
  },
  morePhotosText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 10,
  },
  analysisSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  groupImpact: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.info,
  },
  groupImpactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  groupImpactTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  emptyBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyBadgeText: {
    ...Typography.caption,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  remainingText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '600',
  },
  groupImpactDetails: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  warningSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  warningCard: {
    backgroundColor: Colors.warning + '10',
    borderRadius: 8,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  warningTitle: {
    ...Typography.body,
    color: Colors.warning,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  warningText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});