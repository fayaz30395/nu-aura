'use client';

import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import {
  Title,
  Text,
  Card,
  Table,
  Badge,
  Container,
  Group,
  SimpleGrid,
  Button,
} from '@mantine/core';
import {
  FileSpreadsheet,
  FileCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useTaxDeclarations } from '@/lib/hooks/queries/useTax';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import type { DeclarationStatus, TaxDeclarationResponse } from '@/lib/types/tax';

export default function TaxOverviewPage() {
  const router = useRouter();
  const { data: rawDeclarations, isLoading, isError, error, refetch } = useTaxDeclarations(0, 100);

  // Safely extract declarations array — handles paginated objects, null, undefined
  const safeDeclarations: TaxDeclarationResponse[] = (() => {
    if (!rawDeclarations) return [];
    if (Array.isArray(rawDeclarations)) return rawDeclarations;
    // Handle Spring Boot paginated response that leaked through service layer
    const raw = rawDeclarations as unknown as Record<string, unknown>;
    if (raw && typeof raw === 'object' && Array.isArray(raw.content)) return raw.content as TaxDeclarationResponse[];
    return [];
  })();

  const approvedCount = safeDeclarations.reduce((count, d) => d.status === ('APPROVED' as DeclarationStatus) ? count + 1 : count, 0);
  const pendingCount = safeDeclarations.reduce((count, d) => (d.status === ('SUBMITTED' as DeclarationStatus) || d.status === ('DRAFT' as DeclarationStatus)) ? count + 1 : count, 0);

  const stats = [
    {
      label: 'Total Declarations',
      value: safeDeclarations.length,
      icon: FileSpreadsheet,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Approved',
      value: approvedCount,
      icon: FileCheck,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Pending Review',
      value: pendingCount,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ];

  const statusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'green';
      case 'REJECTED': return 'red';
      case 'SUBMITTED': return 'blue';
      case 'DRAFT': return 'gray';
      default: return 'gray';
    }
  };

  const recentDeclarations = safeDeclarations.slice(0, 5);

  return (
    <AppLayout
      activeMenuItem="finance"
      breadcrumbs={[
        { label: 'Pay & Finance', href: '/payroll' },
        { label: 'Tax', href: '/tax' },
      ]}
    >
      <Container size="xl" py="lg">
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={2} className="skeuo-emboss">Tax Management</Title>
            <Text c="dimmed" className="skeuo-deboss">Overview of tax declarations and compliance</Text>
          </div>
          <PermissionGate permission={Permissions.TAX_VIEW}>
            <Button
              onClick={() => router.push('/tax/declarations')}
              rightSection={<ChevronRight className="h-4 w-4" />}
              className="btn-primary"
            >
              View Declarations
            </Button>
          </PermissionGate>
        </Group>

        {/* Error State */}
        {isError && (
          <Card withBorder radius="md" p="md" mb="lg" className="border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950/20">
            <Group justify="space-between">
              <Group gap="sm">
                <AlertCircle className="h-5 w-5 text-danger-500 flex-shrink-0" />
                <Text size="sm" c="red">
                  {error instanceof Error ? error.message : 'Failed to load tax data'}
                </Text>
              </Group>
              <Button variant="light" size="xs" onClick={() => refetch()} leftSection={<RefreshCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            </Group>
          </Card>
        )}

        {/* Stats */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
          {stats.map((stat) => (
            <Card key={stat.label} withBorder radius="md" p="lg" className="skeuo-card">
              <Group gap="lg">
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <Text size="sm" fw={500} c="dimmed">{stat.label}</Text>
                  <Text size="xl" fw={700} className="skeuo-emboss">
                    {isLoading ? '-' : stat.value}
                  </Text>
                </div>
              </Group>
            </Card>
          ))}
        </SimpleGrid>

        {/* Quick Links */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mb="xl">
          <Card
            withBorder radius="md" p="lg"
            className="skeuo-card cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/tax/declarations')}
          >
            <Group justify="space-between">
              <Group gap="md">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <Text fw={600}>Tax Declarations</Text>
                  <Text size="sm" c="dimmed">View and manage all tax declarations</Text>
                </div>
              </Group>
              <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
            </Group>
          </Card>
        </SimpleGrid>

        {/* Recent Declarations */}
        <Card withBorder radius="md" p="md" className="skeuo-card">
          <Group justify="space-between" mb="md">
            <Title order={4} className="skeuo-emboss">Recent Declarations</Title>
            <Button variant="subtle" size="xs" onClick={() => router.push('/tax/declarations')}>
              View All
            </Button>
          </Group>
          <Table verticalSpacing="sm" className="table-aura">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Financial Year</Table.Th>
                <Table.Th>Employee</Table.Th>
                <Table.Th>Regime</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={4} align="center">
                    <Text c="dimmed">Loading...</Text>
                  </Table.Td>
                </Table.Tr>
              ) : recentDeclarations.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={4} align="center">
                    <Text c="dimmed" py="lg">No tax declarations yet</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                recentDeclarations.map((decl) => (
                  <Table.Tr
                    key={decl.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/tax/declarations/${decl.id}`)}
                  >
                    <Table.Td>{decl.financialYear}</Table.Td>
                    <Table.Td>{decl.employeeName}</Table.Td>
                    <Table.Td>{decl.taxRegime.replace('_', ' ')}</Table.Td>
                    <Table.Td>
                      <Badge color={statusColor(decl.status)} className="badge-status">
                        {decl.status}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Card>
      </Container>
    </AppLayout>
  );
}
