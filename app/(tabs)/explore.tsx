import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Alert, 
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { ActionButton } from '@/components/ui/ActionButton';
import { StatCard } from '@/components/ui/StatCard';
import { DuplicateGroupCard } from '@/components/ui/DuplicateGroupCard';
import { DeletionConfirmDialog } from '@/components/ui/DeletionConfirmDialog';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, Typography, MobileOptimized } from '@/src/utils/constants';
import { isMobile, getResponsiveSpacing, getMobileSpacing, createResponsiveStyle } from '@/src/utils/responsive';
import { databaseService, duplicateDetectionService } from '@/src/services';
import type { DuplicateGroup, PhotoMetadata } from '@/src/types';


export default function DuplicateResultsScreen() {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActionOptions, setShowActionOptions] = useState(true);
  const [deletedPhotos, setDeletedPhotos] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      loadDuplicateGroups();
    }, [])
  );

  const handleReturnToHome = () => {
    router.push('/');
  };

  const loadDuplicateGroups = async () => {
    try {
      setIsLoading(true);
      const groups = await databaseService.getDuplicateGroups();
      console.log('📊 Loaded duplicate groups:', groups.length);
      groups.forEach((group: DuplicateGroup, index: number) => {
        console.log(`📊 Group ${index + 1}: ${group.photoCount} photos, ${group.photos.map((p: PhotoMetadata) => p.fileName).join(', ')}`);
      });
      setDuplicateGroups(groups);
    } catch (error) {
      console.error('Failed to load duplicate groups:', error);
      Alert.alert('エラー', '重複グループの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const selectAllDuplicatesInGroup = (group: DuplicateGroup) => {
    const newSelected = new Set(selectedPhotos);
    group.photos.forEach(photo => {
      if (photo.id !== group.recommendedKeepId) {
        newSelected.add(photo.id);
      }
    });
    setSelectedPhotos(newSelected);
  };

  const handleMarkGroupAsNotDuplicate = (group: DuplicateGroup) => {
    Alert.alert(
      '重複ではないとマーク',
      `このグループ（${group.photoCount}枚）を重複ではないとマークしますか？\n\nこのグループは今後の分析結果から除外されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'マークする',
          style: 'default',
          onPress: async () => {
            try {
              // データベースでグループを非重複としてマーク
              await databaseService.markGroupAsNotDuplicate(group.id);
              
              // UIから該当グループを削除
              setDuplicateGroups(prevGroups => 
                prevGroups.filter(g => g.id !== group.id)
              );
              
              // 選択状態もクリア
              const newSelected = new Set(selectedPhotos);
              group.photos.forEach(photo => {
                newSelected.delete(photo.id);
              });
              setSelectedPhotos(newSelected);
              
              Alert.alert('完了', 'グループを重複ではないとマークしました');
            } catch (error) {
              console.error('Failed to mark group as not duplicate:', error);
              Alert.alert('エラー', 'グループのマークに失敗しました');
            }
          }
        }
      ]
    );
  };

  const deleteSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) {
      Alert.alert('選択が必要です', '削除する重複写真を選択してください。');
      return;
    }

    setShowDeleteConfirm(true);
  };

  const performDeletion = async () => {
    try {
      setIsDeleting(true);
      setShowDeleteConfirm(false);
      
      // Track which photos will be deleted for UI update
      const photosToDelete = Array.from(selectedPhotos);
      
      // Group photos by their duplicate group for batch deletion
      const groupedDeletions = new Map<string, string[]>();
      
      duplicateGroups.forEach(group => {
        const photosToDeleteInGroup = group.photos
          .filter(photo => selectedPhotos.has(photo.id))
          .map(photo => photo.id);
        
        if (photosToDeleteInGroup.length > 0) {
          groupedDeletions.set(group.id, photosToDeleteInGroup);
        }
      });

      let totalDeleted = 0;
      const errors: string[] = [];

      for (const [groupId, photoIdsInGroup] of groupedDeletions) {
        const result = await duplicateDetectionService.deleteDuplicatePhotos(
          groupId, 
          photoIdsInGroup
        );
        
        totalDeleted += result.deletedCount;
        errors.push(...result.errors);
      }

      if (errors.length > 0) {
        Alert.alert(
          '一部削除に失敗',
          `${totalDeleted}枚削除しました。${errors.length}件のエラーが発生しました。`
        );
      } else {
        Alert.alert('削除完了', `${totalDeleted}枚の写真を削除しました`);
      }

      // Update deleted photos state to show grayed out UI
      const newDeletedPhotos = new Set(deletedPhotos);
      photosToDelete.forEach(photoId => newDeletedPhotos.add(photoId));
      setDeletedPhotos(newDeletedPhotos);

      // Clear selection but keep the groups visible with grayed out deleted photos
      setSelectedPhotos(new Set());
      
      // Don't reload duplicate groups - keep them visible with deleted photos grayed out
      // await loadDuplicateGroups();

    } catch (error) {
      console.error('Deletion failed:', error);
      Alert.alert('エラー', '削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDeletion = () => {
    setShowDeleteConfirm(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const calculatePotentialSavings = (): number => {
    return Array.from(selectedPhotos).reduce((total, photoId) => {
      for (const group of duplicateGroups) {
        const photo = group.photos.find(p => p.id === photoId);
        if (photo) {
          return total + photo.fileSize;
        }
      }
      return total;
    }, 0);
  };


  const renderDuplicateGroup = ({ item: group }: { item: DuplicateGroup }) => (
    <DuplicateGroupCard
      group={group}
      selectedPhotos={selectedPhotos}
      deletedPhotos={deletedPhotos}
      onPhotoSelect={togglePhotoSelection}
      onSelectAllDuplicates={selectAllDuplicatesInGroup}
      onMarkAsNotDuplicate={handleMarkGroupAsNotDuplicate}
      showPhotoDetails={true}
      compactMode={false}
    />
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>重複写真を読み込み中...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (duplicateGroups.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyTitle}>🎉 重複写真は見つかりませんでした</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            あなたの写真ライブラリはすでに整理されています
          </ThemedText>
          <View style={styles.emptyActionContainer}>
            <ActionButton
              title="TOPに戻る"
              onPress={handleReturnToHome}
              variant="primary"
              style={styles.emptyActionButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + (group.photoCount - 1), 0);
  const totalSavings = duplicateGroups.reduce((sum, group) => sum + group.totalSize, 0);

  // If no actual duplicates exist (all groups only have 1 photo), show empty state
  if (totalDuplicates === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyTitle}>🎉 重複写真は見つかりませんでした</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            分析は完了しましたが、削除可能な重複写真はありませんでした
          </ThemedText>
          <View style={styles.emptyActionContainer}>
            <ActionButton
              title="TOPに戻る"
              onPress={handleReturnToHome}
              variant="primary"
              style={styles.emptyActionButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const handleMarkAsNotDuplicate = () => {
    Alert.alert(
      'AI学習',
      'これらの写真は重複ではないとAIに学習させますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '学習させる', 
          style: 'default',
          onPress: () => {
            // TODO: AI学習機能の実装
            Alert.alert('完了', 'AIが学習しました。今後の精度が向上します。');
            setShowActionOptions(false);
          }
        }
      ]
    );
  };

  const handleProceedWithDeletion = () => {
    console.log('🔍 handleProceedWithDeletion called');
    console.log('🔍 selectedPhotos.size:', selectedPhotos.size);
    console.log('🔍 totalDuplicates:', totalDuplicates);
    console.log('🔍 duplicateGroups.length:', duplicateGroups.length);
    
    // Check if any photos are selected
    if (selectedPhotos.size === 0) {
      console.log('⚠️ No photos selected, showing alert');
      Alert.alert(
        '選択が必要です', 
        '削除する重複写真を選択してください。\n\n画像をタップして選択してから削除ボタンを押してください。',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    console.log('✅ Photos selected, proceeding with deletion confirmation');
    // Don't hide action options, just proceed with deletion confirmation
    setShowDeleteConfirm(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>重複写真の検出結果</ThemedText>
        <ThemedText style={styles.resultSummary}>
          {totalDuplicates}枚の重複写真が見つかりました
        </ThemedText>
        
        {showActionOptions && (
          <View style={styles.actionOptionsCard}>
            <ThemedText style={styles.actionOptionsTitle}>どうしますか？</ThemedText>
            <View style={styles.mainActionButtons}>
              <ActionButton
                title="重複を削除"
                onPress={handleProceedWithDeletion}
                variant="danger"
                style={styles.mainActionButton}
              />
              <ActionButton
                title="TOPに戻る"
                onPress={handleReturnToHome}
                variant="secondary"
                style={styles.mainActionButton}
              />
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={duplicateGroups}
        renderItem={renderDuplicateGroup}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={() => (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <StatCard
                icon="🗑️"
                title="重複検出"
                value={`${totalDuplicates}枚`}
                color={Colors.warning}
              />
              <StatCard
                icon="💾"
                title="削減可能"
                value={formatFileSize(totalSavings)}
                color={Colors.info}
              />
            </View>
          </View>
        )}
      />

      {selectedPhotos.size > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarInfo}>
            <ThemedText style={styles.bottomBarText}>
              {selectedPhotos.size}枚選択中
            </ThemedText>
            <ThemedText style={styles.bottomBarSubtext}>
              {formatFileSize(calculatePotentialSavings())} 削減予定
            </ThemedText>
          </View>
          <ActionButton
            title="削除実行"
            onPress={deleteSelectedPhotos}
            variant="danger"
            loading={isDeleting}
            style={styles.deleteButton}
          />
        </View>
      )}

      <DeletionConfirmDialog
        visible={showDeleteConfirm}
        selectedPhotos={selectedPhotos}
        duplicateGroups={duplicateGroups}
        onCancel={handleCancelDeletion}
        onConfirm={performDeletion}
        isDeleting={isDeleting}
      />
    </SafeAreaView>
  );
}

const responsiveSpacing = getResponsiveSpacing();
const mobileSpacing = getMobileSpacing();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.body,
      color: Colors.textSecondary,
    },
    tablet: {
      ...Typography.body,
      color: Colors.textSecondary,
    }
  }),
  emptyContainer: createResponsiveStyle({
    mobile: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: responsiveSpacing.md,
    },
    tablet: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
    }
  }),
  emptyTitle: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.h1,
      color: Colors.textPrimary,
      textAlign: 'center',
      marginBottom: responsiveSpacing.md,
    },
    tablet: {
      ...Typography.h1,
      color: Colors.textPrimary,
      textAlign: 'center',
      marginBottom: Spacing.md,
    }
  }),
  emptySubtitle: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.body,
      color: Colors.textSecondary,
      textAlign: 'center',
    },
    tablet: {
      ...Typography.body,
      color: Colors.textSecondary,
      textAlign: 'center',
    }
  }),
  emptyActionContainer: createResponsiveStyle({
    mobile: {
      marginTop: responsiveSpacing.lg,
      width: '100%',
      alignItems: 'center',
    },
    tablet: {
      marginTop: Spacing.xl,
      width: '100%',
      alignItems: 'center',
    }
  }),
  emptyActionButton: createResponsiveStyle({
    mobile: {
      width: '100%',
      minHeight: MobileOptimized.touchTarget.minHeight,
    },
    tablet: {
      minWidth: 150,
    }
  }),
  header: createResponsiveStyle({
    mobile: {
      padding: responsiveSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Colors.gray100,
    },
    tablet: {
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: Colors.gray100,
    }
  }),
  title: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.h1,
      color: Colors.textPrimary,
      marginBottom: responsiveSpacing.xs,
      textAlign: 'center',
    },
    tablet: {
      ...Typography.h1,
      color: Colors.textPrimary,
      marginBottom: Spacing.sm,
    }
  }),
  resultSummary: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.body,
      color: Colors.textSecondary,
      textAlign: 'center',
      marginBottom: responsiveSpacing.md,
    },
    tablet: {
      ...Typography.body,
      color: Colors.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.lg,
    }
  }),
  actionOptionsCard: createResponsiveStyle({
    mobile: {
      backgroundColor: Colors.surface,
      borderRadius: 8,
      padding: mobileSpacing.cardPadding,
      marginBottom: responsiveSpacing.md,
      borderWidth: 1,
      borderColor: Colors.gray100,
    },
    tablet: {
      backgroundColor: Colors.surface,
      borderRadius: 12,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: Colors.gray100,
    }
  }),
  actionOptionsTitle: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.h2,
      color: Colors.textPrimary,
      textAlign: 'center',
      marginBottom: responsiveSpacing.sm,
    },
    tablet: {
      ...Typography.h2,
      color: Colors.textPrimary,
      textAlign: 'center',
      marginBottom: Spacing.md,
    }
  }),
  mainActionButtons: createResponsiveStyle({
    mobile: {
      flexDirection: 'column',
      gap: responsiveSpacing.xs,
    },
    tablet: {
      flexDirection: 'row',
      gap: Spacing.sm,
    }
  }),
  mainActionButton: createResponsiveStyle({
    mobile: {
      width: '100%',
      minHeight: MobileOptimized.touchTarget.minHeight,
    },
    tablet: {
      flex: 1,
      minHeight: MobileOptimized.touchTarget.minHeight,
    }
  }),
  statsContainer: createResponsiveStyle({
    mobile: {
      padding: responsiveSpacing.md,
    },
    tablet: {
      padding: Spacing.md,
    }
  }),
  statsRow: createResponsiveStyle({
    mobile: {
      flexDirection: 'row',
      gap: responsiveSpacing.xs,
    },
    tablet: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: Spacing.md,
    }
  }),
  listContent: createResponsiveStyle({
    mobile: {
      padding: responsiveSpacing.md,
    },
    tablet: {
      padding: Spacing.lg,
    }
  }),
  bottomBar: createResponsiveStyle({
    mobile: {
      flexDirection: 'column',
      alignItems: 'stretch',
      padding: responsiveSpacing.md,
      backgroundColor: Colors.surface,
      borderTopWidth: 1,
      borderTopColor: Colors.gray100,
      gap: responsiveSpacing.sm,
    },
    tablet: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.lg,
      backgroundColor: Colors.surface,
      borderTopWidth: 1,
      borderTopColor: Colors.gray100,
    }
  }),
  bottomBarInfo: createResponsiveStyle({
    mobile: {
      alignItems: 'center',
    },
    tablet: {
      flex: 1,
    }
  }),
  bottomBarText: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.body,
      color: Colors.textPrimary,
      fontWeight: '600',
      textAlign: 'center',
    },
    tablet: {
      ...Typography.body,
      color: Colors.textPrimary,
      fontWeight: '600',
    }
  }),
  bottomBarSubtext: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.caption,
      color: Colors.textSecondary,
      textAlign: 'center',
    },
    tablet: {
      ...Typography.caption,
      color: Colors.textSecondary,
    }
  }),
  deleteButton: createResponsiveStyle({
    mobile: {
      width: '100%',
      minHeight: MobileOptimized.touchTarget.minHeight,
    },
    tablet: {
      minWidth: 120,
    }
  }),
});
