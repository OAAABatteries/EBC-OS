import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FieldButton } from './FieldButton';

describe('FieldButton', () => {
  it('default variant renders with btn btn-primary touch-target focus-visible classes', () => {
    const { container } = render(<FieldButton>Save</FieldButton>);
    const btn = container.querySelector('button');
    expect(btn.className).toContain('btn');
    expect(btn.className).toContain('btn-primary');
    expect(btn.className).toContain('touch-target');
    expect(btn.className).toContain('focus-visible');
  });

  it('variant="ghost" renders with btn-ghost class', () => {
    const { container } = render(<FieldButton variant="ghost">Cancel</FieldButton>);
    const btn = container.querySelector('button');
    expect(btn.className).toContain('btn');
    expect(btn.className).toContain('btn-ghost');
  });

  it('variant="danger" renders with btn-danger class', () => {
    const { container } = render(<FieldButton variant="danger">Delete</FieldButton>);
    const btn = container.querySelector('button');
    expect(btn.className).toContain('btn');
    expect(btn.className).toContain('btn-danger');
  });

  it('renders children text when not loading', () => {
    render(<FieldButton>Submit Form</FieldButton>);
    expect(screen.getByText('Submit Form')).toBeTruthy();
  });

  it('with loading=true renders Loader2 svg instead of children text', () => {
    const { container } = render(<FieldButton loading={true}>Submit</FieldButton>);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('with loading=true has aria-label "Loading, please wait"', () => {
    const { container } = render(<FieldButton loading={true}>Submit</FieldButton>);
    const btn = container.querySelector('button');
    expect(btn.getAttribute('aria-label')).toBe('Loading, please wait');
  });

  it('with loading=true the button element is disabled', () => {
    const { container } = render(<FieldButton loading={true}>Submit</FieldButton>);
    const btn = container.querySelector('button');
    expect(btn.disabled).toBe(true);
  });

  it('with disabled=true the button element has disabled attribute', () => {
    const { container } = render(<FieldButton disabled={true}>Submit</FieldButton>);
    const btn = container.querySelector('button');
    expect(btn.disabled).toBe(true);
  });

  it('with disabled=true has reduced opacity in style', () => {
    const { container } = render(<FieldButton disabled={true}>Submit</FieldButton>);
    const btn = container.querySelector('button');
    expect(btn.style.opacity).toBeTruthy();
  });

  it('passes onClick handler to the underlying button element', () => {
    const handleClick = vi.fn();
    render(<FieldButton onClick={handleClick}>Click Me</FieldButton>);
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not apply btn-sm class (conflicts with touch-target)', () => {
    const { container } = render(<FieldButton>Save</FieldButton>);
    const btn = container.querySelector('button');
    expect(btn.className).not.toContain('btn-sm');
  });

  it('accepts additional className prop', () => {
    const { container } = render(<FieldButton className="w-full">Save</FieldButton>);
    const btn = container.querySelector('button');
    expect(btn.className).toContain('w-full');
  });

  it('uses t() for loading aria-label when provided', () => {
    const t = (key) => `translated-${key}`;
    const { container } = render(<FieldButton loading={true} t={t}>Save</FieldButton>);
    const btn = container.querySelector('button');
    expect(btn.getAttribute('aria-label')).toBe('translated-Loading, please wait');
  });
});
