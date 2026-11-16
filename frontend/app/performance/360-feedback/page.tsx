'use client';

import {useState} from 'react';
import {Badge, Button, Tabs} from '@mantine/core';
import {BarChart3, CheckCircle, ClipboardCheck, Plus, Users} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Callout} from '@/components/ui/Callout';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useActiveFeedback360Cycles,
  useMyFeedback360Summaries,
  useMyPending360Reviews,
} from '@/lib/hooks/queries/useFeedback360';
import type {
  Feedback360Cycle,
  Feedback360Request,
  Feedback360Summary,
} from '@/lib/services/grow/feedback360.service';
import {Card} from '@/components/ui/Card';
import {CycleCard} from './_components/CycleCard';
import {CycleFormModal} from './_components/CycleFormModal';
import {FeedbackResponseModal} from './_components/FeedbackResponseModal';
import {NominateReviewerModal} from './_components/NominateReviewerModal';
import {PendingReviewsTable} from './_components/PendingReviewsTable';
import {SummaryCard} from './_components/SummaryCard';
import {SummaryDetailsModal} from './_components/SummaryDetailsModal';
import {useFeedback360Actions} from './_hooks/useFeedback360Actions';

type TabKey = 'cycles' | 'pending' | 'summaries';

const CARD_SKELETON = <ListPageSkeleton rows={3} columns={3} showHeader={false} showFilters={false}/>;

