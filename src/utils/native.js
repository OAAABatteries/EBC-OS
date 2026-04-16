// EBC-OS — Native bridge utilities (Capacitor)
// Safe imports — these only work in the native shell, degrade gracefully in browser

export const isNative = () => {
  try {
    return window.Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
};

export const getPlatform = () => {
  try {
    return window.Capacitor?.getPlatform?.() ?? "web";
  } catch {
    return "web";
  }
};

// Haptic feedback for button taps
export const hapticTap = async () => {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
};

// Status bar configuration
export const configureStatusBar = async () => {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#06080c" });
  } catch {}
};

// Hide native splash screen
export const hideSplash = async () => {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {}
};

// Register app lifecycle events
let _backPressCount = 0;
let _backPressTimer = null;
export const registerAppEvents = async (onResume) => {
  if (!isNative()) return;
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive && onResume) onResume();
    });
    // Smart Android back button:
    // 1. If a modal/overlay is open → close it
    // 2. If a hash route (gc-portal, privacy, takeoff) → return to main app
    // 3. If history.length > 1 → browser history back
    // 4. Otherwise → "Press back again to exit" (2s window), then exit
    App.addListener("backButton", async () => {
      // Priority 1: Close any open modal overlay
      const modal = document.querySelector('.modal-overlay');
      if (modal) {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) { closeBtn.click(); return; }
        modal.click(); // clicking overlay usually closes it
        return;
      }
      // Priority 2: Exit hash routes back to main app
      if (window.location.hash && window.location.hash !== '#/') {
        window.location.hash = '';
        return;
      }
      // Priority 3: Browser history
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      // Priority 4: Exit app with confirmation
      _backPressCount++;
      if (_backPressCount >= 2) {
        try { App.exitApp(); } catch {}
        return;
      }
      // Show toast (use EBC's toast system via custom event)
      window.dispatchEvent(new CustomEvent('ebc-toast', { detail: { type: 'info', msg: 'Press back again to exit' } }));
      clearTimeout(_backPressTimer);
      _backPressTimer = setTimeout(() => { _backPressCount = 0; }, 2000);
    });
  } catch {}
};

// Configure keyboard behavior (scroll inputs into view)
export const configureKeyboard = async () => {
  if (!isNative()) return;
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    Keyboard.addListener("keyboardWillShow", (info) => {
      document.body.style.setProperty("--keyboard-height", `${info.keyboardHeight}px`);
      document.body.classList.add("keyboard-open");
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.body.style.setProperty("--keyboard-height", "0px");
      document.body.classList.remove("keyboard-open");
    });
  } catch {}
};

// Haptic feedback variants
export const hapticSuccess = async () => {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {}
};

export const hapticWarning = async () => {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {}
};

// Initialize all native features
export const initNative = async () => {
  if (!isNative()) return;
  await configureStatusBar();
  await configureKeyboard();
  await hideSplash();
  registerAppEvents();
  console.log(`[EBC-OS] Native platform: ${getPlatform()}`);
};
