'use client';

import {
  Container,
  Title,
  Text,
  Grid,
  Paper,
  Stack,
  Group,
  Badge,
} from '@mantine/core';
import { IconTrendingUp, IconActivity, IconFlame } from '@tabler/icons-react';
import { AppLayout } from '@/components/layout';
import ActivityFeed from '@/components/fluence/ActivityFeed';

function TrendingSidebar() {
  return (
    <Paper shadow="xs" p="md" radius="md" withBorder>
      <Group gap="xs" mb="md">
        <IconTrendingUp size={18} />
        <Text fw={600} size="sm">
          Trending Content
        </Text>
      </Group>
      <Stack gap="sm" align="center" py="md">
        <IconFlame size={32} stroke={1.5} style={{ color: 'var(--mantine-color-dimmed)' }} />
        <Text size="xs" c="dimmed" ta="center">
          No trending content yet. Start creating and sharing to see what is popular.
        </Text>
      </Stack>
    </Paper>
  );
}

export default function WallPage() {
  return (
    <AppLayout>
    <Container size="xl" py="lg">
      <Group gap="sm" mb="lg">
        <IconActivity size={28} />
        <div>
          <Title order={2} className="skeuo-emboss">Activity Wall</Title>
          <Text size="sm" c="dimmed">
            See what is happening across your knowledge base
          </Text>
        </div>
        <Badge variant="light" color="blue" size="sm">
          Live
        </Badge>
      </Group>

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <ActivityFeed />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <TrendingSidebar />
        </Grid.Col>
      </Grid>
    </Container>
    </AppLayout>
  );
}
