'use client';

import React, {useEffect} from 'react';
import {notFound, useParams, useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout/AppLayout';
import {useContract, useMarkAsActive, useSignatures, useTerminateContract} from '@/lib/hooks/queries/useContracts';
import {contractService} from '@/lib/services/hrms/contract.service';
import {Badge, Button, Card, Table, Tabs} from '@mantine/core';
import {ArrowLeft, Download, Loader2} from 'lucide-react';
import {notifications} from '@mantine/notifications';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';

export default function ContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const {hasPermission, isReady} = usePermissions();

  const hasAccess = hasPermission(Permissions.CONTRACT_VIEW);

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  const contractId = params.id as string;

  const {data: contract, isLoading} = useContract(contractId);
  const {data: signatures} = useSignatures(contractId);
  const terminateMutation = useTerminateContract();
  const markActiveMutation = useMarkAsActive();

  if (!isReady || !hasAccess) return null;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent-500"/>
        </div>
      </AppLayout>
    );
  }

  if (!isLoading && !contract) {
    notFound();
  }

  const breadcrumbs = [
    {label: 'Dashboard', href: '/dashboard'},
    {label: 'Contracts', href: '/contracts'},
    {label: contract.title, href: `/contracts/${contractId}`},
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="row-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} aria-label="Go back"
                    className="p-2 hover:bg-[var(--bg-surface)] rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]">
              <ArrowLeft className="w-5 h-5"/>
            </button>
            <div>
              <h1 className="text-xl font-bold skeuo-emboss">{contract.title}</h1>
              <p className="text-[var(--text-secondary)]">{contractService.getTypeLabel(contract.type)}</p>
            </div>
          </div>
          <Badge size="lg" color={contract.status === 'ACTIVE' ? 'green' : 'gray'}>
            {contractService.getStatusLabel(contract.status)}
          </Badge>
        </div>

        {/* Key Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="text-body-secondary mb-1">Start Date</div>
            <div className="text-lg font-semibold">{contractService.formatDate(contract.startDate)}</div>
          </Card>
          {contract.endDate && (
            <Card>
              <div className="text-body-secondary mb-1">End Date</div>
              <div className="text-lg font-semibold">{contractService.formatDate(contract.endDate)}</div>
            </Card>
          )}
          {contract.value && (
            <Card>
              <div className="text-body-secondary mb-1">Value</div>
              <div
                className="text-lg font-semibold">{contractService.formatCurrency(contract.value, contract.currency)}</div>
            </Card>
          )}
        </div>

        {/* Description */}
        {contract.description && (
          <Card>
            <h3 className="font-semibold mb-4">Description</h3>
            <p className="text-[var(--text-secondary)]">{contract.description}</p>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {contract.status === 'DRAFT' && (
            <Button
              onClick={() => markActiveMutation.mutate(contractId, {
                onSuccess: () => {
                  notifications.show({title: 'Success', message: 'Contract marked as active', color: 'green'});
                },
                onError: () => {
                  notifications.show({title: 'Error', message: 'Failed to mark contract as active', color: 'red'});
                },
              })}
              loading={markActiveMutation.isPending}
            >
              Mark as Active
            </Button>
          )}
          {contract.status === 'ACTIVE' && (
            <Button
              color="red"
              onClick={() => terminateMutation.mutate(contractId, {
                onSuccess: () => {
                  notifications.show({title: 'Success', message: 'Contract terminated', color: 'green'});
                },
                onError: () => {
                  notifications.show({title: 'Error', message: 'Failed to terminate contract', color: 'red'});
                },
              })}
              loading={terminateMutation.isPending}
            >
              Terminate
            </Button>
          )}
          {contract.documentUrl && (
            <Button variant="light" leftSection={<Download className="w-4 h-4"/>}>
              Download Document
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="signatures">
          <Tabs.List>
            <Tabs.Tab value="signatures">Signatures ({signatures?.length || 0})</Tabs.Tab>
            <Tabs.Tab value="details">Details</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="signatures">
            {signatures && signatures.length > 0 ? (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Signer</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Signed At</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {signatures.map((sig) => (
                    <Table.Tr key={sig.id}>
                      <Table.Td>{sig.signerName}</Table.Td>
                      <Table.Td>{sig.signerEmail}</Table.Td>
                      <Table.Td>{sig.signerRole}</Table.Td>
                      <Table.Td>
                        <Badge color={sig.status === 'SIGNED' ? 'green' : sig.status === 'DECLINED' ? 'red' : 'yellow'}>
                          {sig.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{sig.signedAt ? contractService.formatDate(sig.signedAt) : '—'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <div className="text-center p-8 text-[var(--text-muted)]">No signatures yet</div>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="details">
            <Card>
              <div className="space-y-4">
                {contract.employeeName && (
                  <div>
                    <div className="text-body-secondary">Employee</div>
                    <div className="font-semibold">{contract.employeeName}</div>
                  </div>
                )}
                {contract.vendorName && (
                  <div>
                    <div className="text-body-secondary">Vendor</div>
                    <div className="font-semibold">{contract.vendorName}</div>
                  </div>
                )}
                <div>
                  <div className="text-body-secondary">Auto Renew</div>
                  <div className="font-semibold">{contract.autoRenew ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </div>
    </AppLayout>
  );
}
