// ═══════════════════════════════════════════════════════════════
//  EBC-OS · API Utilities
//
//  EXTERNAL AI DISABLED BY DEFAULT (Apr 2026)
//  Per user rule (.claude/memory/feedback_no_external_ai.md):
//    "No external AI APIs (Claude, OpenAI). All parsing must be
//     local/heuristic. Only exception: email scanning API."
//
//  Every AI function in this file ultimately calls `callClaude`.
//  By gating callClaude at the source, all 40+ caller sites are
//  neutralized simultaneously without having to delete each function.
//
//  Opt-in: to re-enable external AI, set in localStorage:
//    localStorage.setItem('ebc_allowExternalAI', 'true')
//  OR in companySettings JSON:
//    { "enableExternalAI": true }
//
//  When disabled, callClaude throws a friendly error that callers
//  already handle gracefully (they show the user "AI disabled" or
//  fall back to their local path).
// ═══════════════════════════════════════════════════════════════

function externalAiAllowed() {
  try {
    // Runtime opt-in via localStorage flag
    if (typeof localStorage !== "undefined" && localStorage.getItem("ebc_allowExternalAI") === "true") return true;
    // OR via companySettings in the app bundle (user can flip it in Settings if we ever add the toggle)
    if (typeof localStorage !== "undefined") {
      const cs = localStorage.getItem("ebc_companySettings");
      if (cs) {
        const parsed = JSON.parse(cs);
        if (parsed?.enableExternalAI === true) return true;
      }
    }
  } catch {}
  return false;
}

