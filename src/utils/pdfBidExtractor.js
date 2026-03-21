// ═══════════════════════════════════════════════════════════════
//  EBC-OS · PDF Bid Extractor
//  Extracts structured bid data from EBC proposal PDFs
//  Uses pdf.js for client-side text extraction + regex parsing
// ═══════════════════════════════════════════════════════════════

import * as pdfjsLib from "pdfjs-dist";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

/**
 * Extract raw text from a PDF file (File or ArrayBuffer)
 * Preserves line breaks by tracking Y-coordinates of text items
 */
export async function extractPdfText(file) {
  const arrayBuffer =
    file instanceof ArrayBuffer ? file : await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group text items by Y position, then sort by X within each row
    // This properly handles side-by-side columns (multi-room proposals)
    // pdf.js items: transform[4] = X, transform[5] = Y
    const rows = new Map(); // Y -> [{x, str}]

    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = item.transform ? Math.round(item.transform[5]) : 0;
      const x = item.transform ? Math.round(item.transform[4]) : 0;

      // Find existing row within Y tolerance (±3px)
      let matchedY = null;
      for (const existingY of rows.keys()) {
        if (Math.abs(existingY - y) <= 3) { matchedY = existingY; break; }
      }
      const rowKey = matchedY !== null ? matchedY : y;
      if (!rows.has(rowKey)) rows.set(rowKey, []);
      rows.get(rowKey).push({ x, str: item.str });
    }

    // Sort rows by Y (descending = top of page first for PDF coords)
    const sortedRows = [...rows.entries()].sort((a, b) => b[0] - a[0]);

    // For each row, sort items by X (left to right) and detect columns
    const lines = [];
    for (const [, items] of sortedRows) {
      items.sort((a, b) => a.x - b.x);

      // Detect if this row has multiple columns (large X gap)
      // If items are spread across columns, join with " " preserving order
      let line = "";
      let lastX = -999;
      for (const item of items) {
        const gap = item.x - lastX;
        if (line && gap > 50) {
          // Large gap = likely separate column, use tab-like separator
          line += "  \t  " + item.str;
        } else if (line) {
          line += " " + item.str;
        } else {
          line = item.str;
        }
        lastX = item.x + (item.str.length * 5); // rough estimate of text end
      }
      if (line.trim()) lines.push(line);
    }

    pages.push(lines.join("\n"));
  }

  return pages.join("\n\n");
}

/**
 * Parse extracted text into structured bid fields
 * Handles EBC proposal format + common GC bid invite formats
 */
