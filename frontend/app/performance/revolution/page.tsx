'use client';

import {useRouter} from 'next/navigation';
import {Button} from '@mantine/core';
import {Award, ChevronRight, Lock, RefreshCw, Share2, Users} from 'lucide-react';
import dynamic from 'next/dynamic';
import {ChartLoadingFallback} from '@/lib/utils/lazy-components';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {EmptyState} from '@/components/ui/EmptyState';
import {Bone, SkeletonRegion} from '@/components/ui/skeletons/SkeletonRegion';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {useOKRGraph, usePerformanceSpider} from '@/lib/hooks/queries/useOkr';
import {useMyReceivedRecognitions} from '@/lib/hooks/queries/useRecognition';
import {useSkillGaps} from '@/lib/hooks/queries/useLearning';
import {formatRelative} from '@/lib/utils/format/date';
import {OkrGalaxy} from './_components/OkrGalaxy';
import {RecognitionPulse} from './_components/RecognitionPulse';

const PerformanceSpiderChart = dynamic(
  () => import('./PerformanceSpiderChart'),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

const RADAR_LEGEND = [
  {label: 'Self', dot: 'bg-success-500'},
  {label: 'Peers', dot: 'bg-accent-700'},
  {label: 'Manager', dot: 'bg-accent-500'},
];

const PANEL_CLASS = 'flex flex-col gap-2 rounded-lg bg-surface-aura-sunken p-4 text-left';

export default function PerformanceRevolutionPage() {
  const router = useRouter();
  const {user} = useAuth();
  const currentUserId = user?.employeeId || 'me';
  const okrGraphQuery = useOKRGraph();
  const performanceSpiderQuery = usePerformanceSpider(currentUserId);
  const receivedRecognitionsQuery = useMyReceivedRecognitions(0, 3);
  const {hasPermission} = usePermissions();
  // The skill-gap endpoint needs EMPLOYEE:READ; without it the call 403s, so skip it and hide the card.
  const canSeeSkillGaps = hasPermission(Permissions.EMPLOYEE_READ);
  const skillGapsQuery = useSkillGaps(currentUserId, currentUserId !== 'me' && canSeeSkillGaps);

  const recentRecognitions = receivedRecognitionsQuery.data?.content || [];
  const topGap = skillGapsQuery.data?.gaps?.[0];
  const topRecommendedCourse = topGap?.recommendedCourses?.[0];
  const latestBadgeRecognition = recentRecognitions.find((r) => r.badgeName);

  return (
    <AppLayout
      activeMenuItem="performance"
      breadcrumbs={[{label: 'Performance', href: '/performance'}, {label: 'Performance Revolution'}]}
    >
      <PermissionGate permission={Permissions.REVIEW_VIEW} fallback={
        <EmptyState
          icon={<Lock className="h-full w-full"/>}
          title="Access Denied"
          description="You do not have permission to view Performance Revolution."
        />
      }>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <PageHeader
            title="Performance Revolution"
            description="Advanced OKR visualization and 360° performance insights"
            actions={
              <>
                <Button variant="default" onClick={() => {
                  okrGraphQuery.refetch();
                  performanceSpiderQuery.refetch();
                }} leftSection={<RefreshCw className="h-4 w-4" aria-hidden/>}>
                  Refresh
                </Button>
                <Button disabled title="Coming soon" leftSection={<Share2 className="h-4 w-4" aria-hidden/>}>
                  Share Progress
                </Button>
              </>
            }
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <OkrGalaxy query={okrGraphQuery}/>

            <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 lg:col-span-4">
              <div className="flex flex-col gap-1">
                <h2 className="flex items-center gap-2 text-base font-semibold text-text-1">
                  <Users className="h-4 w-4 text-accent-700" aria-hidden="true"/> 360° Competency Radar
                </h2>
                <p className="text-sm text-text-2">Multi-source feedback comparison</p>
              </div>
              <div className="h-80">
                <QueryState
                  query={performanceSpiderQuery}
                  skeleton={
                    <SkeletonRegion label="Loading competency radar" className="h-full">
                      <Bone height={320} radius="md"/>
                    </SkeletonRegion>
                  }
                  isEmpty={(data) => !data?.metrics?.length}
                  empty={{
                    icon: <Users className="h-full w-full"/>,
                    title: 'No competency data yet',
                    description: 'Ratings appear once 360° feedback is collected.',
                    size: 'compact',
                  }}
                  errorTitle="Couldn't load competency radar"
                >
                  {(data) => <PerformanceSpiderChart metrics={data?.metrics ?? []}/>}
                </QueryState>
              </div>
              <ul className="flex justify-center gap-4" aria-label="Rating sources">
                {RADAR_LEGEND.map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    <span className={`h-2 w-3 rounded-full ${item.dot}`} aria-hidden="true"/>
                    <span className="text-xs text-text-2">{item.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <RecognitionPulse query={receivedRecognitionsQuery} onViewAll={() => router.push('/recognition')}/>

            <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:col-span-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-text-1">
                <Users className="h-4 w-4 text-accent-700" aria-hidden="true"/> Development Trajectory
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {!canSeeSkillGaps ? null : skillGapsQuery.isLoading ? (
                  <SkeletonRegion label="Loading growth opportunities" className={PANEL_CLASS}>
                    <Bone height={12} width="40%" radius="sm"/>
                    <Bone height={16} width="70%" radius="sm" mt={8}/>
                  </SkeletonRegion>
                ) : topRecommendedCourse && topGap ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/learning/courses/${topRecommendedCourse.courseId}`)}
                    className={`${PANEL_CLASS} transition-colors hover:bg-surface-aura-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                  >
                    <h3 className="text-xs font-semibold text-accent-700">Growth Opportunity</h3>
                    <p className="text-sm font-semibold text-text-1">{topRecommendedCourse.title}</p>
                    <p className="text-xs text-text-2">Based on your &quot;{topGap.skillName}&quot; skill gap</p>
                    <span className="mt-2 flex items-center justify-between text-xs font-semibold text-text-2">
                      {topRecommendedCourse.difficulty}
                      <ChevronRight className="h-4 w-4 text-accent-700" aria-hidden="true"/>
                    </span>
                  </button>
                ) : (
                  <div className={PANEL_CLASS}>
                    <h3 className="text-xs font-semibold text-accent-700">Growth Opportunity</h3>
                    <p className="text-xs text-text-2">No skill gaps identified right now</p>
                  </div>
                )}

                <div className={PANEL_CLASS}>
                  <h3 className="text-xs font-semibold text-success-700">Peak Performance</h3>
                  {latestBadgeRecognition ? (
                    <>
                      <p className="text-sm font-semibold text-text-1">{latestBadgeRecognition.badgeName}</p>
                      <p className="text-xs text-text-2">{latestBadgeRecognition.title}</p>
                      <span className="mt-2 flex items-center justify-between text-xs font-semibold text-text-2">
                        Awarded {formatRelative(latestBadgeRecognition.recognizedAt)}
                        <Award className="h-4 w-4 text-warning-600" aria-hidden="true"/>
                      </span>
                    </>
                  ) : (
                    <p className="text-xs text-text-2">No badges earned yet</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
