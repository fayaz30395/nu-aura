import React from 'react';
import {describe, expect, it} from 'vitest';
import {MantineProvider} from '@mantine/core';
import {render, screen} from '@testing-library/react';
import {DashboardSkeleton, DetailPageSkeleton, FormPageSkeleton, ListPageSkeleton} from './index';

const variants = [
  ['ListPageSkeleton', <ListPageSkeleton key="l" />],
  ['DetailPageSkeleton', <DetailPageSkeleton key="d" />],
  ['FormPageSkeleton', <FormPageSkeleton key="f" />],
  ['DashboardSkeleton', <DashboardSkeleton key="s" />],
] as const;

describe('route skeletons', () => {
  it.each(variants)('%s exposes a single busy status region', (_, node) => {
    render(<MantineProvider>{node}</MantineProvider>);
    const region = screen.getByRole('status', {name: 'Loading content'});
    expect(region).toHaveAttribute('aria-busy', 'true');
  });

  it.each(variants)('%s stays in the content region (no full-viewport height)', (_, node) => {
    const {container} = render(<MantineProvider>{node}</MantineProvider>);
    expect(container.querySelector('.min-h-screen, .h-screen')).toBeNull();
  });

  it('ListPageSkeleton renders the requested number of rows', () => {
    const {container} = render(
      <MantineProvider>
        <ListPageSkeleton rows={3} columns={2} showFilters={false} />
      </MantineProvider>
    );
    expect(container.querySelectorAll('.h-11')).toHaveLength(3);
  });
});
