// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Plan Analyzer (local-only as of Apr 2026)
//  Extracts scope from construction PDFs using pdfjs — NO external AI.
//  Per user rule (feedback_no_external_ai.md): "No external AI APIs.
//  All parsing must be local/heuristic." External Claude calls killed.
// ═══════════════════════════════════════════════════════════════

/**
 * Extract text from all pages of a pdfjs document.
 * @param {PDFDocumentProxy} pdfDoc - pdfjs document
 * @returns {Promise<{pages: Array<{pageNum: number, text: string}>, fullText: string}>}
 */
export async function extractPdfText(pdfDoc) {
  const pages = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(" ");
    pages.push({ pageNum: i, text });
  }
  const fullText = pages.map(p => `--- PAGE ${p.pageNum} ---\n${p.text}`).join("\n\n");
  return { pages, fullText };
}

/**
 * Analyze construction plans and return structured scope for EBC (drywall/framing sub).
 * @param {string} apiKey - Claude API key
 * @param {string} planText - Extracted text from PDF pages
 * @param {Array} assemblies - EBC assembly library [{code, name, category, unit}]
 * @returns {Promise<Object>} Structured analysis result
 */
/**
 * Local heuristic plan analysis — no external AI, no API keys.
 * Extracts project metadata, wall types, and scope hints using regex/pattern matching
 * against the plan text that pdfjs extracted locally.
 *
 * Signature preserved for backward compat: first arg (apiKey) is ignored.
 */
