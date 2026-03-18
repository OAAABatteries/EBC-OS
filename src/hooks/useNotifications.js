import { useCallback } from "react";

const PREFS_KEY = (userId) => `ebc_notification_prefs_${userId}`;

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
  };
}
