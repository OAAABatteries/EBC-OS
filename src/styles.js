// EBC-OS Styles · Glass Aesthetic
export const styles = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;overflow:hidden}
@supports(padding-top:env(safe-area-inset-top)){#root{height:100dvh}}
body{font-family:var(--font-body);background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:8px}::-webkit-scrollbar-thumb:hover{background:var(--text3)}

/* ══ APP LAYOUT ══ */
.app{display:flex;flex-direction:column;height:100vh;height:100dvh;overflow:hidden;position:relative}
.header{display:flex;align-items:center;gap:16px;padding:0 24px;height:54px;
  background:var(--glass-bg);backdrop-filter:blur(24px) saturate(1.8);-webkit-backdrop-filter:blur(24px) saturate(1.8);
  border-bottom:1px solid var(--glass-border);position:sticky;top:0;z-index:100;
  box-shadow:0 1px 0 var(--glass-border)}
.logo{font-family:var(--font-head);font-size:18px;font-weight:700;color:var(--amber);letter-spacing:1px;white-space:nowrap;
  text-shadow:0 0 20px var(--amber-glow)}
.logo-sub{font-size:10px;color:var(--text3);font-weight:400;letter-spacing:0.5px;display:block;margin-top:-2px}
.portal-header-logo{height:34px;width:auto;object-fit:contain}
.portal-header-logo--dark{filter:invert(1) brightness(0.3)}
.portal-header-accent-border{border-bottom-color:rgba(255,127,33,0.15)}
.main-content{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:24px 28px 40px;padding-bottom:calc(40px + env(safe-area-inset-bottom));animation:fadeIn 0.25s ease;position:relative;z-index:1}

/* ══ NAV ══ */
.nav{display:flex;align-items:center;gap:2px;margin-left:auto}
.nav-item{padding:6px 14px;border-radius:var(--radius-sm);font-size:12.5px;font-weight:500;
  color:var(--text2);cursor:pointer;border:none;background:none;font-family:var(--font-body);
  transition:all 0.2s cubic-bezier(.4,0,.2,1);white-space:nowrap;position:relative}
.nav-item:hover{color:var(--text);background:var(--amber-dim)}
.nav-item.active{color:var(--amber);background:var(--amber-dim);font-weight:600;
  box-shadow:0 0 12px var(--amber-glow)}
.nav-badge{position:absolute;top:2px;right:4px;width:6px;height:6px;border-radius:50%;background:var(--red)}
.nav-more{position:relative}
.nav-more-btn{padding:6px 12px;border-radius:var(--radius-sm);font-size:12.5px;font-weight:500;
  color:var(--text2);cursor:pointer;border:1px solid var(--border);background:none;
  font-family:var(--font-body);transition:all 0.15s ease}
.nav-more-btn:hover{color:var(--text);border-color:var(--text3)}
.nav-more-btn.open{color:var(--amber);border-color:var(--amber);background:var(--amber-dim)}
.nav-dropdown{position:absolute;top:calc(100% + 6px);right:0;min-width:180px;
  background:var(--glass-bg);backdrop-filter:blur(24px) saturate(1.8);-webkit-backdrop-filter:blur(24px) saturate(1.8);
  border:1px solid var(--glass-border);border-radius:var(--radius);
  box-shadow:0 8px 32px rgba(0,0,0,0.25);padding:4px;z-index:200;animation:slideDown 0.2s cubic-bezier(.4,0,.2,1)}
.nav-dropdown .nav-item{display:block;width:100%;text-align:left;padding:8px 12px;border-radius:var(--radius-sm)}

/* ══ GLASS ══ */
.glass{backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);
  background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius)}

/* ══ CARDS ══ */
.card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px;
  transition:all 0.25s cubic-bezier(.4,0,.2,1);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.card:hover{border-color:var(--border2);box-shadow:0 4px 16px rgba(0,0,0,0.12);transform:translateY(-1px)}
.card-glass{backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);
  background:var(--glass-bg);border:1px solid var(--glass-border)}
.card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.card-title{font-family:var(--font-head);font-size:15px;font-weight:600;color:var(--text)}

/* ══ KPI ══ */
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:24px}
.kpi-card{padding:18px 20px;border-radius:var(--radius);backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);
  background:var(--glass-bg);border:1px solid var(--glass-border);transition:all 0.25s cubic-bezier(.4,0,.2,1)}
.kpi-card:hover{border-color:var(--amber-dim);box-shadow:0 0 20px var(--amber-glow);transform:translateY(-2px)}
.kpi-label{font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:var(--text3);margin-bottom:6px}
.kpi-value{font-family:var(--font-head);font-size:28px;font-weight:700;color:var(--amber);line-height:1;
  text-shadow:0 0 24px var(--amber-glow)}
.kpi-sub{font-size:12px;color:var(--text2);margin-top:4px}

/* ══ SECTION ══ */
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px}
.section-title{font-family:var(--font-head);font-size:20px;font-weight:700;color:var(--text);letter-spacing:0.5px}
.section-sub{font-size:12px;color:var(--text3);margin-top:2px}

/* ══ TABLES ══ */
.table-wrap{overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border)}
.data-table{width:100%;border-collapse:collapse;font-size:13px}
.data-table th{text-align:left;padding:10px 14px;font-size:10px;text-transform:uppercase;
  letter-spacing:0.8px;color:var(--text3);font-weight:600;background:var(--bg3);
  border-bottom:1px solid var(--border);white-space:nowrap}
.data-table td{padding:10px 14px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
.data-table tr:last-child td{border-bottom:none}
.data-table tr:hover td{background:var(--bg3)}
.data-table .num{text-align:right;font-family:var(--font-mono);font-size:12px}

/* ══ FORMS ══ */
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.form-group{display:flex;flex-direction:column;gap:4px}
.form-group.full{grid-column:1/-1}
.form-label{font-size:10px;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);font-weight:600}
.form-input,.form-select,.form-textarea{background:var(--bg);border:1px solid var(--border);
  border-radius:var(--radius-sm);padding:8px 12px;color:var(--text);font-family:var(--font-body);
  font-size:13px;transition:border-color 0.15s ease}
.form-input:focus,.form-select:focus,.form-textarea:focus{outline:none;border-color:var(--amber);
  box-shadow:0 0 0 2px var(--amber-dim)}
.form-textarea{min-height:80px;resize:vertical}
.form-input::placeholder{color:var(--text3)}

/* ══ BUTTONS ══ */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;
  border-radius:8px;font-family:var(--font-body);font-size:13px;font-weight:500;
  cursor:pointer;transition:all 0.2s cubic-bezier(.4,0,.2,1);white-space:nowrap;
  min-height:36px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.btn:active{transform:scale(0.97)}
.btn-primary{background:var(--amber);color:#000;box-shadow:0 2px 8px var(--amber-glow)}
.btn-primary:hover{background:var(--amber2);box-shadow:0 4px 16px var(--amber-glow);transform:translateY(-1px)}
.btn-primary:active{transform:scale(0.97);box-shadow:0 1px 4px var(--amber-glow)}
.btn-ghost{background:transparent;border:1px solid var(--border);color:var(--text2)}
.btn-ghost:hover{border-color:var(--text3);color:var(--text)}
.btn-danger{background:var(--red-dim);color:var(--red);border:1px solid transparent}
.btn-danger:hover{background:var(--red);color:#fff}
.btn-sm{padding:4px 10px;font-size:11px;min-height:28px}
.btn-icon{width:36px;height:36px;padding:0;display:flex;align-items:center;justify-content:center;
  border-radius:8px;background:none;border:1px solid var(--border);color:var(--text2);
  cursor:pointer;font-size:14px;transition:all 0.15s;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.btn-icon:hover{border-color:var(--text3);color:var(--text)}
.btn-icon:active{transform:scale(0.93)}
.btn-group{display:flex;gap:8px}

/* ══ MODALS ══ */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(12px) saturate(1.4);
  -webkit-backdrop-filter:blur(12px) saturate(1.4);display:flex;align-items:center;justify-content:center;
  z-index:1000;animation:fadeIn 0.2s ease;
  padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
.modal{background:var(--glass-bg);backdrop-filter:blur(24px) saturate(1.8);-webkit-backdrop-filter:blur(24px) saturate(1.8);
  border:1px solid var(--glass-border);border-radius:var(--radius);
  padding:24px;width:min(580px,92vw);max-height:82vh;max-height:82dvh;overflow-y:auto;-webkit-overflow-scrolling:touch;
  box-shadow:0 8px 60px rgba(0,0,0,0.35),0 0 0 1px var(--glass-border);animation:slideUp 0.25s cubic-bezier(.4,0,.2,1)}
.modal-lg{width:min(780px,92vw)}
.modal-header{display:flex;align-items:center;justify-content:space-between;
  margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border)}
.modal-title{font-family:var(--font-head);font-size:18px;font-weight:700;color:var(--text)}
.modal-close{background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:4px}
.modal-close:hover{color:var(--text)}
.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px;padding-top:14px;
  border-top:1px solid var(--border)}

/* ══ BADGES ══ */
.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;
  font-size:11px;font-weight:600;letter-spacing:0.3px}
.badge-green{background:var(--green-dim);color:var(--green)}
.badge-red{background:var(--red-dim);color:var(--red)}
.badge-amber{background:var(--amber-dim);color:var(--amber)}
.badge-blue{background:var(--blue-dim);color:var(--blue)}
.badge-muted{background:var(--bg3);color:var(--text3)}

/* ══ TOASTS ══ */
.toast-wrap{position:fixed;top:16px;top:calc(16px + env(safe-area-inset-top));right:16px;right:calc(16px + env(safe-area-inset-right));z-index:2000;display:flex;flex-direction:column;
  gap:8px;pointer-events:none}
.toast{padding:10px 18px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;
  animation:slideIn 0.25s ease;pointer-events:auto;backdrop-filter:blur(12px)}
.toast-ok{background:var(--green-dim);color:var(--green);border:1px solid rgba(16,185,129,0.15)}
.toast-err{background:var(--red-dim);color:var(--red);border:1px solid rgba(239,68,68,0.15)}

/* ══ GANTT ══ */
.gantt-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius)}
.gantt-header{display:flex;background:var(--bg3);border-bottom:1px solid var(--border);
  font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.6px}
.gantt-header-label{width:220px;flex-shrink:0;padding:8px 12px}
.gantt-header-months{display:flex;flex:1}
.gantt-header-month{flex:1;text-align:center;padding:8px 0;border-left:1px solid var(--border)}
.gantt-row{display:flex;border-bottom:1px solid var(--border);min-height:34px;align-items:center}
.gantt-row:last-child{border-bottom:none}.gantt-row:hover{background:var(--bg3)}
.gantt-label{width:220px;flex-shrink:0;padding:6px 12px;font-size:12px;color:var(--text)}
.gantt-track{flex:1;position:relative;height:22px}
.gantt-bar{position:absolute;height:18px;top:2px;border-radius:4px;font-size:10px;color:#fff;
  font-weight:600;display:flex;align-items:center;padding:0 6px;overflow:hidden;white-space:nowrap}
.gantt-milestone{position:absolute;top:3px;width:16px;height:16px;transform:rotate(45deg);border-radius:2px}

/* ══ TAKEOFF ══ */
.takeoff-rooms{display:flex;flex-direction:column;gap:12px}
.takeoff-room{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.room-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;
  background:var(--bg3);cursor:pointer;font-family:var(--font-head);font-size:14px;font-weight:600}
.room-header:hover{background:var(--bg4)}
.room-body{padding:0}
.takeoff-summary{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);
  padding:24px;margin-top:16px}
.summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.summary-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px}
.summary-row:last-child{border-bottom:none}
.summary-row.total{font-weight:700;font-size:15px;color:var(--amber);border-top:2px solid var(--amber);
  padding-top:10px;margin-top:4px}

/* ══ SCOPE ══ */
.scope-item{display:flex;align-items:flex-start;gap:12px;padding:12px 16px;
  border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px;
  cursor:pointer;transition:all 0.15s ease}
.scope-item:hover{border-color:var(--border2);background:var(--bg3)}
.scope-check{font-size:18px;flex-shrink:0;margin-top:1px}
.scope-info{flex:1}
.scope-title{font-size:13px;font-weight:600;color:var(--text)}
.scope-desc{font-size:11px;color:var(--text2);margin-top:2px}

/* ══ CONTACTS ══ */
.contact-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.contact-card{padding:18px;border-radius:var(--radius);border:1px solid var(--border);
  background:var(--bg2);transition:all 0.15s ease;cursor:pointer}
.contact-card:hover{border-color:var(--amber-dim);box-shadow:var(--card-shadow)}
.contact-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0}

/* ══ BIDS ══ */
.bid-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
.bid-card{padding:20px;border-radius:12px;border:1px solid var(--border);
  background:var(--bg2);cursor:pointer;transition:all 0.2s cubic-bezier(.4,0,.2,1);
  box-shadow:0 2px 8px rgba(0,0,0,0.08);touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.bid-card:hover{border-color:var(--amber-dim);transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,0.12)}
.bid-card:active{transform:scale(0.98)}

/* ══ PROJECTS ══ */
.project-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px}
.project-card{padding:20px;border-radius:12px;border:1px solid var(--border);
  background:var(--bg2);cursor:pointer;transition:all 0.2s cubic-bezier(.4,0,.2,1);
  box-shadow:0 2px 8px rgba(0,0,0,0.08);touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.project-card:hover{border-color:var(--amber-dim);transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,0.12)}
.project-card:active{transform:scale(0.98)}
.progress-bar{height:6px;border-radius:3px;background:var(--bg4);overflow:hidden;margin-top:8px}
.progress-fill{height:100%;border-radius:3px;background:var(--amber);transition:width 0.4s ease}

/* ══ SEARCH ══ */
.search-wrap{position:relative}
.search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:13px;pointer-events:none}
.search-input{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);
  padding:6px 12px 6px 32px;color:var(--text);font-size:12px;font-family:var(--font-body);
  width:200px;transition:all 0.15s ease}
.search-input:focus{outline:none;border-color:var(--amber);width:260px}

/* ══ TAB BUTTONS ══ */
.tab-header{display:flex;gap:4px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:8px}
.tab-btn{padding:7px 14px;border:none;background:none;font-family:var(--font-body);font-size:12px;
  font-weight:500;color:var(--text3);cursor:pointer;border-radius:var(--radius-sm) var(--radius-sm) 0 0;
  transition:all 0.15s ease;touch-action:manipulation;-webkit-tap-highlight-color:transparent;
  min-height:36px;white-space:nowrap}
.tab-btn:hover{color:var(--text);background:var(--bg3)}
.tab-btn.active{color:var(--amber);border-bottom:2px solid var(--amber);background:var(--amber-dim)}
.tab-btn:active{transform:scale(0.96)}

/* ══ TAB CONTENT FADE ══ */
.tab-fade{animation:tabFadeIn 0.18s ease}
@keyframes tabFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}

/* ══ EMPTY STATE ══ */
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:60px 20px;text-align:center;gap:0}
.empty-icon{font-size:48px;margin-bottom:16px;opacity:0.25;line-height:1}
.empty-icon svg{width:48px;height:48px;opacity:0.3;color:var(--text3)}
.empty-title{font-family:var(--font-head);font-size:16px;font-weight:600;color:var(--text2);margin-bottom:6px}
.empty-text{font-size:13px;color:var(--text3);max-width:260px;line-height:1.5;margin-bottom:20px}
.empty-action{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:var(--amber);
  color:#000;border:none;border-radius:var(--radius-sm);font-size:13px;font-weight:600;
  cursor:pointer;transition:all 0.2s cubic-bezier(.4,0,.2,1)}
.empty-action:hover{background:var(--amber2);box-shadow:0 4px 16px var(--amber-glow);transform:translateY(-1px)}
.empty-action:active{transform:scale(0.97)}

