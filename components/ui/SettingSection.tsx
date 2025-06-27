import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../ThemedText';
import { Colors, Spacing, Typography } from '../../src/utils/constants';

interface SettingSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  style?: any;
}

export function SettingSection({ 
  title, 
  description, 
  children, 
  style 
}: SettingSectionProps) {
  return (
    <View style={[styles.container, style]}>
      {title && (
        <View style={styles.header}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {description && (
            <ThemedText style={styles.description}>{description}</ThemedText>
          )}
        </View>
      )}
      
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  content: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
});