export default function Feedback360Page() {
  const [activeTab, setActiveTab] = useState<TabKey>('cycles');
  const {user} = useAuth();

  const cyclesQuery = useActiveFeedback360Cycles();
  const pendingQuery = useMyPending360Reviews();
  const summariesQuery = useMyFeedback360Summaries();
  const actions = useFeedback360Actions();

  const [showCycleModal, setShowCycleModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Feedback360Request | null>(null);
  const [nominateCycle, setNominateCycle] = useState<Feedback360Cycle | null>(null);
  const [viewingSummary, setViewingSummary] = useState<Feedback360Summary | null>(null);
  const [activateConfirm, setActivateConfirm] = useState<string | null>(null);
  const [closeConfirm, setCloseConfirm] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [shareConfirm, setShareConfirm] = useState<string | null>(null);

  const pendingCount = pendingQuery.data?.length ?? 0;
  const openCycleModal = () => setShowCycleModal(true);

  const confirmThen = (id: string | null, action: (id: string) => Promise<boolean>, clear: () => void) => async () => {
    if (!id) return;
    await action(id);
    clear();
  };

  return (
    <AppLayout
      breadcrumbs={[{label: 'Performance', href: '/performance'}, {label: '360-Degree Feedback'}]}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6">
        <PageHeader
          title="360-Degree Feedback"
          description="Multi-rater feedback and performance assessment"
          actions={activeTab === 'cycles' && (
            <PermissionGate permission={Permissions.FEEDBACK_360_CREATE}>
              <Button leftSection={<Plus className="h-4 w-4" aria-hidden/>} onClick={openCycleModal}>
                New Cycle
              </Button>
            </PermissionGate>
          )}
        />

        {actions.error && <Callout tone="danger">{actions.error}</Callout>}

        <Tabs value={activeTab} onChange={(v) => v && setActiveTab(v as TabKey)} keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="cycles" leftSection={<Users className="h-4 w-4" aria-hidden/>}>
              Feedback Cycles ({cyclesQuery.data?.length ?? 0})
            </Tabs.Tab>
            <Tabs.Tab
              value="pending"
              leftSection={<ClipboardCheck className="h-4 w-4" aria-hidden/>}
              rightSection={pendingCount > 0 ? <Badge color="red" variant="light" size="sm">{pendingCount}</Badge> : null}
            >
              Pending Reviews ({pendingCount})
            </Tabs.Tab>
            <Tabs.Tab value="summaries" leftSection={<BarChart3 className="h-4 w-4" aria-hidden/>}>
              My Results ({summariesQuery.data?.length ?? 0})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="cycles" pt="lg">
            <QueryState query={cyclesQuery} skeleton={CARD_SKELETON} errorTitle="Couldn't load feedback cycles">
              {(cycles) => cycles.length === 0 ? (
                <Card>
                  <PermissionGate
                    permission={Permissions.FEEDBACK_360_CREATE}
                    fallback={
                      <EmptyState
                        icon={<Users className="h-8 w-8"/>}
                        title="No feedback cycles"
                        description="Once a 360 cycle is launched, it will appear here."
                      />
                    }
                  >
                    <EmptyState
                      icon={<Users className="h-8 w-8"/>}
                      title="No feedback cycles"
                      description="Create a new 360-degree feedback cycle to gather peer, manager, and self-review input."
                      actionLabel="New Cycle"
                      onAction={openCycleModal}
                    />
                  </PermissionGate>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {cycles.map((cycle) => (
                    <CycleCard
                      key={cycle.id}
                      cycle={cycle}
                      onActivate={setActivateConfirm}
                      onDelete={setDeleteConfirm}
                      onClose={setCloseConfirm}
                      onNominate={setNominateCycle}
                    />
                  ))}
                </div>
              )}
            </QueryState>
          </Tabs.Panel>

          <Tabs.Panel value="pending" pt="lg">
            <QueryState
              query={pendingQuery}
              skeleton={<ListPageSkeleton rows={5} columns={5} showHeader={false} showFilters={false}/>}
              isEmpty={(data) => data.length === 0}
              empty={{
                icon: <CheckCircle className="h-8 w-8"/>,
                iconColor: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
                title: 'All caught up',
                description: 'You have no pending feedback reviews. New requests will appear here.',
              }}
              errorTitle="Couldn't load pending reviews"
            >
              {(requests) => <PendingReviewsTable requests={requests} onProvideFeedback={setSelectedRequest}/>}
            </QueryState>
          </Tabs.Panel>

          <Tabs.Panel value="summaries" pt="lg">
            <QueryState
              query={summariesQuery}
              skeleton={CARD_SKELETON}
              isEmpty={(data) => data.length === 0}
              empty={{
                icon: <BarChart3 className="h-8 w-8"/>,
                title: 'No results yet',
                description: 'Your feedback summaries will appear here once reviews are complete.',
              }}
              errorTitle="Couldn't load feedback results"
            >
              {(summaries) => (
                <div className="grid gap-4 md:grid-cols-2">
                  {summaries.map((summary) => (
                    <SummaryCard key={summary.id} summary={summary} onView={setViewingSummary} onShare={setShareConfirm}/>
                  ))}
                </div>
              )}
            </QueryState>
          </Tabs.Panel>
        </Tabs>
      </div>

      <SummaryDetailsModal summary={viewingSummary} onClose={() => setViewingSummary(null)}/>
      <CycleFormModal
        isOpen={showCycleModal}
        isSaving={actions.pending.createCycle}
        onClose={() => setShowCycleModal(false)}
        onSubmit={actions.createCycle}
      />
      <FeedbackResponseModal
        request={selectedRequest}
        isSaving={actions.pending.submitResponse}
        onClose={() => setSelectedRequest(null)}
        onSubmit={actions.submitResponse}
      />
      <NominateReviewerModal
        cycle={nominateCycle}
        subjectEmployeeId={user?.employeeId}
        isSaving={actions.pending.nominateReviewer}
        onClose={() => setNominateCycle(null)}
        onSubmit={actions.nominateReviewer}
      />

      <ConfirmDialog
        isOpen={!!activateConfirm}
        onClose={() => setActivateConfirm(null)}
        onConfirm={confirmThen(activateConfirm, actions.activateCycle, () => setActivateConfirm(null))}
        title="Activate Cycle"
        message="Are you sure you want to activate this feedback cycle? This will notify all reviewers to start providing feedback."
        confirmText="Activate"
        type="warning"
        loading={actions.pending.activateCycle}
      />
      <ConfirmDialog
        isOpen={!!closeConfirm}
        onClose={() => setCloseConfirm(null)}
        onConfirm={confirmThen(closeConfirm, actions.closeCycle, () => setCloseConfirm(null))}
        title="Close Cycle"
        message="Are you sure you want to close this feedback cycle? Feedback submission will be disabled."
        confirmText="Close"
        type="warning"
        loading={actions.pending.closeCycle}
      />
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmThen(deleteConfirm, actions.deleteCycle, () => setDeleteConfirm(null))}
        title="Delete Cycle?"
        message="This action cannot be undone. The feedback cycle will be permanently deleted."
        confirmText="Delete"
        type="danger"
        loading={actions.pending.deleteCycle}
      />
      <ConfirmDialog
        isOpen={!!shareConfirm}
        onClose={() => setShareConfirm(null)}
        onConfirm={confirmThen(shareConfirm, actions.shareSummary, () => setShareConfirm(null))}
        title="Share Summary"
        message="Share this feedback summary with the employee? They will be able to view all compiled feedback."
        confirmText="Share"
        type="info"
        loading={actions.pending.shareSummary}
      />
    </AppLayout>
  );
}