/* ══ REPORT BARS (CSS-only charts) ══ */
.bar-chart{display:flex;flex-direction:column;gap:8px}
.bar-row{display:flex;align-items:center;gap:12px}
.bar-label{width:120px;font-size:12px;color:var(--text2);text-align:right;flex-shrink:0}
.bar-track{flex:1;height:22px;background:var(--bg4);border-radius:4px;overflow:hidden;position:relative}
.bar-fill{height:100%;border-radius:4px;transition:width 0.5s ease;display:flex;align-items:center;
  padding:0 8px;font-size:10px;font-weight:600;color:#fff;white-space:nowrap}
.bar-value{font-size:12px;font-family:var(--font-mono);color:var(--text2);width:60px;flex-shrink:0}

/* ══ UTILITIES ══ */
.flex{display:flex;align-items:center}.flex-between{display:flex;align-items:center;justify-content:space-between}
.flex-col{display:flex;flex-direction:column}.flex-wrap{flex-wrap:wrap}
.gap-4{gap:4px}.gap-6{gap:6px}.gap-8{gap:8px}.gap-12{gap:12px}.gap-16{gap:16px}.gap-20{gap:20px}
.mt-4{margin-top:4px}.mt-8{margin-top:8px}.mt-12{margin-top:12px}.mt-16{margin-top:16px}.mt-24{margin-top:24px}
.mb-4{margin-bottom:4px}.mb-8{margin-bottom:8px}.mb-12{margin-bottom:12px}.mb-16{margin-bottom:16px}
.ml-auto{margin-left:auto}
/* Typography utilities — consume tokens from tokens.css */
.text-sm{font-size:var(--text-sm)}.text-base{font-size:var(--text-base)}.text-lg{font-size:var(--text-lg)}.text-display{font-size:var(--text-display)}
/* Legacy aliases for backward compatibility with existing JSX */
.text-xs{font-size:var(--text-sm)}.text-md{font-size:var(--text-base)}.text-xl{font-size:var(--text-lg)}.text-2xl{font-size:var(--text-lg)}.text-3xl{font-size:var(--text-display)}
.text-muted{color:var(--text2)}.text-dim{color:var(--text3)}.text-amber{color:var(--amber)}
.text-green{color:var(--green)}.text-red{color:var(--red)}.text-blue{color:var(--blue)}
.font-head{font-family:var(--font-head)}.font-mono{font-family:var(--font-mono)}
.font-bold{font-weight:700}.font-semi{font-weight:600}
.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.w-full{width:100%}.text-right{text-align:right}.text-center{text-align:center}
.cursor-pointer{cursor:pointer}.border-b{border-bottom:1px solid var(--border)}
.opacity-50{opacity:0.5}.hidden{display:none}

/* ══ TOKEN UTILITIES ══ */
.touch-target{min-height:var(--touch-min);min-width:var(--touch-min)}
.shadow-sm{box-shadow:var(--shadow-sm)}.shadow-md{box-shadow:var(--shadow-md)}.shadow-lg{box-shadow:var(--shadow-lg)}
.transition-micro{transition:all var(--transition-micro)}.transition-state{transition:all var(--transition-state)}
.focus-visible:focus-visible{outline:none;box-shadow:var(--focus-ring)}

/* ══ FIELD COMPONENTS ══ */
@keyframes skeleton-shimmer{0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}}
.skeleton-shimmer{background:var(--bg3);border-radius:var(--radius-sm)}
@media(prefers-reduced-motion:no-preference){.skeleton-shimmer{background:linear-gradient(90deg,var(--bg3) 0%,var(--bg2) 50%,var(--bg3) 100%);background-size:400px 100%;animation:skeleton-shimmer 1.5s ease-in-out infinite}}
.animate-spin{animation:spin 1s linear infinite}
.field-card{padding:var(--space-4)}
@media(hover:hover){.field-card:hover{transform:translateY(-1px)}}
@media(hover:none){.field-card:hover{transform:none}}
@media(hover:hover){.field-btn:hover{filter:brightness(1.1)}}
.field-input,.field-select{min-height:var(--touch-min);padding:var(--space-3) var(--space-4)}
.field-input-error{border-color:var(--red);box-shadow:0 0 0 2px var(--red-dim)}
.field-input-error-msg{font-size:var(--text-sm);color:var(--red);margin-top:var(--space-1)}
.field-tab-bar{position:fixed;bottom:0;left:0;right:0;height:56px;padding-bottom:env(safe-area-inset-bottom);background:var(--glass-bg);backdrop-filter:blur(24px) saturate(1.8);-webkit-backdrop-filter:blur(24px) saturate(1.8);border-top:1px solid var(--glass-border);display:flex;align-items:stretch;z-index:100}
.field-tab-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-1);min-height:var(--touch-min);min-width:var(--touch-min);cursor:pointer;border:none;background:none;color:var(--text);opacity:0.55;font-size:var(--text-sm);font-weight:var(--weight-normal);font-family:var(--font-body);transition:all var(--transition-micro);touch-action:manipulation;-webkit-tap-highlight-color:transparent;position:relative}
.field-tab-item.active{color:var(--accent);font-weight:var(--weight-bold);transform:scale(0.95);opacity:1}
.field-tab-item:active{transform:scale(0.92)}
.field-tab-badge{position:absolute;top:6px;right:calc(50% - 14px);width:6px;height:6px;border-radius:50%;background:var(--red)}
.field-tab-sheet-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:150}
.field-tab-sheet{position:fixed;bottom:56px;left:0;right:0;background:var(--glass-bg);backdrop-filter:blur(24px) saturate(1.8);-webkit-backdrop-filter:blur(24px) saturate(1.8);border-top:1px solid var(--glass-border);border-radius:var(--radius) var(--radius) 0 0;z-index:151;padding:var(--space-2) 0;transform:translateY(calc(100% + 56px));transition:transform var(--transition-state);pointer-events:none}
.field-tab-sheet.open{transform:translateY(0);pointer-events:auto}
.field-tab-sheet-item{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);min-height:var(--touch-min);color:var(--text);font-size:var(--text-base);cursor:pointer;touch-action:manipulation;transition:background var(--transition-micro);background:none;border:none;width:100%;font-family:var(--font-body)}
@media(hover:hover){.field-tab-sheet-item:hover{background:var(--bg3)}}
.field-tab-sheet-item:active{background:var(--bg3)}
.field-tab-sheet-item.active{color:var(--amber);font-weight:var(--weight-bold)}
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:var(--space-6) var(--space-4);text-align:center;gap:var(--space-3)}
.empty-state-icon{color:var(--text3)}
.empty-state-heading{font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text);line-height:var(--leading-tight)}
.empty-state-body{font-size:var(--text-sm);font-weight:var(--weight-normal);color:var(--text2);line-height:var(--leading-normal)}
.async-error{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:var(--space-6) var(--space-4);text-align:center;gap:var(--space-3)}
.async-error-heading{font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--text)}
.async-error-body{font-size:var(--text-base);color:var(--text2);line-height:var(--leading-normal)}
.field-signature-canvas{width:100%;min-height:160px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);cursor:crosshair;touch-action:none}
/* DrawingsTab */
.drawings-tab{display:flex;flex-direction:column;gap:var(--space-3)}
.drawings-tab-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)}
.drawings-tab-title{font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--text)}
.drawings-tab-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-3)}
.drawings-tab-item{border-left:3px solid var(--border)}
.drawings-tab-badges{display:flex;gap:var(--space-1);align-items:center;flex-wrap:wrap;margin-bottom:var(--space-2)}
.drawings-tab-badge{font-size:var(--text-xs);font-weight:var(--weight-bold);padding:2px 8px;border-radius:var(--radius-sm);text-transform:uppercase;letter-spacing:0.5px}
.drawings-tab-item-row{display:flex;gap:var(--space-3);align-items:center}
.drawings-tab-item-icon{flex-shrink:0}
.drawings-tab-item-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:var(--space-1)}
.drawings-tab-item-name{font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.drawings-tab-item-meta{font-size:var(--text-sm);color:var(--text3)}
.drawings-tab-item-cached{font-size:var(--text-sm);color:var(--green)}
.drawings-tab-item-stale{font-size:var(--text-sm);color:var(--orange);font-weight:var(--weight-bold)}
.drawings-tab-item-actions{display:flex;flex-direction:column;gap:var(--space-1)}
.drawings-tab-offline{margin-top:var(--space-4)}
.drawings-tab-offline-title{font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--text2);margin-bottom:var(--space-2)}
.drawings-tab-offline-list{display:flex;flex-direction:column;gap:var(--space-2)}
.drawings-tab-offline-row{display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) var(--space-3);background:var(--glass-bg);border-radius:var(--radius-sm);border:1px solid var(--glass-border)}
.drawings-tab-footer{margin-top:var(--space-4);padding:var(--space-4);background:var(--glass-bg);border-radius:var(--radius);text-align:center}
.drawings-tab-footer-text{font-size:var(--text-sm);color:var(--text2)}
.drawings-tab-footer-sub{font-size:var(--text-xs);color:var(--text3);margin-top:var(--space-1)}
.drawings-tab-overlay{position:fixed;inset:0;z-index:200;background:var(--bg);display:flex;flex-direction:column}
.drawings-tab-overlay-header{display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--glass-border)}
.drawings-tab-overlay-title{font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.drawings-tab-overlay-close{background:none;border:none;color:var(--text2);cursor:pointer;padding:var(--space-1);min-height:var(--touch-min);min-width:var(--touch-min);display:flex;align-items:center;justify-content:center;border-radius:var(--radius-sm)}
.drawings-tab-overlay-body{flex:1;overflow:auto}
@media(min-width:600px){.field-signature-canvas{min-height:200px}}
.field-signature-actions{display:flex;gap:var(--space-2);margin-top:var(--space-2)}
.mr-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)}
.mr-card-title{font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--text)}
.mr-card-qty{font-size:var(--text-display);font-weight:var(--weight-bold);color:var(--amber)}
.mr-card-unit{font-size:var(--text-sm);font-weight:var(--weight-normal);color:var(--text3)}
.mr-card-meta{font-size:var(--text-sm);font-weight:var(--weight-normal);color:var(--text2)}
.mr-card-meta-muted{font-size:var(--text-sm);font-weight:var(--weight-normal);color:var(--text3)}
.mr-card-actions{display:flex;gap:var(--space-2);margin-top:var(--space-3)}

/* ══ PREMIUM CARDS ══ */
.premium-card-hero{background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid rgba(255,255,255,0.05);border-left:3px solid var(--accent);border-radius:var(--radius);padding:var(--space-4);box-shadow:var(--shadow-sm)}
.premium-card-info{background:var(--bg2);border:1px solid rgba(255,255,255,0.05);border-radius:var(--radius);padding:var(--space-3)}
.premium-card-alert{background:var(--amber-dim);border:1px solid rgba(255,127,33,0.12);border-radius:var(--radius-sm);padding:var(--space-3);position:relative}
.premium-card-alert::before{content:'';position:absolute;left:var(--space-3);top:50%;transform:translateY(-50%);width:6px;height:6px;border-radius:50%;background:var(--accent)}
.premium-card-alert--success{background:var(--green-dim, rgba(16,185,129,0.08));border-color:rgba(16,185,129,0.12)}
.premium-card-alert--success::before{background:var(--green)}
.premium-card-alert--error{background:var(--red-dim, rgba(239,68,68,0.08));border-color:rgba(239,68,68,0.12)}
.premium-card-alert--error::before{background:var(--red)}
.premium-card-alert--info{background:var(--blue-dim, rgba(59,130,246,0.08));border-color:rgba(59,130,246,0.12)}
.premium-card-alert--info::before{background:var(--blue)}
/* StatTile */
.stat-tile{cursor:pointer;text-align:center;min-width:80px;flex:1}
.stat-tile-value{font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--stat-color, var(--text));line-height:var(--leading-tight)}
.stat-tile-label{font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--text3);text-transform:uppercase;letter-spacing:var(--tracking-wider);line-height:var(--leading-tight);margin-top:var(--space-1)}
/* AlertCard */
.alert-card{cursor:pointer;padding-left:calc(var(--space-3) + 14px)}
.alert-card-content{display:flex;flex-direction:column;gap:var(--space-1)}
.alert-card-message{font-size:var(--text-base);color:var(--text);line-height:var(--leading-normal)}
.alert-card-time{font-size:var(--text-sm);color:var(--text3)}
/* ── DRIVER HOME ── */
.driver-home-hero{cursor:pointer}
.driver-home-greeting{font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--text3);text-transform:uppercase;letter-spacing:var(--tracking-wider)}
.driver-home-hero-value{font-size:var(--text-display);font-weight:900;color:var(--text);line-height:var(--leading-tight)}
.driver-home-hero-label{font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--text3);text-transform:uppercase}
.driver-home-stats{display:flex;gap:var(--space-2);margin-top:var(--space-5)}
.driver-home-alerts{margin-top:var(--space-5)}
.driver-home-section-label{font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--text3);text-transform:uppercase;letter-spacing:var(--tracking-wider);margin-bottom:var(--space-3)}
.driver-home-alerts-list{display:flex;flex-direction:column;gap:var(--space-2)}
/* ── FOREMAN DASHBOARD ── */
.foreman-dashboard-clock-hero{cursor:pointer}
.foreman-dashboard-clock-hero--active .premium-card-hero{border-left-color:var(--green)}
.foreman-dashboard-clock-status{font-size:var(--text-sm);font-weight:var(--weight-bold);text-transform:uppercase;letter-spacing:var(--tracking-wider)}
.foreman-dashboard-clock-value{font-size:var(--text-display);font-weight:900;color:var(--text);line-height:var(--leading-tight)}
.foreman-dashboard-clock-hint{font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--text3);text-transform:uppercase}
.foreman-dashboard-stats{display:flex;gap:var(--space-2);margin-top:var(--space-5)}
.foreman-dashboard-alerts{margin-top:var(--space-5)}
.foreman-dashboard-section-label{font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--text3);text-transform:uppercase;letter-spacing:var(--tracking-wider);margin-bottom:var(--space-3)}
.foreman-dashboard-alerts-list{display:flex;flex-direction:column;gap:var(--space-2)}
.foreman-dashboard-view-all{background:none;border:none;color:var(--accent);font-size:var(--text-base);font-weight:var(--weight-bold);cursor:pointer;padding:var(--space-2) 0;min-height:var(--touch-min)}
/* ── FOREMAN TEAM ── */
.foreman-team-section{margin-top:var(--space-8)}
.foreman-team-section-label{font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--text3);text-transform:uppercase;letter-spacing:var(--tracking-wider);margin-bottom:var(--space-3);display:flex;align-items:center;gap:var(--space-2)}
.foreman-team-count{background:var(--accent);color:var(--bg);font-size:var(--text-sm);font-weight:var(--weight-bold);border-radius:10px;padding:1px 8px;min-width:20px;text-align:center}
.foreman-team-requests-list{display:flex;flex-direction:column;gap:var(--space-3)}
.foreman-team-request-card{display:flex;flex-direction:column;gap:var(--space-2)}
.foreman-team-request-header{display:flex;align-items:center;justify-content:space-between}
.foreman-team-request-name{font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text)}
.foreman-team-request-type{font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--accent);text-transform:uppercase;letter-spacing:var(--tracking-wider)}
.foreman-team-request-type--timeoff{color:var(--yellow)}
.foreman-team-request-details{font-size:var(--text-base);color:var(--text2);display:flex;gap:var(--space-2)}
.foreman-team-request-actions{display:flex;gap:var(--space-2);margin-top:var(--space-2)}
.foreman-team-request-actions .field-button{flex:1}
.foreman-team-cert-filters{display:flex;gap:var(--space-2);overflow-x:auto;margin-bottom:var(--space-3);-ms-overflow-style:none;scrollbar-width:none}
.foreman-team-cert-filters::-webkit-scrollbar{display:none}
.foreman-team-cert-chip{background:var(--bg3);border:1px solid var(--border);color:var(--text2);font-size:var(--text-sm);font-weight:var(--weight-bold);padding:var(--space-2) var(--space-3);border-radius:var(--radius-sm);cursor:pointer;white-space:nowrap;min-height:var(--touch-min)}
.foreman-team-cert-chip--active{background:rgba(255,127,33,0.15);border-color:var(--accent);color:var(--accent)}
.foreman-team-cert-list{display:flex;flex-direction:column;gap:var(--space-3)}
.foreman-team-cert-member{display:flex;flex-direction:column;gap:var(--space-2)}
.foreman-team-cert-member-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-1)}
.foreman-team-cert-member-name{font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text)}
.foreman-team-cert-summary{display:flex;gap:var(--space-2);flex-wrap:wrap}
.foreman-team-cert-count{font-size:var(--text-sm);font-weight:var(--weight-bold)}
.foreman-team-cert-count--active{color:var(--green)}
.foreman-team-cert-count--expiring{color:var(--yellow)}
.foreman-team-cert-count--expired{color:var(--red)}
/* ── FOREMAN APPROVAL SHEET ── */
.foreman-approval-sheet{position:fixed;bottom:0;left:0;right:0;max-height:50vh;background:var(--bg3);border-top:1px solid var(--border);border-radius:var(--radius) var(--radius) 0 0;padding:var(--space-4);z-index:1001;transform:translateY(0);transition:transform var(--transition-state)}
.foreman-approval-sheet-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)}
.foreman-approval-sheet-title{font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--text)}
.foreman-approval-sheet-close{background:none;border:none;color:var(--text2);font-size:var(--text-base);cursor:pointer;min-height:var(--touch-min);padding:var(--space-2)}
.foreman-approval-sheet-body{display:flex;flex-direction:column;gap:var(--space-4)}
.foreman-approval-sheet-summary{padding:var(--space-3);background:var(--bg2);border-radius:var(--radius-sm)}
.foreman-approval-sheet-confirm{width:100%;min-height:var(--touch-min)}
/* ShiftCard */
.shift-card--active{border-left:3px solid var(--accent)}
.shift-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)}
.shift-card-time{display:flex;align-items:center;gap:var(--space-1);font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text)}
.shift-card-badges{display:flex;align-items:center;gap:var(--space-2)}
.shift-card-overtime{font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--accent);text-transform:uppercase;letter-spacing:var(--tracking-wider)}
.shift-card-body{display:flex;flex-direction:column;gap:var(--space-1)}
.shift-card-project{font-size:var(--text-base);color:var(--text2)}
.shift-card-location{display:flex;align-items:center;gap:var(--space-1);font-size:var(--text-sm);color:var(--text3)}
.shift-card-action{margin-top:var(--space-3)}
/* CredentialCard */
.credential-card{cursor:pointer}
.credential-card-header{display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)}
.credential-card-icon{color:var(--accent);flex-shrink:0}
.credential-card-title{font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text);flex:1}
.credential-card-body{display:flex;flex-direction:column;gap:var(--space-1)}
.credential-card-org{font-size:var(--text-sm);color:var(--text2)}
.credential-card-dates{display:flex;gap:var(--space-4);font-size:var(--text-sm);color:var(--text3)}

/* ══ PHASE TRACKER ══ */
.phase-timeline{display:flex;align-items:flex-start;overflow-x:auto;padding:6px 2px 4px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.phase-timeline::-webkit-scrollbar{display:none}
.phase-node-wrap{display:flex;flex-direction:column;align-items:center;min-width:80px;flex-shrink:0}
.phase-dot{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  border:none;cursor:pointer;flex-shrink:0;transition:all 0.2s ease;position:relative;z-index:1}
.phase-dot-done{background:var(--green);color:#fff}
.phase-dot-done:hover{filter:brightness(1.12);transform:scale(1.08)}
.phase-dot-active{background:var(--amber);color:#000;box-shadow:0 0 14px var(--amber-glow)}
.phase-dot-active:hover{filter:brightness(1.08);transform:scale(1.08)}
.phase-dot-pending{background:var(--bg3);color:var(--text3);border:2px dashed var(--border2)}
.phase-dot-pending:hover{border-color:var(--text2);color:var(--text2);transform:scale(1.06)}
.phase-dot-open{box-shadow:0 0 0 3px var(--amber-dim) !important;transform:scale(1.12) !important}
.phase-connector{height:2px;min-width:16px;flex:1;align-self:flex-start;margin-top:14px;max-width:52px;flex-shrink:1}
.phase-connector-done{background:var(--green)}
.phase-connector-active{background:linear-gradient(90deg,var(--green),var(--amber))}
.phase-connector-pending{background:var(--border)}
.phase-node-label{font-size:10px;color:var(--text3);text-align:center;margin-top:6px;line-height:1.3;
  max-width:80px;cursor:pointer;transition:color 0.15s;padding:0 2px;word-break:break-word}
.phase-node-label:hover{color:var(--text2)}
.phase-label-done{color:var(--green)}
.phase-label-active{color:var(--amber);font-weight:600}
.phase-node-date{font-size:9px;color:var(--text3);text-align:center;font-family:var(--font-mono);margin-top:2px}
.phase-detail-panel{background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);
  padding:14px;margin-top:12px;animation:fadeIn 0.15s ease}

/* ══ MATERIAL LIBRARY ══ */
.mat-cat-pill{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap}
.clickable-row{cursor:pointer;transition:background 0.15s}.clickable-row:hover{background:var(--bg4)}
.btn-icon{background:none;border:none;color:var(--text2);cursor:pointer;padding:2px 4px;font-size:11px;border-radius:3px}
.btn-icon:hover{background:var(--bg4);color:var(--text)}.btn-icon:disabled{opacity:0.3;cursor:default}

/* ══ ANIMATIONS ══ */
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
@media print{.header,.nav,.toast-wrap,.modal-overlay{display:none!important}
  .main-content{padding:0!important;overflow:visible!important}
  .card,.kpi-card{break-inside:avoid}}

/* ══ ANIME THEME — SAKURA PETALS ══ */
.sakura-container{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.sakura-petal{position:absolute;top:-40px;opacity:0;pointer-events:none;will-change:transform,opacity}
.sakura-petal svg{filter:drop-shadow(0 0 4px rgba(255,183,197,0.5))}
@keyframes sakuraFall{
  0%{opacity:0;transform:translateY(-20px) translateX(0) rotate(0deg) scale(0.8)}
  8%{opacity:0.9}
  50%{transform:translateY(45vh) translateX(var(--drift)) rotate(180deg) scale(1)}
  100%{opacity:0;transform:translateY(105vh) translateX(calc(var(--drift) * 1.5)) rotate(360deg) scale(0.6)}
}
.sakura-petal{animation:sakuraFall var(--dur) var(--delay) linear infinite}

/* ══ ANIME THEME — TOKYO SKYLINE ══ */
.tokyo-skyline{position:fixed;bottom:0;left:0;right:0;height:180px;pointer-events:none;z-index:0;opacity:0.08}
.tokyo-skyline svg{width:100%;height:100%;display:block}

/* ══ ANIME THEME — NEON GLOW ACCENTS ══ */
.anime-glow .header{box-shadow:0 1px 0 var(--glass-border),0 0 30px rgba(240,36,160,0.08)}
.anime-glow .kpi-value{text-shadow:0 0 30px rgba(240,36,160,0.35)}
.anime-glow .logo{text-shadow:0 0 24px rgba(240,36,160,0.4)}
.anime-glow .nav-item.active{box-shadow:0 0 16px rgba(240,36,160,0.25)}
.anime-glow .btn-primary{box-shadow:0 2px 12px rgba(240,36,160,0.3)}
.anime-glow .btn-primary:hover{box-shadow:0 4px 24px rgba(240,36,160,0.4)}
.anime-glow .badge-amber{text-shadow:0 0 8px rgba(240,36,160,0.3)}
.anime-glow .card:hover{box-shadow:0 0 20px rgba(240,36,160,0.08)}
.anime-glow .kpi-card:hover{box-shadow:0 0 24px rgba(240,36,160,0.15)}

/* ══ CYBERPUNK THEME — SCAN LINES ══ */
.cyber-scanlines{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,240,255,0.015) 2px,rgba(0,240,255,0.015) 4px);
  animation:cyberScan 8s linear infinite}
@keyframes cyberScan{0%{background-position:0 0}100%{background-position:0 100px}}

/* ══ CYBERPUNK THEME — NEON RAIN ══ */
.cyber-rain{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.cyber-drop{position:absolute;top:-60px;width:1px;opacity:0;will-change:transform,opacity;
  background:linear-gradient(180deg,rgba(0,240,255,0),rgba(0,240,255,0.6),rgba(0,240,255,0));
  animation:cyberRainFall var(--dur) var(--delay) linear infinite}
@keyframes cyberRainFall{0%{opacity:0;transform:translateY(-20px)}5%{opacity:0.7}100%{opacity:0;transform:translateY(110vh)}}

/* ══ CYBERPUNK THEME — NEON GLOW ACCENTS ══ */
.cyber-glow .header{box-shadow:0 1px 0 var(--glass-border),0 0 30px rgba(0,240,255,0.06)}
.cyber-glow .kpi-value{text-shadow:0 0 30px rgba(0,240,255,0.5)}
.cyber-glow .logo{text-shadow:0 0 24px rgba(0,240,255,0.5)}
.cyber-glow .nav-item.active{box-shadow:0 0 16px rgba(0,240,255,0.2)}
.cyber-glow .btn-primary{box-shadow:0 2px 12px rgba(0,240,255,0.25);text-transform:uppercase;letter-spacing:1px}
.cyber-glow .btn-primary:hover{box-shadow:0 4px 24px rgba(0,240,255,0.35)}
.cyber-glow .badge-amber{text-shadow:0 0 8px rgba(0,240,255,0.3)}
.cyber-glow .card:hover{box-shadow:0 0 20px rgba(0,240,255,0.06)}
.cyber-glow .kpi-card:hover{box-shadow:0 0 24px rgba(0,240,255,0.12)}
.cyber-glow .card{border-color:rgba(0,240,255,0.08)}
.cyber-glow .section-title{text-transform:uppercase;letter-spacing:1.5px}

/* ══ MODAL PULL HANDLE ══ */
.modal-handle{width:36px;height:4px;background:var(--border2);border-radius:2px;
  margin:0 auto 14px;display:none;opacity:0.5}

/* ══ BOTTOM NAV (mobile only) ══ */
.bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;height:60px;
  background:var(--glass-bg);backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);
  border-top:1px solid var(--glass-border);z-index:200;
  padding-bottom:env(safe-area-inset-bottom);
  height:calc(60px + env(safe-area-inset-bottom))}
