'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AlertCircle, CheckCircle, Clock, FileText, Plus} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Button, Card, EmptyState} from '@/components/ui';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {Stat} from '@/components/ui/Stat';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {useAuth} from '@/lib/hooks/useAuth';
import {useCreateDocumentRequest, useDocumentTypes, useMyDocumentRequests} from '@/lib/hooks/queries';
import type {DocumentRequestDto} from '@/lib/types/hrms/selfservice';
import {DocumentRequestCard} from './_components/DocumentRequestCard';
import {DocumentRequestModal} from './_components/DocumentRequestModal';

const BREADCRUMBS = [
  {label: 'My Space', href: '/me/dashboard'},
  {label: 'Documents'},
];

export default function MyDocumentsPage() {
  const router = useRouter();
  const {user, hasHydrated} = useAuth();
  const [showModal, setShowModal] = useState(false);

  const {data: documentTypeValues} = useDocumentTypes();
  const requestsQuery = useMyDocumentRequests(
    user?.employeeId || '',
    0,
    100,
    hasHydrated && !!user?.employeeId
  );
  const createMutation = useCreateDocumentRequest();

  useEffect(() => {
    if (hasHydrated && !user) {
      router.replace('/auth/login');
    }
  }, [hasHydrated, user, router]);

  const handleCreate = async (payload: DocumentRequestDto) => {
    if (!user?.employeeId) return;
    await createMutation.mutateAsync({employeeId: user.employeeId, data: payload});
  };

  if (!hasHydrated) {
    return (
      <AppLayout activeMenuItem="my-documents">
        <ListPageSkeleton rows={5} columns={4}/>
      </AppLayout>
    );
  }

  if (!user?.employeeId) {
    return (
      <AppLayout activeMenuItem="my-documents">
        <div className="flex flex-col gap-6">
          <PageHeader title="Document Requests" breadcrumbs={BREADCRUMBS}/>
          <EmptyState
            icon={<FileText className="h-8 w-8" aria-hidden="true"/>}
            title="No Employee Profile Linked"
            description="Document requests require an employee profile. Use the admin panels to manage employee documents."
            actionLabel="Go to Document Management"
            onAction={() => router.push('/me/documents')}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="my-documents">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Document Requests"
          description="Request official documents and track their status"
          breadcrumbs={BREADCRUMBS}
          actions={
            <Button leftIcon={<Plus className="h-4 w-4" aria-hidden="true"/>} onClick={() => setShowModal(true)}>
              Request Document
            </Button>
          }
        />

        <QueryState
          query={requestsQuery}
          skeleton={<ListPageSkeleton rows={5} columns={4} showHeader={false}/>}
          errorTitle="Couldn't load document requests"
          errorMessage="Something went wrong while loading your document requests. Please try again."
        >
          {(page) => {
            const requests = page.content ?? [];
            return (
              <>
                <section aria-label="Request summary" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Card padding="sm">
                    <Stat
                      label="Pending"
                      value={requests.filter((r) => r.status === 'PENDING').length}
                      icon={<Clock className="h-4 w-4"/>}
                      iconTone="warning"
                    />
                  </Card>
                  <Card padding="sm">
                    <Stat
                      label="In Progress"
                      value={requests.filter((r) => r.status === 'IN_PROGRESS').length}
                      icon={<AlertCircle className="h-4 w-4"/>}
                      iconTone="info"
                    />
                  </Card>
                  <Card padding="sm">
                    <Stat
                      label="Ready"
                      value={requests.filter((r) => r.status === 'GENERATED' || r.status === 'DELIVERED').length}
                      icon={<CheckCircle className="h-4 w-4"/>}
                      iconTone="success"
                    />
                  </Card>
                  <Card padding="sm">
                    <Stat label="Total" value={requests.length} icon={<FileText className="h-4 w-4"/>}/>
                  </Card>
                </section>

                {requests.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-8 w-8" aria-hidden="true"/>}
                    title="You haven't requested any documents yet"
                    description="Employment, salary, and other official letters you request will be tracked here."
                  />
                ) : (
                  <div className="flex flex-col gap-4" role="list" aria-label="Document requests">
                    {requests.map((request) => (
                      <DocumentRequestCard key={request.id} request={request}/>
                    ))}
                  </div>
                )}
              </>
            );
          }}
        </QueryState>
      </div>

      <DocumentRequestModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        documentTypeValues={documentTypeValues}
        isSubmitting={createMutation.isPending}
        onSubmit={handleCreate}
      />
    </AppLayout>
  );
}
