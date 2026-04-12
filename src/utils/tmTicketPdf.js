import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · T&M Ticket PDF Generator
//  Eagles Brothers Constructors · Houston, TX
//  Generates a signable T&M ticket with approval chain:
//    EBC PM → GC Superintendent → GC PM → EBC PM (final)
// ═══════════════════════════════════════════════════════════════

const C = {
  navy:     [30, 45, 59],
  amber:    [224, 148, 34],
  darkGray: [60, 60, 60],
  medGray:  [120, 120, 120],
  ltGray:   [200, 200, 200],
  white:    [255, 255, 255],
  bg:       [248, 248, 248],
  green:    [16, 185, 129],
  red:      [239, 68, 68],
};

const PW = 215.9;
const ML = 20;
const MR = 20;
const CW = PW - ML - MR;

function safe(str) {
  return String(str || "")
    .replace(/\u2014/g, "--")
    .replace(/\u2013/g, "-")
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    .replace(/[^\x00-\x7F]/g, "");
}

function fmtMoney(n) {
  return "$" + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Generate a T&M Ticket PDF
 * @param {object} ticket — { ticketNumber, description, date, area, laborEntries, materialEntries, photos, signature, approvals, ... }
 * @param {object} project — { name, address, gc, ... }
 * @param {object} opts — { download: true }
 */
export function generateTmTicketPdf(ticket, project, opts = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  let y = 20;

  const textLine = (label, val, x = ML, w = CW) => {
    doc.setFontSize(9);
    doc.setTextColor(...C.medGray);
    doc.text(safe(label), x, y);
    doc.setTextColor(...C.darkGray);
    doc.setFont("helvetica", "bold");
    doc.text(safe(val || "—"), x + 45, y);
    doc.setFont("helvetica", "normal");
    y += 5;
  };

  const checkPage = (need = 30) => {
    if (y + need > 260) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Header ──
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, 28, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("TIME & MATERIAL TICKET", ML, 14);
  doc.setFontSize(11);
  doc.text(safe(ticket.ticketNumber || "TM-000"), PW - MR, 14, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Eagles Brothers Constructors Inc.", ML, 22);
  doc.text(safe(ticket.date || new Date().toISOString().slice(0, 10)), PW - MR, 22, { align: "right" });

  y = 36;

  // ── Project Info ──
  doc.setFillColor(...C.bg);
  doc.rect(ML, y - 4, CW, 28, "F");
  textLine("Project:", project?.name || "Unknown");
  textLine("Address:", project?.address || "—");
  textLine("GC:", project?.gc || "—");
  textLine("Area/Location:", ticket.area || "—");
  textLine("Description:", ticket.description || "—");
  y += 4;

  // ── Labor Section ──
  const laborEntries = ticket.laborEntries || [];
  if (laborEntries.length > 0) {
    checkPage(20 + laborEntries.length * 6);
    doc.setFillColor(...C.navy);
    doc.rect(ML, y, CW, 7, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("LABOR", ML + 3, y + 5);
    doc.text("HOURS", ML + 80, y + 5);
    doc.text("RATE", ML + 105, y + 5);
    doc.text("TOTAL", ML + 135, y + 5, { align: "right" });
    y += 10;

    doc.setTextColor(...C.darkGray);
    doc.setFont("helvetica", "normal");
    let laborTotal = 0;
    for (const le of laborEntries) {
      const lineTotal = (le.hours || 0) * (le.rate || 0);
      laborTotal += lineTotal;
      doc.setFontSize(9);
      doc.text(safe(le.employeeName || le.description || "Labor"), ML + 3, y);
      doc.text(String(le.hours || 0), ML + 80, y);
      doc.text(fmtMoney(le.rate || 0), ML + 105, y);
      doc.text(fmtMoney(lineTotal), ML + 135, y, { align: "right" });
      if (le.description) {
        doc.setFontSize(7);
        doc.setTextColor(...C.medGray);
        doc.text(safe(le.description).slice(0, 80), ML + 5, y + 3.5);
        doc.setTextColor(...C.darkGray);
        y += 4;
      }
      y += 5;
    }
    // Labor subtotal
    doc.setDrawColor(...C.ltGray);
    doc.line(ML + 100, y - 1, ML + 135, y - 1);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Labor Subtotal:", ML + 80, y + 3);
    doc.text(fmtMoney(laborTotal), ML + 135, y + 3, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 10;
  }

  // ── Material Section ──
  const matEntries = ticket.materialEntries || [];
  if (matEntries.length > 0) {
    checkPage(20 + matEntries.length * 6);
    doc.setFillColor(...C.navy);
    doc.rect(ML, y, CW, 7, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("MATERIAL", ML + 3, y + 5);
    doc.text("QTY", ML + 80, y + 5);
    doc.text("UNIT COST", ML + 100, y + 5);
    doc.text("TOTAL", ML + 135, y + 5, { align: "right" });
    y += 10;

    doc.setTextColor(...C.darkGray);
    doc.setFont("helvetica", "normal");
    let matTotal = 0;
    for (const me of matEntries) {
      const base = (me.qty || 0) * (me.unitCost || 0);
      const markup = base * ((me.markup || 0) / 100);
      const lineTotal = base + markup;
      matTotal += lineTotal;
      doc.setFontSize(9);
      doc.text(safe(me.description || "Material"), ML + 3, y);
      doc.text(String(me.qty || 0), ML + 80, y);
      doc.text(fmtMoney(me.unitCost || 0), ML + 100, y);
      doc.text(fmtMoney(lineTotal), ML + 135, y, { align: "right" });
      if (me.markup) {
        doc.setFontSize(7);
        doc.setTextColor(...C.medGray);
        doc.text(`(+${me.markup}% markup)`, ML + 100, y + 3.5);
        doc.setTextColor(...C.darkGray);
        y += 4;
      }
      y += 5;
    }
    doc.setDrawColor(...C.ltGray);
    doc.line(ML + 100, y - 1, ML + 135, y - 1);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Material Subtotal:", ML + 75, y + 3);
    doc.text(fmtMoney(matTotal), ML + 135, y + 3, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 10;
  }

  // ── Grand Total ──
  const grandTotal =
    (ticket.laborEntries || []).reduce((s, e) => s + (e.hours || 0) * (e.rate || 0), 0) +
    (ticket.materialEntries || []).reduce((s, e) => {
      const base = (e.qty || 0) * (e.unitCost || 0);
      return s + base + base * ((e.markup || 0) / 100);
    }, 0);

  checkPage(15);
  doc.setFillColor(...C.amber);
  doc.rect(ML, y, CW, 9, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", ML + 3, y + 6.5);
  doc.text(fmtMoney(grandTotal), ML + 135, y + 6.5, { align: "right" });
  y += 16;

  // ── Approval Chain (4 signature blocks) ──
  checkPage(60);
  doc.setFontSize(10);
  doc.setTextColor(...C.navy);
  doc.setFont("helvetica", "bold");
  doc.text("APPROVAL CHAIN", ML, y);
  y += 6;

  const approvals = [
    { role: "EBC Project Manager", label: "1. EBC PM Approval" },
    { role: "GC Superintendent", label: "2. GC Superintendent" },
    { role: "GC Project Manager", label: "3. GC PM Approval" },
    { role: "EBC Project Manager (Final)", label: "4. EBC PM Final Approval" },
  ];

  for (const appr of approvals) {
    checkPage(18);
    doc.setFontSize(8);
    doc.setTextColor(...C.medGray);
    doc.setFont("helvetica", "bold");
    doc.text(safe(appr.label), ML, y);
    y += 4;

    // Find existing approval data
    const existing = (ticket.approvals || []).find(a => a.role === appr.role);

    // Signature line
    doc.setDrawColor(...C.ltGray);
    doc.line(ML, y + 8, ML + 70, y + 8);
    doc.line(ML + 80, y + 8, ML + 120, y + 8);
    doc.line(ML + 128, y + 8, ML + CW, y + 8);

    if (existing?.signedBy) {
      doc.setFontSize(9);
      doc.setTextColor(...C.darkGray);
      doc.text(safe(existing.signedBy), ML, y + 6);
      doc.text(safe(existing.signedAt?.slice(0, 10) || ""), ML + 80, y + 6);
      doc.setTextColor(...C.green);
      doc.text("APPROVED", ML + 128, y + 6);
      doc.setTextColor(...C.darkGray);
    }

    doc.setFontSize(7);
    doc.setTextColor(...C.medGray);
    doc.setFont("helvetica", "normal");
    doc.text("Signature / Print Name", ML, y + 11);
    doc.text("Date", ML + 80, y + 11);
    doc.text("Status", ML + 128, y + 11);
    y += 16;
  }

  // ── Footer ──
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  doc.text(
    `Generated by EBC-OS on ${new Date().toISOString().slice(0, 10)} — ${safe(ticket.ticketNumber)}`,
    PW / 2, 272,
    { align: "center" }
  );

  // ── Output ──
  const filename = `${safe(ticket.ticketNumber || "TM-000")}_${safe(project?.name || "project")}.pdf`;
  if (opts.download !== false) {
    doc.save(filename);
  }
  return doc;
}