.bottom-nav-inner{display:flex;height:60px;align-items:stretch}
.bottom-nav-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:3px;border:none;background:none;color:var(--text3);cursor:pointer;
  font-family:var(--font-body);font-size:10px;font-weight:500;letter-spacing:0.3px;
  transition:all 0.15s ease;padding:6px 4px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;
  -webkit-user-select:none;user-select:none;min-width:44px;position:relative}
.bottom-nav-item:active{transform:scale(0.92);background:var(--amber-dim)}
.bottom-nav-item.active{color:var(--amber)}
.bottom-nav-item svg{width:20px;height:20px;stroke-width:1.8}
.bottom-nav-dot{position:absolute;top:8px;right:calc(50% - 14px);width:6px;height:6px;
  border-radius:50%;background:var(--red)}

/* ══ HAMBURGER BUTTON ══ */
.hamburger{display:none;flex-direction:column;gap:4px;background:none;border:none;cursor:pointer;
  padding:8px;margin-left:auto;z-index:110}
.hamburger-line{display:block;width:20px;height:2px;background:var(--text2);border-radius:2px;
  transition:all 0.25s cubic-bezier(.4,0,.2,1)}
.hamburger-line.open:nth-child(1){transform:translateY(6px) rotate(45deg);background:var(--amber)}
.hamburger-line.open:nth-child(2){opacity:0;transform:scaleX(0)}
.hamburger-line.open:nth-child(3){transform:translateY(-6px) rotate(-45deg);background:var(--amber)}

/* ══ MOBILE NAV DRAWER ══ */
.mobile-nav-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);z-index:500;animation:fadeIn 0.15s ease;
  padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom) 0}
.mobile-nav{position:fixed;top:0;right:0;width:min(280px,80vw);height:100%;height:100dvh;
  background:var(--glass-bg);backdrop-filter:blur(24px) saturate(1.8);-webkit-backdrop-filter:blur(24px) saturate(1.8);
  border-left:1px solid var(--glass-border);padding:0;padding-top:env(safe-area-inset-top);overflow-y:auto;-webkit-overflow-scrolling:touch;animation:slideRight 0.25s cubic-bezier(.4,0,.2,1);
  box-shadow:-4px 0 30px rgba(0,0,0,0.3)}
.mobile-nav-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;
  border-bottom:1px solid var(--border)}
.mobile-nav-section{padding:8px 12px}
.mobile-nav-divider{height:1px;background:var(--border);margin:4px 16px}
.mobile-nav-item{display:block;width:100%;text-align:left;padding:12px 16px;border:none;background:none;
  font-family:var(--font-body);font-size:14px;font-weight:500;color:var(--text2);cursor:pointer;
  border-radius:var(--radius-sm);transition:all 0.15s ease}
.mobile-nav-item:hover{color:var(--text);background:var(--amber-dim)}
.mobile-nav-item.active{color:var(--amber);background:var(--amber-dim);font-weight:600}
@keyframes slideRight{from{transform:translateX(100%)}to{transform:translateX(0)}}

/* ══ RESPONSIVE — TABLET (768-1024px) ══ */
@media(max-width:1024px){
  .header{padding:0 16px;height:50px}
  .main-content{padding:20px 20px 32px}
  .kpi-grid{grid-template-columns:repeat(2,1fr);gap:12px}
  .bid-grid{grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
  .project-grid{grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
  .contact-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
  .form-grid{gap:12px}
  .section-title{font-size:18px}
  .modal{width:min(580px,94vw);padding:20px}
  .modal-lg{width:min(700px,94vw)}
  .gantt-header-label,.gantt-label{width:160px}
  .search-input{width:160px}.search-input:focus{width:200px}
}

/* ══ RESPONSIVE — PHONE (<768px) ══ */
@media(max-width:767px){
  .hamburger{display:flex}
  .nav{display:none}
  .mobile-nav-overlay{display:block}
  .header{padding:0 14px;height:48px;gap:10px}
  .logo{font-size:15px}.logo-sub{font-size:8px}
  .main-content{padding:14px 14px calc(72px + env(safe-area-inset-bottom))}
  .bottom-nav{display:block}
  .modal-handle{display:block}
  .form-input,.form-select,.form-textarea{font-size:16px}
  .search-input{font-size:16px}

  .kpi-grid{grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
  .kpi-card{padding:14px 16px}
  .kpi-value{font-size:22px}
  .kpi-label{font-size:10px;letter-spacing:0.5px}
  .kpi-sub{font-size:11px}

  .section-header{margin-bottom:12px;gap:8px}
  .section-title{font-size:16px}
  .section-sub{font-size:11px}

  .bid-grid{grid-template-columns:1fr;gap:10px}
  .bid-card{padding:16px}
  .project-grid{grid-template-columns:1fr;gap:10px}
  .project-card{padding:16px}
  .contact-grid{grid-template-columns:1fr;gap:10px}
  .contact-card{padding:14px}

  .card{padding:16px}
  .card-title{font-size:14px}

  .form-grid{grid-template-columns:1fr;gap:10px}

  .modal-overlay{align-items:flex-end}
  .modal,.modal-lg{width:100vw;max-height:92vh;max-height:92dvh;border-radius:16px 16px 0 0;
    padding:20px 16px;padding-bottom:calc(20px + env(safe-area-inset-bottom));animation:slideUp 0.25s cubic-bezier(.4,0,.2,1)}
  .modal::before,.modal-lg::before{content:'';display:block;width:36px;height:4px;
    background:var(--border2);border-radius:2px;margin:0 auto 14px;opacity:0.5}
  .modal-header{margin-bottom:16px;padding-bottom:12px}
  .modal-title{font-size:16px}
  .modal-actions{margin-top:16px;padding-top:12px}

  .data-table{font-size:12px}
  .data-table th{padding:8px 10px;font-size:9px}
  .data-table td{padding:8px 10px}
  .table-wrap{margin:0 -14px;border-radius:0;border-left:none;border-right:none}

  .search-wrap{width:100%}.search-input{width:100%}.search-input:focus{width:100%}

  .flex.gap-16.mt-24{flex-direction:column}
  .btn-group,.flex.gap-8{flex-wrap:wrap}
  .btn{padding:8px 14px;font-size:12px}
  .btn-sm{padding:4px 8px;font-size:10px}

  .tab-header{overflow-x:auto;flex-wrap:nowrap;padding-bottom:6px;-webkit-overflow-scrolling:touch}
  .tab-btn{flex-shrink:0}

  .gantt-wrap{margin:0 -14px;border-radius:0;border-left:none;border-right:none}
  .gantt-header-label,.gantt-label{width:120px;font-size:11px}

  .scope-item{padding:10px 12px}
  .scope-check{font-size:16px}
  .scope-title{font-size:12px}
  .scope-desc{font-size:10px}

  .takeoff-rooms{gap:8px}
  .room-header{padding:10px 12px;font-size:13px}
  .summary-grid{grid-template-columns:1fr}

  .toast-wrap{top:8px;right:8px;left:8px}
  .toast{font-size:12px;padding:8px 14px}

  .bar-label{width:80px;font-size:11px}
  .bar-value{width:50px;font-size:11px}

  .empty-state{padding:40px 16px}
  .empty-icon{font-size:36px}
  .empty-title{font-size:15px}
  .empty-text{font-size:12px}

  .sakura-container{z-index:0}
  .tokyo-skyline{height:120px}

  /* Reduce backdrop-filter on mobile for Safari performance */
  .header,.mobile-nav,.kpi-card,.card-glass,.nav-dropdown{
    backdrop-filter:blur(12px) saturate(1.4);-webkit-backdrop-filter:blur(12px) saturate(1.4)}
  .modal{backdrop-filter:blur(16px) saturate(1.4);-webkit-backdrop-filter:blur(16px) saturate(1.4)}
}

/* ══ RESPONSIVE — SMALL PHONE (<400px) ══ */
@media(max-width:399px){
  .kpi-grid{grid-template-columns:1fr}
  .kpi-value{font-size:24px}
  .main-content{padding:10px 10px 24px}
  .header{padding:0 10px}
  .logo{font-size:14px}
  .modal{padding:16px 12px}
}

/* ══ PHONE LANDSCAPE ══ */
@media(max-width:900px) and (max-height:500px) and (orientation:landscape){
  .header{height:40px;padding:0 14px;gap:8px}
  .logo{font-size:14px}.logo-sub{display:none}
  .main-content{padding:8px 16px 16px}
  .kpi-grid{grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
  .kpi-card{padding:10px 12px}
  .kpi-value{font-size:18px}
  .kpi-label{font-size:9px;margin-bottom:2px}
  .kpi-sub{font-size:10px;margin-top:2px}
  .section-title{font-size:15px}
  .section-header{margin-bottom:8px}
  .bid-grid{grid-template-columns:repeat(2,1fr);gap:8px}
  .project-grid{grid-template-columns:repeat(2,1fr);gap:8px}
  .contact-grid{grid-template-columns:repeat(2,1fr);gap:8px}
  .card{padding:12px}
  .card-title{font-size:13px}
  .form-grid{grid-template-columns:1fr 1fr;gap:8px}
  .modal-overlay{align-items:center}
  .modal,.modal-lg{max-height:90vh;border-radius:var(--radius);width:min(580px,94vw);padding:16px}
  .modal-header{margin-bottom:12px;padding-bottom:8px}
  .modal-actions{margin-top:12px;padding-top:8px}
  .tab-header{margin-bottom:12px;padding-bottom:4px}
  .tab-btn{padding:4px 10px;font-size:11px}
  .empty-state{padding:20px 16px}
  .empty-icon{font-size:28px}
  .summary-grid{grid-template-columns:1fr 1fr}
  .toast-wrap{top:6px;right:6px}
  .toast{font-size:11px;padding:6px 12px}
  .gantt-header-label,.gantt-label{width:110px;font-size:10px}
  .tokyo-skyline{height:80px}
}

/* ══ TABLET LANDSCAPE (768-1024px wide, landscape) ══ */
@media(min-width:768px) and (max-width:1024px) and (orientation:landscape){
  .hamburger{display:none}
  .nav{display:flex}
  .mobile-nav-overlay{display:none!important}
  .header{height:48px;padding:0 20px}
  .main-content{padding:16px 24px 28px}
  .kpi-grid{grid-template-columns:repeat(4,1fr);gap:12px}
  .bid-grid{grid-template-columns:repeat(2,1fr)}
  .project-grid{grid-template-columns:repeat(2,1fr)}
  .contact-grid{grid-template-columns:repeat(3,1fr)}
  .form-grid{grid-template-columns:1fr 1fr}
  .modal{width:min(560px,90vw)}
  .modal-lg{width:min(720px,92vw)}
  .section-title{font-size:18px}
  .search-input{width:180px}.search-input:focus{width:220px}
}

/* ══ TABLET PORTRAIT (768-1024px wide, portrait) ══ */
@media(min-width:768px) and (max-width:1024px) and (orientation:portrait){
  .hamburger{display:flex}
  .nav{display:none}
  .mobile-nav-overlay{display:block}
  .header{height:50px;padding:0 16px}
  .main-content{padding:18px 18px 32px}
  .kpi-grid{grid-template-columns:repeat(2,1fr);gap:12px}
  .bid-grid{grid-template-columns:repeat(2,1fr);gap:12px}
  .project-grid{grid-template-columns:repeat(2,1fr);gap:12px}
  .contact-grid{grid-template-columns:repeat(2,1fr);gap:12px}
  .form-grid{grid-template-columns:1fr 1fr;gap:12px}
  .modal{width:min(520px,92vw);padding:20px}
  .modal-lg{width:min(660px,92vw)}
  .section-title{font-size:17px}
  .search-input{width:180px}.search-input:focus{width:240px}
}

.network-banner{display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-4);font-size:var(--text-sm);font-weight:var(--weight-semi);position:sticky;z-index:98}
.network-banner--offline{background:var(--text3);color:var(--bg2)}
.network-banner--reconnecting{background:var(--green-dim);color:var(--green)}
.offline-pulse-dot{width:8px;height:8px;border-radius:50%;background:var(--amber);animation:pulse-dot 1.5s ease-in-out infinite;flex-shrink:0}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)}}
.offline-status-chip{display:flex;align-items:center;gap:6px;padding:6px 12px;margin:0 0 8px;border-radius:var(--radius);background:var(--bg3);border:1px solid var(--border);font-size:var(--text-sm);color:var(--text2)}
.offline-last-sync{margin-left:auto;font-size:var(--text-xs);color:var(--text3)}

/* ══ EMPLOYEE VIEW ══ */
.emp-lang-switch{display:inline-flex;border-radius:var(--radius);overflow:hidden;border:1px solid var(--glass-border);background:var(--bg2)}
.emp-lang-option{padding:var(--space-1) var(--space-2);font-size:var(--text-xs);font-weight:var(--weight-bold);letter-spacing:0.05em;border:none;background:transparent;color:var(--text3);cursor:pointer;transition:background var(--transition-micro),color var(--transition-micro);min-width:32px;text-align:center}
.emp-lang-option:hover{background:var(--bg3)}
.emp-lang-active{background:var(--amber);color:#000}
.employee-app{display:flex;flex-direction:column;height:100vh;height:100dvh;overflow:hidden;background:var(--bg)}
.employee-header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;padding-top:calc(12px + env(safe-area-inset-top));
  background:var(--glass-bg);backdrop-filter:blur(24px) saturate(1.8);-webkit-backdrop-filter:blur(24px) saturate(1.8);
  border-bottom:1px solid var(--glass-border)}
.employee-logo{font-family:var(--font-head);font-size:16px;font-weight:700;color:var(--amber);
  text-shadow:0 0 20px var(--amber-glow)}
.employee-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:20px;padding-bottom:calc(20px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center}

/* ── PIN PAD ── */
.pin-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:24px}
.pin-title{font-family:var(--font-head);font-size:22px;font-weight:700;color:var(--text)}
.pin-dots{display:flex;gap:14px}
.pin-dot{width:16px;height:16px;border-radius:50%;border:2px solid var(--border2);transition:all 0.25s cubic-bezier(.4,0,.2,1)}
.pin-dot.filled{background:var(--amber);border-color:var(--amber);box-shadow:0 0 14px var(--amber-glow)}
.pin-grid{display:grid;grid-template-columns:repeat(3,76px);gap:10px}
.pin-key{width:76px;height:58px;border-radius:var(--radius);border:1px solid var(--border);
  background:var(--glass-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:var(--text);
  font-family:var(--font-head);font-size:24px;font-weight:600;cursor:pointer;
  transition:all 0.15s cubic-bezier(.4,0,.2,1)}
.pin-key:hover{border-color:var(--amber);background:var(--amber-dim)}
.pin-key:active{transform:scale(0.94);box-shadow:0 0 16px var(--amber-glow)}

/* ── CLOCK DISPLAY ── */
.clock-card{width:100%;max-width:420px;padding:28px 24px;border-radius:var(--radius);
  background:var(--glass-bg);backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);
  border:1px solid var(--glass-border);text-align:center}
.clock-status{font-family:var(--font-head);font-size:13px;font-weight:600;
  text-transform:uppercase;letter-spacing:1.2px;margin-bottom:6px}
.clock-status.in{color:var(--green)}
.clock-status.out{color:var(--text3)}
.clock-time{font-family:var(--font-mono);font-size:40px;font-weight:700;color:var(--amber);
  text-shadow:0 0 30px var(--amber-glow);margin-bottom:6px;line-height:1}
.clock-project{font-size:13px;color:var(--text2);margin-bottom:16px}
.clock-btn{width:100%;padding:16px;border-radius:var(--radius);border:none;
  font-family:var(--font-head);font-size:18px;font-weight:700;cursor:pointer;
  transition:all 0.2s cubic-bezier(.4,0,.2,1);text-transform:uppercase;letter-spacing:1px}
