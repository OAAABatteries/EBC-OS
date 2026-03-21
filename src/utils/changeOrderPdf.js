import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Change Order PDF Generator
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

const C = {
  navy: [30, 45, 59],
  amber: [224, 148, 34],
  darkGray: [60, 60, 60],
  medGray: [120, 120, 120],
  ltGray: [200, 200, 200],
  white: [255, 255, 255],
  bg: [248, 248, 248],
  green: [16, 185, 129],
  red: [239, 68, 68],
};

const PW = 215.9;
const PH = 279.4;
const ML = 20;
const MR = 20;
const CW = PW - ML - MR;

function safe(str) {
  return String(str || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x00-\x7F]/g, (c) => c.charCodeAt(0) > 255 ? "" : c);
}

function fmt(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Generate a professional Change Order PDF.
 * @param {Object} project - The project object
 * @param {Object} co - The change order object
 * @param {Object} company - Company info { name, address, city, phone, email, license }
 */
export function generateChangeOrderPdf(project, co, company = {}) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  let y = 0;

  const companyName = company.name || "Eagles Brothers Constructors";
  const companyAddr = company.address || "Houston, TX";
  const companyPhone = company.phone || "";
  const companyEmail = company.email || "";
  const companyLicense = company.license || "";

  // ── Header band ──
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, 32, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(safe(companyName), ML, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const headerInfo = [companyAddr, companyPhone, companyEmail].filter(Boolean).join("  |  ");
  doc.text(safe(headerInfo), ML, 20);
  if (companyLicense) {
    doc.text(safe("License: " + companyLicense), ML, 26);
  }

  // ── "CHANGE ORDER" title ──
  y = 42;
  doc.setFillColor(...C.amber);
  doc.rect(ML, y, CW, 10, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("CHANGE ORDER", ML + 4, y + 7.5);

  const coNum = co.number || `CO-${String(co.id).padStart(3, "0")}`;
  doc.setFontSize(14);
  doc.text(safe(coNum), PW - MR - 4 - doc.getTextWidth(safe(coNum)), y + 7.5);
  y += 16;

  // ── Project & CO Info Table ──
  doc.setTextColor(...C.darkGray);
  doc.setFontSize(9);
  const labelX = ML;
  const valueX = ML + 35;
  const rightLabelX = ML + CW / 2 + 5;
  const rightValueX = ML + CW / 2 + 40;

  const infoRows = [
    ["Project:", safe(project.name || ""), "Date:", safe(co.date || "")],
    ["GC:", safe(project.gc || ""), "Status:", safe((co.status || "draft").toUpperCase())],
    ["Address:", safe(project.address || ""), "Type:", safe((co.type || "add").toUpperCase())],
    ["Contract:", fmt(project.contract || 0), "CO Amount:", fmt(co.amount || 0)],
  ];

  infoRows.forEach(([lbl1, val1, lbl2, val2]) => {
    doc.setFont("helvetica", "bold");
    doc.text(lbl1, labelX, y);
    doc.text(lbl2, rightLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(val1, valueX, y);
    doc.text(val2, rightValueX, y);
    y += 6;
  });

  y += 6;

  // ── Description Section ──
  doc.setFillColor(...C.navy);
  doc.rect(ML, y, CW, 7, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Description of Change", ML + 3, y + 5);
  y += 10;

  doc.setTextColor(...C.darkGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const descText = safe(co.description || "No description provided.");
  const descLines = doc.splitTextToSize(descText, CW - 6);
  descLines.forEach(line => {
    doc.text(line, ML + 3, y + 4);
    y += 5;
  });
  y += 4;

  // ── Notes Section (if any) ──
  if (co.notes) {
    doc.setFillColor(...C.navy);
    doc.rect(ML, y, CW, 7, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Notes", ML + 3, y + 5);
    y += 10;

    doc.setTextColor(...C.darkGray);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(safe(co.notes), CW - 6);
    notesLines.forEach(line => {
      doc.text(line, ML + 3, y + 4);
      y += 5;
    });
    y += 4;
  }

  // ── Cost Summary Box ──
  y += 6;
  doc.setFillColor(...C.bg);
  doc.rect(ML, y, CW, 28, "F");
  doc.setDrawColor(...C.ltGray);
  doc.rect(ML, y, CW, 28, "S");

  const summaryY = y + 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.darkGray);

  doc.text("Original Contract Value:", ML + 6, summaryY);
  doc.setFont("helvetica", "normal");
  doc.text(fmt(project.contract || 0), ML + 75, summaryY);

  doc.setFont("helvetica", "bold");
  const typeLabel = co.type === "deduct" ? "Deduction This CO:" : co.type === "no cost" ? "No Cost Change:" : "Addition This CO:";
  doc.text(typeLabel, ML + 6, summaryY + 7);
  doc.setFont("helvetica", "normal");
  const coAmt = co.type === "deduct" ? `-${fmt(Math.abs(co.amount || 0))}` : co.type === "no cost" ? "$0.00" : fmt(co.amount || 0);
  doc.text(coAmt, ML + 75, summaryY + 7);

  doc.setDrawColor(...C.navy);
  doc.line(ML + 6, summaryY + 11, ML + CW - 6, summaryY + 11);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Adjusted Contract Value:", ML + 6, summaryY + 18);
  const adjustedVal = (project.contract || 0) + (co.type === "no cost" ? 0 : (co.amount || 0));
  doc.text(fmt(adjustedVal), ML + 75, summaryY + 18);

  y += 36;

  // ── Signature Lines ──
  y = Math.max(y, 200); // Push signatures toward bottom
  if (y > 230) y = 230;

  doc.setFillColor(...C.navy);
  doc.rect(ML, y, CW, 7, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Authorization", ML + 3, y + 5);
  y += 14;

  doc.setTextColor(...C.darkGray);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  const sigW = (CW - 15) / 2;

  // Contractor signature
  doc.setDrawColor(...C.darkGray);
  doc.line(ML, y + 12, ML + sigW, y + 12);
  doc.text("Contractor Signature", ML, y + 17);
  doc.text("Date: _______________", ML, y + 23);

  // Owner/GC signature
  doc.line(ML + sigW + 15, y + 12, ML + sigW + 15 + sigW, y + 12);
  doc.text("Owner / GC Signature", ML + sigW + 15, y + 17);
  doc.text("Date: _______________", ML + sigW + 15, y + 23);

  // ── Footer ──
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  doc.text(
    safe(`${companyName} | ${coNum} | Generated ${new Date().toLocaleDateString()}`),
    PW / 2, PH - 10, { align: "center" }
  );

  // ── Save ──
  const filename = `${safe(project.name || "Project").replace(/\s+/g, "_")}_${coNum}.pdf`;
  doc.save(filename);
}
