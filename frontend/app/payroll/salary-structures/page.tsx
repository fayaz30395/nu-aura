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
import { Banknote, Plus } from 'lucide-react';

export default function SalaryStructuresPage() {
  return (
    <AppLayout activeMenuItem="payroll">
      <Box p="lg">
        <Stack gap="lg">
          {/* Page header */}
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2} fw={600} className="skeuo-emboss">
                Salary Structures
              </Title>
              <Text c="dimmed" size="sm" mt={4} className="skeuo-deboss">
                Define and manage salary structures with component breakdowns, CTC calculations, and grade-based templates.
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
                <Banknote className="w-12 h-12 text-[var(--text-muted)]" />
              </div>
              <Title order={4} fw={500} ta="center" className="skeuo-emboss">
                No Salary Structures Defined
              </Title>
              <Text c="dimmed" size="sm" ta="center" maw={420}>
                Salary structures define how CTC is broken down into components like Basic, HRA, DA, and more. Create your first structure to start configuring payroll.
              </Text>
              <Group gap="xs" mt="xs">
                <Plus className="w-4 h-4 text-[var(--text-muted)]" />
                <Text size="xs" c="dimmed">
                  Structure creation will be available once payroll components are configured.
                </Text>
              </Group>
            </Stack>
          </Card>
        </Stack>
      </Box>
    </AppLayout>
  );
}
