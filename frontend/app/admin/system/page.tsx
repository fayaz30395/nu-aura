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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import {
  useSystemOverview,
  useTenantList,
  useImpersonationToken,
  useGrowthMetrics,
} from '@/lib/hooks/queries/useSystemAdmin';
import { TenantListItem, MonthlyGrowth } from '@/lib/types/admin-system';

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
      // Store the impersonation token in localStorage or session storage
      localStorage.setItem('impersonationToken', result.token);
      localStorage.setItem('impersonatedTenantId', result.tenantId);
      localStorage.setItem('impersonatedTenantName', result.tenantName);
      // Redirect to tenant's main dashboard
      router.push('/admin');
    } catch (error) {
      console.error('Failed to generate impersonation token:', error);
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
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/25">
            <Server className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              System Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
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
          className="bg-[var(--bg-input)] border border-slate-200 dark:border-slate-700"
        >
          <Group justify="space-between" mb="md">
            <Text size="sm" fw={500} className="text-slate-600 dark:text-slate-400">
              Total Tenants
            </Text>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </Group>
          <div className="space-y-2">
            <Text size="lg" fw={700} className="text-slate-900 dark:text-slate-50">
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
          className="bg-[var(--bg-input)] border border-slate-200 dark:border-slate-700"
        >
          <Group justify="space-between" mb="md">
            <Text size="sm" fw={500} className="text-slate-600 dark:text-slate-400">
              Active Users
            </Text>
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </Group>
          <div className="space-y-2">
            <Text size="lg" fw={700} className="text-slate-900 dark:text-slate-50">
              {overviewQuery.isLoading ? <Skeleton height={20} /> : overview?.totalActiveUsers ?? 0}
            </Text>
            <Text size="xs" className="text-slate-500 dark:text-slate-500">
              Across all tenants
            </Text>
          </div>
        </Paper>

        {/* Total Employees Card */}
        <Paper
          p="lg"
          radius="md"
          className="bg-[var(--bg-input)] border border-slate-200 dark:border-slate-700"
        >
          <Group justify="space-between" mb="md">
            <Text size="sm" fw={500} className="text-slate-600 dark:text-slate-400">
              Total Employees
            </Text>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </Group>
          <div className="space-y-2">
            <Text size="lg" fw={700} className="text-slate-900 dark:text-slate-50">
              {overviewQuery.isLoading ? <Skeleton height={20} /> : overview?.totalEmployees ?? 0}
            </Text>
            <Text size="xs" className="text-slate-500 dark:text-slate-500">
              System-wide total
            </Text>
          </div>
        </Paper>

        {/* Pending Approvals Card */}
        <Paper
          p="lg"
          radius="md"
          className="bg-[var(--bg-input)] border border-slate-200 dark:border-slate-700"
        >
          <Group justify="space-between" mb="md">
            <Text size="sm" fw={500} className="text-slate-600 dark:text-slate-400">
              Pending Approvals
            </Text>
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </Group>
          <div className="space-y-2">
            <Text size="lg" fw={700} className="text-slate-900 dark:text-slate-50">
              {overviewQuery.isLoading ? <Skeleton height={20} /> : overview?.pendingApprovals ?? 0}
            </Text>
            <Text size="xs" className="text-slate-500 dark:text-slate-500">
              Awaiting action
            </Text>
          </div>
        </Paper>
      </SimpleGrid>

      {/* Growth Chart */}
      <Paper
        p="lg"
        radius="md"
        className="bg-[var(--bg-input)] border border-slate-200 dark:border-slate-700"
      >
        <Group mb="lg" justify="space-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <Text fw={600} className="text-slate-900 dark:text-slate-50">
              Platform Growth
            </Text>
          </div>
          <Text size="xs" className="text-slate-500 dark:text-slate-500">
            Last 6 months
          </Text>
        </Group>

        {growthData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                stroke="#64748b"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="tenants"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="activeUsers"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="employees"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center text-slate-500">
            Loading chart data...
          </div>
        )}
      </Paper>

      {/* Tenants List */}
      <Paper
        p="lg"
        radius="md"
        className="bg-[var(--bg-input)] border border-slate-200 dark:border-slate-700"
      >
        <Group mb="lg" justify="space-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <Text fw={600} className="text-slate-900 dark:text-slate-50">
              All Tenants
            </Text>
          </div>
          <Text size="xs" className="text-slate-500 dark:text-slate-500">
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
                <Table.Tr className="bg-slate-50 dark:bg-slate-700/50">
                  <Table.Th className="text-slate-700 dark:text-slate-300">Tenant</Table.Th>
                  <Table.Th className="text-slate-700 dark:text-slate-300">Plan</Table.Th>
                  <Table.Th className="text-slate-700 dark:text-slate-300">Status</Table.Th>
                  <Table.Th className="text-slate-700 dark:text-slate-300 text-right">Employees</Table.Th>
                  <Table.Th className="text-slate-700 dark:text-slate-300 text-right">Users</Table.Th>
                  <Table.Th className="text-slate-700 dark:text-slate-300">Created</Table.Th>
                  <Table.Th className="text-slate-700 dark:text-slate-300">Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tenantListQuery.data.content.map((tenant) => (
                  <Table.Tr key={tenant.tenantId}>
                    <Table.Td>
                      <div className="flex flex-col">
                        <Text fw={500} size="sm" className="text-slate-900 dark:text-slate-50">
                          {tenant.name}
                        </Text>
                        <Text size="xs" className="text-slate-500 dark:text-slate-500">
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
                      <Text size="sm" fw={500} className="text-slate-900 dark:text-slate-50">
                        {tenant.employeeCount}
                      </Text>
                    </Table.Td>
                    <Table.Td className="text-right">
                      <Text size="sm" fw={500} className="text-slate-900 dark:text-slate-50">
                        {tenant.userCount}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" className="text-slate-600 dark:text-slate-400">
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
          <Text className="text-slate-500 dark:text-slate-500">No tenants found</Text>
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
              <Text fw={500} size="sm" className="text-slate-700 dark:text-slate-300 mb-2">
                Tenant Information
              </Text>
              <Paper p="sm" className="bg-slate-50 dark:bg-slate-700/50 rounded-md">
                <Stack gap="xs">
                  <div>
                    <Text size="xs" className="text-slate-600 dark:text-slate-400">
                      Name
                    </Text>
                    <Text fw={500} size="sm" className="text-slate-900 dark:text-slate-50">
                      {selectedTenant.name}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" className="text-slate-600 dark:text-slate-400">
                      ID
                    </Text>
                    <Text fw={500} size="sm" className="text-slate-900 dark:text-slate-50">
                      {selectedTenant.tenantId}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" className="text-slate-600 dark:text-slate-400">
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
              <Text fw={500} size="sm" className="text-slate-700 dark:text-slate-300 mb-2">
                Access Method
              </Text>
              <Text size="sm" className="text-slate-600 dark:text-slate-400 mb-3">
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

            <Text size="xs" className="text-slate-500 dark:text-slate-500 italic">
              All access will be logged for audit purposes
            </Text>
          </Stack>
        )}
      </Modal>
    </div>
  );
}