.clock-btn.clock-in{background:var(--green);color:#000;box-shadow:0 4px 20px var(--green-dim)}
.clock-btn.clock-in:hover{box-shadow:0 6px 28px rgba(16,185,129,0.35);transform:translateY(-2px)}
.clock-btn.clock-in:active{transform:translateY(0)}
.clock-btn.clock-out{background:var(--red);color:#fff;box-shadow:0 4px 20px var(--red-dim)}
.clock-btn.clock-out:hover{box-shadow:0 6px 28px rgba(239,68,68,0.35);transform:translateY(-2px)}
.clock-btn.clock-out:active{transform:translateY(0)}

/* ── GEOFENCE INDICATOR ── */
.geo-status{display:flex;align-items:center;gap:8px;padding:10px 14px;
  border-radius:var(--radius-sm);margin-bottom:14px;font-size:12px;font-weight:500;text-align:left}
.geo-status.inside{background:var(--green-dim);color:var(--green);border:1px solid rgba(16,185,129,0.15)}
.geo-status.outside{background:var(--red-dim);color:var(--red);border:1px solid rgba(239,68,68,0.15)}
.geo-status.override{background:var(--amber-dim);color:var(--amber);border:1px solid rgba(224,148,34,0.15)}
.geo-dot{width:8px;height:8px;border-radius:50%;background:currentColor;flex-shrink:0;
  animation:geoPulse 2s ease-in-out infinite}
@keyframes geoPulse{0%,100%{opacity:1}50%{opacity:0.4}}

/* ── EMPLOYEE SUB-TABS ── */
.emp-tabs{display:flex;gap:4px;width:100%;max-width:420px;margin-bottom:16px;
  border-bottom:1px solid var(--border);padding-bottom:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;
  position:sticky;top:0;z-index:10;background:var(--bg);padding-top:4px}
.emp-tab{flex:0 0 auto;padding:8px 12px;border:none;background:none;font-family:var(--font-body);
  font-size:12px;font-weight:500;color:var(--text3);cursor:pointer;white-space:nowrap;
  border-radius:var(--radius-sm) var(--radius-sm) 0 0;transition:all 0.15s ease}
.emp-tab:hover{color:var(--text);background:var(--bg3)}
.emp-tab.active{color:var(--amber);border-bottom:2px solid var(--amber);background:var(--amber-dim)}
.emp-content{width:100%;max-width:420px}

/* ── CLOCK TAB LAYOUT ── */
.emp-clock-card-left{text-align:left}
.emp-project-progress-bar{margin-top:var(--space-2)}
.emp-emergency-box{margin-top:var(--space-3);padding:10px 12px;background:var(--red-dim);border-radius:var(--radius-sm)}
.emp-emergency-link{text-decoration:none}
.emp-info-section{margin-top:var(--space-3)}
.emp-info-card{text-align:left;margin-bottom:var(--space-2)}
.emp-list-col{display:flex;flex-direction:column;gap:6px;margin-top:var(--space-2)}
.emp-list-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)}
.emp-search-btn{width:100%;opacity:0.7}
.emp-search-results{max-height:180px;overflow-y:auto;border-radius:var(--radius-sm);background:var(--glass-bg)}
.emp-search-item{width:100%;display:flex;justify-content:space-between;padding:10px 12px;border:none;background:none;cursor:pointer;text-align:left;border-bottom:1px solid var(--border);color:var(--text)}
.emp-search-item:hover{background:var(--bg3)}
.emp-accent-label{text-align:center;margin-bottom:var(--space-3);color:var(--accent);display:flex;align-items:center;justify-content:center;gap:4px}
.emp-override-card{border-color:var(--amber);margin-top:var(--space-3)}
.emp-override-actions{justify-content:flex-end}
.emp-clock-map-card{margin-top:var(--space-3);padding:0;overflow:hidden;position:relative}
.emp-clock-map{width:100%;border-radius:var(--radius);transition:height 0.3s}

/* ── MAP TILE SWITCHER ── */
.emp-map-tile-bar{position:absolute;top:var(--space-2);right:var(--space-2);z-index:1000;display:flex;gap:2px;background:rgba(0,0,0,0.7);border-radius:var(--radius-sm);padding:2px}
.emp-map-tile-btn{padding:var(--space-2) var(--space-3);min-height:var(--touch-min);font-size:var(--text-xs);border:none;border-radius:4px;cursor:pointer;background:transparent;color:#fff;font-weight:500}
.emp-map-tile-btn.active{background:var(--amber);color:#000}
.emp-perimeter-bar{position:absolute;bottom:var(--space-2);left:var(--space-2);right:var(--space-2);z-index:1000;display:flex;gap:6px;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3)}
.emp-perimeter-label{font-size:var(--text-xs);color:var(--amber);font-weight:600}
.emp-perimeter-btn{padding:4px 10px;font-size:var(--text-xs);border:1px solid var(--border);border-radius:4px;cursor:pointer;background:transparent;color:var(--text-muted)}
.emp-perimeter-btn--save{border:none;background:var(--green);color:#fff;font-weight:600}
.emp-perimeter-btn--save.disabled{background:var(--bg3);cursor:not-allowed}
.emp-perimeter-btn--cancel{border:none;background:var(--red);color:#fff}

/* ── PROJECT LIST ── */
.emp-project-list-header{text-transform:uppercase;letter-spacing:0.6px}
.emp-project-row{display:flex;align-items:center;gap:var(--space-2);font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)}
.emp-project-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.emp-project-name-col{flex:1;min-width:0}
.emp-project-name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
.emp-project-meta{font-size:10px;color:var(--text-muted);margin-top:2px}
.emp-project-actions{display:flex;gap:4px;flex-shrink:0}
.emp-project-action-btn{padding:3px 8px;font-size:10px;border-radius:4px;cursor:pointer;font-weight:600}
.emp-project-action-btn--delete{border:1px solid var(--red);background:transparent;color:var(--red)}
.emp-project-action-btn--draw{border:none}

/* ── SCHEDULE TAB ── */
.emp-schedule-card{padding:0;overflow:hidden}
.emp-schedule-empty{padding:30px 20px}
.emp-section-title{font-size:16px}

/* ── TIME LOG ── */
.emp-log-list{display:flex;flex-direction:column;gap:var(--space-2)}
.emp-log-entry{padding:14px}

/* ── JSA TAB ── */
.emp-jsa-back-btn{margin-bottom:var(--space-3)}
.emp-jsa-badges{display:flex;gap:6px;align-items:center;margin-bottom:var(--space-2);flex-wrap:wrap}
.emp-jsa-title{font-size:16px;font-weight:700;margin-bottom:4px}
.emp-jsa-meta{font-size:12px;color:var(--text3);margin-bottom:var(--space-3)}
.emp-jsa-sign-section{margin-bottom:var(--space-4)}
.emp-jsa-sign-banner{background:var(--amber-dim);border:1px solid var(--amber);border-radius:var(--radius-sm);padding:var(--space-3);margin-bottom:var(--space-3);text-align:center}
.emp-jsa-sign-banner-title{font-size:14px;font-weight:700;color:var(--amber);display:flex;align-items:center;justify-content:center;gap:6px}
.emp-jsa-sign-banner-sub{font-size:12px;color:var(--text2);margin-top:4px}
.emp-jsa-sign-label{font-size:12px;color:var(--text3);font-weight:600;margin-bottom:4px}
.emp-jsa-canvas{width:100%;height:120px;background:var(--bg3);border:2px solid var(--border);border-radius:var(--radius-sm);cursor:crosshair;touch-action:none}
.emp-jsa-submit-btn{width:100%;padding:14px;font-size:16px;font-weight:700}
.emp-jsa-signed-notice{background:var(--green-dim);color:var(--green);padding:var(--space-3);border-radius:var(--radius-sm);text-align:center;font-weight:600;margin-bottom:var(--space-4);font-size:14px}
.emp-jsa-ppe-section{margin-bottom:var(--space-4)}
.emp-jsa-ppe-label{font-size:12px;font-weight:600;color:var(--amber);margin-bottom:6px}
.emp-jsa-ppe-grid{display:flex;gap:var(--space-2);flex-wrap:wrap}
.emp-jsa-ppe-item{text-align:center;font-size:var(--text-xs)}
.emp-jsa-ppe-icon{font-size:22px}
.emp-jsa-ppe-name{color:var(--text3)}
.emp-jsa-steps-section{margin-bottom:var(--space-4)}
.emp-jsa-step-card{padding:10px;margin-bottom:6px}
.emp-jsa-step-header{display:flex;gap:var(--space-2);align-items:center;margin-bottom:4px}
.emp-jsa-step-number{width:22px;height:22px;border-radius:50%;background:var(--amber);color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:var(--text-xs);font-weight:700;flex-shrink:0}
.emp-jsa-step-name{font-size:13px;font-weight:600}
.emp-jsa-hazard-row{margin-left:30px;padding:6px 0;border-top:1px solid var(--border)}
.emp-jsa-hazard-header{display:flex;gap:6px;align-items:center;margin-bottom:2px}
.emp-jsa-hazard-score{color:#fff;font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700}
.emp-jsa-hazard-name{font-size:12px;font-weight:500}
.emp-jsa-hazard-es{font-size:var(--text-xs);color:var(--text3);font-style:italic;margin-bottom:2px}
.emp-jsa-hazard-control{font-size:var(--text-xs);color:var(--text3)}
.emp-jsa-crew-section{margin-bottom:var(--space-4)}
.emp-jsa-crew-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)}
.emp-jsa-crew-name{font-size:13px}
.emp-jsa-crew-name--self{font-weight:700}
.emp-jsa-crew-time{font-size:var(--text-xs);color:var(--green)}
.emp-jsa-unsigned-banner{background:rgba(245,158,11,0.12);border:2px solid var(--amber);border-radius:var(--radius);padding:14px;margin-bottom:var(--space-4);cursor:pointer}
.emp-jsa-unsigned-row{display:flex;gap:var(--space-2);align-items:center}
.emp-jsa-unsigned-title{font-size:14px;font-weight:700;color:var(--amber)}
.emp-jsa-unsigned-sub{font-size:12px;color:var(--text2);margin-top:2px}
.emp-jsa-list-card{padding:var(--space-3);margin-bottom:var(--space-2);cursor:pointer}
.emp-jsa-list-card--signed{border-left:3px solid var(--green)}
.emp-jsa-list-card--unsigned{border-left:3px solid var(--amber)}
.emp-jsa-list-badges{display:flex;gap:6px;align-items:center}
.emp-jsa-list-date{font-size:var(--text-xs);color:var(--text3)}
.emp-jsa-list-title{font-size:14px;font-weight:600}
.emp-jsa-list-meta{font-size:var(--text-xs);color:var(--text3)}
.emp-jsa-list-ppe{display:flex;gap:4px;margin-top:6px}
.emp-jsa-list-ppe-icon{font-size:14px}

/* ── MATERIALS TAB ── */
.emp-mat-form-row{display:flex;gap:var(--space-2)}
.emp-mat-form-col{flex:1}
.emp-mat-section-title{font-size:14px}
.emp-mat-list{display:flex;flex-direction:column;gap:var(--space-2)}
.emp-mat-empty{padding:30px 20px}

/* ── COS/RFI TAB ── */
.emp-cos-list{display:flex;flex-direction:column;gap:var(--space-2)}
.emp-cos-entry{padding:14px}
.emp-rfi-list{display:flex;flex-direction:column;gap:var(--space-2)}
.emp-rfi-entry{padding:14px}

/* ── SETTINGS TAB ── */
.emp-settings-back-btn{margin-bottom:var(--space-3)}
.emp-settings-center{text-align:center;margin-bottom:var(--space-3)}
.emp-settings-row-mt{margin-top:var(--space-3)}
.emp-settings-select-auto{width:auto;max-width:180px}

/* ── CONTENT PADDING ── */
.emp-content-pad{padding-bottom:max(72px, env(safe-area-inset-bottom))}
.emp-report-problem-btn{width:100%;margin-top:var(--space-4);padding:16px 20px;border-radius:12px;background:rgba(245,158,11,0.10);border:2px solid rgba(245,158,11,0.35);color:var(--amber);font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;gap:10px}
.emp-search-item.active{background:var(--accent-dim)}

/* ── FONT MONO OVERRIDE ── */
.emp-font-mono{font-family:var(--font-mono)}

/* ── TABLET LAYOUT (768px+) ── */
@media(min-width:768px){
  .emp-tabs{max-width:none;gap:2px;justify-content:center}
  .emp-tab{padding:10px 16px;font-size:13px}
  .emp-content{max-width:none}
  .employee-body{padding:20px 24px}
  .foreman-kpi-grid{grid-template-columns:repeat(4,1fr)}
  .foreman-project-select{max-width:500px;margin:0 auto 16px;display:block;font-size:var(--text-base);padding:var(--space-3) var(--space-3)}
}

/* ══ MAP VIEW ══ */
.map-container{height:calc(100vh - 280px);height:calc(100dvh - 280px);min-height:400px;border-radius:var(--radius);border:1px solid var(--border);overflow:hidden;z-index:1}
.map-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap}
.map-pm-toggle{display:flex;gap:4px;flex-wrap:wrap}
.map-legend{display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap}
.map-legend-item{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text2)}
.map-legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}

/* Map marker */
.map-marker-wrap{background:none!important;border:none!important}
.map-marker{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.8);
  transition:transform 0.2s ease;cursor:pointer}
.map-marker:hover{transform:scale(1.4)}

/* Map popup overrides */
.map-popup .leaflet-popup-content-wrapper{background:var(--glass-bg);backdrop-filter:blur(20px) saturate(1.6);
  -webkit-backdrop-filter:blur(20px) saturate(1.6);border:1px solid var(--glass-border);
  border-radius:var(--radius);box-shadow:0 8px 32px rgba(0,0,0,0.4);color:var(--text)}
.map-popup .leaflet-popup-tip{background:var(--glass-bg);border:1px solid var(--glass-border)}
.map-popup .leaflet-popup-close-button{color:var(--text3)}
.map-popup .leaflet-popup-close-button:hover{color:var(--text)}
.map-popup-content{padding:4px 0;font-size:12px}
.map-popup-title{font-family:var(--font-head);font-size:14px;font-weight:700;color:var(--amber);margin-bottom:8px;
  text-shadow:0 0 12px var(--amber-glow)}
.map-popup-row{display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-bottom:1px solid var(--border)}
.map-popup-row:last-child{border-bottom:none}
.map-popup-label{color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0}

/* Leaflet control overrides */
.leaflet-control-zoom a{background:var(--bg2)!important;color:var(--text)!important;border-color:var(--border)!important}
.leaflet-control-zoom a:hover{background:var(--bg3)!important}

/* Map responsive */
@media(max-width:767px){
  .map-container{height:calc(100vh - 320px);height:calc(100dvh - 320px);min-height:300px;border-radius:0;margin:0 -14px;border-left:none;border-right:none}
  .map-controls{flex-direction:column;align-items:flex-start}
  .map-pm-toggle{width:100%;overflow-x:auto;flex-wrap:nowrap;-webkit-overflow-scrolling:touch}
}

/* ── LANGUAGE TOGGLE ── */
.lang-toggle{display:flex;gap:2px;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden}
.lang-toggle button{padding:4px 10px;border:none;background:none;color:var(--text3);font-size:11px;font-weight:600;
  cursor:pointer;font-family:var(--font-body);transition:all 0.15s}
