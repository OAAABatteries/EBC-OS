// PortalTabBar — COMP-05
// Bottom navigation bar with icon+label tabs and More overflow bottom sheet.
// CSS classes from src/styles.js FIELD COMPONENTS section:
//   .field-tab-bar, .field-tab-item, .field-tab-badge
//   .field-tab-sheet-overlay, .field-tab-sheet, .field-tab-sheet-item

import { useState, useSyncExternalStore } from 'react';
import { MoreHorizontal } from 'lucide-react';

const tabletMQ = typeof window !== 'undefined'
  ? window.matchMedia('(min-width:768px)')
  : { matches: false, addEventListener() {}, removeEventListener() {} };
const subscribeMQ = (cb) => { tabletMQ.addEventListener('change', cb); return () => tabletMQ.removeEventListener('change', cb); };
const getSnapshotMQ = () => tabletMQ.matches;

export function PortalTabBar({
  tabs,
  activeTab,
  onTabChange,
  maxPrimary = 4,
  maxPrimaryTablet = 6,
  t,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const isTablet = useSyncExternalStore(subscribeMQ, getSnapshotMQ, () => false);
  const effectiveMax = isTablet ? Math.max(maxPrimary, maxPrimaryTablet) : maxPrimary;

  const primaryTabs = tabs.slice(0, effectiveMax);
  const overflowTabs = tabs.slice(effectiveMax);
  const hasOverflow = overflowTabs.length > 0;
  const isActiveInOverflow = overflowTabs.some((tab) => tab.id === activeTab);

  return (
    <>
      <nav className="field-tab-bar" role="tablist">
        {primaryTabs.map((tab) => (
          <button
            key={tab.id}
            className={`field-tab-item focus-visible ${activeTab === tab.id ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => {
              onTabChange(tab.id);
              setSheetOpen(false);
            }}
          >
            <tab.icon size={20} aria-hidden="true" />
            <span>{t ? t(tab.label) : tab.label}</span>
            {tab.badge && <div className="field-tab-badge" />}
          </button>
        ))}

        {hasOverflow && (
          <button
            className={`field-tab-item focus-visible ${sheetOpen || isActiveInOverflow ? 'active' : ''}`}
            role="tab"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen((prev) => !prev)}
          >
            <MoreHorizontal size={20} aria-hidden="true" />
            <span>{t ? t('More') : 'More'}</span>
          </button>
        )}
      </nav>

      {/* Bottom sheet overlay */}
      {hasOverflow && sheetOpen && (
        <div
          className="field-tab-sheet-overlay"
          onClick={() => setSheetOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Bottom sheet panel */}
      {hasOverflow && (
        <div className={`field-tab-sheet ${sheetOpen ? 'open' : ''}`}>
          {overflowTabs.map((tab) => (
            <button
              key={tab.id}
              className={`field-tab-sheet-item focus-visible ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                onTabChange(tab.id);
                setSheetOpen(false);
              }}
            >
              <tab.icon size={20} aria-hidden="true" />
              <span>{t ? t(tab.label) : tab.label}</span>
              {tab.badge && <div className="field-tab-badge" />}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
