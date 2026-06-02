'use client';

import {Button, Text} from '@mantine/core';
import {IconAlertCircle} from '@tabler/icons-react';

interface Props {
  error: Error;
  reset: () => void;
}

export default function FnFManagementError({error, reset}: Props) {
  return (
    <div className="page-shell-centered fade-slide-up">
      <div className="page-shell-card float-subtle fade-slide-up p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-danger-100 dark:bg-danger-900/20 flex items-center justify-center mx-auto">
          <IconAlertCircle size={40} color="var(--mantine-color-red-6)"/>
        </div>
        <Text fw={600} className="text-lg">
          Failed to load F&amp;F Management
        </Text>
        <Text size="sm" c="dimmed">
          {error.message}
        </Text>
        <Button variant="outline" size="sm" onClick={reset} className="rounded-lg">
          Try Again
        </Button>
      </div>
    </div>
  );
}