@media(hover:hover){.lang-toggle button:hover{color:var(--text)}}
.lang-toggle button.active{background:var(--amber);color:#000}

/* ── SCHEDULE TAB (Employee Portal) ── */
.schedule-day{display:flex;align-items:center;gap:12px;padding:14px;border-bottom:1px solid var(--border);
  transition:background 0.15s}
.schedule-day:last-child{border-bottom:none}
.schedule-day-name{width:36px;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;flex-shrink:0}
.schedule-project{flex:1;font-size:13px;font-weight:600;color:var(--amber);cursor:pointer;transition:color 0.15s}
.schedule-project:hover{color:var(--amber2)}
.schedule-time{font-family:var(--font-mono);font-size:11px;color:var(--text2);flex-shrink:0}
.schedule-off{flex:1;font-size:13px;color:var(--text3);font-style:italic}

/* ── PROJECT INFO PANEL ── */
.project-info{width:100%;max-width:420px}
.project-info-back{display:inline-flex;align-items:center;gap:4px;padding:6px 0;margin-bottom:12px;
  background:none;border:none;color:var(--text2);font-size:12px;cursor:pointer;font-family:var(--font-body)}
.project-info-back:hover{color:var(--amber)}
.project-info-field{display:flex;justify-content:space-between;gap:12px;padding:8px 0;
  border-bottom:1px solid var(--border);font-size:13px}
.project-info-field:last-child{border-bottom:none}
.project-info-label{color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0}
.project-info-value{color:var(--text);text-align:right;font-weight:500}
.project-progress-bar{height:8px;border-radius:4px;background:var(--bg4);overflow:hidden;margin:4px 0 8px}
.project-progress-fill{height:100%;border-radius:4px;background:var(--amber);transition:width 0.4s ease}
.project-section{margin-top:16px}
.project-section-header{display:flex;align-items:center;justify-content:space-between;padding:10px 0;
  border-bottom:1px solid var(--border);cursor:pointer;font-size:13px;font-weight:600;color:var(--text)}
.project-section-header:hover{color:var(--amber)}

/* ── MATERIAL REQUEST ── */
.mat-request-card{padding:14px;border-radius:var(--radius);border:1px solid var(--border);
  background:var(--bg2);margin-bottom:8px}
.mat-status-requested{background:var(--amber-dim);color:var(--amber)}
.mat-status-approved{background:var(--blue-dim);color:var(--blue)}
.mat-status-on_order{background:var(--blue-dim);color:var(--blue)}
.mat-status-supplier_confirmed{background:var(--blue-dim);color:var(--blue)}
.mat-status-assigned{background:var(--amber-dim);color:var(--amber)}
.mat-status-picked_up{background:var(--amber-dim);color:var(--amber)}
.mat-status-in-transit{background:var(--amber-dim);color:var(--amber)}
.mat-status-delivered{background:var(--green-dim);color:var(--green)}
.mat-status-confirmed{background:var(--green-dim);color:var(--green)}
.mat-status-denied{background:var(--red-dim,rgba(239,68,68,0.1));color:var(--red)}

/* ── DRIVER VIEW ── */
/* Legacy classes — kept for backward compat during transition */
.driver-queue-card{padding:16px;border-radius:var(--radius);border:1px solid var(--border);
  background:var(--glass-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);margin-bottom:10px}
.driver-nav-link{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;
  border-radius:var(--radius-sm);background:var(--blue-dim);color:var(--blue);
  font-size:12px;font-weight:600;text-decoration:none;transition:all 0.15s}
.driver-nav-link:hover{background:var(--blue);color:#fff}
.driver-badge{display:inline-flex;align-items:center;justify-content:center;
  min-width:18px;height:18px;border-radius:9px;background:var(--red);color:#fff;
  font-size:10px;font-weight:700;margin-left:6px;padding:0 5px}

/* KPI Summary Bar */
.driver-kpi-grid{display:flex;gap:var(--space-3);flex-wrap:wrap;align-items:center;margin-bottom:var(--space-3)}
.driver-kpi-tile{flex:1;min-width:80px;padding:var(--space-3) var(--space-3);border-radius:var(--radius);border:1px solid var(--glass-border);background:var(--glass-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.driver-kpi-label{font-size:9px;text-transform:uppercase;letter-spacing:0.8px;color:var(--text3);margin-bottom:var(--space-1)}
.driver-kpi-value{font-size:var(--text-display);font-weight:var(--weight-bold);color:var(--amber);font-family:var(--font-mono)}
.driver-kpi-value--amber{color:var(--amber)}
.driver-kpi-value--green{color:var(--green)}

/* Route Card */
.driver-route-card{padding:var(--space-4);border-radius:var(--radius);border:1px solid var(--border);background:var(--glass-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-left:4px solid var(--accent);cursor:grab;transition:opacity var(--transition-micro);-webkit-user-select:none;user-select:none;touch-action:manipulation}
.driver-route-card--in-transit{border-left-color:var(--amber)}
.driver-route-card--dragging{opacity:0.5}
.driver-route-card--drag-over{background:var(--bg3)}
.driver-route-card--held{transform:scale(1.02);box-shadow:var(--shadow-lg);z-index:10;will-change:transform;transition:transform var(--transition-micro),box-shadow var(--transition-micro)}
.driver-route-card--placeholder{opacity:0.3;border:2px dashed var(--border)}

/* Stop Number Badge */
.driver-stop-badge{width:32px;height:32px;border-radius:50%;background:var(--accent);color:var(--text-on-accent,#fff);display:flex;align-items:center;justify-content:center;font-size:var(--text-sm);font-weight:var(--weight-bold);flex-shrink:0}
.driver-stop-badge--in-transit{background:var(--amber)}

/* Card Header / Body */
.driver-card-header{display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)}
.driver-card-body{margin-left:42px}

/* Project Name */
.driver-project-name{color:var(--amber);font-weight:var(--weight-bold)}

/* Drag Handle */
.driver-drag-handle{font-size:var(--text-lg);color:var(--text3);cursor:grab;padding:0 var(--space-1);user-select:none}

/* Schedule Row */
.driver-schedule-row{display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)}
.driver-schedule-label{font-size:var(--text-sm);color:var(--text2);min-width:48px}
.driver-schedule-input{flex:1;font-size:var(--text-sm);padding:var(--space-1) var(--space-2);height:auto;min-height:var(--touch-min)}
.driver-schedule-clear{font-size:var(--text-sm);color:var(--text3);background:none;border:none;cursor:pointer;min-height:var(--touch-min);min-width:var(--touch-min);display:flex;align-items:center;justify-content:center}

/* Action Buttons */
.driver-action-row{display:flex;gap:var(--space-2)}
.driver-action-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:var(--space-1)}
.driver-delivered-btn{background:var(--green);color:#fff}
.driver-delivered-btn:hover{filter:brightness(1.1)}

/* Navigate Full Route CTA */
.driver-nav-cta{display:block;text-align:center;padding:var(--space-4) var(--space-5);font-size:var(--text-base);font-weight:var(--weight-bold);text-decoration:none}
.driver-nav-cta-hint{text-align:center;margin-top:var(--space-2)}

/* Route List */
.driver-route-list{display:flex;flex-direction:column;gap:var(--space-2)}

/* Completed Card */
.driver-completed-card{padding:var(--space-4)}

/* Section Title Override */
.driver-section-title{font-size:var(--text-base)}

/* Settings / Profile */
.driver-settings-back{margin-bottom:var(--space-3)}
.driver-settings-lang-row{margin-top:var(--space-3)}
.driver-profile-center{text-align:center;margin-bottom:var(--space-3)}

/* Login Logo Row */
.driver-logo-row{display:flex;align-items:center;gap:var(--space-2)}
.driver-logo-img{height:28px;width:auto;object-fit:contain}
.driver-login-subtitle{text-align:center;margin-top:calc(-1 * var(--space-3))}

/* Re-optimize Button */
.driver-reoptimize-btn{margin-top:var(--space-3);width:100%;display:flex;align-items:center;justify-content:center;gap:var(--space-2)}

/* Content Bottom Padding (tab bar = 56px + breathing room + notch safety) */
.driver-content-pad{padding-bottom:max(96px,calc(72px + env(safe-area-inset-bottom)))}

/* ── THEME TOGGLE ── */
.theme-toggle{display:flex;gap:2px;margin-right:4px}
.theme-btn{padding:2px 4px;border:none;background:none;cursor:pointer;font-size:11px;opacity:0.35;
  transition:all 0.15s;border-radius:var(--radius-sm);line-height:1}
.theme-btn:hover{opacity:0.7;background:var(--bg3)}
.theme-btn.active{opacity:1;background:var(--amber-dim)}

/* ── FOREMAN VIEW ── */
.foreman-kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-bottom:var(--space-4)}
.foreman-kpi-card{padding:var(--space-3);border-radius:var(--radius);border:1px solid var(--glass-border);
  background:var(--glass-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.foreman-kpi-label{font-size:var(--text-sm);text-transform:uppercase;letter-spacing:0.8px;color:var(--text3);margin-bottom:var(--space-1)}
.foreman-kpi-value{font-size:var(--text-display);line-height:var(--leading-tight);font-weight:var(--weight-bold);color:var(--amber);font-family:var(--font-mono)}
.foreman-kpi-sub{font-size:var(--text-sm);color:var(--text2);margin-top:var(--space-1)}
.foreman-team-row{display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) var(--space-3);min-height:var(--touch-min);
  border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg2);margin-bottom:6px}
.foreman-team-name{font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text)}
.foreman-team-role{font-size:var(--text-sm);color:var(--text2)}
.foreman-team-hours{font-size:var(--text-base);font-family:var(--font-mono);color:var(--amber)}
.foreman-budget-bar{height:10px;border-radius:5px;background:var(--bg4);overflow:hidden;margin:var(--space-2) 0}
.foreman-budget-fill{height:100%;border-radius:5px;transition:width 0.4s ease}
.foreman-project-select{width:100%;padding:var(--space-2) var(--space-3);border-radius:var(--radius-sm);
  border:1px solid var(--border);background:var(--bg2);color:var(--text);
  font-family:var(--font-body);font-size:var(--text-base);margin-bottom:12px}
.foreman-cost-row{display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;
  border-bottom:1px solid var(--border);font-size:var(--text-sm)}
.foreman-cost-row:last-child{border-bottom:none}

/* ── FOREMAN CONTENT LAYOUT ── */
.frm-content-pad{padding-bottom:calc(56px + env(safe-area-inset-bottom) + var(--space-4))}

/* ── FRM KPI EXTENSIONS ── */
.frm-kpi-trend{font-size:var(--text-sm);color:var(--text2)}
.frm-kpi-icon{width:var(--space-6);height:var(--space-6);color:var(--amber)}

/* ── FRM BUDGET ── */
.frm-budget-row{display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0}
.frm-budget-label{font-size:var(--text-base);color:var(--text)}
.frm-budget-value{font-size:var(--text-base);font-family:var(--font-mono);color:var(--amber)}

/* ── FRM TEAM EXTENSIONS ── */
.frm-team-status{font-size:var(--text-sm);color:var(--text2)}
.frm-team-clock-btn{min-height:var(--touch-min);padding:var(--space-2) var(--space-3);color:var(--amber)}
.frm-team-section{margin-bottom:var(--space-4)}
.frm-team-header{font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--text);margin-bottom:var(--space-2)}

/* ── FRM HOURS ── */
.frm-hours-grid{display:grid;gap:var(--space-1)}
.frm-hours-row{display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) var(--space-3);min-height:var(--touch-min);border-bottom:1px solid var(--glass-border)}
.frm-hours-name{font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text)}
.frm-hours-value{font-size:var(--text-base);font-family:var(--font-mono);color:var(--amber)}
.frm-hours-day{font-size:var(--text-sm);text-align:center;min-width:var(--space-8)}
.frm-hours-total{font-size:var(--text-base);font-weight:var(--weight-bold);font-family:var(--font-mono);color:var(--amber)}
.frm-hours-input{width:var(--space-10);text-align:center;font-size:var(--text-sm);font-family:var(--font-mono);padding:var(--space-1);border:1px solid var(--glass-border);border-radius:var(--radius-sm);background:var(--bg2);color:var(--text)}
.frm-hours-header{font-size:var(--text-sm);color:var(--text3);text-align:center}

/* ── FRM MATERIALS ── */
.frm-mat-actions{display:flex;gap:var(--space-2);margin-top:var(--space-2)}
.frm-mat-filter{display:flex;gap:var(--space-2);margin-bottom:var(--space-3);flex-wrap:wrap}
.frm-mat-form{display:flex;flex-direction:column;gap:var(--space-3)}
.frm-mat-qty-row{display:flex;gap:var(--space-2)}
.frm-mat-qty-field{flex:1}
.frm-mat-unit-field{width:90px}
.frm-mat-priority-row{display:flex;gap:var(--space-2)}
.frm-mat-priority-field{flex:1}
.frm-mat-date-field{flex:1}
.frm-mat-list{display:flex;flex-direction:column;gap:var(--space-2)}

/* ── FRM JSA ── */
.frm-jsa-matrix{display:grid;grid-template-columns:auto 1fr 1fr 1fr;gap:var(--space-1);font-size:var(--text-sm)}
.frm-jsa-risk-cell{padding:var(--space-1) var(--space-2);border-radius:var(--radius-sm);text-align:center;font-size:var(--text-sm);font-weight:var(--weight-bold)}
.frm-jsa-row{display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;border-bottom:1px solid var(--glass-border)}
.frm-jsa-rollcall-row{display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-3);min-height:var(--touch-min);border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg2);margin-bottom:var(--space-1);cursor:pointer}
.frm-jsa-rollcall-row.selected{background:var(--bg3)}
.frm-jsa-rollcall-check{width:var(--space-7);display:flex;justify-content:center;flex-shrink:0}
.frm-jsa-section{margin-bottom:var(--space-4)}
.frm-jsa-toggle{display:flex;gap:var(--space-2);margin-bottom:var(--space-3)}
.frm-jsa-toggle-wrap{margin-bottom:var(--space-4)}
.frm-jsa-ppe-grid{display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-3)}
.frm-jsa-ppe-item{display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-3);border-radius:var(--radius-sm);border:1px solid var(--glass-border);min-height:var(--touch-min);cursor:pointer}
.frm-jsa-ppe-item.active{border-color:var(--amber);background:var(--bg3)}
.frm-jsa-ppe-emoji{font-size:var(--text-xl);line-height:1}
.frm-jsa-ppe-icon{font-size:var(--text-base)}
.frm-jsa-ppe-icons{display:flex;gap:var(--space-1);margin-top:var(--space-2)}
.frm-jsa-ppe-display{display:flex;flex-wrap:wrap;gap:var(--space-3)}
.frm-jsa-ppe-display-item{text-align:center;min-width:var(--space-12)}
.frm-jsa-step{padding:var(--space-3);border:1px solid var(--glass-border);border-radius:var(--radius);margin-bottom:var(--space-2);background:var(--bg2)}
.frm-jsa-step-row{margin-bottom:var(--space-2)}
.frm-jsa-step-num{width:var(--space-6);height:var(--space-6);border-radius:50%;background:var(--amber);color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:var(--text-sm);font-weight:var(--weight-bold);flex-shrink:0}
.frm-jsa-step-text{font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text)}
.frm-jsa-step-input{flex:1}
.frm-jsa-controls{display:flex;gap:var(--space-2);justify-content:flex-end;margin-bottom:var(--space-3)}
.frm-jsa-detail-actions{margin-left:auto}
.frm-jsa-hazard-flex{flex:1}
.frm-jsa-step-header{margin-bottom:var(--space-4)}
.frm-jsa-step-proj{margin-bottom:var(--space-1)}
.frm-jsa-step-subtitle{font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text);margin-bottom:var(--space-4)}
.frm-jsa-step-date{margin-bottom:var(--space-4)}
.frm-jsa-env-label{text-transform:uppercase;letter-spacing:0.5px;margin-bottom:var(--space-2)}
.frm-jsa-trade-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-bottom:var(--space-5)}
.frm-jsa-trade-card{padding:var(--space-4);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:var(--space-2);text-align:center}
.frm-jsa-trade-icon{font-size:var(--text-3xl)}
.frm-jsa-trade-label{font-size:var(--text-base);font-weight:var(--weight-bold)}
.frm-jsa-weather-section{margin-bottom:var(--space-2)}
.frm-jsa-hazard-list{display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-5)}
.frm-jsa-hazard-item{display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:var(--bg3);border:1.5px solid var(--border);border-radius:var(--radius);cursor:pointer;transition:all 0.15s}
.frm-jsa-hazard-item.checked{background:var(--bg2)}
.frm-jsa-hazard-check{flex-shrink:0;margin-top:2px}
.frm-jsa-hazard-check.checked{color:var(--amber)}
.frm-jsa-hazard-body{flex:1;min-width:0}
.frm-jsa-hazard-name{font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text3)}
.frm-jsa-hazard-name.checked{color:var(--text)}
.frm-jsa-hazard-es{font-size:var(--text-sm);color:var(--text3);font-style:italic}
.frm-jsa-hazard-controls{margin-top:var(--space-1)}
.frm-jsa-control-item{font-size:var(--text-sm);color:var(--text2)}
.frm-jsa-control-list{margin-top:var(--space-1)}
.frm-jsa-cat-badge{font-size:var(--text-sm);padding:var(--space-1) var(--space-2);border-radius:var(--radius-sm);font-weight:var(--weight-bold);flex-shrink:0}
.frm-jsa-proceed-btn{width:100%;margin-top:var(--space-4)}
.frm-jsa-activate-btn{margin-top:var(--space-4)}
.frm-jsa-warning-card{padding:var(--space-4);text-align:center}
.frm-jsa-list-item{cursor:pointer;margin-bottom:var(--space-2)}
.frm-jsa-list-header{margin-bottom:var(--space-1)}
.frm-jsa-badges{flex-wrap:wrap}
.frm-jsa-status-badge{font-size:var(--text-sm);padding:var(--space-1) var(--space-2);border-radius:var(--radius-sm);font-weight:var(--weight-bold)}
.frm-jsa-status-badge[data-status="active"]{background:var(--phase-active-dim,rgba(16,185,129,0.13));color:var(--phase-active)}
.frm-jsa-status-badge[data-status="draft"]{background:var(--amber-dim);color:var(--amber)}
.frm-jsa-status-badge[data-status="closed"]{background:var(--bg3);color:var(--text3)}
.frm-jsa-risk-badge{font-size:var(--text-sm);padding:var(--space-1) var(--space-2);border-radius:var(--radius-sm);font-weight:var(--weight-bold)}
.frm-jsa-list-title{font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text);margin:var(--space-1) 0}
.frm-jsa-detail-header{margin-bottom:var(--space-3);flex-wrap:wrap}
.frm-jsa-detail-meta{margin-bottom:var(--space-3)}
.frm-jsa-kpi-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-2)}
.frm-jsa-kpi-card{padding:var(--space-3);text-align:center}
.frm-jsa-kpi-value{font-size:var(--text-xl);font-weight:var(--weight-bold);font-family:var(--font-mono)}
.frm-jsa-subsection-title{font-size:var(--text-base);font-weight:var(--weight-bold);margin-bottom:var(--space-2)}
.frm-jsa-hazard-card{padding:var(--space-3);margin-bottom:var(--space-2)}
.frm-jsa-hazard-header{margin-bottom:var(--space-1)}
.frm-jsa-hazard-title{font-size:var(--text-base);font-weight:var(--weight-semi)}
.frm-jsa-hazard-sub{padding:var(--space-1) 0;margin-left:var(--space-7)}
.frm-jsa-risk-score-badge{padding:2px var(--space-2);border-radius:var(--radius-sm);font-size:var(--text-sm);font-weight:var(--weight-bold);flex-shrink:0}
.frm-jsa-progress-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden}
.frm-jsa-progress-fill{height:100%;background:var(--phase-active);border-radius:2px;transition:width 0.3s}
.frm-jsa-progress-label{margin-bottom:var(--space-1)}
.frm-jsa-name-banner{text-align:center;padding:var(--space-4) 0;margin-bottom:var(--space-3)}
.frm-jsa-signer-name{font-size:var(--text-display);font-weight:var(--weight-bold)}
.frm-jsa-supervisor-banner{text-align:center;padding:var(--space-6) 0;margin-bottom:var(--space-4)}
.frm-jsa-supervisor-label{font-size:var(--text-lg);font-weight:var(--weight-bold);margin-bottom:var(--space-2)}
.frm-jsa-supervisor-name{font-size:var(--text-3xl);font-weight:var(--weight-bold);margin-bottom:var(--space-1)}
.frm-jsa-done-view{text-align:center;padding:var(--space-4) 0}
.frm-jsa-done-icon{display:flex;justify-content:center;margin-bottom:var(--space-2)}
.frm-jsa-done-title{font-size:var(--text-xl);font-weight:var(--weight-bold);margin-bottom:var(--space-1)}
.frm-jsa-done-subtitle{margin-bottom:var(--space-5)}
.frm-jsa-signed-list{text-align:left;margin-bottom:var(--space-5)}
.frm-jsa-signed-row{padding:var(--space-2) 0}
.frm-jsa-done-actions{display:flex;gap:var(--space-2)}
.frm-jsa-done-btn{flex:1;padding:var(--space-3)}
.frm-jsa-crew-name{font-size:var(--text-base);font-weight:var(--weight-semi)}
.frm-jsa-add-crew-btn{margin-top:var(--space-2)}
.frm-jsa-add-crew-select{margin-top:var(--space-2)}
.frm-jsa-add-hazard-select{margin-top:var(--space-1);margin-left:var(--space-7)}
.frm-jsa-near-miss{padding:var(--space-2);margin-bottom:var(--space-1)}
.frm-jsa-near-miss-badge{font-size:var(--text-sm);padding:var(--space-1) var(--space-2);border-radius:var(--radius-sm)}
.frm-phase-active{color:var(--phase-active)}

