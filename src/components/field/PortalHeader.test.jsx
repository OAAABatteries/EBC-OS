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

  it('renders logo text "EBC-OS" with className "logo"', () => {
    const { container } = render(<PortalHeader />);
    const logo = container.querySelector('.logo');
    expect(logo).toBeTruthy();
    expect(logo.textContent).toBe('EBC-OS');
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

  it('variant="employee" renders logoutAction', () => {
    const logoutEl = <button data-testid="logout-btn">Logout</button>;
    render(<PortalHeader variant="employee" logoutAction={logoutEl} />);
    expect(screen.getByTestId('logout-btn')).toBeTruthy();
  });

  it('variant="driver" renders userName and logoutAction', () => {
    const logoutEl = <button data-testid="driver-logout">Logout</button>;
    render(<PortalHeader variant="driver" userName="Carlos M." logoutAction={logoutEl} />);
    expect(screen.getByText('Carlos M.')).toBeTruthy();
    expect(screen.getByTestId('driver-logout')).toBeTruthy();
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

  it('uses t() for logo text if t prop provided', () => {
    const t = (key) => `TRANSLATED:${key}`;
    render(<PortalHeader t={t} />);
    expect(screen.getByText('TRANSLATED:EBC-OS')).toBeTruthy();
  });

  it('variant="foreman" does NOT render languageToggle', () => {
    const langToggle = <button data-testid="lang-toggle">ES</button>;
    render(<PortalHeader variant="foreman" languageToggle={langToggle} />);
    expect(screen.queryByTestId('lang-toggle')).toBeNull();
  });

  it('accepts additional className prop on header element', () => {
    const { container } = render(<PortalHeader className="custom-class" />);
    const header = container.querySelector('header');
    expect(header.className).toContain('custom-class');
  });
});