export function parseBidText(text) {
  const result = {
    name: "",
    gc: "",
    value: 0,
    due: "",
    bidDate: "",
    phase: "",
    address: "",
    scope: [],
    notes: "",
    contact: "",
    // Line items breakdown
    lineItems: [],
    alternate: "",
    alternates: [], // structured: [{description, type, amount}]
    includes: [],
    excludes: [],
  };

  if (!text || text.trim().length === 0) return result;

  // Keep original text with newlines for line-item parsing
  const raw = text.trim();
  // Normalized (single-line) for general pattern matching
  const t = text.replace(/\s+/g, " ").trim();

  // ── Project Name ──
  const namePatterns = [
    /Project\s*Name\s*:\s*(.+?)(?=Project\s*Address|Date:|GC:|General|$)/i,
    /RE\s*:\s*(.+?)(?=\n|Date:|Address)/i,
    /Subject\s*:\s*(.+?)(?=\n|Date:|Address)/i,
    /Proposal\s*(?:for|:)\s*(.+?)(?=\n|Date:|Address|Project\s*Address)/i,
  ];
  for (const pat of namePatterns) {
    const m = t.match(pat);
    if (m) {
      result.name = m[1].trim().replace(/\s+/g, " ");
      break;
    }
  }

  // ── Project Address ──
  const addrPatterns = [
    /Project\s*Address\s*:\s*(.+?)(?=Demo|Drywall|Date:|Total|INCLUDES|Scope|$)/i,
    /Address\s*:\s*(.+?)(?=Demo|Drywall|Date:|Total|INCLUDES|Scope|$)/i,
    /Location\s*:\s*(.+?)(?=Demo|Drywall|Date:|Total|INCLUDES|Scope|$)/i,
  ];
  for (const pat of addrPatterns) {
    const m = t.match(pat);
    if (m) {
      result.address = m[1].trim().replace(/\s+/g, " ");
      break;
    }
  }

  // ── Date ──
  const datePatterns = [
    /Date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /Date\s*:\s*([A-Z][a-z]+\s+\d{1,2},?\s*\d{4})/i,
    /Dated?\s*:\s*(\d{1,2}-\d{1,2}-\d{2,4})/i,
  ];
  for (const pat of datePatterns) {
    const m = t.match(pat);
    if (m) {
      result.bidDate = m[1].trim();
      result.due = m[1].trim();
      break;
    }
  }

  // ── GC Name ──
  const gcPatterns = [
    /(?:General\s*Contractor|GC)\s*:\s*(.+?)(?=\n|Date:|Project|Address|$)/i,
    /(?:Attention|Attn)\s*:\s*(.+?)(?=\n|Date:|Project|RE:|$)/i,
    /(?:To|Submitted\s*to)\s*:\s*(.+?)(?=\n|Date:|Project|RE:|From|$)/i,
  ];
  for (const pat of gcPatterns) {
    const m = t.match(pat);
    if (m) {
      result.gc = m[1].trim().replace(/\s+/g, " ");
      break;
    }
  }

  // ── Line Items (Demo, Drywall, ACT, etc.) ──
  // Extract the pricing section: everything between the address and "INCLUDES"
  // This isolates the line items from the rest of the document to prevent
  // false matches in INCLUDES/EXCLUDES sections
  const pricingSection = (() => {
    // Try to find the pricing block in raw text (with newlines)
    const rawUpper = raw.toUpperCase();
    const addrEnd = rawUpper.indexOf("PROJECT ADDRESS");
    const includesStart = rawUpper.indexOf("INCLUDES");
    const alternatesStart = rawUpper.search(/\bALTERNATE[S]?\s*(?::|$)/m);
    const totalIdx = rawUpper.indexOf("TOTAL");
    // Pricing lives between address and ALTERNATES (or INCLUDES if no alternates, or Total)
    const start = addrEnd >= 0 ? raw.indexOf("\n", addrEnd) : 0;
    // End pricing at whichever comes first: ALTERNATES section or INCLUDES
    const sectionEnd = alternatesStart >= 0 && alternatesStart > start ? alternatesStart
      : (includesStart >= 0 ? includesStart : (totalIdx >= 0 ? totalIdx + 50 : raw.length));
    return raw.substring(start, sectionEnd);
  })();

  // Label → scope mapping
  const labelToScope = {
    "demo": "Demo",
    "drywall": "GWB", "drywall/build back": "GWB", "build back": "GWB",
    "metal framing": "Metal Framing", "metal stud": "Metal Framing", "stud framing": "Metal Framing",
    "steel stud": "Metal Framing", "light gauge": "Metal Framing", "framing": "Metal Framing",
    "studs and track": "Metal Framing", "studs & track": "Metal Framing", "stud and track": "Metal Framing",
    "interior framing": "Metal Framing", "cold-formed": "Metal Framing", "cold formed": "Metal Framing",
    "act": "ACT",
    "insulation": "Insulation",
    "frp": "FRP",
    "fireproofing": "Fireproofing",
    "shaft wall": "Shaft Wall",
    "lead-lined": "Lead-Lined", "lead lined": "Lead-Lined",
    "icra": "ICRA",
    "l5 finish": "L5 Finish", "level 5": "L5 Finish",
    "seismic act": "Seismic ACT",
  };

  // ── Multi-strategy line item extraction ──
  // Handles: single-room, multi-room side-by-side, and pdf.js split-line formats
  const pricingLines = pricingSection.split("\n").map((l) => l.trim()).filter(Boolean);

  // First: extract ALL "Label: $Amount" pairs from the pricing section using regex on full text
  // This catches both single-line and side-by-side multi-room formats like:
  //   "Demo: $1,500 Demo: $1,200" or "Drywall/Build Back: $20,400 Drywall/Build Back: $38,600"
  const inlinePattern = /(?:Demo|Drywall(?:\/Build\s*Back)?|Build\s*Back|Metal\s*(?:Stud\s*)?Framing|(?:Metal|Steel)\s*Studs?|Stud\s*Framing|Studs?\s*(?:and|&)\s*Track|Interior\s*Framing|Cold[\s-]*Formed|Light\s*Gauge(?:\s*(?:Metal\s*)?Framing)?|Framing|ACT|Insulation|FRP|Fireproofing|Shaft\s*Wall|Lead[\s-]*Lined?|ICRA|L5\s*Finish|Level\s*5|Seismic\s*ACT)\s*:\s*\$\s*([\d,]+(?:\.\d{2})?)/gi;

  const labelAmountPattern = /([A-Za-z][A-Za-z /\-]*?)\s*:\s*\$\s*([\d,]+(?:\.\d{2})?)/g;
  let inlineMatch;
  let foundInline = false;
  // Use the broader pattern to catch all "Label: $Amount" pairs
  while ((inlineMatch = labelAmountPattern.exec(pricingSection)) !== null) {
    const lbl = inlineMatch[1].trim();
    const amt = parseFloat(inlineMatch[2].replace(/,/g, ""));
    // Skip Total and Alternate labels
    if (/^total$/i.test(lbl) || /^alternate$/i.test(lbl)) continue;
    // Skip room headers that aren't real line items
    if (/room|suite|area|floor|level\s*\d|phase/i.test(lbl) && !/level\s*5/i.test(lbl)) continue;

    result.lineItems.push({ label: lbl, amount: amt });
    const scopeKey = Object.keys(labelToScope).find((k) => lbl.toLowerCase().includes(k));
    if (scopeKey && !result.scope.includes(labelToScope[scopeKey])) {
      result.scope.push(labelToScope[scopeKey]);
    }
    foundInline = true;
  }

  // Fallback: Strategy for pdf.js split-line format (labels and values on separate lines)
  // Handles room-block patterns like:
  //   Scan Room 289 / Demo: / Drywall/Build Back: / ACT: / $1,500 / $20,400 / $1,900 / Total: $23,800
  if (!foundInline) {
    // Process pricing section in blocks separated by room headers or Total lines
    let currentLabels = [];
    for (const line of pricingLines) {
      // Skip alternate lines
      if (/^alternate/i.test(line)) continue;

      // Total line resets the block — pair accumulated labels with preceding values
      if (/^total/i.test(line)) {
        currentLabels = [];
        continue;
      }

      // Room header — reset labels for new block
      if (/^(?:Scan\s*Room|Stress\s*Room|Suite|Room|Area|Floor|Phase)\s/i.test(line)) {
        currentLabels = [];
        continue;
      }

      // Tab-separated lines: split into columns and process each
      const columns = line.split(/\s*\t\s*/);
      for (const col of columns) {
        const trimmed = col.trim();
        if (!trimmed) continue;

        // Label line (ends with ":")
        if (/^[A-Za-z].*:\s*$/.test(trimmed)) {
          currentLabels.push(trimmed.replace(/:\s*$/, "").trim());
        }
        // Dollar value line
        else if (/^\$\s*[\d,]+/.test(trimmed)) {
          const amt = parseFloat(trimmed.replace(/^\$\s*/, "").replace(/,/g, ""));
          if (currentLabels.length > 0) {
            const lbl = currentLabels.shift();
            result.lineItems.push({ label: lbl, amount: amt });
            const scopeKey = Object.keys(labelToScope).find((k) => lbl.toLowerCase().includes(k));
            if (scopeKey && !result.scope.includes(labelToScope[scopeKey])) {
              result.scope.push(labelToScope[scopeKey]);
            }
          }
        }
      }
    }
  }

  // ── Aggregate line items by type (sum multi-room) ──
  // e.g. Demo: $1,500 + Demo: $1,200 + Demo: $800 → Demo: $3,500
  const aggregated = {};
  for (const li of result.lineItems) {
    const key = li.label.toLowerCase().replace(/\s*\/\s*/g, "/");
    // Normalize label
    const normalLabel = li.label;
    if (!aggregated[key]) {
      aggregated[key] = { label: normalLabel, amount: 0, count: 0 };
    }
    aggregated[key].amount += li.amount;
    aggregated[key].count += 1;
  }
  // Store both raw and aggregated
  result.lineItemsRaw = [...result.lineItems]; // keep individual room items
  result.lineItems = Object.values(aggregated).map(({ label, amount, count }) => ({
    label: count > 1 ? `${label} (${count} areas)` : label,
    amount,
  }));

  // ── Total Value ──
  // Sum ALL "Total: $X" found in pricing section (handles multi-room)
  const totalRegex = /Total\s*:\s*\$\s*([\d,]+(?:\.\d{2})?)/gi;
  let totalMatch;
  let totalSum = 0;
  let totalCount = 0;
  while ((totalMatch = totalRegex.exec(pricingSection)) !== null) {
    totalSum += parseFloat(totalMatch[1].replace(/,/g, ""));
    totalCount++;
  }
  if (totalSum > 0) {
    result.value = totalSum;
  }
  // Fallback: try normalized text for single total
  if (result.value === 0) {
    const fallbackPatterns = [
      /Total\s*:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
      /Base\s*Bid\s*:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
      /Bid\s*Amount\s*:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    ];
    for (const pat of fallbackPatterns) {
      const m = t.match(pat);
      if (m) { result.value = parseFloat(m[1].replace(/,/g, "")); break; }
    }
  }
  // Last resort: sum line items
  if (result.value === 0 && result.lineItems.length > 0) {
    result.value = result.lineItems.reduce((sum, li) => sum + li.amount, 0);
  }

  // ── Alternate(s) — capture ALL alternates as structured objects ──
  // Handles formats like:
  //   "Alternate 1: Demo floors (VCT) ADD $2,400"
  //   "ALT: Remove ACT grid DEDUCT $3,500"
  //   "Alternate: Upgrade to Level 5 finish Add $1,200"
  //   "Alternate 2: Remove insulation ($800)"
  //
  // First, try to find an ALTERNATES section between pricing and INCLUDES
  // EBC proposals: pricing table → ALTERNATES → INCLUDES → EXCLUDES
  const rawUpper2 = raw.toUpperCase();
  const altSectionStart = rawUpper2.search(/\bALTERNATE[S]?\s*(?::|$)/im);
  const includesIdx = rawUpper2.indexOf("INCLUDES");
  const excludesIdx = rawUpper2.indexOf("EXCLUDES");
  const altSectionEnd = includesIdx >= 0 ? includesIdx : (excludesIdx >= 0 ? excludesIdx : raw.length);

  // Extract alternates from both the section (if found) and inline patterns
  const altTexts = [];

  // Strategy 1: Parse ALTERNATES section from raw text (preserves line breaks)
  if (altSectionStart >= 0 && altSectionStart < altSectionEnd) {
    const altBlock = raw.substring(altSectionStart, altSectionEnd);
    // Split by "Alternate" or "ALT" boundaries, or numbered items
    const altLineRegex = /(?:Alternate\s*\d*|ALT)\s*[:\-]\s*(.+?)(?=(?:Alternate\s*\d*|ALT)\s*[:\-]|$)/gi;
    let altLineM;
    while ((altLineM = altLineRegex.exec(altBlock)) !== null) {
      altTexts.push(altLineM[1].trim());
    }
  }

  // Strategy 2: Fallback — scan normalized text for inline alternate patterns
  if (altTexts.length === 0) {
    const altRegex = /(?:Alternate\s*\d*|ALT)\s*[:\-]\s*(.+?)(?=(?:Alternate\s*\d*|ALT)\s*[:\-]|INCLUDES|EXCLUDES|Note:|\*|$)/gi;
    let altM;
    while ((altM = altRegex.exec(t)) !== null) {
      altTexts.push(altM[1].trim());
    }
  }

  // Parse each alternate text into structured {description, type, amount}
  const structuredAlternates = altTexts.map((altText, idx) => {
    let type = "add"; // default
    let amount = 0;
    let description = altText;

    // Try to extract ADD/DEDUCT and dollar amount
    // Patterns: "ADD $2,400", "DEDUCT $3,500", "($800)", "- $1,200"
    const addMatch = altText.match(/\b(ADD)\s*\$\s*([\d,]+(?:\.\d{2})?)/i);
    const deductMatch = altText.match(/\b(DEDUCT|DEDUCTION)\s*\$\s*([\d,]+(?:\.\d{2})?)/i);
    const parenMatch = altText.match(/\(\s*\$?\s*([\d,]+(?:\.\d{2})?)\s*\)/);
    const trailingDollar = altText.match(/\$\s*([\d,]+(?:\.\d{2})?)\s*$/);

    if (deductMatch) {
      type = "deduct";
      amount = parseFloat(deductMatch[2].replace(/,/g, ""));
      description = altText.replace(/\s*(?:DEDUCT|DEDUCTION)\s*\$\s*[\d,]+(?:\.\d{2})?\s*/i, "").trim();
    } else if (addMatch) {
      type = "add";
      amount = parseFloat(addMatch[2].replace(/,/g, ""));
      description = altText.replace(/\s*ADD\s*\$\s*[\d,]+(?:\.\d{2})?\s*/i, "").trim();
    } else if (parenMatch) {
      // Parenthesized amount — could be either, default to deduct
      type = "deduct";
      amount = parseFloat(parenMatch[1].replace(/,/g, ""));
      description = altText.replace(/\s*\(\s*\$?\s*[\d,]+(?:\.\d{2})?\s*\)\s*/, "").trim();
    } else if (trailingDollar) {
      // Bare dollar at end — check context for add/deduct keywords
      amount = parseFloat(trailingDollar[1].replace(/,/g, ""));
      if (/deduct|remove|delete|omit|credit/i.test(altText)) {
        type = "deduct";
      }
      description = altText.replace(/\s*\$\s*[\d,]+(?:\.\d{2})?\s*$/, "").trim();
    }

    // Clean up description — remove trailing colons, dashes, etc.
    description = description.replace(/[:\-\s]+$/, "").trim();
    if (!description) description = altText; // fallback to original text

    return {
      id: "alt_scan_" + Date.now() + "_" + idx,
      description,
      type,
      amount,
    };
  });

  result.alternates = structuredAlternates;
  // Keep legacy string field for backward compatibility
  result.alternate = altTexts.join(" | ");

  // ── Room headers for notes ──
  const roomHeaders = pricingSection.match(/(?:Scan\s*Room|Suite|Stress\s*Room|Room)\s*\S+/gi) || [];
  if (roomHeaders.length > 0 || totalCount > 1) {
    result.rooms = roomHeaders;
  }

  // ── Scope detection from content ──
  const scopeKeywords = [
    { keyword: /lead[\s-]*lined/i, scope: "Lead-Lined" },
    { keyword: /sound\s*insulation|batt\s*insulation/i, scope: "Insulation" },
    { keyword: /metal\s*(?:stud\s*)?framing|(?:metal|steel)\s*studs?|stud\s*framing|studs?\s*(?:and|&)\s*track|light\s*gauge|cold[\s-]*formed|interior\s*framing/i, scope: "Metal Framing" },
    { keyword: /ACT\s*assembl|acoustical|ceiling\s*tile/i, scope: "ACT" },
    { keyword: /drywall|gypsum|GWB|gyp\s*board/i, scope: "GWB" },
    { keyword: /demo(?:lition)?/i, scope: "Demo" },
    { keyword: /fire[\s-]*rat|fire[\s-]*proof/i, scope: "Fireproofing" },
    { keyword: /FRP/i, scope: "FRP" },
    { keyword: /shaft\s*wall/i, scope: "Shaft Wall" },
    { keyword: /ICRA|infection\s*control/i, scope: "ICRA" },
    { keyword: /deflection\s*track/i, scope: "Deflection Track" },
    { keyword: /L[\s-]*5\s*finish|level\s*5/i, scope: "L5 Finish" },
    { keyword: /seismic/i, scope: "Seismic ACT" },
  ];
  for (const { keyword, scope } of scopeKeywords) {
    if (keyword.test(t) && !result.scope.includes(scope)) {
      result.scope.push(scope);
    }
  }

  // ── Phase detection ──
  const phaseKeywords = [
    { keyword: /hospital|medical|clinic|heart\s*center|cardio|MRI|imaging|outpatient|surgical|healthcare/i, phase: "Medical" },
    { keyword: /school|university|college|campus|education|classroom/i, phase: "Education" },
    { keyword: /hotel|hospitality|resort|marriott|hilton|hyatt/i, phase: "Hospitality" },
    { keyword: /retail|store|shop|mall|restaurant/i, phase: "Retail" },
    { keyword: /church|worship|ministry|temple|mosque/i, phase: "Religious" },
    { keyword: /office|suite|tower|corporate|workspace/i, phase: "Commercial" },
    { keyword: /warehouse|industrial|plant|manufacturing/i, phase: "Industrial" },
    { keyword: /apartment|residential|condo|housing|home/i, phase: "Residential" },
  ];
  for (const { keyword, phase } of phaseKeywords) {
    if (keyword.test(t)) {
      result.phase = phase;
      break;
    }
  }
  if (!result.phase) result.phase = "Commercial"; // default

  // ── INCLUDES list ──
  const includesMatch = t.match(/INCLUDES\s*:\s*([\s\S]*?)(?=EXCLUDES|Note:|Alternate|\*|$)/i);
  if (includesMatch) {
    const items = includesMatch[1]
      .split(/\d+\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    result.includes = items;
  }

  // ── EXCLUDES list ──
  const excludesMatch = t.match(/EXCLUDES\s*:\s*([\s\S]*?)(?=Note:|\*|Alternate|$)/i);
  if (excludesMatch) {
    const items = excludesMatch[1]
      .split(/\d+\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    result.excludes = items;
  }

  // ── Contact info ──
  const contactMatch = t.match(
    /(?:contact|questions.*contact)\s+([A-Z][a-z]+\s+(?:[A-Z][a-z]+\s+)?[A-Z][a-z]+)\s+(\d{3}[\s-]\d{3}[\s-]\d{4})/i
  );
  if (contactMatch) {
    result.contact = `${contactMatch[1]} ${contactMatch[2]}`;
  }

  // ── Build notes from includes/excludes/alternate ──
  const notesParts = [];
  // Room breakdown for multi-room proposals
  if (result.rooms && result.rooms.length > 0) {
    notesParts.push("ROOMS: " + result.rooms.join(", "));
  }
  if (result.lineItemsRaw && result.lineItemsRaw.length > result.lineItems.length) {
    // Show individual room breakdown
    notesParts.push(
      "LINE ITEMS (by area): " +
        result.lineItemsRaw.map((li) => `${li.label}: $${li.amount.toLocaleString()}`).join(" | ")
    );
    notesParts.push(
      "LINE ITEMS (totals): " +
        result.lineItems.map((li) => `${li.label}: $${li.amount.toLocaleString()}`).join(" | ")
    );
  } else if (result.lineItems.length > 0) {
    notesParts.push(
      "LINE ITEMS: " +
        result.lineItems.map((li) => `${li.label}: $${li.amount.toLocaleString()}`).join(" | ")
    );
  }
  if (result.alternates.length > 0) {
    notesParts.push("ALTERNATE(S): " + result.alternates.map(a =>
      `${a.description} (${a.type.toUpperCase()}${a.amount ? " $" + a.amount.toLocaleString() : ""})`
    ).join(" | "));
  } else if (result.alternate) {
    notesParts.push("ALTERNATE(S): " + result.alternate);
  }
  if (result.includes.length > 0) {
    notesParts.push("INCLUDES: " + result.includes.join("; "));
  }
  if (result.excludes.length > 0) {
    notesParts.push("EXCLUDES: " + result.excludes.join("; "));
  }
  result.notes = notesParts.join("\n\n");

  // ── Determine month from date ──
  if (result.bidDate) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    // Try MM/DD/YYYY
    const mdyMatch = result.bidDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (mdyMatch) {
      const monthIdx = parseInt(mdyMatch[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) result.month = months[monthIdx];
      // Normalize to "Mon DD, YYYY"
      const year = mdyMatch[3].length === 2 ? "20" + mdyMatch[3] : mdyMatch[3];
      result.bidDate = `${months[monthIdx]} ${parseInt(mdyMatch[2], 10)}, ${year}`;
      result.due = result.bidDate;
    }
    // Try "Month DD, YYYY"
    const mdy2 = result.bidDate.match(/([A-Z][a-z]+)\s+(\d{1,2}),?\s*(\d{4})/);
    if (mdy2) {
      const mi = months.findIndex((m) => mdy2[1].startsWith(m));
      if (mi >= 0) result.month = months[mi];
    }
  }

  return result;
}

/**
 * Full pipeline: File → extracted text → structured bid data
 */
export async function extractBidFromPdf(file) {
  const text = await extractPdfText(file);
  const parsed = parseBidText(text);
  parsed._rawText = text; // keep raw text for AI analysis fallback
  return parsed;
}
