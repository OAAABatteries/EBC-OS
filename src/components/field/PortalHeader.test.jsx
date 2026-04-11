import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortalHeader } from './PortalHeader';

describe('PortalHeader', () => {
  it('renders a header element with className containing "header"', () => {
    const { container } = render(<PortalHeader />);
    const header = container.querySelector('header');
    expect(header).toBeTruthy();
    expect(header.className).toContain('header');
  });

  it('renders an eagle logo image (wordmark)', () => {
    const { container } = render(<PortalHeader />);
    const img = container.querySelector('header img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/eagle-transparent.png');
    expect(img.getAttribute('alt')).toBe('Eagles Brothers Constructors');
  });

  it('renders the EBC wordmark text in the header', () => {
    const { container } = render(<PortalHeader />);
    // Wordmark stacks EAGLES / BROTHERS / CONSTRUCTORS with <br>s.
    expect(container.textContent).toContain('EAGLES');
    expect(container.textContent).toContain('BROTHERS');
    expect(container.textContent).toContain('CONSTRUCTORS');
  });

  it('variant="foreman" renders title prop in center slot', () => {
    render(<PortalHeader variant="foreman" title="Foreman Dashboard" />);
    expect(screen.getByText('Foreman Dashboard')).toBeTruthy();
  });

  it('variant="foreman" renders settingsAction on right', () => {
    const settingsEl = <button data-testid="settings-btn">Settings</button>;
    render(<PortalHeader variant="foreman" settingsAction={settingsEl} />);
    expect(screen.getByTestId('settings-btn')).toBeTruthy();
  });

  it('variant="employee" renders userName', () => {
    render(<PortalHeader variant="employee" userName="Juan Lopez" />);
    expect(screen.getByText('Juan Lopez')).toBeTruthy();
  });

  it('variant="employee" renders languageToggle', () => {
    const langToggle = <button data-testid="lang-toggle">ES</button>;
    render(<PortalHeader variant="employee" languageToggle={langToggle} />);
    expect(screen.getByTestId('lang-toggle')).toBeTruthy();
  });

  it('variant="foreman" also renders languageToggle', () => {
    const langToggle = <button data-testid="lang-toggle">ES</button>;
    render(<PortalHeader variant="foreman" languageToggle={langToggle} />);
    expect(screen.getByTestId('lang-toggle')).toBeTruthy();
  });

  it('variant="driver" renders userName', () => {
    render(<PortalHeader variant="driver" userName="Carlos M." />);
    expect(screen.getByText('Carlos M.')).toBeTruthy();
  });

  it('does NOT render a logout button (logout lives in settings)', () => {
    render(
      <PortalHeader variant="foreman" userName="Juan" logoutAction={<button data-testid="logout-btn">Logout</button>} />
    );
    expect(screen.queryByTestId('logout-btn')).toBeNull();
  });

  it('with projectSelector renders a sticky sub-strip div below the header', () => {
    const selector = <select data-testid="project-sel"><option>Job A</option></select>;
    const { container } = render(<PortalHeader projectSelector={selector} />);
    expect(screen.getByTestId('project-sel')).toBeTruthy();
    // Fragment renders: header + sub-strip div — container has 2 children
    expect(container.childNodes.length).toBe(2);
  });

  it('without projectSelector does NOT render the sub-strip', () => {
    const { container } = render(<PortalHeader />);
    // Fragment renders only the header — container has 1 child
    expect(container.childNodes.length).toBe(1);
  });

  it('accepts additional className prop on header element', () => {
    const { container } = render(<PortalHeader className="custom-class" />);
    const header = container.querySelector('header');
    expect(header.className).toContain('custom-class');
  });
});
