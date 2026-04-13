// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Session Timeout Hook
//  Tracks user activity and triggers logout after inactivity.
//  Shows a warning modal 60s before timeout.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";

const TIMEOUT_MS = 30 * 60 * 1000;  // 30 minutes
const WARNING_MS = 60 * 1000;       // warn 60s before

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"];

export function useSessionTimeout(onLogout) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSec, setRemainingSec] = useState(60);
  const timerRef = useRef(null);
  const warningRef = useRef(null);
  const countdownRef = useRef(null);
  const lastActivity = useRef(Date.now());

  const resetTimers = useCallback(() => {
    lastActivity.current = Date.now();
    setShowWarning(false);
    clearTimeout(timerRef.current);
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSec(Math.round(WARNING_MS / 1000));
      let sec = Math.round(WARNING_MS / 1000);
      countdownRef.current = setInterval(() => {
        sec--;
        setRemainingSec(sec);
        if (sec <= 0) clearInterval(countdownRef.current);
      }, 1000);
    }, TIMEOUT_MS - WARNING_MS);

    timerRef.current = setTimeout(() => {
      clearInterval(countdownRef.current);
      setShowWarning(false);
      if (onLogout) onLogout();
    }, TIMEOUT_MS);
  }, [onLogout]);

  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    const handler = () => {
      // Only reset if we're not in warning mode
      if (!showWarning) {
        lastActivity.current = Date.now();
        resetTimers();
      }
    };

    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, handler, { passive: true }));
    resetTimers();

    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, handler));
      clearTimeout(timerRef.current);
      clearTimeout(warningRef.current);
      clearInterval(countdownRef.current);
    };
  }, [resetTimers, showWarning]);

  return { showWarning, remainingSec, extendSession };
}
