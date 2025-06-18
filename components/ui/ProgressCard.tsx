import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/utils/constants';

interface ProgressCardProps {
  title: string;
  current: number;
  total: number;
  description?: string;
  showPercentage?: boolean;
}

export function ProgressCard({ 
  title, 
  current, 
  total, 
  description, 
  showPercentage = true 
}: ProgressCardProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {showPercentage && (
          <Text style={styles.percentage}>{Math.round(percentage)}%</Text>
        )}
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${percentage}%` }
            ]} 
          />
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.counter}>
          {current.toLocaleString()} / {total.toLocaleString()}
        </Text>
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.sm
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    flex: 1
  },
  percentage: {
    ...Typography.h2,
    color: Colors.primary,
    fontWeight: '700'
  },
  progressBarContainer: {
    marginBottom: Spacing.md
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    minWidth: 4
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  counter: {
    ...Typography.body,
    color: Colors.textSecondary
  },
  description: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'right'
  }
});