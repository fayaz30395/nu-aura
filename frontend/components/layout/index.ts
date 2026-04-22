export {AppLayout} from './AppLayout';
export {AdminPageContent} from './AdminPageContent';
export {Header} from './Header';
export {Breadcrumbs} from './Breadcrumbs';
export {DarkModeProvider, useDarkMode, useTheme} from './DarkModeProvider';
export type {ThemeMode, ResolvedTheme} from './DarkModeProvider';
export {MantineThemeProvider, MantineColorSchemeScript} from './MantineThemeProvider';

export type {BreadcrumbItem} from './Breadcrumbs';
export type {HeaderProps} from './Header';
export type {AppLayoutProps} from './AppLayout';
export type {AdminPageContentProps} from './AdminPageContent';

// Page-shell primitives (Phase 3)
export {
  PageContainer,
  PageHeader,
  ListPageLayout,
  DetailPageLayout,
  FormPageLayout,
  EmptyPageState,
} from './page';
export type {
  PageContainerProps,
  PageHeaderProps,
  ListPageLayoutProps,
  DetailPageLayoutProps,
  FormPageLayoutProps,
  EmptyPageStateProps,
} from './page';
