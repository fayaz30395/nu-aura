import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MantineProvider} from '@mantine/core';
import type {ReactNode} from 'react';
import WikiPage from './page';
import {Permissions} from '@/lib/hooks/usePermissions';

const permissionState = {
  granted: [] as string[],
};

vi.mock('@/lib/hooks/usePermissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/hooks/usePermissions')>();
  const hasPermission = (permission: string): boolean => permissionState.granted.includes(permission);
  return {
    ...actual,
    usePermissions: () => ({
      hasPermission,
      hasAnyPermission: (...perms: string[]) => perms.some(hasPermission),
      hasAllPermissions: (...perms: string[]) => perms.every(hasPermission),
      hasRole: () => false,
      hasAnyRole: () => false,
      hasAllRoles: () => false,
      isAdmin: false,
      isReady: true,
      isPermissionReady: true,
    }),
  };
});

const wikiPagesQuery = {
  data: {content: []} as {content: unknown[]} | undefined,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: vi.fn(),
};

vi.mock('@/lib/hooks/queries/useFluence', () => ({
  useWikiSpaces: () => ({data: {content: []}, isLoading: false, isError: false, error: null, refetch: vi.fn()}),
  useWikiPages: () => wikiPagesQuery,
  useCreateWikiSpace: () => ({mutateAsync: vi.fn(), isPending: false}),
  useUpdateWikiSpace: () => ({mutateAsync: vi.fn(), isPending: false}),
  useDeleteWikiSpace: () => ({mutateAsync: vi.fn(), isPending: false}),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({push: vi.fn()}),
}));

vi.mock('@/components/layout', () => ({
  AppLayout: ({children}: {children: ReactNode}) => <div>{children}</div>,
}));

vi.mock('@/components/motion', () => ({
  PageTransition: ({children}: {children: ReactNode}) => <div>{children}</div>,
  Stagger: ({children}: {children: ReactNode}) => <div>{children}</div>,
  StaggerItem: ({children}: {children: ReactNode}) => <div>{children}</div>,
}));

vi.mock('@/components/fluence/SpaceFormDrawer', () => ({
  SpaceFormDrawer: () => null,
}));
vi.mock('@/components/fluence/DeleteSpaceModal', () => ({
  DeleteSpaceModal: () => null,
}));
vi.mock('@/components/fluence/SpacePermissionsDrawer', () => ({
  SpacePermissionsDrawer: () => null,
}));

describe('WikiPage gating and error state', () => {
  beforeEach(() => {
    permissionState.granted = [];
    wikiPagesQuery.isError = false;
    wikiPagesQuery.error = null;
    wikiPagesQuery.isLoading = false;
    wikiPagesQuery.data = {content: []};
  });

  it('hides New Page without KNOWLEDGE:WIKI_CREATE', () => {
    render(<WikiPage/>);
    expect(screen.queryByTestId('wiki-new-page')).toBeNull();
  });

  it('shows New Page with KNOWLEDGE:WIKI_CREATE', () => {
    permissionState.granted = [Permissions.KNOWLEDGE_WIKI_CREATE];
    render(<WikiPage/>);
    expect(screen.getByTestId('wiki-new-page')).toBeTruthy();
  });

  it('shows the space empty state when the space has no pages', () => {
    render(<WikiPage/>);
    expect(screen.getByText('No pages in this space')).toBeTruthy();
  });

  it('shows a permission message instead of an empty shell when pages return 403', () => {
    wikiPagesQuery.isError = true;
    wikiPagesQuery.error = {response: {status: 403}};
    render(<MantineProvider><WikiPage/></MantineProvider>);
    expect(screen.getByText(/permission/i)).toBeTruthy();
  });
});
