import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════════════════════════
//  Professional Proposal PDF Generator
//  Generates a polished, branded proposal matching EBC standards
// ═══════════════════════════════════════════════════════════════

const COLORS = {
  navy: [30, 45, 59],         // EBC brand navy from website
  orange: [255, 127, 33],     // EBC accent orange from website
  darkOrange: [210, 100, 20],
  gold: [224, 148, 34],       // legacy gold
  black: [30, 30, 30],
  darkGray: [60, 60, 60],
  medGray: [120, 120, 120],
  lightGray: [200, 200, 200],
  bgLight: [248, 248, 248],
  white: [255, 255, 255],
  accent: [30, 45, 59],       // dark navy for headings
  charcoal: [51, 51, 50],     // dark charcoal from website
};

const PAGE_W = 215.9; // letter width mm
const PAGE_H = 279.4; // letter height mm
const ML = 20;        // margin left
const MR = 20;        // margin right
const CONTENT_W = PAGE_W - ML - MR;

function fmtMoney(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtMoneyDecimal(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Sanitize text for jsPDF (Helvetica doesn't support special chars)
function sanitize(str) {
  return String(str || "")
    .replace(/\u2014/g, "--")   // em dash
    .replace(/\u2013/g, "-")    // en dash
    .replace(/\u215B/g, "1/8")  // ⅛
    .replace(/\u00BC/g, "1/4")  // ¼
    .replace(/\u00BD/g, "1/2")  // ½
    .replace(/\u00BE/g, "3/4")  // ¾
    .replace(/\u215D/g, "5/8")  // ⅝
    .replace(/\u2019/g, "'")    // right single quote
    .replace(/\u2018/g, "'")    // left single quote
    .replace(/\u201C/g, '"')    // left double quote
    .replace(/\u201D/g, '"')    // right double quote
    .replace(/\u2026/g, "...")  // ellipsis
    .replace(/\u00B2/g, "2")   // superscript 2
    .replace(/[^\x00-\x7F]/g, (c) => c.charCodeAt(0) > 255 ? "" : c); // drop unsupported unicode
}

// ── load logo as base64 (white-on-navy version for PDF header) ──
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
  } catch (e) {
    console.warn("Logo load failed:", e);
    return null;
  }
}

// ── draw the branded header (navy bar + centered logo) ──
function drawHeader(doc, company, logoBase64) {
  const headerH = 34;

  // Full-width navy header bar
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, PAGE_W, headerH, "F");

  // Orange accent line at bottom of header
  doc.setFillColor(...COLORS.orange);
  doc.rect(0, headerH, PAGE_W, 1.5, "F");

  // Logo — left side, fitted within the header height with correct aspect ratio
  if (logoBase64) {
    try {
      const logo = typeof logoBase64 === "string" ? { data: logoBase64, w: 500, h: 149 } : logoBase64;
      const aspect = logo.w / logo.h; // ~3.36 for 500x149
      const logoH = headerH - 4; // slight padding
      const logoW = logoH * aspect;
      const logoY = (headerH - logoH) / 2; // center vertically
      doc.addImage(logo.data, "PNG", 2, logoY, logoW, logoH);
    } catch { /* fallback */ }
  }

  // Company info — right aligned, white on navy
  const rightX = PAGE_W - MR;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 210, 220);
  const info = [
    "Eagles Brothers Constructors",
    "7801 N Shepherd Dr Suite 107",
    "Houston, TX 77088",
    "(346)970-7093",
    "abner@ebconstructors.com",
  ];
  info.forEach((line, i) => {
    doc.text(line, rightX, 10 + i * 5, { align: "right" });
  });

  return headerH + 6;
}

// ── draw footer ──
function drawFooter(doc, pageNum, totalPages) {
  const y = PAGE_H - 12;
  // Orange accent line
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.5);
  doc.line(ML, y - 4, PAGE_W - MR, y - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.medGray);
  doc.text("Eagles Brothers Constructors Inc. · Houston, TX · (346) 970-7093", ML, y);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MR, y, { align: "right" });
}

// ── check if we need a new page ──
function checkPage(doc, y, needed = 20) {
  if (y + needed > PAGE_H - 20) {
    doc.addPage();
    // Thin gold bar on continuation pages
    doc.setFillColor(...COLORS.orange);
    doc.rect(0, 0, PAGE_W, 2, "F");
    return 14;
  }
  return y;
}

