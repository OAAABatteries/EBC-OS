import { useCallback } from "react";

const PREFS_KEY = (userId) => `ebc_notification_prefs_${userId}`;
const PUSH_SUB_KEY = (userId) => `ebc_push_sub_${userId}`;

// VAPID public key for web-push subscription
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

const DEFAULT_PREFS = {
  clockReminders: true,
  materialUpdates: true,
  scheduleChanges: true,
  dailyReportReminder: true,
  dailyReportTime: "16:30",
};

export function getNotificationPrefs(userId) {
  try {
    const stored = localStorage.getItem(PREFS_KEY(userId));
    return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : { ...DEFAULT_PREFS };
  } catch { return { ...DEFAULT_PREFS }; }
}

export function saveNotificationPrefs(userId, prefs) {
  localStorage.setItem(PREFS_KEY(userId), JSON.stringify(prefs));
}

export function useNotifications() {
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    return await Notification.requestPermission();
  }, []);

  const _post = useCallback((msg) => {
    if (!navigator.serviceWorker?.controller) return;
    navigator.serviceWorker.controller.postMessage(msg);
  }, []);

  // ── Clock-in reminders (existing) ──
  const scheduleClockReminder = useCallback(
    ({ employeeId, employeeName, scheduledTime, projectName }) => {
      if (Notification.permission !== "granted") return;
      _post({ type: "SCHEDULE_CLOCK_REMINDER", employeeId, employeeName, scheduledTime, projectName });
    },
    [_post]
  );

  const cancelClockReminder = useCallback((employeeId) => {
    _post({ type: "CANCEL_CLOCK_REMINDER", employeeId });
  }, [_post]);

  // ── Generic notification (immediate) ──
  const sendNotification = useCallback(({ title, body, tag, url }) => {
    if (Notification.permission !== "granted") return;
    _post({ type: "SHOW_NOTIFICATION", title, body, tag, url });
  }, [_post]);

  // ── Material request notifications ──
  const notifyMaterialStatus = useCallback(({ material, status, projectName, requestId }) => {
    const statusText = status === "approved" ? "approved" : status === "delivered" ? "delivered" : `updated to ${status}`;
    sendNotification({
      title: `EBC-OS · Material ${status === "delivered" ? "Delivered" : "Update"}`,
      body: `${material} has been ${statusText}${projectName ? " — " + projectName : ""}`,
      tag: `material-${requestId}`,
      url: "/#/foreman",
    });
  }, [sendNotification]);

  // ── Schedule change notification ──
  const notifyScheduleChange = useCallback(({ employeeName, projectName, change }) => {
    sendNotification({
      title: "EBC-OS · Schedule Change",
      body: `${employeeName}: ${change}${projectName ? " — " + projectName : ""}`,
      tag: `schedule-change-${Date.now()}`,
      url: "/#/employee",
    });
  }, [sendNotification]);

  // ── Daily report reminder ──
  const scheduleDailyReportReminder = useCallback(({ employeeId, employeeName, scheduledTime }) => {
    if (Notification.permission !== "granted") return;
    _post({ type: "SCHEDULE_DAILY_REPORT_REMINDER", employeeId, employeeName, scheduledTime });
  }, [_post]);

  const cancelDailyReportReminder = useCallback((employeeId) => {
    _post({ type: "CANCEL_DAILY_REPORT_REMINDER", employeeId });
  }, [_post]);

  // Compute next scheduled time from a "HH:MM" string
  const getNextScheduledTime = useCallback((timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target.getTime();
  }, []);

  // ── Web Push subscription (VAPID) ──
  const subscribeToPush = useCallback(async (userId) => {
    if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return null;

      const reg = await navigator.serviceWorker.ready;
      // Check for existing subscription
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      }

      // Send subscription to backend
      const subJSON = sub.toJSON();
      localStorage.setItem(PUSH_SUB_KEY(userId), JSON.stringify(subJSON));
      try {
        await fetch("/.netlify/functions/push-subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subJSON, userId, action: "subscribe" }),
        });
      } catch {} // Offline — subscription is still stored locally

      return subJSON;
    } catch (err) {
      console.warn("[push] subscribe failed:", err.message);
      return null;
    }
  }, []);

  const unsubscribeFromPush = useCallback(async (userId) => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      localStorage.removeItem(PUSH_SUB_KEY(userId));
      try {
        await fetch("/.netlify/functions/push-subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, action: "unsubscribe" }),
        });
      } catch {}
    } catch (err) {
      console.warn("[push] unsubscribe failed:", err.message);
    }
  }, []);

  const isPushSubscribed = useCallback((userId) => {
    return !!localStorage.getItem(PUSH_SUB_KEY(userId));
  }, []);

  return {
    requestPermission,
    scheduleClockReminder,
    cancelClockReminder,
    sendNotification,
    notifyMaterialStatus,
    notifyScheduleChange,
    scheduleDailyReportReminder,
    cancelDailyReportReminder,
    getNextScheduledTime,
    subscribeToPush,
    unsubscribeFromPush,
    isPushSubscribed,
  };
}

// Convert VAPID base64 URL key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
