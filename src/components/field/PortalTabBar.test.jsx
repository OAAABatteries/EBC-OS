import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Home, Users, FileText, Truck, Settings, Bell } from 'lucide-react';
import { PortalTabBar } from './PortalTabBar';

// Sample tab data helpers
const makeTabs = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `tab-${i}`,
    label: `Tab ${i}`,
    icon: Home,
  }));

const PRIMARY_TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'crew', label: 'Crew', icon: Users },
  { id: 'docs', label: 'Docs', icon: FileText },
  { id: 'delivery', label: 'Delivery', icon: Truck },
];

const OVERFLOW_TABS = [
  ...PRIMARY_TABS,
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'alerts', label: 'Alerts', icon: Bell },
];

describe('PortalTabBar', () => {
  it('renders a nav element with className "field-tab-bar"', () => {
    const { container } = render(
      <PortalTabBar tabs={PRIMARY_TABS} activeTab="home" onTabChange={() => {}} />
    );
    const nav = container.querySelector('nav');
    expect(nav).toBeTruthy();
    expect(nav.className).toContain('field-tab-bar');
  });

  it('renders nav with role="tablist"', () => {
    const { container } = render(
      <PortalTabBar tabs={PRIMARY_TABS} activeTab="home" onTabChange={() => {}} />
    );
    const nav = container.querySelector('nav');
    expect(nav.getAttribute('role')).toBe('tablist');
  });

  it('renders up to 4 primary tabs as buttons with className "field-tab-item"', () => {
    const { container } = render(
      <PortalTabBar tabs={PRIMARY_TABS} activeTab="home" onTabChange={() => {}} />
    );
    const items = container.querySelectorAll('.field-tab-item');
    expect(items.length).toBe(4);
  });

  it('with 5+ tabs renders first 4 as primary + "More" tab as 5th', () => {
    const { container } = render(
      <PortalTabBar tabs={OVERFLOW_TABS} activeTab="home" onTabChange={() => {}} />
    );
    const items = container.querySelectorAll('.field-tab-item');
    expect(items.length).toBe(5);
    const lastItem = items[4];
    expect(lastItem.textContent).toContain('More');
  });

  it('active tab button has className containing "active"', () => {
    const { container } = render(
      <PortalTabBar tabs={PRIMARY_TABS} activeTab="crew" onTabChange={() => {}} />
    );
    const crewBtn = Array.from(container.querySelectorAll('.field-tab-item')).find(
      (btn) => btn.textContent.includes('Crew')
    );
    expect(crewBtn.className).toContain('active');
  });

  it('each tab item renders an svg icon AND a text label span', () => {
    const { container } = render(
      <PortalTabBar tabs={PRIMARY_TABS} activeTab="home" onTabChange={() => {}} />
    );
    const items = container.querySelectorAll('.field-tab-item');
    items.forEach((item) => {
      const svg = item.querySelector('svg');
      const span = item.querySelector('span');
      expect(svg).toBeTruthy();
      expect(span).toBeTruthy();
    });
  });

  it('tab with badge=true renders a div with className "field-tab-badge"', () => {
    const tabsWithBadge = [
      { id: 'home', label: 'Home', icon: Home, badge: true },
      { id: 'crew', label: 'Crew', icon: Users },
    ];
    const { container } = render(
      <PortalTabBar tabs={tabsWithBadge} activeTab="home" onTabChange={() => {}} />
    );
    const badge = container.querySelector('.field-tab-badge');
    expect(badge).toBeTruthy();
  });

  it('clicking "More" tab opens the bottom sheet (div with className "field-tab-sheet open")', () => {
    const { container } = render(
      <PortalTabBar tabs={OVERFLOW_TABS} activeTab="home" onTabChange={() => {}} />
    );
    const items = container.querySelectorAll('.field-tab-item');
    const moreBtn = items[4];
    fireEvent.click(moreBtn);
    const sheet = container.querySelector('.field-tab-sheet.open');
    expect(sheet).toBeTruthy();
  });

  it('clicking "More" tab again closes the bottom sheet', () => {
    const { container } = render(
      <PortalTabBar tabs={OVERFLOW_TABS} activeTab="home" onTabChange={() => {}} />
    );
    const items = container.querySelectorAll('.field-tab-item');
    const moreBtn = items[4];
    // Open
    fireEvent.click(moreBtn);
    expect(container.querySelector('.field-tab-sheet.open')).toBeTruthy();
    // Close
    fireEvent.click(moreBtn);
    expect(container.querySelector('.field-tab-sheet.open')).toBeNull();
  });

  it('overflow tabs appear inside the bottom sheet as items with className "field-tab-sheet-item"', () => {
    const { container } = render(
      <PortalTabBar tabs={OVERFLOW_TABS} activeTab="home" onTabChange={() => {}} />
    );
    const items = container.querySelectorAll('.field-tab-item');
    fireEvent.click(items[4]);
    const sheetItems = container.querySelectorAll('.field-tab-sheet-item');
    expect(sheetItems.length).toBe(2); // 6 tabs - 4 primary = 2 overflow
  });

  it('clicking the backdrop overlay closes the sheet', () => {
    const { container } = render(
      <PortalTabBar tabs={OVERFLOW_TABS} activeTab="home" onTabChange={() => {}} />
    );
    const items = container.querySelectorAll('.field-tab-item');
    fireEvent.click(items[4]);
    expect(container.querySelector('.field-tab-sheet.open')).toBeTruthy();
    const overlay = container.querySelector('.field-tab-sheet-overlay');
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay);
    expect(container.querySelector('.field-tab-sheet.open')).toBeNull();
  });

  it('active overflow tab in sheet has className "field-tab-sheet-item active"', () => {
    const { container } = render(
      <PortalTabBar tabs={OVERFLOW_TABS} activeTab="settings" onTabChange={() => {}} />
    );
    const items = container.querySelectorAll('.field-tab-item');
    fireEvent.click(items[4]);
    const settingsItem = Array.from(container.querySelectorAll('.field-tab-sheet-item')).find(
      (el) => el.textContent.includes('Settings')
    );
    expect(settingsItem.className).toContain('active');
  });

  it('clicking a tab calls onTabChange with the tab id', () => {
    const handleChange = vi.fn();
    render(
      <PortalTabBar tabs={PRIMARY_TABS} activeTab="home" onTabChange={handleChange} />
    );
    fireEvent.click(screen.getByText('Crew'));
    expect(handleChange).toHaveBeenCalledWith('crew');
  });

  it('More tab has aria-expanded=false when sheet is closed', () => {
    const { container } = render(
      <PortalTabBar tabs={OVERFLOW_TABS} activeTab="home" onTabChange={() => {}} />
    );
    const items = container.querySelectorAll('.field-tab-item');
    const moreBtn = items[4];
    expect(moreBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('More tab has aria-expanded=true when sheet is open', () => {
    const { container } = render(
      <PortalTabBar tabs={OVERFLOW_TABS} activeTab="home" onTabChange={() => {}} />
    );
    const items = container.querySelectorAll('.field-tab-item');
    fireEvent.click(items[4]);
    expect(items[4].getAttribute('aria-expanded')).toBe('true');
  });

  it('uses t() for tab label when provided', () => {
    const t = (key) => `TRANSLATED:${key}`;
    render(
      <PortalTabBar tabs={PRIMARY_TABS} activeTab="home" onTabChange={() => {}} t={t} />
    );
    expect(screen.getByText('TRANSLATED:Home')).toBeTruthy();
  });
});
