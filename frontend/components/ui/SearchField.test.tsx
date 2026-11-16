import {useState} from 'react';
import {describe, expect, it} from 'vitest';
import {render, screen} from '@/lib/test-utils';
import {SearchField} from './SearchField';

function Harness({initial = ''}: {initial?: string}) {
  const [v, setV] = useState(initial);
  return <SearchField value={v} onChange={setV} aria-label="Find"/>;
}

describe('SearchField', () => {
  it('hides clear button when empty', () => {
    render(<Harness/>);
    expect(screen.queryByRole('button', {name: 'Clear search'})).not.toBeInTheDocument();
  });

  it('shows clear button and clears on click', async () => {
    const {user} = render(<Harness/>);
    await user.type(screen.getByRole('searchbox'), 'abc');
    await user.click(screen.getByRole('button', {name: 'Clear search'}));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });

  it('clears on Escape', async () => {
    const {user} = render(<Harness initial="xyz"/>);
    screen.getByRole('searchbox').focus();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('uses 36px or 40px heights', () => {
    render(<><SearchField value="" onChange={() => {}} fieldSize="sm" aria-label="a"/><SearchField value="" onChange={() => {}} aria-label="b"/></>);
    const [a, b] = screen.getAllByRole('searchbox');
    expect(a).toHaveClass('h-9');
    expect(b).toHaveClass('h-10');
  });
});
