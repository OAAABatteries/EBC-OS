import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Weekly Field Summary PDF Generator
//  Eagles Brothers Constructors · Houston, TX
//  Sprint 9.3 — PM audit item
// ═══════════════════════════════════════════════════════════════

const C = {
  navy: [30, 45, 59],
  amber: [224, 148, 34],
  darkGray: [60, 60, 60],
  medGray: [120, 120, 120],
  ltGray: [220, 220, 220],
  white: [255, 255, 255],
  green: [16, 185, 129],
  red: [239, 68, 68],
  bg: [248, 248, 248],
};

const PW = 215.9;
const PH = 279.4;
const ML = 18;
const MR = 18;
const CW = PW - ML - MR;

function safe(str) {
  return String(str || "").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-");
}

/**
 * Generate a weekly field summary PDF aggregating daily reports for a project.
 *
 * @param {Object} opts
 * @param {Object} opts.project — { name, gc, address }
 * @param {Array}  opts.dailyReports — daily report objects for the week
 * @param {Array}  opts.timeEntries — time entries for the week
 * @param {Array}  opts.materialRequests — material requests submitted this week
 * @param {Array}  opts.rfis — open RFIs
 * @param {Array}  opts.incidents — safety incidents this week
 * @param {string} opts.weekStart — ISO date string for Monday of the week
 * @param {string} [opts.preparedBy] — name of the person generating the report
 */
