import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Submittal Package PDF Generator
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

const C = {
  navy:    [10, 22, 40],
  navyMid: [30, 45, 70],
  amber:   [224, 148, 34],
  darkGray:[60, 60, 60],
  medGray: [120, 120, 120],
  ltGray:  [200, 200, 200],
  xltGray: [240, 240, 242],
  white:   [255, 255, 255],
  green:   [16, 185, 129],
  red:     [239, 68, 68],
  amber2:  [245, 158, 11],
};

const PW = 215.9;   // letter width mm
const PH = 279.4;   // letter height mm
const ML = 18;
const MR = 18;
const CW = PW - ML - MR;

function safe(str) {
  return String(str || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x00-\x7F]/g, (c) => c.charCodeAt(0) > 255 ? "" : c);
}

function cap(str) {
  return String(str || "").replace(/\b\w/g, c => c.toUpperCase());
}

const STATUS_COLORS = {
  "approved":           { bg: [16, 185, 129],  text: [255, 255, 255] },
  "submitted":          { bg: [59, 130, 246],  text: [255, 255, 255] },
  "distributed":        { bg: [16, 185, 129],  text: [255, 255, 255] },
  "pending":            { bg: [120, 120, 120], text: [255, 255, 255] },
  "revise & resubmit":  { bg: [249, 115, 22],  text: [255, 255, 255] },
  "rejected":           { bg: [239, 68, 68],   text: [255, 255, 255] },
  "in progress":        { bg: [59, 130, 246],  text: [255, 255, 255] },
  "not started":        { bg: [100, 116, 139], text: [255, 255, 255] },
};

function statusColors(st) {
  return STATUS_COLORS[String(st).toLowerCase()] || { bg: [150, 150, 150], text: [255, 255, 255] };
}

