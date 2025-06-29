import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, MobileOptimized } from '../../src/utils/constants';
import { createResponsiveStyle, getResponsiveSpacing } from '../../src/utils/responsive';

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

const responsiveSpacing = getResponsiveSpacing();

const styles = StyleSheet.create({
  container: createResponsiveStyle({
    mobile: {
      backgroundColor: Colors.card,
      borderRadius: BorderRadius.md,
      padding: responsiveSpacing.sm,
      marginVertical: responsiveSpacing.xs,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      flex: 1
    },
    tablet: {
      backgroundColor: Colors.card,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginVertical: Spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      flex: 1
    }
  }),
  header: createResponsiveStyle({
    mobile: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: responsiveSpacing.xs
    },
    tablet: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm
    }
  }),
  icon: createResponsiveStyle({
    mobile: {
      fontSize: 18,
      marginRight: responsiveSpacing.xs
    },
    tablet: {
      fontSize: 20,
      marginRight: Spacing.sm
    }
  }),
  title: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.caption,
      color: Colors.textSecondary,
      flex: 1
    },
    tablet: {
      ...Typography.body,
      color: Colors.textSecondary,
      flex: 1
    }
  }),
  value: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.h1,
      marginBottom: responsiveSpacing.xs,
      textAlign: 'center'
    },
    tablet: {
      ...Typography.h1,
      marginBottom: Spacing.xs
    }
  }),
  description: createResponsiveStyle({
    mobile: {
      ...MobileOptimized.typography.caption,
      color: Colors.textSecondary,
      textAlign: 'center'
    },
    tablet: {
      ...Typography.caption,
      color: Colors.textSecondary
    }
  })
});