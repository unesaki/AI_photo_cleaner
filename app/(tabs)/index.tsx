import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ActionButton } from '@/components/ui/ActionButton';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressCard } from '@/components/ui/ProgressCard';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, Typography, MobileOptimized } from '@/src/utils/constants';
import { getResponsiveSpacing, getMobileSpacing, createResponsiveStyle } from '@/src/utils/responsive';
import { databaseService, duplicateDetectionService, photoLibraryService } from '@/src/services';
import type { AnalysisSession, PhotoMetadata } from '@/src/types';

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

  // Reload stats when screen comes into focus (e.g., after deletion)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Dashboard focused, reloading session stats...');
      loadSessionStats();
    }, [])
  );

  const loadSessionStats = async () => {
    try {
      console.log('🔄 Loading latest analysis session...');
      const latestSession = await databaseService.getLatestAnalysisSession();
      console.log('🔄 Latest session found:', latestSession);
      if (latestSession) {
        console.log('📊 Latest session data:');
        console.log('  - duplicatesFound:', latestSession.duplicatesFound);
        console.log('  - potentialSpaceSaved:', latestSession.potentialSpaceSaved);
        console.log('  - status:', latestSession.status);
        console.log('  - endTime:', latestSession.endTime);
        console.log('  - endTime type:', typeof latestSession.endTime);
        
        // Convert database session to expected format
        setLastSession({
          id: latestSession.id,
          sessionUuid: latestSession.sessionUuid,
          totalPhotos: latestSession.totalPhotos,
          analyzedPhotos: latestSession.analyzedPhotos,
          duplicatesFound: latestSession.duplicatesFound || 0,
          totalSizeAnalyzed: latestSession.totalSizeAnalyzed,
          potentialSpaceSaved: latestSession.potentialSpaceSaved || 0,
          startTime: latestSession.startTime,
          endTime: latestSession.endTime,
          status: latestSession.status,
          errorMessage: latestSession.errorMessage
        });
        console.log('✅ Last session set successfully');
      } else {
        console.log('ℹ️ No previous analysis session found');
      }
    } catch (error) {
      console.error('Failed to load session stats:', error);
    }
  };

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
      
      // Load latest analysis session
      await loadSessionStats();
      
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
    console.log('🔍 Starting analysis...');
    
    if (!hasPermission) {
      console.log('❌ No permission, requesting...');
      await requestPermissions();
      return;
    }

    let sessionUuid: string | null = null;
    const startTime = new Date();

    try {
      console.log('✅ Setting analysis state...');
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      setAnalysisMessage('準備中...');

      // Load photos from library
      console.log('📸 Loading photos...');
      setAnalysisMessage('写真を読み込み中...');
      const photos = await photoLibraryService.loadPhotos((current: number, total: number) => {
        setAnalysisProgress((current / total) * 0.3); // 30% for loading
        setAnalysisMessage(`写真を読み込み中... ${current}/${total}`);
      });
      
      console.log(`📸 Loaded ${photos.length} photos`);
      
      if (photos.length === 0) {
        console.log('❌ No photos found');
        Alert.alert('情報', '分析する写真が見つかりませんでした');
        return;
      }

      // Create analysis session
      console.log('💾 Creating analysis session...');
      sessionUuid = await databaseService.createAnalysisSession(photos.length);
      console.log(`💾 Created session: ${sessionUuid}`);

      // Start analysis
      console.log('🧠 Starting duplicate analysis...');
      console.log('🧠 Photos to analyze:', photos.length);
      console.log('🧠 First few photos:', photos.slice(0, 3).map((p: PhotoMetadata) => ({ filename: p.fileName, uri: p.filePath })));
      setAnalysisMessage('重複を分析中...');
      
      console.log('🧠 Converting photos to Photo format...');
      const convertedPhotos = photos.map((photo: PhotoMetadata) => {
        console.log('🧠 Converting photo:', photo.fileName);
        try {
          // Safe date parsing with fallback
          const safeDate = (dateStr: string, fallback = new Date()) => {
            try {
              const date = new Date(dateStr);
              return isNaN(date.getTime()) ? fallback : date;
            } catch {
              return fallback;
            }
          };

          const converted = {
            id: photo.id,
            localIdentifier: photo.localIdentifier,
            uri: photo.filePath,
            filename: photo.fileName,
            fileSize: photo.fileSize,
            width: photo.width,
            height: photo.height,
            creationDate: safeDate(photo.creationDate),
            modificationDate: safeDate(photo.modificationDate),
            mediaType: 'photo' as const
          };
          
          console.log('🧠 Converted photo:', { 
            filename: converted.filename, 
            uri: converted.uri
          });
          return converted;
        } catch (error) {
          console.error('❌ Failed to convert photo:', photo.fileName, error);
          throw error;
        }
      });
      
      console.log('🧠 Calling duplicateDetectionService.analyzePhotos...');
      const result = await duplicateDetectionService.analyzePhotos(
        convertedPhotos,
        (progress: number, message: string) => {
          console.log(`🧠 Analysis progress: ${progress}% - ${message}`);
          setAnalysisProgress(0.3 + (progress / 100) * 0.7); // 30-100%
          setAnalysisMessage(message);
        },
        true // Clear existing groups for fresh analysis
      );
      
      console.log('🧠 Analysis result:', result);

      // Update photo count
      setPhotoCount(photos.length);

      const endTime = new Date();

      // Update analysis session with results
      await databaseService.updateAnalysisSession(sessionUuid, {
        analyzedPhotos: photos.length,
        duplicatesFound: result.totalDuplicates,
        potentialSpaceSaved: result.spaceSaved,
        endTime: endTime.toISOString(),
        status: 'completed'
      });

      // Create session object for UI
      const newSession: AnalysisSession = {
        id: sessionUuid!,
        sessionUuid: sessionUuid!,
        totalPhotos: photos.length,
        analyzedPhotos: photos.length,
        duplicatesFound: result.totalDuplicates,
        totalSizeAnalyzed: result.spaceSaved,
        potentialSpaceSaved: result.spaceSaved,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'completed'
      };
      setLastSession(newSession);

      // Immediately navigate to results screen
      console.log('🎯 Navigating to results screen...');
      router.push('/explore');

      // Show success message briefly without blocking navigation
      setTimeout(() => {
        Alert.alert(
          '分析完了',
          `重複写真が${result.totalDuplicates}枚検出されました。`,
          [{ text: 'OK', style: 'default' }]
        );
      }, 500);

    } catch (error) {
      console.error('❌ Analysis failed at top level:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Update session with error if it was created
      if (sessionUuid) {
        try {
          await databaseService.updateAnalysisSession(sessionUuid, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
        } catch (updateError) {
          console.error('Failed to update session with error:', updateError);
        }
      }
      
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

  const formatDate = (dateInput: string | number | null | undefined): string => {
    if (!dateInput) return '未実行';
    
    let date: Date;
    try {
      if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      } else if (typeof dateInput === 'number') {
        date = new Date(dateInput);
      } else {
        return '未実行';
      }
      
      if (isNaN(date.getTime())) return '未実行';
    } catch (error) {
      console.error('Date parsing error:', error);
      return '未実行';
    }
    
    console.log('📅 Formatting date:', dateInput, '→', date.toISOString());
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    // For recent times, show more precise information
    if (diffMinutes < 60) {
      return diffMinutes < 1 ? 'たった今' : `${diffMinutes}分前`;
    }
    if (diffHours < 24) {
      return `${diffHours}時間前`;
    }
    if (diffDays === 0) {
      return '今日';
    }
    if (diffDays === 1) {
      return '1日前';
    }
    if (diffDays < 7) {
      return `${diffDays}日前`;
    }
    
    // For older dates, show actual date
    if (diffDays < 30) {
      return date.toLocaleDateString('ja-JP', { 
        month: 'numeric', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });
    }
    
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric',
      month: 'numeric', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
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
        {(() => {
          console.log('🔍 Checking lastSession display condition:', {
            hasSession: !!lastSession,
            status: lastSession?.status,
            shouldShow: lastSession && lastSession.status === 'completed'
          });
          return lastSession && lastSession.status === 'completed';
        })() && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>📈 前回の整理効果</ThemedText>
            <View style={styles.resultsGrid}>
              <StatCard
                icon="🗑️"
                title="重複検出"
                value={`${lastSession?.duplicatesFound || 0}枚`}
                color={Colors.success}
              />
              <StatCard
                icon="💾"
                title="容量削減"
                value={formatFileSize(lastSession?.potentialSpaceSaved || 0)}
                color={Colors.info}
              />
            </View>
            <ThemedText style={styles.lastAnalysisDate}>
              最終分析: {formatDate(lastSession?.endTime)}
            </ThemedText>
            
            <View style={styles.actionRow}>
              <ActionButton
                title="詳細を見る"
                onPress={() => {
                  router.push('/explore');
                }}
                variant="secondary"
                style={styles.detailButton}
              />
              <ActionButton
                title="再分析"
                onPress={startAnalysis}
                variant="primary"
                style={styles.reAnalyzeButton}
                loading={isAnalyzing}
              />
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  header: createResponsiveStyle({
    mobile: {
      padding: responsiveSpacing.lg,
      alignItems: 'center',
    },
    tablet: {
      padding: Spacing.xl,
      alignItems: 'center',
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
      marginBottom: Spacing.xs,
    }
  }),
  subtitle: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.body,
      color: Colors.textSecondary,
      textAlign: 'center',
    },
    tablet: {
      ...Typography.body,
      color: Colors.textSecondary,
    }
  }),
  section: createResponsiveStyle({
    mobile: {
      paddingHorizontal: responsiveSpacing.md,
      marginBottom: mobileSpacing.sectionSpacing,
    },
    tablet: {
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.lg,
    }
  }),
  sectionTitle: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.h2,
      color: Colors.textPrimary,
      marginBottom: responsiveSpacing.sm,
    },
    tablet: {
      ...Typography.h2,
      color: Colors.textPrimary,
      marginBottom: Spacing.md,
    }
  }),
  actionCard: createResponsiveStyle({
    mobile: {
      backgroundColor: Colors.card,
      borderRadius: 8,
      padding: mobileSpacing.cardPadding,
      alignItems: 'center',
    },
    tablet: {
      backgroundColor: Colors.card,
      borderRadius: 12,
      padding: Spacing.lg,
      alignItems: 'center',
    }
  }),
  actionDescription: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.body,
      color: Colors.textSecondary,
      textAlign: 'center',
      marginBottom: mobileSpacing.buttonSpacing,
    },
    tablet: {
      ...Typography.body,
      color: Colors.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.lg,
    }
  }),
  mainButton: {
    width: '100%',
    minHeight: MobileOptimized.touchTarget.minHeight,
  },
  resultsGrid: createResponsiveStyle({
    mobile: {
      flexDirection: 'column',
      gap: responsiveSpacing.sm,
    },
    tablet: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: Spacing.md,
    }
  }),
  lastAnalysisDate: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.caption,
      color: Colors.textSecondary,
      textAlign: 'center',
      marginTop: responsiveSpacing.xs,
    },
    tablet: {
      ...Typography.caption,
      color: Colors.textSecondary,
      textAlign: 'center',
      marginTop: Spacing.sm,
    }
  }),
  actionRow: createResponsiveStyle({
    mobile: {
      flexDirection: 'column',
      marginTop: mobileSpacing.buttonSpacing,
      gap: responsiveSpacing.sm,
    },
    tablet: {
      flexDirection: 'row',
      marginTop: Spacing.lg,
      gap: Spacing.md,
    }
  }),
  detailButton: createResponsiveStyle({
    mobile: {
      width: '100%',
      minHeight: MobileOptimized.touchTarget.minHeight,
    },
    tablet: {
      flex: 1,
    }
  }),
  reAnalyzeButton: createResponsiveStyle({
    mobile: {
      width: '100%',
      minHeight: MobileOptimized.touchTarget.minHeight,
    },
    tablet: {
      flex: 1,
    }
  }),
  bottomSpacer: createResponsiveStyle({
    mobile: {
      height: responsiveSpacing.lg,
    },
    tablet: {
      height: Spacing.xl,
    }
  }),
});