/** Try to load /logo-ebc-white.png as a base64 data URL. Returns null on failure. */
async function loadLogoDataUrl() {
  try {
    const resp = await fetch("/logo-ebc-white.png");
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Generate a professional Submittal Package PDF.
 * @param {Object} project      - The project record
 * @param {Array}  submittals   - Filtered submittals for this project
 * @param {Array}  contacts     - All contacts (for GC contact lookup)
 * @param {Object} company      - Company info override (optional)
 */
export async function generateSubmittalsPackagePdf(project, submittals = [], contacts = [], company = {}) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });

  // ── Company defaults ──
  const companyName  = company.name    || "Eagles Brothers Constructors";
  const companyAddr  = company.address || "Houston, TX";
  const companyPhone = company.phone   || "(346) 970-7093";
  const companyEmail = company.email   || "abner@ebconstructors.com";
  const companyPM    = company.pm      || "Abner Aguilar";

  // ── Logo (load actual PNG; fall back to bold text) ──
  const logoDataUrl = await loadLogoDataUrl();

  // ── GC contact lookup ──
  const gcName = safe(project.gc || "");
  const gcContact = contacts.find(c =>
    String(c.company || "").toLowerCase() === gcName.toLowerCase()
  );
  const gcContactName  = safe(gcContact?.name  || project.contact || "");
  const gcContactPhone = safe(gcContact?.phone || "");
  const gcContactEmail = safe(gcContact?.email || "");

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // ════════════════════════════════════════════════════════════
  //  PAGE 1 — COVER SHEET
  // ════════════════════════════════════════════════════════════

  // ── Full-width navy header band ──
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, 44, "F");

  // ── Logo or text in header ──
  if (logoDataUrl) {
    // Logo: 500×149px → aspect 3.356:1. Target height 18mm → width ~60mm
    const logoH = 18;
    const logoW = logoH * (500 / 149);
    doc.addImage(logoDataUrl, "PNG", ML, 5, logoW, logoH);

    // Tagline below logo
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 195, 215);
    doc.text("DRYWALL  ·  FRAMING  ·  INTERIOR CONSTRUCTION", ML, 27);
  } else {
    // Fallback: bold text
    doc.setTextColor(...C.white);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(safe(companyName.toUpperCase()), ML, 15);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 210, 225);
    doc.text("DRYWALL · FRAMING · INTERIOR CONSTRUCTION", ML, 21);
  }

  // Contact info right-aligned in header
  doc.setTextColor(200, 210, 225);
  doc.setFontSize(8);
  const rightX = PW - MR;
  doc.text(safe(companyPM),    rightX, 13, { align: "right" });
  doc.text(safe(companyEmail), rightX, 19, { align: "right" });
  doc.text(safe(companyPhone), rightX, 25, { align: "right" });
  doc.text("Houston, TX",      rightX, 31, { align: "right" });

  // Amber accent stripe
  doc.setFillColor(...C.amber);
  doc.rect(0, 44, PW, 3.5, "F");

  // ── "SUBMITTAL PACKAGE" title band ──
  let y = 55;
  doc.setFillColor(...C.navyMid);
  doc.rect(ML, y, CW, 14, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SUBMITTAL PACKAGE", ML + 5, y + 10);

  // Date badge top-right of title band
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.amber2);
  doc.text(safe(today), PW - MR - 2, y + 10, { align: "right" });

  y += 22;

  // ── Project Info Block ──
  const infoRows = [
    ["Project",         safe(project.name || "—")],
    ["Address",         safe(project.address || "—")],
    ["General Contractor", safe(project.gc || "—")],
    ["GC Contact",      gcContactName  || "—"],
    ["GC Phone",        gcContactPhone || "—"],
    ["GC Email",        gcContactEmail || "—"],
  ];

  doc.setFontSize(9);
  const lblW = 52;
  const rowH = 8;

  infoRows.forEach(([lbl, val], i) => {
    const rowY = y + i * rowH;
    if (i % 2 === 0) {
      doc.setFillColor(...C.xltGray);
      doc.rect(ML, rowY, CW, rowH, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.navyMid);
    doc.text(safe(lbl), ML + 3, rowY + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.darkGray);
    doc.text(safe(val), ML + lblW, rowY + 5.5);
  });

  y += infoRows.length * rowH + 10;

  // Separator
  doc.setDrawColor(...C.amber);
  doc.setLineWidth(0.8);
  doc.line(ML, y, PW - MR, y);
  y += 8;

  // ── Subcontractor Info Block ──
  doc.setFillColor(...C.navy);
  doc.rect(ML, y, CW, 7, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("SUBMITTED BY", ML + 3, y + 5);
  y += 10;

  const subRows = [
    ["Company",  companyName],
    ["Contact",  companyPM],
    ["Email",    companyEmail],
    ["Phone",    companyPhone],
    ["Location", companyAddr],
  ];
  subRows.forEach(([lbl, val], i) => {
    const rowY = y + i * rowH;
    if (i % 2 === 0) {
      doc.setFillColor(...C.xltGray);
      doc.rect(ML, rowY, CW, rowH, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.navyMid);
    doc.text(safe(lbl), ML + 3, rowY + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.darkGray);
    doc.text(safe(val), ML + lblW, rowY + 5.5);
  });

  y += subRows.length * rowH + 12;

  // ── Table of Contents ──
  doc.setFillColor(...C.navy);
  doc.rect(ML, y, CW, 7, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TABLE OF CONTENTS", ML + 3, y + 5);
  y += 10;

  // TOC header row
  doc.setFillColor(...C.navyMid);
  doc.rect(ML, y, CW, 6.5, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("#",          ML + 2,   y + 4.5);
  doc.text("Spec",       ML + 10,  y + 4.5);
  doc.text("Description",ML + 28,  y + 4.5);
  doc.text("Type",       ML + 110, y + 4.5);
  doc.text("Status",     ML + 138, y + 4.5);
  y += 6.5;

  // TOC rows
  const tocRowH = 6;
  submittals.forEach((s, i) => {
    if (y + tocRowH > PH - 20) {
      doc.addPage();
      y = 20;
    }
    if (i % 2 === 0) {
      doc.setFillColor(...C.xltGray);
      doc.rect(ML, y, CW, tocRowH, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.darkGray);
    doc.text(safe(String(s.number || i + 1)), ML + 2,   y + 4);
    doc.text(safe(s.specSection || s.spec || "—"), ML + 10, y + 4);

    const descStr = safe(s.description || s.name || "—");
    const descTrunc = doc.getTextWidth(descStr) > 78 ? descStr.substring(0, 45) + "..." : descStr;
    doc.text(descTrunc, ML + 28, y + 4);

    doc.text(safe(cap(s.type || "—")), ML + 110, y + 4);

    const sc = statusColors(s.status);
    const stLabel = cap(s.status || "—");
    const stW = Math.max(doc.getTextWidth(stLabel) + 4, 22);
    doc.setFillColor(...sc.bg);
    doc.roundedRect(ML + 138, y + 0.5, stW, 5, 1, 1, "F");
    doc.setTextColor(...sc.text);
    doc.setFontSize(7);
    doc.text(stLabel, ML + 138 + stW / 2, y + 4, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(...C.darkGray);

    y += tocRowH;
  });

  y += 6;

  // ── Summary stats ──
  const totalCount    = submittals.length;
  const approvedCount = submittals.filter(s => s.status === "approved").length;
  const pendingCount  = submittals.filter(s => !["approved"].includes(s.status)).length;
  const actionCount   = submittals.filter(s => ["revise & resubmit", "rejected"].includes(s.status)).length;

  if (y + 16 > PH - 20) { doc.addPage(); y = 20; }

  doc.setFillColor(...C.xltGray);
  doc.rect(ML, y, CW, 14, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.navyMid);
  const statsY = y + 9;
  doc.text(`Total: ${totalCount}`,       ML + 5,  statsY);
  doc.setTextColor(...C.green);
  doc.text(`Approved: ${approvedCount}`, ML + 38, statsY);
  doc.setTextColor(180, 110, 0);
  doc.text(`Pending: ${pendingCount}`,   ML + 80, statsY);
  if (actionCount > 0) {
    doc.setTextColor(...C.red);
    doc.text(`Action Required: ${actionCount}`, ML + 120, statsY);
  }
  y += 20;

  // ── Footer on page 1 ──
  _footer(doc, companyName, "Cover Sheet");

  // ════════════════════════════════════════════════════════════
  //  PAGE 2+ — SUBMITTAL LOG DETAIL
  // ════════════════════════════════════════════════════════════
  if (submittals.length > 0) {
    doc.addPage();
    y = 20;

    // Page header
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, PW, 14, "F");
    doc.setFillColor(...C.amber);
    doc.rect(0, 14, PW, 2.5, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("SUBMITTAL LOG — " + safe(project.name || ""), ML, 10);
    y = 22;

    // Detail table header
    _drawTableHeader(doc, y);
    y += 7;

    submittals.forEach((s, i) => {
      const rowNeeded = 10;
      if (y + rowNeeded > PH - 22) {
        _footer(doc, companyName, `Submittal Log — page ${doc.getCurrentPageInfo().pageNumber}`);
        doc.addPage();
        doc.setFillColor(...C.navy);
        doc.rect(0, 0, PW, 10, "F");
        doc.setFillColor(...C.amber);
        doc.rect(0, 10, PW, 2, "F");
        doc.setTextColor(...C.white);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("SUBMITTAL LOG (cont.) — " + safe(project.name || ""), ML, 7.5);
        y = 16;
        _drawTableHeader(doc, y);
        y += 7;
      }

      if (i % 2 === 0) {
        doc.setFillColor(...C.xltGray);
        doc.rect(ML, y, CW, rowNeeded, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.darkGray);

      const cols = _rowCols();
      doc.text(safe(String(s.number || i + 1)), ML + cols.num,  y + 6.5);
      doc.text(safe(s.specSection || s.spec || "—"), ML + cols.spec, y + 6.5);

      const desc = safe(s.description || s.name || "—");
      const descMax = doc.getTextWidth(desc) > 60 ? desc.substring(0, 43) + "..." : desc;
      doc.text(descMax, ML + cols.desc, y + 6.5);

      doc.text(safe(cap(s.type || "—")), ML + cols.type, y + 6.5);

      const sc = statusColors(s.status);
      const stLabel = cap(s.status || "—");
      const stW = Math.max(doc.getTextWidth(stLabel) + 4, 22);
      doc.setFillColor(...sc.bg);
      doc.roundedRect(ML + cols.status, y + 1.5, stW, 6, 1, 1, "F");
      doc.setTextColor(...sc.text);
      doc.setFontSize(7);
      doc.text(stLabel, ML + cols.status + stW / 2, y + 6, { align: "center" });

      doc.setFontSize(8);
      doc.setTextColor(...C.darkGray);
      doc.text(safe(s.dateSubmitted || s.date || "—"), ML + cols.submitted, y + 6.5);
      doc.text(safe(s.dateReturned  || "—"),           ML + cols.returned,  y + 6.5);

      y += rowNeeded;

      // Notes sub-row (if any)
      if (s.notes) {
        const noteText = "Notes: " + safe(s.notes);
        const noteLines = doc.splitTextToSize(noteText, CW - 12);
        const noteH = noteLines.length * 4 + 3;
        doc.setFillColor(250, 250, 250);
        doc.rect(ML, y, CW, noteH, "F");
        doc.setFontSize(7);
        doc.setTextColor(...C.medGray);
        doc.setFont("helvetica", "italic");
        noteLines.forEach((line, li) => {
          doc.text(line, ML + 5, y + 3.5 + li * 4);
        });
        doc.setFont("helvetica", "normal");
        y += noteH;
      }

      doc.setDrawColor(...C.ltGray);
      doc.setLineWidth(0.2);
      doc.line(ML, y, PW - MR, y);
    });

    _footer(doc, companyName, `Submittal Log — ${submittals.length} items`);
  }

  // ── Save ──
  const filename = safe((project.name || "Project").replace(/\s+/g, "_")) + "_Submittal_Package.pdf";
  doc.save(filename);
}

// ── Helper: draw detail table header ──
function _drawTableHeader(doc, y) {
  doc.setFillColor(30, 45, 70);
  doc.rect(ML, y, CW, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  const cols = _rowCols();
  doc.text("#",           ML + cols.num,       y + 5);
  doc.text("Spec",        ML + cols.spec,      y + 5);
  doc.text("Description", ML + cols.desc,      y + 5);
  doc.text("Type",        ML + cols.type,      y + 5);
  doc.text("Status",      ML + cols.status,    y + 5);
  doc.text("Submitted",   ML + cols.submitted, y + 5);
  doc.text("Returned",    ML + cols.returned,  y + 5);
}

function _rowCols() {
  return { num: 1, spec: 9, desc: 28, type: 93, status: 119, submitted: 151, returned: 170 };
}

// ── Helper: page footer ──
function _footer(doc, companyName, label) {
  const pageNum = doc.getCurrentPageInfo().pageNumber;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text(
    safe(`${companyName}  |  ${label}  |  Page ${pageNum}  |  Generated ${new Date().toLocaleDateString()}`),
    PW / 2, PH - 7, { align: "center" }
  );
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(ML, PH - 12, PW - MR, PH - 12);
}
