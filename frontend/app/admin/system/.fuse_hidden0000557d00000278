import { Skeleton, SimpleGrid, Stack } from '@mantine/core';

export default function SystemDashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Stack gap="md">
        <Skeleton height={40} width="50%" />
        <Skeleton height={20} width="70%" />
      </Stack>

      {/* Stats Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={120} />
        ))}
      </SimpleGrid>

      {/* Chart */}
      <Skeleton height={350} />

      {/* Table */}
      <Stack gap="md">
        <Skeleton height={30} />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={50} />
        ))}
      </Stack>
    </div>
  );
}
