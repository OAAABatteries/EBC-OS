// ═══════════════════════════════════════════════════════════════
//  EBC-OS · useFormDraft Hook
//  Auto-saves form state to localStorage on every change.
//  Restores on mount. Clears on explicit discard or submit.
//  Prevents data loss when app refreshes or loses signal.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";

const DRAFT_PREFIX = "ebc_draft_";

/**
 * useFormDraft — persistent form state that survives app refreshes
 *
 * @param {string} draftKey — unique key for this form (e.g. "tm_ticket_proj1")
 * @param {object} initialState — default form values
 * @returns [formState, setFormState, { clearDraft, hasDraft, draftAge }]
 *
 * Usage:
 *   const [form, setForm, { clearDraft, hasDraft }] = useFormDraft("mat_request", { material: "", qty: "" });
 *   // On submit success: clearDraft();
 *   // On mount: if hasDraft, show "Resume draft?" prompt
 */
export function useFormDraft(draftKey, initialState) {
  const fullKey = DRAFT_PREFIX + draftKey;
  const isFirstRender = useRef(true);

  // Load from localStorage on mount
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(fullKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialState, ...parsed.data };
      }
    } catch {}
    return initialState;
  });

  // Check if there's a saved draft
  const [hasDraft] = useState(() => {
    try {
      return localStorage.getItem(fullKey) !== null;
    } catch { return false; }
  });

  // Draft age in minutes
  const draftAge = (() => {
    try {
      const saved = localStorage.getItem(fullKey);
      if (!saved) return 0;
      const { savedAt } = JSON.parse(saved);
      return savedAt ? Math.round((Date.now() - savedAt) / 60000) : 0;
    } catch { return 0; }
  })();

  // Auto-save to localStorage on every state change (debounced by 500ms)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Don't save if state matches initial (empty form)
    const isDefault = JSON.stringify(state) === JSON.stringify(initialState);
    if (isDefault) {
      try { localStorage.removeItem(fullKey); } catch {}
      return;
    }
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(fullKey, JSON.stringify({
          data: state,
          savedAt: Date.now(),
        }));
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [state, fullKey]);

  // Clear draft (call after successful submit)
  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(fullKey); } catch {}
    setState(initialState);
  }, [fullKey, initialState]);

  // Wrapper setState that merges like React class components
  const setFormState = useCallback((updater) => {
    setState(prev => {
      if (typeof updater === "function") return updater(prev);
      return { ...prev, ...updater };
    });
  }, []);

  return [state, setFormState, { clearDraft, hasDraft, draftAge }];
}

/**
 * List all active drafts (for showing "you have unsaved work" indicators)
 */
export function listActiveDrafts() {
  const drafts = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) {
        const data = JSON.parse(localStorage.getItem(key));
        drafts.push({
          key: key.replace(DRAFT_PREFIX, ""),
          savedAt: data.savedAt,
          ageMinutes: Math.round((Date.now() - (data.savedAt || 0)) / 60000),
        });
      }
    }
  } catch {}
  return drafts;
}
