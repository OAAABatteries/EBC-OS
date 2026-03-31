import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';
import { Package } from 'lucide-react';

describe('EmptyState', () => {
  it('renders a div with className "empty-state"', () => {
    const { container } = render(<EmptyState />);
    const div = container.querySelector('.empty-state');
    expect(div).toBeTruthy();
  });

  it('renders the provided icon as a Lucide component at 48px size with className "empty-state-icon"', () => {
    const { container } = render(<EmptyState icon={Package} />);
    const iconEl = container.querySelector('.empty-state-icon');
    expect(iconEl).toBeTruthy();
    expect(iconEl.getAttribute('width')).toBe('48');
    expect(iconEl.getAttribute('height')).toBe('48');
  });

  it('renders heading text in a div with className "empty-state-heading"', () => {
    const { container } = render(<EmptyState heading="No items found" />);
    const heading = container.querySelector('.empty-state-heading');
    expect(heading).toBeTruthy();
    expect(heading.textContent).toBe('No items found');
  });

  it('renders body/message text in a div with className "empty-state-body"', () => {
    const { container } = render(<EmptyState message="Try adding something." />);
    const body = container.querySelector('.empty-state-body');
    expect(body).toBeTruthy();
    expect(body.textContent).toBe('Try adding something.');
  });

  it('renders action prop (ReactNode) when provided', () => {
    const action = <button>Add item</button>;
    render(<EmptyState action={action} />);
    expect(screen.getByText('Add item')).toBeTruthy();
  });

  it('does NOT render action area when action prop is not provided', () => {
    const { container } = render(<EmptyState />);
    const actionDiv = container.querySelector('.empty-state-action');
    expect(actionDiv).toBeNull();
  });

  it('with no heading uses t("Nothing here yet") as default heading', () => {
    const t = (key) => key;
    const { container } = render(<EmptyState t={t} />);
    const heading = container.querySelector('.empty-state-heading');
    expect(heading.textContent).toBe('Nothing here yet');
  });

  it('translates message through t() when t prop is provided', () => {
    const t = (key) => `[translated] ${key}`;
    const { container } = render(<EmptyState t={t} />);
    const body = container.querySelector('.empty-state-body');
    expect(body.textContent).toContain('[translated]');
  });
});
