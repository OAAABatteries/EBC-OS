import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AsyncState } from './AsyncState';

describe('AsyncState', () => {
  it('with loading=true renders LoadingSpinner (finds svg with class animate-spin)', () => {
    const { container } = render(<AsyncState loading={true}><p>Content</p></AsyncState>);
    const spinner = container.querySelector('svg.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('with loading=true and skeleton prop renders the skeleton ReactNode instead of LoadingSpinner', () => {
    const skeleton = <div data-testid="custom-skeleton">Loading skeleton...</div>;
    render(<AsyncState loading={true} skeleton={skeleton}><p>Content</p></AsyncState>);
    expect(screen.getByTestId('custom-skeleton')).toBeTruthy();
  });

  it('with loading=true ignores empty and error props (loading takes priority)', () => {
    const { container } = render(
      <AsyncState loading={true} empty={true} error="Network error">
        <p>Content</p>
      </AsyncState>
    );
    // Should show spinner, not error or empty state
    const spinner = container.querySelector('svg.animate-spin');
    expect(spinner).toBeTruthy();
    expect(screen.queryByText('Something went wrong.')).toBeNull();
    expect(container.querySelector('.empty-state')).toBeNull();
  });

  it('with error="Network error" renders error display with heading "Something went wrong."', () => {
    render(<AsyncState error="Network error"><p>Content</p></AsyncState>);
    expect(screen.getByText('Something went wrong.')).toBeTruthy();
  });

  it('with error set renders the error message string', () => {
    render(<AsyncState error="Network error"><p>Content</p></AsyncState>);
    expect(screen.getByText('Network error')).toBeTruthy();
  });

  it('with error set and empty=true renders error (error takes priority over empty)', () => {
    const { container } = render(
      <AsyncState error="Server error" empty={true}><p>Content</p></AsyncState>
    );
    expect(screen.getByText('Something went wrong.')).toBeTruthy();
    expect(container.querySelector('.empty-state')).toBeNull();
  });

  it('with empty=true renders EmptyState with emptyMessage', () => {
    const { container } = render(
      <AsyncState empty={true} emptyMessage="No items yet"><p>Content</p></AsyncState>
    );
    const emptyState = container.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    expect(screen.getByText('No items yet')).toBeTruthy();
  });

  it('with empty=true and emptyAction renders EmptyState with the action prop', () => {
    const action = <button>Add item</button>;
    render(
      <AsyncState empty={true} emptyAction={action}><p>Content</p></AsyncState>
    );
    expect(screen.getByText('Add item')).toBeTruthy();
  });

  it('with loading=false, empty=false, error=null renders children', () => {
    render(
      <AsyncState loading={false} empty={false} error={null}>
        <p>Actual content here</p>
      </AsyncState>
    );
    expect(screen.getByText('Actual content here')).toBeTruthy();
  });

  it('error display uses t() for "Something went wrong." heading', () => {
    const t = (key) => `[t] ${key}`;
    render(<AsyncState error="Some error" t={t}><p>Content</p></AsyncState>);
    expect(screen.getByText('[t] Something went wrong.')).toBeTruthy();
  });
});
