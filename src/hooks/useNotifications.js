import { useCallback } from "react";

export function useNotifications() {
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    return await Notification.requestPermission();
  }, []);

  const scheduleClockReminder = useCallback(
    ({ employeeId, employeeName, scheduledTime, projectName }) => {
      if (Notification.permission !== "granted") return;
      if (!navigator.serviceWorker?.controller) return;
      navigator.serviceWorker.controller.postMessage({
        type: "SCHEDULE_CLOCK_REMINDER",
        employeeId,
        employeeName,
        scheduledTime,
        projectName,
      });
    },
    []
  );

  const cancelClockReminder = useCallback((employeeId) => {
    if (!navigator.serviceWorker?.controller) return;
    navigator.serviceWorker.controller.postMessage({
      type: "CANCEL_CLOCK_REMINDER",
      employeeId,
    });
  }, []);

  // Compute next scheduled time from a "HH:MM" string
  const getNextScheduledTime = useCallback((timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    // If the time has already passed today, schedule for tomorrow
    if (target <= now) target.setDate(target.getDate() + 1);
    return target.getTime();
  }, []);

  return { requestPermission, scheduleClockReminder, cancelClockReminder, getNextScheduledTime };
}
