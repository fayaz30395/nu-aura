'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Text,
  Title,
  Group,
  Badge,
  Table,
  Tabs,
  Grid,
  Card,
  ThemeIcon,
  Stack,
  Code,
} from '@mantine/core';
import {
  IconDeviceMobile,
  IconApi,
  IconGauge,
  IconShield,
  IconDatabase,
  IconCheck,
  IconClock,
} from '@tabler/icons-react';
import { AdminPageContent } from '@/components/layout';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

interface MobileEndpoint {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT';
  path: string;
  description: string;
  authentication: boolean;
  permissions?: string[];
}

export default function MobileApiPage() {
  const router = useRouter();
  const { hasAnyRole, isReady } = usePermissions();
  const { hasHydrated, isAuthenticated } = useAuth();

  // DEF-58: RBAC gate — API surface documentation should be restricted to admins
  useEffect(() => {
    if (!hasHydrated || !isReady) return;
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    if (!hasAnyRole(...ADMIN_ACCESS_ROLES)) { router.replace('/me/dashboard'); }
  }, [hasHydrated, isReady, isAuthenticated, router, hasAnyRole]);
  const dashboardEndpoints: MobileEndpoint[] = [
    {
      method: 'GET',
      path: '/api/v1/mobile/dashboard',
      description: 'Get aggregated dashboard data with employee summary, attendance, leave balance, and approvals',
      authentication: true,
      permissions: ['DASHBOARD:VIEW'],
    },
  ];

  const attendanceEndpoints: MobileEndpoint[] = [
    {
      method: 'POST',
      path: '/api/v1/mobile/attendance/check-in',
      description: 'Mobile check-in with GPS location and geofence validation',
      authentication: true,
      permissions: ['ATTENDANCE:MARK'],
    },
    {
      method: 'POST',
      path: '/api/v1/mobile/attendance/check-out',
      description: 'Mobile check-out with GPS location',
      authentication: true,
      permissions: ['ATTENDANCE:MARK'],
    },
    {
      method: 'GET',
      path: '/api/v1/mobile/attendance/dashboard',
      description: 'Get attendance dashboard with daily and weekly summary',
      authentication: true,
      permissions: ['ATTENDANCE:VIEW_ALL'],
    },
    {
      method: 'GET',
      path: '/api/v1/mobile/attendance/nearby-offices',
      description: 'Get nearby offices with geofence information',
      authentication: true,
      permissions: ['OFFICE_LOCATION:VIEW'],
    },
  ];

  const leaveEndpoints: MobileEndpoint[] = [
    {
      method: 'POST',
      path: '/api/v1/mobile/leave/quick-apply',
      description: 'Quick apply for leave with minimal fields (type, dates, reason)',
      authentication: true,
      permissions: ['LEAVE:REQUEST'],
    },
    {
      method: 'GET',
      path: '/api/v1/mobile/leave/balance',
      description: 'Get leave balance summary for all leave types',
      authentication: true,
      permissions: ['LEAVE_BALANCE:VIEW'],
    },
    {
      method: 'GET',
      path: '/api/v1/mobile/leave/recent',
      description: 'Get last 10 leave requests with status',
      authentication: true,
      permissions: ['LEAVE:VIEW_ALL', 'LEAVE:VIEW_TEAM', 'LEAVE:VIEW_SELF'],
    },
    {
      method: 'DELETE',
      path: '/api/v1/mobile/leave/{id}/cancel',
      description: 'Cancel a pending leave request',
      authentication: true,
      permissions: ['LEAVE:CANCEL'],
    },
  ];

  const approvalEndpoints: MobileEndpoint[] = [
    {
      method: 'GET',
      path: '/api/v1/mobile/approvals/pending',
      description: 'Get all pending approvals with count breakdown by type',
      authentication: true,
      permissions: ['LEAVE:APPROVE', 'EXPENSE:APPROVE', 'EMPLOYMENT_CHANGE:APPROVE'],
    },
    {
      method: 'POST',
      path: '/api/v1/mobile/approvals/{id}/approve',
      description: 'Quick approve a request with optional notes',
      authentication: true,
      permissions: ['LEAVE:APPROVE', 'EXPENSE:APPROVE', 'EMPLOYMENT_CHANGE:APPROVE'],
    },
    {
      method: 'POST',
      path: '/api/v1/mobile/approvals/{id}/reject',
      description: 'Quick reject a request with mandatory reason',
      authentication: true,
      permissions: ['LEAVE:REJECT', 'EXPENSE:APPROVE', 'EMPLOYMENT_CHANGE:APPROVE'],
    },
    {
      method: 'POST',
      path: '/api/v1/mobile/approvals/bulk-action',
      description: 'Approve or reject multiple approvals at once',
      authentication: true,
      permissions: ['LEAVE:APPROVE', 'EXPENSE:APPROVE', 'EMPLOYMENT_CHANGE:APPROVE'],
    },
  ];

  const notificationEndpoints: MobileEndpoint[] = [
    {
      method: 'POST',
      path: '/api/v1/mobile/notifications/register-device',
      description: 'Register FCM or APNs token for push notifications',
      authentication: true,
      permissions: ['NOTIFICATION:VIEW'],
    },
    {
      method: 'GET',
      path: '/api/v1/mobile/notifications/unread',
      description: 'Get unread notification count and last 10 notifications',
      authentication: true,
      permissions: ['NOTIFICATION:VIEW'],
    },
    {
      method: 'POST',
      path: '/api/v1/mobile/notifications/mark-read',
      description: 'Mark notifications as read (single, multiple, or all)',
      authentication: true,
      permissions: ['NOTIFICATION:VIEW'],
    },
  ];

  const syncEndpoints: MobileEndpoint[] = [
    {
      method: 'GET',
      path: '/api/v1/mobile/sync',
      description: 'Delta sync - get all changes since last sync for offline-first patterns',
      authentication: true,
      permissions: ['DASHBOARD:VIEW'],
    },
  ];

  const EndpointTable = ({ endpoints }: { endpoints: MobileEndpoint[] }) => (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Method</Table.Th>
          <Table.Th>Endpoint</Table.Th>
          <Table.Th>Description</Table.Th>
          <Table.Th>Auth</Table.Th>
          <Table.Th>Permissions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {endpoints.map((endpoint, idx) => (
          <Table.Tr key={idx}>
            <Table.Td>
              <Badge color={endpoint.method === 'GET' ? 'blue' : 'green'}>
                {endpoint.method}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Code>
                {endpoint.path}
              </Code>
            </Table.Td>
            <Table.Td>{endpoint.description}</Table.Td>
            <Table.Td>
              {endpoint.authentication && <IconCheck size={16} color="green" />}
            </Table.Td>
            <Table.Td>
              {endpoint.permissions && endpoint.permissions.length > 0 ? (
                <Group gap="xs">
                  {endpoint.permissions.map((perm) => (
                    <Badge key={perm} size="sm" variant="light">
                      {perm}
                    </Badge>
                  ))}
                </Group>
              ) : (
                <Text size="sm" c="dimmed">
                  N/A
                </Text>
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );

  return (
    <AdminPageContent>
      <Container size="lg" py="xl">
        {/* Header */}
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={1} size="h2" mb="xs" className="skeuo-emboss">
              <Group gap="sm">
                <ThemeIcon size="lg" color="blue" radius="md">
                  <IconDeviceMobile size={24} />
                </ThemeIcon>
                Mobile API Documentation
              </Group>
            </Title>
            <Text c="dimmed" className="skeuo-deboss">
              Optimized API endpoints for mobile applications with minimal payloads and offline-first support
            </Text>
          </div>
        </Group>

        {/* Overview Cards */}
        <Grid mb="xl">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder className="skeuo-card">
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500} c="dimmed">
                  Total Endpoints
                </Text>
                <IconApi size={18} color="blue" />
              </Group>
              <Text fw={700} size="xl">
                {dashboardEndpoints.length +
                  attendanceEndpoints.length +
                  leaveEndpoints.length +
                  approvalEndpoints.length +
                  notificationEndpoints.length +
                  syncEndpoints.length}
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder className="skeuo-card">
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500} c="dimmed">
                  Active Devices
                </Text>
                <IconDeviceMobile size={18} color="green" />
              </Group>
              <Text fw={700} size="xl">
                124
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder className="skeuo-card">
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500} c="dimmed">
                  API Calls (24h)
                </Text>
                <IconGauge size={18} color="orange" />
              </Group>
              <Text fw={700} size="xl">
                8.2K
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder className="skeuo-card">
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500} c="dimmed">
                  Avg Response
                </Text>
                <IconClock size={18} color="red" />
              </Group>
              <Text fw={700} size="xl">
                245ms
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Features Overview */}
        <Stack gap="lg" mb="xl">
          <Card withBorder className="skeuo-card">
            <Stack gap="md">
              <Group>
                <ThemeIcon color="blue" size="lg">
                  <IconShield size={18} />
                </ThemeIcon>
                <div>
                  <Text fw={500}>JWT Authentication</Text>
                  <Text size="sm" c="dimmed">
                    All endpoints require valid JWT token in Authorization header
                  </Text>
                </div>
              </Group>
              <Group>
                <ThemeIcon color="green" size="lg">
                  <IconDatabase size={18} />
                </ThemeIcon>
                <div>
                  <Text fw={500}>Minimal Payloads</Text>
                  <Text size="sm" c="dimmed">
                    Optimized for mobile bandwidth - only essential fields returned
                  </Text>
                </div>
              </Group>
              <Group>
                <ThemeIcon color="orange" size="lg">
                  <IconGauge size={18} />
                </ThemeIcon>
                <div>
                  <Text fw={500}>Delta Sync</Text>
                  <Text size="sm" c="dimmed">
                    Offline-first support with timestamp-based change tracking
                  </Text>
                </div>
              </Group>
            </Stack>
          </Card>
        </Stack>

        {/* Endpoint Documentation */}
        <Tabs defaultValue="dashboard" mt="xl">
          <Tabs.List>
            <Tabs.Tab value="dashboard" leftSection={<IconDeviceMobile size={14} />}>
              Dashboard
            </Tabs.Tab>
            <Tabs.Tab value="attendance">Attendance</Tabs.Tab>
            <Tabs.Tab value="leave">Leave</Tabs.Tab>
            <Tabs.Tab value="approvals">Approvals</Tabs.Tab>
            <Tabs.Tab value="notifications">Notifications</Tabs.Tab>
            <Tabs.Tab value="sync">Sync</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dashboard" pt="xl">
            <Paper p="md" withBorder>
              <Title order={3} mb="md">
                Dashboard Endpoints
              </Title>
              <EndpointTable endpoints={dashboardEndpoints} />
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="attendance" pt="xl">
            <Paper p="md" withBorder>
              <Title order={3} mb="md">
                Attendance Endpoints
              </Title>
              <Text c="dimmed" mb="md">
                Existing attendance endpoints already optimized for mobile with GPS and geofencing
              </Text>
              <EndpointTable endpoints={attendanceEndpoints} />
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="leave" pt="xl">
            <Paper p="md" withBorder>
              <Title order={3} mb="md">
                Leave Management Endpoints
              </Title>
              <EndpointTable endpoints={leaveEndpoints} />
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="approvals" pt="xl">
            <Paper p="md" withBorder>
              <Title order={3} mb="md">
                Approval Management Endpoints
              </Title>
              <EndpointTable endpoints={approvalEndpoints} />
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="notifications" pt="xl">
            <Paper p="md" withBorder>
              <Title order={3} mb="md">
                Notification Endpoints
              </Title>
              <EndpointTable endpoints={notificationEndpoints} />
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="sync" pt="xl">
            <Paper p="md" withBorder>
              <Title order={3} mb="md">
                Delta Sync Endpoints
              </Title>
              <Text c="dimmed" mb="md">
                For offline-first mobile patterns, sync local data with server
              </Text>
              <EndpointTable endpoints={syncEndpoints} />
            </Paper>
          </Tabs.Panel>
        </Tabs>

        {/* Usage Examples */}
        <Paper p="md" mt="xl" withBorder>
          <Title order={3} mb="md">
            Frontend Integration
          </Title>
          <Stack gap="md">
            <div>
              <Text fw={500} mb="xs">
                Import Mobile API Service
              </Text>
              <Code>{`import mobileApiService from '@/lib/services/core/mobile-api.service';`}</Code>
            </div>
            <div>
              <Text fw={500} mb="xs">
                Use React Query Hooks
              </Text>
              <Code>{`import { useMobileDashboard, useMobileLeaveBalance } from '@/lib/hooks/queries/useMobileApi';

const MyComponent = () => {
  const { data: dashboard, isLoading } = useMobileDashboard();
  const { data: leaveBalance } = useMobileLeaveBalance();
  // Use data...
};`}</Code>
            </div>
          </Stack>
        </Paper>
      </Container>
    </AdminPageContent>
  );
}
