'use client';

import {useRouter} from 'next/navigation';
import {Stepper} from '@mantine/core';
import {AppLayout} from '@/components/layout';
import {Callout} from '@/components/ui/Callout';
import {PageHeader} from '@/components/ui/PageHeader';
import {useEmployeeImport, type ImportStep} from './_hooks/useEmployeeImport';
import {UploadStep} from './_components/UploadStep';
import {PreviewStep} from './_components/PreviewStep';
import {ResultStep} from './_components/ResultStep';

const BREADCRUMBS = [{label: 'Employees', href: '/employees'}, {label: 'Import'}];

const STEP_INDEX: Record<ImportStep, number> = {upload: 0, preview: 1, result: 3};

export default function EmployeeImportPage() {
  const router = useRouter();
  const importState = useEmployeeImport();
  const {step, preview, result, error} = importState;

  return (
    <AppLayout activeMenuItem="employees">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageHeader
          title="Bulk Import Employees"
          description="Upload a CSV or Excel file to import multiple employees at once"
          breadcrumbs={BREADCRUMBS}
        />

        <Stepper active={STEP_INDEX[step]} size="sm" allowNextStepsSelect={false} aria-label="Import progress">
          <Stepper.Step label="Upload"/>
          <Stepper.Step label="Preview"/>
          <Stepper.Step label="Import"/>
        </Stepper>

        {error && (
          <Callout tone="danger" title="Error">
            {error}
          </Callout>
        )}

        {step === 'upload' && (
          <UploadStep
            selectedFile={importState.selectedFile}
            loading={importState.loading}
            resetFileRef={importState.resetFileRef}
            onSelectFile={importState.selectFile}
            onClearFile={importState.clearFile}
            onDownloadTemplate={importState.downloadTemplate}
            onPreview={importState.runPreview}
          />
        )}

        {step === 'preview' && preview && (
          <PreviewStep
            preview={preview}
            loading={importState.loading}
            skipInvalid={importState.skipInvalid}
            onSkipInvalidChange={importState.setSkipInvalid}
            onStartOver={importState.resetImport}
            onImport={importState.executeImport}
          />
        )}

        {step === 'result' && result && (
          <ResultStep
            result={result}
            onImportMore={importState.resetImport}
            onViewEmployees={() => router.push('/employees')}
          />
        )}
      </div>
    </AppLayout>
  );
}
