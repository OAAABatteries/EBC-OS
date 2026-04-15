import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · JSA PDF Generator
//  Branded Job Safety Analysis — matches CO/Proposal template quality
// ═══════════════════════════════════════════════════════════════

const C = {
  navy:     [30, 45, 59],
  orange:   [255, 127, 33],
  amber:    [224, 148, 34],
  darkGray: [60, 60, 60],
  medGray:  [120, 120, 120],
  ltGray:   [200, 200, 200],
  bgLight:  [248, 248, 248],
  white:    [255, 255, 255],
  green:    [34, 139, 34],
  yellow:   [200, 160, 20],
  red:      [200, 40, 40],
};

const PW = 215.9; // letter width mm
const PH = 279.4; // letter height mm
const ML = 20;
const MR = 20;
const CW = PW - ML - MR; // content width

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
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00B2/g, "2")
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

// ── Load logo (white-on-transparent — same as proposal/CO) ──
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

// ── Branded header (matches CO/Proposal pattern) ──
function drawHeader(doc, logo, company = {}) {
  const headerH = 28;

  // Full-width navy header bar
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, headerH, "F");

  // Orange accent line at bottom of header
  doc.setFillColor(...C.orange);
  doc.rect(0, headerH, PW, 1.5, "F");

  // Logo — left side, fitted within header height with correct aspect ratio
  if (logo) {
    try {
      const aspect = logo.w / logo.h;
      const logoH = headerH - 6;
      const logoW = logoH * aspect;
      doc.addImage(logo.data, "PNG", ML, 3, logoW, logoH);
    } catch { /* fallback to text */ }
  }

  // Company info — right aligned, white on navy
  const rightX = PW - MR;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 210, 220);
  const info = [
    company.name    || "Eagles Brothers Constructors",
    company.address || "7801 N Shepherd Dr Suite 107",
    company.city    || "Houston, TX 77088",
    company.phone   || "(346) 970-7093",
    company.email   || "abner@ebconstructors.com",
  ];
  info.forEach((line, i) => {
    doc.text(line, rightX, 10 + i * 4.5, { align: "right" });
  });

  return headerH + 6;
}

