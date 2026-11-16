import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {ConfirmDialog} from './ConfirmDialog';
import {EmptyState} from './EmptyState';

describe('ConfirmDialog', () => {
  const base = {isOpen: true, onClose: vi.fn(), onConfirm: vi.fn(), title: 'Delete item?', message: 'This cannot be undone.'};

  it('is labelled by its title, with Cancel before the confirm action', () => {
    render(<ConfirmDialog {...base} confirmText="Delete"/>);
    expect(screen.getByRole('dialog', {name: 'Delete item?'})).toHaveAccessibleDescription('This cannot be undone.');
    const [cancel, confirm] = screen.getAllByRole('button');
    expect(cancel).toHaveTextContent('Cancel');
    expect(confirm).toHaveTextContent('Delete');
  });

  it('closes on Escape and confirms on click', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...base} onClose={onClose} onConfirm={onConfirm}/>);
    fireEvent.keyDown(document, {key: 'Escape'});
    expect(onClose).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Confirm button'}));
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe('EmptyState', () => {
  it('renders title, description and a single action', () => {
    const onAction = vi.fn();
    render(<EmptyState title="No leaves" description="Apply for leave to see it here." actionLabel="Apply" onAction={onAction}/>);
    expect(screen.getByRole('heading', {name: 'No leaves'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Apply'}));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
