// Button Component
export {Button, buttonVariants} from './Button';
export type {ButtonProps} from './Button';

// Card Components
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';

// Input Component
export {Input} from './Input';
export type {InputProps} from './Input';

// Select Component
export {Select} from './Select';
export type {SelectProps} from './Select';

// Textarea Component
export {Textarea} from './Textarea';
export type {TextareaProps} from './Textarea';

// Badge Component
export {Badge, badgeVariants} from './Badge';
export type {BadgeProps} from './Badge';

// StatCard Component (legacy — prefer `<Stat>` for new code)
export {StatCard} from './StatCard';
export type {StatCardProps} from './StatCard';

// Stat — flat single-hue statistic (Studio Slate v2)
export {Stat} from './Stat';
export type {StatProps, StatTone} from './Stat';

// Callout — inline notification surface (replaces banned side-stripe pattern)
export {Callout} from './Callout';
export type {CalloutProps, CalloutTone} from './Callout';

// GoogleGLogo — canonical Google brand mark for SSO buttons
export {GoogleGLogo} from './GoogleGLogo';
export type {GoogleGLogoProps} from './GoogleGLogo';

// StatusBadge — canonical status badge (color + icon + label per DESIGN.md)
export {StatusBadge} from './StatusBadge';
export type {StatusBadgeProps} from './StatusBadge';

// Switch — Aura toggle switch (accent track, spring thumb)
export {Switch} from './Switch';
export type {SwitchProps} from './Switch';

// Segmented — Aura segmented control (dashboard / attendance range pickers)
export {Segmented} from './Segmented';
export type {SegmentedProps, SegmentedOption} from './Segmented';

// Tabs — Aura underline tab strip with optional count pills (distinct from Mantine Tabs)
export {Tabs} from './Tabs';
export type {TabsProps, TabItem} from './Tabs';

// Sidebar Components
export {Sidebar, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED, HEADER_HEIGHT} from './Sidebar';
export type {SidebarProps, SidebarItem, SidebarSection} from './Sidebar';

// Modal Components
export {Modal, ModalHeader, ModalBody, ModalFooter} from './Modal';
export type {ModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps} from './Modal';

// SlidePanel (accessible right-side drawer)
export {SlidePanel} from './SlidePanel';
export type {SlidePanelProps} from './SlidePanel';

// Loading Components
export {Loading, SkeletonStatCard, SkeletonTable, SkeletonChart, SkeletonCard, NuAuraLoader} from './Loading';
export type {LoadingProps} from './Loading';

// Premium Spinner Components
export {
  PremiumSpinner,
  OrbitSpinner,
  GradientRingSpinner,
  PulseDotsSpinner,
  WaveBarsSpinner,
  ExpandingRingSpinner
} from './PremiumSpinner';
export type {PremiumSpinnerProps} from './PremiumSpinner';

// Spinner Components
export {Spinner, DotsSpinner, WaveSpinner, PulseRing} from './Spinner';
export type {SpinnerProps} from './Spinner';

// Toast Component
export {ToastProvider, useToast} from './Toast';

// ConfirmDialog Component
export {ConfirmDialog} from './ConfirmDialog';

// EmptyState Component
export {EmptyState} from './EmptyState';
export {EmptyStatePresets} from './empty-state-presets';
export type {EmptyStatePresetKey} from './empty-state-presets';

// ErrorBoundary Component
export {ErrorBoundary} from './ErrorBoundary';

// EmployeeSearchAutocomplete Component
export {EmployeeSearchAutocomplete} from './EmployeeSearchAutocomplete';

// Skeleton Component
export {Skeleton} from './Skeleton';

// ResponsiveTable Component
export {ResponsiveTable, TablePagination} from './ResponsiveTable';
export type {ResponsiveTableProps, Column, TablePaginationProps} from './ResponsiveTable';

// MobileBottomNav Component
export {MobileBottomNav, useMobileNavHeight} from './MobileBottomNav';
export type {MobileBottomNavProps, NavItem} from './MobileBottomNav';

// ExportMenu Component
export {ExportMenu} from './ExportMenu';
export type {ExportMenuProps, ExportColumn} from './ExportMenu';

// AccessibleFormField Component
export {AccessibleFormField} from './AccessibleFormField';
export type {AccessibleFormFieldProps} from './AccessibleFormField';

// TableFilterBar Component
export {TableFilterBar} from './TableFilterBar';
export type {TableFilterBarProps, FilterField} from './TableFilterBar';

// AdvancedFilterPanel Component
export {AdvancedFilterPanel} from './AdvancedFilterPanel';
export type {AdvancedFilterPanelProps, FilterCondition, SavedFilterPreset} from './AdvancedFilterPanel';

// EditableCell Component
export {EditableCell} from './EditableCell';
export type {EditableCellProps} from './EditableCell';

// DashboardGrid Component
export {DashboardGrid} from './DashboardGrid';
export type {DashboardGridProps, DashboardWidget} from './DashboardGrid';
