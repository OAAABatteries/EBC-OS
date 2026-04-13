import { MessageSquare, Pin, PinOff } from "lucide-react";

export function NotesTab({
  projectNotes, saveProjectNotes, selectedProjectId,
  foremanNoteText, setForemanNoteText,
  foremanNotesFilter, setForemanNotesFilter,
  activeForeman, show, t,
}) {
  return (
    <div className="emp-content">
      <div className="section-header frm-mb-12">
        <div className="flex gap-8" style={{ alignItems: "center" }}>
          <MessageSquare size={18} className="frm-amber" />
          <div>
            <div className="section-title frm-section-title-md">{t("Team Notes")}</div>
            <div className="text-xs text-muted">{t("Visible to all project team members")}</div>
          </div>
        </div>
      </div>

      {/* Compose */}
      <div className="rounded-control mb-sp3 p-sp4 bg-bg2" style={{ border: "1px solid var(--border)" }}>
        <textarea
          className="rounded-control fs-secondary mb-sp3 p-sp3 bg-bg3 c-text w-full" style={{ minHeight: 80, border: "1px solid var(--border)", resize: "vertical" }}
          placeholder={t("Post a field note to the project team...")}
          value={foremanNoteText}
          onChange={e => setForemanNoteText(e.target.value)}
        />
        <div className="flex gap-8">
          <button className="btn btn-primary btn-sm" onClick={() => {
            if (!foremanNoteText.trim()) return;
            const newNote = {
              id: crypto.randomUUID(),
              projectId: String(selectedProjectId),
              text: foremanNoteText.trim(),
              author: activeForeman.name,
              role: "foreman",
              category: "field",
              pinned: false,
              timestamp: new Date().toISOString(),
            };
            saveProjectNotes([newNote, ...(projectNotes || [])]);
            setForemanNoteText("");
            show(t("Field note posted"), "ok");
          }} disabled={!foremanNoteText.trim()}>
            {t("Post Field Note")}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-4 mb-12 overflow-x-auto">
        {["all", "pm", "field", "office"].map(f => {
          const projNotes = (projectNotes || []).filter(n => String(n.projectId) === String(selectedProjectId));
          const cnt = f === "all" ? projNotes.length : projNotes.filter(n => n.category === f).length;
          const label = f === "all" ? "All" : f === "pm" ? "PM" : f === "field" ? "Field" : "Office";
          return (
            <button key={f} className={`btn btn-sm ${foremanNotesFilter === f ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setForemanNotesFilter(f)} className="nowrap">
              {label} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Notes list */}
      {(() => {
        const projNotes = (projectNotes || []).filter(n => String(n.projectId) === String(selectedProjectId));
        const filtered = foremanNotesFilter === "all" ? projNotes : projNotes.filter(n => n.category === foremanNotesFilter);
        const pinned = filtered.filter(n => n.pinned);
        const unpinned = filtered.filter(n => !n.pinned);
        const visible = [...pinned, ...unpinned];

        if (visible.length === 0) return (
          <div className="empty-state" style={{ padding: "var(--space-8) var(--space-5)" }}>
            <div className="empty-icon"><MessageSquare size={28} /></div>
            <div className="empty-text">{t("No notes yet")}</div>
          </div>
        );

        const catBadge = (cat) => ({ pm: "badge-blue", field: "badge-amber", office: "badge-green" }[cat] || "badge-muted");
        const catLabel = (cat) => ({ pm: "PM", field: "Field", office: "Office" }[cat] || cat);
        const fmtTime = (ts) => { try { const d = new Date(ts); return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return ts; } };

        return (
          <div className="flex-col gap-8">
            {visible.map(note => (
              <div key={note.id} style={{ background: note.pinned ? "rgba(245,158,11,0.05)" : "var(--card)", border: `1px solid ${note.pinned ? "var(--amber)" : "var(--border)"}`, borderRadius: "var(--radius-control)", padding: "var(--space-4)" }}>
                <div className="frm-flex-between frm-mb-8">
                  <div className="flex gap-8" style={{ alignItems: "center" }}>
                    {note.pinned && <Pin size={11} className="frm-amber" />}
                    <span className="font-semi text-sm">{note.author}</span>
                    <span className={`badge ${catBadge(note.category)} fs-xs`}>{catLabel(note.category)}</span>
                  </div>
                  <div className="flex gap-6" style={{ alignItems: "center" }}>
                    <span className="text-xs text-muted">{fmtTime(note.timestamp)}</span>
                    <button onClick={() => saveProjectNotes(projectNotes.map(n => n.id === note.id ? { ...n, pinned: !n.pinned } : n))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: note.pinned ? "var(--amber)" : "var(--text3)", padding: "var(--space-1) var(--space-1)" }}>
                      {note.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                    </button>
                    {note.author === activeForeman.name && (
                      <button onClick={() => saveProjectNotes(projectNotes.filter(n => n.id !== note.id))}
                        className="frm-btn-unstyled--text3">{"\u2715"}</button>
                    )}
                  </div>
                </div>
                <div className="text-sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{note.text}</div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
