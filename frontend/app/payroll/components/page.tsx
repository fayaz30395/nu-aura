'use client';

import { AppLayout } from '@/components/layout';
import {
  Box,
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
} from '@mantine/core';
import { DollarSign, Plus } from 'lucide-react';

export default function PayrollComponentsPage() {
  return (
    <AppLayout activeMenuItem="payroll">
      <Box p="lg">
        <Stack gap="lg">
          {/* Page header */}
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2} fw={600} className="skeuo-emboss">
                Payroll Components
              </Title>
              <Text c="dimmed" size="sm" mt={4} className="skeuo-deboss">
                Configure earnings, deductions, and tax components such as Basic, HRA, DA, and more.
              </Text>
            </div>
            <Badge variant="light" color="blue" size="lg">
              Payroll
            </Badge>
          </Group>

          {/* Empty state */}
          <Card withBorder shadow="xs" radius="md" p="xl" className="skeuo-card">
            <Stack align="center" gap="md" py="xl">
              <div className="rounded-full bg-[var(--bg-secondary)] p-4">
                <DollarSign className="w-12 h-12 text-[var(--text-muted)]" />
              </div>
              <Title order={4} fw={500} ta="center" className="skeuo-emboss">
                No Payroll Components Configured
              </Title>
              <Text c="dimmed" size="sm" ta="center" maw={420}>
                Payroll components are the building blocks of salary structures — earnings like Basic and HRA, deductions like PF and ESI, and tax components like TDS.
              </Text>
              <Group gap="xs" mt="xs">
                <Plus className="w-4 h-4 text-[var(--text-muted)]" />
                <Text size="xs" c="dimmed">
                  Component configuration will be available in a future release.
                </Text>
              </Group>
            </Stack>
          </Card>
        </Stack>
      </Box>
    </AppLayout>
  );
}