export async function analyzePlans(_apiKey, planText, assemblies) {
  const text = String(planText || "");
  const norm = text.replace(/\s+/g, " ");

  // ── Project metadata ──
  const project = {
    name: extract(norm, /(?:project\s*name|project|project\s*title)\s*[:\-]?\s*([A-Z][A-Za-z0-9\s,.\-&]{4,80})/i) || "",
    address: extract(norm, /\b(\d{2,5}\s+[NSEW]?\.?\s*[A-Z][A-Za-z\s]+(?:Street|St\.?|Ave\.?|Avenue|Blvd\.?|Boulevard|Road|Rd\.?|Drive|Dr\.?|Way|Lane|Ln\.?|Pkwy\.?|Parkway)[^\n,]{0,60})/i) || "",
    architect: extract(norm, /(?:architect|prepared\s*by)\s*[:\-]?\s*([A-Z][A-Za-z0-9\s,.&\-']{3,60})/i) || "",
    gc: extract(norm, /(?:general\s*contractor|gc|contractor)\s*[:\-]\s*([A-Z][A-Za-z0-9\s,.&\-']{3,60})/i),
    size_sf: (() => { const m = /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:SF|sq\.?\s*ft|square\s*feet)/i.exec(norm); return m ? Number(m[1].replace(/,/g, "")) : null; })(),
    occupancy: extract(norm, /(?:occupancy|occ\.?\s*type|occupancy\s*group)\s*[:\-]?\s*([A-Z][\w\s\-\/,]{2,40})/i) || "",
    building_type: extract(norm, /(?:building\s*type|construction\s*type)\s*[:\-]?\s*([A-Z0-9][\w\s\-\/,]{2,40})/i) || "",
    ceiling_height: extract(norm, /(?:ceiling\s*height|ceil\.?\s*ht\.?|AFF)\s*[:\-=]?\s*(\d{1,2}['\-]\d{1,2}[""']?|\d{1,2}\s*(?:ft|feet)[^\n]{0,20})/i) || "",
  };

  // ── Wall type detection ──
  // Look for common wall type call-outs: "TYPE A1", "W-1", "Wall Type 1", etc.
  const wallTypePatterns = [
    /\b(?:TYPE|WALL\s*TYPE|W-)\s*([A-Z]\d+|\d+)\b/gi,
    /\b([A-Z]\d{1,2})\s*(?:WALL|PARTITION|DEMISING)/gi,
  ];
  const wallTypes = new Set();
  for (const pat of wallTypePatterns) {
    let m;
    while ((m = pat.exec(norm)) !== null) {
      if (m[1]) wallTypes.add(m[1].toUpperCase());
    }
  }

  // Match wall types to EBC assembly codes by fuzzy code matching
  const asmByCode = new Map((assemblies || []).map(a => [String(a.code || "").toUpperCase(), a]));
  const conditions = [];
  for (const wt of wallTypes) {
    const asm = asmByCode.get(wt) || [...asmByCode.values()].find(a => (a.code || "").toUpperCase().includes(wt));
    conditions.push({
      name: `Wall Type ${wt}`,
      type: "linear",
      folder: "Walls",
      assembly_code: asm?.code || "",
      height: 10,
      notes: asm ? `Matched to ${asm.name}` : "No assembly match — map manually",
    });
  }

  // Ceiling type detection (ACT-1, ACT 1, etc.)
  const ceilingPat = /\b(ACT[-\s]?\d+|GYP[-\s]?BD|DRYWALL\s*CLG|EXPOSED\s*CLG)\b/gi;
  const ceilings = new Set();
  let m;
  while ((m = ceilingPat.exec(norm)) !== null) ceilings.add(m[1].replace(/\s+/g, "").toUpperCase());
  for (const c of ceilings) {
    conditions.push({ name: `Ceiling ${c}`, type: "area", folder: "Ceilings", assembly_code: "", height: 0, notes: "Detected from plan text — verify location" });
  }

  // ── Scope summary: keyword-based bullet points ──
  const scope_summary = [];
  if (/\bdemo(?:lition)?\b/i.test(norm)) scope_summary.push("Demolition scope present — verify extent");
  if (/\bmetal\s*stud/i.test(norm)) scope_summary.push("Metal stud framing indicated");
  if (/\bgwb|gyp(?:sum)?\s*bd|drywall/i.test(norm)) scope_summary.push("Drywall/GWB scope indicated");
  if (/\bfire[-\s]*(?:rated|caulk|stop)/i.test(norm)) scope_summary.push("Fire-rated / firestopping scope present");
  if (/\binsulation|sound\s*batt|acoustic\s*batt/i.test(norm)) scope_summary.push("Insulation / sound batting scope");
  if (/\bact|acoustic(?:al)?\s*(?:ceiling|tile)/i.test(norm)) scope_summary.push("Acoustical ceiling tile scope");
  if (/\bdoor\s*schedule|hollow\s*metal|hm\s*frame/i.test(norm)) scope_summary.push("Doors / frames indicated");
  if (/\bcorner\s*bead|control\s*joint/i.test(norm)) scope_summary.push("Corner bead / control joints needed");

  // ── Demo items ──
  const demo_items = [];
  const demoPat = /\b(?:remove|demo(?:lish)?|tear\s*down|demolition\s*of)\s+([^.;\n]{8,80})/gi;
  while ((m = demoPat.exec(norm)) !== null && demo_items.length < 10) {
    demo_items.push(m[1].trim().replace(/\s+/g, " "));
  }

  // ── RFI candidates: look for "by others", "N.I.C.", "TBD", "clarify", "confirm" ──
  const rfi_candidates = [];
  const rfiPat = /[.;\n]\s*([^.;\n]{10,120}?(?:by\s+others|n\.?i\.?c\.?|TBD|to\s+be\s+determined|clarify|confirm|verify\s+with)[^.;\n]{0,60})/gi;
  while ((m = rfiPat.exec(norm)) !== null && rfi_candidates.length < 8) {
    rfi_candidates.push(m[1].trim().replace(/\s+/g, " "));
  }

  // ── Alternate / separate prices ──
  const separate_prices = [];
  const altPat = /\b(?:alternate|alt\.|add\s*alt|separate\s*price|option)\s*#?\s*(\d+[^.;\n]{0,100})/gi;
  while ((m = altPat.exec(norm)) !== null && separate_prices.length < 5) {
    separate_prices.push(m[1].trim().replace(/\s+/g, " "));
  }

  // ── Finish info ──
  const paintPat = /\b(PT[-\s]?\d+)\s*[:\-]?\s*([A-Za-z][A-Za-z0-9\s\-]{3,40})/gi;
  const paint_colors = [];
  while ((m = paintPat.exec(norm)) !== null && paint_colors.length < 8) {
    paint_colors.push(`${m[1].replace(/\s+/g, "").toUpperCase()}: ${m[2].trim()}`);
  }

  return {
    project,
    contacts: [], // local heuristic doesn't extract contacts well — handled elsewhere
    conditions,
    scope_summary,
    demo_items,
    rfi_candidates,
    separate_prices,
    finish_info: { paint_colors, flooring: [], ceiling_tile: "", base: "" },
    _source: "local-heuristic", // flag so UI can show "analyzed locally"
  };
}

// Helper — safe regex group-1 extraction
function extract(text, re) {
  const m = re.exec(text);
  return m && m[1] ? m[1].trim() : "";
}

/**
 * Convert AI analysis conditions into DrawingViewer condition objects.
 * @param {Array} aiConditions - conditions from analyzePlans()
 * @param {Array} assemblies - EBC assembly library
 * @returns {Array} DrawingViewer-compatible condition objects
 */
export function analysisToConditions(aiConditions, assemblies) {
  const COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
    "#14b8a6", "#e879f9", "#22d3ee", "#a3e635", "#fb923c",
  ];

  return aiConditions.map((c, i) => {
    const asm = c.assembly_code ? assemblies.find(a => a.code === c.assembly_code) : null;
    return {
      id: "cond_ai_" + Date.now() + "_" + i,
      name: c.name,
      type: c.type || "linear",
      asmCode: asm?.code || c.assembly_code || "",
      folder: c.folder || "General",
      color: COLORS[i % COLORS.length],
      height: c.height || (c.type === "area" ? 0 : 10),
      qty: 0,
      cost: 0,
      notes: c.notes || "",
    };
  });
}
