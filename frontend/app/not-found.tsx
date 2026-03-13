'use client';

import { Paper, Container, Center, Stack, Button, Group, Text } from '@mantine/core';
import { IconFileText, IconHome, IconArrowLeft } from '@tabler/icons-react';

/**
 * 404 Not Found page
 * Displayed when a route doesn't exist or is inaccessible
 */
export default function NotFound() {
  return (
    <Container size="xs" py="xl">
      <Center style={{ minHeight: '100vh' }}>
        <Paper p="xl" radius="md" shadow="md" w="100%">
          <Center mb="lg">
            <div style={{
              width: '5rem',
              height: '5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fef3c7',
            }}>
              <IconFileText size={36} color="#d97706" />
            </div>
          </Center>

          <Stack gap="sm" align="center">
            <Text fw={600} size="xl">
              Page Not Found
            </Text>
            <Text c="dimmed" ta="center" size="sm">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </Text>
          </Stack>

          <Group grow mt="lg">
            <Button
              leftSection={<IconHome size={16} />}
              onClick={() => (window.location.href = '/me/dashboard')}
              color="blue"
            >
              Go Home
            </Button>
            <Button
              leftSection={<IconArrowLeft size={16} />}
              variant="light"
              onClick={() => window.history.back()}
              color="gray"
            >
              Go Back
            </Button>
          </Group>
        </Paper>
      </Center>
    </Container>
  );
}