export function generateWeeklyFieldSummaryPdf(opts) {
  const { project, dailyReports = [], timeEntries = [], materialRequests = [], rfis = [], incidents = [], weekStart, preparedBy } = opts;
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  let y = 0;

  const addPage = () => { doc.addPage(); y = 20; };
  const checkPage = (needed = 20) => { if (y > PH - 30) addPage(); };

  // ── Week range ──
  const weekStartDate = new Date(weekStart + "T12:00:00");
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const weekLabel = `${fmtDate(weekStartDate)} — ${fmtDate(weekEndDate)}`;

  // ── Header ──
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, 36, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Eagles Brothers Constructors", ML, 13);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Weekly Field Summary", ML, 22);
  doc.setFontSize(10);
  doc.text(weekLabel, ML, 30);
  doc.text(safe(project?.name || ""), PW - MR, 13, { align: "right" });
  doc.text(safe(project?.gc || ""), PW - MR, 22, { align: "right" });
  if (project?.address) doc.text(safe(project.address), PW - MR, 30, { align: "right" });
  doc.setTextColor(...C.darkGray);
  y = 44;

  // ── KPI Summary Box ──
  const projectEntries = timeEntries.filter(e => String(e.projectId) === String(project?.id));
  const totalHours = projectEntries.reduce((s, e) => s + (e.totalHours || 0), 0);
  const uniqueCrew = new Set(projectEntries.map(e => e.employeeId)).size;
  const weekIncidents = incidents.length;
  const openRfis = rfis.filter(r => r.status !== "closed" && r.status !== "resolved").length;
  const pendingMats = materialRequests.filter(m => m.status === "pending" || !m.status).length;

  doc.setFillColor(...C.bg);
  doc.roundedRect(ML, y, CW, 24, 2, 2, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const kpiY = y + 8;
  const kpiW = CW / 5;
  const kpis = [
    { label: "Total Hours", value: totalHours.toFixed(1) },
    { label: "Crew Present", value: String(uniqueCrew) },
    { label: "Safety Incidents", value: String(weekIncidents) },
    { label: "Open RFIs", value: String(openRfis) },
    { label: "Pending Materials", value: String(pendingMats) },
  ];
  kpis.forEach((k, i) => {
    const x = ML + kpiW * i + kpiW / 2;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(k.label === "Safety Incidents" && weekIncidents > 0 ? C.red : C.navy));
    doc.text(k.value, x, kpiY, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.medGray);
    doc.text(k.label, x, kpiY + 8, { align: "center" });
  });
  doc.setTextColor(...C.darkGray);
  y += 30;

  // ── Daily Report Summaries ──
  checkPage(20);
  doc.setFillColor(...C.navy);
  doc.rect(ML, y, CW, 7, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Daily Reports", ML + 3, y + 5);
  doc.setTextColor(...C.darkGray);
  y += 10;

  if (dailyReports.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("No daily reports filed this week.", ML + 3, y + 4);
    y += 10;
  } else {
    const sorted = [...dailyReports].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    for (const report of sorted) {
      checkPage(25);
      const dayLabel = new Date(report.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

      doc.setFillColor(...C.bg);
      doc.rect(ML, y, CW, 6, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.navy);
      doc.text(safe(dayLabel), ML + 3, y + 4);
      if (report.weatherCondition) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.medGray);
        doc.text(safe(`${report.weatherCondition}${report.temperature ? ` ${report.temperature}°F` : ""}`), PW - MR - 3, y + 4, { align: "right" });
      }
      doc.setTextColor(...C.darkGray);
      y += 8;

      if (report.workPerformed) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(safe(report.workPerformed), CW - 6);
        for (const line of lines.slice(0, 4)) {
          checkPage(6);
          doc.text(line, ML + 3, y + 3);
          y += 4;
        }
      }
      if (report.issues) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.red);
        doc.text("Issues:", ML + 3, y + 3);
        doc.setFont("helvetica", "normal");
        const issueLines = doc.splitTextToSize(safe(report.issues), CW - 20);
        doc.text(issueLines.slice(0, 2).join(" "), ML + 20, y + 3);
        doc.setTextColor(...C.darkGray);
        y += 5;
      }
      y += 3;
    }
  }

  // ── Material Requests ──
  if (materialRequests.length > 0) {
    checkPage(20);
    doc.setFillColor(...C.navy);
    doc.rect(ML, y, CW, 7, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Material Requests (${materialRequests.length})`, ML + 3, y + 5);
    doc.setTextColor(...C.darkGray);
    y += 10;

    for (const mat of materialRequests.slice(0, 15)) {
      checkPage(8);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const status = mat.status || "pending";
      doc.setTextColor(...(status === "delivered" ? C.green : status === "pending" ? C.amber : C.darkGray));
      doc.text(`[${status.toUpperCase()}]`, ML + 3, y + 3);
      doc.setTextColor(...C.darkGray);
      doc.text(safe(`${mat.material || "Unknown"} x${mat.qty || "?"} — ${mat.requestedBy || ""}`), ML + 28, y + 3);
      y += 5;
    }
    y += 3;
  }

  // ── Open RFIs ──
  const openRfiList = rfis.filter(r => r.status !== "closed" && r.status !== "resolved");
  if (openRfiList.length > 0) {
    checkPage(20);
    doc.setFillColor(...C.navy);
    doc.rect(ML, y, CW, 7, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Open RFIs (${openRfiList.length})`, ML + 3, y + 5);
    doc.setTextColor(...C.darkGray);
    y += 10;

    for (const rfi of openRfiList.slice(0, 10)) {
      checkPage(8);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(safe(`RFI-${rfi.number || "?"}: ${rfi.subject || rfi.title || ""}`), ML + 3, y + 3);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.medGray);
      const age = rfi.createdAt ? Math.floor((Date.now() - new Date(rfi.createdAt).getTime()) / 86400000) : 0;
      doc.text(`${age}d open · ${safe(rfi.priority || "normal")}`, PW - MR - 3, y + 3, { align: "right" });
      doc.setTextColor(...C.darkGray);
      y += 5;
    }
    y += 3;
  }

  // ── Footer ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...C.medGray);
    doc.text(`Generated by EBC-OS · ${new Date().toLocaleDateString()}${preparedBy ? ` · ${safe(preparedBy)}` : ""}`, ML, PH - 10);
    doc.text(`Page ${i} of ${pages}`, PW - MR, PH - 10, { align: "right" });
  }

  doc.save(`EBC_Weekly_Summary_${safe(project?.name || "Project").replace(/\s+/g, "_")}_${weekStart}.pdf`);
}
