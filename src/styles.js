export const CSS = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --shell:#354A5E;--shell-dark:#223548;--shell-hover:rgba(255,255,255,.1);
  --bg:#EFF1F2;--surf:#fff;--surf2:#F5F6F7;--surf3:#EBECEE;
  --bord:#D9DBDD;--bord2:#C2C4C7;
  --acc:#0070F2;--acc-d:#0064D9;--acc-l:#E8F3FF;
  --success:#107E3E;--success-l:#F1FBF1;
  --error:#BB0000;--error-l:#FFF1F1;
  --warn:#E9730C;--warn-l:#FFF8F1;
  --purple:#6A2382;--purple-l:#F4ECF7;
  --text:#32363A;--text2:#515456;--muted:#89919A;--subtle:#BEC1C3;
  --font:'IBM Plex Sans',system-ui,sans-serif;--mono:'IBM Plex Mono',monospace;
  --r:4px;--r-md:8px;--r-lg:12px;
  --sh:0 1px 4px rgba(0,0,0,.10);--sh-md:0 2px 8px rgba(0,0,0,.12);--sh-lg:0 8px 24px rgba(0,0,0,.16);
  --sidebar-w:240px;
}
html,body{height:100%;background:var(--bg);color:var(--text);font-family:var(--font);font-size:14px;line-height:1.5}
#root{height:100%}
input,select,button,textarea{font-family:var(--font)}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:var(--bord2);border-radius:3px}

/* â”€â”€ WEB LAYOUT â”€â”€ */
.web-app{height:100vh;display:flex;flex-direction:column;overflow:hidden}

