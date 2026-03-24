import { useMemo, useCallback, useState } from "react";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS Smart Alert Engine
//  Scans all pipeline data and generates actionable notifications
// ═══════════════════════════════════════════════════════════════

const DISMISSED_KEY = "ebc_dismissed_alerts";

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "{}"); } catch { return {}; }
}

function setDismissed(map) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
}

// Urgency levels: "critical" (red), "warning" (amber), "info" (blue)
const URGENCY_ORDER = { critical: 0, warning: 1, info: 2 };

function daysBetween(d1, d2) {
  return Math.floor((d2 - d1) / 86400000);
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function makeMailto(to, subject, body) {
  return `mailto:${encodeURIComponent(to || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ── Email templates ──
function thankYouEmail(gcContact, projectName, contactEmail) {
  return makeMailto(
    contactEmail,
    `Thank you - ${projectName}`,
    `Dear ${gcContact},\n\nThank you for awarding ${projectName} to Eagles Brothers Constructors. We look forward to working with you on this project and delivering quality results on schedule.\n\nPlease let me know if there is anything you need from us to get started — submittals, COI, scheduling, etc.\n\nBest regards,\nAbner Aguilar\nEagles Brothers Constructors\n(346) 970-7093`
  );
}

function followUpEmail(gcContact, bidName, bidDate, contactEmail) {
  return makeMailto(
    contactEmail,
    `Following up - ${bidName}`,
    `Dear ${gcContact || "Team"},\n\nI wanted to follow up on our proposal for ${bidName}${bidDate ? ` submitted on ${bidDate}` : ""}. Please let me know if you have any questions or need any clarifications on our pricing.\n\nWe would love the opportunity to work on this project with you.\n\nBest regards,\nAbner Aguilar\nEagles Brothers Constructors\n(346) 970-7093`
  );
}

function sendProposalEmail(gcContact, bidName, contactEmail) {
  return makeMailto(
    contactEmail,
    `Proposal - ${bidName}`,
    `Dear ${gcContact || "Team"},\n\nPlease find attached our proposal for ${bidName}. We have reviewed the plans and specifications and are confident in our pricing.\n\nPlease let me know if you have any questions.\n\nBest regards,\nAbner Aguilar\nEagles Brothers Constructors\n(346) 970-7093`
  );
}

function submittalReminderEmail(gcContact, projectName, contactEmail) {
  return makeMailto(
    contactEmail,
    `Submittal Status - ${projectName}`,
    `Dear ${gcContact || "Team"},\n\nI wanted to check on the status of our submittals for ${projectName}. Please let me know if you need any revisions or additional information.\n\nBest regards,\nAbner Aguilar\nEagles Brothers Constructors\n(346) 970-7093`
  );
}

function invoiceEmail(gcContact, projectName, contactEmail) {
  return makeMailto(
    contactEmail,
    `Final Invoice - ${projectName}`,
    `Dear ${gcContact || "Team"},\n\nPlease find attached the final invoice for ${projectName}. We appreciate the opportunity to work on this project with you.\n\nPlease let me know if you have any questions regarding the billing.\n\nBest regards,\nAbner Aguilar\nEagles Brothers Constructors\n(346) 970-7093`
  );
}

// ── Main scan function ──
export function scanAlerts({ bids, projects, contacts, submittals, rfis, changeOrders, certifications, employees, timeEntries, invoices }) {
  const now = new Date();
  const alerts = [];
  const contactMap = {};
  (contacts || []).forEach(c => {
    if (c.name) contactMap[c.name] = c;
    if (c.company) {
      if (!contactMap[`gc:${c.company}`]) contactMap[`gc:${c.company}`] = c;
    }
  });

  const findContact = (bid) => {
    if (bid.contact && contactMap[bid.contact]) return contactMap[bid.contact];
    if (bid.gc && contactMap[`gc:${bid.gc}`]) return contactMap[`gc:${bid.gc}`];
    return null;
  };

  const findProjectContact = (proj) => {
    if (proj.gc && contactMap[`gc:${proj.gc}`]) return contactMap[`gc:${proj.gc}`];
    return null;
  };

  // ════════════════════════════════════════════════════════════
  //  BID PIPELINE ALERTS
  // ════════════════════════════════════════════════════════════

  (bids || []).forEach(b => {
    const dueDate = parseDate(b.due) || parseDate(b.bidDate);
    const contact = findContact(b);
    const contactEmail = contact?.email || "";
    const contactName = b.contact || contact?.name || b.gc || "";

    // 1) Thank you email for awarded bids (within recent time)
    if (b.status === "awarded") {
      alerts.push({
        id: `thank_you_${b.id}`,
        category: "bids",
        urgency: "info",
        icon: "award",
        title: `Send thank you to ${b.gc || "GC"}`,
        message: `${b.name} was awarded. Send a thank you email to ${contactName}.`,
        action: contactEmail ? { label: "Send Email", type: "mailto", url: thankYouEmail(contactName, b.name, contactEmail) } : null,
        nav: { tab: "bids", bidId: b.id },
        ts: now.toISOString(),
      });
    }

    // 2) Follow up on submitted bids >5 days old
    if (b.status === "submitted" && dueDate) {
      const daysAgo = daysBetween(dueDate, now);
      if (daysAgo > 5) {
        const urgency = daysAgo > 30 ? "warning" : "info";
        alerts.push({
          id: `followup_${b.id}`,
          category: "bids",
          urgency,
          icon: "mail",
          title: `Follow up on ${b.name.length > 40 ? b.name.slice(0, 37) + "..." : b.name}`,
          message: `Submitted ${daysAgo} days ago to ${b.gc || "GC"} — no response yet.`,
          action: { label: "Follow Up", type: "mailto", url: followUpEmail(contactName, b.name, dueDate?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) || "", contactEmail) },
          nav: { tab: "bids", bidId: b.id },
          ts: now.toISOString(),
        });
      }
    }

    // 3) Bid due within 3 days
    if (["invite_received", "reviewing", "assigned", "takeoff", "awaiting_quotes", "pricing", "draft_ready", "estimating"].includes(b.status) && dueDate) {
      const daysUntil = daysBetween(now, dueDate);
      if (daysUntil >= 0 && daysUntil <= 3) {
        alerts.push({
          id: `bid_due_${b.id}`,
          category: "bids",
          urgency: daysUntil === 0 ? "critical" : "warning",
          icon: "clock",
          title: `Bid due ${daysUntil === 0 ? "TODAY" : `in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}`,
          message: `${b.name} — $${(b.value || 0).toLocaleString()}`,
          action: { label: "Open Bid", type: "openBid" },
          nav: { tab: "bids", bidId: b.id },
          ts: now.toISOString(),
        });
      }
    }

    // 4) Bid overdue — past due and still active
    if (["invite_received", "reviewing", "assigned", "takeoff", "awaiting_quotes", "pricing", "draft_ready", "estimating"].includes(b.status) && dueDate) {
      const daysOverdue = daysBetween(dueDate, now);
      if (daysOverdue > 0) {
        alerts.push({
          id: `bid_overdue_${b.id}`,
          category: "bids",
          urgency: "critical",
          icon: "alert",
          title: `Bid overdue: ${b.name.length > 35 ? b.name.slice(0, 32) + "..." : b.name}`,
          message: `Was due ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} ago — still in ${b.status.replace(/_/g, " ")} status.`,
          action: { label: "Open Bid", type: "openBid" },
          nav: { tab: "bids", bidId: b.id },
          ts: now.toISOString(),
        });
      }
    }

    // 5) Send proposal — invite received >2 days
    if (b.status === "invite_received" && dueDate) {
      const daysOld = daysBetween(dueDate, now);
      // Use a rough check — if the bid due date is in the future, calculate from "now - 2 days" as an estimate
      // But actually the invite was likely received around the bid creation, so use bidDate
      const bidDate = parseDate(b.bidDate);
      if (bidDate) {
        const sinceBid = daysBetween(bidDate, now);
        if (sinceBid > 2) {
          alerts.push({
            id: `send_proposal_${b.id}`,
            category: "bids",
            urgency: "warning",
            icon: "edit",
            title: `Send proposal for ${b.name.length > 35 ? b.name.slice(0, 32) + "..." : b.name}`,
            message: `Invite received ${sinceBid} days ago from ${b.gc || "GC"}.`,
            action: contactEmail ? { label: "Send Email", type: "mailto", url: sendProposalEmail(contactName, b.name, contactEmail) } : { label: "Open Bid", type: "openBid" },
            nav: { tab: "bids", bidId: b.id },
            ts: now.toISOString(),
          });
        }
      }
    }
  });

  // ════════════════════════════════════════════════════════════
  //  PROJECT MANAGEMENT ALERTS
  // ════════════════════════════════════════════════════════════

  const activeProjects = (projects || []).filter(p => p.status === "in-progress" || p.status === "active");
  const completedProjects = (projects || []).filter(p => p.status === "completed" || (p.progress || 0) >= 100);

  activeProjects.forEach(p => {
    const projSubmittals = (submittals || []).filter(s => s.projectId === p.id);
    const projContact = findProjectContact(p);
    const contactEmail = projContact?.email || "";
    const contactName = projContact?.name || p.gc || "";

    // 6) Active project with 0 submittals
    if (projSubmittals.length === 0) {
      alerts.push({
        id: `no_submittals_${p.id}`,
        category: "projects",
        urgency: "warning",
        icon: "clipboard",
        title: `Submit submittals for ${p.name.length > 35 ? p.name.slice(0, 32) + "..." : p.name}`,
        message: `Project started — no submittals logged yet.`,
        action: { label: "Add Submittal", type: "openProject" },
        nav: { tab: "projects", projectId: p.id, projTab: "submittals" },
        ts: now.toISOString(),
      });
    }

    // 7) Profit margin below 30%
    const contract = p.contract || 0;
    const totalCost = (p.laborCost || 0) + (p.materialCost || 0);
    if (contract > 0 && totalCost > 0) {
      const margin = Math.round(((contract - totalCost) / contract) * 100);
      if (margin < 30) {
        alerts.push({
          id: `low_margin_${p.id}`,
          category: "projects",
          urgency: margin < 0 ? "critical" : "warning",
          icon: "trending-down",
          title: `${p.name.length > 30 ? p.name.slice(0, 27) + "..." : p.name} — ${margin}% margin`,
          message: `Below 30% profit margin. Contract: $${contract.toLocaleString()}, Costs: $${totalCost.toLocaleString()}.`,
          action: { label: "View Financials", type: "openProject" },
          nav: { tab: "projects", projectId: p.id, projTab: "financials" },
          ts: now.toISOString(),
        });
      }
    }
  });

  // 8) Submittals overdue (submitted >14 days, not approved)
  (submittals || []).forEach(s => {
    if (s.status === "approved" || s.status === "rejected") return;
    const submitted = parseDate(s.submitted || s.date);
    if (!submitted) return;
    const daysOut = daysBetween(submitted, now);
    if (daysOut > 14) {
      const projName = (projects || []).find(pr => String(pr.id) === String(s.projectId))?.name || "Unknown";
      const proj = (projects || []).find(pr => String(pr.id) === String(s.projectId));
      const projContact = proj ? findProjectContact(proj) : null;
      alerts.push({
        id: `sub_overdue_${s.id}`,
        category: "projects",
        urgency: daysOut > 30 ? "critical" : "warning",
        icon: "file",
        title: `Submittal ${s.number || "#" + s.id} overdue`,
        message: `Submitted ${daysOut} days ago on ${projName} — no response.`,
        action: projContact?.email ? { label: "Follow Up", type: "mailto", url: submittalReminderEmail(projContact.name, projName, projContact.email) } : { label: "View Submittals", type: "openProject" },
        nav: { tab: "projects", projectId: s.projectId, projTab: "submittals" },
        ts: now.toISOString(),
      });
    }
  });

  // 8b) Frames & Hardware submittals: overdue delivery or unapproved past due date
  (submittals || []).forEach(s => {
    if ((s.category || "General") !== "Frames & Hardware") return;
    if (s.status === "approved") return;
    const projName = (projects || []).find(pr => String(pr.id) === String(s.projectId))?.name || "Unknown";
    // Flag if scheduled delivery is in the past and not approved
    if (s.scheduledDelivery) {
      const delivDate = parseDate(s.scheduledDelivery);
      if (delivDate && daysBetween(delivDate, now) > 0) {
        alerts.push({
          id: `frame_delivery_${s.id}`,
          category: "projects",
          urgency: "warning",
          icon: "alert",
          title: `Frame delivery overdue: ${s.desc || s.number}`,
          message: `${projName} — ${[s.frameType, s.frameMaterial, s.fireRating].filter(Boolean).join(", ")} delivery was scheduled ${s.scheduledDelivery}.`,
          action: { label: "View Submittals", type: "openProject" },
          nav: { tab: "documents", projectId: s.projectId },
          ts: now.toISOString(),
        });
      }
    }
    // Flag if submittal is in "preparing" or "submitted" state with due date past
    if (s.due) {
      const dueDate = parseDate(s.due);
      if (dueDate && daysBetween(dueDate, now) > 0 && s.status !== "approved") {
        alerts.push({
          id: `frame_sub_due_${s.id}`,
          category: "projects",
          urgency: "critical",
          icon: "file",
          title: `Frame submittal overdue: ${s.number || s.desc}`,
          message: `${projName} — ${s.desc} approval needed.`,
          action: { label: "View Submittals", type: "openProject" },
          nav: { tab: "documents", projectId: s.projectId },
          ts: now.toISOString(),
        });
      }
    }
  });

  // 9) RFIs open >7 days
  (rfis || []).forEach(r => {
    if (r.status === "Answered" || r.status === "Closed" || r.status === "closed" || r.status === "answered") return;
    const submitted = parseDate(r.submitted || r.dateSubmitted || r.date);
    if (!submitted) return;
    const daysOpen = daysBetween(submitted, now);
    if (daysOpen > 7) {
      const projName = (projects || []).find(pr => String(pr.id) === String(r.projectId))?.name || "Unknown";
      alerts.push({
        id: `rfi_open_${r.id}`,
        category: "projects",
        urgency: daysOpen > 21 ? "critical" : "warning",
        icon: "\u2753",
        title: `RFI ${r.number || "#" + r.id} unanswered — ${daysOpen} days`,
        message: `On ${projName}.`,
        action: { label: "View RFI", type: "openProject" },
        nav: { tab: "projects", projectId: r.projectId, projTab: "rfis" },
        ts: now.toISOString(),
      });
    }
  });

  // 10) Change orders pending >5 days
  (changeOrders || []).forEach(co => {
    if (co.status !== "pending" && co.status !== "submitted") return;
    const submitted = parseDate(co.submitted || co.date);
    if (!submitted) return;
    const daysPending = daysBetween(submitted, now);
    if (daysPending > 5) {
      const projName = (projects || []).find(pr => String(pr.id) === String(co.projectId))?.name || "Unknown";
      alerts.push({
        id: `co_pending_${co.id}`,
        category: "projects",
        urgency: daysPending > 14 ? "critical" : "warning",
        icon: "dollar",
        title: `CO ${co.number || "#" + co.id} pending — ${daysPending} days`,
        message: `$${Math.abs(co.amount || 0).toLocaleString()} on ${projName}.`,
        action: { label: "View CO", type: "openProject" },
        nav: { tab: "projects", projectId: co.projectId, projTab: "change-orders" },
        ts: now.toISOString(),
      });
    }
  });

  // 11) Closeout incomplete on completed projects
  completedProjects.forEach(p => {
    const co = p.closeOut || p.closeout;
    if (co && typeof co === "object") {
      const fields = Object.values(co);
      const done = fields.filter(v => v === true || v === "done" || v === "complete").length;
      const pct = fields.length > 0 ? Math.round((done / fields.length) * 100) : 0;
      if (pct < 100) {
        alerts.push({
          id: `closeout_${p.id}`,
          category: "projects",
          urgency: "warning",
          icon: "package",
          title: `Closeout incomplete — ${p.name.length > 30 ? p.name.slice(0, 27) + "..." : p.name}`,
          message: `${pct}% done. Project is marked complete.`,
          action: { label: "Complete Closeout", type: "openProject" },
          nav: { tab: "projects", projectId: p.id, projTab: "closeout" },
          ts: now.toISOString(),
        });
      }
    }
  });

  // 12) Send final invoice for completed project
  completedProjects.forEach(p => {
    const projInvoices = (invoices || []).filter(i => String(i.projectId) === String(p.id));
    const hasFinal = projInvoices.some(i => i.type === "final" || i.label?.toLowerCase().includes("final"));
    if (!hasFinal) {
      const projContact = findProjectContact(p);
      alerts.push({
        id: `final_invoice_${p.id}`,
        category: "projects",
        urgency: "warning",
        icon: "dollar",
        title: `Send final invoice — ${p.name.length > 30 ? p.name.slice(0, 27) + "..." : p.name}`,
        message: `Project complete but no final invoice found.`,
        action: projContact?.email ? { label: "Send Invoice", type: "mailto", url: invoiceEmail(projContact.name, p.name, projContact.email) } : { label: "View Financials", type: "openProject" },
        nav: { tab: "projects", projectId: p.id, projTab: "financials" },
        ts: now.toISOString(),
      });
    }
  });

  // ════════════════════════════════════════════════════════════
  //  CREW/HR ALERTS
  // ════════════════════════════════════════════════════════════

  // 13) Certifications expiring within 30 days
  (certifications || []).forEach(cert => {
    if (!cert.expiryDate) return;
    const expiry = parseDate(cert.expiryDate);
    if (!expiry) return;
    const daysLeft = daysBetween(now, expiry);
    const empName = (employees || []).find(e => String(e.id) === String(cert.employeeId))?.name || "Employee";

    if (daysLeft < 0) {
      alerts.push({
        id: `cert_expired_${cert.id}`,
        category: "crew",
        urgency: "critical",
        icon: "alert",
        title: `Cert expired: ${empName}`,
        message: `${cert.name} expired ${Math.abs(daysLeft)} days ago.`,
        action: { label: "View Employee", type: "openEmployee" },
        nav: { tab: "timeclock", employeeId: cert.employeeId, subTab: "employees" },
        ts: now.toISOString(),
      });
    } else if (daysLeft <= 30) {
      alerts.push({
        id: `cert_expiring_${cert.id}`,
        category: "crew",
        urgency: daysLeft <= 7 ? "critical" : "warning",
        icon: "clipboard",
        title: `Cert expiring: ${empName}`,
        message: `${cert.name} expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`,
        action: { label: "View Employee", type: "openEmployee" },
        nav: { tab: "timeclock", employeeId: cert.employeeId, subTab: "employees" },
        ts: now.toISOString(),
      });
    }
  });

  // 14) Active employees with no time entries this week
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const activeEmps = (employees || []).filter(e => e.status === "active" || !e.status);
  activeEmps.forEach(emp => {
    const weekEntries = (timeEntries || []).filter(te => {
      if (te.employeeId !== emp.id) return false;
      const d = parseDate(te.date || te.clockIn);
      return d && d >= startOfWeek;
    });
    if (weekEntries.length === 0 && activeEmps.length > 0) {
      alerts.push({
        id: `no_time_${emp.id}_${startOfWeek.toISOString().slice(0, 10)}`,
        category: "crew",
        urgency: "info",
        icon: "clock",
        title: `${emp.name || "Employee"} — no time entries`,
        message: `No clock-ins this week.`,
        action: { label: "View Employee", type: "openEmployee" },
        nav: { tab: "timeclock", employeeId: emp.id, subTab: "employees" },
        ts: now.toISOString(),
      });
    }
  });

  // Sort: critical first, then warning, then info
  alerts.sort((a, b) => (URGENCY_ORDER[a.urgency] || 9) - (URGENCY_ORDER[b.urgency] || 9));

  return alerts;
}

