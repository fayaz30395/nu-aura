'use client';

import {Button, Center, Stack, Text} from '@mantine/core';
import {IconAlertCircle} from '@tabler/icons-react';

interface Props {
  error: Error;
  reset: () => void;
}

export default function FnFManagementError({error, reset}: Props) {
  return (
    <Center h={400}>
      <Stack align="center" gap="sm">
        <IconAlertCircle size={40} color="var(--mantine-color-red-6)"/>
        <Text fw={600}>Failed to load F&amp;F Management</Text>
        <Text size="sm" c="dimmed">{error.message}</Text>
        <Button variant="outline" size="sm" onClick={reset}>
          Try Again
        </Button>
      </Stack>
    </Center>
  );
}
