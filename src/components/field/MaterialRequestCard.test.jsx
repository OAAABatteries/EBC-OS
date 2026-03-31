import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MaterialRequestCard } from './MaterialRequestCard';

describe('MaterialRequestCard', () => {
  const t = (key) => key;

  const baseProps = {
    title: 'Lumber Request',
    status: 'pending',
    materialName: '2x4 Studs',
    quantity: 200,
    unit: 'pcs',
    submittedBy: 'Antonio Garcia',
    timestamp: '10:32 AM',
    t,
  };

  it('renders a FieldCard wrapper (card field-card class)', () => {
    const { container } = render(<MaterialRequestCard {...baseProps} />);
    const card = container.querySelector('.card.field-card');
    expect(card).toBeTruthy();
  });

  it('header row contains title text', () => {
    render(<MaterialRequestCard {...baseProps} />);
    expect(screen.getByText('Lumber Request')).toBeTruthy();
  });

  it('header title has className mr-card-title', () => {
    const { container } = render(<MaterialRequestCard {...baseProps} />);
    const title = container.querySelector('.mr-card-title');
    expect(title).toBeTruthy();
    expect(title.textContent).toBe('Lumber Request');
  });

  it('header row contains StatusBadge (badge element)', () => {
    const { container } = render(<MaterialRequestCard {...baseProps} />);
    const badge = container.querySelector('.badge');
    expect(badge).toBeTruthy();
  });

  it('header row has className mr-card-header', () => {
    const { container } = render(<MaterialRequestCard {...baseProps} />);
    const header = container.querySelector('.mr-card-header');
    expect(header).toBeTruthy();
  });

  it('renders material name in body area', () => {
    render(<MaterialRequestCard {...baseProps} />);
    expect(screen.getByText('2x4 Studs')).toBeTruthy();
  });

  it('renders quantity with className mr-card-qty', () => {
    const { container } = render(<MaterialRequestCard {...baseProps} />);
    const qty = container.querySelector('.mr-card-qty');
    expect(qty).toBeTruthy();
    expect(qty.textContent).toBe('200');
  });

  it('renders unit label with className mr-card-unit', () => {
    const { container } = render(<MaterialRequestCard {...baseProps} />);
    const unit = container.querySelector('.mr-card-unit');
    expect(unit).toBeTruthy();
    expect(unit.textContent).toBe('pcs');
  });

  it('renders submitted-by text with className mr-card-meta', () => {
    const { container } = render(<MaterialRequestCard {...baseProps} />);
    const meta = container.querySelector('.mr-card-meta');
    expect(meta).toBeTruthy();
    expect(meta.textContent).toContain('Antonio Garcia');
  });

  it('renders timestamp with className mr-card-meta-muted', () => {
    const { container } = render(<MaterialRequestCard {...baseProps} />);
    const muted = container.querySelectorAll('.mr-card-meta-muted');
    // separator and timestamp both use mr-card-meta-muted
    const hasTimestamp = Array.from(muted).some(el => el.textContent.includes('10:32 AM'));
    expect(hasTimestamp).toBe(true);
  });

  it('renders action buttons when actions prop provided', () => {
    const actions = [
      { label: 'Approve', variant: 'primary', onClick: vi.fn() },
      { label: 'Deny', variant: 'danger', onClick: vi.fn() },
    ];
    render(<MaterialRequestCard {...baseProps} actions={actions} />);
    expect(screen.getByText('Approve')).toBeTruthy();
    expect(screen.getByText('Deny')).toBeTruthy();
  });

  it('renders action area with className mr-card-actions when actions provided', () => {
    const actions = [{ label: 'Approve', variant: 'primary', onClick: vi.fn() }];
    const { container } = render(<MaterialRequestCard {...baseProps} actions={actions} />);
    const actionsDiv = container.querySelector('.mr-card-actions');
    expect(actionsDiv).toBeTruthy();
  });

  it('does NOT render action area when actions prop is not provided', () => {
    const { container } = render(<MaterialRequestCard {...baseProps} />);
    const actionsDiv = container.querySelector('.mr-card-actions');
    expect(actionsDiv).toBeNull();
  });

  it('does NOT render action area when actions prop is empty array', () => {
    const { container } = render(<MaterialRequestCard {...baseProps} actions={[]} />);
    const actionsDiv = container.querySelector('.mr-card-actions');
    expect(actionsDiv).toBeNull();
  });

  it('calls t() when rendering status badge', () => {
    const mockT = vi.fn((key) => key);
    render(<MaterialRequestCard {...baseProps} t={mockT} />);
    expect(mockT).toHaveBeenCalledWith('pending');
  });

  it('action button onClick fires when clicked', () => {
    const handleApprove = vi.fn();
    const actions = [{ label: 'Approve', variant: 'primary', onClick: handleApprove }];
    render(<MaterialRequestCard {...baseProps} actions={actions} />);
    fireEvent.click(screen.getByText('Approve'));
    expect(handleApprove).toHaveBeenCalledTimes(1);
  });

  it('accepts additional className prop on wrapper', () => {
    const { container } = render(<MaterialRequestCard {...baseProps} className="extra-class" />);
    const card = container.querySelector('.card');
    expect(card.className).toContain('extra-class');
  });
});
