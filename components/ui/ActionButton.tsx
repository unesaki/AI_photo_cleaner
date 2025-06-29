import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, MobileOptimized } from '../../src/utils/constants';
import { isMobile } from '../../src/utils/responsive';

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function ActionButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style
}: ActionButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row'
    };

    // Size styles - mobile optimized
    const mobile = isMobile();
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = mobile ? Spacing.sm : Spacing.md;
        baseStyle.paddingVertical = mobile ? Spacing.xs : Spacing.sm;
        baseStyle.minHeight = mobile ? 36 : 36;
        break;
      case 'large':
        baseStyle.paddingHorizontal = mobile ? Spacing.lg : Spacing.xl;
        baseStyle.paddingVertical = mobile ? Spacing.sm : Spacing.md;
        baseStyle.minHeight = mobile ? 48 : 52;
        break;
      default: // medium
        baseStyle.paddingHorizontal = mobile ? Spacing.md : Spacing.lg;
        baseStyle.paddingVertical = mobile ? Spacing.sm : Spacing.md;
        baseStyle.minHeight = mobile ? MobileOptimized.touchTarget.minHeight : 44;
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyle.backgroundColor = Colors.gray100;
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = Colors.gray500;
        break;
      case 'danger':
        baseStyle.backgroundColor = Colors.danger;
        break;
      default: // primary
        baseStyle.backgroundColor = Colors.primary;
    }

    // Disabled style
    if (disabled || loading) {
      baseStyle.opacity = 0.6;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const mobile = isMobile();
    const baseStyle: TextStyle = {
      ...(mobile ? MobileOptimized.typography.button : Typography.button),
      textAlign: 'center'
    };

    switch (variant) {
      case 'secondary':
        baseStyle.color = Colors.textPrimary;
        break;
      default:
        baseStyle.color = '#ffffff';
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? Colors.primary : '#ffffff'}
          style={{ marginRight: Spacing.sm }}
        />
      )}
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
}

