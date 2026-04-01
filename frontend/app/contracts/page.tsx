'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useContracts, useExpiringContracts, useActiveContracts, useExpiredContracts } from '@/lib/hooks/queries/useContracts';
import { contractService } from '@/lib/services/hrms/contract.service';
import { Button, Table, Badge, Input, Select } from '@mantine/core';
import { Plus, Search, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

export default function ContractsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: contractsData, isLoading, isError, error, refetch } = useContracts({ page, size: 20 });
  const { data: expiringData } = useExpiringContracts();
  const { data: activeData } = useActiveContracts();
  const { data: expiredData } = useExpiredContracts();

  const contracts = contractsData?.content || [];

  const stats = [
    {
      label: 'Active Contracts',
      value: activeData?.length || 0,
      color: 'bg-success-100',
      textColor: 'text-success-700',
    },
    {
      label: 'Expiring Soon',
      value: expiringData?.length || 0,
      color: 'bg-warning-100',
      textColor: 'text-warning-700',
    },
    {
      label: 'Expired',
      value: expiredData?.length || 0,
      color: 'bg-danger-100',
      textColor: 'text-danger-700',
    },
    {
      label: 'Total Contracts',
      value: contractsData?.totalElements || 0,
      color: 'bg-accent-100',
      textColor: 'text-accent-700',
    },
  ];

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Contracts', href: '/contracts' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold skeuo-emboss">Contracts</h1>
            <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">Manage employment, vendor, and other contracts</p>
          </div>
          <PermissionGate permission={Permissions.CONTRACT_CREATE}>
            <Button
              onClick={() => router.push('/contracts/new')}
              leftSection={<Plus className="w-4 h-4" />}
              size="md"
            >
              New Contract
            </Button>
          </PermissionGate>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className={`${stat.color} rounded-xl p-4`}>
              <div className={`${stat.textColor} text-xs font-medium mb-1`}>{stat.label}</div>
              <div className={`${stat.textColor} text-2xl font-bold`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Input
              placeholder="Search contracts..."
              leftSection={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.currentTarget.value)}
            />
          </div>
          <Select
            placeholder="Filter by status"
            data={[
              { label: 'All', value: '' },
              { label: 'Draft', value: 'DRAFT' },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Expired', value: 'EXPIRED' },
              { label: 'Terminated', value: 'TERMINATED' },
            ]}
            value={statusFilter}
            onChange={(value: string | null) => setStatusFilter(value || '')}
            clearable
          />
        </div>

        {/* Error State */}
        {isError && (
          <div className="p-6 bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertCircle className="h-5 w-5 text-danger-500 flex-shrink-0" />
              <p className="text-sm text-danger-600 dark:text-danger-400">
                {error instanceof Error ? error.message : 'Failed to load contracts'}
              </p>
            </div>
            <Button variant="light" size="xs" onClick={() => refetch()} leftSection={<RefreshCw className="w-3.5 h-3.5" />}>
              Retry
            </Button>
          </div>
        )}

        {/* Contracts Table */}
        <div className="bg-[var(--bg-card)] rounded-lg shadow">
          {isLoading ? (
            <div className="p-8 text-center text-[var(--text-muted)]">Loading contracts...</div>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No contracts found</p>
            </div>
          ) : (
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Employee/Vendor</Table.Th>
                  <Table.Th>End Date</Table.Th>
                  <Table.Th>Signatures</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {contracts.map((contract) => (
                  <Table.Tr key={contract.id} onClick={() => router.push(`/contracts/${contract.id}`)}>
                    <Table.Td className="font-medium">{contract.title}</Table.Td>
                    <Table.Td>{contractService.getTypeLabel(contract.type)}</Table.Td>
                    <Table.Td>
                      <Badge color={contract.status === 'ACTIVE' ? 'green' : 'gray'}>
                        {contractService.getStatusLabel(contract.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{contract.employeeName || contract.vendorName || '—'}</Table.Td>
                    <Table.Td>{contract.endDate ? contractService.formatDate(contract.endDate) : '—'}</Table.Td>
                    <Table.Td>{contract.pendingSignatureCount > 0 && <Badge>{contract.pendingSignatureCount} pending</Badge>}</Table.Td>
                    <Table.Td>
                      <Button
                        variant="light"
                        size="xs"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          router.push(`/contracts/${contract.id}`);
                        }}
                      >
                        View
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {contractsData && contractsData.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              variant="light"
            >
              Previous
            </Button>
            <div className="flex items-center px-4">
              Page {page + 1} of {contractsData.totalPages}
            </div>
            <Button
              disabled={page >= contractsData.totalPages - 1}
              onClick={() => setPage(page + 1)}
              variant="light"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
