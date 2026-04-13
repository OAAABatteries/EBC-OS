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
export const registerAppEvents = async (onResume) => {
  if (!isNative()) return;
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive && onResume) onResume();
    });
    // Handle Android back button
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      }
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