// ── Hook ──
export function useAlertEngine({ bids, projects, contacts, submittals, rfis, changeOrders, certifications, employees, timeEntries, invoices }) {
  // Counter to force re-render when dismiss state changes (localStorage is not reactive)
  const [dismissVer, setDismissVer] = useState(0);

  const alerts = useMemo(() =>
    scanAlerts({ bids, projects, contacts, submittals, rfis, changeOrders, certifications, employees, timeEntries, invoices }),
    [bids, projects, contacts, submittals, rfis, changeOrders, certifications, employees, timeEntries, invoices]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dismissed = useMemo(() => getDismissed(), [alerts, dismissVer]);
  const activeAlerts = useMemo(() => alerts.filter(a => !dismissed[a.id]), [alerts, dismissed]);

  const dismissAlert = useCallback((id) => {
    const d = getDismissed();
    d[id] = Date.now();
    setDismissed(d);
    setDismissVer(v => v + 1);
  }, []);

  const dismissAll = useCallback(() => {
    const d = getDismissed();
    alerts.forEach(a => { d[a.id] = Date.now(); });
    setDismissed(d);
    setDismissVer(v => v + 1);
  }, [alerts]);

  const undismissAll = useCallback(() => {
    setDismissed({});
    setDismissVer(v => v + 1);
  }, []);

  const badgeCount = activeAlerts.length;

  const grouped = useMemo(() => {
    const g = { bids: [], projects: [], crew: [] };
    activeAlerts.forEach(a => {
      if (g[a.category]) g[a.category].push(a);
      else g.bids.push(a); // fallback
    });
    return g;
  }, [activeAlerts]);

  return { alerts, activeAlerts, grouped, badgeCount, dismissAlert, dismissAll, undismissAll };
}
