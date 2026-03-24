import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Daily Field Report PDF Generator
//  Eagles Brothers Constructors · Houston, TX
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
 * Generate a professional daily field report PDF with EBC branding.
 * @param {Object} report - The daily report object
 * @param {Object} project - The project object (optional)
 */
export function generateDailyReportPdf(report, project) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  let y = 0;

  const addPage = () => { doc.addPage(); y = 20; };
  const checkPage = (needed = 20) => { if (y > PH - 30) addPage(); };

  // ── Header ──
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, 32, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Eagles Brothers Constructors", ML, 13);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Daily Field Report", ML, 21);
  // Date on the right
  doc.setFontSize(10);
  doc.text(safe(report.date || ""), PW - MR, 13, { align: "right" });
  doc.text(safe(report.projectName || project?.name || ""), PW - MR, 21, { align: "right" });
  doc.setTextColor(...C.darkGray);
  y = 40;

  // ── Info Grid ──
  const infoBox = (label, value, x, w) => {
    doc.setFillColor(...C.bg);
    doc.roundedRect(x, y, w, 16, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...C.medGray);
    doc.setFont("helvetica", "bold");
    doc.text(safe(label), x + 3, y + 5);
    doc.setFontSize(10);
    doc.setTextColor(...C.darkGray);
    doc.setFont("helvetica", "normal");
    doc.text(safe(value), x + 3, y + 12);
  };

  const colW = (CW - 6) / 3;
  infoBox("Foreman", report.foremanName || "—", ML, colW);
  infoBox("Weather", `${report.temperature || "—"}°F / ${report.weatherCondition || report.weather || "—"}`, ML + colW + 3, colW);
  infoBox("Crew on Site", String((report.teamPresent || []).length || report.teamSize || 0), ML + (colW + 3) * 2, colW);
  y += 20;

  // Project / GC info
  if (project) {
    const col2W = (CW - 3) / 2;
    infoBox("Project", project.name || "—", ML, col2W);
    infoBox("GC / Client", project.gc || "—", ML + col2W + 3, col2W);
    y += 20;
  }

  // Hours worked
  if (report.hoursWorked) {
    const col2W = (CW - 3) / 2;
    infoBox("Hours Worked", `${report.hoursWorked} hrs`, ML, col2W);
    infoBox("Report #", report.id || "—", ML + col2W + 3, col2W);
    y += 20;
  }

  // ── Section helper ──
  const sectionTitle = (title) => {
    checkPage(20);
    doc.setFillColor(...C.navy);
    doc.rect(ML, y, CW, 7, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(safe(title), ML + 3, y + 5);
    doc.setTextColor(...C.darkGray);
    doc.setFont("helvetica", "normal");
    y += 10;
  };

  const textBlock = (text) => {
    if (!text) return;
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(safe(text), CW - 6);
    lines.forEach(line => {
      checkPage(6);
      doc.text(line, ML + 3, y);
      y += 4.5;
    });
    y += 3;
  };

  // ── Crew Present ──
  if (report.teamPresent && report.teamPresent.length > 0) {
    sectionTitle("Crew on Site");
    doc.setFontSize(9);
    const teamNames = report.teamPresent.map((c, i) => `${i + 1}. ${typeof c === "string" ? c : c.name || "Worker"}`).join("   ");
    const teamLines = doc.splitTextToSize(safe(teamNames), CW - 6);
    teamLines.forEach(line => {
      checkPage(6);
      doc.text(line, ML + 3, y);
      y += 4.5;
    });
    y += 3;
  }

  // ── Work Performed ──
  if (report.workPerformed) {
    sectionTitle("Work Performed Today");
    // Quick tasks as tags
    if (report.quickTasks && report.quickTasks.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(...C.navy);
      doc.setFont("helvetica", "bold");
      doc.text("Tasks: " + report.quickTasks.join(", "), ML + 3, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.darkGray);
      y += 6;
    }
    textBlock(report.workPerformed);
  }

  // ── Materials Received ──
  if (report.materialsReceived) {
    sectionTitle("Materials Received");
    textBlock(report.materialsReceived);
  }

  // ── Equipment on Site ──
  if (report.equipmentOnSite) {
    sectionTitle("Equipment on Site");
    textBlock(report.equipmentOnSite);
  }

  // ── Visitors / Inspections ──
  if (report.visitors) {
    sectionTitle("Visitors / Inspections");
    textBlock(report.visitors);
  }

  // ── Safety ──
  sectionTitle("Safety");
  doc.setFontSize(9);
  if (report.safetyIncident) {
    doc.setTextColor(...C.red);
    doc.setFont("helvetica", "bold");
    doc.text("SAFETY INCIDENT REPORTED", ML + 3, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.darkGray);
    y += 6;
    textBlock(report.safetyDescription || "No description provided");
  } else {
    doc.setTextColor(...C.green);
    doc.text("No safety incidents reported", ML + 3, y);
    doc.setTextColor(...C.darkGray);
    y += 6;
  }

  // ── Issues / Delays ──
  if (report.issues) {
    sectionTitle("Issues / Delays");
    textBlock(report.issues);
  }

  // ── Tomorrow's Plan ──
  if (report.tomorrowPlan) {
    sectionTitle("Tomorrow's Plan");
    textBlock(report.tomorrowPlan);
  }

  // ── Photos ──
  if (report.photos && report.photos.length > 0) {
    sectionTitle(`Photos (${report.photos.length})`);
    report.photos.forEach((photo, i) => {
      checkPage(50);
      try {
        doc.addImage(photo.data || photo, "JPEG", ML + 3, y, 50, 38);
        if (photo.caption) {
          doc.setFontSize(7);
          doc.text(safe(photo.caption), ML + 56, y + 6);
        }
        y += 42;
      } catch (e) {
        doc.setFontSize(8);
        doc.text(`[Photo ${i + 1} - could not embed]`, ML + 3, y);
        y += 6;
      }
    });
  }

  // ── Footer ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...C.ltGray);
    doc.rect(0, PH - 12, PW, 12, "F");
    doc.setFontSize(7);
    doc.setTextColor(...C.medGray);
    doc.text("Eagles Brothers Constructors · Houston, TX · Confidential", ML, PH - 5);
    doc.text(`Page ${i} of ${pageCount}`, PW - MR, PH - 5, { align: "right" });
  }

  doc.save(`EBC-DailyReport-${safe(report.date)}-${safe((report.projectName || "project").replace(/\s+/g, "-"))}.pdf`);
}
