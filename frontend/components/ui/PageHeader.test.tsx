import React from 'react';
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {PageHeader} from './PageHeader';

describe('PageHeader', () => {
  it('renders the title as the page h1', () => {
    render(<PageHeader title="Employees" />);
    expect(screen.getByRole('heading', {level: 1, name: 'Employees'})).toBeInTheDocument();
  });

  it('renders description and actions when provided', () => {
    render(<PageHeader title="Employees" description="All people in your org" actions={<button>Add</button>} />);
    expect(screen.getByText('All people in your org')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Add'})).toBeInTheDocument();
  });

  it('omits breadcrumbs by default and renders them when given', () => {
    const {rerender} = render(<PageHeader title="Employees" />);
    expect(screen.queryByRole('navigation', {name: 'Breadcrumbs'})).not.toBeInTheDocument();
    rerender(<PageHeader title="Employees" breadcrumbs={[{label: 'People', href: '/people'}, {label: 'Employees'}]} />);
    expect(screen.getByRole('navigation', {name: 'Breadcrumbs'})).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
  });
});
