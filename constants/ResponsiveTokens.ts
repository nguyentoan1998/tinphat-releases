/**
 * Responsive Tokens - extends base Tokens with responsive values for web
 * Use with useResponsive() hook to get breakpoint-aware values
 */

import { Platform } from 'react-native';
import { BREAKPOINTS, Breakpoint, ResponsiveValue, resolveResponsiveValue } from '@/constants/ResponsiveTypes';
import { Spacing as BaseSpacing, TouchTargets as BaseTouchTargets, BorderRadius as BaseBorderRadius, FontSizes as BaseFontSizes, FontWeights, Fonts, Shadows, ButtonStyles, CardStyles, FilterStyles, ValueStyles } from './Tokens';

// ─── Base Spacing (8pt grid) ───
// These are the BASE values for xs breakpoint
export const Spacing = BaseSpacing;

// Responsive spacing - scales up on larger screens
// Mobile (xs) values are larger to match native app sizing on mobile web
export const ResponsiveSpacing: Record<keyof typeof BaseSpacing, ResponsiveValue<number>> = {
  xs: { base: 4 },
  sm: { base: 8, md: 10 },
  md: { base: 12, md: 14, lg: 16 },
  lg: { base: 16, md: 18, lg: 20, xl: 24 },
  xl: { base: 24, md: 28, lg: 32, xl: 40 },
  xxl: { base: 32, md: 40, lg: 48, xl: 56 },
  xxxl: { base: 48, md: 56, lg: 64, xl: 80 },
};

// Touch targets - larger on mobile web for better touch experience
export const ResponsiveTouchTargets = {
  min: { base: 48, xs: 52, sm: 56 },      // Minimum touch target
  comfortable: { base: 56, xs: 60, sm: 64 },  // Comfortable for primary actions
  large: { base: 64, xs: 68, sm: 72 },       // Large for critical actions
};

// ─── Touch Targets (responsive) ───
export const TouchTargets = BaseTouchTargets;

// ─── Border Radius (responsive) ───
export const BorderRadius = BaseBorderRadius;

export const ResponsiveBorderRadius: Record<keyof typeof BaseBorderRadius, ResponsiveValue<number>> = {
  sm: { base: 8, md: 10 },
  md: { base: 12, md: 14 },
  lg: { base: 16, md: 18, lg: 20 },
  xl: { base: 20, md: 22, lg: 24, xl: 28 },
  xxl: { base: 28, md: 32, lg: 36, xl: 40 },
  full: { base: 9999 },
};

// ─── Font Sizes (responsive - scale up on larger screens) ───
// Mobile (xs) font sizes are larger to match native app sizing on mobile web
export const FontSizes = BaseFontSizes;

export const ResponsiveFontSizes: Record<keyof typeof BaseFontSizes, ResponsiveValue<number>> = {
  xs: { base: 12, xs: 13, sm: 14, md: 15 },
  sm: { base: 14, xs: 15, sm: 15, md: 16, lg: 17 },
  base: { base: 16, xs: 17, sm: 17, md: 18, lg: 19 },
  lg: { base: 18, xs: 19, sm: 19, md: 20, lg: 21, xl: 22 },
  xl: { base: 20, xs: 21, sm: 21, md: 22, lg: 24, xl: 26 },
  xxl: { base: 24, xs: 25, sm: 25, md: 26, lg: 28, xl: 32 },
  xxxl: { base: 32, xs: 34, sm: 34, md: 36, lg: 40, xl: 48 },
  huge: { base: 40, xs: 42, sm: 42, md: 48, lg: 56, xl: 64 },
};

// ─── Fonts ───
export const ResponsiveFonts = Fonts;

// ─── Shadows ───
export const ResponsiveShadows = Shadows;

// ─── Button Styles (responsive) ───
export const ResponsiveButtonStyles = {
  primaryFilled: {
    backgroundColor: '#0156A7',
    borderRadius: ResponsiveBorderRadius.xxl,
    paddingVertical: ResponsiveSpacing.md,
    paddingHorizontal: ResponsiveSpacing.xl,
    minHeight: { base: TouchTargets.min, sm: TouchTargets.comfortable },
  },
  primaryOutlined: {
    backgroundColor: 'transparent',
    borderRadius: ResponsiveBorderRadius.xxl,
    borderWidth: 1.5,
    borderColor: '#0156A7',
    paddingVertical: ResponsiveSpacing.md,
    paddingHorizontal: ResponsiveSpacing.xl,
    minHeight: { base: TouchTargets.min, sm: TouchTargets.comfortable },
  },
};

// ─── Card Styles (responsive) ───
export const ResponsiveCardStyles = {
  default: {
    backgroundColor: '#FFFFFF',
    borderRadius: ResponsiveBorderRadius.xl,
    padding: ResponsiveSpacing.lg,
    ...Shadows.small,
  },
  elevated: {
    backgroundColor: '#FFFFFF',
    borderRadius: ResponsiveBorderRadius.xl,
    padding: ResponsiveSpacing.lg,
    ...Shadows.medium,
  },
};

// ─── Filter Styles (responsive) ───
export const ResponsiveFilterStyles = {
  pill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: ResponsiveBorderRadius.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: ResponsiveSpacing.sm,
    paddingHorizontal: ResponsiveSpacing.md,
  },
  pillActive: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#EFF6FF',
    borderRadius: ResponsiveBorderRadius.full,
    borderWidth: 1,
    borderColor: '#0156A7',
    paddingVertical: ResponsiveSpacing.sm,
    paddingHorizontal: ResponsiveSpacing.md,
  },
};

// ─── Value Styles (responsive) ───
export const ResponsiveValueStyles = {
  container: { alignItems: 'flex-start' as const },
  largeValue: {
    fontSize: ResponsiveFontSizes.huge,
    fontWeight: FontWeights.bold,
    color: '#111827',
  },
  mediumValue: {
    fontSize: ResponsiveFontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: '#111827',
  },
  smallLabel: {
    fontSize: ResponsiveFontSizes.xs,
    color: '#6B7280',
    marginTop: ResponsiveSpacing.xs,
  },
};

// ─── Helper to get responsive value ───
export function getResponsiveValue<T>(value: ResponsiveValue<T>, breakpoint: Breakpoint): T {
  return resolveResponsiveValue(value, breakpoint);
}

export function getSpacing(breakpoint: Breakpoint, key: keyof typeof Spacing): number {
  return getResponsiveValue(ResponsiveSpacing[key], breakpoint);
}

export function getFontSize(breakpoint: Breakpoint, key: keyof typeof FontSizes): number {
  return getResponsiveValue(ResponsiveFontSizes[key], breakpoint);
}

export function getBorderRadius(breakpoint: Breakpoint, key: keyof typeof BorderRadius): number {
  return getResponsiveValue(ResponsiveBorderRadius[key], breakpoint);
}

export default {
  Spacing,
  ResponsiveSpacing,
  TouchTargets,
  ResponsiveTouchTargets,
  BorderRadius,
  ResponsiveBorderRadius,
  FontSizes,
  ResponsiveFontSizes,
  Fonts: ResponsiveFonts,
  Shadows: ResponsiveShadows,
  ResponsiveButtonStyles,
  ResponsiveCardStyles,
  ResponsiveFilterStyles,
  ResponsiveValueStyles,
  BREAKPOINTS,
  getResponsiveValue,
  getSpacing,
  getFontSize,
  getBorderRadius,
};