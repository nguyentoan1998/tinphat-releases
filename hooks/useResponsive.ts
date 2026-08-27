/**
 * Responsive hook for mobile web support
 * Provides breakpoints and responsive values based on screen size
 */

import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

// Breakpoints (matching common CSS frameworks)
export const BREAKPOINTS = {
  xs: 0,      // < 480px (mobile portrait)
  sm: 480,    // 480px - 767px (mobile landscape / small tablet)
  md: 768,    // 768px - 1023px (tablet)
  lg: 1024,   // 1024px - 1279px (small desktop)
  xl: 1280,   // 1280px - 1535px (desktop)
  xxl: 1536,  // > 1536px (large desktop)
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  xxl?: T;
  base: T;  // fallback
}

/**
 * Get current breakpoint based on screen width
 */
export function getCurrentBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.xxl) return 'xxl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

/**
 * Resolve a responsive value based on current breakpoint
 * Falls down from current breakpoint to smaller ones, then to base
 */
export function resolveResponsiveValue<T>(value: ResponsiveValue<T>, breakpoint: Breakpoint): T {
  const breakpointOrder: Breakpoint[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  // Check current breakpoint and fall back to smaller ones
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (value[bp] !== undefined) {
      return value[bp]!;
    }
  }
  
  // Fallback to base
  return value.base;
}

/**
 * Hook to get responsive values based on screen dimensions
 */
export function useResponsive() {
  const [dimensions, setDimensions] = useState<ScaledSize>(() => {
    // On web, use window.innerWidth/Height for actual viewport size
    // On native, use Dimensions API
    if (typeof window !== 'undefined') {
      return { width: window.innerWidth, height: window.innerHeight, scale: 1, fontScale: 1 };
    }
    return Dimensions.get('window');
  });
  const [isWeb, setIsWeb] = useState(false);

  useEffect(() => {
    // Check if running on web
    const isWebEnv = typeof window !== 'undefined';
    setIsWeb(isWebEnv);
    
    if (isWebEnv) {
      // On web, listen to window resize for actual viewport changes
      const handleResize = () => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight, scale: 1, fontScale: 1 });
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    } else {
      // On native, use Dimensions API
      const subscription = Dimensions.addEventListener('change', ({ window }) => {
        setDimensions(window);
      });
      return () => subscription?.remove();
    }
  }, []);

  const breakpoint = getCurrentBreakpoint(dimensions.width);
  
  // Helper to get responsive value
  const getValue = <T,>(responsiveValue: ResponsiveValue<T>): T => {
    return resolveResponsiveValue(responsiveValue, breakpoint);
  };

  // Helper to resolve an entire record of responsive values
  const getValues = <T extends Record<string, ResponsiveValue<any>>>(
    responsiveRecord: T
  ): { [K in keyof T]: T[K] extends ResponsiveValue<infer V> ? V : never } => {
    const resolved = {} as { [K in keyof T]: T[K] extends ResponsiveValue<infer V> ? V : never };
    for (const key of Object.keys(responsiveRecord) as (keyof T)[]) {
      const value = responsiveRecord[key];
      if (value && typeof value === 'object' && 'base' in value) {
        resolved[key] = resolveResponsiveValue(value as ResponsiveValue<any>, breakpoint);
      }
    }
    return resolved;
  };

  // Screen size helpers
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  const isTablet = breakpoint === 'md';
  const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === 'xxl';
  const isSmallScreen = isMobile;
  const isLargeScreen = isDesktop;

  return {
    // Dimensions
    width: dimensions.width,
    height: dimensions.height,
    
    // Breakpoint info
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen,
    isLargeScreen,
    isWeb,
    
    // Value resolvers
    getValue,
    getValues,
    
    // Convenience: responsive object
    responsive: <T,>(value: ResponsiveValue<T>) => getValue(value),
  };
}

/**
 * Create responsive style object
 * Usage: const styles = createResponsiveStyles({ padding: { xs: 16, md: 24, lg: 32 } })
 */
export function createResponsiveStyles<T extends Record<string, any>>(
  styleConfig: { [K in keyof T]: ResponsiveValue<T[K]> }
): (breakpoint: Breakpoint) => T {
  return (breakpoint: Breakpoint) => {
    const resolved: any = {};
    for (const key of Object.keys(styleConfig) as (keyof T)[]) {
      resolved[key] = resolveResponsiveValue(styleConfig[key], breakpoint);
    }
    return resolved;
  };
}

export default useResponsive;