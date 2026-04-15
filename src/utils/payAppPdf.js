import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Pay Application PDF Generator (AIA G702/G703 style)
//  Eagles Brothers Constructors · Houston, TX
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

const PW = 279.4;          // landscape letter width mm
const PH = 215.9;          // landscape letter height mm
const ML = 12;
const MR = 12;
const CW = PW - ML - MR;

function safe(str) {
  return String(str || "")
    .replace(/\u2014/g, "--")
    .replace(/\u2013/g, "-")
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[^\x00-\x7F]/g, (c) => c.charCodeAt(0) > 255 ? "" : c);
}

function fmt(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pct(n) {
  return Number(n || 0).toFixed(1) + "%";
}

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
 * Compute per-line billing amounts from SOV items + pay app lines.
 */
export function computePayAppLines(sovItems, payApp) {
  return sovItems.map(sov => {
    const line = payApp.lines.find(l => l.sovItemId === sov.id) || { previousPercent: 0, currentPercent: 0, storedMaterial: 0 };
    const scheduled = sov.scheduledValue || 0;
    const prevWork = Math.round(scheduled * (line.previousPercent / 100));
    const totalCompleted = Math.round(scheduled * (line.currentPercent / 100));
    const currentWork = totalCompleted - prevWork;
    const stored = line.storedMaterial || 0;
    const totalCompletedAndStored = totalCompleted + stored;
    const retainage = Math.round(totalCompletedAndStored * (payApp.retainageRate || 10) / 100);
    const balance = scheduled - totalCompletedAndStored;
    return {
      lineNumber: sov.lineNumber,
      description: sov.description,
      scheduledValue: scheduled,
      previousWork: prevWork,
      currentWork,
      storedMaterial: stored,
      totalCompletedAndStored,
      retainage,
      balance,
      percentComplete: line.currentPercent,
    };
  });
}

/**
 * Generate AIA G702/G703 style Pay Application PDF.
 */
export async function generatePayAppPdf(project, sovItems, payApp, company = {}) {
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "landscape" });
  let y = 0;

  const companyName  = company.name    || "Eagles Brothers Constructors";
  const companyAddr  = company.address || "7801 N Shepherd Dr, Suite 107, Houston, TX 77088";
  const companyPhone = company.phone   || "(346) 970-7093";
  const companyEmail = company.email   || "abner@ebconstructors.com";

  const periodDate = (() => {
    const d = new Date(payApp.periodDate + "T00:00:00");
    if (isNaN(d)) return payApp.periodDate;
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  })();

  const logo = await loadLogo();
  const lines = computePayAppLines(sovItems, payApp);

  // Totals
  const totalScheduled = lines.reduce((s, l) => s + l.scheduledValue, 0);
  const totalPrevious = lines.reduce((s, l) => s + l.previousWork, 0);
  const totalCurrent = lines.reduce((s, l) => s + l.currentWork, 0);
  const totalStored = lines.reduce((s, l) => s + l.storedMaterial, 0);
  const totalCompletedStored = lines.reduce((s, l) => s + l.totalCompletedAndStored, 0);
  const totalRetainage = lines.reduce((s, l) => s + l.retainage, 0);
  const totalBalance = lines.reduce((s, l) => s + l.balance, 0);
  const overallPercent = totalScheduled > 0 ? (totalCompletedStored / totalScheduled) * 100 : 0;

  function checkPage(needed = 12) {
    if (y + needed > PH - 20) {
      addFooter();
      doc.addPage();
      doc.setFillColor(...C.amber);
      doc.rect(0, 0, PW, 2, "F");
      y = 10;
    }
  }

  function addFooter() {
    doc.setFontSize(7);
    doc.setTextColor(...C.medGray);
    doc.text(
      safe(`${companyName}  |  Pay Application #${payApp.periodNumber}  |  Generated ${new Date().toLocaleDateString()}`),
      PW / 2, PH - 6, { align: "center" }
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  G702 — COVER SHEET (APPLICATION AND CERTIFICATE FOR PAYMENT)
  // ═══════════════════════════════════════════════════════════
  const headerH = 24;
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, headerH, "F");

  if (logo) {
    try {
      const aspect = logo.w / logo.h;
      const logoH = headerH - 6;
      const logoW = logoH * aspect;
      doc.addImage(logo.data, "PNG", ML, 3, logoW, logoH);
    } catch { /* fallback */ }
  }

  doc.setTextColor(...C.white);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(safe(companyAddr), PW - MR, 9, { align: "right" });
  doc.text(safe(companyPhone + "  |  " + companyEmail), PW - MR, 15, { align: "right" });

  // Title bar
  y = headerH + 3;
  doc.setFillColor(...C.amber);
  doc.rect(ML, y, CW, 9, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("APPLICATION AND CERTIFICATE FOR PAYMENT", ML + 3, y + 6.5);
  doc.setFontSize(10);
  doc.text(safe(`#${payApp.periodNumber}`), PW - MR - 3, y + 6.5, { align: "right" });
  y += 14;

  // Project info grid
  doc.setTextColor(...C.darkGray);
  doc.setFontSize(8);
  const col1 = ML;
  const col2 = ML + CW * 0.5;

  const infoRows = [
    [["PROJECT:", safe(project.name)], ["APPLICATION NO:", String(payApp.periodNumber)]],
    [["TO (GC):", safe(project.gc || "")], ["PERIOD TO:", periodDate]],
    [["ADDRESS:", safe(project.address || "")], ["CONTRACT:", fmt(project.contract || 0)]],
    [["FROM:", companyName], ["STATUS:", (payApp.status || "draft").toUpperCase()]],
  ];

  infoRows.forEach(row => {
    doc.setFont("helvetica", "bold");
    doc.text(row[0][0], col1, y);
    doc.setFont("helvetica", "normal");
    doc.text(row[0][1], col1 + 30, y);
    doc.setFont("helvetica", "bold");
    doc.text(row[1][0], col2, y);
    doc.setFont("helvetica", "normal");
    doc.text(row[1][1], col2 + 35, y);
    y += 5;
  });

  // G702 Summary box
  y += 4;
  doc.setFillColor(...C.bg);
  doc.rect(ML, y, CW, 42, "F");
  doc.setDrawColor(...C.ltGray);
  doc.rect(ML, y, CW, 42, "S");

  const summaryY = y + 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.navy);
  doc.text("SUMMARY", ML + 4, summaryY);

  doc.setFontSize(8);
  doc.setTextColor(...C.darkGray);
  const sCol1 = ML + 4;
  const sCol2 = ML + CW * 0.5;
  let sy = summaryY + 7;

  const summaryLines = [
    [["1. ORIGINAL CONTRACT SUM", fmt(project.contract || 0)], ["5. TOTAL COMPLETED & STORED (3+4)", fmt(totalCompletedStored)]],
    [["2. NET CHANGE BY CHANGE ORDERS", fmt(0)], ["6. RETAINAGE (" + (payApp.retainageRate || 10) + "%)", fmt(totalRetainage)]],
    [["3. CONTRACT SUM TO DATE (1+2)", fmt(project.contract || 0)], ["7. TOTAL EARNED LESS RETAINAGE (5-6)", fmt(totalCompletedStored - totalRetainage)]],
    [["4. TOTAL COMPLETED & STORED TO DATE", fmt(totalCompletedStored)], ["8. LESS PREVIOUS CERTIFICATES", fmt(totalPrevious - Math.round(totalPrevious * (payApp.retainageRate || 10) / 100))]],
    [["", ""], ["9. CURRENT PAYMENT DUE (7-8)", fmt(totalCurrent - Math.round(totalCurrent * (payApp.retainageRate || 10) / 100))]],
  ];

  summaryLines.forEach(row => {
    doc.setFont("helvetica", "normal");
    doc.text(safe(row[0][0]), sCol1, sy);
    doc.setFont("helvetica", "bold");
    doc.text(row[0][1], sCol1 + 80, sy);
    doc.setFont("helvetica", "normal");
    doc.text(safe(row[1][0]), sCol2, sy);
    doc.setFont("helvetica", "bold");
    doc.text(row[1][1], sCol2 + 80, sy);
    sy += 6;
  });

  y += 48;

  // Signature lines
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.medGray);
  const sigW = CW / 2 - 10;
  doc.line(ML, y + 10, ML + sigW, y + 10);
  doc.text("Contractor Signature / Date", ML, y + 14);
  doc.line(ML + sigW + 20, y + 10, ML + CW, y + 10);
  doc.text("Owner/GC Approval / Date", ML + sigW + 20, y + 14);

  addFooter();

  // ═══════════════════════════════════════════════════════════
  //  G703 — CONTINUATION SHEET (SCHEDULE OF VALUES)
  // ═══════════════════════════════════════════════════════════
  doc.addPage();
  y = 0;

  // Mini header
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, 14, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CONTINUATION SHEET — SCHEDULE OF VALUES", ML + 3, 10);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(safe(`${project.name}  |  Application #${payApp.periodNumber}  |  Period to ${periodDate}`), PW - MR - 3, 10, { align: "right" });

  y = 18;

  // Column headers
  const cols = [
    { label: "#", x: ML, w: 8 },
    { label: "DESCRIPTION OF WORK", x: ML + 8, w: 52 },
    { label: "SCHEDULED\nVALUE", x: ML + 60, w: 28, align: "right" },
    { label: "PREVIOUS\nWORK", x: ML + 88, w: 28, align: "right" },
    { label: "THIS PERIOD\nWORK", x: ML + 116, w: 28, align: "right" },
    { label: "STORED\nMATERIAL", x: ML + 144, w: 24, align: "right" },
    { label: "TOTAL\nCOMPLETED", x: ML + 168, w: 28, align: "right" },
    { label: "%", x: ML + 196, w: 12, align: "right" },
    { label: "RETAINAGE", x: ML + 208, w: 24, align: "right" },
    { label: "BALANCE\nTO FINISH", x: ML + 232, w: 24, align: "right" },
  ];

  doc.setFillColor(...C.navy);
  doc.rect(ML, y, CW, 10, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");

  cols.forEach(col => {
    const lines = col.label.split("\n");
    const startY = lines.length > 1 ? y + 3.5 : y + 6;
    lines.forEach((line, i) => {
      doc.text(safe(line), col.align === "right" ? col.x + col.w - 1 : col.x + 1, startY + i * 3.2, { align: col.align || "left" });
    });
  });

  y += 12;

  // Data rows
  doc.setFontSize(7);
  const rowH = 6;

  lines.forEach((line, idx) => {
    checkPage(rowH + 2);
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 248);
      doc.rect(ML, y - 1, CW, rowH, "F");
    }

    doc.setTextColor(...C.darkGray);
    doc.setFont("helvetica", "normal");
    doc.text(String(line.lineNumber), cols[0].x + 1, y + 3);
    doc.text(safe(line.description).substring(0, 40), cols[1].x + 1, y + 3);
    doc.text(fmt(line.scheduledValue), cols[2].x + cols[2].w - 1, y + 3, { align: "right" });
    doc.text(fmt(line.previousWork), cols[3].x + cols[3].w - 1, y + 3, { align: "right" });

    // Highlight current work
    if (line.currentWork > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.green);
    }
    doc.text(fmt(line.currentWork), cols[4].x + cols[4].w - 1, y + 3, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.darkGray);

    doc.text(fmt(line.storedMaterial), cols[5].x + cols[5].w - 1, y + 3, { align: "right" });
    doc.text(fmt(line.totalCompletedAndStored), cols[6].x + cols[6].w - 1, y + 3, { align: "right" });
    doc.text(pct(line.percentComplete), cols[7].x + cols[7].w - 1, y + 3, { align: "right" });
    doc.text(fmt(line.retainage), cols[8].x + cols[8].w - 1, y + 3, { align: "right" });
    doc.text(fmt(line.balance), cols[9].x + cols[9].w - 1, y + 3, { align: "right" });

    y += rowH;
  });

  // Totals row
  checkPage(10);
  doc.setDrawColor(...C.navy);
  doc.line(ML, y, ML + CW, y);
  y += 2;
  doc.setFillColor(...C.navy);
  doc.rect(ML, y - 1, CW, rowH + 1, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("TOTALS", cols[1].x + 1, y + 3.5);
  doc.text(fmt(totalScheduled), cols[2].x + cols[2].w - 1, y + 3.5, { align: "right" });
  doc.text(fmt(totalPrevious), cols[3].x + cols[3].w - 1, y + 3.5, { align: "right" });
  doc.text(fmt(totalCurrent), cols[4].x + cols[4].w - 1, y + 3.5, { align: "right" });
  doc.text(fmt(totalStored), cols[5].x + cols[5].w - 1, y + 3.5, { align: "right" });
  doc.text(fmt(totalCompletedStored), cols[6].x + cols[6].w - 1, y + 3.5, { align: "right" });
  doc.text(pct(overallPercent), cols[7].x + cols[7].w - 1, y + 3.5, { align: "right" });
  doc.text(fmt(totalRetainage), cols[8].x + cols[8].w - 1, y + 3.5, { align: "right" });
  doc.text(fmt(totalBalance), cols[9].x + cols[9].w - 1, y + 3.5, { align: "right" });

  addFooter();

  // Save
  const fileName = safe(`Pay-App-${payApp.periodNumber}-${project.name.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`);
  doc.save(fileName);
}
