import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ActionButton } from './ActionButton';
import { StatCard } from './StatCard';
import { ThemedText } from '../ThemedText';
import { Colors, Spacing, Typography } from '../../src/utils/constants';
import { databaseService } from '../../src/services/DatabaseService';

interface MigrationStatus {
  currentVersion: number;
  latestVersion: number;
  appliedMigrations: any[];
  pendingMigrations: any[];
  isUpToDate: boolean;
}

export function MigrationStatusCard() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadMigrationStatus();
  }, []);

  const loadMigrationStatus = async () => {
    try {
      setIsLoading(true);
      const migrationStatus = await databaseService.getMigrationStatus();
      setStatus(migrationStatus);
    } catch (error) {
      console.error('Failed to load migration status:', error);
      Alert.alert('エラー', 'マイグレーション状況の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const runMigrations = async () => {
    if (!status || status.isUpToDate) return;

    Alert.alert(
      'マイグレーション実行',
      `${status.pendingMigrations.length}個の未適用マイグレーションがあります。実行しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '実行する', 
          onPress: async () => {
            try {
              setIsUpdating(true);
              await databaseService.runMigrations();
              await loadMigrationStatus();
              Alert.alert('完了', 'マイグレーションが正常に完了しました');
            } catch (error) {
              console.error('Migration failed:', error);
              Alert.alert('エラー', 'マイグレーションに失敗しました');
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  };

  const resetDatabase = async () => {
    Alert.alert(
      '⚠️ データベースリセット',
      'すべてのデータが削除されます。この操作は取り消せません。実行しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除する', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUpdating(true);
              await databaseService.resetDatabase();
              await loadMigrationStatus();
              Alert.alert('完了', 'データベースがリセットされました');
            } catch (error) {
              console.error('Database reset failed:', error);
              Alert.alert('エラー', 'データベースリセットに失敗しました');
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <ThemedText style={styles.loadingText}>読み込み中...</ThemedText>
        </View>
      </View>
    );
  }

  if (!status) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.errorText}>マイグレーション状況を取得できませんでした</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>🗄️ データベース管理</ThemedText>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          icon="🔢"
          title="現在バージョン"
          value={status.currentVersion.toString()}
          color={status.isUpToDate ? Colors.success : Colors.warning}
        />
        <StatCard
          icon="🆕"
          title="最新バージョン"
          value={status.latestVersion.toString()}
          color={Colors.info}
        />
      </View>

      <View style={styles.statusContainer}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: status.isUpToDate ? Colors.success : Colors.warning }
        ]}>
          <ThemedText style={styles.statusText}>
            {status.isUpToDate ? '✅ 最新' : '⚠️ 更新が必要'}
          </ThemedText>
        </View>
      </View>

      {status.pendingMigrations.length > 0 && (
        <View style={styles.migrationInfo}>
          <ThemedText style={styles.migrationTitle}>
            未適用のマイグレーション: {status.pendingMigrations.length}件
          </ThemedText>
          {status.pendingMigrations.map((migration, index) => (
            <View key={migration.version} style={styles.migrationItem}>
              <ThemedText style={styles.migrationText}>
                • v{migration.version}: {migration.name}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actionsContainer}>
        {!status.isUpToDate && (
          <ActionButton
            title="マイグレーション実行"
            onPress={runMigrations}
            variant="primary"
            loading={isUpdating}
            style={styles.actionButton}
          />
        )}
        
        <ActionButton
          title="データベースリセット"
          onPress={resetDatabase}
          variant="danger"
          size="small"
          loading={isUpdating}
          style={styles.actionButton}
        />
        
        <ActionButton
          title="状況を更新"
          onPress={loadMigrationStatus}
          variant="secondary"
          size="small"
          disabled={isUpdating}
          style={styles.actionButton}
        />
      </View>

      <View style={styles.infoContainer}>
        <ThemedText style={styles.infoText}>
          💡 マイグレーションは、データベースの構造を安全に更新するために使用されます。
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: Colors.danger,
    textAlign: 'center',
  },
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  statusText: {
    ...Typography.body,
    color: '#ffffff',
    fontWeight: '600',
  },
  migrationInfo: {
    backgroundColor: Colors.gray50,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  migrationTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  migrationItem: {
    marginBottom: Spacing.xs,
  },
  migrationText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  actionsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    width: '100%',
  },
  infoContainer: {
    backgroundColor: Colors.gray50,
    borderRadius: 8,
    padding: Spacing.md,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});