// ── Footer (matches CO/Proposal) ──
function drawFooter(doc, pg, total) {
  const y = PH - 12;
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.5);
  doc.line(ML, y - 4, PW - MR, y - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  doc.text("Eagles Brothers Constructors Inc.  ·  Houston, TX  ·  (346) 970-7093", ML, y);
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

// ── Section heading (navy bar — matches CO) ──
function sectionHead(doc, y, text) {
  y = checkPage(doc, y, 14);
  doc.setFillColor(...C.navy);
  doc.rect(ML, y, CW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(safe(text), ML + 3, y + 5);
  return y + 10;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════
export async function generateJsaPdf(jsa) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const logo = await loadLogo();

  const company = jsa.company || {};

  // ── PAGE 1: Header ──
  let y = drawHeader(doc, logo, company);

  // ── Title bar (amber accent — matches CO title bar) ──
  doc.setFillColor(...C.amber);
  doc.rect(ML, y, CW, 10, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("JOB SAFETY ANALYSIS", ML + 4, y + 7.5);

  // Risk level — plain text, right-aligned on title bar
  const rl = jsa.riskLevel || riskLabel(Math.max(...(jsa.steps || []).flatMap(s => (s.hazards || [s]).map(h => (h.likelihood || 1) * (h.severity || 1))), 0));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`Risk: ${rl}`, PW - MR - 4, y + 7, { align: "right" });

  y += 16;

  // GC header text — if GC requires specific branding
  if (jsa.gcHeaderText) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.amber);
    doc.text(safe(jsa.gcHeaderText), PW / 2, y, { align: "center" });
    y += 6;
  }

  // ── Project details grid (two-column, matches CO layout) ──
  doc.setFontSize(9);
  const leftLabelX  = ML;
  const leftValueX  = ML + 24;
  const rightLabelX = ML + CW / 2 + 8;
  const rightValueX = ML + CW / 2 + 34;

  const leftMaxW  = rightLabelX - leftValueX - 3;  // max width for left values
  const rightMaxW = PW - MR - rightValueX - 2;     // max width for right values

  const infoRows = [
    ["Project:",    safe(jsa.projectName || "--"),    "Supervisor:", safe(jsa.supervisor || "--")],
    ["Trade:",      safe(jsa.trade || "--"),          "GC:",         safe(jsa.gc || "--")],
    ["Location:",   safe(jsa.location || "--"),       "Date:",       safe(jsa.date || "--")],
    ["Shift:",      safe(jsa.shift || "Day"),         "JSA ID:",     safe(jsa.id || "--")],
  ];

  infoRows.forEach(([lbl1, val1, lbl2, val2]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.medGray);
    doc.text(lbl1, leftLabelX, y);
    doc.text(lbl2, rightLabelX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.darkGray);
    const leftLines = doc.splitTextToSize(val1, leftMaxW);
    const rightLines = doc.splitTextToSize(val2, rightMaxW);
    doc.text(leftLines[0] || "", leftValueX, y);
    doc.text(rightLines[0] || "", rightValueX, y);
    // Handle overflow lines
    const extra = Math.max(leftLines.length, rightLines.length) - 1;
    for (let i = 1; i <= extra; i++) {
      y += 4.5;
      if (leftLines[i]) doc.text(leftLines[i], leftValueX, y);
      if (rightLines[i]) doc.text(rightLines[i], rightValueX, y);
    }
    y += 6;
  });

  y += 4;

  // ── PPE Section ──
  y = sectionHead(doc, y, "PERSONAL PROTECTIVE EQUIPMENT (PPE)");

  const ppe = jsa.ppe || [];
  if (ppe.length > 0) {
    // Render as a clean grid with filled checkboxes
    const cols = 3;
    const ppeColW = CW / cols;
    doc.setFontSize(9);
    ppe.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = ML + col * ppeColW;
      const py = y + row * 6;

      // Filled checkbox square
      doc.setFillColor(...C.navy);
      doc.rect(px + 2, py + 0.5, 3.5, 3.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("X", px + 3, py + 3.2);

      // Label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.darkGray);
      doc.text(safe(item), px + 8, py + 3.5);
    });
    y += Math.ceil(ppe.length / cols) * 6 + 4;
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
    permits.forEach((p) => {
      y = checkPage(doc, y, 6);
      // Bullet (filled circle — same as CO)
      doc.setFillColor(...C.darkGray);
      doc.circle(ML + 5, y + 2, 0.8, "F");
      doc.text(safe(p), ML + 9, y + 3.5);
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

  // Table column definitions
  const colDefs = [
    { label: "#",                       w: 8 },
    { label: "Task / Activity",         w: 42 },
    { label: "Hazard",                  w: 42 },
    { label: "L",                       w: 8 },
    { label: "S",                       w: 8 },
    { label: "Risk",                    w: 14 },
    { label: "Controls / Mitigations",  w: CW - 122 },
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

    // Risk score — plain bold text, no color bubble
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.darkGray);
    doc.text(`${score}`, cx + 2, y + 4.5);
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
  //  SIGNATURES — same page if room, new page if not
  // ══════════════════════════════════════════════════════════════
  const teamList = (jsa.teamSignOn || jsa.teamMembers || []).map(c => ({ name: c.name, signature: c.signature || null }));
  const sigSpaceNeeded = 50 + (teamList.length > 0 ? Math.ceil(teamList.length / 2) * 28 + 10 : 10);
  y = checkPage(doc, y, sigSpaceNeeded);

  y = sectionHead(doc, y, "SIGNATURES");
  y += 2;

  // ── Supervisor signature (matches CO authorization layout) ──
  const sigW = (CW - 20) / 2;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.darkGray);
  doc.text("Supervisor / Competent Person:", ML, y);
  doc.setFont("helvetica", "normal");
  doc.text(safe(jsa.supervisor || ""), ML, y + 5);

  // Signature line
  doc.setDrawColor(...C.darkGray);
  doc.setLineWidth(0.3);
  doc.line(ML, y + 18, ML + sigW, y + 18);
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  doc.text("Signature", ML, y + 22);
  doc.text(`Date: ${safe(jsa.date || "_______________")}`, ML, y + 27);

  // If supervisor has a captured signature image, render it above the line
  if (jsa.supervisorSignature) {
    try {
      doc.addImage(jsa.supervisorSignature, "PNG", ML + 2, y + 7, sigW - 10, 10);
    } catch { /* skip */ }
  }

  y += 34;

  // Divider
  doc.setDrawColor(...C.ltGray);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PW - MR, y);
  y += 6;

  // ── Crew signatures ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.navy);
  doc.text("Crew Members -- By signing, I acknowledge I have reviewed and understand this JSA", ML, y + 4);
  y += 10;

  if (teamList.length > 0) {
    const crewSigW = (CW - 12) / 2;
    const crewSigH = 16;
    const rowGap = 12;

    teamList.forEach((member, i) => {
      const col = i % 2;
      if (col === 0) {
        y = checkPage(doc, y, crewSigH + rowGap + 10);
        if (y < 20) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(...C.navy);
          doc.text("Crew Signatures (continued)", ML, y + 4);
          y += 8;
        }
      }

      const sx = col === 0 ? ML : ML + crewSigW + 12;

      // Name
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.darkGray);
      doc.text(safe(member.name || `Crew Member ${i + 1}`), sx + 2, y + 3);

      // Signature area (if captured)
      if (member.signature) {
        try {
          doc.addImage(member.signature, "PNG", sx + 2, y + 5, crewSigW - 10, crewSigH - 8);
        } catch { /* skip */ }
      }

      // Signature line
      doc.setDrawColor(...C.ltGray);
      doc.setLineWidth(0.3);
      doc.line(sx, y + crewSigH, sx + crewSigW, y + crewSigH);
      doc.setFontSize(7);
      doc.setTextColor(...C.medGray);
      doc.text("Signature", sx, y + crewSigH + 4);

      // Advance y after completing a row
      if (col === 1 || i === teamList.length - 1) {
        y += crewSigH + rowGap;
      }
    });
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C.medGray);
    doc.text("No team members signed on to this JSA", ML + 3, y + 4);
    y += 10;
  }

  // ── Add footers to all pages ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  // ── Save ──
  const fname = `JSA_#${safe(jsa.jsaNumber || jsa.id || "1").replace(/\s+/g, "_")}_${jsa.date || "undated"}.pdf`;
  doc.save(fname);
}
