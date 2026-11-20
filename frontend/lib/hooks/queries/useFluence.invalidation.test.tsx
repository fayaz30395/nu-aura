import React from 'react';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fluenceService} from '@/lib/services/platform/fluence.service';
import {
  fluenceKeys,
  useApproveWikiPage,
  useArchiveWikiPage,
  useCreateWikiPage,
  useDeleteWikiPage,
  usePublishWikiPage,
} from './useFluence';

vi.mock('@/lib/services/platform/fluence.service', () => ({
  fluenceService: {
    createWikiPage: vi.fn(),
    deleteWikiPage: vi.fn(),
    publishWikiPage: vi.fn(),
    approveWikiPage: vi.fn(),
    archiveWikiPage: vi.fn(),
  },
}));

const service = fluenceService as unknown as Record<string, ReturnType<typeof vi.fn>>;
const spaceListKey = fluenceKeys.wikiSpaceList(0, 20);

function wrapperFor(client: QueryClient) {
  return ({children}: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function seededClient() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  client.setQueryData(spaceListKey, {content: [], totalElements: 0});
  return client;
}

describe('wiki page mutations invalidate the wiki space list cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(service).forEach((fn) => fn.mockResolvedValue({id: 'p1'}));
  });

  it('marks the space list invalidated after useCreateWikiPage succeeds', async () => {
    const client = seededClient();
    const {result} = renderHook(() => useCreateWikiPage(), {wrapper: wrapperFor(client)});

    result.current.mutate({} as never);

    await waitFor(() => expect(client.getQueryState(spaceListKey)?.isInvalidated).toBe(true));
  });

  it('marks the space list invalidated after useDeleteWikiPage succeeds', async () => {
    const client = seededClient();
    const {result} = renderHook(() => useDeleteWikiPage(), {wrapper: wrapperFor(client)});

    result.current.mutate('p1');

    await waitFor(() => expect(client.getQueryState(spaceListKey)?.isInvalidated).toBe(true));
  });

  it.each([
    ['usePublishWikiPage', usePublishWikiPage],
    ['useApproveWikiPage', useApproveWikiPage],
    ['useArchiveWikiPage', useArchiveWikiPage],
  ])('marks the space list invalidated after %s succeeds', async (_name, useHook) => {
    const client = seededClient();
    const {result} = renderHook(() => useHook(), {wrapper: wrapperFor(client)});

    result.current.mutate('p1');

    await waitFor(() => expect(client.getQueryState(spaceListKey)?.isInvalidated).toBe(true));
  });
});