// ── Default scope lines (exported for use in ScopeReviewModal) ──
export const defaultIncludes = [
  "Demo ceilings, doors, and partitions as noted",
  "Haul the demo and build-back trash of our own trade",
  "Metal stud framing (20 or 25 ga.)",
  'Drywall partitions (with "Type X" gypsum, tape, and float to level 4 finish)',
  "Touch up existing walls in work area",
  "Fire-rated wood blocking in walls where noted",
  "Sound insulation (batt insulation)",
  "Work to be performed during regular working hours",
  "Installation of door frames, doors, and hardware",
];

export const defaultExcludes = [
  "Overtime, after-hours, and weekend work",
  "All dumpsters",
  "Protection of existing finishes",
  "Access panels",
  "FRP installation",
  "5/8 Cement Board",
  "Tax on materials",
  "Containment walls",
  "Clean up of other trades demolition of glass, stucco, plaster, or EFIS",
  "Doors, frames, and hardware materials",
  "M.E.P. trash removal, M.E.P. fixture supports, and M.E.P. fire seal",
  "Wall protection materials and wood panels",
  "Stock material through the stairway",
  "HVAC air slot blank-outs",
  "Removal of wall covering on existing walls that is not explicitly noted on drawings",
  "Specialty drywall not specifically stated (foil-faced, lead-lined, hi-impact, soundboard, etc.)",
  "Demolition of track and studs above ceilings not explicitly shown to be demolished",
  "Top out existing demising walls not explicitly noted on drawings",
  "Any work outside, above, or below the designated work area",
  "Exterior rigid insulation, thermal fiber insulation",
  "Removal of glue and thin-set of any sort after flooring demo",
  "Expansion joints in drywall/acoustical, aluminum, and stainless steel reveal",
  "VWC, FWC, FW, and DIRTT walls",
  "Paint, provide, and install sheet metal",
];

