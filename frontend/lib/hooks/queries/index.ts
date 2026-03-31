/**
 * Query hooks barrel — all React Query hooks for NU-AURA.
 * Organised by sub-app: HRMS → Hire → Grow → Platform → Core/Shared
 */

// ── Shared utils ─────────────────────────────────────────────────────────────
export * from './performanceKeys';

// ── NU-HRMS ──────────────────────────────────────────────────────────────────
export * from './useAdmin';
export * from './useAnalytics';
export * from './useAssets';
export * from './useAttendance';
export * from './useBenefits';
export * from './useCalendar';
export * from './useCompensation';
export * from './useContracts';
export * from './useCustomFields';
export * from './useDashboards';
export * from './useDepartments';
export * from './useDocumentWorkflow';
export * from './useEmployees';
export * from './useEscalation';
export * from './useExpenses';
export * from './useExit';
export * from './useFeatureFlags';
export * from './useGoals';
export * from './useHelpdesk';
export * from './useHelpdeskSla';
export * from './useHome';
export * from './useImplicitRoles';
export * from './useImportExport';
export * from './useLeaves';
export * from './useLetter';
export * from './useLoans';
export * from './useLWF';
export * from './useOfficeLocations';
export * from './useOneOnOne';
export * from './useOvertime';
export * from './usePayments';
export * from './usePayroll';
export * from './usePip';
export * from './useProbation';
export * from './useProjects';
export * from './usePsa';
export * from './useReportDownload';
export * from './useReports';
export * from './useResources';
export * from './useRestrictedHolidays';
export * from './useReviewCycles';
export * from './useReviews';
export * from './useRoles';
export * from './useSelfService';
export * from './useShifts';
export * from './useStatutory';
export * from './useStatutoryFiling';
export * from './useSystemAdmin';
export * from './useTax';
export * from './useTimeTracking';
export * from './useTimesheets';
export * from './useTravel';

// ── NU-Hire ──────────────────────────────────────────────────────────────────
export * from './useApplicants';
export * from './useApprovals';
export * from './useCareers';
export * from './useConnectors';
export * from './useEsignPublic';
export * from './useKekaImport';
export * from './useMobileApi';
export * from './useOnboarding';
export * from './usePreboarding';
export * from './usePublicOffer';
export * from './useRecruitment';
export * from './useReferrals';

// ── NU-Grow ───────────────────────────────────────────────────────────────────
export * from './useFeedback360';
export * from './useLearning';
export * from './useMfa';
export * from './useNotifications';
export * from './useOkr';
export * from './usePerformance';
export * from './usePredictiveAnalytics';
export * from './useRecognition';
export * from './useSurveys';
export * from './useTraining';
export * from './useWellness';
export * from './useWorkflows';

// ── NU-Fluence / Platform ────────────────────────────────────────────────────
// Note: useFluence and useWall export useDeleteComment/useAddComment which
// conflict with useHelpdesk. Import those hooks directly from their module files.
export * from './useAnnouncements';
export * from './useFeedback';
export * from './useIntegrations';
export * from './useKnowledgeBase';
export * from './useLinkedIn';
export * from './useSpotlight';
