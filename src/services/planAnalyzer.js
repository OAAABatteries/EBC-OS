// ═══════════════════════════════════════════════════════════════
//  EBC-OS · AI Plan Analyzer
//  Extracts scope from construction PDFs using pdfjs + Claude API
// ═══════════════════════════════════════════════════════════════

import { callClaude } from "../utils/api.js";

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
export async function analyzePlans(apiKey, planText, assemblies) {
  const asmList = assemblies.map(a => `${a.code}: ${a.name} (${a.unit})`).join("\n");

  // Truncate to avoid token limits — focus on the most important pages
  const truncated = planText.slice(0, 12000);

  const prompt = `You are a senior construction estimator for Eagles Brothers Constructors (EBC), a drywall and interior framing subcontractor in Houston, TX. EBC's scope includes: metal framing, drywall (GWB), acoustical ceilings (ACT), tape/float/finish, insulation/sound batting, doors/frames/hardware, fire caulking, corner bead, and related specialties.

Analyze the following construction plan text and produce a complete scope assessment.

EBC ASSEMBLY LIBRARY (use these codes when matching):
${asmList}

PLAN TEXT:
${truncated}

Return ONLY valid JSON in this exact format:
{
  "project": {
    "name": "string",
    "address": "string",
    "architect": "string",
    "gc": "string or null",
    "size_sf": number_or_null,
    "occupancy": "string",
    "building_type": "string",
    "ceiling_height": "string"
  },
  "contacts": [
    {"name": "string", "company": "string", "role": "string", "phone": "string", "email": "string"}
  ],
  "conditions": [
    {
      "name": "string (descriptive name for this wall/ceiling/element)",
      "type": "linear|area|count",
      "folder": "Walls|Ceilings|Insulation|Counts|Add-Ons|Demo",
      "assembly_code": "matching EBC code or empty string",
      "height": 10,
      "notes": "string describing where this applies"
    }
  ],
  "scope_summary": [
    "bullet point describing a scope item"
  ],
  "demo_items": [
    "bullet point describing demo work"
  ],
  "rfi_candidates": [
    "question that needs clarification from architect/GC"
  ],
  "separate_prices": [
    "alternate/add pricing requested by architect"
  ],
  "finish_info": {
    "paint_colors": ["PT1: color name", "PT2: color name"],
    "flooring": ["type and spec"],
    "ceiling_tile": "spec",
    "base": "spec"
  }
}

Be thorough. Identify EVERY wall type, ceiling condition, insulation requirement, door/frame, and specialty item that falls under EBC's drywall/framing scope. Match to EBC assembly codes where possible. Include demo scope.`;

  const result = await callClaude(apiKey, prompt, 4096);
  const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
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
