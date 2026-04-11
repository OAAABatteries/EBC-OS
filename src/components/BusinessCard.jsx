import { useState, useRef } from "react";
import { Phone, Mail, MapPin } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  Business Card Generator — EBC branded cards per employee/role
//  Dark matte blue + white eagle + amber accents
// ═══════════════════════════════════════════════════════════════

const CARD_STYLES = `
  .bc-preview { width:350px;height:200px;border-radius:12px;position:relative;overflow:hidden;
    background:linear-gradient(135deg,#0a1628 0%,#132244 60%,#0d1a36 100%);
    box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:'Inter',system-ui,sans-serif;color:#e2e8f0; }
  .bc-eagle { position:absolute;right:16px;top:50%;transform:translateY(-50%);width:80px;height:80px;opacity:0.08; }
  .bc-content { position:relative;z-index:1;padding:24px;display:flex;flex-direction:column;height:100%;box-sizing:border-box; }
  .bc-name { font-size:18px;font-weight:800;color:#ffffff;letter-spacing:0.5px; }
  .bc-title { font-size:11px;color:#f59e0b;text-transform:uppercase;letter-spacing:1.5px;margin-top:2px;font-weight:600; }
  .bc-divider { width:40px;height:2px;background:#f59e0b;margin: "var(--space-3)"px 0;border-radius:2px; }
  .bc-info { margin-top:auto;display:flex;flex-direction:column;gap: "var(--space-1)"px; }
  .bc-info-row { font-size:10px;color:#94a3b8;display:flex;align-items:center;gap: "var(--space-2)"px; }
  .bc-info-row span { color:#cbd5e1; }
  .bc-company { position:absolute;bottom:16px;right:20px;text-align:right; }
  .bc-company-name { font-size:9px;font-weight:800;color:#f59e0b;letter-spacing:2px;text-transform:uppercase; }
  .bc-company-sub { font-size:7px;color:#475569;letter-spacing:1px;text-transform:uppercase; }
  .bc-accent { position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#f59e0b,#d97706); }
  @media print { .bc-no-print { display:none !important; } }
`;

const EAGLE_SVG = `<svg viewBox="0 0 100 100" fill="white"><path d="M50 10C40 10 30 20 25 35C20 50 25 65 35 75C40 80 45 82 50 85C55 82 60 80 65 75C75 65 80 50 75 35C70 20 60 10 50 10ZM50 25C55 25 60 30 62 40C64 50 60 60 55 65C52 68 50 70 50 70C50 70 48 68 45 65C40 60 36 50 38 40C40 30 45 25 50 25Z"/></svg>`;

export default function BusinessCardGenerator({ employees, app }) {
  const [selected, setSelected] = useState(null);
  const [custom, setCustom] = useState({ name: "", title: "", phone: "", email: "" });
  const cardRef = useRef(null);

  const team = [
    { name: "Emmanuel Aguilar", title: "Owner / Senior PM", phone: "713-820-6868", email: "emmanuel@ebchouston.com" },
    { name: "Abner Aguilar", title: "Project Manager / Estimator", phone: "713-820-6868", email: "abner@ebchouston.com" },
    { name: "Isai Aguilar", title: "Project Manager", phone: "713-820-6868", email: "isai@ebchouston.com" },
    ...(employees || []).filter(e => e.active && e.role === "Foreman").map(e => ({
      name: e.name, title: "Foreman", phone: e.phone || "", email: e.email || ""
    })),
  ];

  const card = selected || custom;
  const hasCard = card.name && card.title;

  const handlePrint = () => {
    const printWin = window.open("", "_blank", "width=400,height=260");
    printWin.document.write(`<html><head><style>${CARD_STYLES} body{margin: "var(--space-5)"px;background:#fff;}</style></head><body>`);
    printWin.document.write(cardRef.current.outerHTML);
    printWin.document.write(`</body></html>`);
    printWin.document.close();
    printWin.print();
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, { scale: 3, backgroundColor: null });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `EBC_Card_${card.name.replace(/\s+/g, "_")}.png`;
      a.click();
      app?.show?.("Business card downloaded", "ok");
    } catch {
      handlePrint();
    }
  };

  return (
    <div>
      <style>{CARD_STYLES}</style>
      <div className="section-title" style={{ marginBottom: "var(--space-4)" }}>Business Card Generator</div>

      {/* Team selector */}
      <div className="flex gap-8 mb-16 flex-wrap">
        {team.map((p, i) => (
          <button key={i} className={`btn btn-sm ${selected === p ? "btn-primary" : "btn-ghost"}`}
            onClick={() => { setSelected(p); setCustom({ name: "", title: "", phone: "", email: "" }); }}>
            {p.name}
          </button>
        ))}
        <button className={`btn btn-sm ${!selected ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setSelected(null)}>+ Custom</button>
      </div>

      {/* Custom form */}
      {!selected && (
        <div className="form-grid mb-16">
          <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={custom.name} onChange={e => setCustom(c => ({ ...c, name: e.target.value }))} placeholder="Full name" /></div>
          <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={custom.title} onChange={e => setCustom(c => ({ ...c, title: e.target.value }))} placeholder="e.g. Project Manager" /></div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={custom.phone} onChange={e => setCustom(c => ({ ...c, phone: e.target.value }))} placeholder="713-820-6868" /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={custom.email} onChange={e => setCustom(c => ({ ...c, email: e.target.value }))} placeholder="name@ebchouston.com" /></div>
        </div>
      )}

      {/* Card preview */}
      {hasCard && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)" }}>
          <div ref={cardRef} className="bc-preview">
            <div className="bc-accent" />
            <div className="bc-eagle" dangerouslySetInnerHTML={{ __html: EAGLE_SVG }} />
            <div className="bc-content">
              <div className="bc-name">{card.name}</div>
              <div className="bc-title">{card.title}</div>
              <div className="bc-divider" />
              <div className="bc-info">
                {card.phone && <div className="bc-info-row"><Phone style={{ width: 16, height: 16 }} /> <span>{card.phone}</span></div>}
                {card.email && <div className="bc-info-row"><Mail style={{ width: 16, height: 16 }} /> <span>{card.email}</span></div>}
                <div className="bc-info-row"><MapPin style={{ width: 16, height: 16 }} /> <span>Houston, TX</span></div>
              </div>
              <div className="bc-company">
                <div className="bc-company-name">Eagles Brothers</div>
                <div className="bc-company-sub">Constructors</div>
              </div>
            </div>
          </div>

          <div className="flex gap-8 bc-no-print">
            <button className="btn btn-primary" onClick={handleDownload}>Download PNG</button>
            <button className="btn btn-ghost" onClick={handlePrint}>Print</button>
          </div>
        </div>
      )}
    </div>
  );
}
