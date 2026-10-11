import React, {useState} from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {Modal, ModalBody, ModalHeader} from './Modal';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function FormModal() {
  const [notes, setNotes] = useState('');
  const [open, setOpen] = useState(true);
  return (
    // Inline onClose — a new function identity on every render
    <Modal isOpen={open} onClose={() => setOpen(false)}>
      <ModalHeader>Edit</ModalHeader>
      <ModalBody>
        <input aria-label="Name"/>
        <textarea aria-label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)}/>
      </ModalBody>
    </Modal>
  );
}

describe('Modal', () => {
  it('keeps focus in the active field while the parent re-renders with an inline onClose', async () => {
    const user = userEvent.setup();
    render(<FormModal/>);

    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());

    const notes = screen.getByLabelText('Notes');
    await user.click(notes);
    await user.type(notes, 'abc');
    await nextFrame();

    expect(notes).toHaveValue('abc');
    expect(notes).toHaveFocus();
  });

  it('exposes a JSX header as the dialog accessible name', () => {
    render(
      <Modal isOpen onClose={() => undefined}>
        <ModalHeader>
          <span>Approve <strong>leave</strong></span>
        </ModalHeader>
        <ModalBody>body</ModalBody>
      </Modal>
    );

    expect(screen.getByRole('dialog', {name: 'Approve leave'})).toBeInTheDocument();
  });

  it('keeps the string header as the dialog accessible name', () => {
    render(
      <Modal isOpen onClose={() => undefined}>
        <ModalHeader>Edit employee</ModalHeader>
      </Modal>
    );

    expect(screen.getByRole('dialog', {name: 'Edit employee'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Edit employee'})).toBeInTheDocument();
  });
});
