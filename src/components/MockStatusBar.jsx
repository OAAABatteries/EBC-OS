import { useState, useEffect } from "react";

// Device presets define pixel-accurate bezel/notch/home-indicator geometry for
// the iOS safe-area-inset-bottom behavior on real devices.
const DEVICE_PRESETS = {
  "iphone-14-pro": {
    label: "iPhone 14 Pro",
    class: "ios",
    portrait: {
      w: 390, h: 844, radius: 48, bezel: 12,
      statusBar: 54,
      notch: { type: "island", side: "top", w: 120, h: 28, offset: 14 },
      homeIndicator: { side: "bottom", w: 140, h: 5, offset: 8 },
      homeArea: 24,
    },
    landscape: {
      w: 844, h: 390, radius: 48, bezel: 12,
      statusBar: 24,
      // In landscape (rotated counter-clockwise) the island sits on the LEFT edge
      notch: { type: "island", side: "left", w: 28, h: 120, offset: 14 },
      homeIndicator: { side: "right", w: 5, h: 140, offset: 8 },
      // Landscape safe-area is smaller vertically; the indicator sits on the
      // right edge, not the bottom, so bottom reservation is 0 but we still
      // need to protect the right edge — portals don't use right-edge nav
      // in landscape so 0 is safe.
      homeArea: 0,
    },
  },
  "ipad-pro-11": {
    label: "iPad Pro 11\"",
    class: "ios",
    portrait: {
      w: 834, h: 1194, radius: 24, bezel: 14,
      statusBar: 24,
      notch: null,
      homeIndicator: { side: "bottom", w: 140, h: 5, offset: 8 },
      homeArea: 20,
    },
    landscape: {
      w: 1194, h: 834, radius: 24, bezel: 14,
      statusBar: 24,
      notch: null,
      homeIndicator: { side: "bottom", w: 140, h: 5, offset: 8 },
      homeArea: 20,
    },
  },
  "galaxy-tab-s9": {
    label: "Galaxy Tab S9",
    class: "android",
    portrait: {
      w: 800, h: 1280, radius: 20, bezel: 10,
      statusBar: 28,
      notch: null,
      homeIndicator: { side: "bottom", w: 100, h: 4, offset: 10 },
      navBar: 24,
      homeArea: 24,
    },
    landscape: {
      w: 1280, h: 800, radius: 20, bezel: 10,
      statusBar: 28,
      notch: null,
      homeIndicator: { side: "bottom", w: 100, h: 4, offset: 10 },
      navBar: 24,
      homeArea: 24,
    },
  },
};

// Draws a fake iOS/Android status bar pinned to the top of the device screen
// area. Shows live clock + signal/wifi/battery indicators. Intended as visual
// polish for the auditor preview frames — NOT wired to real signal data.
//
// On iPhone portrait (Dynamic Island present), the time/signal/wifi/battery
// are vertically centered on the ISLAND'S MIDLINE, not the status-bar strip's
// midline. This matches real iOS, where the clock sits at the same Y as the
// island center — not shifted above or below it.
function MockStatusBar({ deviceClass, statusBarHeight, orientation, hasTopNotch, notchCfg }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const time = deviceClass === "ios"
    ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?(AM|PM)/i, "")
    : now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  const sidePad = hasTopNotch ? 24 : 20;
  const fontSize = deviceClass === "ios" ? (hasTopNotch ? 15 : 12) : 12;
  const color = "#fff";

  // Y-position for the row of status items. On a top-notch iPhone, align
  // the item midline with the island midline: notchCfg.offset + notchCfg.h/2.
  // Without a top notch, sit in the vertical center of the strip.
  const rowCenterY = hasTopNotch && notchCfg
    ? notchCfg.offset + notchCfg.h / 2
    : statusBarHeight / 2;

  // Inline SVG-ish glyphs rendered with divs/svg for minimal footprint
  const SignalBars = () => (
    <div className="d-inline-flex" style={{ gap: 1.5, alignItems: "flex-end", height: 10 }} aria-hidden>
      <div style={{ width: 3, height: 4, borderRadius: 0.5, background: color }} />
      <div style={{ width: 3, height: 6, borderRadius: 0.5, background: color }} />
      <div style={{ width: 3, height: 8, borderRadius: 0.5, background: color }} />
      <div style={{ width: 3, height: 10, borderRadius: 0.5, background: color }} />
    </div>
  );
  const WifiGlyph = () => (
    <svg width="15" height="11" viewBox="0 0 15 11" aria-hidden>
      <path d="M7.5 10.5a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z" fill={color} />
      <path d="M4.2 7.2a4.6 4.6 0 0 1 6.6 0l-1.3 1.3a2.8 2.8 0 0 0-4 0L4.2 7.2Z" fill={color} />
      <path d="M1.6 4.6a8.4 8.4 0 0 1 11.8 0l-1.3 1.3a6.6 6.6 0 0 0-9.2 0L1.6 4.6Z" fill={color} />
    </svg>
  );
  const Battery = () => (
    <div style={{
      position: "relative",
      width: 24,
      height: 11,
      border: `1px solid ${color}`,
      borderRadius: 3,
      padding: 1,
      boxSizing: "border-box",
    }} aria-hidden>
      <div className="h-full" style={{ width: "82%", background: color, borderRadius: 1 }} />
      <div className="absolute" style={{ right: -3,
        top: "50%",
        transform: "translateY(-50%)",
        width: 2,
        height: 5,
        background: color,
        borderRadius: "0 1px 1px 0" }} />
    </div>
  );

  // Outer container is a positioning reference; the actual row is absolutely
  // positioned with its MIDLINE at rowCenterY. This lets us align precisely
  // to the island midline regardless of item intrinsic heights.
  return (
    <div
      className="mock-status-bar"
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: statusBarHeight,
        color,
        fontSize,
        fontWeight: 600,
        fontFamily: deviceClass === "ios"
          ? "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
          : "'Roboto', system-ui, sans-serif",
        letterSpacing: deviceClass === "ios" ? -0.2 : 0,
        zIndex: 4,
        pointerEvents: "none",
        background: "transparent",
      }}
    >
      {/* Row whose vertical midline is pinned to rowCenterY */}
      <div className="absolute" style={{ top: rowCenterY,
        left: sidePad,
        right: sidePad,
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between" }}>
        <div className="text-left" style={{ minWidth: 40 }}>{time}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <SignalBars />
          <WifiGlyph />
          <Battery />
        </div>
      </div>
    </div>
  );
}

export { DEVICE_PRESETS, MockStatusBar };
