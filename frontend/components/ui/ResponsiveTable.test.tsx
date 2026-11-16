import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {MantineProvider} from '@mantine/core';
import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ResponsiveTable, TablePagination, type Column, type ResponsiveTableProps} from './ResponsiveTable';

type Row = {id: string; name: string; amount: number};

const rows: Row[] = [
  {id: '1', name: 'Alice', amount: 1200},
  {id: '2', name: 'Bob', amount: 900},
];

const columns: Column<Row>[] = [
  {key: 'name', header: 'Name', accessor: (r) => r.name, mobilePriority: 'primary'},
  {key: 'amount', header: 'Amount', accessor: (r) => r.amount, numeric: true},
];

function renderTable(props: Partial<ResponsiveTableProps<Row>> = {}) {
  return render(
    <MantineProvider>
      <ResponsiveTable<Row> columns={columns} data={rows} keyExtractor={(r) => r.id} {...props}/>
    </MantineProvider>
  );
}

describe('ResponsiveTable', () => {
  it('renders default header and cell classes unchanged', () => {
    renderTable({columns: [columns[0]]});
    const header = screen.getByRole('columnheader', {name: 'Name'});
    expect(header).toHaveAttribute('scope', 'col');
    expect(header).toHaveClass('px-4', 'py-2.5', 'text-left', 'text-xs', 'font-medium');
    const cell = screen.getAllByRole('cell', {name: 'Alice'})[0];
    expect(cell).toHaveClass('px-4', 'py-3', 'text-sm');
    expect(document.querySelector('thead')).not.toHaveAttribute('class');
    expect(screen.queryByRole('columnheader', {name: 'Actions'})).not.toBeInTheDocument();
  });

  it('renders the empty message by default', () => {
    renderTable({data: [], emptyMessage: 'No projects'});
    expect(screen.getByText('No projects')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders a custom emptyState instead of the empty message', () => {
    renderTable({data: [], emptyMessage: 'No projects', emptyState: <div>Custom empty</div>});
    expect(screen.getByText('Custom empty')).toBeInTheDocument();
    expect(screen.queryByText('No projects')).not.toBeInTheDocument();
  });

  it('shows QueryErrorCard, not the empty state, on error with no rows', () => {
    renderTable({data: [], error: true, emptyMessage: 'No projects'});
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load this data");
    expect(screen.queryByText('No projects')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Retry'})).not.toBeInTheDocument();
  });

  it('retry calls onRetry', () => {
    const onRetry = vi.fn();
    renderTable({data: [], error: true, onRetry});
    fireEvent.click(screen.getByRole('button', {name: 'Retry'}));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps rendering rows when error is set but rows exist', () => {
    renderTable({error: true});
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  it('right-aligns numeric columns with tabular-nums', () => {
    renderTable();
    const header = screen.getByRole('columnheader', {name: 'Amount'});
    expect(header).toHaveClass('text-right');
    expect(header).not.toHaveClass('text-left');
    const cell = screen.getByRole('cell', {name: '1200'});
    expect(cell).toHaveClass('text-right', 'tabular-nums');
  });

  it('applies explicit center alignment', () => {
    renderTable({columns: [{...columns[0], align: 'center'}]});
    expect(screen.getByRole('columnheader', {name: 'Name'})).toHaveClass('text-center');
  });

  it('applies the sticky header class only when enabled', () => {
    const {unmount} = renderTable();
    expect(document.querySelector('thead')).not.toHaveClass('sticky');
    unmount();
    renderTable({stickyHeader: true});
    expect(document.querySelector('thead')).toHaveClass('sticky', 'top-0');
  });

  it('opens the row actions menu and invokes onClick', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderTable({
      rowActionsMenu: () => [
        {label: 'Edit', onClick: onEdit},
        {label: 'Delete', onClick: onDelete, color: 'red'},
      ],
    });
    expect(screen.getByRole('columnheader', {name: 'Actions'})).toBeInTheDocument();
    const firstRow = screen.getAllByRole('row')[1];
    await user.click(within(firstRow).getByRole('button', {name: 'Row actions'}));
    await user.click(await screen.findByRole('menuitem', {name: 'Edit'}));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('prefers renderRowActions over rowActionsMenu when both are provided', () => {
    renderTable({
      renderRowActions: (r) => <button type="button">Custom {r.name}</button>,
      rowActionsMenu: () => [{label: 'Edit', onClick: vi.fn()}],
    });
    expect(screen.getAllByRole('button', {name: 'Custom Alice'}).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', {name: 'Row actions'})).not.toBeInTheDocument();
  });

  it('uses 36px rows in compact density and 48px otherwise', () => {
    const {unmount} = renderTable();
    expect(screen.getAllByRole('row')[1]).toHaveClass('h-12');
    unmount();
    renderTable({density: 'compact'});
    expect(screen.getAllByRole('row')[1]).toHaveClass('h-9');
  });

  it('renders the toolbar slot in data, loading and empty states', () => {
    const toolbar = <input aria-label="Search rows"/>;
    const {unmount} = renderTable({toolbar});
    expect(screen.getByLabelText('Search rows')).toBeInTheDocument();
    unmount();
    const {unmount: u2} = renderTable({toolbar, isLoading: true});
    expect(screen.getByLabelText('Search rows')).toBeInTheDocument();
    expect(screen.getByRole('status', {name: 'Loading table'})).toBeInTheDocument();
    u2();
    renderTable({toolbar, data: []});
    expect(screen.getByLabelText('Search rows')).toBeInTheDocument();
  });

  it('marks selected rows with the accent-subtle surface', () => {
    renderTable({selectable: true, selectedKeys: new Set(['1']), onSelectionChange: vi.fn()});
    expect(screen.getAllByRole('row')[1].className).toContain('--accent-subtle');
  });
});

describe('TablePagination', () => {
  it('shows an x-y of n range and disables prev on the first page', () => {
    render(<TablePagination currentPage={0} totalPages={3} totalItems={25} pageSize={10} onPageChange={vi.fn()}/>);
    expect(screen.getByText('1-10 of 25')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Previous page'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Next page'})).toBeEnabled();
  });

  it('pages forward and reports page size changes', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <TablePagination currentPage={1} totalPages={3} totalItems={25} pageSize={10} onPageChange={onPageChange}
                       onPageSizeChange={onPageSizeChange}/>
    );
    expect(screen.getByText('11-20 of 25')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Next page'}));
    expect(onPageChange).toHaveBeenCalledWith(2);
    fireEvent.change(screen.getByLabelText('Page size'), {target: {value: '50'}});
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('shows 0-0 of 0 when empty', () => {
    render(<TablePagination currentPage={0} totalPages={0} totalItems={0} pageSize={10} onPageChange={vi.fn()}/>);
    expect(screen.getByText('0-0 of 0')).toBeInTheDocument();
  });
});
