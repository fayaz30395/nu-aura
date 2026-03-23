'use client';
import { AppLayout } from '@/components/layout';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Badge,
  Tooltip,
  Loader,
  Center,
  Alert,
  SimpleGrid,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { CalibrationResponse, CalibrationEmployee } from '@/lib/types/performance';

// 9-box maps (performance axis = finalRating 1-5 → buckets Low/Med/High)
// potential axis = managerRating 1-5 → buckets Low/Med/High
const toBucket = (rating?: number): 'low' | 'med' | 'high' => {
  if (!rating) return 'low';
  if (rating <= 2) return 'low';
  if (rating === 3) return 'med';
  return 'high';
};

const BOX_LABELS: Record<string, string> = {
  'low-low': 'Underperformer',
  'low-med': 'Inconsistent Player',
  'low-high': 'Enigma',
  'med-low': 'Core Player',
  'med-med': 'Core Player',
  'med-high': 'High Potential',
  'high-low': 'Solid Performer',
  'high-med': 'High Performer',
  'high-high': 'Star',
};

const BOX_COLORS: Record<string, string> = {
  'low-low': '#fee2e2',
  'low-med': '#fef3c7',
  'low-high': '#fef3c7',
  'med-low': '#fef3c7',
  'med-med': '#d1fae5',
  'med-high': '#bbf7d0',
  'high-low': '#d1fae5',
  'high-med': '#6ee7b7',
  'high-high': '#34d399',
};

async function fetchCalibration(cycleId: string): Promise<CalibrationResponse> {
  const res = await apiClient.get<CalibrationResponse>(`/review-cycles/${cycleId}/calibration`);
  return res.data;
}

export default function NineBoxPage() {
  const { id: cycleId } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['calibration', cycleId],
    queryFn: () => fetchCalibration(cycleId),
  });

  if (isLoading) return <Center h={300}><Loader /></Center>;
  if (error || !data) return (
    <Alert icon={<IconAlertCircle size={16} />} color="red">
      Failed to load 9-box data
    </Alert>
  );

  // Group employees into 9 boxes by (performance=finalRating, potential=managerRating)
  const boxes: Record<string, CalibrationEmployee[]> = {};
  for (const perf of ['low', 'med', 'high'] as const) {
    for (const pot of ['low', 'med', 'high'] as const) {
      boxes[`${perf}-${pot}`] = [];
    }
  }
  data.employees.forEach((emp) => {
    const perf = toBucket(emp.finalRating);
    const pot = toBucket(emp.managerRating);
    const key = `${perf}-${pot}`;
    boxes[key].push(emp);
  });

  // Render grid: rows = potential (High→Low), cols = performance (Low→Med→High)
  const potRows: Array<'high' | 'med' | 'low'> = ['high', 'med', 'low'];
  const perfCols: Array<'low' | 'med' | 'high'> = ['low', 'med', 'high'];

  return (
    <AppLayout>
      <Stack gap="lg" p="md">
        <Group justify="space-between">
        <div>
          <Title order={2} className="skeuo-emboss">9-Box Grid</Title>
          <Text c="dimmed" size="sm">{data.cycleName} — Performance vs Potential</Text>
        </div>
      </Group>

      <Group gap="xs" align="flex-start">
        {/* Y-axis label */}
        <Stack justify="center" h={360} w={20}>
          <Text size="xs" c="dimmed" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
            Potential (Manager Rating) →
          </Text>
        </Stack>

        <Stack gap={4}>
          {/* Column headers */}
          <Group gap={4} ml={60}>
            <Text size="xs" c="dimmed" w={140} ta="center">Low Performance</Text>
            <Text size="xs" c="dimmed" w={140} ta="center">Medium Performance</Text>
            <Text size="xs" c="dimmed" w={140} ta="center">High Performance</Text>
          </Group>

          {potRows.map((pot) => (
            <Group key={pot} gap={4} align="stretch">
              <Text size="xs" c="dimmed" w={56} ta="right" style={{ lineHeight: '120px' }}>
                {pot === 'high' ? 'High' : pot === 'med' ? 'Medium' : 'Low'}
              </Text>
              {perfCols.map((perf) => {
                const key = `${perf}-${pot}`;
                const employees = boxes[key] ?? [];
                return (
                  <Paper
                    key={key}
                    w={140}
                    h={120}
                    p="xs"
                    style={{ backgroundColor: BOX_COLORS[key], border: '1px solid #e5e7eb', overflow: 'hidden' }}
                  >
                    <Text size="xs" fw={600} mb={4} c="dark.7">
                      {BOX_LABELS[key]} ({employees.length})
                    </Text>
                    <Stack gap={2}>
                      {employees.slice(0, 4).map((emp) => (
                        <Tooltip key={emp.employeeId} label={`Self: ${emp.selfRating ?? '?'} | Mgr: ${emp.managerRating ?? '?'} | Final: ${emp.finalRating ?? '?'}`} withArrow>
                          <Badge variant="white" size="xs" style={{ cursor: 'default', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {emp.employeeName}
                          </Badge>
                        </Tooltip>
                      ))}
                      {employees.length > 4 && (
                        <Text size="xs" c="dimmed">+{employees.length - 4} more</Text>
                      )}
                    </Stack>
                  </Paper>
                );
              })}
            </Group>
          ))}

          {/* X-axis label */}
          <Text size="xs" c="dimmed" ta="center" ml={60}>
            Performance (Final Rating) →
          </Text>
        </Stack>
      </Group>

      {/* Legend */}
      <SimpleGrid cols={3} spacing="xs">
        {Object.entries(BOX_LABELS).map(([key, label]) => (
          <Group key={key} gap={6}>
            <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: BOX_COLORS[key], border: '1px solid #ccc' }} />
            <Text size="xs">{label}</Text>
          </Group>
        ))}
      </SimpleGrid>
      </Stack>
    </AppLayout>
  );
}
