import { useState, useEffect, useCallback } from "react";
import { HelpCircle, ChevronLeft, ChevronRight, X, EyeOff } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Feature Guide System
//  Contextual step-by-step guides for each major app section.
//  localStorage key: ebc_guidesCompleted → { [guideKey]: true }
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = "ebc_guidesCompleted";

function getCompleted() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function markCompleted(guideKey) {
  const completed = getCompleted();
  completed[guideKey] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
}

export function resetAllGuides() {
  localStorage.removeItem(STORAGE_KEY);
}

export function resetGuide(guideKey) {
  const completed = getCompleted();
  delete completed[guideKey];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
}

// ── Per-section guide step definitions ──────────────────────────

export const GUIDE_STEPS = {
  dashboard: [
    {
      title: "Command Center Overview",
      description:
        "Your dashboard shows the full health of EBC at a glance. KPI cards at the top track active bids, open projects, billed revenue, and total team — updated in real time.",
    },
    {
      title: "Profit Alerts",
      description:
        "Any active project with a margin below 30% triggers a profit alert. Tap the alert card to jump directly to that project's financials and take action.",
    },
    {
      title: "Action Items",
      description:
        "The 'Items Need Attention' counter rolls up bids due soon, pending change orders, overdue RFIs, and overdue invoices. Clear these daily to keep jobs on track.",
    },
    {
      title: "Charts & Pipeline",
      description:
        "The charts below show your bid win rate, revenue by project, and team utilization over time. Use them in Monday morning reviews to spot trends early.",
    },
    {
      title: "Morning Brief",
      description:
        "Hit 'Morning Brief' for an AI-generated summary of your day — open bids, team status, and any items that need your signature or follow-up.",
    },
  ],

  bids: [
    {
      title: "Bid Pipeline Intro",
      description:
        "The Bid Manager tracks every opportunity from invite to award. Each bid moves through stages: Invite → Reviewing → Takeoff → Pricing → Submitted → Awarded or Lost.",
    },
    {
      title: "Adding a New Bid",
      description:
        "Tap '+ New Bid' to log an opportunity. Enter the GC, project name, estimated value, bid due date, and assign an estimator. You can also drag in a PDF invitation to auto-extract details.",
    },
    {
      title: "Bid Status & Filters",
      description:
        "Use the filter buttons (All, Active, Submitted, Awarded, Lost) to focus your view. Bids due within 7 days show a red 'due this week' warning in the header.",
    },
    {
      title: "Opening a Bid",
      description:
        "Tap any bid row to expand its full detail — scope items, exclusions, risk level, attached files, and notes. Update the status here as the bid progresses.",
    },
    {
      title: "Converting to a Project",
      description:
        "When a bid is awarded, change its status to 'Awarded' and then use '+ New Project' in the Projects tab to convert it. The bid value carries over as the contract amount.",
    },
    {
      title: "Exporting Bids",
      description:
        "Use the 'Export CSV' button to pull a spreadsheet of all bids — great for weekly pipeline reviews with Emmanuel and the team.",
    },
  ],

  projects: [
    {
      title: "Project List",
      description:
        "Every active job lives here. Cards show contract value, billing progress, phase, and risk flags. Red 'at risk' tags mean the project is behind its expected completion curve.",
    },
    {
      title: "Project Overview",
      description:
        "Tap a project to open its detail view. The Overview tab shows contract vs. billed, labor and material costs, progress percentage, and the project timeline.",
    },
    {
      title: "Change Orders (COs)",
      description:
        "Use the Change Orders tab to log all scope additions. Each CO has a value, status (draft / submitted / approved / rejected), and description. Approved COs add to the contract total automatically.",
    },
    {
      title: "RFIs",
      description:
        "The RFI tab tracks Requests for Information sent to the GC. Log the question, due date, and response. Open RFIs older than 7 days appear in your dashboard alerts.",
    },
    {
      title: "Submittals",
      description:
        "Track product submittals (framing, drywall specs, hardware) here. Each submittal has a due date and approval status. Approved submittals generate a PDF you can send to the GC.",
    },
    {
      title: "Crew & Financials",
      description:
        "The Financials tab shows a live P&L — contract, billed, labor cost, material cost, and margin. The Crew tab links to time clock entries for this specific job.",
    },
    {
      title: "Closeout",
      description:
        "When a project wraps, use the Closeout tab to generate the final closeout package — punch list, warranty info, and as-built documents — ready to send to the GC.",
    },
  ],

  foreman: [
    {
      title: "Foreman Portal Overview",
      description:
        "The Foreman Portal is your field command center. From here you manage your team's daily clock-in/out, submit JSAs, request materials, and log RFIs — all from your phone.",
    },
    {
      title: "Clock In / Clock Out",
      description:
        "Tap 'Clock In' at job start and 'Clock Out' at end of day. GPS location is captured at each event. If you're outside the job site geofence, you'll see a location warning.",
    },
    {
      title: "Crew Management",
      description:
        "Add team members to your active job from the Crew tab. Each worker can be clocked in individually or as a group. Their hours flow directly into the Time Clock Admin for payroll.",
    },
    {
      title: "Job Safety Analysis (JSA)",
      description:
        "Before work starts each day, complete the JSA checklist — hazard identification, controls, and PPE verification. The signed JSA is stored per job and per day.",
    },
    {
      title: "Materials & RFIs",
      description:
        "Use the Materials tab to submit supply requests. The RFI tab lets you log field questions directly from the job site — they sync to the office in real time.",
    },
  ],

  timeclock: [
    {
      title: "Time Clock Admin Overview",
      description:
        "Time Clock Admin is where payroll prep happens. You see live team status, the full weekly time log, and can export hours to QuickBooks for payroll processing.",
    },
    {
      title: "Live Status",
      description:
        "The Live Status tab shows every team member currently clocked in, their job site, and elapsed hours. Red flags appear if someone has been clocked in over 12 hours.",
    },
    {
      title: "Crew Scheduling",
      description:
        "Use Crew Schedule to assign workers to jobs by day of the week. Schedules help foremen know who's expected on site and make it easy to spot no-shows.",
    },
    {
      title: "Time Log & Verification",
      description:
        "The Time Log shows all entries for the selected week. Use the Verification tab to approve or flag entries before payroll export. Flagged entries require foreman correction.",
    },
    {
      title: "Payroll Export",
      description:
        "Once entries are verified, export the week's hours to a QuickBooks-compatible CSV. Map job codes to QB classes during the export to keep your job costing accurate.",
    },
  ],

  estimating: [
    {
      title: "Estimating Overview",
      description:
        "The Estimating tab is EBC's takeoff and proposal engine. Build detailed line-item estimates by room, generate a professional PDF proposal, and track all takeoffs by project.",
    },
    {
      title: "Quick Proposal",
      description:
        "Use 'Quick Proposal' for simple lump-sum bids. Enter the scope summary, total price, inclusions, and exclusions — the system generates a branded PDF proposal instantly.",
    },
    {
      title: "Line-Item Takeoff",
      description:
        "For detailed bids, create a takeoff with rooms and assemblies. Select assembly codes (LW, MT, acoustical, etc.), enter quantities and heights, and the system prices each line using EBC's labor and material rates.",
    },
    {
      title: "Waste & Markup",
      description:
        "Set waste percentage and markup on the right panel. Labor markup is your profit — EBC makes 100% on labor, so this is the primary profit lever. Material is near pass-through.",
    },
    {
      title: "Generating the Proposal",
      description:
        "When the estimate is complete, tap 'Generate Proposal PDF' to produce a GC-ready document with scope, pricing, inclusions/exclusions, and EBC branding. Attach it directly to the bid.",
    },
  ],
};

