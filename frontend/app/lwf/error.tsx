'use client';

import { Container, Title, Text, Button, Group } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { AppLayout } from '@/components/layout';

export default function LWFError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppLayout>
      <Container size="sm" py="xl">
        <Group justify="center" mb="md">
          <IconAlertTriangle size={48} color="var(--mantine-color-red-6)" />
        </Group>
        <Title order={3} ta="center" mb="sm">
          Something went wrong
        </Title>
        <Text c="dimmed" ta="center" mb="lg">
          {error.message || 'Failed to load Labour Welfare Fund data.'}
        </Text>
        <Group justify="center">
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        </Group>
      </Container>
    </AppLayout>
  );
}
