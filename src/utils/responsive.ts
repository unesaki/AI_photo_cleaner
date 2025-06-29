import { Dimensions } from 'react-native';
import { Breakpoints, ResponsiveSpacing, MobileOptimized, Spacing } from './constants';

const { width: screenWidth } = Dimensions.get('window');

export const getDeviceType = () => {
  if (screenWidth >= Breakpoints.desktop) return 'desktop';
  if (screenWidth >= Breakpoints.tablet) return 'tablet';
  return 'mobile';
};

export const isMobile = () => getDeviceType() === 'mobile';
export const isTablet = () => getDeviceType() === 'tablet';
export const isDesktop = () => getDeviceType() === 'desktop';

export const getResponsiveSpacing = () => {
  return isMobile() ? ResponsiveSpacing.mobile : ResponsiveSpacing.tablet;
};

export const getResponsiveTypography = () => {
  return isMobile() ? MobileOptimized.typography : undefined;
};

export const getMobileSpacing = () => {
  return isMobile() ? MobileOptimized.spacing : {
    cardPadding: Spacing.lg,
    sectionSpacing: Spacing.lg,
    buttonSpacing: Spacing.md
  };
};

export const getResponsiveValue = <T>(mobile: T, tablet: T, desktop?: T): T => {
  const deviceType = getDeviceType();
  switch (deviceType) {
    case 'desktop':
      return desktop || tablet;
    case 'tablet':
      return tablet;
    case 'mobile':
    default:
      return mobile;
  }
};

export const createResponsiveStyle = (styles: {
  mobile?: any;
  tablet?: any;
  desktop?: any;
}) => {
  const deviceType = getDeviceType();
  return {
    ...styles.mobile,
    ...(deviceType === 'tablet' && styles.tablet),
    ...(deviceType === 'desktop' && styles.desktop)
  };
};