'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { BulkProcessingWizard } from '@/components/payroll/BulkProcessingWizard';

export default function BulkProcessingPage() {
  return (
    <AppLayout activeMenuItem="payroll">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">
              Bulk Payroll Processing
            </h1>
            <p className="text-surface-600 dark:text-surface-400 mt-2">
              Process payroll for multiple employees at once
            </p>
          </div>

          {/* Wizard Component */}
          <BulkProcessingWizard />
        </div>
      </div>
    </AppLayout>
  );
}
