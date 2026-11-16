import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {MantineProvider} from '@mantine/core';
import {fireEvent, render, screen} from '@testing-library/react';
import {QueryState, type QueryStateResult} from './QueryState';

type Row = {id: string};

function renderState(query: QueryStateResult<Row[]>) {
  return render(
    <MantineProvider>
      <QueryState
        query={query}
        skeleton={<div>skeleton</div>}
        isEmpty={(rows) => rows.length === 0}
        empty={{title: 'No employees'}}
      >
        {(rows) => <div>rows: {rows.length}</div>}
      </QueryState>
    </MantineProvider>
  );
}

const base: QueryStateResult<Row[]> = {
  data: undefined,
  isPending: false,
  isError: false,
  isFetching: false,
  refetch: vi.fn(),
};

describe('QueryState', () => {
  it('renders the skeleton while pending without data', () => {
    renderState({...base, isPending: true, isFetching: true});
    expect(screen.getByText('skeleton')).toBeInTheDocument();
  });

  it('renders children with data', () => {
    renderState({...base, data: [{id: '1'}, {id: '2'}]});
    expect(screen.getByText('rows: 2')).toBeInTheDocument();
  });

  it('keeps content during a background refetch', () => {
    renderState({...base, data: [{id: '1'}], isFetching: true});
    expect(screen.getByText('rows: 1')).toBeInTheDocument();
    expect(screen.queryByText('skeleton')).not.toBeInTheDocument();
  });

  it('renders the empty state when the predicate matches', () => {
    renderState({...base, data: []});
    expect(screen.getByText('No employees')).toBeInTheDocument();
  });

  it('renders the error card, not the empty state, on error without data', () => {
    renderState({...base, isError: true});
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load this data");
    expect(screen.queryByText('No employees')).not.toBeInTheDocument();
    expect(screen.queryByText('skeleton')).not.toBeInTheDocument();
  });

  it('never shows the empty state on error with empty cached data', () => {
    renderState({...base, isError: true, data: []});
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('No employees')).not.toBeInTheDocument();
  });

  it('retry calls refetch', () => {
    const refetch = vi.fn();
    renderState({...base, isError: true, refetch});
    fireEvent.click(screen.getByRole('button', {name: 'Retry'}));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
