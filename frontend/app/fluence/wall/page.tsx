'use client';

import {
  Container,
  Title,
  Text,
  Grid,
  Paper,
  Stack,
  Skeleton,
  Group,
  Badge,
} from '@mantine/core';
import { IconTrendingUp, IconActivity } from '@tabler/icons-react';
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
      <Stack gap="sm">
        <Skeleton height={16} width="80%" />
        <Skeleton height={16} width="65%" />
        <Skeleton height={16} width="90%" />
        <Skeleton height={16} width="70%" />
        <Text size="xs" c="dimmed" mt="xs">
          Trending content coming soon...
        </Text>
      </Stack>
    </Paper>
  );
}

export default function WallPage() {
  return (
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
  );
}
