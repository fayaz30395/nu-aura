'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCreateContract } from '@/lib/hooks/queries/useContracts';
import type { CreateContractRequest } from '@/lib/types/contract';
import { Button, Input, Select, Textarea, Card } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';

export default function CreateContractPage() {
  const router = useRouter();
  const createMutation = useCreateContract();
  const [formData, setFormData] = useState<CreateContractRequest>({
    title: '',
    type: 'EMPLOYMENT',
    startDate: new Date().toISOString().split('T')[0],
    currency: 'USD',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData);
      router.push('/contracts');
    } catch (error) {
      console.error('Error creating contract:', error);
    }
  };

  const handleInputChange = (field: keyof CreateContractRequest, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Contracts', href: '/contracts' },
    { label: 'New Contract', href: '/contracts/new' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold">Create Contract</h1>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Contract Title *</label>
              <Input
                placeholder="Enter contract title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.currentTarget.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Contract Type *</label>
              <Select
                placeholder="Select type"
                data={[
                  { value: 'EMPLOYMENT', label: 'Employment Contract' },
                  { value: 'VENDOR', label: 'Vendor Contract' },
                  { value: 'NDA', label: 'Non-Disclosure Agreement' },
                  { value: 'SLA', label: 'Service Level Agreement' },
                  { value: 'FREELANCER', label: 'Freelancer Agreement' },
                  { value: 'OTHER', label: 'Other' },
                ]}
                value={formData.type}
                onChange={(value) => handleInputChange('type', value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.currentTarget.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Input
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => handleInputChange('endDate', e.currentTarget.value || undefined)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                placeholder="Enter contract description"
                rows={4}
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.currentTarget.value || undefined)}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                loading={createMutation.isPending}
                disabled={createMutation.isPending}
              >
                Create Contract
              </Button>
              <Button variant="light" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
