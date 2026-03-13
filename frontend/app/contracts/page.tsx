'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useContracts, useExpiringContracts, useActiveContracts, useExpiredContracts } from '@/lib/hooks/queries/useContracts';
import { contractService } from '@/lib/services/contract.service';
import { Button, Table, Badge, Input, Select } from '@mantine/core';
import { Plus, Search, FileText } from 'lucide-react';

export default function ContractsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: contractsData, isLoading } = useContracts({ page, size: 20 });
  const { data: expiringData } = useExpiringContracts();
  const { data: activeData } = useActiveContracts();
  const { data: expiredData } = useExpiredContracts();

  const contracts = contractsData?.content || [];

  const stats = [
    {
      label: 'Active Contracts',
      value: activeData?.length || 0,
      color: 'bg-green-100',
      textColor: 'text-green-700',
    },
    {
      label: 'Expiring Soon',
      value: expiringData?.length || 0,
      color: 'bg-orange-100',
      textColor: 'text-orange-700',
    },
    {
      label: 'Expired',
      value: expiredData?.length || 0,
      color: 'bg-red-100',
      textColor: 'text-red-700',
    },
    {
      label: 'Total Contracts',
      value: contractsData?.totalElements || 0,
      color: 'bg-blue-100',
      textColor: 'text-blue-700',
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contracts</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage employment, vendor, and other contracts</p>
          </div>
          <Button
            onClick={() => router.push('/contracts/new')}
            leftSection={<Plus className="w-4 h-4" />}
            size="md"
          >
            New Contract
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className={`${stat.color} rounded-lg p-6`}>
              <div className={`${stat.textColor} text-sm font-medium mb-2`}>{stat.label}</div>
              <div className={`${stat.textColor} text-3xl font-bold`}>{stat.value}</div>
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

        {/* Contracts Table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading contracts...</div>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
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
