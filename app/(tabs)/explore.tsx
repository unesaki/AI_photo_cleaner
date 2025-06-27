import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Alert, 
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ActionButton } from '@/components/ui/ActionButton';
import { StatCard } from '@/components/ui/StatCard';
import { DuplicateGroupCard } from '@/components/ui/DuplicateGroupCard';
import { DeletionConfirmDialog } from '@/components/ui/DeletionConfirmDialog';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, Typography } from '@/src/utils/constants';
import { databaseService, duplicateDetectionService } from '@/src/services';
import type { DuplicateGroup, PhotoMetadata } from '@/src/types';


export default function DuplicateResultsScreen() {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDuplicateGroups();
    }, [])
  );

  const loadDuplicateGroups = async () => {
    try {
      setIsLoading(true);
      const groups = await databaseService.getDuplicateGroups();
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

  const deleteSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) {
      Alert.alert('注意', '削除する写真を選択してください');
      return;
    }

    setShowDeleteConfirm(true);
  };

  const performDeletion = async () => {
    try {
      setIsDeleting(true);
      setShowDeleteConfirm(false);
      
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

      setSelectedPhotos(new Set());
      await loadDuplicateGroups();

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
      onPhotoSelect={togglePhotoSelection}
      onSelectAllDuplicates={selectAllDuplicatesInGroup}
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
        </View>
      </SafeAreaView>
    );
  }

  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + (group.photoCount - 1), 0);
  const totalSavings = duplicateGroups.reduce((sum, group) => sum + group.totalSize, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>重複写真結果</ThemedText>
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

      <FlatList
        data={duplicateGroups}
        renderItem={renderDuplicateGroup}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
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
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  listContent: {
    padding: Spacing.lg,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  bottomBarInfo: {
    flex: 1,
  },
  bottomBarText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  bottomBarSubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  deleteButton: {
    minWidth: 120,
  },
});
