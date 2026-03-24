'use client';

import { useState, useEffect } from 'react';
import {
  Stack,
  SegmentedControl,
  Center,
  Loader,
  Text,
  Pagination,
  Group,
} from '@mantine/core';
import { IconActivity } from '@tabler/icons-react';
import { useActivityFeed } from '@/lib/hooks/queries/useFluence';
import ActivityCard from './ActivityCard';

const FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Wiki', value: 'WIKI' },
  { label: 'Blog', value: 'BLOG' },
  { label: 'Template', value: 'TEMPLATE' },
];

const PAGE_SIZE = 20;

export default function ActivityFeed() {
  const [contentType, setContentType] = useState('');
  const [page, setPage] = useState(0);

  // Safety: stop showing spinner after 8s if the API is slow/unreachable
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  useEffect(() => {
    setLoadingTimedOut(false);
    const timer = setTimeout(() => setLoadingTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, [page, contentType]);

  const { data, isLoading: queryLoading, isError } = useActivityFeed(
    page,
    PAGE_SIZE,
    contentType || undefined
  );

  const isLoading = queryLoading && !loadingTimedOut;
  const activities = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <Stack gap="md">
      <SegmentedControl
        value={contentType}
        onChange={(val) => {
          setContentType(val);
          setPage(0);
        }}
        data={FILTER_OPTIONS}
        size="sm"
      />

      {isLoading && (
        <Center py="xl">
          <Loader size="md" />
        </Center>
      )}

      {isError && (
        <Center py="xl">
          <Text c="red" size="sm">
            Failed to load activity feed. Please try again.
          </Text>
        </Center>
      )}

      {!isLoading && activities.length === 0 && (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <IconActivity size={48} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed" size="sm">
              {isError || loadingTimedOut
                ? 'Unable to load activity feed. The service may be temporarily unavailable.'
                : 'No activity yet. Create or edit content to see it here.'}
            </Text>
          </Stack>
        </Center>
      )}

      {!isLoading &&
        activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}

      {totalPages > 1 && (
        <Group justify="center" mt="md">
          <Pagination
            total={totalPages}
            value={page + 1}
            onChange={(p) => setPage(p - 1)}
            size="sm"
          />
        </Group>
      )}
    </Stack>
  );
}
