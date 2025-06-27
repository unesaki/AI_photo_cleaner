import React from 'react';
import { View, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { ThemedText } from '../ThemedText';
import { Colors, Spacing, Typography } from '../../src/utils/constants';

interface SettingItemProps {
  icon?: string;
  title: string;
  description?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  type?: 'switch' | 'button' | 'info';
  rightText?: string;
  disabled?: boolean;
}

export function SettingItem({
  icon,
  title,
  description,
  value = false,
  onValueChange,
  onPress,
  type = 'switch',
  rightText,
  disabled = false
}: SettingItemProps) {
  const handlePress = () => {
    if (disabled) return;
    
    if (type === 'switch' && onValueChange) {
      onValueChange(!value);
    } else if (onPress) {
      onPress();
    }
  };

  const renderRightElement = () => {
    switch (type) {
      case 'switch':
        return (
          <Switch
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
            trackColor={{ false: Colors.gray100, true: Colors.primary }}
            thumbColor={value ? '#ffffff' : Colors.gray500}
          />
        );
      case 'button':
        return (
          <View style={styles.rightButton}>
            <ThemedText style={styles.rightButtonText}>
              {rightText || '>'}
            </ThemedText>
          </View>
        );
      case 'info':
        return rightText ? (
          <ThemedText style={styles.rightInfoText}>{rightText}</ThemedText>
        ) : null;
      default:
        return null;
    }
  };

  const Component = type === 'switch' ? View : TouchableOpacity;

  return (
    <Component
      style={[
        styles.container,
        disabled && styles.disabled
      ]}
      onPress={type !== 'switch' ? handlePress : undefined}
      disabled={disabled}
      activeOpacity={type !== 'switch' ? 0.7 : undefined}
    >
      <View style={styles.leftContent}>
        {icon && (
          <View style={styles.iconContainer}>
            <ThemedText style={styles.icon}>{icon}</ThemedText>
          </View>
        )}
        <View style={styles.textContent}>
          <ThemedText style={[
            styles.title,
            disabled && styles.disabledText
          ]}>
            {title}
          </ThemedText>
          {description && (
            <ThemedText style={[
              styles.description,
              disabled && styles.disabledText
            ]}>
              {description}
            </ThemedText>
          )}
        </View>
      </View>
      
      <View style={styles.rightContent}>
        {renderRightElement()}
      </View>
    </Component>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  disabled: {
    opacity: 0.5,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  icon: {
    fontSize: 20,
  },
  textContent: {
    flex: 1,
  },
  title: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  disabledText: {
    color: Colors.gray500,
  },
  rightContent: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  rightButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  rightButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  rightInfoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});