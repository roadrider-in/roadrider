import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  xs: 480,
  sm: 768,
  md: 1024,
  lg: 1280,
  xl: 1440,
  // Backward compatibility
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
  wide: 1440,
};

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const isSmallMobile = width < BREAKPOINTS.xs; // < 480px (e.g. 320px - 479px)
  const isMobile = width < BREAKPOINTS.sm; // < 768px
  const isTablet = width >= BREAKPOINTS.sm && width < BREAKPOINTS.md; // 768px - 1023px
  const isDesktop = width >= BREAKPOINTS.md; // >= 1024px
  const isWide = width >= BREAKPOINTS.lg; // >= 1280px
  const isLarge = width >= BREAKPOINTS.xl; // >= 1440px

  const breakpoint = isSmallMobile
    ? 'xs'
    : isMobile
    ? 'mobile'
    : isTablet
    ? 'tablet'
    : isLarge
    ? 'wide'
    : 'desktop';

  // Responsive padding
  const contentPadding = isSmallMobile ? 12 : isMobile ? 16 : isTablet ? 20 : 32;

  // Max width for desktop content containers
  const maxContentWidth = 1400;

  // Number of grid columns for metric cards or items
  const gridColumns = isSmallMobile ? 1 : isMobile ? 2 : isTablet ? 2 : isLarge ? 4 : 3;

  /**
   * Helper to pick a value based on the current breakpoint
   * @param {{ xs?: any, mobile?: any, tablet?: any, desktop?: any, wide?: any, default?: any }} options
   */
  const selectResponsive = (options) => {
    if (isLarge && options.wide !== undefined) return options.wide;
    if (isWide && (options.wide !== undefined || options.desktop !== undefined)) {
      return options.wide !== undefined ? options.wide : options.desktop;
    }
    if (isDesktop && options.desktop !== undefined) return options.desktop;
    if (isTablet && options.tablet !== undefined) return options.tablet;
    if (isSmallMobile && options.xs !== undefined) return options.xs;
    if (isMobile && options.mobile !== undefined) return options.mobile;
    return options.default !== undefined ? options.default : options.mobile;
  };

  return {
    width,
    height,
    isSmallMobile,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    isLarge,
    breakpoint,
    contentPadding,
    maxContentWidth,
    gridColumns,
    selectResponsive,
  };
};

