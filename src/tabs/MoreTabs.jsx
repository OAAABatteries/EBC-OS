import { lazy, Suspense } from "react";
import { TimeClockAdmin } from "./TimeClockAdmin";
import { MapView } from "./MapView";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · MoreTabs — Secondary tab router
//  Sprint 9.1: Split from 8983-line monolith into domain modules
// ═══════════════════════════════════════════════════════════════

// Lazy-load each domain to keep the bundle lean
const Financials = lazy(() => import("./more/FinancialsTab").then(m => ({ default: m.Financials })));
const Documents = lazy(() => import("./more/DocumentsTab").then(m => ({ default: m.Documents })));
const SubmittalLibrary = lazy(() => import("./more/SubmittalLibraryTab").then(m => ({ default: m.SubmittalLibrary })));
const Schedule = lazy(() => import("./more/ScheduleTab").then(m => ({ default: m.Schedule })));
const Reports = lazy(() => import("./more/ReportsTab").then(m => ({ default: m.Reports })));
const Safety = lazy(() => import("./more/SafetyTab").then(m => ({ default: m.Safety })));
const SDSBinder = lazy(() => import("./more/SDSBinderTab").then(m => ({ default: m.SDSBinder })));
const Settings = lazy(() => import("./more/SettingsTab").then(m => ({ default: m.Settings })));

function TabFallback() {
  return <div className="text-sm text-dim" style={{ padding: "var(--space-8)" }}>Loading...</div>;
}

export function MoreTabs({ app }) {
  const content = (() => {
    switch (app.tab) {
      case "financials": return <Financials app={app} />;
      case "documents":  return <Documents app={app} />;
      case "submittalLibrary": return <SubmittalLibrary app={app} />;
      case "schedule":   return <Schedule app={app} />;
      case "reports":    return <Reports app={app} />;
      case "safety":     return <Safety app={app} />;
      case "timeclock":  return <TimeClockAdmin app={app} />;
      case "sds":        return <SDSBinder app={app} />;
      case "map":        return <MapView app={app} />;
      case "settings":   return <Settings app={app} />;
      default:           return null;
    }
  })();

  return <Suspense fallback={<TabFallback />}>{content}</Suspense>;
}
