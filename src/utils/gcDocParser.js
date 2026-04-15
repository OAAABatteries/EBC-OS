// ═══════════════════════════════════════════════════════════════
//  EBC-OS · GC Document Parser
//  Local heuristic parsers for GC punch lists and schedules
//  100% offline — no network required
// ═══════════════════════════════════════════════════════════════

// ── EBC Trade Keyword Dictionary ──
export const EBC_TRADE_KEYWORDS = [
  "eagles brothers", "ebc",
  "drywall", "framing", "act", "ceiling", "partition",
  "wall", "tape", "mud", "finish", "hang", "demo",
  "buildback", "build back", "shaft wall", "soffit", "bulkhead",
  "metal stud", "gyp board", "gypsum", "sheetrock",
  "acoustical", "gwb", "stud", "track", "insulation",
];

const OTHER_TRADES = [
  "plumbing", "plumber", "electrical", "electrician", "hvac",
  "mechanical", "fire protection", "sprinkler", "roofing",
  "glazing", "glass", "flooring", "carpet", "tile", "concrete",
  "steel erection", "structural steel", "elevator",
];

const LOCATION_PATTERNS = [
  /\b(?:Room|Rm)\s*#?\s*(\d+\w?)/i,
  /\b(?:Floor|FL|Flr)\s*#?\s*(\d+)/i,
  /\b(?:Area|Zone)\s+([A-Z0-9]+)/i,
  /\b(?:Suite|Ste)\s*#?\s*(\d+\w?)/i,
  /\b(?:Level|Lvl)\s*#?\s*(\d+)/i,
  /\b(?:Wing)\s+([A-Z])/i,
];

const LOCATION_DELIMITERS = /\s+(?:@|at|in|—|–|-)\s+(.+?)$/i;

const HIGH_PRIORITY = /\b(?:urgent|asap|critical|immediate|safety|life[\s-]?safety)\b/i;
const LOW_PRIORITY = /\b(?:minor|cosmetic|when\s+possible|low\s+priority|touch[\s-]?up)\b/i;

