import { useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { PremiumCard, StatTile, AlertCard, EmptyState, FieldButton } from '../../components/field';

/**
 * HomeTab — Employee home dashboard (clock hero, stat tiles, project card, alerts)
 *
 * Props:
 *   activeEmp        — logged-in employee object
 *   isClockedIn      — boolean clock status
 *   activeEntry      — current time entry or null
 *   now              — Date ticker (updated every second)
 *   weekTotal        — number, hours this week
 *   mySchedule       — array of schedule assignments
 *   myMatRequests    — array of material requests
 *   projects         — array of all projects
 *   setEmpTab        — function to switch tabs
 *   setSelectedInfoProject — function to select project detail
 *   t                — translation function
 *   lang             — 'en' | 'es'
 */
export function HomeTab({ activeEmp, isClockedIn, activeEntry, now, weekTotal, mySchedule, myMatRequests, projects, setEmpTab, setSelectedInfoProject, t, lang }) {
  return (
    <div className="emp-content">
      <p>{t("Home")}</p>
    </div>
  );
}
