import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Look-Ahead Schedule PDF Generator
//  Eagles Brothers Constructors · Houston, TX
//  Sprint 9.4 — PM + Foreman audit item (GC meeting handout)
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
  blue: [59, 130, 246],
  bg: [248, 248, 248],
};

const TYPE_COLORS = {
  inspection: C.amber,
  milestone: C.blue,
  deadline: C.red,
  delivery: C.green,
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
 * Generate a 14-day look-ahead PDF for GC coordination meetings.
 *
 * @param {Object} opts
 * @param {Object} opts.project — { name, gc, address }
 * @param {Array}  opts.events — look-ahead events [{ date, title, type, status, assignedTo, notes }]
 * @param {string} [opts.preparedBy] — name of the person generating
 * @param {string} [opts.preparedFor] — GC / meeting attendee label
 */
export function generateLookAheadPdf(opts) {
  const { project, events = [], preparedBy, preparedFor } = opts;
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  let y = 0;

  const addPage = () => { doc.addPage(); y = 20; };
  const checkPage = (needed = 20) => { if (y > PH - 30) addPage(); };

  // ── Date range ──
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 13);
  const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ── Header ──
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, 36, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Eagles Brothers Constructors", ML, 13);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("14-Day Look-Ahead Schedule", ML, 22);
  doc.setFontSize(10);
  doc.text(`${fmtDate(today)} — ${fmtDate(endDate)}`, ML, 30);
  doc.text(safe(project?.name || ""), PW - MR, 13, { align: "right" });
  doc.text(safe(project?.gc || ""), PW - MR, 22, { align: "right" });
  if (preparedFor) {
    doc.setFontSize(9);
    doc.text(`Prepared for: ${safe(preparedFor)}`, PW - MR, 30, { align: "right" });
  }
  doc.setTextColor(...C.darkGray);
  y = 42;

  // ── Summary counts ──
  const byType = {};
  events.forEach(e => { byType[e.type || "other"] = (byType[e.type || "other"] || 0) + 1; });

  doc.setFillColor(...C.bg);
  doc.roundedRect(ML, y, CW, 16, 2, 2, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const typeSummary = Object.entries(byType).map(([t, c]) => `${c} ${t}${c > 1 ? "s" : ""}`).join("  ·  ");
  doc.text(`${events.length} events: ${typeSummary}`, ML + 4, y + 7);
  if (project?.address) {
    doc.setFontSize(8);
    doc.setTextColor(...C.medGray);
    doc.text(safe(project.address), ML + 4, y + 12);
    doc.setTextColor(...C.darkGray);
  }
  y += 20;

  // ── Table header ──
  const drawTableHeader = () => {
    doc.setFillColor(...C.navy);
    doc.rect(ML, y, CW, 7, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Day", ML + 3, y + 5);
    doc.text("Type", ML + 40, y + 5);
    doc.text("Description", ML + 65, y + 5);
    doc.text("Status", PW - MR - 3, y + 5, { align: "right" });
    doc.setTextColor(...C.darkGray);
    y += 9;
  };

  drawTableHeader();

  // ── Group events by date ──
  const sorted = [...events].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  if (sorted.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("No events scheduled in the next 14 days.", ML + 3, y + 4);
    y += 10;
  }

  let lastDate = "";
  let rowIdx = 0;
  for (const ev of sorted) {
    checkPage(12);
    if (y > PH - 40) {
      drawTableHeader();
    }

    // Zebra stripe
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 248, 252);
      doc.rect(ML, y - 1, CW, 7, "F");
    }

    // Date column — only show when date changes
    const evDate = ev.date || "";
    if (evDate !== lastDate) {
      lastDate = evDate;
      const isToday = evDate === todayStr;
      const isTomorrow = evDate === tomorrowStr;
      const dayLabel = isToday ? "TODAY" : isTomorrow ? "Tomorrow" :
        new Date(evDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(isToday ? C.amber : C.navy));
      doc.text(safe(dayLabel), ML + 3, y + 4);
      doc.setTextColor(...C.darkGray);
    }

    // Type badge
    const typeColor = TYPE_COLORS[ev.type] || C.medGray;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...typeColor);
    doc.text(safe((ev.type || "event").toUpperCase()), ML + 40, y + 4);

    // Description
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.darkGray);
    const descText = safe(ev.title || ev.description || "");
    const maxDescW = CW - 70 - 25;
    const truncDesc = doc.getTextWidth(descText) > maxDescW
      ? descText.slice(0, 50) + "..."
      : descText;
    doc.text(truncDesc, ML + 65, y + 4);

    // Status
    const status = ev.status || ev.inspectionResult || "scheduled";
    const statusColor = status === "pass" || status === "complete" ? C.green
      : status === "fail" ? C.red
      : status === "overdue" ? C.red
      : C.medGray;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...statusColor);
    doc.text(safe(status.toUpperCase()), PW - MR - 3, y + 4, { align: "right" });
    doc.setTextColor(...C.darkGray);

    y += 7;
    rowIdx++;
  }

  // ── Notes section ──
  y += 5;
  checkPage(30);
  doc.setFillColor(...C.bg);
  doc.roundedRect(ML, y, CW, 25, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Notes / Action Items:", ML + 3, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(...C.ltGray);
  for (let i = 0; i < 3; i++) {
    const lineY = y + 12 + i * 6;
    doc.line(ML + 3, lineY, PW - MR - 3, lineY);
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

  doc.save(`EBC_LookAhead_${safe(project?.name || "Project").replace(/\s+/g, "_")}_${todayStr}.pdf`);
}