function splitItems(text) {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  let current = null;

  for (const line of lines) {
    if (/^page\s+\d+/i.test(line)) continue;
    if (line.length < 3) continue;

    const numberedMatch = line.match(/^(?:(?:Item\s*)?#?\s*(\d+)\s*[.):\-])\s*(.+)/i);
    const bulletMatch = !numberedMatch && line.match(/^[\-\*\u2022]\s+(.+)/);
    const isTabRow = line.includes("\t") && line.split("\t").filter(Boolean).length >= 2;

    if (numberedMatch) {
      if (current) items.push(current);
      current = numberedMatch[2].trim();
    } else if (bulletMatch) {
      if (current) items.push(current);
      current = bulletMatch[1].trim();
    } else if (isTabRow) {
      if (current) items.push(current);
      current = line.split("\t").filter(Boolean).map((c) => c.trim()).join(" — ");
    } else if (current) {
      current += " " + line;
    } else {
      current = line;
    }
  }
  if (current) items.push(current);
  return items;
}

function isEbcRelevant(text) {
  const lower = text.toLowerCase();
  if (lower.includes("eagles brothers") || lower.includes("ebc")) return true;
  const isOtherTrade = OTHER_TRADES.some((t) => lower.includes(t));
  if (isOtherTrade) {
    const hasEbcKeyword = EBC_TRADE_KEYWORDS.some((k) => lower.includes(k));
    if (!hasEbcKeyword) return false;
  }
  return EBC_TRADE_KEYWORDS.some((k) => lower.includes(k));
}

function extractLocation(text) {
  for (const pattern of LOCATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  const delimMatch = text.match(LOCATION_DELIMITERS);
  if (delimMatch) {
    const loc = delimMatch[1].trim();
    if (loc.length < 60 && !/\b(?:need|should|must|please|replace|repair|fix)\b/i.test(loc)) {
      return loc;
    }
  }
  return "";
}

function extractPriority(text) {
  if (HIGH_PRIORITY.test(text)) return "high";
  if (LOW_PRIORITY.test(text)) return "low";
  return "medium";
}

function normalizeForCompare(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

export function parseGcPunchList(text, existingItems = []) {
  if (!text || text.trim().length < 5) {
    return { items: [], totalParsed: 0, ebcCount: 0 };
  }

  const allItems = splitItems(text);
  const totalParsed = allItems.length;

  const existingNormalized = existingItems
    .filter((p) => p.status !== "deleted")
    .map((p) => normalizeForCompare(p.description));

  const ebcItems = [];

  for (const raw of allItems) {
    if (!isEbcRelevant(raw)) continue;

    const description = raw
      .replace(LOCATION_DELIMITERS, "")
      .replace(/\s+/g, " ")
      .trim();

    const location = extractLocation(raw);
    const priority = extractPriority(raw);
    const normalized = normalizeForCompare(description);
    const isDuplicate = existingNormalized.some(
      (existing) => existing === normalized || existing.includes(normalized) || normalized.includes(existing)
    );

    ebcItems.push({
      description: description.length > 0 ? description : raw.trim(),
      location,
      priority,
      selected: true,
      isDuplicate,
    });
  }

  return { items: ebcItems, totalParsed, ebcCount: ebcItems.length };
}

// ── Date parsing helpers ──

const MONTH_MAP = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8, sept: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function parseDate(str) {
  if (!str) return null;
  const s = str.trim();

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    const year = mdy[3].length === 2 ? "20" + mdy[3] : mdy[3];
    return `${year}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  }

  const md = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (md) {
    const year = new Date().getFullYear();
    return `${year}-${md[1].padStart(2, "0")}-${md[2].padStart(2, "0")}`;
  }

  const monthDay = s.match(/^([A-Za-z]+)\s+(\d{1,2})(?:[,\s]+(\d{4}))?/);
  if (monthDay) {
    const monthIdx = MONTH_MAP[monthDay[1].toLowerCase()];
    if (monthIdx !== undefined) {
      const year = monthDay[3] || new Date().getFullYear();
      return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${monthDay[2].padStart(2, "0")}`;
    }
  }

  return null;
}

function extractDates(text) {
  const rangePatterns = [
    /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[-–—]\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/,
    /(\d{1,2})\/(\d{1,2})\s*[-–—]\s*(\d{1,2})(?!\/)/,
    /([A-Za-z]+\s+\d{1,2}(?:[,\s]+\d{4})?)\s*(?:[-–—]|through|thru|to)\s*([A-Za-z]+\s+\d{1,2}(?:[,\s]+\d{4})?)/i,
  ];

  for (const pattern of rangePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match.length === 4 && /^\d{1,2}$/.test(match[3])) {
        const start = parseDate(`${match[1]}/${match[2]}`);
        const end = parseDate(`${match[1]}/${match[3]}`);
        if (start && end) return { start, end };
      } else {
        const start = parseDate(match[1]);
        const end = parseDate(match[2]);
        if (start && end) return { start, end };
      }
    }
  }

  const singlePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}\/\d{1,2})/,
    /(\d{4}-\d{1,2}-\d{1,2})/,
    /([A-Za-z]+\s+\d{1,2}(?:[,\s]+\d{4})?)/,
  ];

  for (const pattern of singlePatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = parseDate(match[1]);
      if (date) return { start: date, end: date };
    }
  }

  return { start: null, end: null };
}

function validateDate(dateStr) {
  if (!dateStr) return "No date found";
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAhead = new Date(now);
  oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

  if (d < oneYearAgo) return "Date is more than 1 year in the past";
  if (d > oneYearAhead) return "Date is more than 1 year in the future";
  return null;
}

export function parseGcSchedule(text) {
  if (!text || text.trim().length < 5) {
    return { items: [], totalParsed: 0, ebcCount: 0 };
  }

  const allItems = splitItems(text);
  const totalParsed = allItems.length;
  const ebcItems = [];

  for (const raw of allItems) {
    if (!isEbcRelevant(raw)) continue;

    const dates = extractDates(raw);

    let title = raw
      .replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, "")
      .replace(/\d{4}-\d{1,2}-\d{1,2}/g, "")
      .replace(/[-–—]\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!title) title = raw.trim();

    let dateWarning = null;
    if (!dates.start) {
      dateWarning = "No date found";
    } else {
      dateWarning = validateDate(dates.start);
      if (dates.start && dates.end && dates.start !== dates.end) {
        const startD = new Date(dates.start + "T12:00:00");
        const endD = new Date(dates.end + "T12:00:00");
        const days = Math.round((endD - startD) / (1000 * 60 * 60 * 24));
        if (days > 90) dateWarning = `Range spans ${days} days — verify dates`;
      }
    }

    ebcItems.push({
      title,
      date: dates.start || "",
      endDate: dates.end || dates.start || "",
      selected: true,
      dateWarning,
    });
  }

  return { items: ebcItems, totalParsed, ebcCount: ebcItems.length };
}