/* ── FRM DRAWINGS ── */
.frm-draw-list{display:flex;flex-direction:column;gap:var(--space-1)}
.frm-draw-item{display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);min-height:var(--touch-min);border-bottom:1px solid var(--glass-border);cursor:pointer}
.frm-draw-name{font-size:var(--text-base);color:var(--text);font-weight:var(--weight-bold)}
.frm-draw-meta{font-size:var(--text-sm);color:var(--text2)}
.frm-draw-revision-badge{font-size:var(--text-sm);padding:var(--space-1) var(--space-2);border-radius:var(--radius-sm);background:var(--bg3);color:var(--text2)}
.frm-draw-viewer{position:relative;width:100%;overflow:auto;background:var(--bg);border-radius:var(--radius)}
.frm-draw-toolbar{display:flex;gap:var(--space-2);padding:var(--space-2);background:var(--bg2);border-radius:var(--radius-sm);margin-bottom:var(--space-2)}
.frm-draw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-2);margin-bottom:var(--space-4)}
.frm-draw-card{padding:var(--space-3)}
.frm-draw-card.stale{border-left:3px solid var(--amber)}
.frm-draw-card.superseded{border-left:3px solid var(--text3)}
.frm-draw-card.current{border-left:3px solid var(--green)}
.frm-draw-badge-row{display:flex;gap:var(--space-1);align-items:center;margin-bottom:var(--space-2);flex-wrap:wrap}
.frm-draw-badge{font-size:var(--text-sm);padding:var(--space-1) var(--space-2);border-radius:var(--radius-sm);text-transform:uppercase;letter-spacing:0.5px;font-weight:var(--weight-bold)}
.frm-draw-badge.current{background:rgba(34,197,94,0.15);color:var(--green)}
.frm-draw-badge.superseded{background:rgba(255,255,255,0.06);color:var(--text3);text-decoration:line-through}
.frm-draw-badge.stale{background:rgba(245,158,11,0.2);color:var(--amber)}
.frm-draw-badge.revision{background:rgba(34,197,94,0.15);color:var(--green)}
.frm-draw-badge.discipline{background:rgba(255,255,255,0.06);color:var(--text3);text-transform:capitalize}
.frm-draw-info{display:flex;gap:var(--space-3);align-items:center}
.frm-draw-icon{color:var(--text2);flex-shrink:0}
.frm-draw-icon.stale{color:var(--amber)}
.frm-draw-text{flex:1;min-width:0}
.frm-draw-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.frm-draw-cached{color:var(--green)}
.frm-draw-cached-stale{color:var(--amber);font-weight:var(--weight-bold)}
.frm-draw-actions{display:flex;gap:var(--space-1);flex-direction:column}
.frm-draw-default-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-2)}
.frm-draw-default-card{padding:var(--space-3);opacity:0.6}
.frm-draw-default-body{display:flex;gap:var(--space-3);align-items:center}
.frm-draw-default-icon{color:var(--text2);flex-shrink:0}
.frm-draw-default-info{flex:1}
.frm-draw-cache-section{margin-top:var(--space-4)}
.frm-draw-cache-hint{padding:var(--space-4);background:var(--glass-bg);border-radius:var(--radius);text-align:center;margin-top:var(--space-4)}
.frm-draw-cache-hint-sub{margin-top:var(--space-1)}

/* ── FRM LOOKAHEAD ── */
.frm-look-grid{display:flex;flex-direction:column;gap:var(--space-1)}
.frm-look-day{padding:var(--space-2);min-height:var(--touch-min);border:1px solid var(--glass-border);border-radius:var(--radius-sm);background:var(--bg2);font-size:var(--text-sm)}
.frm-look-day-header{font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--text);text-align:center;padding:var(--space-1)}
.frm-look-task{font-size:var(--text-sm);padding:var(--space-1);border-radius:var(--radius-sm);background:var(--bg3);margin-bottom:var(--space-1)}
.frm-look-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)}
.frm-look-list{display:flex;flex-direction:column;gap:var(--space-1)}
.frm-look-date-header{font-size:var(--text-sm);font-weight:var(--weight-bold);padding:var(--space-1) 0;margin-top:var(--space-2);border-bottom:1px solid rgba(255,255,255,0.06)}
.frm-look-date-header.today{color:var(--amber)}
.frm-look-date-header.tomorrow{color:var(--text2)}
.frm-look-date-header.future{color:var(--text2)}
.frm-look-event{padding:var(--space-2) var(--space-3);margin-top:var(--space-1)}
.frm-look-event-body{display:flex;gap:var(--space-2);align-items:center}
.frm-look-event-bar{width:4px;height:32px;border-radius:2px;flex-shrink:0}
.frm-look-event-text{flex:1;min-width:0}
.frm-look-event-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.frm-look-event-meta{display:flex;gap:var(--space-1);align-items:center}
.frm-look-event-type{text-transform:capitalize}
.frm-look-event-notes{margin-top:var(--space-1)}

/* ── FRM REPORTS ── */
.frm-report-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)}
.frm-report-section{margin-bottom:var(--space-4)}
.frm-report-section-title{font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--text);margin-bottom:var(--space-2)}
.frm-report-form{display:flex;flex-direction:column;gap:var(--space-3)}
.frm-report-row{display:flex;gap:var(--space-2);align-items:center}
.frm-report-label{font-size:var(--text-sm);color:var(--text3);min-width:80px}
.frm-report-value{font-size:var(--text-base);color:var(--text)}
.frm-report-weather{display:flex;gap:var(--space-2);flex-wrap:wrap}
.frm-report-weather-btn{padding:var(--space-2) var(--space-3);border-radius:var(--radius-sm);border:1px solid var(--glass-border);background:var(--bg2);color:var(--text);min-height:var(--touch-min);cursor:pointer;font-family:var(--font-body);font-size:var(--text-base)}
.frm-report-weather-btn.active{background:var(--amber);color:var(--bg);border-color:var(--amber)}
.frm-report-crew-row{display:flex;align-items:center;justify-content:space-between;padding:var(--space-2);border-bottom:1px solid var(--glass-border)}
.frm-report-sig{margin-top:var(--space-4)}
.frm-report-list-item{padding:var(--space-3);border-bottom:1px solid var(--glass-border);cursor:pointer;min-height:var(--touch-min)}
.frm-report-date{font-size:var(--text-sm);color:var(--text2)}
.frm-report-status{font-size:var(--text-sm)}
.frm-report-card{padding:var(--space-3) var(--space-3);margin-bottom:var(--space-2);cursor:pointer;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius)}
.frm-report-card-top{display:flex;justify-content:space-between;align-items:center}
.frm-report-card-meta{display:flex;align-items:center;gap:var(--space-1)}
.frm-report-card-chips{display:flex;align-items:center;gap:var(--space-1)}
.frm-report-safety-badge{font-size:var(--text-sm);background:var(--red);color:#fff;padding:1px var(--space-1);border-radius:var(--radius-sm)}
.frm-report-preview{margin-top:var(--space-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.frm-report-preview-tasks{color:var(--amber);margin-right:var(--space-1)}
.frm-report-expanded{margin-top:var(--space-2);border-top:1px solid var(--glass-border);padding-top:var(--space-2)}
.frm-report-field{margin-bottom:var(--space-2)}
.frm-report-field-label{color:var(--text2);margin-bottom:2px}
.frm-report-field-label.amber{color:var(--amber)}
.frm-report-safety-block{margin-bottom:var(--space-2);padding:var(--space-2);border-radius:var(--radius-sm)}
.frm-report-safety-block.incident{background:rgba(239,68,68,0.06)}
.frm-report-safety-block.ok{background:rgba(16,185,129,0.06)}
.frm-report-photos{display:flex;gap:var(--space-1);flex-wrap:wrap;margin-top:var(--space-1)}
.frm-report-photo{width:80px;height:60px;object-fit:cover;border-radius:var(--radius-sm);border:1px solid var(--border);cursor:pointer}
.frm-report-actions{display:flex;gap:var(--space-2);margin-top:var(--space-2)}
.frm-report-quickfill{display:flex;gap:var(--space-2);margin-bottom:var(--space-3)}
.frm-report-2col{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)}
.frm-report-crew-list{max-height:140px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);padding:var(--space-2);background:var(--bg2)}
.frm-report-crew-label{display:flex;align-items:center;gap:var(--space-2);padding:var(--space-1) 0;cursor:pointer}
.frm-report-quick-tasks{display:flex;flex-wrap:wrap;gap:var(--space-1);margin-bottom:var(--space-2)}
.frm-report-task-chip{padding:3px var(--space-2);border-radius:14px;cursor:pointer;font-size:var(--text-sm);font-family:var(--font-body);border:1px solid var(--border)}
.frm-report-task-chip.active{background:var(--amber);color:var(--bg);border-color:var(--amber)}
.frm-report-task-chip.inactive{background:var(--bg2);color:var(--text2)}
.frm-report-hours-row{padding:var(--space-2);background:var(--bg2);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center}
.frm-report-hours-value{font-weight:var(--weight-bold);font-size:var(--text-lg);color:var(--amber)}
.frm-report-photo-grid{display:flex;gap:var(--space-1);flex-wrap:wrap;margin-top:var(--space-2)}
.frm-report-photo-thumb{position:relative;width:64px;height:64px}
.frm-report-photo-img{width:64px;height:64px;object-fit:cover;border-radius:var(--radius-sm);border:1px solid var(--border)}
.frm-report-photo-del{position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:9px;background:var(--red);color:#fff;border:none;font-size:10px;cursor:pointer;line-height:18px;text-align:center}
.frm-report-safety-toggle{padding:var(--space-3);border-radius:var(--radius-sm)}
.frm-report-safety-toggle.on{background:rgba(239,68,68,0.08);border:1px solid var(--red)}
.frm-report-safety-toggle.off{background:var(--bg2);border:1px solid var(--border)}
.frm-report-safety-label{display:flex;align-items:center;gap:var(--space-2);cursor:pointer;font-size:var(--text-sm);font-weight:var(--weight-bold)}
.frm-report-toggle-btn{width:44px;height:24px;border-radius:12px;border:none;cursor:pointer;position:relative;transition:background 0.2s}
.frm-report-toggle-btn.on{background:var(--red)}
.frm-report-toggle-btn.off{background:var(--border)}
.frm-report-toggle-thumb{position:absolute;top:2px;width:20px;height:20px;border-radius:10px;background:#fff;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
.frm-report-toggle-thumb.on{left:22px}
.frm-report-toggle-thumb.off{left:2px}
.frm-report-toggle-status{font-size:var(--text-sm)}
.frm-report-toggle-status.on{color:var(--red)}
.frm-report-toggle-status.off{color:var(--text3)}
.frm-report-list-wrap{margin-top:var(--space-4)}
.frm-report-file-input{font-size:var(--text-sm)}

/* ── FRM DOCUMENTS ── */
.frm-doc-list{display:flex;flex-direction:column;gap:var(--space-1)}
.frm-doc-item{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);min-height:var(--touch-min);border-bottom:1px solid var(--glass-border);cursor:pointer}
.frm-doc-icon{width:var(--space-8);height:var(--space-8);display:flex;align-items:center;justify-content:center;border-radius:var(--radius-sm);background:var(--bg3);color:var(--amber)}
.frm-doc-name{font-size:var(--text-base);color:var(--text);font-weight:var(--weight-bold)}
.frm-doc-meta{font-size:var(--text-sm);color:var(--text2)}
.frm-doc-section{margin-bottom:var(--space-4)}
.frm-doc-section-header{display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;cursor:pointer;border-bottom:1px solid var(--border)}
.frm-doc-section-title{font-size:var(--text-base);font-weight:var(--weight-bold);color:var(--text)}
.frm-doc-section-count{font-size:var(--text-sm);color:var(--text3)}
.frm-doc-card{padding:var(--space-2);margin-top:var(--space-1)}
.frm-doc-rfi-header{display:flex;align-items:center;justify-content:space-between}
.frm-doc-rfi-expand{flex:1;cursor:pointer}

/* ── FRM SITE ── */
.frm-site-section{margin-bottom:var(--space-4)}
.frm-site-photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2)}
.frm-site-photo{aspect-ratio:1;border-radius:var(--radius-sm);overflow:hidden;background:var(--bg3)}
.frm-site-header{margin-bottom:var(--space-3)}
.frm-site-header-inner{display:flex;align-items:center;gap:var(--space-2)}
.frm-site-header-text{margin-left:var(--space-1)}
.frm-site-count-badge{font-size:var(--text-sm)}
.frm-site-critical-alert{background:rgba(239,68,68,0.08);border:1px solid var(--red);border-radius:var(--radius);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-3)}
.frm-site-critical-title{display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1)}
.frm-site-critical-item{padding-left:22px}
.frm-site-item{border-radius:var(--radius);padding:var(--space-3) var(--space-3);display:flex;align-items:center;gap:var(--space-3);cursor:pointer}
.frm-site-item.checked{background:rgba(16,185,129,0.07);border:1px solid var(--green)}
.frm-site-item.critical-unchecked{background:rgba(239,68,68,0.04);border:1px solid var(--red)}
.frm-site-item.normal{background:var(--bg2);border:1px solid var(--border)}
.frm-site-item-icon{font-size:20px}
.frm-site-item-body{flex:1}
.frm-site-item-label.checked{text-decoration:line-through;opacity:0.7}

/* ── FRM NOTES ── */
.frm-notes-list{display:flex;flex-direction:column;gap:var(--space-2)}
.frm-notes-item{padding:var(--space-3);border:1px solid var(--glass-border);border-radius:var(--radius);background:var(--bg2)}
.frm-notes-item.pinned{border-left:3px solid var(--amber);background:rgba(245,158,11,0.05)}
.frm-notes-pinned{border-left:3px solid var(--amber)}
.frm-notes-date{font-size:var(--text-sm);color:var(--text2);margin-top:var(--space-1)}
.frm-notes-text{font-size:var(--text-base);color:var(--text);white-space:pre-wrap;line-height:1.5}
.frm-notes-toolbar{display:flex;gap:var(--space-2);margin-bottom:var(--space-3)}
.frm-notes-input{width:100%;min-height:80px;padding:var(--space-3);border:1px solid var(--glass-border);border-radius:var(--radius);background:var(--bg2);color:var(--text);font-size:var(--text-base);font-family:var(--font-body);resize:vertical}
.frm-notes-input-mb{margin-bottom:var(--space-2)}
.frm-pre-wrap{white-space:pre-wrap}
.frm-resize-vertical{resize:vertical}
.frm-report-safety-desc{margin-top:var(--space-2)}
.frm-hidden{display:none}
.frm-notes-compose{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:var(--space-3);margin-bottom:var(--space-3)}
.frm-notes-compose-actions{display:flex;gap:var(--space-2)}
.frm-notes-filter{overflow-x:auto}
.frm-notes-header{margin-bottom:var(--space-3)}
.frm-notes-header-inner{display:flex;align-items:center;gap:var(--space-2)}
.frm-notes-item-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)}
.frm-notes-item-meta{display:flex;align-items:center;gap:var(--space-2)}
.frm-notes-item-actions{display:flex;align-items:center;gap:var(--space-1)}
.frm-notes-pin-btn{background:none;border:none;cursor:pointer;padding:2px var(--space-1)}
.frm-notes-pin-btn.pinned{color:var(--amber)}
.frm-notes-pin-btn.unpinned{color:var(--text3)}
.frm-notes-del-btn{background:none;border:none;cursor:pointer;color:var(--text3);font-size:var(--text-base);padding:2px var(--space-1)}

/* ── FRM RFI MODAL ── */
.frm-rfi-modal{max-width:480px;width:100%;padding:var(--space-6)}
.frm-rfi-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5)}
.frm-rfi-title-row{display:flex;align-items:center;gap:var(--space-2)}
.frm-rfi-title{font-size:var(--text-lg);font-weight:var(--weight-bold)}
.frm-rfi-close{background:none;border:none;cursor:pointer;color:var(--text3);padding:var(--space-1)}
.frm-rfi-project{font-size:var(--text-sm);color:var(--text3);margin-bottom:var(--space-4)}
.frm-rfi-form{display:flex;flex-direction:column;gap:var(--space-3)}
.frm-rfi-actions{display:flex;gap:var(--space-2);margin-top:var(--space-5)}
.frm-rfi-cancel{flex:1}
.frm-rfi-submit{flex:2}

/* ── FRM PHOTO CAPTURE ── */
.frm-photo-modal{background:var(--bg2);border-radius:var(--radius);padding:var(--space-5);max-width:400px;width:90%;text-align:center}
.frm-photo-title{font-size:var(--text-lg);font-weight:var(--weight-bold);margin-bottom:var(--space-3)}
.frm-photo-hint{font-size:var(--text-sm);color:var(--text2);margin-bottom:var(--space-4)}
.frm-photo-preview{background:#000;border-radius:var(--radius-sm);overflow:hidden;margin-bottom:var(--space-4);position:relative;width:100%;padding-bottom:100%}
.frm-photo-video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover}
.frm-photo-actions{display:flex;gap:var(--space-2);justify-content:center}

/* ── FRM SETTINGS ── */
.frm-settings-section{margin-bottom:var(--space-4)}
.frm-settings-label{font-size:var(--text-sm);color:var(--text3);margin-bottom:var(--space-1)}

/* ── FRM CLOCK ── */
.frm-clock-status{text-align:center;padding:var(--space-4)}
.frm-clock-time{font-size:var(--text-display);font-family:var(--font-mono);color:var(--amber);font-weight:var(--weight-bold)}
.frm-clock-project-search{margin-bottom:var(--space-3)}
.frm-clock-project-list{display:flex;flex-direction:column;gap:var(--space-1)}
.frm-clock-project-item{padding:var(--space-3);border:1px solid var(--glass-border);border-radius:var(--radius);cursor:pointer;min-height:var(--touch-min)}
.frm-clock-project-item.selected{border-color:var(--amber);background:var(--bg3)}

/* ── FRM PHASE STATUS ── */
.frm-phase-active{color:var(--phase-active)}
.frm-phase-estimating{color:var(--phase-estimating)}
.frm-phase-pre-construction{color:var(--phase-pre-construction)}
.frm-phase-completed{color:var(--phase-completed)}
.frm-phase-warranty{color:var(--phase-warranty)}
.frm-phase-in-progress{color:var(--phase-in-progress)}
.frm-phase-dot{width:var(--space-2);height:var(--space-2);border-radius:50%;display:inline-block}
.frm-phase-dot.active{background:var(--phase-active)}
.frm-phase-dot.estimating{background:var(--phase-estimating)}
.frm-phase-dot.pre-construction{background:var(--phase-pre-construction)}
.frm-phase-dot.completed{background:var(--phase-completed)}
.frm-phase-dot.warranty{background:var(--phase-warranty)}
.frm-phase-dot.in-progress{background:var(--phase-in-progress)}

/* ── FRM GENERAL UTILITIES ── */
.frm-section-title{font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--text);margin-bottom:var(--space-2)}
.frm-section-sub{font-size:var(--text-sm);color:var(--text2);margin-bottom:var(--space-3)}
.frm-flex-between{display:flex;align-items:center;justify-content:space-between}
.frm-flex-gap{display:flex;gap:var(--space-2);align-items:center}
.frm-mono{font-family:var(--font-mono)}
.frm-amber{color:var(--amber)}
.frm-muted{color:var(--text2)}
.frm-divider{border-bottom:1px solid var(--glass-border);margin:var(--space-2) 0}
.frm-search-bar{display:flex;gap:var(--space-2);margin-bottom:var(--space-3)}
.frm-login-wrap{max-width:340px;margin:0 auto;padding:var(--space-8) var(--space-4)}
.frm-login-title{font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--text);text-align:center;margin-bottom:var(--space-6)}

/* ── LOGIN FORM ── */
.login-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:24px;width:100%;max-width:380px;margin:0 auto}
.login-title{font-family:var(--font-head);font-size:22px;font-weight:700;color:var(--text);text-align:center;margin-bottom:4px}
.login-form{width:100%;display:flex;flex-direction:column;gap:14px}
.login-input{width:100%;padding:12px 16px;border-radius:var(--radius-sm);border:1px solid var(--border);
  background:var(--bg2);color:var(--text);font-family:var(--font-body);font-size:14px;transition:border-color 0.15s}
