import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  const t = (key) => key;

  it('renders "approved" status with badge-green class', () => {
    const { container } = render(<StatusBadge status="approved" t={t} />);
    const span = container.querySelector('span');
    expect(span).toBeTruthy();
    expect(span.className).toContain('badge');
    expect(span.className).toContain('badge-green');
  });

  it('renders "pending" status with badge-amber class', () => {
    const { container } = render(<StatusBadge status="pending" t={t} />);
    const span = container.querySelector('span');
    expect(span.className).toContain('badge');
    expect(span.className).toContain('badge-amber');
  });

  it('renders "denied" status with badge-red class', () => {
    const { container } = render(<StatusBadge status="denied" t={t} />);
    const span = container.querySelector('span');
    expect(span.className).toContain('badge');
    expect(span.className).toContain('badge-red');
  });

  it('renders "in-transit" status with badge-blue class', () => {
    const { container } = render(<StatusBadge status="in-transit" t={t} />);
    const span = container.querySelector('span');
    expect(span.className).toContain('badge');
    expect(span.className).toContain('badge-blue');
  });

  it('renders "completed" status with badge-muted class', () => {
    const { container } = render(<StatusBadge status="completed" t={t} />);
    const span = container.querySelector('span');
    expect(span.className).toContain('badge');
    expect(span.className).toContain('badge-muted');
  });

  it('renders "project" status with badge-muted class', () => {
    const { container } = render(<StatusBadge status="project" t={t} />);
    const span = container.querySelector('span');
    expect(span.className).toContain('badge');
    expect(span.className).toContain('badge-muted');
  });

  it('falls back to badge-muted for unknown status', () => {
    const { container } = render(<StatusBadge status="unknown-status" t={t} />);
    const span = container.querySelector('span');
    expect(span.className).toContain('badge');
    expect(span.className).toContain('badge-muted');
  });

  it('calls t() with the status string for display text', () => {
    const mockT = vi.fn((key) => key);
    render(<StatusBadge status="approved" t={mockT} />);
    expect(mockT).toHaveBeenCalledWith('approved');
  });

  it('renders the translated text as content', () => {
    const t = (key) => `translated-${key}`;
    render(<StatusBadge status="pending" t={t} />);
    expect(screen.getByText('translated-pending')).toBeTruthy();
  });

  it('accepts additional className and applies it', () => {
    const { container } = render(<StatusBadge status="approved" t={t} className="extra-class" />);
    const span = container.querySelector('span');
    expect(span.className).toContain('extra-class');
  });
});
