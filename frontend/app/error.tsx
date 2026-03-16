'use client';

import { useEffect } from 'react';
import { Paper, Container, Center, Stack, Button, Group, Text, Accordion, Badge } from '@mantine/core';
import { IconAlertTriangle, IconRefresh, IconHome } from '@tabler/icons-react';
import { handleError, getUserMessage, categorizeError, ErrorCategory } from '@/lib/utils/error-handler';
import { isDevelopment } from '@/lib/config';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error page for segment-level errors (SSR + client boundary errors)
 * This is rendered when an error.tsx file catches an error in a page segment
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log and report the error using centralized error handler
    handleError(error, {
      source: 'page-error-boundary',
      digest: error.digest,
      isDevelopment
    });
  }, [error]);

  const category = categorizeError(error);
  const userMessage = getUserMessage(category, error.message);

  const getCategoryColor = (cat: ErrorCategory): string => {
    switch (cat) {
      case ErrorCategory.NETWORK:
        return 'orange';
      case ErrorCategory.AUTH:
      case ErrorCategory.PERMISSION:
        return 'red';
      case ErrorCategory.SERVER:
        return 'red';
      case ErrorCategory.NOT_FOUND:
        return 'yellow';
      default:
        return 'blue';
    }
  };

  return (
    <Container size="xs" py="xl">
      <Center style={{ minHeight: '100vh' }}>
        <Paper p="xl" radius="md" shadow="md" w="100%">
          <Center mb="lg">
            <div style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fee2e2',
            }}>
              <IconAlertTriangle size={28} color="#dc2626" />
            </div>
          </Center>

          <Stack gap="sm" align="center">
            <Text fw={600} size="lg" c="dark">
              Something went wrong
            </Text>
            <Badge color={getCategoryColor(category)} variant="light">
              {category.replace('_', ' ')}
            </Badge>
            <Text c="dimmed" ta="center">
              {userMessage}
            </Text>
          </Stack>

          {isDevelopment && (
            <Accordion mt="lg" defaultValue="error-details">
              <Accordion.Item value="error-details">
                <Accordion.Control>Developer Details</Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    <Text size="xs" c="dimmed" fw={500}>Error Message:</Text>
                    <Text
                      size="xs"
                      ff="monospace"
                      c="red"
                      style={{ wordBreak: 'break-all' }}
                    >
                      {error.message}
                    </Text>
                    {error.stack && (
                      <>
                        <Text size="xs" c="dimmed" fw={500} mt="sm">Stack Trace:</Text>
                        <Text
                          size="xs"
                          ff="monospace"
                          c="dark"
                          style={{
                            wordBreak: 'break-all',
                            whiteSpace: 'pre-wrap',
                            maxHeight: '200px',
                            overflow: 'auto'
                          }}
                        >
                          {error.stack}
                        </Text>
                      </>
                    )}
                    {error.digest && (
                      <>
                        <Text size="xs" c="dimmed" fw={500} mt="sm">Error ID:</Text>
                        <Text size="xs" ff="monospace" c="blue">{error.digest}</Text>
                      </>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          )}

          <Group grow mt="lg">
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={reset}
              color="blue"
            >
              Try Again
            </Button>
            <Button
              leftSection={<IconHome size={16} />}
              variant="light"
              onClick={() => (window.location.href = '/me/dashboard')}
              color="gray"
            >
              Go Home
            </Button>
          </Group>
        </Paper>
      </Center>
    </Container>
  );
}
