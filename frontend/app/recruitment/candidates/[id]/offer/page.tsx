'use client';

// Scaffold page introduced by the Modal-to-Route conversion sweep (Phase 5).
// The "Create Offer Letter" flow previously lived as a heavyweight modal on
// the pipeline page (recruitment/pipeline). It exceeded the 100-LOC density
// budget, so it has been promoted to its own route. The full form has not
// been re-implemented here yet — this is intentionally a minimum scaffold.
//
// Follow-up: port the offer form (template select, CTC, designation, joining
// date, additional notes) plus handleCreateOffer business logic from the
// removed modal block in app/recruitment/pipeline/page.tsx.

import {useParams, useRouter} from 'next/navigation';
import {ArrowLeft, FileText} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Button} from '@/components/ui/Button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';

export default function CreateOfferPage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = params.id as string;

  return (
    <AppLayout
      activeMenuItem="recruitment"
      breadcrumbs={[
        {label: 'Recruitment', href: '/recruitment'},
        {label: 'Candidates', href: '/recruitment/candidates'},
        {label: 'Candidate', href: `/recruitment/candidates/${candidateId}`},
        {label: 'Create Offer'},
      ]}
    >
      <PermissionGate
        anyOf={[Permissions.RECRUITMENT_VIEW, Permissions.RECRUITMENT_VIEW_ALL]}
        fallback={
          <div className="flex items-center justify-center h-[60vh]">
            <p className="text-[var(--text-muted)]">
              You do not have permission to create offer letters.
            </p>
          </div>
        }
      >
        <div className="p-6 space-y-6 min-h-screen bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4"/>}
              onClick={() => router.back()}
            >
              Back
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent-500"/>
                <CardTitle>Create Offer Letter</CardTitle>
              </div>
              <CardDescription>
                Generate, PDF-render and e-sign an offer letter for this candidate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-[var(--border-main)] p-12 text-center">
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
                  Page TBD
                </p>
                <p className="text-body-muted">
                  The full-page offer creation flow is being migrated out of the
                  pipeline modal. Use the legacy flow on the candidate detail
                  page until this scaffold is finished.
                </p>
                <p className="text-caption mt-3 font-mono">
                  Candidate ID: {candidateId}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
