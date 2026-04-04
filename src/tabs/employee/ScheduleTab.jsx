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
  return (
    <div className="emp-content">
      <p>{t("Schedule")}</p>
    </div>
  );
}