.login-input:focus{outline:none;border-color:var(--amber);box-shadow:0 0 0 2px var(--amber-dim)}
.login-input::placeholder{color:var(--text3)}
.login-btn{width:100%;padding:14px;border-radius:var(--radius-sm);border:none;background:var(--amber);color:#000;
  font-family:var(--font-head);font-size:16px;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:1px;
  transition:all 0.2s cubic-bezier(.4,0,.2,1);box-shadow:0 2px 8px var(--amber-glow)}
.login-btn:hover{background:var(--amber2);box-shadow:0 4px 16px var(--amber-glow);transform:translateY(-1px)}
.login-btn:active{transform:translateY(0)}
.login-error{color:var(--red);font-size:13px;text-align:center;padding:8px;border-radius:var(--radius-sm);
  background:var(--red-dim);border:1px solid rgba(239,68,68,0.15)}

/* ── SETTINGS TAB ── */
.settings-wrap{width:100%;max-width:420px}
.settings-section{margin-bottom:24px}
.settings-section-title{font-family:var(--font-head);font-size:14px;font-weight:600;color:var(--text);
  margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:0.5px}
.settings-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;
  border-bottom:1px solid var(--border);font-size:13px}
.settings-row:last-child{border-bottom:none}
.settings-label{color:var(--text);font-weight:500}
.settings-value{color:var(--text2);font-size:12px}
.settings-toggle{position:relative;width:44px;height:24px;border-radius:12px;background:var(--bg4);
  border:1px solid var(--border);cursor:pointer;transition:all 0.2s ease;flex-shrink:0}
.settings-toggle.on{background:var(--amber);border-color:var(--amber)}
.settings-toggle::after{content:'';position:absolute;top:2px;left:2px;width:18px;height:18px;
  border-radius:50%;background:#fff;transition:transform 0.2s ease;box-shadow:0 1px 3px rgba(0,0,0,0.3)}
.settings-toggle.on::after{transform:translateX(20px)}
.settings-avatar{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:24px;font-weight:700;color:#fff;background:var(--amber);margin:0 auto 12px;
  text-shadow:0 0 12px var(--amber-glow)}
.theme-card-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.theme-card{padding:10px 8px;border-radius:var(--radius-sm);border:2px solid var(--border);
  background:var(--bg2);cursor:pointer;text-align:center;transition:all 0.15s ease;font-size:20px}
.theme-card:hover{border-color:var(--text3)}
.theme-card.active{border-color:var(--amber);background:var(--amber-dim);box-shadow:0 0 12px var(--amber-glow)}
.theme-card-label{font-size:10px;color:var(--text2);margin-top:4px}
.settings-select{width:100%;padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);
  background:var(--bg2);color:var(--text);font-family:var(--font-body);font-size:13px}
.settings-select:focus{outline:none;border-color:var(--amber)}
.settings-logout{width:100%;padding:12px;border-radius:var(--radius-sm);border:1px solid var(--red);
  background:var(--red-dim);color:var(--red);font-family:var(--font-head);font-size:14px;font-weight:600;
  cursor:pointer;transition:all 0.15s ease;text-transform:uppercase;letter-spacing:0.5px}
.settings-logout:hover{background:var(--red);color:#fff}
.settings-gear{background:none;border:none;color:var(--text2);cursor:pointer;font-size:18px;padding:4px 8px;
  transition:all 0.15s;border-radius:var(--radius-sm)}
.settings-gear:hover{color:var(--amber);background:var(--amber-dim)}

/* ── EMPLOYEE RESPONSIVE ── */
@media(max-width:480px){
  .pin-grid{grid-template-columns:repeat(3,68px);gap:8px}
  .pin-key{width:68px;height:52px;font-size:22px}
  .clock-time{font-size:34px}
  .clock-card{padding:22px 18px}
  .employee-body{padding:14px;padding-bottom:72px}
}
@media(max-width:900px) and (max-height:500px) and (orientation:landscape){
  .employee-body{padding:10px 20px;flex-direction:row;align-items:flex-start;gap:16px;flex-wrap:wrap}
  .emp-tabs{max-width:none}
  .emp-content{max-width:none;flex:1;min-width:300px}
  .pin-wrap{gap:16px}
  .pin-title{font-size:18px}
  .clock-card{max-width:none}
  .clock-time{font-size:32px}
  .employee-header{padding:8px 16px}
}

/* ══════════════════════════════════════════════════════════════
   CALENDAR MODULE
   ══════════════════════════════════════════════════════════════ */

/* ── Calendar container & toolbar ── */
.cal-container{display:flex;flex-direction:column;gap:16px}
.cal-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.cal-nav{display:flex;align-items:center;gap:8px}
.cal-nav-btn{background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:6px 12px;border-radius:var(--radius);cursor:pointer;font-size:13px;transition:all 0.15s}
.cal-nav-btn:hover{border-color:var(--amber);color:var(--amber)}
.cal-nav-btn.today{background:var(--amber);color:var(--bg);border-color:var(--amber);font-weight:600}
.cal-title{font-family:var(--font-head);font-size:18px;font-weight:700;color:var(--text);min-width:180px}
.cal-view-toggle{display:flex;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-left:auto}
.cal-view-toggle button{background:var(--bg3);border:none;color:var(--text2);padding:6px 14px;font-size:12px;cursor:pointer;transition:all 0.15s;border-right:1px solid var(--border)}
.cal-view-toggle button:last-child{border-right:none}
.cal-view-toggle button.active{background:var(--amber);color:var(--bg);font-weight:600}
.cal-add-btn{background:var(--amber);color:var(--bg);border:none;padding:6px 14px;border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s}
.cal-add-btn:hover{box-shadow:0 2px 12px var(--amber-glow)}

/* ── Filter bar ── */
.cal-filter-bar{display:flex;gap:6px;flex-wrap:wrap;padding:4px 0}
.cal-filter-chip{display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;cursor:pointer;border:1px solid var(--border);background:var(--bg3);color:var(--text2);transition:all 0.15s;user-select:none}
.cal-filter-chip.active{border-color:currentColor;background:var(--bg2)}
.cal-filter-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}

/* ── Month grid ── */
.cal-month-grid{display:grid;grid-template-columns:repeat(7,1fr);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--bg2)}
.cal-month-header{padding:8px 4px;text-align:center;font-size:11px;font-weight:600;color:var(--text3);background:var(--bg3);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:0.5px}
.cal-month-cell{min-height:90px;padding:4px 6px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);cursor:pointer;transition:background 0.12s;position:relative}
.cal-month-cell:nth-child(7n){border-right:none}
.cal-month-cell:hover{background:var(--bg3)}
.cal-month-cell.today{background:rgba(224,148,34,0.08)}
.cal-month-cell.today .cal-month-date{color:var(--amber);font-weight:700}
.cal-month-cell.other{opacity:0.35}
.cal-month-cell.selected{background:rgba(224,148,34,0.15);box-shadow:inset 0 0 0 1px var(--amber)}
.cal-month-date{font-size:12px;font-weight:500;color:var(--text2);margin-bottom:2px}
.cal-events-wrap{display:flex;flex-direction:column;gap:1px}
.cal-event-chip{padding:1px 5px;border-radius:3px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;line-height:1.4;cursor:pointer}
.cal-event-chip:hover{opacity:0.85}
.cal-more-badge{font-size:10px;color:var(--text3);padding:1px 4px;cursor:pointer}
.cal-more-badge:hover{color:var(--amber)}
.cal-weather-icon{position:absolute;top:3px;right:4px;font-size:12px;opacity:0.7}

/* ── Week view ── */
.cal-week-grid{display:grid;grid-template-columns:56px repeat(7,1fr);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--bg2)}
.cal-week-header{padding:8px 4px;text-align:center;font-size:11px;color:var(--text3);background:var(--bg3);border-bottom:1px solid var(--border);border-right:1px solid var(--border)}
.cal-week-header.today{color:var(--amber);font-weight:700}
.cal-week-header:last-child{border-right:none}
.cal-time-label{padding:4px 6px;font-size:10px;color:var(--text3);text-align:right;border-right:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--bg3)}
.cal-week-cell{min-height:48px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);padding:2px;position:relative;cursor:pointer}
.cal-week-cell:nth-child(8n){border-right:none}
.cal-week-cell:hover{background:var(--bg3)}
.cal-week-cell.today{background:rgba(224,148,34,0.06)}
.cal-week-event{padding:2px 5px;border-radius:3px;font-size:10px;color:#fff;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}

/* ── Day view ── */
.cal-day-grid{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--bg2)}
.cal-day-row{display:flex;min-height:52px;border-bottom:1px solid var(--border)}
.cal-day-time{width:56px;padding:4px 6px;font-size:10px;color:var(--text3);text-align:right;background:var(--bg3);border-right:1px solid var(--border);flex-shrink:0}
.cal-day-events{flex:1;padding:4px;display:flex;flex-direction:column;gap:2px}
.cal-day-event-block{padding:4px 8px;border-radius:4px;font-size:12px;color:#fff;cursor:pointer}
.cal-day-event-block:hover{opacity:0.85}
.cal-day-event-time{font-size:10px;opacity:0.8}

/* ── Day detail panel ── */
.cal-day-panel{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px;max-height:60vh;overflow-y:auto}
.cal-day-panel-title{font-family:var(--font-head);font-size:16px;font-weight:700;color:var(--amber);margin-bottom:12px}
.cal-day-section{margin-bottom:12px}
.cal-day-section-title{font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}
.cal-day-event{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:6px;background:var(--bg3);border:1px solid var(--border);margin-bottom:4px;cursor:pointer;transition:border-color 0.15s}
.cal-day-event:hover{border-color:var(--amber)}
.cal-day-event-dot{width:8px;height:8px;border-radius:50%;margin-top:4px;flex-shrink:0}
.cal-day-event-info{flex:1;min-width:0}
.cal-day-event-title{font-size:13px;font-weight:500;color:var(--text)}
.cal-day-event-meta{font-size:11px;color:var(--text3)}

/* ── Event form modal ── */
.cal-event-form{display:flex;flex-direction:column;gap:12px;padding:4px 0}
.cal-event-form .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cal-event-form .form-full{grid-column:1/-1}
.cal-event-form label{font-size:12px;font-weight:500;color:var(--text2);margin-bottom:2px;display:block}
.cal-event-form input,.cal-event-form select,.cal-event-form textarea{width:100%;padding:8px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:13px}
.cal-event-form input:focus,.cal-event-form select:focus,.cal-event-form textarea:focus{outline:none;border-color:var(--amber)}
.cal-event-form textarea{min-height:60px;resize:vertical}
.cal-checkbox-row{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2)}
.cal-checkbox-row input[type="checkbox"]{accent-color:var(--amber);width:16px;height:16px}
.cal-multi-select{display:flex;flex-wrap:wrap;gap:4px;padding:6px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);min-height:36px}
.cal-multi-tag{display:flex;align-items:center;gap:4px;padding:2px 8px;background:var(--amber);color:var(--bg);border-radius:12px;font-size:11px;font-weight:500}
.cal-multi-tag button{background:none;border:none;color:var(--bg);font-size:14px;cursor:pointer;line-height:1;padding:0}
.cal-event-type-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px}
.cal-event-type-card{padding:8px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;text-align:center;font-size:12px;color:var(--text2);transition:all 0.15s;background:var(--bg3)}
.cal-event-type-card:hover{border-color:var(--text3)}
.cal-event-type-card.active{border-color:var(--amber);background:rgba(224,148,34,0.1);color:var(--amber);font-weight:600}

/* ── Conflict badges & cards ── */
.cal-conflict-badge{background:var(--red);color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;margin-left:6px}
.cal-conflict-list{display:flex;flex-direction:column;gap:8px}
.cal-conflict-card{padding:12px 14px;border-radius:var(--radius);background:var(--bg2);border-left:4px solid var(--border);display:flex;gap:12px;align-items:flex-start}
.cal-conflict-card.error{border-left-color:#ef4444}
.cal-conflict-card.warning{border-left-color:#f59e0b}
.cal-conflict-card.info{border-left-color:#3b82f6}
.cal-conflict-icon{font-size:18px;flex-shrink:0}
.cal-conflict-body{flex:1;min-width:0}
.cal-conflict-title{font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px}
.cal-conflict-desc{font-size:12px;color:var(--text3)}
.cal-conflict-date{font-size:11px;color:var(--text3);margin-top:4px}
.cal-conflict-resolve{background:var(--bg3);border:1px solid var(--border);color:var(--text2);padding:4px 10px;border-radius:var(--radius);font-size:11px;cursor:pointer;transition:all 0.15s;flex-shrink:0;align-self:center}
.cal-conflict-resolve:hover{border-color:var(--green);color:var(--green)}
.cal-conflict-resolve.resolved{opacity:0.5;pointer-events:none}

/* ── Lookahead ── */
.cal-lookahead-wrap{overflow-x:auto}
.cal-lookahead-grid{display:grid;min-width:600px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--bg2)}
.cal-lookahead-header{padding:8px 10px;font-size:11px;font-weight:600;color:var(--text3);background:var(--bg3);border-bottom:1px solid var(--border);border-right:1px solid var(--border);text-align:center}
.cal-lookahead-label{padding:8px 10px;font-size:12px;color:var(--text);border-bottom:1px solid var(--border);border-right:1px solid var(--border);background:var(--bg3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cal-lookahead-cell{padding:6px 8px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);font-size:11px;position:relative}
.cal-lookahead-cell.gap{background:rgba(239,68,68,0.08)}
.cal-lookahead-cell.active{background:rgba(16,185,129,0.08)}
.cal-lookahead-bar{height:6px;border-radius:3px;background:var(--amber);margin-top:4px}
.cal-lookahead-status{display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600}
.cal-lookahead-status.on-track{background:rgba(16,185,129,0.15);color:#10b981}
.cal-lookahead-status.behind{background:rgba(239,68,68,0.15);color:#ef4444}
.cal-lookahead-status.ahead{background:rgba(59,130,246,0.15);color:#3b82f6}

/* ── PTO ── */
.cal-pto-list{display:flex;flex-direction:column;gap:8px}
.cal-pto-card{padding:12px 14px;border-radius:var(--radius);background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;gap:12px}
.cal-pto-card .badge{font-size:10px}
.cal-pto-info{flex:1;min-width:0}
.cal-pto-name{font-size:13px;font-weight:600;color:var(--text)}
.cal-pto-dates{font-size:12px;color:var(--text3)}
.cal-pto-reason{font-size:11px;color:var(--text3);font-style:italic;margin-top:2px}
.cal-pto-actions{display:flex;gap:6px;flex-shrink:0}
.cal-pto-actions button{padding:4px 12px;border-radius:var(--radius);font-size:11px;font-weight:600;cursor:pointer;border:1px solid var(--border);transition:all 0.15s}
.cal-pto-actions .approve{background:var(--green);color:#fff;border-color:var(--green)}
.cal-pto-actions .deny{background:transparent;color:var(--red);border-color:var(--red)}

/* ── Equipment timeline ── */
.cal-eq-list{display:flex;flex-direction:column;gap:6px}
.cal-eq-item{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius)}
.cal-eq-name{font-size:13px;font-weight:500;color:var(--text);min-width:140px}
.cal-eq-type{font-size:11px;color:var(--text3);min-width:80px}
.cal-eq-status{font-size:11px;padding:2px 8px;border-radius:8px;font-weight:600}
.cal-eq-status.available{background:rgba(16,185,129,0.15);color:#10b981}
.cal-eq-status.booked{background:rgba(224,148,34,0.15);color:#e09422}
.cal-eq-timeline-wrap{overflow-x:auto}
.cal-eq-timeline{min-width:600px}
.cal-eq-timeline-row{display:flex;align-items:center;height:32px;border-bottom:1px solid var(--border)}
.cal-eq-timeline-label{width:140px;font-size:12px;color:var(--text);padding:0 8px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cal-eq-timeline-track{flex:1;height:100%;position:relative;background:var(--bg3)}
.cal-eq-timeline-bar{position:absolute;top:4px;bottom:4px;border-radius:4px;background:var(--amber);opacity:0.8;cursor:pointer;font-size:9px;color:var(--bg);padding:2px 6px;white-space:nowrap;overflow:hidden}
.cal-eq-timeline-bar:hover{opacity:1}
.cal-eq-timeline-bar.conflict{background:#ef4444}

/* ── Analytics cards ── */
.cal-analytics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.cal-metric-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px}
.cal-metric-card-title{font-size:12px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px}
.cal-metric-value{font-family:var(--font-mono);font-size:28px;font-weight:700;color:var(--amber)}
.cal-metric-sub{font-size:12px;color:var(--text3);margin-top:2px}
.cal-kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px}
.cal-kpi-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:12px;text-align:center}
.cal-kpi-label{font-size:11px;color:var(--text3);margin-bottom:4px}
.cal-kpi-value{font-family:var(--font-mono);font-size:22px;font-weight:700;color:var(--text)}

/* ── Calendar sub-tabs ── */
.cal-sub-tabs{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:16px}
.cal-sub-tab{padding:8px 16px;font-size:13px;color:var(--text3);cursor:pointer;border-bottom:2px solid transparent;transition:all 0.15s;background:none;border-top:none;border-left:none;border-right:none;position:relative}
.cal-sub-tab:hover{color:var(--text)}
.cal-sub-tab.active{color:var(--amber);border-bottom-color:var(--amber);font-weight:600}

/* ── Modal overlay (reuse for calendar event form) ── */
.cal-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:999;animation:fadeIn 0.15s ease}
.cal-modal{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:560px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.4)}
.cal-modal-title{font-family:var(--font-head);font-size:18px;font-weight:700;color:var(--amber);margin-bottom:16px}
.cal-modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}
.cal-modal-actions button{padding:8px 18px;border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s}
.cal-modal-actions .primary{background:var(--amber);color:var(--bg);border:none}
.cal-modal-actions .primary:hover{box-shadow:0 2px 12px var(--amber-glow)}
.cal-modal-actions .secondary{background:transparent;color:var(--text2);border:1px solid var(--border)}

/* ── Calendar Sub-Component Styles ── */
.cal-nav-btn.active{border-color:var(--amber);color:var(--amber)}
.cal-lookahead{display:flex;flex-direction:column;gap:16px}
.cal-lookahead-controls{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.cal-lookahead-grid{display:flex;flex-direction:column;gap:12px}
.cal-lookahead-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:box-shadow 0.15s}
.cal-lookahead-card.current{border-color:var(--amber);box-shadow:0 0 0 1px var(--amber)}
.cal-lookahead-card.expanded{box-shadow:0 4px 16px rgba(0,0,0,0.15)}
.cal-lookahead-header{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;cursor:pointer;transition:background 0.15s}
.cal-lookahead-header:hover{background:var(--bg3)}
.cal-lookahead-week-label{font-size:13px;font-weight:600;color:var(--text)}
.cal-lookahead-date-range{font-size:11px;color:var(--text3)}
.cal-lookahead-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border-top:1px solid var(--border)}
.cal-lookahead-kpi{background:var(--bg2);text-align:center;padding:10px 8px}
.cal-lookahead-kpi-val{font-size:18px;font-weight:700;color:var(--text);font-family:var(--font-head)}
.cal-lookahead-kpi-lbl{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}
.cal-lookahead-detail{padding:0 14px 14px;display:flex;flex-direction:column;gap:12px}
.cal-lookahead-section{display:flex;flex-direction:column;gap:6px}
.cal-lookahead-section-title{font-size:12px;font-weight:600;color:var(--amber);text-transform:uppercase;letter-spacing:0.5px}
.cal-lookahead-item{padding:6px 10px;background:var(--bg3);border-radius:6px;border-left:3px solid var(--border)}

/* PTO */
.cal-pto{display:flex;flex-direction:column;gap:16px}
.cal-pto-nav{display:flex;gap:6px;flex-wrap:wrap}
.cal-pto-list{display:flex;flex-direction:column;gap:8px}
.cal-pto-card{padding:12px 14px;border-radius:var(--radius);background:var(--bg2);border:1px solid var(--border);display:flex;flex-direction:column;gap:8px}
.cal-pto-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.cal-pto-actions{display:flex;gap:6px;justify-content:flex-end}
.cal-pto-btn{padding:4px 14px;border-radius:var(--radius);font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border);transition:all 0.15s;background:transparent}
.cal-pto-btn.approve{background:var(--green);color:#fff;border-color:var(--green)}
.cal-pto-btn.approve:hover{box-shadow:0 2px 8px rgba(16,185,129,0.3)}
.cal-pto-btn.deny{color:var(--red);border-color:var(--red)}
.cal-pto-btn.deny:hover{background:rgba(239,68,68,0.1)}
.cal-pto-calendar{overflow-x:auto}
.cal-pto-matrix{display:grid;grid-template-columns:140px repeat(10,1fr);background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.cal-pto-matrix-header{display:contents}
.cal-pto-matrix-header>div{background:var(--bg3);padding:6px 4px;font-size:11px;font-weight:600;color:var(--text3);text-align:center;border-bottom:1px solid var(--border);border-right:1px solid var(--border)}
.cal-pto-matrix-row{display:contents}
.cal-pto-matrix-name{padding:6px 10px;font-size:12px;color:var(--text);border-bottom:1px solid var(--border);border-right:1px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center}
.cal-pto-matrix-day{text-align:center}
.cal-pto-matrix-cell{padding:6px 4px;text-align:center;font-size:11px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);color:var(--text3)}
.cal-pto-matrix-cell.off{background:rgba(100,116,139,0.15);color:#ef4444;font-weight:700}
.cal-pto-form{max-width:500px}

/* Equipment */
.cal-equipment{display:flex;flex-direction:column;gap:16px}

/* Conflicts */
.cal-conflicts{display:flex;flex-direction:column;gap:16px}

/* Analytics */
.cal-analytics{display:flex;flex-direction:column;gap:16px}

/* Event type grid in form */
.cal-event-type-grid{display:flex;flex-wrap:wrap;gap:6px}
.cal-event-type-card{padding:4px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:11px;cursor:pointer;transition:all 0.15s;background:var(--bg3);color:var(--text2)}
.cal-event-type-card:hover{border-color:var(--amber)}
.cal-event-type-card.active{border-color:var(--amber);background:rgba(224,148,34,0.1);color:var(--amber)}
.cal-checkbox-row{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text)}
.cal-multi-select{display:flex;flex-wrap:wrap;gap:4px}
.cal-multi-tag{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:var(--amber);color:var(--bg);border-radius:12px;font-size:11px;font-weight:600}
.cal-multi-tag button{background:none;border:none;color:var(--bg);cursor:pointer;font-size:14px;padding:0;line-height:1}
.cal-add-btn{background:var(--amber);color:var(--bg);border:none;padding:6px 14px;border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;white-space:nowrap}
.cal-add-btn:hover{box-shadow:0 2px 12px var(--amber-glow)}

/* Calendar filter bar */
.cal-filter-bar{display:flex;gap:6px;flex-wrap:wrap}
.cal-filter-chip{display:flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid var(--border);border-radius:16px;font-size:11px;cursor:pointer;color:var(--text3);transition:all 0.15s;white-space:nowrap}
.cal-filter-chip.active{background:rgba(var(--amber-rgb,224,148,34),0.08)}
.cal-filter-chip:hover{border-color:var(--text2)}
.cal-filter-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}

/* Day detail panel */
.cal-day-panel{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-top:12px}
.cal-day-panel-title{font-family:var(--font-head);font-size:15px;font-weight:700;color:var(--text);margin-bottom:12px}
.cal-day-section{margin-bottom:12px}
.cal-day-section-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}
.cal-day-event{display:flex;align-items:flex-start;gap:8px;padding:6px 0;cursor:pointer}
.cal-day-event:hover .cal-day-event-title{color:var(--amber)}
.cal-day-event-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px}
.cal-day-event-info{flex:1;min-width:0}
.cal-day-event-title{font-size:13px;color:var(--text)}
.cal-day-event-meta{font-size:11px;color:var(--text3)}