export async function callClaude(apiKey, prompt, maxTokens = 1024) {
  // Enforce no-external-AI rule. Callers already handle thrown errors gracefully.
  if (!externalAiAllowed()) {
    throw new Error("External AI is disabled (company policy). Use the local heuristic path or enable in Settings.");
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

export async function generateAppreciation(apiKey, project, tier) {
  const prompt = `You are writing a professional appreciation email from Eagles Brothers Constructors (EBC), a drywall and interior framing subcontractor in Houston, TX.

Write a warm, professional thank-you email to the General Contractor "${project.gc}" for the project "${project.project}".

Details:
- This project achieved a ${project.margin}% profit margin, qualifying for our "${tier.name}" appreciation tier
- Perks at this tier: ${tier.perks.join(", ")}
- The email should come from Abner at EBC
- Keep it brief (3-4 paragraphs), genuine, and professional
- Reference the successful collaboration and express interest in future work
- Do NOT include subject line, just the email body

Write the email now:`;

  return callClaude(apiKey, prompt, 512);
}

export async function analyzeBidPackage(apiKey, text) {
  const prompt = `You are a scope extraction assistant for Eagles Brothers Constructors (EBC), a Houston drywall, metal framing, and acoustical ceiling tile (ACT) subcontractor.

Analyze this bid invite, spec excerpt, or project description and extract structured data:

${text}

Return a JSON object with these fields (use null if not found, do not guess):
- name: project name (string)
- gc: general contractor name (string)
- value: estimated bid value if mentioned (number or null)
- due: bid due date as short format like "Mar 20" (string or null)
- phase: project type — one of "Medical", "Commercial", "Education", "Hospitality", "Government", "Religious", "Entertainment", "Industrial", "Residential" (string or null)
- risk: "Low", "Med", or "High" based on complexity (string)
- scope: array of applicable scope tags from ONLY these options: ["Metal Framing", "GWB", "ACT", "Insulation", "Lead-Lined", "L5 Finish", "ICRA", "Deflection Track", "Shaft Wall", "FRP", "Cement Board", "Blocking"]
- contact: GC contact person name if mentioned (string or null)
- month: bid month as 3-letter abbreviation like "Mar" (string or null)
- notes: key observations — mention ceiling types, partition types, special materials, alternates, lead-lined references, phasing constraints, anything an estimator should flag. Be specific and useful. (string)
- address: project address if mentioned (string or null)
- warnings: array of strings — flag anything that could be a risk: missing info, unusual scope, tight timeline, specialty work, ICRA requirements, after-hours work, phasing concerns

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 1500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function checkScopeGaps(apiKey, bidScope, contractScope) {
  const prompt = `You are a scope analysis expert for Eagles Brothers Constructors (EBC), a Houston drywall, metal framing, and acoustical ceiling tile (ACT) subcontractor.

Compare the BID SCOPE (what EBC priced) against the CONTRACT SCOPE (what the contract/specs require) and identify gaps, risks, and discrepancies.

BID SCOPE:
${bidScope}

CONTRACT SCOPE:
${contractScope}

Return a JSON object with:
- gaps: array of objects { item: string, severity: "critical"|"warning"|"info", detail: string } — items in contract but missing from bid
- extras: array of objects { item: string, detail: string } — items in bid but not in contract (potential overpricing or alternates)
- risks: array of objects { item: string, severity: "critical"|"warning"|"info", detail: string } — ambiguous items, unclear specs, or potential change order triggers
- summary: string — 2-3 sentence executive summary of the gap analysis
- score: number 1-100 — scope coverage score (100 = perfect alignment)

Be specific to drywall/framing/ACT trade. Flag things like: missing partition types, ceiling grid specs not matching, insulation R-values, fire-rated assemblies, deflection track requirements, shaft wall details, FRP/cement board areas, lead-lined walls, ICRA barriers, L5 finish requirements, blocking/backing.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2000);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function compareHistoricalEstimate(apiKey, currentBid, historicalProjects) {
  const prompt = `You are a construction estimating analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Compare this CURRENT BID against HISTORICAL PROJECTS to provide estimating intelligence.

CURRENT BID:
${JSON.stringify(currentBid, null, 2)}

HISTORICAL PROJECTS (completed, with actual costs):
${JSON.stringify(historicalProjects, null, 2)}

Return a JSON object with:
- similarProjects: array of objects { name: string, similarity: number (0-100), reason: string } — rank the most similar historical projects
- insights: array of objects { category: string, finding: string, recommendation: string } — cost patterns, margin trends, labor vs material splits
- laborWarning: string|null — flag if current bid's labor estimate seems off based on historical data
- materialWarning: string|null — flag if material costs seem unusual
- marginForecast: { optimistic: number, expected: number, pessimistic: number } — predicted margin % based on historical performance
- summary: string — 2-3 sentence takeaway for the estimator

Be specific and practical. Reference actual numbers from the historical data.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2000);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function generateWeeklyDigest(apiKey, projectData) {
  const prompt = `You are a project management analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Generate a concise weekly PM digest based on this project data:

${JSON.stringify(projectData, null, 2)}

Return a JSON object with:
- healthSummary: string — 2-3 sentence overall portfolio health
- alerts: array of objects { project: string, type: "overbudget"|"behind"|"risk"|"opportunity", message: string, priority: "high"|"medium"|"low" }
- recommendations: array of objects { action: string, impact: string, urgency: "now"|"this_week"|"next_week" }
- kpis: { avgMargin: number, cashFlowStatus: string, teamUtilization: string }
- wins: array of strings — positive developments to celebrate

Keep it actionable and specific. A PM should be able to scan this in 2 minutes and know exactly what needs attention.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2000);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function analyzeChangeOrderImpact(apiKey, changeOrder, project, allCOs) {
  const prompt = `You are a construction financial analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze the impact of this CHANGE ORDER on the project:

CHANGE ORDER:
${JSON.stringify(changeOrder, null, 2)}

PROJECT:
${JSON.stringify(project, null, 2)}

ALL CHANGE ORDERS FOR THIS PROJECT:
${JSON.stringify(allCOs, null, 2)}

Return a JSON object with:
- marginImpact: { before: number, after: number, change: number } — margin % before and after this CO
- cashFlowNote: string — how this CO affects cash flow and billing
- riskFlags: array of strings — flag scope creep, underbilling, approval delays, pattern of small COs that add up
- recommendation: string — what should the PM do (negotiate, approve, push back, bundle with others)
- cumulativeImpact: { totalCOValue: number, pctOfContract: number, note: string } — total CO exposure vs original contract
- summary: string — 2-3 sentence impact assessment

Be specific. Reference actual dollar amounts. Remember EBC makes 100% on labor — labor-heavy COs are more profitable than material-heavy ones.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 1500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function generateReportSummary(apiKey, reportData) {
  const prompt = `You are a construction business analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Generate an executive summary of EBC's current business performance:

${JSON.stringify(reportData, null, 2)}

Return a JSON object with:
- executive: string — 3-4 sentence CEO-level overview of the business
- strengths: array of strings — what's going well (be specific with numbers)
- concerns: array of strings — what needs attention (be specific)
- opportunities: array of strings — actionable growth opportunities based on the data
- gcAnalysis: string — 2-3 sentences about GC relationship patterns (who to invest in, who to be cautious with)
- forecast: string — 2-3 sentence near-term outlook based on pipeline and win rate
- actionItems: array of objects { action: string, priority: "high"|"medium"|"low", owner: string } — recommended next steps

Be data-driven. Reference specific numbers, percentages, and project names. This should read like a monthly board report.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2000);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function analyzeBidsFromEmail(apiKey, emailContent) {
  const prompt = `You are a bid extraction assistant for Eagles Brothers Constructors (EBC), a Houston-based drywall, metal framing, and acoustical ceiling tile (ACT) subcontractor.

You are reading one or more pasted emails. These are typically construction bid invitations (ITB / Invitation to Bid), bid updates, addenda notices, plan availability notices, or pre-bid meeting invites. Extract EVERY distinct bid/project you can identify.

EMAIL CONTENT:
---
${emailContent}
---

For EACH bid/project found, return a JSON object with these fields (use null if not found — do NOT guess):
- name: string — project name (e.g. "Memorial Hermann Sugar Land MOB", "HISD James Middle School")
- gc: string — general contractor or construction manager name (e.g. "Tellepsen", "McCarthy Building Co.")
- due: string — bid due date in short format like "Mar 20" or "2026-03-25" or whatever is stated
- address: string — project address or city/location if mentioned
- value: number — estimated project or bid value in dollars if mentioned, otherwise null
- scope: array of strings — applicable scope tags from ONLY these: ["Metal Framing", "GWB", "ACT", "Insulation", "Lead-Lined", "L5 Finish", "ICRA", "Deflection Track", "Shaft Wall", "FRP", "Cement Board", "Blocking", "Demo"]. Infer from context — if drywall is mentioned, include "GWB"; if ceiling tile / acoustic / ACT is mentioned, include "ACT"; if framing / studs / metal stud is mentioned, include "Metal Framing"; if demolition or gut is mentioned, include "Demo".
- contactName: string — GC contact person name if mentioned
- contactEmail: string — GC contact email if mentioned
- contactPhone: string — phone number if mentioned
- sector: string — one of "Medical", "Commercial", "Education", "Hospitality", "Government", "Religious", "Entertainment", "Industrial", "Residential" based on project type clues
- planLinks: array of strings — any URLs to plans, specs, Procore, BuildingConnected, iSqFt, SmartBidNet, PlanHub, or file downloads mentioned
- prebidDate: string — pre-bid meeting date/time if mentioned
- prebidLocation: string — pre-bid meeting location if mentioned
- addenda: number — number of addenda mentioned, or null
- notes: string — key details an estimator should know: building size/SF, number of floors, special requirements, phasing, union/prevailing wage, bonding, schedule constraints, any other useful context. Be specific.
- status: always "invite_received" for new bid invites, "estimating" if they mention EBC is already working on it, or infer from context

Construction email clues to watch for:
- "ITB", "Invitation to Bid", "Request for Proposal", "bid due", "bids due", "proposals due"
- "Plans available at", "specs posted", "documents available"
- "Pre-bid meeting", "mandatory walk-through", "site visit"
- "Scope of work", "division 09", "div 9", "drywall", "gypsum", "framing", "ceilings", "ACT"
- GC company names often end in "Construction", "Builders", "Building Co.", "Constructors", "General Contractors"
- "Addendum", "addenda", "revised"

If the pasted content contains MULTIPLE separate emails or bid invites, extract each one as a separate object in the array.

If no bid information is found at all, return an empty array [].

Return ONLY a valid JSON array, no markdown, no explanation.`;

  const result = await callClaude(apiKey, prompt, 4000);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Try to salvage partial JSON
    try {
      const match = result.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
    } catch { /* fall through */ }
    return [];
  }
}

export async function generateBidFollowUp(apiKey, bid, daysSinceSubmission) {
  const prompt = `You are writing a professional follow-up email from Eagles Brothers Constructors (EBC), a drywall and interior framing subcontractor in Houston, TX.

Write a follow-up email for this submitted bid:

BID DETAILS:
- Project: ${bid.name}
- General Contractor: ${bid.gc}
- Bid Value: $${(bid.value || 0).toLocaleString()}
- Submitted: ${bid.due || "recently"}
- Contact: ${bid.contact || "Project Manager"}
- Scope: ${(bid.scope || []).join(", ") || "Drywall & framing"}
- Days since submission: ${daysSinceSubmission}

Guidelines:
- Email from Abner at EBC
- Tone: professional, not pushy. ${daysSinceSubmission > 14 ? "This is a late follow-up, be more direct about timeline." : "This is a standard follow-up, keep it light."}
- Reference the specific project and scope
- Ask about decision timeline
- Offer to clarify scope or provide alternates
- Keep it brief (2-3 paragraphs)
- Do NOT include subject line, just the email body

Write the email now:`;

  return callClaude(apiKey, prompt, 512);
}

export async function analyzeProjectRisks(apiKey, projectData) {
  const prompt = `You are a construction risk analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze these active projects and rank them by risk level:

${JSON.stringify(projectData, null, 2)}

Return a JSON object with:
- rankings: array of objects sorted by risk (highest first):
  { project: string, riskScore: number (1-100, 100=highest risk), riskLevel: "critical"|"high"|"medium"|"low", factors: array of strings, recommendation: string }
- portfolioRisk: string — 1-2 sentence overall portfolio risk assessment
- immediateActions: array of objects { project: string, action: string, deadline: string } — things that need attention this week

Risk factors to evaluate per project:
- Margin erosion (low margin or trending down)
- Change order exposure (CO value as % of contract)
- Progress vs billing misalignment
- T&M ticket accumulation (unapproved T&M = cash risk)
- Scope complexity (lead-lined, ICRA, phased work)
- GC payment history (if available)

Be specific. Reference numbers. Flag anything a PM should lose sleep over.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function draftRfiResponse(apiKey, rfi, project) {
  const prompt = `You are a technical response writer for Eagles Brothers Constructors (EBC), a Houston drywall, metal framing, and acoustical ceiling tile (ACT) subcontractor.

Draft a professional RFI response for:

RFI DETAILS:
- RFI #: ${rfi.number}
- Subject: ${rfi.subject}
- Project: ${project?.name || "Unknown"}
- GC: ${project?.gc || "Unknown"}
- Submitted: ${rfi.submitted}
- Assigned To: ${rfi.assigned}

PROJECT CONTEXT:
${JSON.stringify(project || {}, null, 2)}

Guidelines:
- Response should be from EBC's perspective as the drywall/framing subcontractor
- Be technically specific — reference partition types, assembly codes, UL ratings, finish levels where relevant
- If the RFI is about scope, clarify what's included/excluded in EBC's scope
- If about materials, reference industry standards (ASTM, GA, etc.)
- If about schedule, be realistic about lead times and team availability
- Keep it professional and concise (2-4 paragraphs)
- End with "Please advise if you need additional information."
- Do NOT include subject line, just the response body

Write the response now:`;

  return callClaude(apiKey, prompt, 512);
}

export async function forecastLaborDemand(apiKey, scheduleData, projectData, teamData) {
  const prompt = `You are a construction workforce planning analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze the schedule, project pipeline, and team data to forecast labor demand:

ACTIVE SCHEDULE:
${JSON.stringify(scheduleData, null, 2)}

PROJECTS:
${JSON.stringify(projectData, null, 2)}

CREW DATA:
${JSON.stringify(teamData, null, 2)}

Return a JSON object with:
- weeklyForecast: array of objects for the next 4 weeks:
  { week: string (e.g. "Mar 16-22"), teamsNeeded: number, hoursEstimate: number, projects: array of strings, bottleneck: string|null }
- teamGaps: array of objects { week: string, shortfall: number, trade: string, recommendation: string } — weeks where demand exceeds supply
- peakWeek: { week: string, reason: string, teamsNeeded: number }
- recommendations: array of objects { action: string, impact: string, priority: "high"|"medium"|"low" }
- overtime: { likelihood: string, weeks: array of strings, estimatedHours: number }
- summary: string — 2-3 sentence labor outlook

Factor in: project overlaps, ramp-up/ramp-down periods, typical drywall team productivity (a framing team does ~400 LF/day, hanging team ~1500 SF/day, finishing team ~2000 SF/day). Houston weather can impact outdoor staging.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function generateCollectionEmail(apiKey, invoice, project, daysPastDue) {
  const prompt = `You are writing a professional payment follow-up email from Eagles Brothers Constructors (EBC), a drywall and interior framing subcontractor in Houston, TX.

Write a payment reminder email for this invoice:

INVOICE DETAILS:
- Invoice #: ${invoice.number}
- Project: ${project?.name || "Unknown"}
- GC: ${project?.gc || "Unknown"}
- Amount: $${(invoice.amount || 0).toLocaleString()}
- Invoice Date: ${invoice.date}
- Status: ${invoice.status}
- Days past due: ${daysPastDue}
- Description: ${invoice.desc || "Drywall/framing work per contract"}

Guidelines:
- Email from Abner at EBC
- Tone: ${daysPastDue > 60 ? "Firm but professional. This is significantly overdue. Reference potential impacts." : daysPastDue > 30 ? "Direct and professional. Request specific payment date." : "Friendly reminder. Reference the invoice and ask for status."}
- Reference the specific project and invoice number
- ${daysPastDue > 45 ? "Mention potential impact on future scheduling/prioritization if necessary" : "Keep it light and professional"}
- Ask for expected payment date
- Keep it brief (2-3 paragraphs)
- Do NOT include subject line, just the email body

Write the email now:`;

  return callClaude(apiKey, prompt, 512);
}

export async function reviewSubmittal(apiKey, submittal, project, linkedAssemblies, linkedMaterials) {
  const prompt = `You are a submittal review specialist for Eagles Brothers Constructors (EBC), a Houston drywall, metal framing, and acoustical ceiling tile (ACT) subcontractor.

Review this submittal package for completeness and compliance:

SUBMITTAL:
${JSON.stringify(submittal, null, 2)}

PROJECT:
${JSON.stringify(project || {}, null, 2)}

LINKED ASSEMBLIES:
${JSON.stringify(linkedAssemblies, null, 2)}

LINKED MATERIALS:
${JSON.stringify(linkedMaterials, null, 2)}

Return a JSON object with:
- score: number 1-100 — overall submittal readiness score
- status: "ready"|"needs_work"|"critical_issues" — submittal status
- issues: array of objects { item: string, severity: "critical"|"warning"|"info", detail: string } — things that need attention
- specCompliance: array of objects { spec: string, status: "compliant"|"missing"|"unclear", note: string } — spec section coverage
- materialNotes: array of strings — observations about specified materials (substitutions, lead times, availability)
- recommendations: array of strings — actionable next steps before submitting
- summary: string — 2-3 sentence assessment

Check for: spec section alignment, product data completeness, material substitution flags, fire-rating requirements, SDS inclusion for LEED/green projects, color/finish selections, acoustic ratings for ACT, manufacturer warranty requirements.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2000);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function justifyTmTicket(apiKey, ticket, project) {
  const prompt = `You are writing a professional T&M (Time & Material) justification for Eagles Brothers Constructors (EBC), a drywall and interior framing subcontractor in Houston, TX.

Write a justification narrative to support approval of this T&M ticket:

T&M TICKET:
- Ticket #: ${ticket.ticketNumber}
- Project: ${project?.name || "Unknown"}
- GC: ${project?.gc || "Unknown"}
- Date: ${ticket.date}
- Description: ${ticket.description || "Extra work beyond original scope"}
- Status: ${ticket.status}
- Labor: ${(ticket.laborEntries || []).map(e => `${e.employeeName}: ${e.hours}h @ $${e.rate}/hr - ${e.description}`).join("; ")}
- Materials: ${(ticket.materialEntries || []).map(e => `${e.item}: ${e.qty} ${e.unit} @ $${e.unitCost}/${e.unit}`).join("; ")}

Guidelines:
- Write a clear narrative explaining WHY this work was necessary
- Reference that this was outside the original contract scope
- Justify the labor hours and material quantities as reasonable
- Note that this work was directed/authorized by the GC's field team
- Professional tone suitable for GC approval review
- Keep it concise (2-3 paragraphs)
- End with request for timely approval to maintain billing schedule

Write the justification now:`;

  return callClaude(apiKey, prompt, 512);
}

export async function generateToolboxTalk(apiKey, topic, projectData, recentIncidents) {
  const prompt = `You are a construction safety specialist for Eagles Brothers Constructors (EBC), a Houston drywall, metal framing, and acoustical ceiling tile subcontractor.

Generate a complete toolbox talk for the following:

TOPIC: ${topic}
DATE: ${new Date().toISOString().slice(0, 10)}
SEASON: ${(() => { const m = new Date().getMonth(); return m >= 5 && m <= 8 ? "Summer (Houston heat advisory season)" : m >= 11 || m <= 1 ? "Winter" : "Spring/Fall"; })()}

ACTIVE PROJECTS:
${JSON.stringify(projectData, null, 2)}

RECENT INCIDENTS:
${JSON.stringify(recentIncidents, null, 2)}

Return a JSON object with:
- title: string — engaging talk title
- duration: string — estimated time (usually "10-15 minutes")
- objectives: array of strings — 3-4 learning objectives
- content: array of objects { heading: string, points: array of strings } — 3-5 main sections with bullet points
- discussion: array of strings — 3-4 discussion questions to engage the team
- keyTakeaways: array of strings — 3 key points to remember
- relevantToProjects: array of strings — which active projects this applies to
- complianceRef: string|null — OSHA standard reference if applicable (e.g. "29 CFR 1926.451")
- summary: string — 1-2 sentence overview

Make it specific to drywall/framing trade hazards: silica dust, scaffold safety, fall protection, power tool safety, material handling (heavy board), knife safety, stilts, lift operation, dust control, PPE for finishing compounds.
${topic.toLowerCase().includes("heat") || new Date().getMonth() >= 5 && new Date().getMonth() <= 8 ? "Houston heat is extreme — emphasize hydration, heat illness recognition, and mandatory water breaks." : ""}

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function analyzeIncidentRootCause(apiKey, incident, project, allIncidents) {
  const prompt = `You are a construction safety analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Perform a root cause analysis on this safety incident:

INCIDENT:
${JSON.stringify(incident, null, 2)}

PROJECT:
${JSON.stringify(project || {}, null, 2)}

ALL INCIDENTS (for pattern analysis):
${JSON.stringify(allIncidents, null, 2)}

Return a JSON object with:
- rootCause: string — the primary root cause identified
- contributingFactors: array of objects { factor: string, category: "human"|"equipment"|"environment"|"process"|"management", detail: string }
- riskLevel: "critical"|"high"|"medium"|"low" — severity assessment
- correctiveActions: array of objects { action: string, type: "immediate"|"short_term"|"long_term", responsible: string, deadline: string }
- preventionMeasures: array of strings — steps to prevent recurrence
- trainingNeeds: array of strings — training topics this incident highlights
- patternAlert: string|null — if this incident matches a pattern from historical incidents
- oshaRelevance: string|null — relevant OSHA standard or reporting requirement
- summary: string — 2-3 sentence incident analysis

Be specific to drywall/framing trade. Consider: silica exposure, fall hazards, material handling injuries, power tool incidents, scaffold incidents, ladder safety, PPE compliance.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2000);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function analyzeJobCostVariance(apiKey, projectData) {
  const prompt = `You are a construction financial analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze job cost variance across all projects:

PROJECT FINANCIAL DATA:
${JSON.stringify(projectData, null, 2)}

Return a JSON object with:
- rankings: array of objects sorted by financial health (worst first):
  { project: string, healthScore: number (1-100), billedPct: number, marginStatus: string, alert: string|null }
- variances: array of objects { project: string, category: string, expected: number, actual: number, variance: number, severity: "critical"|"warning"|"ok", note: string }
- cashFlowRisk: array of objects { project: string, risk: "high"|"medium"|"low", underbilled: number, note: string } — projects with billing vs progress misalignment
- portfolioSummary: { totalContract: number, totalBilled: number, totalRemaining: number, avgBilledPct: number, atRiskValue: number }
- trends: array of strings — observed patterns across the portfolio
- recommendations: array of objects { action: string, project: string, priority: "high"|"medium"|"low", impact: string }
- summary: string — 3-4 sentence executive assessment

EBC makes 100% on labor — flag projects where labor cost is trending higher than bid. Focus on: overbilling risk, underbilling exposure, CO recovery, T&M collection rates.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function analyzeGcRelationships(apiKey, contacts, bids, projects, callLog) {
  const prompt = `You are a business development analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze GC (General Contractor) relationships and provide strategic insights:

CONTACTS:
${JSON.stringify(contacts, null, 2)}

BID HISTORY:
${JSON.stringify(bids, null, 2)}

ACTIVE PROJECTS:
${JSON.stringify(projects, null, 2)}

RECENT COMMUNICATIONS:
${JSON.stringify(callLog, null, 2)}

Return a JSON object with:
- gcRankings: array of objects sorted by relationship value (highest first):
  { gc: string, score: number (1-100), totalBids: number, wins: number, winRate: number, activeProjects: number, totalValue: number, trend: "growing"|"stable"|"declining", recommendation: string }
- topOpportunities: array of objects { gc: string, action: string, reason: string, priority: "high"|"medium"|"low" }
- atRiskRelationships: array of objects { gc: string, concern: string, lastContact: string, recommendation: string }
- followUpNeeded: array of objects { contact: string, gc: string, reason: string, urgency: "this_week"|"next_week"|"this_month" }
- marketInsights: array of strings — observations about EBC's GC mix and market position
- summary: string — 2-3 sentence relationship health overview

Focus on: which GCs give EBC the most profitable work, who hasn't been contacted recently, which relationships need investment, and where to focus BD efforts.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function analyzeOshaReadiness(apiKey, checklistData, incidentData, projectData) {
  const prompt = `You are an OSHA compliance specialist for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze EBC's OSHA audit readiness based on the current compliance checklist and incident history:

OSHA CHECKLIST STATUS:
${JSON.stringify(checklistData, null, 2)}

INCIDENT HISTORY:
${JSON.stringify(incidentData, null, 2)}

ACTIVE PROJECTS:
${JSON.stringify(projectData, null, 2)}

Return a JSON object with:
- readinessScore: number 1-100 — overall audit readiness
- grade: "A"|"B"|"C"|"D"|"F" — letter grade
- criticalGaps: array of objects { item: string, oshaRef: string, risk: "citation"|"serious"|"willful", remediation: string, deadline: string }
- warnings: array of objects { item: string, detail: string, recommendation: string }
- strengths: array of strings — areas of strong compliance
- priorityActions: array of objects { action: string, priority: "immediate"|"this_week"|"this_month", cost: "low"|"medium"|"high", impact: string }
- trainingGaps: array of objects { topic: string, frequency: string, lastCompleted: string|null, oshaRef: string }
- documentationNeeds: array of strings — records/documentation that should be updated
- summary: string — 3-4 sentence audit readiness assessment

Focus on drywall/framing trade OSHA requirements: silica exposure (Table 1), fall protection (1926.501), scaffold safety (1926.451), PPE (1926.95), hazard communication (1926.59), electrical safety, tool safety. Houston-specific: heat illness prevention.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function optimizeMaterialCosts(apiKey, materials, projects, assemblies) {
  const prompt = `You are a construction procurement analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze EBC's material library and suggest cost optimization strategies:

MATERIAL LIBRARY:
${JSON.stringify(materials, null, 2)}

ACTIVE PROJECTS:
${JSON.stringify(projects, null, 2)}

ASSEMBLIES IN USE:
${JSON.stringify(assemblies, null, 2)}

Return a JSON object with:
- savings: array of objects { material: string, currentCost: number, suggestedAction: string, estimatedSavings: string, difficulty: "easy"|"medium"|"hard" }
- bulkOpportunities: array of objects { material: string, projects: array of strings, combinedQty: string, savingsPotential: string }
- substitutions: array of objects { current: string, alternative: string, benefit: string, risk: string, approval: "spec_compliant"|"submittal_required"|"not_recommended" }
- vendorStrategy: array of strings — procurement recommendations
- wasteReduction: array of objects { area: string, currentWaste: string, target: string, method: string }
- seasonalTips: array of strings — Houston market timing advice
- summary: string — 2-3 sentence cost optimization overview

Focus on drywall trade materials: gypsum board, metal studs/track, joint compound, tape, screws, insulation, ACT grid/tile, corner bead, deflection track. Houston market pricing.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function detectScheduleConflicts(apiKey, scheduleData, projectData) {
  const prompt = `You are a construction scheduling analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze the project schedule for conflicts, resource collisions, and optimization opportunities:

SCHEDULE:
${JSON.stringify(scheduleData, null, 2)}

PROJECTS:
${JSON.stringify(projectData, null, 2)}

Return a JSON object with:
- conflicts: array of objects { type: "overlap"|"resource"|"dependency"|"gap", projects: array of strings, detail: string, severity: "critical"|"warning"|"info", resolution: string }
- resourceCollisions: array of objects { team: string, dates: string, projects: array of strings, recommendation: string }
- sequenceIssues: array of objects { project: string, issue: string, correctSequence: string, impact: string }
- optimizations: array of objects { suggestion: string, benefit: string, projects: array of strings, priority: "high"|"medium"|"low" }
- criticalPath: array of objects { project: string, bottleneck: string, slackDays: number, recommendation: string }
- summary: string — 2-3 sentence schedule health assessment

Drywall sequence matters: framing → rough-in inspection → insulation → board hang → tape/finish → paint-ready. Flag any out-of-sequence tasks. Consider team availability across overlapping projects.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function predictBidWinRate(apiKey, bid, allBids, projects) {
  const prompt = `You are a construction business intelligence analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze this bid and predict win probability based on historical patterns:

CURRENT BID:
${JSON.stringify(bid, null, 2)}

ALL BIDS (historical):
${JSON.stringify(allBids, null, 2)}

ACTIVE/COMPLETED PROJECTS:
${JSON.stringify(projects, null, 2)}

Return a JSON object with:
- winProbability: number 0-100 — predicted win rate percentage
- confidence: "high"|"medium"|"low" — confidence in the prediction
- factors: array of objects { factor: string, impact: "positive"|"negative"|"neutral", weight: number (1-10), detail: string } — factors affecting win probability
- gcHistory: { totalBids: number, wins: number, winRate: number, avgValue: number, relationship: "strong"|"moderate"|"new"|"weak" } — history with this GC
- competitivePosition: string — 2-3 sentence assessment of EBC's competitive position for this bid
- improvements: array of objects { suggestion: string, impact: string, effort: "easy"|"medium"|"hard" } — actions to improve win chances
- similarWins: array of objects { project: string, similarity: string, outcome: string } — similar bids EBC won or lost
- pricingInsight: string — whether bid value seems competitive based on historical data
- summary: string — 2-3 sentence win prediction assessment

Factor in: GC relationship history, bid value vs historical range, scope complexity, market conditions, EBC's win rate by phase/type, timing patterns.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function detectLaborAnomalies(apiKey, timeEntries, employees, teamSchedule, projects) {
  const prompt = `You are a construction workforce analytics specialist for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze time clock data for anomalies, patterns, and optimization opportunities:

TIME ENTRIES (recent):
${JSON.stringify(timeEntries, null, 2)}

EMPLOYEES:
${JSON.stringify(employees, null, 2)}

CREW SCHEDULE:
${JSON.stringify(teamSchedule, null, 2)}

PROJECTS:
${JSON.stringify(projects, null, 2)}

Return a JSON object with:
- anomalies: array of objects { type: "overtime"|"no_show"|"early_out"|"late_arrival"|"geofence"|"buddy_punch"|"missing_entry"|"excessive_hours", employee: string, date: string, detail: string, severity: "critical"|"warning"|"info", recommendation: string }
- overtimeRisk: array of objects { employee: string, currentHours: number, projectedWeekly: number, alert: string }
- attendancePatterns: array of objects { pattern: string, employees: array of strings, frequency: string, impact: string }
- costAlerts: array of objects { project: string, issue: string, estimatedImpact: string, action: string }
- productivity: array of objects { project: string, avgHoursPerDay: number, teamSize: number, efficiency: "high"|"normal"|"low", note: string }
- recommendations: array of objects { action: string, priority: "high"|"medium"|"low", impact: string, category: "cost"|"compliance"|"safety"|"efficiency" }
- summary: string — 3-4 sentence workforce health assessment

Flag: unscheduled OT, clock-in without schedule, schedule without clock-in, unusually short/long shifts, geofence violations, patterns of late starts, employees clocking in at same second (buddy punching risk).

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function scoreScopeRisks(apiKey, scopeItems, bid, projects) {
  const prompt = `You are a scope risk analyst for Eagles Brothers Constructors (EBC), a Houston drywall, metal framing, and acoustical ceiling tile (ACT) subcontractor.

Analyze these scope checklist items and score each for risk to EBC:

SCOPE ITEMS:
${JSON.stringify(scopeItems, null, 2)}

LINKED BID:
${JSON.stringify(bid || {}, null, 2)}

PROJECTS (for context):
${JSON.stringify(projects, null, 2)}

Return a JSON object with:
- overallRisk: number 1-100 — portfolio scope risk score
- grade: "A"|"B"|"C"|"D"|"F" — scope risk grade
- itemScores: array of objects { title: string, riskScore: number (1-100), riskLevel: "critical"|"high"|"medium"|"low", concerns: array of strings, negotiationTip: string }
- redFlags: array of objects { item: string, risk: string, financialExposure: string, mitigation: string }
- exclusions: array of strings — items EBC should explicitly EXCLUDE from their scope to avoid scope creep
- negotiationPoints: array of objects { point: string, leverage: string, suggestedLanguage: string, priority: "must_have"|"nice_to_have" }
- hiddenCosts: array of objects { item: string, estimatedCost: string, likelihood: "high"|"medium"|"low", trigger: string }
- recommendations: array of objects { action: string, priority: "high"|"medium"|"low", impact: string }
- summary: string — 2-3 sentence scope risk assessment

Focus on drywall/framing trade risks: unforeseen conditions behind walls, change order triggers, scope creep areas (backing/blocking, fire caulking, ceiling access panels, patch & repair), unclear finish levels, ICRA requirements, phasing impacts, GC-driven delays affecting labor costs.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function generateJsa(apiKey, trade, project, weather, location) {
  const prompt = `You are a construction safety expert for Eagles Brothers Constructors (EBC), a Houston drywall, metal framing, and acoustical ceiling tile subcontractor.

Generate a complete Job Safety Analysis (JSA) for the following work:

TRADE: ${trade}
PROJECT: ${JSON.stringify(project || {}, null, 2)}
WEATHER: ${weather}
LOCATION ON SITE: ${location || "General"}
DATE: ${new Date().toISOString().slice(0, 10)}
SEASON: ${(() => { const m = new Date().getMonth(); return m >= 5 && m <= 8 ? "Summer (Houston heat advisory season)" : m >= 11 || m <= 1 ? "Winter" : "Spring/Fall"; })()}

Return a JSON object with:
- title: string — descriptive JSA title
- steps: array of objects {
    step: string — task step description,
    hazards: array of objects {
      hazard: string — specific hazard,
      category: "fall"|"struck"|"caught"|"electrical"|"silica"|"ergonomic"|"heat"|"chemical"|"other",
      likelihood: number 1-5,
      severity: number 1-5,
      controls: array of strings — specific control measures,
      controlType: "elimination"|"substitution"|"engineering"|"administrative"|"ppe"
    }
  }
- ppe: array of strings from ONLY these options: ["hardhat", "safety_glasses", "hi_vis", "gloves", "steel_toe", "dust_mask", "respirator", "hearing", "face_shield", "fall_harness"]
- permits: array of strings from ONLY these options: ["hot_work", "confined_space", "excavation", "lockout_tagout", "scaffold", "crane_lift", "roof_access"]
- summary: string — 1-2 sentence overview of key safety concerns

Generate 4-6 realistic steps specific to the ${trade} trade in drywall/framing construction. Each step should have 1-3 hazards with specific controls. Be practical and field-relevant.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/\`\`\`json\n?/g, "").replace(/\`\`\`\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function planWeekSchedule(apiKey, calendarEvents, projects, employees, teamSchedule, schedule) {
  const prompt = `You are a construction project coordinator for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze the upcoming week's calendar and provide intelligent scheduling recommendations:

CALENDAR EVENTS:
${JSON.stringify(calendarEvents, null, 2)}

ACTIVE PROJECTS:
${JSON.stringify(projects, null, 2)}

EMPLOYEES:
${JSON.stringify(employees, null, 2)}

CREW SCHEDULE:
${JSON.stringify(teamSchedule, null, 2)}

GANTT SCHEDULE:
${JSON.stringify(schedule, null, 2)}

TODAY: ${new Date().toISOString().slice(0, 10)}

Return a JSON object with:
- weekOverview: string — 2-3 sentence summary of the upcoming week
- dailyPlan: array of objects { day: string (Mon-Fri), focus: string, keyEvents: array of strings, teamNeeds: string, priority: "high"|"normal"|"light" }
- conflicts: array of objects { issue: string, days: array of strings, resolution: string, severity: "critical"|"warning"|"info" }
- suggestions: array of objects { suggestion: string, reason: string, impact: string, priority: "high"|"medium"|"low" }
- inspectionPrep: array of objects { project: string, inspection: string, prepSteps: array of strings, deadline: string } — upcoming inspections to prepare for
- teamAllocation: array of objects { project: string, recommendedCrew: number, trade: string, days: string, notes: string }
- risks: array of objects { risk: string, mitigation: string, likelihood: "high"|"medium"|"low" }
- summary: string — 2-3 sentence actionable planning brief

Consider: project deadlines, inspection schedules, team availability, weather impacts, material deliveries, GC meetings. Prioritize critical-path activities.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/\`\`\`json\n?/g, "").replace(/\`\`\`\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function optimizeCrewSchedule(apiKey, teamSchedule, employees, projects, schedule, weekStr) {
  const prompt = `You are a construction workforce optimization specialist for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Optimize the team schedule for the week of ${weekStr}:

CURRENT CREW SCHEDULE:
${JSON.stringify(teamSchedule, null, 2)}

EMPLOYEES:
${JSON.stringify(employees, null, 2)}

ACTIVE PROJECTS:
${JSON.stringify(projects, null, 2)}

PROJECT SCHEDULE (GANTT):
${JSON.stringify(schedule, null, 2)}

Return a JSON object with:
- score: number 1-100 — current schedule efficiency score
- grade: "A"|"B"|"C"|"D"|"F" — schedule grade
- unassigned: array of objects { employee: string, days: array of strings, skills: string, recommendation: string } — employees without assignments
- overloaded: array of objects { project: string, issue: string, suggestion: string }
- moves: array of objects { employee: string, from: string, to: string, day: string, reason: string, impact: string } — suggested reassignments
- gaps: array of objects { project: string, day: string, teamNeeded: number, currentTeam: number, shortfall: number, priority: "critical"|"high"|"medium" }
- balancing: array of objects { observation: string, suggestion: string, benefit: string }
- travelOptimization: array of objects { suggestion: string, employees: array of strings, savings: string } — minimize drive time between job sites
- summary: string — 2-3 sentence team optimization assessment

Optimize for: minimize idle time, balance team loads across projects, keep experienced employees on complex jobs, avoid single-person teams for safety, minimize travel between sites, ensure critical-path tasks have full teams.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/\`\`\`json\n?/g, "").replace(/\`\`\`\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function analyzeIncentiveStrategy(apiKey, incentiveProjects, bids, projects) {
  const prompt = `You are a construction business development strategist for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

EBC runs an incentive program that rewards GCs based on project profit margins:
- Bronze (5%+): Thank-you email, referrals, priority scheduling
- Silver (10%+): Lunch, preferred pricing on next bid
- Gold (15%+): $100 gift card, first-call on new projects
- Platinum (20%+): Annual dinner, exclusive partnership status

Analyze EBC's incentive program performance and suggest strategy improvements:

INCENTIVE PROJECTS (with margins):
${JSON.stringify(incentiveProjects, null, 2)}

BID HISTORY:
${JSON.stringify(bids, null, 2)}

ACTIVE PROJECTS:
${JSON.stringify(projects, null, 2)}

Return a JSON object with:
- programHealth: { score: number 1-100, avgMargin: number, topTier: string, gcCount: number, totalRewards: number }
- gcTierBreakdown: array of objects { gc: string, projects: number, avgMargin: number, currentTier: string, potentialTier: string, revenue: number, recommendation: string }
- marginTrends: array of objects { observation: string, trend: "improving"|"declining"|"stable", impact: string }
- upsellOpportunities: array of objects { gc: string, currentTier: string, nextTier: string, marginGap: number, strategy: string, priority: "high"|"medium"|"low" }
- programSuggestions: array of objects { suggestion: string, rationale: string, expectedImpact: string, effort: "easy"|"medium"|"hard" }
- atRiskRelationships: array of objects { gc: string, concern: string, action: string }
- roi: string — estimated ROI of the incentive program
- summary: string — 3-4 sentence strategic assessment of the incentive program

Focus on: which GCs are most profitable, who could be moved to a higher tier with better scope management, which relationships need investment, and whether the tier thresholds are optimal for EBC's business.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function optimizeProjectRoutes(apiKey, projects, teamSchedule, employees) {
  const prompt = `You are a construction logistics optimizer for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze EBC's project locations and team assignments to optimize routes and logistics:

PROJECTS (with locations):
${JSON.stringify(projects, null, 2)}

CREW SCHEDULE:
${JSON.stringify(teamSchedule, null, 2)}

EMPLOYEES:
${JSON.stringify(employees, null, 2)}

Return a JSON object with:
- clusterAnalysis: array of objects { cluster: string, projects: array of strings, area: string, teamSize: number, recommendation: string }
- routeSuggestions: array of objects { employee: string, currentRoute: string, optimizedRoute: string, timeSaved: string, fuelSaved: string }
- geographicInsights: array of objects { insight: string, projects: array of strings, impact: string }
- logisticsAlerts: array of objects { alert: string, severity: "critical"|"warning"|"info", action: string }
- materialDelivery: array of objects { suggestion: string, projects: array of strings, benefit: string } — consolidate deliveries to nearby sites
- coverageGaps: array of objects { area: string, opportunity: string, nearestProject: string }
- hubRecommendation: string — where EBC should stage materials/equipment based on project density
- travelMetrics: { avgDailyMiles: number, peakTravelDay: string, estimatedWeeklyCost: string }
- summary: string — 2-3 sentence logistics overview

Consider Houston geography: I-10, I-45, I-610 loop, Beltway 8, US-59/I-69. Morning traffic flows inbound, evening outbound. Staging near multiple job sites reduces mobilization costs.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function forecastBusinessTrends(apiKey, bids, projects, invoices, changeOrders) {
  const prompt = `You are a construction business forecasting analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze historical data and forecast business trends for the next quarter:

BID HISTORY:
${JSON.stringify(bids, null, 2)}

PROJECTS:
${JSON.stringify(projects, null, 2)}

INVOICES:
${JSON.stringify(invoices, null, 2)}

CHANGE ORDERS:
${JSON.stringify(changeOrders, null, 2)}

TODAY: ${new Date().toISOString().slice(0, 10)}

Return a JSON object with:
- revenueforecast: { currentQuarter: number, nextQuarter: number, trend: "up"|"flat"|"down", confidence: "high"|"medium"|"low", drivers: array of strings }
- pipelineHealth: { score: number 1-100, conversionRate: number, avgDaysToClose: number, bottleneck: string }
- marketTrends: array of objects { trend: string, impact: "positive"|"negative"|"neutral", recommendation: string, timeframe: string }
- cashFlowProjection: array of objects { month: string, expectedInflow: number, expectedOutflow: number, netPosition: string, risk: string }
- growthOpportunities: array of objects { opportunity: string, potentialValue: string, probability: "high"|"medium"|"low", action: string }
- riskFactors: array of objects { risk: string, probability: "high"|"medium"|"low", impact: string, mitigation: string }
- kpiForecasts: { winRate: { current: number, projected: number }, avgMargin: { current: number, projected: number }, backlog: { current: number, projected: number } }
- quarterlyGoals: array of objects { goal: string, metric: string, target: string, currentPace: string }
- summary: string — 3-4 sentence business forecast

Base forecasts on actual data patterns. Houston construction market context: medical/healthcare sector is strong, commercial office is mixed, education bonds driving school projects.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function analyzeProjectCloseout(apiKey, project, invoices, changeOrders, schedule) {
  const prompt = `You are a construction project closeout specialist for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze this project for closeout readiness and generate a comprehensive closeout checklist:

PROJECT:
${JSON.stringify(project, null, 2)}

INVOICES:
${JSON.stringify(invoices, null, 2)}

CHANGE ORDERS:
${JSON.stringify(changeOrders, null, 2)}

SCHEDULE:
${JSON.stringify(schedule, null, 2)}

Return a JSON object with:
- readinessScore: number 1-100 — overall closeout readiness
- grade: "A"|"B"|"C"|"D"|"F" — closeout readiness grade
- financialStatus: { contractValue: number, totalBilled: number, remaining: number, retainage: number, openCOs: number, collectible: number, margin: string }
- checklist: array of objects { item: string, category: "financial"|"documentation"|"punchlist"|"warranty"|"safety"|"administrative", status: "complete"|"pending"|"not_started", priority: "critical"|"high"|"medium"|"low", notes: string }
- punchlistItems: array of objects { item: string, location: string, responsible: string, estimatedHours: number }
- outstandingItems: array of objects { item: string, type: "invoice"|"co"|"submittal"|"warranty"|"lien_waiver", amount: number|null, action: string, deadline: string }
- warrantyCoverage: array of objects { item: string, duration: string, startDate: string, manufacturer: string }
- riskOfLoss: array of objects { item: string, amount: number, risk: "high"|"medium"|"low", action: string }
- recommendations: array of objects { action: string, priority: "immediate"|"this_week"|"before_closeout", impact: string }
- summary: string — 3-4 sentence closeout assessment

Drywall/framing closeout items: final punch walk, fire caulking inspection, as-built markups, warranty letters for assemblies, final lien waiver, retainage invoice, CO reconciliation, LEED/green documentation if applicable.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function generateMorningBriefing(apiKey, dashData) {
  const prompt = `You are a construction PM assistant for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Generate a concise morning briefing for today (${new Date().toISOString().slice(0, 10)}):

${JSON.stringify(dashData, null, 2)}

Return a JSON object with:
- greeting: string — personalized morning greeting for Abner
- todaysFocus: array of objects { item: string, priority: "critical"|"high"|"normal", project: string|null }
- urgentAlerts: array of objects { alert: string, type: "financial"|"schedule"|"safety"|"team"|"weather", action: string }
- teamSnapshot: { clockedIn: number, expected: number, onSite: string }
- moneyMoves: array of objects { item: string, amount: string, action: string, deadline: string }
- bidUpdates: array of objects { bid: string, status: string, action: string }
- inspectionsDue: array of objects { project: string, inspection: string, date: string }
- weatherAlert: string|null — Houston weather impact if relevant
- motivationalNote: string — brief positive note about business momentum
- summary: string — 2-3 sentence "here's your day" overview

Keep it scannable — a PM should read this in 60 seconds over coffee. Prioritize what needs action TODAY.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2000);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function generateLookahead(apiKey, weekData, projects, employees) {
  const prompt = `You are a construction scheduling analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Analyze the lookahead data and generate intelligent scheduling insights:

LOOKAHEAD WEEKS:
${JSON.stringify(weekData, null, 2)}

PROJECTS:
${JSON.stringify(projects, null, 2)}

EMPLOYEES:
${JSON.stringify(employees, null, 2)}

Return a JSON object with:
- weeklyInsights: array of objects { week: string, teamUtilization: number, riskLevel: "high"|"medium"|"low", keyMilestones: array of strings, recommendation: string }
- resourcePeaks: array of objects { week: string, demand: number, available: number, gap: number, solution: string }
- milestoneTracker: array of objects { milestone: string, project: string, targetWeek: string, status: "on_track"|"at_risk"|"behind", action: string }
- workloadBalance: array of objects { project: string, weeklyHours: array of numbers, trend: "ramping_up"|"steady"|"winding_down", note: string }
- criticalActions: array of objects { action: string, week: string, project: string, reason: string, priority: "critical"|"high"|"medium" }
- ptoImpact: array of objects { week: string, employeesOut: number, coverage: string, action: string }
- sixWeekOutlook: string — 3-4 sentence lookahead summary
- summary: string — 2-3 sentence immediate action brief

Focus on: team allocation balance, upcoming inspections, material lead times, PTO coverage, equipment needs, and weather windows for exterior work.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

export async function generateDailyReportDigest(apiKey, reports) {
  const prompt = `You are a field operations analyst for Eagles Brothers Constructors (EBC), a Houston drywall and interior framing subcontractor.

Summarize these daily field reports into a PM-ready digest:

${JSON.stringify(reports, null, 2)}

Return a JSON object with:
- summary: string — 3-4 sentence overview of field operations this period
- byProject: array of objects { project: string, status: string, highlights: array of strings, concerns: array of strings }
- safetyNotes: array of strings — any safety observations or near-misses mentioned
- laborNotes: string — team productivity observations, staffing issues
- materialNotes: string — material deliveries, shortages, or waste issues
- weatherImpact: string|null — any weather-related delays or impacts
- actionItems: array of objects { item: string, priority: "high"|"medium"|"low", assignTo: string }

Focus on what a PM needs to know. Flag anything unusual. Be concise.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 2000);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

// ═══════════════════════════════════════════════════════════════
//  Sprint 13 — PTO Impact Analyzer
// ═══════════════════════════════════════════════════════════════
export async function analyzePtoImpact(apiKey, ptoRequests, employees, teamSchedule, projects) {
  const prompt = `You are an AI workforce analyst for Eagles Brothers Constructors (EBC), a drywall/framing subcontractor in Houston.

Analyze the PTO situation and identify coverage gaps and risks.

CURRENT PTO REQUESTS:
${JSON.stringify(ptoRequests?.slice(0, 20) || [], null, 2)}

ACTIVE EMPLOYEES:
${JSON.stringify(employees?.slice(0, 20) || [], null, 2)}

CREW SCHEDULE (current/upcoming):
${JSON.stringify(teamSchedule?.slice(0, 30) || [], null, 2)}

ACTIVE PROJECTS:
${JSON.stringify(projects?.slice(0, 10) || [], null, 2)}

Return JSON:
{
  "coverageScore": number 0-100 (100=fully covered, no gaps),
  "grade": "A"|"B"|"C"|"D"|"F",
  "summary": "one-line overall assessment",
  "coverageGaps": [{ "date": "YYYY-MM-DD", "project": string, "missingRole": string, "severity": "critical"|"moderate"|"low", "suggestion": string }],
  "conflictAlerts": [{ "employee": string, "issue": string, "recommendation": string }],
  "upcomingRisks": [{ "period": string, "risk": string, "mitigation": string }],
  "recommendations": [string]
}

Focus on: team conflicts with PTO, understaffed projects, peak absence periods, and coverage strategies. Be specific to drywall/framing operations.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 1500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

// ═══════════════════════════════════════════════════════════════
//  Sprint 13 — Equipment Utilization Optimizer
// ═══════════════════════════════════════════════════════════════
export async function optimizeEquipmentUtil(apiKey, equipment, bookings, projects) {
  const prompt = `You are an AI equipment logistics analyst for Eagles Brothers Constructors (EBC), a drywall/framing subcontractor in Houston.

Analyze equipment utilization and suggest optimizations.

EQUIPMENT INVENTORY:
${JSON.stringify(equipment || [], null, 2)}

CURRENT BOOKINGS:
${JSON.stringify(bookings?.slice(0, 25) || [], null, 2)}

ACTIVE PROJECTS:
${JSON.stringify(projects?.slice(0, 10) || [], null, 2)}

Return JSON:
{
  "utilizationScore": number 0-100 (100=optimal usage),
  "grade": "A"|"B"|"C"|"D"|"F",
  "summary": "one-line assessment",
  "underutilized": [{ "equipment": string, "currentUsage": string, "suggestion": string }],
  "conflicts": [{ "equipment": string, "dates": string, "projects": string, "resolution": string }],
  "bookingSuggestions": [{ "equipment": string, "project": string, "reason": string, "dates": string }],
  "costSavings": [{ "action": string, "estimatedSaving": string, "priority": "high"|"medium"|"low" }],
  "maintenanceAlerts": [{ "equipment": string, "alert": string }]
}

Focus on: idle equipment that should be deployed, scheduling conflicts, rental vs buy analysis, equipment sharing between projects. Drywall-specific equipment knowledge (stilts, scaffolding, lifts, screw guns, mud pumps, sanders).

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 1500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

// ═══════════════════════════════════════════════════════════════
//  Sprint 13 — Overhead Cost Projector
// ═══════════════════════════════════════════════════════════════
export async function projectOverheadCosts(apiKey, overheadData, projects, timeEntries, teamSchedule) {
  const prompt = `You are an AI financial analyst for Eagles Brothers Constructors (EBC), a drywall/framing subcontractor in Houston. EBC makes ~100% markup on labor — labor IS the profit driver.

Analyze overhead/labor costs and project future burn rates.

CURRENT OVERHEAD METRICS:
- Weekly Burn Rate: $${overheadData?.weeklyBurn || 0}
- Monthly Projected: $${overheadData?.monthlyBurn || 0}
- Total Labor Budget: $${overheadData?.totalLaborBudget || 0}
- Total Spent: $${overheadData?.totalLaborSpent || 0}
- Total Remaining: $${overheadData?.totalRemaining || 0}

PROJECT OVERHEAD BREAKDOWN:
${JSON.stringify(overheadData?.projectOverhead?.slice(0, 10) || [], null, 2)}

RECENT TIME ENTRIES (sample):
${JSON.stringify(timeEntries?.slice(-20) || [], null, 2)}

CREW SCHEDULE:
${JSON.stringify(teamSchedule?.slice(0, 20) || [], null, 2)}

Return JSON:
{
  "healthScore": number 0-100 (100=excellent cost control),
  "grade": "A"|"B"|"C"|"D"|"F",
  "summary": "one-line financial assessment",
  "weeklyForecast": [{ "week": string, "projectedBurn": number, "trend": "up"|"down"|"stable" }],
  "burnRateAlerts": [{ "project": string, "alert": string, "burnRate": string, "weeksUntilBudgetExhausted": number, "action": string }],
  "costOptimizations": [{ "action": string, "potentialSaving": string, "effort": "easy"|"moderate"|"hard" }],
  "profitRisks": [{ "risk": string, "impact": string, "mitigation": string }],
  "quarterProjection": { "projectedSpend": number, "projectedRevenue": number, "projectedProfit": number, "profitMargin": string }
}

Since labor is EBC's profit driver (~100% markup), focus on: labor cost trends, burn rate sustainability, over-budget projects, team efficiency, and profit margin protection. Be Houston construction market aware.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 1800);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

// ═══════════════════════════════════════════════════════════════
//  Sprint 14 — Workforce Analytics Insights
// ═══════════════════════════════════════════════════════════════
export async function analyzeWorkforceMetrics(apiKey, weeklyData, availability, projectUtil, eqUtil) {
  const prompt = `You are an AI workforce strategist for Eagles Brothers Constructors (EBC), a drywall/framing subcontractor in Houston.

Analyze these scheduling analytics and provide strategic insights.

4-WEEK HOURS TREND:
${JSON.stringify(weeklyData || [], null, 2)}

CREW AVAILABILITY:
${JSON.stringify(availability || {}, null, 2)}

PROJECT RESOURCE ALLOCATION:
${JSON.stringify(projectUtil || [], null, 2)}

EQUIPMENT UTILIZATION:
${JSON.stringify(eqUtil || {}, null, 2)}

Return JSON:
{
  "insightScore": number 0-100 (100=optimal workforce deployment),
  "grade": "A"|"B"|"C"|"D"|"F",
  "summary": "one-line workforce health assessment",
  "laborEfficiency": { "score": number, "trend": "improving"|"declining"|"stable", "insight": string },
  "overtimeAnalysis": { "currentWeekOT": number, "projectedMonthOT": number, "costImpact": string, "recommendation": string },
  "staffingGaps": [{ "area": string, "gap": string, "urgency": "critical"|"moderate"|"low", "action": string }],
  "productivityInsights": [{ "metric": string, "value": string, "benchmark": string, "recommendation": string }],
  "strategicRecommendations": [{ "title": string, "impact": "high"|"medium"|"low", "detail": string }]
}

Focus on: team utilization optimization, overtime cost control, staffing balance across projects, equipment deployment efficiency, and actionable workforce strategies for a drywall sub.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 1500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

// ═══════════════════════════════════════════════════════════════
//  Sprint 14 — Attendance Pattern Analyzer
// ═══════════════════════════════════════════════════════════════
export async function analyzeAttendancePatterns(apiKey, verificationData, verifyCounts, employees, projects) {
  const prompt = `You are an AI attendance analyst for Eagles Brothers Constructors (EBC), a drywall/framing subcontractor in Houston.

Analyze attendance verification data and identify patterns and issues.

TODAY'S VERIFICATION DATA:
${JSON.stringify(verificationData?.slice(0, 30) || [], null, 2)}

ATTENDANCE COUNTS:
${JSON.stringify(verifyCounts || {}, null, 2)}

EMPLOYEES:
${JSON.stringify(employees?.slice(0, 20) || [], null, 2)}

ACTIVE PROJECTS:
${JSON.stringify(projects?.slice(0, 10) || [], null, 2)}

Return JSON:
{
  "attendanceScore": number 0-100 (100=perfect attendance),
  "grade": "A"|"B"|"C"|"D"|"F",
  "summary": "one-line attendance assessment",
  "patterns": [{ "pattern": string, "frequency": string, "impact": string, "action": string }],
  "atRiskEmployees": [{ "name": string, "issue": string, "occurrences": string, "recommendation": string }],
  "projectImpact": [{ "project": string, "attendanceIssue": string, "productivityLoss": string, "mitigation": string }],
  "improvements": [{ "action": string, "expectedImprovement": string, "priority": "high"|"medium"|"low" }],
  "costOfAbsenteeism": { "dailyCost": string, "weeklyCost": string, "recommendation": string }
}

Focus on: tardiness patterns, no-show trends, early departures, project-specific attendance issues, and cost impact of poor attendance for a construction team.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 1500);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}

// ═══════════════════════════════════════════════════════════════
//  Sprint 14 — Labor Backlog Burn Predictor
// ═══════════════════════════════════════════════════════════════
export async function predictLaborBurn(apiKey, laborData, teamSchedule, projects) {
  const prompt = `You are an AI labor cost analyst for Eagles Brothers Constructors (EBC), a drywall/framing subcontractor in Houston. EBC makes ~100% markup on labor.

Analyze labor backlog data and predict burn rates and completion timelines.

LABOR BACKLOG DATA:
${JSON.stringify(laborData?.slice(0, 15) || [], null, 2)}

CREW SCHEDULE:
${JSON.stringify(teamSchedule?.slice(0, 25) || [], null, 2)}

PROJECTS:
${JSON.stringify(projects?.slice(0, 10) || [], null, 2)}

Return JSON:
{
  "backlogHealth": number 0-100 (100=all projects on track),
  "grade": "A"|"B"|"C"|"D"|"F",
  "summary": "one-line backlog assessment",
  "burnPredictions": [{ "project": string, "currentBurnRate": string, "predictedCompletion": string, "budgetOutcome": "under"|"on-track"|"over", "variance": string, "action": string }],
  "criticalProjects": [{ "project": string, "risk": string, "weeksUntilCrisis": number, "intervention": string }],
  "laborAllocation": { "totalBudgeted": number, "totalConsumed": number, "consumptionRate": string, "projectedFinish": string },
  "efficiencyTips": [{ "tip": string, "savingsPotential": string, "implementation": string }],
  "weeklyBurnTrend": [{ "week": string, "projected": number, "risk": "low"|"medium"|"high" }]
}

Focus on: which projects will go over labor budget, burn rate sustainability, team reallocation opportunities, and early warnings. Since labor = profit for EBC, this is critical financial analysis.

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(apiKey, prompt, 1800);
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}
