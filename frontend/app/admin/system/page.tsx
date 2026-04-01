'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  Users,
  Server,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  Paper,
  SimpleGrid,
  Text,
  Badge,
  Button,
  Table,
  Skeleton,
  Group,
  Stack,
  ActionIcon,
  Modal,
} from '@mantine/core';
import dynamic from 'next/dynamic';
import { ChartLoadingFallback } from '@/lib/utils/lazy-components';

const GrowthChart = dynamic(
  () => import('./GrowthChart'),
  { loading: () => <ChartLoadingFallback />, ssr: false }
);
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import {
  useSystemOverview,
  useTenantList,
  useImpersonationToken,
  useGrowthMetrics,
} from '@/lib/hooks/queries/useSystemAdmin';
import { TenantListItem, MonthlyGrowth } from '@/lib/types/core/admin-system';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('SystemPage');

const SUPER_ADMIN_ONLY_ROLES = [Roles.SUPER_ADMIN];

/**
 * SuperAdmin System Dashboard - Mission Control Center
 * Provides cross-tenant visibility and management capabilities
 */
export default function SystemDashboard() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();
  const [page, setPage] = useState(0);
  const [selectedTenant, setSelectedTenant] = useState<TenantListItem | null>(null);
  const [impersonationModalOpen, setImpersonationModalOpen] = useState(false);

  // Queries
  const overviewQuery = useSystemOverview();
  const tenantListQuery = useTenantList(page, 20);
  const growthMetricsQuery = useGrowthMetrics(6);
  const impersonationMutation = useImpersonationToken();

  // Authorization check
  useEffect(() => {
    if (!hasHydrated || !isReady) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!hasAnyRole(...SUPER_ADMIN_ONLY_ROLES)) {
      router.push('/admin');
    }
  }, [hasHydrated, isReady, isAuthenticated, router, hasAnyRole]);

  const handleImpersonate = async () => {
    if (!selectedTenant) return;

    try {
      const result = await impersonationMutation.mutateAsync(selectedTenant.tenantId);
      // Store the impersonation token in sessionStorage (SEC-F05: sensitive auth data)
      sessionStorage.setItem('impersonationToken', result.token);
      sessionStorage.setItem('impersonatedTenantId', result.tenantId);
      sessionStorage.setItem('impersonatedTenantName', result.tenantName);
      // Redirect to tenant's main dashboard
      router.push('/admin');
    } catch (error) {
      log.error('Failed to generate impersonation token:', error);
    }
  };

  // Growth data from real API
  const growthData = useMemo((): MonthlyGrowth[] => {
    if (!growthMetricsQuery.data?.months) return [];
    return growthMetricsQuery.data.months;
  }, [growthMetricsQuery.data]);

  if (!isReady || !hasHydrated) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton height={40} />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={120} />
          ))}
        </SimpleGrid>
      </div>
    );
  }

  const overview = overviewQuery.data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg shadow-accent-500/25">
            <Server className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold skeuo-emboss">
              System Dashboard
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Mission control center for cross-tenant management
            </p>
          </div>
        </div>
        <ActionIcon
          variant="light"
          size="lg"
          onClick={() => {
            overviewQuery.refetch();
            tenantListQuery.refetch();
            growthMetricsQuery.refetch();
          }}
          loading={overviewQuery.isRefetching || tenantListQuery.isRefetching || growthMetricsQuery.isRefetching}
        >
          <RefreshCw className="h-5 w-5" />
        </ActionIcon>
      </div>

      {/* Overview Stats Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        {/* Total Tenants Card */}
        <Paper
          p="lg"
          radius="md"
          className="skeuo-card bg-[var(--bg-input)] border border-[var(--border-main)]"
        >
          <Group justify="space-between" mb="md">
            <Text size="sm" fw={500} className="text-[var(--text-secondary)]">
              Total Tenants
            </Text>
            <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/30">
              <Building2 className="h-5 w-5 text-accent-600 dark:text-accent-400" />
            </div>
          </Group>
          <div className="space-y-2">
            <Text size="lg" fw={700} className="text-[var(--text-primary)]">
              {overviewQuery.isLoading ? <Skeleton height={20} /> : overview?.totalTenants ?? 0}
            </Text>
            <Group gap="xs">
              <Badge size="sm" variant="light" color="blue">
                {overview?.activeTenants ?? 0} Active
              </Badge>
            </Group>
          </div>
        </Paper>

        {/* Active Users Card */}
        <Paper
          p="lg"
          radius="md"
          className="skeuo-card bg-[var(--bg-input)] border border-[var(--border-main)]"
        >
          <Group justify="space-between" mb="md">
            <Text size="sm" fw={500} className="text-[var(--text-secondary)]">
              Active Users
            </Text>
            <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
              <Users className="h-5 w-5 text-success-600 dark:text-success-400" />
            </div>
          </Group>
          <div className="space-y-2">
            <Text size="lg" fw={700} className="text-[var(--text-primary)]">
              {overviewQuery.isLoading ? <Skeleton height={20} /> : overview?.totalActiveUsers ?? 0}
            </Text>
            <Text size="xs" className="text-[var(--text-muted)]">
              Across all tenants
            </Text>
          </div>
        </Paper>

        {/* Total Employees Card */}
        <Paper
          p="lg"
          radius="md"
          className="skeuo-card bg-[var(--bg-input)] border border-[var(--border-main)]"
        >
          <Group justify="space-between" mb="md">
            <Text size="sm" fw={500} className="text-[var(--text-secondary)]">
              Total Employees
            </Text>
            <div className="p-2 rounded-lg bg-accent-300 dark:bg-accent-900/30">
              <TrendingUp className="h-5 w-5 text-accent-800 dark:text-accent-600" />
            </div>
          </Group>
          <div className="space-y-2">
            <Text size="lg" fw={700} className="text-[var(--text-primary)]">
              {overviewQuery.isLoading ? <Skeleton height={20} /> : overview?.totalEmployees ?? 0}
            </Text>
            <Text size="xs" className="text-[var(--text-muted)]">
              System-wide total
            </Text>
          </div>
        </Paper>

        {/* Pending Approvals Card */}
        <Paper
          p="lg"
          radius="md"
          className="skeuo-card bg-[var(--bg-input)] border border-[var(--border-main)]"
        >
          <Group justify="space-between" mb="md">
            <Text size="sm" fw={500} className="text-[var(--text-secondary)]">
              Pending Approvals
            </Text>
            <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30">
              <Zap className="h-5 w-5 text-warning-600 dark:text-warning-400" />
            </div>
          </Group>
          <div className="space-y-2">
            <Text size="lg" fw={700} className="text-[var(--text-primary)]">
              {overviewQuery.isLoading ? <Skeleton height={20} /> : overview?.pendingApprovals ?? 0}
            </Text>
            <Text size="xs" className="text-[var(--text-muted)]">
              Awaiting action
            </Text>
          </div>
        </Paper>
      </SimpleGrid>

      {/* Growth Chart */}
      <Paper
        p="lg"
        radius="md"
        className="skeuo-card bg-[var(--bg-input)] border border-[var(--border-main)]"
      >
        <Group mb="lg" justify="space-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[var(--text-secondary)]" />
            <Text fw={600} className="text-[var(--text-primary)]">
              Platform Growth
            </Text>
          </div>
          <Text size="xs" className="text-[var(--text-muted)]">
            Last 6 months
          </Text>
        </Group>

        {growthData.length > 0 ? (
          <GrowthChart data={growthData} />
        ) : (
          <div className="h-80 flex items-center justify-center text-[var(--text-muted)]">
            Loading chart data...
          </div>
        )}
      </Paper>

      {/* Tenants List */}
      <Paper
        p="lg"
        radius="md"
        className="skeuo-card bg-[var(--bg-input)] border border-[var(--border-main)]"
      >
        <Group mb="lg" justify="space-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--text-secondary)]" />
            <Text fw={600} className="text-[var(--text-primary)]">
              All Tenants
            </Text>
          </div>
          <Text size="xs" className="text-[var(--text-muted)]">
            Page {page + 1} of {tenantListQuery.data?.pageable?.totalPages ?? 1}
          </Text>
        </Group>

        {tenantListQuery.isLoading ? (
          <Stack gap="md">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={50} />
            ))}
          </Stack>
        ) : tenantListQuery.data?.content && tenantListQuery.data.content.length > 0 ? (
          <>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr className="bg-[var(--bg-surface)]">
                  <Table.Th className="text-[var(--text-secondary)]">Tenant</Table.Th>
                  <Table.Th className="text-[var(--text-secondary)]">Plan</Table.Th>
                  <Table.Th className="text-[var(--text-secondary)]">Status</Table.Th>
                  <Table.Th className="text-[var(--text-secondary)] text-right">Employees</Table.Th>
                  <Table.Th className="text-[var(--text-secondary)] text-right">Users</Table.Th>
                  <Table.Th className="text-[var(--text-secondary)]">Created</Table.Th>
                  <Table.Th className="text-[var(--text-secondary)]">Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tenantListQuery.data.content.map((tenant) => (
                  <Table.Tr key={tenant.tenantId}>
                    <Table.Td>
                      <div className="flex flex-col">
                        <Text fw={500} size="sm" className="text-[var(--text-primary)]">
                          {tenant.name}
                        </Text>
                        <Text size="xs" className="text-[var(--text-muted)]">
                          {tenant.tenantId.substring(0, 8)}...
                        </Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={tenant.plan === 'PREMIUM' ? 'gold' : 'blue'}
                      >
                        {tenant.plan}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={tenant.status === 'ACTIVE' ? 'green' : 'red'}
                      >
                        {tenant.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td className="text-right">
                      <Text size="sm" fw={500} className="text-[var(--text-primary)]">
                        {tenant.employeeCount}
                      </Text>
                    </Table.Td>
                    <Table.Td className="text-right">
                      <Text size="sm" fw={500} className="text-[var(--text-primary)]">
                        {tenant.userCount}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" className="text-[var(--text-secondary)]">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="light"
                        rightSection={<ChevronRight className="h-4 w-4" />}
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setImpersonationModalOpen(true);
                        }}
                      >
                        Access
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {/* Pagination */}
            <Group mt="lg" justify="center">
              <Button
                variant="light"
                disabled={page === 0}
                onClick={() => setPage(Math.max(0, page - 1))}
              >
                Previous
              </Button>
              <Text size="sm" fw={500}>
                Page {page + 1}
              </Text>
              <Button
                variant="light"
                disabled={
                  !tenantListQuery.data ||
                  page >= (tenantListQuery.data.pageable?.totalPages ?? 1) - 1
                }
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </Group>
          </>
        ) : (
          <Text className="text-[var(--text-muted)]">No tenants found</Text>
        )}
      </Paper>

      {/* Impersonation Modal */}
      <Modal
        opened={impersonationModalOpen}
        onClose={() => {
          setImpersonationModalOpen(false);
          setSelectedTenant(null);
        }}
        title="Tenant Access"
        size="md"
      >
        {selectedTenant && (
          <Stack gap="md">
            <div>
              <Text fw={500} size="sm" className="text-[var(--text-secondary)] mb-2">
                Tenant Information
              </Text>
              <Paper p="sm" className="bg-[var(--bg-surface)] rounded-md">
                <Stack gap="xs">
                  <div>
                    <Text size="xs" className="text-[var(--text-secondary)]">
                      Name
                    </Text>
                    <Text fw={500} size="sm" className="text-[var(--text-primary)]">
                      {selectedTenant.name}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" className="text-[var(--text-secondary)]">
                      ID
                    </Text>
                    <Text fw={500} size="sm" className="text-[var(--text-primary)]">
                      {selectedTenant.tenantId}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" className="text-[var(--text-secondary)]">
                      Plan
                    </Text>
                    <Badge size="sm" color="blue">
                      {selectedTenant.plan}
                    </Badge>
                  </div>
                </Stack>
              </Paper>
            </div>

            <div>
              <Text fw={500} size="sm" className="text-[var(--text-secondary)] mb-2">
                Access Method
              </Text>
              <Text size="sm" className="text-[var(--text-secondary)] mb-3">
                Click the button below to impersonate this tenant and access their dashboard.
              </Text>
              <Button
                fullWidth
                onClick={handleImpersonate}
                loading={impersonationMutation.isPending}
              >
                Generate Access Token & Enter Tenant
              </Button>
            </div>

            <Text size="xs" className="text-[var(--text-muted)] italic">
              All access will be logged for audit purposes
            </Text>
          </Stack>
        )}
      </Modal>
    </div>
  );
}
