// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Proposal Importer
//  Extracts structured proposal data from PDF text using local
//  heuristic parsing — no external API required
// ═══════════════════════════════════════════════════════════════

import { parseBidText } from "./pdfBidExtractor.js";

/**
 * Parse raw proposal text into structured QuickProposal fields.
 * Uses the existing local regex parser from pdfBidExtractor.
 * Works 100% offline — no network or API key required.
 *
 * @param {string} rawText - Extracted text from a proposal PDF
 * @returns {Object} Parsed proposal data matching QuickProposal schema
 */
export function parseProposalFromText(rawText) {
  if (!rawText || rawText.trim().length < 20) throw new Error("EMPTY_TEXT");

  const parsed = parseBidText(rawText);

  // Map parseBidText output → QuickProposal form fields
  return {
    projectName: parsed.name || "",
    projectAddress: parsed.address || "",
    gcName: parsed.gc || "",
    lineItems: parsed.lineItems && parsed.lineItems.length > 0
      ? parsed.lineItems.map((li) => ({
          description: String(li.label || li.description || ""),
          amount: String(li.amount || 0),
        }))
      : [{ description: "", amount: "" }],
    alternates: parsed.alternates && parsed.alternates.length > 0
      ? parsed.alternates.map((a) => ({
          description: String(a.description || ""),
          type: a.type === "deduct" ? "deduct" : "add",
          amount: String(a.amount || 0),
        }))
      : [],
    includes: Array.isArray(parsed.includes) ? parsed.includes.filter(Boolean) : [],
    excludes: Array.isArray(parsed.excludes) ? parsed.excludes.filter(Boolean) : [],
    notes: parsed.notes || "",
  };
}