// ── Main FeatureGuide component ──────────────────────────────────

export function FeatureGuide({ guideKey, autoTrigger = true }) {
  const steps = GUIDE_STEPS[guideKey] || [];
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  // Auto-trigger on first visit
  useEffect(() => {
    if (!autoTrigger) return;
    const completed = getCompleted();
    if (!completed[guideKey]) {
      const timer = setTimeout(() => setActive(true), 700);
      return () => clearTimeout(timer);
    }
  }, [guideKey, autoTrigger]);

  const start = useCallback(() => {
    setStep(0);
    setActive(true);
  }, []);

  const close = useCallback(() => {
    setActive(false);
    markCompleted(guideKey);
  }, [guideKey]);

  const neverShow = useCallback(() => {
    markCompleted(guideKey);
    setActive(false);
  }, [guideKey]);

  const total = steps.length;
  const current = steps[step] || {};

  if (!steps.length) return null;

  return (
    <>
      {/* ── Help trigger button ── */}
      <GuideButton onClick={start} />

      {/* ── Step overlay ── */}
      {active && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(4, 10, 24, 0.78)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 9500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={close}
        >
          <div
            style={{
              background: "var(--bg2, #0f1c2e)",
              border: "1px solid var(--amber, #d4a537)",
              borderRadius: 16,
              padding: "28px 28px 20px",
              maxWidth: 440,
              width: "100%",
              boxShadow:
                "0 0 40px rgba(212, 165, 55, 0.18), 0 24px 64px rgba(0,0,0,0.7)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={close}
              title="Close guide"
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "none",
                border: "none",
                color: "var(--text3, #6b7fa3)",
                cursor: "pointer",
                padding: 4,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={16} />
            </button>

            {/* Step counter */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                color: "var(--amber, #d4a537)",
                marginBottom: 12,
              }}
            >
              Step {step + 1} of {total}
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: 3,
                background: "var(--border, #1e2d3b)",
                borderRadius: 999,
                marginBottom: 20,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${((step + 1) / total) * 100}%`,
                  background: "var(--amber, #d4a537)",
                  borderRadius: 999,
                  transition: "width 0.3s ease",
                  boxShadow: "0 0 8px rgba(212,165,55,0.5)",
                }}
              />
            </div>

            {/* Step title */}
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--text, #e8edf5)",
                marginBottom: 10,
                letterSpacing: "0.2px",
                lineHeight: 1.3,
              }}
            >
              {current.title}
            </div>

            {/* Step description */}
            <div
              style={{
                fontSize: 14,
                color: "var(--text2, #9baac4)",
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              {current.description}
            </div>

            {/* Navigation row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "7px 14px",
                  border: "1px solid var(--border, #1e2d3b)",
                  borderRadius: 8,
                  background: "none",
                  color:
                    step === 0
                      ? "var(--text3, #6b7fa3)"
                      : "var(--text2, #9baac4)",
                  cursor: step === 0 ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  opacity: step === 0 ? 0.4 : 1,
                  transition: "all 0.15s",
                }}
              >
                <ChevronLeft size={14} />
                Prev
              </button>

              <div style={{ flex: 1 }} />

              {step < total - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "7px 16px",
                    border: "none",
                    borderRadius: 8,
                    background: "var(--amber, #d4a537)",
                    color: "#000",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    boxShadow: "0 2px 8px rgba(212,165,55,0.3)",
                    transition: "all 0.15s",
                  }}
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={close}
                  style={{
                    padding: "7px 16px",
                    border: "none",
                    borderRadius: 8,
                    background: "var(--amber, #d4a537)",
                    color: "#000",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    boxShadow: "0 2px 8px rgba(212,165,55,0.3)",
                    transition: "all 0.15s",
                  }}
                >
                  Done
                </button>
              )}
            </div>

            {/* Footer actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid var(--border, #1e2d3b)",
              }}
            >
              <button
                onClick={close}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text3, #6b7fa3)",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: 0,
                  transition: "color 0.15s",
                }}
              >
                Skip guide
              </button>
              <button
                onClick={neverShow}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  color: "var(--text3, #6b7fa3)",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: 0,
                  marginLeft: "auto",
                  transition: "color 0.15s",
                }}
              >
                <EyeOff size={12} />
                Never show again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Small help button used inline in section headers ─────────────

export function GuideButton({ onClick, label = "Guide" }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title="Open feature guide"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 9px",
        border: `1px solid ${hovered ? "var(--amber, #d4a537)" : "var(--border, #1e2d3b)"}`,
        borderRadius: 6,
        background: hovered ? "var(--amber-dim, rgba(212,165,55,0.1))" : "none",
        color: hovered ? "var(--amber, #d4a537)" : "var(--text3, #6b7fa3)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      <HelpCircle size={13} />
      {label}
    </button>
  );
}
