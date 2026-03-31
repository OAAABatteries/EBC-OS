import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldCard } from './FieldCard';

describe('FieldCard', () => {
  it('default variant renders div with className containing "card field-card"', () => {
    const { container } = render(<FieldCard>Content</FieldCard>);
    const div = container.firstChild;
    expect(div.className).toContain('card');
    expect(div.className).toContain('field-card');
  });

  it('variant="glass" renders div with className containing "card-glass field-card"', () => {
    const { container } = render(<FieldCard variant="glass">Content</FieldCard>);
    const div = container.firstChild;
    expect(div.className).toContain('card-glass');
    expect(div.className).toContain('field-card');
  });

  it('renders children inside the card div', () => {
    render(<FieldCard><span data-testid="child">hello</span></FieldCard>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('passes className prop for additional styling merged with card classes', () => {
    const { container } = render(<FieldCard className="my-extra-class">Content</FieldCard>);
    const div = container.firstChild;
    expect(div.className).toContain('card');
    expect(div.className).toContain('field-card');
    expect(div.className).toContain('my-extra-class');
  });

  it('passes arbitrary props (onClick, data-testid) to underlying div', () => {
    const handleClick = () => {};
    const { container } = render(
      <FieldCard onClick={handleClick} data-testid="my-card">Content</FieldCard>
    );
    const div = container.firstChild;
    expect(div).toHaveAttribute('data-testid', 'my-card');
  });
});