// ── main export function ──
export async function generateProposalPdf({ takeoff, bid, company, assemblies, submittals, calcItem, calcRoom, calcSummary, scopeLines, proposalTerms, proposalNumber }) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });

  // Load logo
  const logoBase64 = await loadLogo();

  // ── PAGE 1: HEADER + PROJECT INFO + PRICING ──
  let y = drawHeader(doc, company, logoBase64);

  // "PROPOSAL" label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.orange);
  doc.text("PROPOSAL", PAGE_W - MR, y + 2, { align: "right" });

  // Proposal number (if provided)
  if (proposalNumber) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.medGray);
    doc.text(`No. ${sanitize(proposalNumber)}`, PAGE_W - MR, y + 7, { align: "right" });
  }

  // Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.darkGray);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Date: ${today}`, PAGE_W - MR, y + (proposalNumber ? 12 : 8), { align: "right" });

  y += (proposalNumber ? 18 : 14);

  // Project info box
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(ML, y, CONTENT_W, 24, 2, 2, "F");
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CONTENT_W, 24, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.accent);
  doc.text("Project:", ML + 4, y + 7);
  doc.text("Address:", ML + 4, y + 14);
  doc.text("GC:", ML + 4, y + 21);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.black);
  const projectName = sanitize(bid?.name || takeoff?.name || "--");
  const projectAddr = sanitize(bid?.address || "--");
  const gcName = sanitize(bid?.gc || "--");
  doc.text(projectName, ML + 24, y + 7);
  doc.text(projectAddr, ML + 24, y + 14);
  doc.text(gcName, ML + 24, y + 21);

  y += 32;

  // ── PRICING TABLE ──
  const summary = calcSummary(takeoff, assemblies);

  // Scope categories — group rooms by trade/scope for the proposal view
  // For now, show a clean pricing breakdown by room
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.accent);
  doc.text("SCOPE OF WORK & PRICING", ML, y);
  y += 2;
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.8);
  doc.line(ML, y, ML + 60, y);
  y += 6;

  // Table header
  doc.setFillColor(...COLORS.accent);
  doc.rect(ML, y, CONTENT_W, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.text("DESCRIPTION", ML + 4, y + 5.5);
  doc.text("AMOUNT", PAGE_W - MR - 4, y + 5.5, { align: "right" });
  y += 8;

  // Calculate markup multiplier — bake waste/overhead/profit into room prices
  // If tax breakout is on, exclude tax from the markup so we show it separately
  const showTax = takeoff.showTaxBreakout || false;
  const rawTotal = summary.subtotal || 1;
  const totalBeforeTax = summary.grandTotal - (showTax ? summary.taxAmt : 0);
  const markup = totalBeforeTax / rawTotal;

  // Room rows — prices shown with markup baked in
  let rowAlt = false;
  (takeoff.rooms || []).forEach((rm) => {
    y = checkPage(doc, y, 10);
    const rt = calcRoom(rm, assemblies);
    if (rowAlt) {
      doc.setFillColor(...COLORS.bgLight);
      doc.rect(ML, y, CONTENT_W, 8, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.black);
    const roomLabel = sanitize(rm.name + (rm.floor ? ` (${rm.floor})` : ""));
    doc.text(roomLabel, ML + 4, y + 5.5);
    doc.setFont("helvetica", "bold");
    doc.text(fmtMoney(rt.total * markup), PAGE_W - MR - 4, y + 5.5, { align: "right" });
    y += 8;
    rowAlt = !rowAlt;

    // Show individual line items — descriptions only, no prices
    (rm.items || []).forEach((it) => {
      y = checkPage(doc, y, 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.medGray);
      const itemDesc = sanitize(`     ${it.qty} ${it.unit}  ${it.desc}`);
      doc.text(itemDesc, ML + 6, y + 4.5);
      y += 6;
    });
  });

  // Tax breakout line (if enabled)
  if (showTax && summary.taxAmt > 0) {
    y = checkPage(doc, y, 14);
    y += 2;
    doc.setDrawColor(...COLORS.lightGray);
    doc.setLineWidth(0.3);
    doc.line(ML + CONTENT_W * 0.5, y, PAGE_W - MR, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.darkGray);
    doc.text("Subtotal", ML + CONTENT_W * 0.5 + 4, y);
    doc.setTextColor(...COLORS.black);
    doc.text(fmtMoney(totalBeforeTax), PAGE_W - MR - 4, y, { align: "right" });
    y += 6;
    doc.setTextColor(...COLORS.darkGray);
    doc.text(`Tax on Materials (${takeoff.taxRate || 0}%)`, ML + CONTENT_W * 0.5 + 4, y);
    doc.setTextColor(...COLORS.black);
    doc.text(fmtMoney(summary.taxAmt), PAGE_W - MR - 4, y, { align: "right" });
    y += 4;
  }

  // Grand total with navy background
  y = checkPage(doc, y, 20);
  y += 4;
  doc.setFillColor(...COLORS.navy);
  doc.roundedRect(ML + CONTENT_W * 0.45, y - 2, CONTENT_W * 0.55, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.white);
  doc.text("TOTAL", ML + CONTENT_W * 0.5 + 4, y + 6.5);
  doc.text(fmtMoney(summary.grandTotal), PAGE_W - MR - 6, y + 6.5, { align: "right" });
  y += 18;

  // ── ALTERNATES ──
  const alternates = takeoff.alternates || [];
  if (alternates.length > 0) {
    y = checkPage(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.accent);
    doc.text("ALTERNATES", ML, y);
    y += 2;
    doc.setDrawColor(...COLORS.orange);
    doc.setLineWidth(0.6);
    doc.line(ML, y, ML + 35, y);
    y += 6;

    alternates.forEach((alt, i) => {
      y = checkPage(doc, y, 12);
      // Alt row background
      if (i % 2 === 1) {
        doc.setFillColor(...COLORS.bgLight);
        doc.rect(ML, y - 1, CONTENT_W, 9, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.accent);
      doc.text(`Alternate ${i + 1}:`, ML + 4, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.black);
      const descLines = doc.splitTextToSize(sanitize(alt.description || ""), CONTENT_W - 60);
      doc.text(descLines[0] || "", ML + 30, y + 5);
      doc.setFont("helvetica", "bold");
      const sign = alt.type === "deduct" ? "Deduct " : "Add ";
      doc.text(sign + fmtMoney(alt.amount || 0), PAGE_W - MR - 4, y + 5, { align: "right" });
      y += 8;
      // Extra lines if description wraps
      for (let li = 1; li < descLines.length; li++) {
        y = checkPage(doc, y, 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.darkGray);
        doc.text(descLines[li], ML + 30, y + 4);
        y += 5;
      }
    });
    y += 4;
  }

  // ── ADD-ONS ──
  const addOns = takeoff.addOns || [];
  if (addOns.length > 0) {
    y = checkPage(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.accent);
    doc.text("ADD-ONS (Optional)", ML, y);
    y += 2;
    doc.setDrawColor(...COLORS.orange);
    doc.setLineWidth(0.6);
    doc.line(ML, y, ML + 50, y);
    y += 6;

    addOns.forEach((addon, i) => {
      y = checkPage(doc, y, 12);
      if (i % 2 === 1) {
        doc.setFillColor(...COLORS.bgLight);
        doc.rect(ML, y - 1, CONTENT_W, 9, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.black);
      const descLines = doc.splitTextToSize(sanitize(addon.description || ""), CONTENT_W - 40);
      doc.text(descLines[0] || "", ML + 4, y + 5);
      doc.setFont("helvetica", "bold");
      doc.text(fmtMoney(addon.amount || 0), PAGE_W - MR - 4, y + 5, { align: "right" });
      y += 8;
      for (let li = 1; li < descLines.length; li++) {
        y = checkPage(doc, y, 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.darkGray);
        doc.text(descLines[li], ML + 4, y + 4);
        y += 5;
      }
    });
    y += 4;
  }

  // ── INCLUDES / EXCLUDES / ASSUMPTIONS ──
  const includes = scopeLines?.includes?.length > 0 ? scopeLines.includes : defaultIncludes;
  const excludes = scopeLines?.excludes?.length > 0 ? scopeLines.excludes : defaultExcludes;
  const assumptions = scopeLines?.assumptions || [];

  // ── INCLUDES section ──
  y = checkPage(doc, y, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.accent);
  doc.text("INCLUDES:", ML, y);
  y += 2;
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.6);
  doc.line(ML, y, ML + 28, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.darkGray);
  includes.forEach((line, i) => {
    y = checkPage(doc, y, 6);
    doc.text(`${i + 1}.`, ML + 2, y, { align: "right" });
    const split = doc.splitTextToSize(sanitize(line), CONTENT_W - 12);
    split.forEach((sl, si) => {
      doc.text(sl, ML + 6, y);
      if (si < split.length - 1) y += 4;
    });
    y += 5;
  });

  y += 4;

  // ── EXCLUDES section ──
  y = checkPage(doc, y, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.accent);
  doc.text("EXCLUDES:", ML, y);
  y += 2;
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.6);
  doc.line(ML, y, ML + 30, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.darkGray);
  excludes.forEach((line, i) => {
    y = checkPage(doc, y, 6);
    doc.text(`${i + 1}.`, ML + 2, y, { align: "right" });
    const split = doc.splitTextToSize(sanitize(line), CONTENT_W - 12);
    split.forEach((sl, si) => {
      doc.text(sl, ML + 6, y);
      if (si < split.length - 1) y += 4;
    });
    y += 5;
  });

  y += 6;

  // ── ASSUMPTIONS / QUALIFICATIONS section ──
  if (assumptions.length > 0) {
    y = checkPage(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.accent);
    doc.text("ASSUMPTIONS / QUALIFICATIONS:", ML, y);
    y += 2;
    doc.setDrawColor(...COLORS.orange);
    doc.setLineWidth(0.6);
    doc.line(ML, y, ML + 70, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.darkGray);
    assumptions.forEach((line, i) => {
      y = checkPage(doc, y, 6);
      doc.text(`${i + 1}.`, ML + 2, y, { align: "right" });
      const split = doc.splitTextToSize(sanitize(line), CONTENT_W - 12);
      split.forEach((sl, si) => {
        doc.text(sl, ML + 6, y);
        if (si < split.length - 1) y += 4;
      });
      y += 5;
    });
    y += 4;
  }

  // ── NOTES / TERMS ──
  const terms = proposalTerms || {};
  const noteLines = [];
  if (terms.paymentTerms) noteLines.push("Payment Terms: " + terms.paymentTerms);
  if (terms.warranty) noteLines.push("Warranty: " + terms.warranty);
  if (terms.changeOrders) noteLines.push("Change Orders: " + terms.changeOrders);
  if (terms.pricingValidity) noteLines.push(terms.pricingValidity);

  // Calculate note box height based on content
  const noteBoxH = Math.max(22, 8 + noteLines.length * 5 + 10);
  y = checkPage(doc, y, noteBoxH + 6);
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(ML, y, CONTENT_W, noteBoxH, 2, 2, "F");
  doc.setDrawColor(...COLORS.lightGray);
  doc.roundedRect(ML, y, CONTENT_W, noteBoxH, 2, 2, "S");

  if (noteLines.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.accent);
    doc.text("TERMS & CONDITIONS:", ML + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.darkGray);
    let noteY = y + 10;
    noteLines.forEach((line) => {
      const split = doc.splitTextToSize(sanitize(line), CONTENT_W - 8);
      split.forEach((sl) => {
        doc.text(sl, ML + 4, noteY);
        noteY += 4;
      });
      noteY += 1;
    });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Contact: Oscar Abner Aguilar - (346) 970-7093 - abner@ebconstructors.com", ML + 4, noteY + 2);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.accent);
    doc.text("NOTE:", ML + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.darkGray);
    doc.text('Assume deck height to be 12\'-00" or less. Advise if deck height wall price needs to be adjusted.', ML + 18, y + 5);
    doc.text("Pricing is good for 30 days from date of proposal. If you have any questions, please contact:", ML + 4, y + 12);
    doc.setFont("helvetica", "bold");
    doc.text("Oscar Abner Aguilar - (346) 970-7093 - abner@ebconstructors.com", ML + 4, y + 17);
  }

  y += noteBoxH + 6;

  // ── SIGNATURE & DATE SLOTS ──
  y = checkPage(doc, y, 70);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.accent);
  doc.text("ACCEPTANCE", ML, y);
  y += 2;
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.6);
  doc.line(ML, y, ML + 35, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.darkGray);
  doc.text("By signing below, you authorize Eagles Brothers Constructors Inc. to proceed with the scope of work", ML, y);
  y += 4;
  doc.text("described in this proposal under the terms and conditions stated herein.", ML, y);
  y += 14;

  const sigLineW = (CONTENT_W - 16) / 2;

  // Client signature block
  doc.setDrawColor(...COLORS.black);
  doc.setLineWidth(0.4);
  doc.line(ML, y, ML + sigLineW, y);
  doc.line(ML + sigLineW + 16, y, ML + sigLineW + 16 + sigLineW, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.medGray);
  doc.text("Client Signature", ML, y);
  doc.text("Date", ML + sigLineW + 16, y);

  y += 14;

  // Client printed name
  doc.setDrawColor(...COLORS.black);
  doc.line(ML, y, ML + sigLineW, y);
  doc.line(ML + sigLineW + 16, y, ML + sigLineW + 16 + sigLineW, y);

  y += 5;
  doc.text("Printed Name", ML, y);
  doc.text("Title / Company", ML + sigLineW + 16, y);

  y += 14;

  // EBC signature block
  doc.setDrawColor(...COLORS.black);
  doc.line(ML, y, ML + sigLineW, y);
  doc.line(ML + sigLineW + 16, y, ML + sigLineW + 16 + sigLineW, y);

  y += 5;
  doc.text("EBC Representative Signature", ML, y);
  doc.text("Date", ML + sigLineW + 16, y);

  // ── Add page numbers ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  // ── Save ──
  const fileName = `EBC Proposal - ${projectName} - ${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  return fileName;
}

// ═══════════════════════════════════════════════════════════════
//  Quick Proposal PDF — simple line-item based (no takeoff needed)
//  Perfect for fast bids where you just need scope + price
// ═══════════════════════════════════════════════════════════════
export async function generateQuickProposalPdf({
  projectName = "",
  projectAddress = "",
  gcName = "",
  date = "",
  lineItems = [],         // [{ description, amount }]
  alternates = [],        // [{ description, type:"add"|"deduct", amount }]
  includes = [],
  excludes = [],
  assumptions = [],
  notes = "",             // free-text note block
  contactName = "Oscar Abner Aguilar",
  contactPhone = "(346) 970-7093",
  contactEmail = "abner@ebconstructors.com",
  proposalNumber = "",
}) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const logoBase64 = await loadLogo();

  // ── PAGE 1: HEADER ──
  let y = drawHeader(doc, null, logoBase64);

  // "PROPOSAL" label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.orange);
  doc.text("PROPOSAL", PAGE_W - MR, y + 2, { align: "right" });

  if (proposalNumber) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.medGray);
    doc.text(`No. ${sanitize(proposalNumber)}`, PAGE_W - MR, y + 7, { align: "right" });
  }

  // Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.darkGray);
  const displayDate = date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Date: ${sanitize(displayDate)}`, PAGE_W - MR, y + (proposalNumber ? 12 : 8), { align: "right" });
  y += (proposalNumber ? 18 : 14);

  // Project info box
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(ML, y, CONTENT_W, 24, 2, 2, "F");
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CONTENT_W, 24, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.accent);
  doc.text("Project:", ML + 4, y + 7);
  doc.text("Address:", ML + 4, y + 14);
  doc.text("GC:", ML + 4, y + 21);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.black);
  doc.text(sanitize(projectName), ML + 24, y + 7);
  doc.text(sanitize(projectAddress), ML + 24, y + 14);
  doc.text(sanitize(gcName), ML + 24, y + 21);
  y += 32;

  // ── SCOPE OF WORK & PRICING TABLE ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.accent);
  doc.text("SCOPE OF WORK & PRICING", ML, y);
  y += 2;
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.8);
  doc.line(ML, y, ML + 60, y);
  y += 6;

  // Table header
  doc.setFillColor(...COLORS.accent);
  doc.rect(ML, y, CONTENT_W, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.text("DESCRIPTION", ML + 4, y + 5.5);
  doc.text("AMOUNT", PAGE_W - MR - 4, y + 5.5, { align: "right" });
  y += 8;

  // Line item rows
  let grandTotal = 0;
  lineItems.forEach((item, i) => {
    y = checkPage(doc, y, 10);
    if (i % 2 === 1) {
      doc.setFillColor(...COLORS.bgLight);
      doc.rect(ML, y, CONTENT_W, 8, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.black);
    doc.text(sanitize(item.description), ML + 4, y + 5.5);
    doc.setFont("helvetica", "bold");
    doc.text(fmtMoney(item.amount), PAGE_W - MR - 4, y + 5.5, { align: "right" });
    grandTotal += Number(item.amount) || 0;
    y += 8;
  });

  // Grand total
  y = checkPage(doc, y, 20);
  y += 4;
  doc.setFillColor(...COLORS.navy);
  doc.roundedRect(ML + CONTENT_W * 0.45, y - 2, CONTENT_W * 0.55, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.white);
  doc.text("TOTAL", ML + CONTENT_W * 0.5 + 4, y + 6.5);
  doc.text(fmtMoney(grandTotal), PAGE_W - MR - 6, y + 6.5, { align: "right" });
  y += 18;

  // ── ALTERNATES ──
  if (alternates.length > 0) {
    y = checkPage(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.accent);
    doc.text("ALTERNATES", ML, y);
    y += 2;
    doc.setDrawColor(...COLORS.orange);
    doc.setLineWidth(0.6);
    doc.line(ML, y, ML + 35, y);
    y += 6;

    alternates.forEach((alt, i) => {
      y = checkPage(doc, y, 12);
      if (i % 2 === 1) {
        doc.setFillColor(...COLORS.bgLight);
        doc.rect(ML, y - 1, CONTENT_W, 9, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.accent);
      doc.text(`Alternate ${i + 1}:`, ML + 4, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.black);
      const descLines = doc.splitTextToSize(sanitize(alt.description || ""), CONTENT_W - 60);
      doc.text(descLines[0] || "", ML + 30, y + 5);
      doc.setFont("helvetica", "bold");
      const sign = alt.type === "deduct" ? "Deduct " : "Add ";
      doc.text(sign + fmtMoney(alt.amount || 0), PAGE_W - MR - 4, y + 5, { align: "right" });
      y += 8;
      for (let li = 1; li < descLines.length; li++) {
        y = checkPage(doc, y, 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.darkGray);
        doc.text(descLines[li], ML + 30, y + 4);
        y += 5;
      }
    });
    y += 4;
  }

  // ── INCLUDES ──
  const incList = includes.length > 0 ? includes : defaultIncludes;
  y = checkPage(doc, y, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.accent);
  doc.text("INCLUDES:", ML, y);
  y += 2;
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.6);
  doc.line(ML, y, ML + 28, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.darkGray);
  incList.forEach((line, i) => {
    y = checkPage(doc, y, 6);
    doc.text(`${i + 1}.`, ML + 2, y, { align: "right" });
    const split = doc.splitTextToSize(sanitize(line), CONTENT_W - 12);
    split.forEach((sl, si) => {
      doc.text(sl, ML + 6, y);
      if (si < split.length - 1) y += 4;
    });
    y += 5;
  });
  y += 4;

  // ── EXCLUDES ──
  const excList = excludes.length > 0 ? excludes : defaultExcludes;
  y = checkPage(doc, y, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.accent);
  doc.text("EXCLUDES:", ML, y);
  y += 2;
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.6);
  doc.line(ML, y, ML + 30, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.darkGray);
  excList.forEach((line, i) => {
    y = checkPage(doc, y, 6);
    doc.text(`${i + 1}.`, ML + 2, y, { align: "right" });
    const split = doc.splitTextToSize(sanitize(line), CONTENT_W - 12);
    split.forEach((sl, si) => {
      doc.text(sl, ML + 6, y);
      if (si < split.length - 1) y += 4;
    });
    y += 5;
  });
  y += 4;

  // ── ASSUMPTIONS ──
  if (assumptions.length > 0) {
    y = checkPage(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.accent);
    doc.text("ASSUMPTIONS / QUALIFICATIONS:", ML, y);
    y += 2;
    doc.setDrawColor(...COLORS.orange);
    doc.setLineWidth(0.6);
    doc.line(ML, y, ML + 70, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.darkGray);
    assumptions.forEach((line, i) => {
      y = checkPage(doc, y, 6);
      doc.text(`${i + 1}.`, ML + 2, y, { align: "right" });
      const split = doc.splitTextToSize(sanitize(line), CONTENT_W - 12);
      split.forEach((sl, si) => {
        doc.text(sl, ML + 6, y);
        if (si < split.length - 1) y += 4;
      });
      y += 5;
    });
    y += 4;
  }

  // ── NOTES BOX ──
  const noteText = notes || `Assume deck height to be 14'-00" or less. Advise if deck height wall price needs to be adjusted.\nPricing is good for 30 days from date of proposal.`;
  const noteLinesSplit = doc.splitTextToSize(sanitize(noteText), CONTENT_W - 8);
  const noteBoxH = Math.max(22, 10 + noteLinesSplit.length * 4 + 10);
  y = checkPage(doc, y, noteBoxH + 6);
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(ML, y, CONTENT_W, noteBoxH, 2, 2, "F");
  doc.setDrawColor(...COLORS.lightGray);
  doc.roundedRect(ML, y, CONTENT_W, noteBoxH, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.accent);
  doc.text("NOTE:", ML + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.darkGray);
  let noteY = y + 10;
  noteLinesSplit.forEach((sl) => {
    doc.text(sl, ML + 4, noteY);
    noteY += 4;
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`${sanitize(contactName)} - ${sanitize(contactPhone)} - ${sanitize(contactEmail)}`, ML + 4, noteY + 2);

  y += noteBoxH + 6;

  // ── SIGNATURE ──
  y = checkPage(doc, y, 70);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.accent);
  doc.text("ACCEPTANCE", ML, y);
  y += 2;
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.6);
  doc.line(ML, y, ML + 35, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.darkGray);
  doc.text("By signing below, you authorize Eagles Brothers Constructors Inc. to proceed with the scope of work", ML, y);
  y += 4;
  doc.text("described in this proposal under the terms and conditions stated herein.", ML, y);
  y += 14;

  const sigLineW = (CONTENT_W - 16) / 2;
  doc.setDrawColor(...COLORS.black);
  doc.setLineWidth(0.4);
  doc.line(ML, y, ML + sigLineW, y);
  doc.line(ML + sigLineW + 16, y, ML + sigLineW + 16 + sigLineW, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.medGray);
  doc.text("Client Signature", ML, y);
  doc.text("Date", ML + sigLineW + 16, y);
  y += 14;
  doc.line(ML, y, ML + sigLineW, y);
  doc.line(ML + sigLineW + 16, y, ML + sigLineW + 16 + sigLineW, y);
  y += 5;
  doc.text("Printed Name", ML, y);
  doc.text("Title / Company", ML + sigLineW + 16, y);
  y += 14;
  doc.line(ML, y, ML + sigLineW, y);
  doc.line(ML + sigLineW + 16, y, ML + sigLineW + 16 + sigLineW, y);
  y += 5;
  doc.text("EBC Representative Signature", ML, y);
  doc.text("Date", ML + sigLineW + 16, y);

  // Page numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  const fileName = `EBC Proposal - ${sanitize(projectName)} - ${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  const blob = doc.output('blob');
  return { fileName, blob };
}
