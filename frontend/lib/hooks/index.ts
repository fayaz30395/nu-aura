/**
 * Hooks barrel for NU-AURA frontend.
 *
 * Structure:
 *   lib/hooks/               — platform / infrastructure hooks (auth, permissions, etc.)
 *   lib/hooks/queries/       — all React Query data-fetching hooks, grouped by sub-app
 */

// ── Platform / infrastructure hooks ──────────────────────────────────────────
export * from './useActiveApp';
export * from './useAnimation';
export * from './useAuth';
export * from './useAuthStatus';
export * from './useBiometric';
export * from './useCompetency';
export * from './useDebounce';
export * from './useFeatureFlag';
export * from './useFluenceChat';
export * from './useOrgChart';
export * from './usePermissions';
export * from './usePreloadData';
export * from './useSamlConfig';
export * from './useSessionTimeout';
export * from './useTokenRefresh';

// ── All React Query module hooks (re-exported from queries/) ─────────────────
// Note: usePermissions from queries/useRoles is intentionally excluded here
// to avoid conflict with the platform-level usePermissions hook above.
// Import from '@/lib/hooks/queries/useRoles' directly if needed.
export { useRoles, usePermissionsByResource } from './queries/useRoles';
export * from './queries/useAdmin';
export * from './queries/useAnalytics';
export * from './queries/useAnnouncements';
export * from './queries/useApplicants';
export * from './queries/useApprovals';
export * from './queries/useAssets';
export * from './queries/useAttendance';
export * from './queries/useBenefits';
export * from './queries/useCalendar';
export * from './queries/useCareers';
export * from './queries/useCompensation';
export * from './queries/useConnectors';
export * from './queries/useContracts';
export * from './queries/useCustomFields';
export * from './queries/useDashboards';
export * from './queries/useDepartments';
export * from './queries/useDocumentWorkflow';
export * from './queries/useEmployees';
export * from './queries/useEscalation';
export * from './queries/useExpenses';
export * from './queries/useExit';
export * from './queries/useFeatureFlags';
export * from './queries/useFeedback';
export * from './queries/useFeedback360';
// useFluence exports useDeleteComment which conflicts with useHelpdesk — import directly if needed
// export * from './queries/useFluence';
export * from './queries/useGoals';
// useHelpdesk exports useAddComment which conflicts with useWall — import directly if needed
// export * from './queries/useHelpdesk';
export * from './queries/useHelpdeskSla';
export * from './queries/useHome';
export * from './queries/useImplicitRoles';
export * from './queries/useImportExport';
export * from './queries/useIntegrations';
export * from './queries/useKekaImport';
export * from './queries/useKnowledgeBase';
export * from './queries/useLeaves';
export * from './queries/useLetter';
export * from './queries/useLinkedIn';
export * from './queries/useLoans';
export * from './queries/useLWF';
export * from './queries/useLearning';
export * from './queries/useMfa';
export * from './queries/useMobileApi';
export * from './queries/useNotifications';
export * from './queries/useOfficeLocations';
export * from './queries/useOkr';
export * from './queries/useOnboarding';
export * from './queries/useOneOnOne';
export * from './queries/useOvertime';
export * from './queries/usePayments';
export * from './queries/usePayroll';
export * from './queries/usePerformance';
export * from './queries/usePip';
export * from './queries/usePreboarding';
export * from './queries/usePredictiveAnalytics';
export * from './queries/useProbation';
export * from './queries/useProjects';
export * from './queries/usePsa';
export * from './queries/usePublicOffer';
export * from './queries/useRecognition';
export * from './queries/useRecruitment';
export * from './queries/useReferrals';
export * from './queries/useReportDownload';
export * from './queries/useReports';
export * from './queries/useResources';
export * from './queries/useRestrictedHolidays';
export * from './queries/useReviewCycles';
export * from './queries/useReviews';
export * from './queries/useSelfService';
export * from './queries/useShifts';
export * from './queries/useSpotlight';
export * from './queries/useStatutory';
export * from './queries/useStatutoryFiling';
export * from './queries/useSurveys';
export * from './queries/useSystemAdmin';
export * from './queries/useTax';
export * from './queries/useTimeTracking';
export * from './queries/useTimesheets';
export * from './queries/useTraining';
export * from './queries/useTravel';
export * from './queries/useWall';
export * from './queries/useWellness';
export * from './queries/useWorkflows';
