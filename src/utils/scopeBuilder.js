// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Scope Builder Utility
//  Builds includes/excludes/assumptions from scope checklist state
// ═══════════════════════════════════════════════════════════════

/**
 * Build scope lines from a checklist + mapping.
 * - Checked items  -> add map[id].includeText to includes
 * - Unchecked items -> add map[id].excludeText to excludes
 * - Flagged items   -> add to assumptions with "(pending clarification)" suffix
 * Merges with defaults, deduplicates (keeps the longer/more-specific version).
 *
 * @param {Array}  checklist        - Array of { id, status } (unchecked | checked | flagged)
 * @param {Object} map              - SCOPE_ITEM_MAP: { [id]: { includeText, excludeText } }
 * @param {Array}  defaultIncludes  - Baseline include lines
 * @param {Array}  defaultExcludes  - Baseline exclude lines
 * @param {Array}  defaultAssumptions - Baseline assumption lines
 * @returns {{ includes: string[], excludes: string[], assumptions: string[] }}
 */
export function buildScopeLines(checklist, map, defaultIncludes, defaultExcludes, defaultAssumptions) {
  const rawIncludes = [...defaultIncludes];
  const rawExcludes = [...defaultExcludes];
  const rawAssumptions = [...(defaultAssumptions || [])];

  (checklist || []).forEach((item) => {
    const entry = map[item.id];
    if (!entry) return;

    if (item.status === "checked") {
      rawIncludes.push(entry.includeText);
    } else if (item.status === "unchecked") {
      rawExcludes.push(entry.excludeText);
    } else if (item.status === "flagged") {
      rawAssumptions.push(entry.includeText + " (pending clarification)");
    }
  });

  return {
    includes: dedupe(rawIncludes),
    excludes: dedupe(rawExcludes),
    assumptions: dedupe(rawAssumptions),
  };
}

/**
 * Deduplicate an array of strings.
 * Normalise to lowercase for comparison; when two lines collide keep
 * the longer (more specific) version.
 */
function dedupe(arr) {
  const seen = new Map(); // lowercase -> original string
  for (const line of arr) {
    if (!line) continue;
    const key = line.toLowerCase().trim();
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, line);
    } else if (line.length > existing.length) {
      // Keep the longer / more specific version
      seen.set(key, line);
    }
  }
  return [...seen.values()];
}
