// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Proposal Importer
//  Extracts structured proposal data from PDF text using Claude API
// ═══════════════════════════════════════════════════════════════

import { callClaude } from "./api.js";

/**
 * Parse raw proposal text into structured QuickProposal fields using Claude.
 * @param {string} apiKey - Anthropic API key
 * @param {string} rawText - Extracted text from a proposal PDF
 * @returns {Promise<Object>} Parsed proposal data matching QuickProposal schema
 */
export async function parseProposalWithAI(apiKey, rawText) {
  if (!apiKey) throw new Error("NO_API_KEY");
  if (!rawText || rawText.trim().length < 20) throw new Error("EMPTY_TEXT");

  const prompt = `You are a data extraction assistant for Eagles Brothers Constructors (EBC), a Houston drywall, metal framing, and ACT ceiling subcontractor.

Extract structured proposal data from this document text. This is an EBC proposal (or similar subcontractor proposal) that may contain scope sections like Demo, Buildback, Drywall, ACT, Framing, Insulation, etc.

DOCUMENT TEXT:
---
${rawText.slice(0, 6000)}
---

Return ONLY valid JSON with this exact structure (use empty string or empty array if a field is not found — never null, never omit fields):

{
  "projectName": "",
  "projectAddress": "",
  "gcName": "",
  "lineItems": [{"description": "scope section name", "amount": 0}],
  "alternates": [{"description": "", "type": "add or deduct", "amount": 0}],
  "includes": ["item 1", "item 2"],
  "excludes": ["item 1", "item 2"],
  "notes": ""
}

Rules:
- lineItems: Each scope section (Demo, Drywall/Build Back, ACT, Framing, etc.) with its dollar amount. If multiple rooms, sum them per scope type.
- alternates: Each alternate with description, type ("add" or "deduct"), and amount.
- includes/excludes: Extract each numbered item as a separate string in the array.
- notes: Any general conditions, payment terms, or important notes.
- amounts: Numbers only, no dollar signs or commas.

Return ONLY the JSON object, no markdown, no explanation.`;

  const response = await callClaude(apiKey, prompt, 2048);

  // Parse the JSON response — handle cases where Claude wraps in markdown
  let cleaned = response.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("PARSE_FAILED");
  }

  // Normalize and validate the parsed data
  return {
    projectName: String(parsed.projectName || ""),
    projectAddress: String(parsed.projectAddress || ""),
    gcName: String(parsed.gcName || ""),
    lineItems: Array.isArray(parsed.lineItems)
      ? parsed.lineItems
          .filter((li) => li.description)
          .map((li) => ({
            description: String(li.description),
            amount: String(Number(li.amount) || 0),
          }))
      : [{ description: "", amount: "" }],
    alternates: Array.isArray(parsed.alternates)
      ? parsed.alternates
          .filter((a) => a.description)
          .map((a) => ({
            description: String(a.description),
            type: a.type === "deduct" ? "deduct" : "add",
            amount: String(Number(a.amount) || 0),
          }))
      : [],
    includes: Array.isArray(parsed.includes)
      ? parsed.includes.filter(Boolean).map(String)
      : [],
    excludes: Array.isArray(parsed.excludes)
      ? parsed.excludes.filter(Boolean).map(String)
      : [],
    notes: String(parsed.notes || ""),
  };
}
