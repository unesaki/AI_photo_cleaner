import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/ui/ActionButton';
import { MigrationStatusCard } from '@/components/ui/MigrationStatusCard';
import { SettingSection } from '@/components/ui/SettingSection';
import { SettingItem } from '@/components/ui/SettingItem';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, Typography } from '@/src/utils/constants';
import { databaseService } from '@/src/services';
import type { UserSettings } from '@/src/types';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<UserSettings>({
    autoDeleteDuplicates: false,
    confirmBeforeDelete: true,
    showAnalysisProgress: true,
    animateTransitions: true,
    firstLaunchCompleted: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const userSettings = await databaseService.getUserSettings();
      setSettings(userSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      Alert.alert('エラー', '設定の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = <K extends keyof UserSettings>(
    key: K, 
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setIsDirty(true);
  };

  const saveSettings = async () => {
    try {
      // Save each setting individually
      for (const [key, value] of Object.entries(settings)) {
        await databaseService.setSetting(key, value.toString());
      }
      
      setIsDirty(false);
      Alert.alert('保存完了', '設定が保存されました');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  const resetSettings = async () => {
    Alert.alert(
      '設定リセット',
      'すべての設定を初期値に戻しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'リセット', 
          style: 'destructive',
          onPress: async () => {
            const defaultSettings: UserSettings = {
              autoDeleteDuplicates: false,
              confirmBeforeDelete: true,
              showAnalysisProgress: true,
              animateTransitions: true,
              firstLaunchCompleted: true
            };
            setSettings(defaultSettings);
            setIsDirty(true);
          }
        }
      ]
    );
  };

  const clearAllData = async () => {
    Alert.alert(
      '⚠️ 全データ削除',
      'すべての写真データと分析結果が削除されます。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除する', 
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.resetDatabase();
              Alert.alert('完了', 'すべてのデータが削除されました');
            } catch (error) {
              console.error('Failed to clear data:', error);
              Alert.alert('エラー', 'データの削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>設定を読み込み中...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>⚙️ 設定</ThemedText>
          <ThemedText style={styles.subtitle}>アプリの動作をカスタマイズ</ThemedText>
        </View>

        {/* App Settings */}
        <SettingSection 
          title="📱 アプリ設定"
          description="アプリの動作をカスタマイズできます"
        >
          <SettingItem
            icon="🤖"
            title="自動削除"
            description="重複写真を確認なしで自動削除"
            value={settings.autoDeleteDuplicates}
            onValueChange={(value) => updateSetting('autoDeleteDuplicates', value)}
            type="switch"
          />
          
          <SettingItem
            icon="✅"
            title="削除前確認"
            description="写真削除前に確認ダイアログを表示"
            value={settings.confirmBeforeDelete}
            onValueChange={(value) => updateSetting('confirmBeforeDelete', value)}
            type="switch"
          />
          
          <SettingItem
            icon="📊"
            title="分析進捗表示"
            description="写真分析中の進捗バーを表示"
            value={settings.showAnalysisProgress}
            onValueChange={(value) => updateSetting('showAnalysisProgress', value)}
            type="switch"
          />
          
          <SettingItem
            icon="✨"
            title="アニメーション"
            description="画面遷移時のアニメーションを有効化"
            value={settings.animateTransitions}
            onValueChange={(value) => updateSetting('animateTransitions', value)}
            type="switch"
          />
        </SettingSection>

        {isDirty && (
          <View style={styles.section}>
            <ActionButton
              title="設定を保存"
              onPress={saveSettings}
              variant="primary"
              style={styles.saveButton}
            />
          </View>
        )}

        {/* App Info */}
        <SettingSection title="📊 アプリ情報">
          <SettingItem
            icon="📦"
            title="バージョン"
            description="現在のアプリバージョン"
            type="info"
            rightText="1.0.0"
          />
          
          <SettingItem
            icon="🎯"
            title="開発フェーズ"
            description="現在の開発段階"
            type="info"
            rightText="MVP"
          />
          
          <SettingItem
            icon="🏗️"
            title="ビルド"
            description="React Native + Expo"
            type="info"
            rightText="53.0.11"
          />
        </SettingSection>

        {/* Database Management */}
        <MigrationStatusCard />

        {/* Danger Zone */}
        <SettingSection 
          title="⚠️ 危険な操作"
          description="注意が必要な操作です"
        >
          <SettingItem
            icon="🔄"
            title="設定をリセット"
            description="すべての設定を初期値に戻す"
            type="button"
            onPress={resetSettings}
            rightText="実行"
          />
          
          <SettingItem
            icon="🗑️"
            title="全データを削除"
            description="すべての写真分析結果を消去"
            type="button"
            onPress={clearAllData}
            rightText="削除"
          />
        </SettingSection>

        <View style={styles.warningContainer}>
          <ThemedText style={styles.warningText}>
            ⚠️ 「全データを削除」はすべての写真分析結果を消去します。この操作は取り消せません。
          </ThemedText>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
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
  header: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  saveButton: {
    width: '100%',
  },
  warningContainer: {
    backgroundColor: Colors.warning + '20',
    borderRadius: 8,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
});