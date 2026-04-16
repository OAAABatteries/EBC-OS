import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Change Order PDF Generator
//  Eagles Brothers Constructors · Houston, TX
//  GC-ready, signable document with full cost summary
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

const PW = 215.9;          // letter width mm
const PH = 279.4;          // letter height mm
const ML = 20;
const MR = 20;
const CW = PW - ML - MR;   // content width

// ── Text sanitizer (Helvetica doesn't support special chars) ──
function safe(str) {
  return String(str || "")
    .replace(/\u2014/g, "--")
    .replace(/\u2013/g, "-")
    .replace(/\u215B/g, "1/8")
    .replace(/\u00BC/g, "1/4")
    .replace(/\u00BD/g, "1/2")
    .replace(/\u00BE/g, "3/4")
    .replace(/\u215D/g, "5/8")
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00B2/g, "2")
    .replace(/[^\x00-\x7F]/g, (c) => c.charCodeAt(0) > 255 ? "" : c);
}

function fmt(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Load logo (white-on-navy) ──
async function loadLogo() {
  try {
    const resp = await fetch("/logo-ebc-white.png");
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL("image/png"), w: img.width, h: img.height });
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Generate a professional, GC-ready Change Order PDF.
 *
 * @param {Object}   project        - The project object (name, address, gc, contract)
 * @param {Object}   co             - The change order object
 * @param {Object}   company        - Company info { name, address, phone, email, license }
 * @param {Object[]} projectCOs     - All change orders for this project (for "Previous Approved COs")
 * @param {Object}   opts           - { displayNumber } — when set, overrides co.number on the header
 *                                    (used to keep the PDF in sync with per-project numbering shown in the app)
 */
export async function generateChangeOrderPdf(project, co, company = {}, projectCOs = [], opts = {}) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  let y = 0;

  const companyName  = company.name    || "Eagles Brothers Constructors";
  const companyAddr  = company.address || "7801 N Shepherd Dr, Suite 107, Houston, TX 77088";
  const companyPhone = company.phone   || "(346) 970-7093";
  const companyEmail = company.email   || "abner@ebconstructors.com";
  const companyLicense = company.license || "";

  // Display number — what the PM sees in the app (per-project index). Falls back to stored co.number.
  // Both are shown in the footer so the GC can cross-ref the internal record if there's a dispute.
  const coNum  = opts.displayNumber ? `CO #${opts.displayNumber}` : (co.number || `CO-${String(co.id || 1).padStart(3, "0")}`);
  const coInternalRef = (opts.displayNumber && co.number && co.number !== String(opts.displayNumber)) ? co.number : "";
  const coType = co.type   || "add";
  const coDateRaw = co.date || co.submitted || new Date().toISOString().slice(0, 10);
  // Format as MM/DD/YY
  const coDate = (() => {
    const d = new Date(coDateRaw + "T00:00:00");
    if (isNaN(d)) return coDateRaw;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  })();

  const logo = await loadLogo();

  // ── Page management ──
  function checkPage(needed = 20) {
    if (y + needed > PH - 25) {
      addFooter();
      doc.addPage();
      // Thin amber bar on continuation pages
      doc.setFillColor(...C.amber);
      doc.rect(0, 0, PW, 2, "F");
      y = 10;
    }
  }

  function addFooter() {
    doc.setFontSize(7);
    doc.setTextColor(...C.medGray);
    doc.text(
      safe(`${companyName}  |  ${coNum}  |  Generated ${new Date().toLocaleDateString()}`),
      PW / 2, PH - 8, { align: "center" }
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  HEADER — Navy band with logo + company info
  // ═══════════════════════════════════════════════════════════
  const headerH = 28;
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, headerH, "F");

  if (logo) {
    try {
      const aspect = logo.w / logo.h;
      const logoH = headerH - 6;
      const logoW = logoH * aspect;
      doc.addImage(logo.data, "PNG", ML, 3, logoW, logoH);
    } catch { /* fallback to text */ }
  }

  // Company info — right side of header
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(safe(companyAddr), PW - MR, 10, { align: "right" });
  doc.text(safe(companyPhone + "  |  " + companyEmail), PW - MR, 16, { align: "right" });
  if (companyLicense) {
    doc.text(safe("License: " + companyLicense), PW - MR, 22, { align: "right" });
  }

  // ═══════════════════════════════════════════════════════════
  //  CHANGE ORDER TITLE BAR
  // ═══════════════════════════════════════════════════════════
  y = headerH + 4;
  doc.setFillColor(...C.amber);
  doc.rect(ML, y, CW, 10, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("CHANGE ORDER", ML + 4, y + 7.5);
  doc.text(safe(coNum), PW - MR - 4, y + 7.5, { align: "right" });
  y += 16;

  // ═══════════════════════════════════════════════════════════
  //  STATUS STAMP — voided/approved/rejected need loud visual signal
  //  on the page so a PDF saved from an old snapshot can't be passed
  //  off as a live document.
  // ═══════════════════════════════════════════════════════════
  if (co.status === "deleted") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.setTextColor(239, 68, 68, 0.25); // red, low opacity not supported in jsPDF; use light color
    doc.setTextColor(245, 180, 180);
    // Diagonal watermark across the middle of the page (approx)
    doc.text("VOIDED", PW / 2, PH / 2, { align: "center", angle: -25 });
    // Also a visible banner at the top of the content
    doc.setFillColor(...C.red);
    doc.rect(ML, y, CW, 8, "F");
    doc.setFontSize(10);
    doc.setTextColor(...C.white);
    doc.text(`VOIDED${co.deletedAt ? " on " + String(co.deletedAt).slice(0, 10) : ""}${co.deletedBy ? " by " + co.deletedBy : ""}`, ML + 4, y + 5.5);
    if (co.deletedReason) {
      doc.setFontSize(8);
      doc.text(safe(`Reason: ${co.deletedReason}`), PW - MR - 4, y + 5.5, { align: "right" });
    }
    doc.setTextColor(...C.darkGray);
    y += 12;
  } else if (co.status === "rejected") {
    doc.setFillColor(...C.red);
    doc.rect(ML, y, CW, 8, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.white);
    doc.text("REJECTED", ML + 4, y + 5.5);
    if (co.rejectionReason) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(safe(`Reason: ${co.rejectionReason}`), PW - MR - 4, y + 5.5, { align: "right" });
    }
    doc.setTextColor(...C.darkGray);
    y += 12;
  } else if (co.status === "approved" && co.approved) {
    doc.setFillColor(...C.green);
    doc.rect(ML, y, CW, 8, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.white);
    doc.text(`APPROVED on ${safe(co.approved)}${co.approvedBy ? " by " + safe(co.approvedBy) : ""}`, ML + 4, y + 5.5);
    doc.setTextColor(...C.darkGray);
    y += 12;
  }

  // ═══════════════════════════════════════════════════════════
  //  PROJECT & CO INFO GRID
  // ═══════════════════════════════════════════════════════════
  doc.setTextColor(...C.darkGray);
  doc.setFontSize(9);

  const leftLabelX  = ML;
  const leftValueX  = ML + 32;
  const rightLabelX = ML + CW / 2 + 5;
  const rightValueX = ML + CW / 2 + 32;

  const infoRows = [
    ["Project:",  safe(project.name || ""),           "Date:",      safe(coDate)],
    ["Address:",  safe(project.address || ""),         "CO #:",      safe(coNum)],
    ["GC:",       safe(co.gc_company || project.gc || ""), "Reference:", safe(co.reference || "")],
  ];

  infoRows.forEach(([lbl1, val1, lbl2, val2]) => {
    doc.setFont("helvetica", "bold");
    doc.text(lbl1, leftLabelX, y);
    doc.text(lbl2, rightLabelX, y);
    doc.setFont("helvetica", "normal");
    // Wrap long values
    const leftLines = doc.splitTextToSize(val1, CW / 2 - 38);
    const rightLines = doc.splitTextToSize(val2, CW / 2 - 38);
    doc.text(leftLines[0] || "", leftValueX, y);
    doc.text(rightLines[0] || "", rightValueX, y);
    const extra = Math.max(leftLines.length, rightLines.length) - 1;
    for (let i = 1; i <= extra; i++) {
      y += 5;
      if (leftLines[i]) doc.text(leftLines[i], leftValueX, y);
      if (rightLines[i]) doc.text(rightLines[i], rightValueX, y);
    }
    y += 6;
  });

  // Type badge
  doc.setFont("helvetica", "bold");
  doc.text("Type:", leftLabelX, y);
  const typeLabel = coType === "deduct" ? "DEDUCT" : coType === "no_cost" ? "NO COST" : "ADD";
  const typeBg = coType === "deduct" ? C.red : coType === "no_cost" ? C.medGray : C.green;
  const tw = doc.getTextWidth(typeLabel) + 6;
  doc.setFillColor(...typeBg);
  doc.roundedRect(leftValueX - 1, y - 4, tw, 6, 1, 1, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.text(typeLabel, leftValueX + 2, y);
  doc.setTextColor(...C.darkGray);
  doc.setFontSize(9);
  y += 10;

  // ═══════════════════════════════════════════════════════════
  //  DESCRIPTION OF CHANGE
  // ═══════════════════════════════════════════════════════════
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

  // General description
  const descText = safe(co.description || co.desc || "");
  if (descText) {
    const descLines = doc.splitTextToSize(descText, CW - 8);
    descLines.forEach((line) => {
      checkPage(6);
      doc.text(line, ML + 4, y + 4);
      y += 5;
    });
    y += 3;
  }

  // Scope items (bullet points)
  const scopeItems = co.scope_items || [];
  if (scopeItems.length > 0) {
    scopeItems.forEach((item) => {
      checkPage(8);
      const text = typeof item === "string" ? item : (item.description || "");
      const lines = doc.splitTextToSize(safe(text), CW - 18);
      // Bullet (filled circle — safe for Helvetica)
      doc.setFontSize(9);
      doc.setFillColor(...C.darkGray);
      doc.circle(ML + 7, y + 2.5, 0.8, "F");
      lines.forEach((line, i) => {
        doc.text(line, ML + 12, y + 4);
        if (i < lines.length - 1) y += 5;
      });
      y += 6;
    });
  }

  y += 2;

  // ═══════════════════════════════════════════════════════════
  //  NOTES (if any)
  // ═══════════════════════════════════════════════════════════
  if (co.notes) {
    checkPage(20);
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
    const notesLines = doc.splitTextToSize(safe(co.notes), CW - 8);
    notesLines.forEach((line) => {
      checkPage(6);
      doc.text(line, ML + 4, y + 4);
      y += 5;
    });
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════
  //  COST SUMMARY BOX
  // ═══════════════════════════════════════════════════════════
  checkPage(42);
  y += 4;

  doc.setFillColor(...C.navy);
  doc.rect(ML, y, CW, 7, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Cost Summary", ML + 3, y + 5);
  y += 10;

  // Calculate previous approved COs (exclude current CO, only status=approved)
  const prevApprovedCOs = projectCOs.filter(
    (c) => c.id !== co.id && c.status === "approved"
  );
  const prevCOTotal = prevApprovedCOs.reduce((sum, c) => {
    const t = c.type || "add";
    const amt = Math.abs(Number(c.amount || 0));
    return sum + (t === "deduct" ? -amt : t === "no_cost" ? 0 : amt);
  }, 0);

  const originalContract = Number(project.contract || 0);
  const thisCOAmount = coType === "no_cost" ? 0 : (coType === "deduct" ? -Math.abs(Number(co.amount || 0)) : Number(co.amount || 0));
  const newContractTotal = originalContract + prevCOTotal + thisCOAmount;

  const boxH = 32;
  doc.setFillColor(...C.bg);
  doc.rect(ML, y, CW, boxH, "F");
  doc.setDrawColor(...C.ltGray);
  doc.rect(ML, y, CW, boxH, "S");

  const labelCol = ML + 8;
  const valueCol = ML + CW - 8;
  let sy = y + 7;

  doc.setFontSize(9);
  doc.setTextColor(...C.darkGray);

  // Original Contract
  doc.setFont("helvetica", "normal");
  doc.text("Original Contract Value:", labelCol, sy);
  doc.text(fmt(originalContract), valueCol, sy, { align: "right" });
  sy += 7;

  // Previous Approved COs
  doc.text("Previous Approved COs:", labelCol, sy);
  doc.text(prevCOTotal === 0 ? "$0.00" : fmt(prevCOTotal), valueCol, sy, { align: "right" });
  sy += 7;

  // This CO
  doc.setFont("helvetica", "bold");
  const thisLabel = coType === "deduct" ? "This Change Order (Deduct):" : coType === "no_cost" ? "This Change Order (No Cost):" : "This Change Order (Add):";
  doc.text(thisLabel, labelCol, sy);
  const thisFmt = coType === "no_cost" ? "$0.00" : coType === "deduct" ? `(${fmt(Math.abs(thisCOAmount))})` : fmt(thisCOAmount);
  doc.text(thisFmt, valueCol, sy, { align: "right" });
  sy += 3;

  // Divider line
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.5);
  doc.line(labelCol, sy, valueCol, sy);
  sy += 6;

  // New Contract Total
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("New Contract Total:", labelCol, sy);
  doc.text(fmt(newContractTotal), valueCol, sy, { align: "right" });

  if (coType === "no_cost") {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...C.medGray);
    doc.text("No change to contract value", labelCol, sy + 5);
    doc.setTextColor(...C.darkGray);
  }

  y += boxH + 8;

  // ═══════════════════════════════════════════════════════════
  //  AUTHORIZATION / APPROVAL BLOCK
  // ═══════════════════════════════════════════════════════════
  checkPage(55);

  doc.setFillColor(...C.navy);
  doc.rect(ML, y, CW, 7, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Authorization", ML + 3, y + 5);
  y += 12;

  doc.setTextColor(...C.darkGray);
  const sigW = (CW - 20) / 2;

  // ── Subcontractor (EBC) side ──
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Subcontractor:", ML, y);
  doc.setFont("helvetica", "normal");
  doc.text(safe(companyName), ML, y + 5);

  // Signature line
  doc.setDrawColor(...C.darkGray);
  doc.setLineWidth(0.3);
  doc.line(ML, y + 18, ML + sigW, y + 18);
  doc.setFontSize(7);
  doc.text("Authorized Signature", ML, y + 22);
  doc.text("Date: _______________", ML, y + 27);
  // Pre-fill approval stamp on already-approved COs — replaces the blank sig line with
  // a recorded-approval note so the PDF doesn't look like a pending document to the GC.
  if (co.status === "approved" && co.approved) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...C.green);
    const stamp = `Approved in system on ${safe(co.approved)}${co.approvedBy ? " by " + safe(co.approvedBy) : ""}`;
    doc.text(stamp, ML, y + 14);
    doc.setTextColor(...C.darkGray);
    doc.setFont("helvetica", "normal");
  }

  // ── General Contractor side ──
  const gcX = ML + sigW + 20;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("General Contractor:", gcX, y);
  doc.setFont("helvetica", "normal");
  const gcLabel = safe(co.gc_name || co.gc_company || project.gc || "");
  if (gcLabel) doc.text(gcLabel, gcX, y + 5);

  // Signature line
  doc.line(gcX, y + 18, gcX + sigW, y + 18);
  doc.setFontSize(7);
  doc.text("Authorized Signature", gcX, y + 22);
  doc.text("Date: _______________", gcX, y + 27);

  y += 34;

  // ── Approval clause ──
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...C.medGray);
  doc.text(
    "This Change Order is not valid or billable until approved in writing by both parties.",
    PW / 2, y, { align: "center" }
  );
  y += 6;

  // ═══════════════════════════════════════════════════════════
  //  CONTACT FOOTER
  // ═══════════════════════════════════════════════════════════
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.medGray);
  const contactLine = `*If you have any questions, please contact ${safe(companyPhone)} or ${safe(companyEmail)}. Thank you.`;
  doc.text(contactLine, PW / 2, PH - 16, { align: "center" });

  // ═══════════════════════════════════════════════════════════
  //  PAGE FOOTER (all pages)
  // ═══════════════════════════════════════════════════════════
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...C.medGray);
    const refSuffix = coInternalRef ? `  (Internal: ${safe(coInternalRef)})` : "";
    doc.text(
      safe(`${companyName}  |  ${safe(project.name || "Project")}  |  ${coNum}${refSuffix}`),
      ML, PH - 8
    );
    doc.text(`Page ${i} of ${pageCount}`, PW - MR, PH - 8, { align: "right" });
  }

  // ═══════════════════════════════════════════════════════════
  //  SAVE
  // ═══════════════════════════════════════════════════════════
  const filename = `${safe(project.name || "Project").replace(/\s+/g, "_")}_${coNum}.pdf`;
  doc.save(filename);
}
