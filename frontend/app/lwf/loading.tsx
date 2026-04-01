import { Container, Skeleton, Stack, Group } from '@mantine/core';
import { AppLayout } from '@/components/layout';

export default function LWFLoading() {
  return (
    <AppLayout>
      <Container size="xl" py="lg">
        <Skeleton height={32} width={300} mb="sm" />
        <Skeleton height={16} width={500} mb="lg" />
        <Skeleton height={40} width="100%" mb="md" />
        <Stack gap="sm">
          {Array.from({ length: 6 }).map((_, i) => (
            <Group key={i} gap="md">
              <Skeleton height={20} width="15%" />
              <Skeleton height={20} width="10%" />
              <Skeleton height={20} width="12%" />
              <Skeleton height={20} width="12%" />
              <Skeleton height={20} width="15%" />
              <Skeleton height={20} width="20%" />
            </Group>
          ))}
        </Stack>
      </Container>
    </AppLayout>
  );
}
