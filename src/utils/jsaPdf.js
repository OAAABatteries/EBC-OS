import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · JSA PDF Generator
//  Branded Job Safety Analysis document with large signature areas
// ═══════════════════════════════════════════════════════════════

const C = {
  navy: [30, 45, 59],
  orange: [255, 127, 33],
  darkOrange: [210, 100, 20],
  darkGray: [60, 60, 60],
  medGray: [120, 120, 120],
  ltGray: [200, 200, 200],
  bgLight: [248, 248, 248],
  white: [255, 255, 255],
  green: [34, 139, 34],
  yellow: [200, 160, 20],
  red: [200, 40, 40],
};

const PW = 215.9; // letter width mm
const PH = 279.4; // letter height mm
const ML = 18;
const MR = 18;
const CW = PW - ML - MR; // content width

function safe(str) {
  return String(str || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, "--")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x00-\x7F]/g, (c) => (c.charCodeAt(0) > 255 ? "" : c));
}

function riskColor(score) {
  if (score <= 6) return C.green;
  if (score <= 12) return C.yellow;
  return C.red;
}

function riskLabel(score) {
  if (score <= 6) return "Low";
  if (score <= 12) return "Medium";
  if (score <= 19) return "High";
  return "Critical";
}

// ── Load logo (same as proposalPdf) ──
async function loadLogo() {
  try {
    const resp = await fetch("/logo-ebc.png");
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const cropH = Math.floor(img.height * 0.55);
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = cropH;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#1E2D3B";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, img.width, cropH, 0, 0, img.width, cropH);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Branded header ──
function drawHeader(doc, logo) {
  const hH = 34;
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, hH, "F");
  doc.setFillColor(...C.orange);
  doc.rect(0, hH, PW, 1.5, "F");

  if (logo) {
    try {
      const logoH = hH;
      const logoW = logoH * (500 / 275);
      doc.addImage(logo, "PNG", 0, 0, logoW, logoH);
    } catch { /* skip */ }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("JOB SAFETY ANALYSIS", PW - MR, 16, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 210, 220);
  doc.text("Eagles Brothers Constructors", PW - MR, 24, { align: "right" });
  doc.text("Houston, TX  ·  (346) 970-7093", PW - MR, 29, { align: "right" });

  return hH + 6;
}

// ── Footer ──
function drawFooter(doc, pg, total) {
  const y = PH - 12;
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.4);
  doc.line(ML, y - 4, PW - MR, y - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  doc.text("Eagles Brothers Constructors  ·  JSA Document", ML, y);
  doc.text(`Page ${pg} of ${total}`, PW - MR, y, { align: "right" });
}

// ── Page break check ──
function checkPage(doc, y, need = 20) {
  if (y + need > PH - 22) {
    doc.addPage();
    doc.setFillColor(...C.orange);
    doc.rect(0, 0, PW, 2, "F");
    return 14;
  }
  return y;
}

// ── Section heading ──
function sectionHead(doc, y, text) {
  y = checkPage(doc, y, 14);
  doc.setFillColor(...C.navy);
  doc.rect(ML, y, CW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(safe(text), ML + 3, y + 5.8);
  return y + 12;
}

// ── Detail row (label: value) ──
function detailRow(doc, x, y, label, value, w) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.medGray);
  doc.text(safe(label), x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.darkGray);
  const lines = doc.splitTextToSize(safe(value), w - 2);
  doc.text(lines, x, y + 4.5);
  return y + 4.5 + lines.length * 4;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════
export async function generateJsaPdf(jsa) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const logo = await loadLogo();

  // ── PAGE 1: Header + Details ──
  let y = drawHeader(doc, logo);
  y += 2;

  // Title bar
  doc.setFillColor(...C.bgLight);
  doc.rect(ML, y, CW, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C.navy);
  doc.text(safe(jsa.title || "Job Safety Analysis"), ML + 3, y + 7);

  // Risk level badge
  const rl = jsa.riskLevel || "Medium";
  const badgeColor = rl === "Low" ? C.green : rl === "High" ? C.red : rl === "Critical" ? C.red : C.yellow;
  const badgeW = doc.getTextWidth(rl) + 8;
  doc.setFillColor(...badgeColor);
  doc.roundedRect(PW - MR - badgeW - 2, y + 1, badgeW, 7, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(rl.toUpperCase(), PW - MR - badgeW / 2 - 2, y + 6, { align: "center" });

  y += 16;

  // Two-column project details
  const colW = CW / 2 - 4;
  const leftX = ML;
  const rightX = ML + CW / 2 + 4;

  let yL = y;
  let yR = y;
  yL = detailRow(doc, leftX, yL, "PROJECT", jsa.projectName || "—", colW);
  yR = detailRow(doc, rightX, yR, "SUPERVISOR", jsa.supervisor || "—", colW);
  yL = detailRow(doc, leftX, yL + 2, "TRADE", jsa.trade || "—", colW);
  yR = detailRow(doc, rightX, yR + 2, "GENERAL CONTRACTOR", jsa.gc || "—", colW);
  yL = detailRow(doc, leftX, yL + 2, "LOCATION", jsa.location || "—", colW);
  yR = detailRow(doc, rightX, yR + 2, "DATE", jsa.date || "—", colW);
  yL = detailRow(doc, leftX, yL + 2, "SHIFT", jsa.shift || "Day", colW);
  yR = detailRow(doc, rightX, yR + 2, "JSA ID", jsa.id || "—", colW);

  y = Math.max(yL, yR) + 6;

  // ── PPE Section ──
  y = sectionHead(doc, y, "PERSONAL PROTECTIVE EQUIPMENT (PPE)");
  const ppe = jsa.ppe || [];
  if (ppe.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.darkGray);
    const cols = 3;
    const ppeColW = CW / cols;
    ppe.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = ML + col * ppeColW;
      const py = y + row * 5.5;
      doc.text(`[X]  ${safe(item)}`, px + 2, py + 4);
    });
    y += Math.ceil(ppe.length / cols) * 5.5 + 4;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...C.medGray);
    doc.text("No PPE specified", ML + 3, y + 4);
    y += 8;
  }

  // ── Permits Section ──
  const permits = jsa.permits || [];
  if (permits.length > 0) {
    y = sectionHead(doc, y, "PERMITS REQUIRED");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.darkGray);
    permits.forEach((p, i) => {
      y = checkPage(doc, y, 6);
      doc.text(`${i + 1}.  ${safe(p)}`, ML + 3, y + 4);
      y += 5.5;
    });
    y += 2;
  }

  // ── HAZARDS & CONTROLS TABLE ──
  y = sectionHead(doc, y, "JOB STEPS, HAZARDS & CONTROLS");

  const steps = jsa.steps || [];

  // Flatten steps — each step can have nested hazards[] or flat hazard/controls
  const flatRows = [];
  steps.forEach((step, si) => {
    const hazards = step.hazards || [];
    if (hazards.length > 0) {
      hazards.forEach((h) => {
        flatRows.push({
          stepNum: si + 1,
          task: step.step || step.task || step.description || "",
          hazard: h.hazard || "",
          likelihood: h.likelihood || 1,
          severity: h.severity || 1,
          controls: Array.isArray(h.controls) ? h.controls.join("; ") : (h.controls || ""),
        });
      });
    } else {
      flatRows.push({
        stepNum: si + 1,
        task: step.step || step.task || step.description || "",
        hazard: step.hazard || "",
        likelihood: step.likelihood || 1,
        severity: step.severity || 1,
        controls: Array.isArray(step.controls) ? step.controls.join("; ") : (step.controls || ""),
      });
    }
  });

  // Table header
  const colDefs = [
    { label: "#", w: 8 },
    { label: "Task / Activity", w: 42 },
    { label: "Hazard", w: 42 },
    { label: "L", w: 8 },
    { label: "S", w: 8 },
    { label: "Risk", w: 14 },
    { label: "Controls / Mitigations", w: CW - 122 },
  ];

  function drawTableHeader(doc, ty) {
    ty = checkPage(doc, ty, 20);
    doc.setFillColor(...C.navy);
    let hx = ML;
    colDefs.forEach((col) => {
      doc.rect(hx, ty, col.w, 7, "F");
      hx += col.w;
    });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    hx = ML;
    colDefs.forEach((col) => {
      doc.text(col.label, hx + 1.5, ty + 5);
      hx += col.w;
    });
    return ty + 8;
  }

  y = drawTableHeader(doc, y);

  flatRows.forEach((row, idx) => {
    const score = row.likelihood * row.severity;
    const taskLines = doc.splitTextToSize(safe(row.task), colDefs[1].w - 3);
    const hazLines = doc.splitTextToSize(safe(row.hazard), colDefs[2].w - 3);
    const ctrlLines = doc.splitTextToSize(safe(row.controls), colDefs[6].w - 3);
    const rowH = Math.max(taskLines.length, hazLines.length, ctrlLines.length) * 4 + 4;

    y = checkPage(doc, y, rowH + 2);
    if (y < 20) y = drawTableHeader(doc, y);

    const bg = idx % 2 === 0 ? C.bgLight : C.white;
    doc.setFillColor(...bg);
    doc.rect(ML, y, CW, rowH, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.darkGray);

    let cx = ML;
    doc.text(String(row.stepNum), cx + 2, y + 4.5);
    cx += colDefs[0].w;
    doc.text(taskLines, cx + 1.5, y + 4.5);
    cx += colDefs[1].w;
    doc.text(hazLines, cx + 1.5, y + 4.5);
    cx += colDefs[2].w;
    doc.text(String(row.likelihood), cx + 2, y + 4.5);
    cx += colDefs[3].w;
    doc.text(String(row.severity), cx + 2, y + 4.5);
    cx += colDefs[4].w;

    const rc = riskColor(score);
    doc.setFillColor(...rc);
    doc.roundedRect(cx + 1, y + 1, 11, 5, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`${score}`, cx + 6.5, y + 4.8, { align: "center" });
    cx += colDefs[5].w;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.darkGray);
    doc.text(ctrlLines, cx + 1.5, y + 4.5);

    y += rowH + 0.5;
  });

  y += 4;

  // ── Notes section ──
  if (jsa.notes) {
    y = checkPage(doc, y, 20);
    y = sectionHead(doc, y, "ADDITIONAL NOTES");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.darkGray);
    const noteLines = doc.splitTextToSize(safe(jsa.notes), CW - 6);
    noteLines.forEach((line) => {
      y = checkPage(doc, y, 5);
      doc.text(line, ML + 3, y + 4);
      y += 4.5;
    });
    y += 4;
  }

  // ══════════════════════════════════════════════════════════════
  //  SIGNATURES PAGE — Always start on a fresh page with plenty of room
  // ══════════════════════════════════════════════════════════════
  doc.addPage();
  doc.setFillColor(...C.orange);
  doc.rect(0, 0, PW, 2, "F");
  y = 14;

  // Signatures heading
  doc.setFillColor(...C.navy);
  doc.rect(ML, y, CW, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("SIGNATURES", ML + 3, y + 7.5);
  y += 16;

  // Supervisor signature — large box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.navy);
  doc.text("Supervisor / Competent Person", ML, y + 4);
  y += 8;

  const supSigW = 100; // ~4 inches
  const supSigH = 38;  // ~1.5 inches
  doc.setDrawColor(...C.ltGray);
  doc.setLineWidth(0.5);
  doc.rect(ML, y, supSigW, supSigH);

  if (jsa.supervisorSignature) {
    try {
      doc.addImage(jsa.supervisorSignature, "PNG", ML + 2, y + 2, supSigW - 4, supSigH - 8);
    } catch { /* skip */ }
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C.ltGray);
    doc.text("Awaiting signature", ML + supSigW / 2, y + supSigH / 2, { align: "center" });
  }

  // Supervisor name and date below box
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.darkGray);
  doc.text(`Name: ${safe(jsa.supervisor || "_______________")}`, ML, y + supSigH + 5);
  doc.text(`Date: ${safe(jsa.date || "_______________")}`, ML + 60, y + supSigH + 5);

  y += supSigH + 14;

  // Divider
  doc.setDrawColor(...C.ltGray);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PW - MR, y);
  y += 6;

  // Crew signatures heading
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.navy);
  doc.text("Crew Members — By signing, I acknowledge I have reviewed and understand this JSA", ML, y + 4);
  y += 10;

  const crew = jsa.crewMembers || [];
  const sigW = (CW - 8) / 2;  // 2 per row with gap
  const sigH = 30;             // ~1.2 inches
  const sigGap = 8;
  const rowGap = 15;

  crew.forEach((member, i) => {
    const col = i % 2;
    const isNewRow = col === 0;

    if (isNewRow) {
      y = checkPage(doc, y, sigH + rowGap + 10);
      // If we page-broke, re-add orange bar header
      if (y < 20) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...C.navy);
        doc.text("Crew Signatures (continued)", ML, y + 4);
        y += 8;
      }
    }

    const sx = col === 0 ? ML : ML + sigW + sigGap;
    const sy = col === 0 ? y : y; // same y for both columns

    // Signature box
    doc.setDrawColor(...C.ltGray);
    doc.setLineWidth(0.4);
    doc.rect(sx, sy, sigW, sigH);

    if (member.signature) {
      try {
        doc.addImage(member.signature, "PNG", sx + 2, sy + 2, sigW - 4, sigH - 8);
      } catch { /* skip */ }
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...C.ltGray);
      doc.text("Awaiting signature", sx + sigW / 2, sy + sigH / 2, { align: "center" });
    }

    // Name below box
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.darkGray);
    doc.text(safe(member.name || `Crew Member ${i + 1}`), sx + 2, sy + sigH + 4);

    // Advance y after completing a row (2 signatures)
    if (col === 1 || i === crew.length - 1) {
      y += sigH + rowGap;
    }
  });

  // If no crew
  if (crew.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C.medGray);
    doc.text("No crew members signed on to this JSA", ML + 3, y + 4);
    y += 10;
  }

  // ── Add footers to all pages ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  // ── Save ──
  const fname = `JSA_${safe(jsa.projectName || "Report").replace(/\s+/g, "_")}_${jsa.date || "undated"}.pdf`;
  doc.save(fname);
}
