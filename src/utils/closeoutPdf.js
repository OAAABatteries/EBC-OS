import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Closeout Package PDF Generator
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
const ML = 18;
const MR = 18;
const CW = PW - ML - MR;

function safe(str) {
  return String(str || "").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-");
}

function fmt(n) {
  return "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Generate a closeout package PDF for a project.
 * @param {Object} project - The project object
 * @param {Object} data - { rfis, submittals, changeOrders, invoices, dailyReports, jsas, tmTickets, punchItems, closeoutResult }
 */
export function generateCloseoutPdf(project, data) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  let y = 0;

  const addPage = () => { doc.addPage(); y = 20; };
  const checkPage = (needed = 30) => { if (y > 250) addPage(); };

  const drawHeader = (title) => {
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, PW, 28, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Eagles Brothers Constructors", ML, 12);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(safe(title), ML, 20);
    doc.setTextColor(...C.darkGray);
    y = 36;
  };

  const sectionTitle = (text) => {
    checkPage(20);
    doc.setFillColor(...C.amber);
    doc.rect(ML, y, CW, 7, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(safe(text), ML + 3, y + 5);
    doc.setTextColor(...C.darkGray);
    y += 10;
  };

  const tableRow = (cols, widths, bold = false) => {
    checkPage(8);
    doc.setFontSize(8);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    cols.forEach((col, i) => {
      const x = ML + widths.slice(0, i).reduce((s, w) => s + w, 0);
      doc.text(safe(col).slice(0, 50), x + 1, y + 4);
    });
    if (bold) {
      doc.setDrawColor(...C.ltGray);
      doc.line(ML, y + 6, ML + CW, y + 6);
    }
    y += 7;
  };

  const textLine = (label, value) => {
    checkPage(8);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(safe(label) + ": ", ML, y + 4);
    doc.setFont("helvetica", "normal");
    doc.text(safe(String(value)), ML + doc.getTextWidth(safe(label) + ": "), y + 4);
    y += 6;
  };

  // ── Cover Page ──
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, 80, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Project Closeout Package", ML, 35);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(safe(project.name || project.project || "Project"), ML, 50);
  doc.setFontSize(10);
  doc.text(safe(project.gc || ""), ML, 60);
  doc.text("Generated: " + new Date().toLocaleDateString(), ML, 70);

  doc.setTextColor(...C.darkGray);
  y = 95;

  // Project summary
  textLine("Contract Value", fmt(project.contract));
  textLine("PM Assigned", project.pm || "—");
  textLine("Phase", project.phase || "—");
  textLine("Start", project.start || "—");
  textLine("End", project.end || "—");
  textLine("Progress", (project.progress || 0) + "%");
  y += 4;

  // Financial summary
  const totalBilled = (data.invoices || []).reduce((s, i) => s + (i.amount || 0), 0);
  const totalCOs = (data.changeOrders || []).filter(c => c.status === "approved").reduce((s, c) => s + (c.amount || 0), 0);
  const adjustedContract = (project.contract || 0) + totalCOs;
  const remaining = adjustedContract - totalBilled;

  textLine("Total Billed", fmt(totalBilled));
  textLine("All Change Orders", fmt((data.changeOrders || []).reduce((s, c) => s + (c.amount || 0), 0)) + ` (${(data.changeOrders || []).length} total)`);
  textLine("Approved Change Orders", fmt(totalCOs) + ` (${(data.changeOrders || []).filter(c => c.status === "approved").length})`);
  textLine("Adjusted Contract", fmt(adjustedContract));
  textLine("Remaining to Bill", fmt(remaining));
  const retHeld = data.closeoutResult?.financialStatus?.retainage || Math.round(adjustedContract * 0.10);
  textLine("Retainage Held (est)", fmt(retHeld));
  const paidTotal = (data.invoices || []).filter(i => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
  textLine("Total Paid", fmt(paidTotal));

  // ── Closeout Checklist (from AI if available) ──
  if (data.closeoutResult) {
    addPage();
    drawHeader("Closeout Analysis");
    const cr = data.closeoutResult;

    if (cr.readinessScore !== undefined) {
      textLine("Readiness Score", cr.readinessScore + "/100 — Grade: " + (cr.grade || ""));
    }
    if (cr.summary) {
      y += 2;
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(safe(cr.summary), CW);
      doc.text(lines, ML, y);
      y += lines.length * 4 + 4;
    }

    if (cr.checklist?.length > 0) {
      sectionTitle("Closeout Checklist");
      const cw = [6, 72, 18, 24, 18, 40];
      tableRow(["#", "Item", "Status", "Date", "Resp", "Notes"], cw, true);
      cr.checklist.forEach((item, i) => {
        checkPage(8);
        const mark = item.status === "complete" ? "[X]" : "[ ]";
        tableRow([String(i + 1), safe(item.item || item.description), mark, item.dateCompleted || "", item.responsible || "", (item.notes || "").slice(0, 30)], cw);
      });
      y += 4;
      const doneCount = cr.checklist.filter(c => c.status === "complete").length;
      textLine("Completion", doneCount + " of " + cr.checklist.length + " (" + Math.round((doneCount / cr.checklist.length) * 100) + "%)");
    }
  }

  // ── RFI Log ──
  if ((data.rfis || []).length > 0) {
    addPage();
    drawHeader("RFI Log");
    const w = [20, 80, 30, 50];
    tableRow(["RFI #", "Subject", "Status", "Date"], w, true);
    data.rfis.forEach(r => tableRow([r.number || "", r.subject || r.desc || "", r.status || "", r.date || r.submittedDate || ""], w));
  }

  // ── Submittal Log ──
  if ((data.submittals || []).length > 0) {
    addPage();
    drawHeader("Submittal Log");
    const w = [20, 70, 30, 30, 30];
    tableRow(["Sub #", "Description", "Spec", "Status", "Date"], w, true);
    data.submittals.forEach(s => tableRow([s.number || "", s.description || s.desc || "", s.specSection || "", s.status || "", s.submittedDate || ""], w));
  }

  // ── Change Order Log ──
  if ((data.changeOrders || []).length > 0) {
    addPage();
    drawHeader("Change Order Log");
    const w = [20, 70, 30, 30, 30];
    tableRow(["CO #", "Description", "Amount", "Status", "Date"], w, true);
    data.changeOrders.forEach(c => tableRow([c.number || "", c.desc || "", fmt(c.amount), c.status || "", c.date || ""], w));
  }

  // ── Invoice Summary ──
  if ((data.invoices || []).length > 0) {
    addPage();
    drawHeader("Invoice Summary");
    const w = [25, 60, 30, 30, 35];
    tableRow(["Invoice #", "Project", "Amount", "Status", "Date"], w, true);
    data.invoices.forEach(i => tableRow([i.number || "", project.name || "", fmt(i.amount), i.status || "", i.date || ""], w));
    y += 4;
    textLine("Total Billed", fmt(totalBilled));
    textLine("Total Paid", fmt((data.invoices || []).filter(i => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0)));
  }

  // ── Punch List ──
  if ((data.punchItems || []).length > 0) {
    addPage();
    drawHeader("Punch List");
    const total = data.punchItems.length;
    const done = data.punchItems.filter(p => p.status === "complete").length;
    textLine("Total Items", total);
    textLine("Completed", done + " (" + Math.round((done / total) * 100) + "%)");
    y += 4;
    const w = [70, 30, 35, 30];
    tableRow(["Description", "Location", "Assigned", "Status"], w, true);
    data.punchItems.forEach(p => tableRow([p.description || "", p.location || "", p.assignedTo || "", p.status || ""], w));
  }

  // ── Daily Report Summary ──
  if ((data.dailyReports || []).length > 0) {
    addPage();
    drawHeader("Daily Reports Summary");
    textLine("Total Reports", data.dailyReports.length);
    const w = [25, 15, 15, 120];
    tableRow(["Date", "Crew", "Hours", "Work Performed"], w, true);
    data.dailyReports.slice(0, 30).forEach(d => tableRow([d.date || "", String(d.teamSize || ""), String(d.hours || ""), (d.work || "").slice(0, 80)], w));
    if (data.dailyReports.length > 30) {
      doc.setFontSize(8);
      doc.text(`... and ${data.dailyReports.length - 30} more reports`, ML, y + 4);
      y += 6;
    }
  }

  // ── Footer on all pages ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...C.medGray);
    doc.text(`Eagles Brothers Constructors — ${safe(project.name)} — Closeout Package`, ML, 272);
    doc.text(`Page ${i} of ${pageCount}`, PW - MR - 20, 272);
  }

  doc.save(`${safe(project.name || "Project")}_Closeout_Package.pdf`);
}
