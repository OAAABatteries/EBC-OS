import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { ShiftCard, EmptyState, FieldButton, FieldInput, FieldSelect } from '../../components/field';
import { supabase } from '../../lib/supabase';

/**
 * ScheduleTab — Week strip, shift cards, available shifts, time-off
 *
 * Props:
 *   activeEmp   — logged-in employee object
 *   mySchedule  — array of schedule assignments
 *   projects    — array of all projects
 *   setEmpTab   — function to switch tabs
 *   t           — translation function
 *   lang        — 'en' | 'es'
 *   isOnline    — boolean network status
 *   show        — toast notification function
 */
export function ScheduleTab({ activeEmp, mySchedule, projects, setEmpTab, t, lang, isOnline, show }) {
  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });

  // Shift data
  const [availableShifts, setAvailableShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftsError, setShiftsError] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [pickupLoading, setPickupLoading] = useState(null); // shift ID being picked up

  // Time-off
  const [showTimeOffSheet, setShowTimeOffSheet] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({ dateStart: '', dateEnd: '', reason: 'Personal', notes: '' });
  const [timeOffSubmitting, setTimeOffSubmitting] = useState(false);
  const [timeOffError, setTimeOffError] = useState(null);
  const [timeOffRequests, setTimeOffRequests] = useState([]);

  // Week days derivation — SCHED-01
  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek + (weekOffset * 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        date: d,
        dateStr: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
        dayAbbr: ['S','M','T','W','T','F','S'][d.getDay()],
        dayNum: d.getDate(),
        isToday: d.toDateString() === new Date().toDateString(),
      };
    });
  }, [weekOffset]);

  const weekStart = weekDays[0]?.dateStr;
  const weekEnd = weekDays[6]?.dateStr;

  // Shift data loader — SCHED-03, SCHED-07
  const loadShifts = useCallback(async () => {
    if (!activeEmp?.id || !weekStart || !weekEnd) return;
    setShiftsLoading(true);
    setShiftsError(null);
    try {
      // Available shifts from Supabase
      const { data: avail, error: availErr } = await supabase
        .from('available_shifts')
        .select('*')
        .eq('status', 'open')
        .gte('date', weekStart)
        .lte('date', weekEnd);
      if (availErr) throw availErr;

      // Employee's shift requests to check pending status
      const { data: myRequests, error: reqErr } = await supabase
        .from('shift_requests')
        .select('*')
        .eq('employee_id', activeEmp.id);
      if (reqErr) throw reqErr;

      const requestedShiftIds = new Set((myRequests || []).map(r => r.shift_id));
      const requestStatusMap = {};
      (myRequests || []).forEach(r => { requestStatusMap[r.shift_id] = r.status; });

      setAvailableShifts((avail || []).map(s => ({
        ...s,
        alreadyRequested: requestedShiftIds.has(s.id),
        requestStatus: requestStatusMap[s.id] || null,
      })));

      setLastFetchedAt(new Date());
      try {
        localStorage.setItem('ebc_scheduleCache', JSON.stringify({
          available: avail || [],
          requests: myRequests || [],
          at: new Date().toISOString()
        }));
      } catch {}
    } catch (err) {
      setShiftsError(err.message);
      // Offline fallback — SCHED-07
      try {
        const cached = JSON.parse(localStorage.getItem('ebc_scheduleCache') || '{}');
        if (cached.available) {
          setAvailableShifts(cached.available);
          setLastFetchedAt(cached.at ? new Date(cached.at) : null);
        }
      } catch {}
    } finally {
      setShiftsLoading(false);
    }
  }, [activeEmp?.id, weekStart, weekEnd]);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  // Time-off data loader — SCHED-06
  const loadTimeOffRequests = useCallback(async () => {
    if (!activeEmp?.id) return;
    try {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('employee_id', activeEmp.id);
      if (error) throw error;
      setTimeOffRequests(data || []);
    } catch (err) {
      console.error('Time-off load error:', err);
    }
  }, [activeEmp?.id]);

  useEffect(() => { loadTimeOffRequests(); }, [loadTimeOffRequests]);

  // Shift pickup handler — SCHED-04
  const handleShiftPickup = useCallback(async (shiftId) => {
    if (!activeEmp?.id || pickupLoading) return;
    setPickupLoading(shiftId);
    try {
      const { error } = await supabase
        .from('shift_requests')
        .insert({ employee_id: activeEmp.id, shift_id: shiftId, status: 'pending' });
      if (error) throw error;
      setAvailableShifts(prev => prev.map(s =>
        s.id === shiftId ? { ...s, alreadyRequested: true, requestStatus: 'pending' } : s
      ));
      if (show) show(t("Pick Up Shift") + " — " + t("PENDING"), "ok");
    } catch (err) {
      console.error('Shift pickup error:', err);
      if (show) show(t("Could not submit your request. Try again."), "err");
    } finally {
      setPickupLoading(null);
    }
  }, [activeEmp?.id, pickupLoading, show, t]);

  // Time-off submit handler — SCHED-05
  const handleTimeOffSubmit = useCallback(async () => {
    if (!activeEmp?.id || !timeOffForm.dateStart || !timeOffForm.dateEnd) return;
    setTimeOffSubmitting(true);
    setTimeOffError(null);
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .insert({
          employee_id: activeEmp.id,
          date_start: timeOffForm.dateStart,
          date_end: timeOffForm.dateEnd,
          reason: timeOffForm.reason,
          notes: timeOffForm.notes || null,
        });
      if (error) throw error;
      setShowTimeOffSheet(false);
      setTimeOffForm({ dateStart: '', dateEnd: '', reason: 'Personal', notes: '' });
      loadTimeOffRequests();
      if (show) show(t("Request Time Off") + " — " + t("PENDING"), "ok");
    } catch (err) {
      setTimeOffError(t("Could not submit your request. Try again."));
    } finally {
      setTimeOffSubmitting(false);
    }
  }, [activeEmp?.id, timeOffForm, show, t, loadTimeOffRequests]);

  // Time-off day checker — SCHED-06
  const selectedDayTimeOff = useMemo(() => {
    return timeOffRequests.find(r => selectedDay >= r.date_start && selectedDay <= r.date_end);
  }, [timeOffRequests, selectedDay]);

  // Swipe handling — SCHED-01
  const touchStartX = useRef(null);
  const handleWeekTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleWeekTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      setWeekOffset(prev => delta > 0 ? prev - 1 : prev + 1);
    }
    touchStartX.current = null;
  };

  return (
    <div className="emp-content">
      {/* Week strip — SCHED-01 */}
      <div className="week-strip" onTouchStart={handleWeekTouchStart} onTouchEnd={handleWeekTouchEnd}>
        {weekDays.map(day => {
          const hasShift = mySchedule.some(s => {
            const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][day.date.getDay()];
            return s.days?.[dayKey] && s.projectId;
          });
          const hasAvailable = availableShifts.some(s => s.date === day.dateStr);
          return (
            <button key={day.dateStr}
              className={`week-day-cell${day.isToday ? ' today' : ''}${selectedDay === day.dateStr ? ' selected' : ''}`}
              onClick={() => setSelectedDay(day.dateStr)}
              aria-label={day.isToday ? `Today, ${day.dayAbbr} ${day.dayNum}` : `${day.dayAbbr} ${day.dayNum}`}>
              <span className="week-day-abbr">{day.dayAbbr}</span>
              <span className="week-day-num">{day.dayNum}</span>
              {(hasShift || hasAvailable) && <span className="week-day-dot" />}
            </button>
          );
        })}
      </div>

      {/* Offline notice — SCHED-07 */}
      {!isOnline && lastFetchedAt && (
        <div className="schedule-offline-notice">
          {t("Last updated")} {lastFetchedAt instanceof Date
            ? lastFetchedAt.toLocaleTimeString(lang === 'es' ? 'es' : 'en', {hour:'numeric', minute:'2-digit'})
            : new Date(lastFetchedAt).toLocaleTimeString(lang === 'es' ? 'es' : 'en', {hour:'numeric', minute:'2-digit'})}
        </div>
      )}

      {/* Time-off inline status — SCHED-06 */}
      {selectedDayTimeOff && (
        <div className="schedule-offline-notice" style={{color: selectedDayTimeOff.status === 'approved' ? 'var(--green)' : selectedDayTimeOff.status === 'denied' ? 'var(--red)' : 'var(--yellow)'}}>
          {selectedDayTimeOff.status === 'approved' ? t("OFF — Approved")
            : selectedDayTimeOff.status === 'denied' ? t("OFF — Denied")
            : t("OFF — Requested")}
        </div>
      )}

      {/* Today's scheduled shifts from mySchedule — SCHED-02 */}
      {(() => {
        const selDate = new Date(selectedDay + 'T12:00:00');
        const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][selDate.getDay()];
        const todayAssignments = mySchedule.filter(s => s.days?.[dayKey] && s.projectId);
        return todayAssignments.length > 0 ? (
          todayAssignments.map((assignment, idx) => {
            const proj = projects.find(p => p.id === assignment.projectId);
            return (
              <ShiftCard key={`sched-${idx}`}
                timeRange={`${assignment.hours?.start || '06:30'} — ${assignment.hours?.end || '15:00'}`}
                project={proj?.name || ''}
                location={proj?.address || ''}
                status="scheduled"
                isOvertime={false}
                t={t} />
            );
          })
        ) : !selectedDayTimeOff ? (
          <EmptyState icon={Calendar} heading={t("No shifts scheduled")}
            action={<FieldButton variant="ghost" onClick={() => {}} t={t}>{t("Contact your foreman")}</FieldButton>} t={t} />
        ) : null;
      })()}

      {/* Available shifts — SCHED-03, SCHED-04 */}
      {availableShifts.filter(s => s.date === selectedDay).length > 0 && (
        <>
          <div className="section-label" style={{marginTop: 'var(--space-5)'}}>{t("AVAILABLE SHIFTS")}</div>
          {availableShifts.filter(s => s.date === selectedDay).map(shift => (
            <ShiftCard key={shift.id}
              timeRange={`${shift.time_start || ''} — ${shift.time_end || ''}`}
              project={shift.project_name || ''}
              location=""
              status={shift.alreadyRequested ? (shift.requestStatus?.toLowerCase() || 'pending') : 'available'}
              isOvertime={shift.overtime || false}
              isAvailable={!shift.alreadyRequested}
              onPickUp={shift.alreadyRequested ? undefined : () => handleShiftPickup(shift.id)}
              t={t} />
          ))}
        </>
      )}

      {/* Time-off request trigger — SCHED-05 */}
      <div style={{marginTop: 'var(--space-4)', textAlign: 'center'}}>
        <FieldButton variant="ghost" onClick={() => setShowTimeOffSheet(true)} t={t}>
          {t("Request Time Off")}
        </FieldButton>
      </div>

      {/* Time-off bottom sheet — SCHED-05 */}
      {showTimeOffSheet && (
        <div className="sheet-overlay" onClick={() => setShowTimeOffSheet(false)} />
      )}
      <div className={`sheet-container${showTimeOffSheet ? ' open' : ''}`}>
        <div className="sheet-header">
          <span className="text-lg font-bold">{t("Request Time Off")}</span>
          <button className="view-all-link" onClick={() => setShowTimeOffSheet(false)} aria-label="Close">&#10005;</button>
        </div>
        <div className="sheet-form">
          <FieldInput type="date" label={t("Start Date")} value={timeOffForm.dateStart}
            onChange={(e) => setTimeOffForm(f => ({...f, dateStart: e.target.value}))} t={t} />
          <FieldInput type="date" label={t("End Date")} value={timeOffForm.dateEnd}
            onChange={(e) => setTimeOffForm(f => ({...f, dateEnd: e.target.value}))} t={t} />
          <FieldSelect label={t("Reason")} value={timeOffForm.reason}
            onChange={(e) => setTimeOffForm(f => ({...f, reason: e.target.value}))} t={t}>
            <option value="Personal">{t('Personal')}</option>
            <option value="Medical">{t('Medical')}</option>
            <option value="Family">{t('Family')}</option>
            <option value="Other">{t('Other')}</option>
          </FieldSelect>
          <FieldInput label={t("Notes")} value={timeOffForm.notes}
            onChange={(e) => setTimeOffForm(f => ({...f, notes: e.target.value}))} t={t} />
          {timeOffError && <div className="text-sm" style={{color: 'var(--red)'}}>{timeOffError}</div>}
          <FieldButton variant="primary" onClick={handleTimeOffSubmit} loading={timeOffSubmitting} t={t}>
            {t("Submit Request")}
          </FieldButton>
        </div>
      </div>
    </div>
  );
}
