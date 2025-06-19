import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/utils/constants';

interface StatCardProps {
  icon: string;
  title: string;
  value: string | number;
  description?: string;
  color?: string;
}

export function StatCard({ icon, title, value, description, color = Colors.primary }: StatCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      
      <Text style={[styles.value, { color }]}>{value}</Text>
      
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm
  },
  icon: {
    fontSize: 20,
    marginRight: Spacing.sm
  },
  title: {
    ...Typography.body,
    color: Colors.textSecondary,
    flex: 1
  },
  value: {
    ...Typography.h1,
    marginBottom: Spacing.xs
  },
  description: {
    ...Typography.caption,
    color: Colors.textSecondary
  }
});