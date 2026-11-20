import React from 'react';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {announcementService} from '@/lib/services/platform/announcement.service';
import {
  announcementKeys,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useMarkAnnouncementRead,
  useUpdateAnnouncement,
} from './useAnnouncements';

vi.mock('@/lib/services/platform/announcement.service', () => ({
  announcementService: {
    createAnnouncement: vi.fn(),
    updateAnnouncement: vi.fn(),
    deleteAnnouncement: vi.fn(),
    markAsRead: vi.fn(),
  },
}));

const service = announcementService as unknown as Record<string, ReturnType<typeof vi.fn>>;
const activeKey = announcementKeys.active('e1', 0, 10);

function wrapperFor(client: QueryClient) {
  return ({children}: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function seededClient() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  client.setQueryData(activeKey, {content: [], totalElements: 0});
  return client;
}

describe('announcement mutations invalidate the active-announcements cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(service).forEach((fn) => fn.mockResolvedValue({id: 'a1'}));
  });

  it('marks the active query invalidated after useCreateAnnouncement succeeds', async () => {
    const client = seededClient();
    const {result} = renderHook(() => useCreateAnnouncement(), {wrapper: wrapperFor(client)});

    result.current.mutate({} as never);

    await waitFor(() => expect(client.getQueryState(activeKey)?.isInvalidated).toBe(true));
  });

  it('marks the active query invalidated after useUpdateAnnouncement succeeds', async () => {
    const client = seededClient();
    const {result} = renderHook(() => useUpdateAnnouncement(), {wrapper: wrapperFor(client)});

    result.current.mutate({id: 'a1', data: {} as never});

    await waitFor(() => expect(client.getQueryState(activeKey)?.isInvalidated).toBe(true));
  });

  it('marks the active query invalidated after useDeleteAnnouncement succeeds', async () => {
    const client = seededClient();
    const {result} = renderHook(() => useDeleteAnnouncement(), {wrapper: wrapperFor(client)});

    result.current.mutate('a1');

    await waitFor(() => expect(client.getQueryState(activeKey)?.isInvalidated).toBe(true));
  });

  it('marks the active query invalidated after useMarkAnnouncementRead succeeds', async () => {
    const client = seededClient();
    const {result} = renderHook(() => useMarkAnnouncementRead(), {wrapper: wrapperFor(client)});

    result.current.mutate({announcementId: 'a1', employeeId: 'e1'});

    await waitFor(() => expect(client.getQueryState(activeKey)?.isInvalidated).toBe(true));
  });
});
