/**
 * Shared responsive types - no runtime dependencies
 * Prevents circular imports between useResponsive and ResponsiveTokens
 */

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