/* Shell bar (top) */
.shell{height:48px;background:var(--shell);display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0;border-bottom:1px solid var(--shell-dark);z-index:100;position:relative}
.shell-logo{width:28px;height:28px;background:var(--acc);border-radius:var(--r);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.shell-logo svg{width:16px;height:16px;fill:#fff}
.shell-title{font-size:14px;font-weight:600;color:#fff;letter-spacing:.1px}
.shell-sep{width:1px;height:20px;background:rgba(255,255,255,.2);flex-shrink:0}
.shell-context{font-size:12px;color:rgba(255,255,255,.65)}
.shell-right{margin-left:auto;display:flex;align-items:center;gap:8px}
.shell-user{display:flex;align-items:center;gap:8px;color:rgba(255,255,255,.8);font-size:12px}
.shell-avatar{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff}
.shell-btn{background:transparent;border:none;cursor:pointer;padding:6px 10px;border-radius:var(--r);color:rgba(255,255,255,.75);font-size:12px;transition:background .15s}
.shell-btn:hover{background:var(--shell-hover);color:#fff}

/* Body = sidebar + content */
.web-body{flex:1;display:flex;overflow:hidden}

/* Sidebar */
.sidebar{width:var(--sidebar-w);background:var(--surf);border-right:1px solid var(--bord);display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}
.sidebar-section{padding:8px 0}
.sidebar-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);padding:6px 16px 4px}
.sidebar-item{display:flex;align-items:center;gap:10px;padding:9px 16px;cursor:pointer;font-size:13px;color:var(--text2);transition:all .12s;border-left:3px solid transparent}
.sidebar-item:hover{background:var(--surf2);color:var(--text)}
.sidebar-item.active{background:var(--acc-l);color:var(--acc);border-left-color:var(--acc);font-weight:600}
.sidebar-item svg{width:16px;height:16px;flex-shrink:0;stroke:currentColor}
.sidebar-footer{padding:12px 16px;border-top:1px solid var(--bord);margin-top:auto}

/* Content area */
.content{flex:1;overflow-y:auto;display:flex;flex-direction:column}
.content-header{background:var(--surf);border-bottom:1px solid var(--bord);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.content-title{font-size:18px;font-weight:700;color:var(--text)}
.content-sub{font-size:12px;color:var(--muted);margin-top:2px}
.content-body{padding:20px 24px;flex:1}

/* â”€â”€ RESPONSIVE GRID COMPONENTS â”€â”€ */
.dash-charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
.ca-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}

/* â”€â”€ MOBILE BREAKPOINT 768px â”€â”€ */
@media(max-width:768px){
  /* Layout */
  .sidebar{display:none}
  .web-body{flex-direction:column}
  .content-body{padding:12px;padding-bottom:104px}
  .content-header{padding:12px 16px;flex-wrap:wrap;gap:10px}
  .mobile-nav{display:flex}
  .content-title{font-size:16px}
  /* Shell: hide desktop-only items */
  .shell-quick-btns{display:none!important}
  .shell-sep{display:none}
  .shell-context{display:none}
  /* FAB: above bottom nav */
  .doc-fab{bottom:80px!important}
  /* Charts & CA grids: single column */
  .dash-charts-grid{grid-template-columns:1fr}
  .ca-grid{grid-template-columns:1fr}
  /* Toasts: full width */
  .toast-wrap{left:12px;right:12px;top:56px}
  .toast{font-size:12px;padding:8px 14px}
}
@media(min-width:769px){
  .mobile-nav{display:none}
}

/* â”€â”€ SMALL SCREEN 600px â”€â”€ */
@media(max-width:600px){
  /* Panel: full-screen slide */
  .panel{max-width:100%;border-radius:0;height:100%;height:100dvh}
  .panel-overlay{justify-content:stretch;align-items:stretch}
  /* Grids collapse */
  .grid2,.grid3{grid-template-columns:1fr}
  /* Tiles: 2 cols on mobile */
  .tiles{grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
  .tile{padding:14px 12px}
  .tile-val{font-size:22px}
  .tile-icon{font-size:20px;margin-bottom:6px}
  /* Reason & meta grids collapse */
  .rsn-grid{grid-template-columns:1fr}
  .doc-meta-grid{grid-template-columns:1fr}
  /* Spacing adjustments */
  .card-body{padding:12px}
  .panel-body{padding:14px}
  .fs-body{padding:12px 10px}
  /* Content header actions row */
  .content-header>div:last-child{display:flex;flex-wrap:wrap;gap:8px;width:100%}
}

/* â”€â”€ iOS INPUT ZOOM PREVENTION â”€â”€ */
@media(max-width:768px){
  .inp,.sel{font-size:16px!important}
}

/* â”€â”€ TOUCH TARGET MINIMUM â”€â”€ */
@media(max-width:768px){
  .btn{min-height:44px}
  .btn-sm{min-height:36px}
  .btn-ico{width:40px;height:40px}
}

/* â”€â”€ MOBILE BOTTOM NAV */
.mob-tab span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:54px}

/* Mobile bottom nav */
.mobile-nav{position:fixed;bottom:0;left:0;right:0;background:var(--shell);border-top:1px solid var(--shell-dark);display:none;z-index:90;padding-bottom:env(safe-area-inset-bottom,0)}
.mob-nav-tabs{display:flex;height:52px}
.mob-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;border-top:3px solid transparent}
.mob-tab svg{width:20px;height:20px;stroke:rgba(255,255,255,.5)}
.mob-tab span{font-size:9px;color:rgba(255,255,255,.5);font-weight:600;text-transform:uppercase;letter-spacing:.4px}
.mob-tab.on{border-top-color:var(--acc)}.mob-tab.on svg{stroke:#fff}.mob-tab.on span{color:#fff}
.mob-actions{display:flex;border-top:1px solid rgba(255,255,255,.1)}
.mob-act{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;font-size:12px;font-weight:600;cursor:pointer;border:none}
.mob-act-bl{background:var(--acc);color:#fff}
.mob-act-br{background:#C0392B;color:#fff}

/* â”€â”€ FORMS â”€â”€ */
.field{display:flex;flex-direction:column;gap:4px;margin-bottom:14px}
.field:last-child{margin-bottom:0}
.lbl{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.inp{background:var(--surf);border:1px solid var(--bord2);border-radius:var(--r);padding:9px 12px;font-size:14px;color:var(--text);outline:none;width:100%;transition:border-color .15s,box-shadow .15s}
.inp:focus{border-color:var(--acc);box-shadow:0 0 0 2px rgba(0,112,242,.12)}
.inp.ai{border-color:var(--purple);background:var(--purple-l)}
.inp.err{border-color:var(--error)}
.sel{background:var(--surf);border:1px solid var(--bord2);border-radius:var(--r);padding:9px 12px;font-size:14px;color:var(--text);outline:none;width:100%;appearance:none;-webkit-appearance:none}
.sel:focus{border-color:var(--acc);box-shadow:0 0 0 2px rgba(0,112,242,.12)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
@media(max-width:600px){.grid2,.grid3{grid-template-columns:1fr}}

/* FILTERS ROW - compact and emphasized for Stock filters */
.filters-row{display:grid;grid-template-columns:auto auto auto;gap:6px;align-items:end}
.filters-row .field{margin-bottom:0}
.filters-row .lbl{color:var(--acc);font-weight:700;text-transform:none;font-size:12px}
.filters-row .inp{padding:8px 10px;font-weight:700;background:var(--surf2);border:1px solid var(--bord);min-width:120px;box-shadow:0 1px 0 rgba(0,0,0,0.03)}
@media(max-width:800px){.filters-row{grid-template-columns:1fr 1fr;align-items:stretch}}

/* â”€â”€ BUTTONS â”€â”€ */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 20px;border-radius:var(--r);font-size:14px;font-weight:600;cursor:pointer;border:1px solid transparent;transition:all .15s;letter-spacing:.1px;min-height:40px}
.btn-w{width:100%}
.btn-acc{background:var(--acc);color:#fff;border-color:var(--acc-d)}.btn-acc:hover{background:var(--acc-d)}
.btn-ghost{background:var(--surf);color:var(--acc);border-color:var(--acc)}.btn-ghost:hover{background:var(--acc-l)}
.btn-neutral{background:var(--surf);color:var(--text);border-color:var(--bord2)}.btn-neutral:hover{background:var(--surf2)}
.btn-neg{background:var(--surf);color:var(--error);border-color:var(--error)}.btn-neg:hover{background:var(--error-l)}
.btn-success{background:var(--success);color:#fff}.btn-success:hover{opacity:.9}
.btn-sm{padding:6px 14px;font-size:12px;min-height:32px}
.btn-lg{padding:12px 28px;font-size:15px;min-height:48px}
.btn-ico{width:36px;height:36px;min-height:unset;padding:0;border-radius:var(--r);background:var(--surf);border:1px solid var(--bord2);cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.btn-ico svg{stroke:var(--muted);width:16px;height:16px}
.btn-ico:hover{border-color:var(--acc)}.btn-ico:hover svg{stroke:var(--acc)}
.btn-loading{opacity:.6;pointer-events:none}

/* â”€â”€ CARDS â”€â”€ */
.card{background:var(--surf);border:1px solid var(--bord);border-radius:var(--r-md);box-shadow:var(--sh)}
.card-header{padding:14px 18px;border-bottom:1px solid var(--bord);display:flex;align-items:center;justify-content:space-between}
.card-header-title{font-size:14px;font-weight:700;color:var(--text)}
.card-body{padding:18px}
.card-footer{padding:12px 18px;border-top:1px solid var(--bord);background:var(--surf2);border-radius:0 0 var(--r-md) var(--r-md);display:flex;justify-content:flex-end;gap:8px}

/* â”€â”€ TILES â”€â”€ */
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px}
.tile{background:var(--surf);border:1px solid var(--bord);border-radius:var(--r-md);padding:18px;cursor:pointer;position:relative;overflow:hidden;box-shadow:var(--sh);transition:box-shadow .15s}
.tile:hover{box-shadow:var(--sh-md)}
.tile-stripe{position:absolute;top:0;left:0;right:0;height:4px}
.tile-icon{font-size:24px;margin-bottom:10px}
.tile-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}
.tile-val{font-size:32px;font-weight:700;font-family:var(--mono);margin:4px 0 2px;line-height:1}
.tile-sub{font-size:11px;color:var(--muted)}

/* â”€â”€ STATUS â”€â”€ */
.st{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:100px}
.st::before{content:'';width:6px;height:6px;border-radius:50%;flex-shrink:0}
.st-info{background:var(--acc-l);color:var(--acc)}.st-info::before{background:var(--acc)}
.st-ok{background:var(--success-l);color:var(--success)}.st-ok::before{background:var(--success)}
.st-err{background:var(--error-l);color:var(--error)}.st-err::before{background:var(--error)}
.st-warn{background:var(--warn-l);color:var(--warn)}.st-warn::before{background:var(--warn)}
.st-muted{background:var(--surf3);color:var(--muted)}.st-muted::before{background:var(--muted)}
.st-purple{background:var(--purple-l);color:var(--purple)}.st-purple::before{background:var(--purple)}

/* â”€â”€ TABLE â”€â”€ */
.tbl-wrap{border:1px solid var(--bord);border-radius:var(--r-md);overflow:hidden;overflow-x:auto;-webkit-overflow-scrolling:touch}
.tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:480px}
.tbl thead{background:var(--shell)}
.tbl th{color:rgba(255,255,255,.9);padding:10px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.6px;font-weight:600;white-space:nowrap}
.tbl td{padding:11px 14px;border-bottom:1px solid var(--surf3);vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:var(--surf2);cursor:pointer}
.tbl .mono-cell{font-family:var(--mono);font-size:12px}
.tbl .actions{display:flex;gap:6px;justify-content:flex-end}
.tag{background:var(--surf3);border:1px solid var(--bord);border-radius:var(--r);padding:2px 7px;font-family:var(--mono);font-size:11px;color:var(--text2)}

/* â”€â”€ FORM PANEL (slide-in sheet style) â”€â”€ */
.panel-overlay{position:fixed;inset:0;background:rgba(53,74,94,.55);z-index:200;display:flex;align-items:stretch;justify-content:flex-end;backdrop-filter:blur(2px)}
.panel{background:var(--surf);width:100%;max-width:560px;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--sh-lg)}
.panel-header{background:var(--shell);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.panel-title{font-size:16px;font-weight:700;color:#fff}
.panel-sub{font-size:11px;color:rgba(255,255,255,.65);margin-top:2px}
.panel-close{background:rgba(255,255,255,.15);border:none;border-radius:var(--r);width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.panel-close svg{stroke:#fff;width:16px;height:16px}
.panel-body{flex:1;overflow-y:auto;padding:20px}
.panel-footer{padding:14px 20px;border-top:1px solid var(--bord);background:var(--surf2);display:flex;gap:10px;justify-content:flex-end;flex-shrink:0}

/* â”€â”€ FORM SECTIONS â”€â”€ */
.fs{border:1px solid var(--bord);border-radius:var(--r-md);margin-bottom:14px;overflow:hidden}
.fs-hdr{background:var(--surf2);border-bottom:1px solid var(--bord);padding:9px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text2);display:flex;align-items:center;gap:7px}
.fs-body{padding:16px 14px}

/* â”€â”€ CAMERA â”€â”€ */
.cam-panel{position:fixed;inset:0;background:#000;z-index:300;display:flex;flex-direction:column}
.cam-bar{padding:14px 16px;display:flex;align-items:center;gap:14px;background:rgba(0,0,0,.7);flex-shrink:0}
.cam-btn{background:rgba(255,255,255,.18);border:none;border-radius:var(--r);padding:8px 14px;color:#fff;font-size:13px;font-weight:600;cursor:pointer}
.cam-vid{flex:1;object-fit:cover;width:100%;background:#111}
.cam-canvas{display:none}
.cam-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
.cam-frame{width:75%;max-width:420px;aspect-ratio:1.6;position:relative}
.cam-shade{position:absolute;inset:0;border-radius:8px;box-shadow:0 0 0 3000px rgba(0,0,0,.55)}
.cam-c{position:absolute;width:22px;height:22px}
.cam-c-tl{top:-2px;left:-2px;border-top:3px solid var(--acc);border-left:3px solid var(--acc)}
.cam-c-tr{top:-2px;right:-2px;border-top:3px solid var(--acc);border-right:3px solid var(--acc)}
.cam-c-bl{bottom:-2px;left:-2px;border-bottom:3px solid var(--acc);border-left:3px solid var(--acc)}
.cam-c-br{bottom:-2px;right:-2px;border-bottom:3px solid var(--acc);border-right:3px solid var(--acc)}
.cam-scan{position:absolute;left:6px;right:6px;height:2px;background:linear-gradient(90deg,transparent,var(--acc),transparent);animation:sc 2s ease-in-out infinite}
@keyframes sc{0%{top:6px}100%{top:calc(100% - 6px)}}
.cam-hint{color:rgba(255,255,255,.85);font-size:13px;font-weight:600;text-align:center;margin-top:14px}
.cam-bottom{position:absolute;bottom:0;left:0;right:0;padding:20px;background:linear-gradient(transparent,rgba(0,0,0,.85));display:flex;align-items:center;justify-content:center}
.shutter{width:68px;height:68px;border-radius:50%;background:#fff;border:5px solid rgba(255,255,255,.35);cursor:pointer;display:flex;align-items:center;justify-content:center}
.shutter-i{width:50px;height:50px;border-radius:50%;background:var(--acc)}
.shutter:active .shutter-i{background:var(--acc-d);transform:scale(.9)}
.cam-manual{position:absolute;bottom:calc(110px + env(safe-area-inset-bottom,0));left:16px;right:16px;display:flex;gap:8px}
.cam-manual input{flex:1;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.35);border-radius:var(--r);padding:10px 14px;color:#fff;font-size:13px;outline:none}

/* â”€â”€ AI LOADING â”€â”€ */
.ai-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;gap:16px}
.ai-orb{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--acc),var(--purple));display:flex;align-items:center;justify-content:center;animation:orb 1.8s ease infinite}
@keyframes orb{0%,100%{box-shadow:0 0 0 0 rgba(0,112,242,.4)}50%{box-shadow:0 0 0 14px rgba(0,112,242,0)}}
.ai-step-row{display:flex;align-items:center;gap:10px;padding:7px 14px;width:100%;max-width:320px;border-bottom:1px solid var(--surf3)}
.ai-step-row:last-child{border-bottom:none}
.ai-dot{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ai-dot.done{background:var(--success)}
.ai-dot.active{background:var(--acc);animation:pulse .8s ease infinite}
.ai-dot.idle{background:var(--surf3)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

/* â”€â”€ CONFIRM DOC â”€â”€ */
.doc-preview{background:#fff;border:1px solid var(--bord);border-radius:var(--r-md);overflow:hidden;margin-bottom:16px}
.doc-preview-band{height:5px}
.doc-preview-inner{padding:18px}
.doc-header-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--bord)}
.doc-meta-grid{background:var(--surf2);border:1px solid var(--bord);border-radius:var(--r);padding:10px 12px;margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.doc-meta-f{display:flex;flex-direction:column;gap:2px}
.doc-meta-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.7px;color:var(--muted);font-weight:600}
.doc-meta-val{font-size:13px;font-weight:600;color:var(--text)}

/* â”€â”€ REASON GRID â”€â”€ */
.rsn-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rsn-pill{border:1px solid var(--bord2);border-radius:var(--r);padding:10px 12px;cursor:pointer;font-size:12px;line-height:1.4;transition:all .12s;position:relative;background:var(--surf)}
.rsn-pill:hover{border-color:var(--acc);background:var(--acc-l)}
.rsn-pill.sel{border-color:var(--acc);background:var(--acc-l);color:var(--acc);font-weight:600}
.rsn-ai-tag{position:absolute;top:4px;right:4px;background:var(--purple);color:#fff;font-size:8px;font-weight:700;padding:1px 4px;border-radius:2px}

/* â”€â”€ MISC â”€â”€ */
.sep{height:1px;background:var(--bord);margin:16px 0}
.empty{text-align:center;padding:48px 24px;color:var(--muted)}
.row{display:flex;align-items:center}.row-sb{display:flex;align-items:center;justify-content:space-between}
.gap6{gap:6px}.gap8{gap:8px}.gap12{gap:12px}
.mt8{margin-top:8px}.mt12{margin-top:12px}.mt16{margin-top:16px}
.fw6{font-weight:600}.fw7{font-weight:700}
.fs11{font-size:11px}.fs12{font-size:12px}.fs13{font-size:13px}
.muted{color:var(--muted)}.mono{font-family:var(--mono)}
.sbar{height:5px;background:var(--surf3);border-radius:3px;overflow:hidden}
.sbar-fill{height:100%;transition:width .4s}
.dlc-ok{color:var(--success)}.dlc-warn{color:var(--warn)}.dlc-exp{color:var(--error)}
.spin{display:inline-block;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.toast-wrap{position:fixed;top:60px;right:20px;z-index:999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.toast{background:var(--shell);color:#fff;padding:10px 18px;border-radius:var(--r-md);font-size:13px;font-weight:600;box-shadow:var(--sh-lg);border-left:4px solid var(--acc);animation:tin .2s ease;pointer-events:auto}
.toast.toast-err{border-left-color:var(--error)}
.toast.toast-ok{border-left-color:var(--success)}
@keyframes tin{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}
.photo-thumb{width:48px;height:48px;border-radius:var(--r);object-fit:cover;border:1px solid var(--bord);flex-shrink:0}
.photo-box{width:48px;height:48px;border-radius:var(--r);background:var(--surf2);border:1px solid var(--bord);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.ai-conf-strip{background:var(--purple-l);border-bottom:1px solid rgba(106,35,130,.15);padding:10px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.ai-chip{background:var(--purple);color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:2px;flex-shrink:0}
.ai-conf-item{font-size:11px;font-weight:600;color:var(--purple)}
`;
