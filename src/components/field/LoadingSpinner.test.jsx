import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSpinner, Skeleton } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders an svg element (Lucide Loader2 renders as svg)', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('has aria-label "Loading" for screen readers', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('aria-label')).toBe('Loading');
  });

  it('default size renders with width and height of 20', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('width')).toBe('20');
    expect(svg.getAttribute('height')).toBe('20');
  });

  it('accepts custom size prop', () => {
    const { container } = render(<LoadingSpinner size={32} />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('height')).toBe('32');
  });

  it('has animate-spin class for rotation animation', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg.className.baseVal).toContain('animate-spin');
  });

  it('uses t() for aria-label when provided', () => {
    const t = (key) => `translated-${key}`;
    const { container } = render(<LoadingSpinner t={t} />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('aria-label')).toBe('translated-Loading');
  });
});

describe('Skeleton', () => {
  it('renders a div with className containing "skeleton-shimmer"', () => {
    const { container } = render(<Skeleton />);
    const div = container.querySelector('div');
    expect(div).toBeTruthy();
    expect(div.className).toContain('skeleton-shimmer');
  });

  it('accepts width prop and applies it as inline style', () => {
    const { container } = render(<Skeleton width="200px" />);
    const div = container.querySelector('div');
    expect(div.style.width).toBe('200px');
  });

  it('accepts height prop and applies it as inline style', () => {
    const { container } = render(<Skeleton height="40px" />);
    const div = container.querySelector('div');
    expect(div.style.height).toBe('40px');
  });

  it('accepts className prop for additional styling', () => {
    const { container } = render(<Skeleton className="my-skeleton" />);
    const div = container.querySelector('div');
    expect(div.className).toContain('skeleton-shimmer');
    expect(div.className).toContain('my-skeleton');
  });

  it('has aria-hidden="true" for screen reader exclusion', () => {
    const { container } = render(<Skeleton />);
    const div = container.querySelector('div');
    expect(div.getAttribute('aria-hidden')).toBe('true');
  });
});
