import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/ui/ActionButton';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressCard } from '@/components/ui/ProgressCard';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, Typography } from '@/src/utils/constants';
import { databaseService, duplicateDetectionService, photoLibraryService } from '@/src/services';
import type { AnalysisSession, AnalysisResult } from '@/src/types';

export default function DashboardScreen() {
  const [photoCount, setPhotoCount] = useState(0);
  const [lastSession, setLastSession] = useState<AnalysisSession | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisMessage, setAnalysisMessage] = useState('');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await databaseService.initialize();
      
      // Check permissions
      const permissionGranted = await photoLibraryService.hasPermissions();
      setHasPermission(permissionGranted);
      
      if (permissionGranted) {
        // Get photo count
        const count = await photoLibraryService.getPhotoCount();
        setPhotoCount(count);
      }
      
      // Get stats instead of session for now
      try {
        const stats = await databaseService.getStats();
        // Create a mock session from stats
        if (stats.duplicatePhotos > 0) {
          setLastSession({
            id: 'mock_session',
            startedAt: Date.now() - 86400000,
            completedAt: Date.now() - 86400000 + 60000,
            photosAnalyzed: stats.totalPhotos,
            duplicatesFound: stats.duplicatePhotos,
            spaceSaved: stats.duplicateSize,
            status: 'completed'
          } as AnalysisSession);
        }
      } catch (error) {
        // Ignore if stats not available
        console.log('Stats not available yet');
      }
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      Alert.alert('エラー', 'アプリの初期化に失敗しました');
    }
  };

  const requestPermissions = async () => {
    try {
      const granted = await photoLibraryService.requestPermissions();
      setHasPermission(granted);
      
      if (granted) {
        const count = await photoLibraryService.getPhotoCount();
        setPhotoCount(count);
      } else {
        Alert.alert(
          '権限が必要です',
          '写真を分析するために、フォトライブラリへのアクセス権限が必要です。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '設定を開く', onPress: () => {
              // In a real app, you would open the settings
              console.log('Open settings');
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      Alert.alert('エラー', '権限の取得に失敗しました');
    }
  };

  const startAnalysis = async () => {
    if (!hasPermission) {
      await requestPermissions();
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      setAnalysisMessage('準備中...');

      // Load photos from library
      setAnalysisMessage('写真を読み込み中...');
      const photos = await photoLibraryService.loadPhotos((current, total) => {
        setAnalysisProgress((current / total) * 0.3); // 30% for loading
        setAnalysisMessage(`写真を読み込み中... ${current}/${total}`);
      });
      
      if (photos.length === 0) {
        Alert.alert('情報', '分析する写真が見つかりませんでした');
        return;
      }

      // Start analysis
      setAnalysisMessage('重複を分析中...');
      const result = await duplicateDetectionService.analyzePhotos((current, total) => {
        setAnalysisProgress(0.3 + (current / total) * 0.7); // 70% for analysis
        setAnalysisMessage(`重複を分析中... ${current}/${total}`);
      });

      // Show results
      Alert.alert(
        '分析完了',
        `分析が完了しました。\n重複写真: ${result.totalDuplicates}枚\n節約可能容量: ${(result.spaceSaved / 1024 / 1024).toFixed(1)}MB`
      );

      // Update photo count
      setPhotoCount(photos.length);

    } catch (error) {
      console.error('Analysis failed:', error);
      Alert.alert('エラー', '分析に失敗しました');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setAnalysisMessage('');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1日前';
    if (diffDays < 7) return `${diffDays}日前`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)}週間前`;
    return `${Math.ceil(diffDays / 30)}ヶ月前`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>AI Photo Cleaner</ThemedText>
          <ThemedText style={styles.subtitle}>写真整理をスマートに</ThemedText>
        </View>

        {/* Photo Library Stats */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>📊 あなたの写真ライブラリ</ThemedText>
          <StatCard
            icon="📸"
            title="総枚数"
            value={photoCount.toLocaleString() + '枚'}
            description={hasPermission ? '' : '権限が必要です'}
          />
        </View>

        {/* Analysis Progress */}
        {isAnalyzing && (
          <View style={styles.section}>
            <ProgressCard
              title="🧠 AI分析中..."
              current={analysisProgress}
              total={100}
              description={analysisMessage}
            />
          </View>
        )}

        {/* Main Action */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>🚀 スマート分析</ThemedText>
          <View style={styles.actionCard}>
            <ThemedText style={styles.actionDescription}>
              重複写真を自動検出して、ストレージ容量を節約しましょう
            </ThemedText>
            <ActionButton
              title={hasPermission ? "今すぐ分析する" : "権限を許可"}
              onPress={hasPermission ? startAnalysis : requestPermissions}
              size="large"
              loading={isAnalyzing}
              style={styles.mainButton}
            />
          </View>
        </View>

        {/* Last Analysis Results */}
        {lastSession && lastSession.status === 'completed' && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>📈 前回の整理効果</ThemedText>
            <View style={styles.resultsGrid}>
              <StatCard
                icon="🗑️"
                title="重複検出"
                value={lastSession.duplicatesFound + '枚'}
                color={Colors.success}
              />
              <StatCard
                icon="💾"
                title="容量削減"
                value={formatFileSize(lastSession.potentialSpaceSaved)}
                color={Colors.info}
              />
            </View>
            <ThemedText style={styles.lastAnalysisDate}>
              最終分析: {formatDate(lastSession.startTime)}
            </ThemedText>
          </View>
        )}

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
  sectionTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  actionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  actionDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  mainButton: {
    width: '100%',
  },
  resultsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  lastAnalysisDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
});
