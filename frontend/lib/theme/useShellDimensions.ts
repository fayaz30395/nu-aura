'use client';

import {useThemeVersion} from './ThemeVersionProvider';
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  HEADER_HEIGHT,
} from '@/components/ui/sidebar/types';

export const V2_SIDEBAR_WIDTH_EXPANDED = 224;
export const V2_SIDEBAR_WIDTH_COLLAPSED = 56;
export const V2_HEADER_HEIGHT = 56;

export interface ShellDimensions {
  sidebarExpanded: number;
  sidebarCollapsed: number;
  headerHeight: number;
}

export function useShellDimensions(): ShellDimensions {
  const version = useThemeVersion();
  if (version === 'v2') {
    return {
      sidebarExpanded: V2_SIDEBAR_WIDTH_EXPANDED,
      sidebarCollapsed: V2_SIDEBAR_WIDTH_COLLAPSED,
      headerHeight: V2_HEADER_HEIGHT,
    };
  }
  return {
    sidebarExpanded: SIDEBAR_WIDTH_EXPANDED,
    sidebarCollapsed: SIDEBAR_WIDTH_COLLAPSED,
    headerHeight: HEADER_HEIGHT,
  };
}