/* Week view */
.cal-week-grid{display:grid;grid-template-columns:60px repeat(7,1fr);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--bg2)}
.cal-week-header{padding:8px;font-size:12px;font-weight:600;color:var(--text3);text-align:center;background:var(--bg3);border-bottom:1px solid var(--border);border-right:1px solid var(--border)}
.cal-week-header.today{color:var(--amber);background:rgba(224,148,34,0.08)}
.cal-time-label{padding:4px 6px;font-size:10px;color:var(--text3);text-align:right;border-bottom:1px solid var(--border);border-right:1px solid var(--border);background:var(--bg3)}
.cal-week-cell{padding:2px 3px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);min-height:36px;font-size:10px;overflow:hidden}
.cal-week-cell.today{background:rgba(224,148,34,0.04)}
.cal-week-event{padding:1px 4px;border-radius:3px;color:#fff;font-size:9px;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}

/* Day view */
.cal-day-grid{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--bg2)}
.cal-day-row{display:grid;grid-template-columns:60px 1fr;border-bottom:1px solid var(--border)}
.cal-day-time{padding:8px 6px;font-size:10px;color:var(--text3);text-align:right;background:var(--bg3);border-right:1px solid var(--border)}
.cal-day-events{padding:4px 8px;min-height:40px}
.cal-day-event-block{padding:6px 10px;border-radius:var(--radius);color:#fff;margin-bottom:4px;cursor:pointer;font-size:12px}
.cal-day-event-time{font-size:10px;opacity:0.8}

/* Weather icon in month cell */
.cal-weather-icon{position:absolute;top:2px;right:4px;font-size:10px}
.cal-more-badge{font-size:9px;color:var(--text3)}

/* ══════════════════════════════════════════════════════════════
   JSA MODULE
   ══════════════════════════════════════════════════════════════ */
.jsa-container{display:flex;flex-direction:column;gap:16px}
.jsa-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:16px}
.jsa-kpi{background:var(--bg2);text-align:center;padding:14px 8px}
.jsa-kpi-val{font-size:22px;font-weight:700;font-family:var(--font-head)}
.jsa-kpi-lbl{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}
.jsa-trade-filter{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.jsa-list{display:flex;flex-direction:column;gap:10px}
.jsa-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;transition:border-color 0.15s}
.jsa-card:hover{border-color:var(--amber)}
.jsa-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.jsa-status-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:0.5px}
.jsa-risk-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700}
.jsa-risk-score{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;font-size:11px;font-weight:700;flex-shrink:0}
.jsa-cat-badge{display:inline-block;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:600}
.jsa-permit-badge{padding:4px 10px;border-radius:var(--radius);background:rgba(239,68,68,0.1);color:#ef4444;font-size:11px;font-weight:600;border:1px solid rgba(239,68,68,0.25)}
.jsa-detail{display:flex;flex-direction:column;gap:16px}
.jsa-detail-header{margin-bottom:8px}
.jsa-detail-meta{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--text3)}
.jsa-detail-meta span{padding:2px 0}
.jsa-risk-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:8px}
.jsa-risk-item{background:var(--bg2);text-align:center;padding:12px 8px}
.jsa-section{margin-bottom:16px}
.jsa-section-title{font-size:13px;font-weight:700;color:var(--amber);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;font-family:var(--font-head)}
.jsa-ppe-grid{display:flex;gap:12px;flex-wrap:wrap}
.jsa-ppe-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px;background:var(--bg3);border-radius:var(--radius);min-width:72px;text-align:center;border:1px solid var(--border)}
.jsa-ppe-picker{display:flex;gap:6px;flex-wrap:wrap}
.jsa-ppe-pick{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 6px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;min-width:68px;text-align:center;transition:all 0.15s}
.jsa-ppe-pick:hover{border-color:var(--text3)}
.jsa-ppe-pick.active{border-color:var(--amber);background:var(--amber-dim);box-shadow:0 0 8px var(--amber-glow)}
.jsa-step-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:10px}
.jsa-step-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.jsa-step-num{width:28px;height:28px;border-radius:50%;background:var(--amber);color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.jsa-step-text{font-size:14px;font-weight:500;color:var(--text)}
.jsa-hazard-row{padding:10px 12px;border-radius:var(--radius);margin:6px 0 6px 36px;background:var(--bg3);border:1px solid var(--border)}
.jsa-hazard-info{display:flex;flex-direction:column;gap:2px}
.jsa-controls-list{display:flex;flex-direction:column;gap:3px;margin-top:6px}
.jsa-control-item{font-size:12px;color:var(--text2);padding-left:8px}
.jsa-team-list{display:flex;flex-direction:column;gap:6px}
.jsa-team-item{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg3);border-radius:var(--radius);border:1px solid var(--border)}
.jsa-toolbox{padding:10px 14px;background:var(--bg3);border-radius:var(--radius);border-left:3px solid var(--amber)}
.jsa-near-miss{padding:8px 12px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:var(--radius);font-size:12px;color:var(--text);margin-bottom:6px}
.jsa-template-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.jsa-template-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px;cursor:pointer;transition:all 0.15s}
.jsa-template-card:hover{border-color:var(--amber);transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.2)}
.jsa-matrix{display:grid;grid-template-columns:40px repeat(5,1fr);gap:2px;max-width:360px}
.jsa-matrix-corner{font-size:10px;color:var(--text3);display:flex;align-items:center;justify-content:center;font-weight:600}
.jsa-matrix-header{font-size:11px;font-weight:600;color:var(--text3);text-align:center;padding:6px;background:var(--bg3);border-radius:4px}
.jsa-matrix-label{font-size:11px;font-weight:600;color:var(--text3);display:flex;align-items:center;justify-content:center;background:var(--bg3);border-radius:4px}
.jsa-matrix-cell{text-align:center;padding:8px;border-radius:4px;font-size:13px;font-weight:700}
.jsa-weather-warn{padding:10px 14px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius);color:#f59e0b;font-size:13px;font-weight:500;margin-bottom:12px}
.jsa-form-group{margin-bottom:16px}
.jsa-form-group label{font-size:12px;font-weight:600;color:var(--text2);display:block;margin-bottom:4px}
.jsa-create{max-width:800px}
.jsa-library{display:flex;flex-direction:column;gap:8px}
@media(max-width:768px){
  .jsa-kpis{grid-template-columns:repeat(2,1fr)}
  .jsa-risk-summary{grid-template-columns:repeat(2,1fr)}
  .jsa-template-grid{grid-template-columns:1fr}
  .jsa-ppe-picker{gap:4px}
  .jsa-ppe-pick{min-width:56px;padding:6px 4px}
  .jsa-hazard-row{margin-left:12px}
}

/* ── Submittal badges ── */
.sub-linked-badge{display:inline-flex;align-items:center;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:600;
  background:rgba(59,130,246,0.12);color:#3b82f6;border:1px solid rgba(59,130,246,0.25);white-space:nowrap;cursor:default}
.sub-linked-badge:hover{background:rgba(59,130,246,0.2)}
.sub-pdf-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:var(--radius-sm);
  font-size:11px;background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.2)}
.sub-pdf-chip:hover{background:rgba(16,185,129,0.18)}
.sub-coverage-bar{height:6px;border-radius:3px;background:var(--bg4);overflow:hidden}
.sub-coverage-fill{height:100%;border-radius:3px;transition:width 0.3s}

/* Calendar responsive ── */
@media(max-width:768px){
  .cal-toolbar{flex-direction:column;align-items:stretch;gap:8px}
  .cal-view-toggle{margin-left:0}
  .cal-month-cell{min-height:60px;padding:2px 3px}
  .cal-month-date{font-size:11px}
  .cal-event-chip{font-size:9px;padding:1px 3px}
  .cal-filter-bar{overflow-x:auto;flex-wrap:nowrap}
  .cal-analytics-grid{grid-template-columns:1fr}
  .cal-kpi-row{grid-template-columns:repeat(2,1fr)}
  .cal-modal{width:95%;padding:16px}
}
@media(max-width:480px){
  .cal-month-cell{min-height:44px}
  .cal-events-wrap{display:none}
  .cal-month-cell.has-events::after{content:'';position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:50%;background:var(--amber)}
}

/* ══ BID CALENDAR ══ */
.bidcal-wrap{display:flex;gap:16px;margin-top:8px}
.bidcal-main{flex:1;min-width:0}
.bidcal-sidebar{width:280px;flex-shrink:0}
.bidcal-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.bidcal-nav{display:flex;align-items:center;gap:6px}
.bidcal-nav button{background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:5px 12px;border-radius:var(--radius-sm);cursor:pointer;font-size:13px;transition:all 0.15s}
.bidcal-nav button:hover{border-color:var(--amber);color:var(--amber)}
.bidcal-month-title{font-family:var(--font-head);font-size:17px;font-weight:700;color:var(--text);min-width:160px;text-align:center}
.bidcal-today-btn{background:var(--amber);color:var(--bg);border:none;padding:5px 12px;border-radius:var(--radius-sm);cursor:pointer;font-size:12px;font-weight:600;transition:all 0.15s}
.bidcal-today-btn:hover{box-shadow:0 2px 10px var(--amber-glow)}
.bidcal-grid{display:grid;grid-template-columns:repeat(7,1fr);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.bidcal-hdr{padding:8px 4px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);font-weight:600;background:var(--bg3);border-bottom:1px solid var(--border)}
.bidcal-cell{min-height:90px;padding:4px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--bg2);position:relative;cursor:pointer;transition:background 0.12s}
.bidcal-cell:nth-child(7n){border-right:none}
.bidcal-cell:hover{background:var(--bg3)}
.bidcal-cell.outside{opacity:0.35}
.bidcal-cell.today{background:var(--amber-dim);box-shadow:inset 0 0 0 2px var(--amber)}
.bidcal-cell.selected{background:var(--blue-dim);box-shadow:inset 0 0 0 2px var(--blue)}
.bidcal-day{font-size:11px;font-weight:600;color:var(--text2);margin-bottom:2px;display:flex;align-items:center;gap:4px}
.bidcal-cell.today .bidcal-day{color:var(--amber);font-weight:700}
.bidcal-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.bidcal-evt{font-size:9px;padding:1px 4px;border-radius:3px;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4;cursor:pointer}
.bidcal-evt:hover{filter:brightness(1.2)}
.bidcal-evt.bid-due{background:var(--amber-dim);color:var(--amber);border-left:2px solid var(--amber)}
.bidcal-evt.site-walk{background:var(--blue-dim);color:var(--blue);border-left:2px solid var(--blue)}
.bidcal-evt.pre-bid{background:var(--green-dim);color:var(--green);border-left:2px solid var(--green)}
.bidcal-evt.plan-review{background:rgba(139,92,246,0.10);color:#8b5cf6;border-left:2px solid #8b5cf6}
.bidcal-evt.follow-up{background:var(--red-dim);color:var(--red);border-left:2px solid var(--red)}
.bidcal-evt.status-awarded{background:var(--green-dim);color:var(--green);border-left:2px solid var(--green)}
.bidcal-evt.status-lost{background:var(--red-dim);color:var(--red);border-left:2px solid var(--red)}
.bidcal-evt.status-nobid{background:rgba(100,116,139,0.10);color:#64748b;border-left:2px solid #64748b}
.bidcal-more{font-size:9px;color:var(--text3);cursor:pointer;padding:0 4px}
.bidcal-more:hover{color:var(--amber)}
.bidcal-sidebar-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px}
.bidcal-sidebar-title{font-family:var(--font-head);font-size:14px;font-weight:600;color:var(--text);margin-bottom:10px}
.bidcal-upcoming-item{padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:6px;cursor:pointer;transition:all 0.15s}
.bidcal-upcoming-item:hover{border-color:var(--amber-dim);background:var(--bg3)}
.bidcal-day-detail{padding:14px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);margin-top:12px}
.bidcal-day-detail-title{font-family:var(--font-head);font-size:14px;font-weight:600;margin-bottom:10px;color:var(--text)}
.bidcal-detail-item{padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:6px;cursor:pointer;transition:all 0.15s}
.bidcal-detail-item:hover{border-color:var(--amber-dim);background:var(--bg3)}
@media(max-width:900px){
  .bidcal-wrap{flex-direction:column}
  .bidcal-sidebar{width:100%}
}
@media(max-width:600px){
  .bidcal-cell{min-height:50px}
  .bidcal-evt{display:none}
  .bidcal-cell .bidcal-day .bidcal-dot{display:inline-block}
}

/* ── PHASE 8: EMPLOYEE PORTAL ── */
.home-clock-hero{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:120px;gap:var(--space-2);cursor:pointer}
.home-clock-status{font-size:var(--text-display);font-weight:var(--weight-bold);line-height:var(--leading-tight);color:var(--text)}
.home-clock-status.active{color:var(--green)}
.home-clock-elapsed{font-size:var(--text-base);font-weight:var(--weight-normal);line-height:var(--leading-normal);color:var(--text2)}
.home-stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2)}
.home-alerts-section{display:flex;flex-direction:column;gap:var(--space-3)}
.home-alerts-header{display:flex;justify-content:space-between;align-items:center}
.home-project-card{cursor:pointer}
.section-label{font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--text3);text-transform:uppercase;letter-spacing:0.08em}
.week-strip{display:flex;overflow-x:hidden;gap:var(--space-2);padding:var(--space-2) 0;touch-action:pan-x}
.week-day-cell{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:40px;min-height:40px;border-radius:var(--radius-sm);cursor:pointer;flex:1;background:none;border:none;color:var(--text3);font-family:var(--font-body)}
.week-day-cell.today{background:rgba(255,127,33,0.15);color:var(--accent)}
.week-day-cell.selected{background:var(--bg3);color:var(--text)}
.week-day-abbr{font-size:var(--text-sm);font-weight:var(--weight-bold);text-transform:uppercase;letter-spacing:0.08em}
.week-day-num{font-size:var(--text-lg);font-weight:var(--weight-bold)}
.week-day-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);margin:2px auto 0}
.schedule-offline-notice{font-size:var(--text-sm);color:var(--text3);text-align:center;padding:var(--space-2)}
.cred-list{display:flex;flex-direction:column;gap:var(--space-3)}
.sheet-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200}
.sheet-container{position:fixed;bottom:0;left:0;right:0;background:var(--bg2);border-radius:var(--radius) var(--radius) 0 0;padding:var(--space-4);transform:translateY(100%);transition:transform var(--transition-state);z-index:201}
.sheet-container.open{transform:translateY(0)}
.sheet-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)}
.sheet-form{display:flex;flex-direction:column;gap:var(--space-3)}
.view-all-link{font-size:var(--text-sm);color:var(--accent);background:none;border:none;cursor:pointer;padding:var(--space-1) var(--space-2);min-height:var(--touch-min);display:inline-flex;align-items:center;font-family:var(--font-body)}
`;
