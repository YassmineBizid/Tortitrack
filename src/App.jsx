import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from "recharts";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
const SUPA_URL = import.meta.env?.VITE_SUPABASE_URL || "https://YOUR_PROJECT.supabase.co";
const SUPA_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "YOUR_ANON_KEY";
const sb = createClient(SUPA_URL, SUPA_KEY);

// ─── DATA HELPERS ────────────────────────────────────────────────────────────
const uid   = () => Math.random().toString(36).slice(2,8).toUpperCase();
const today = () => new Date().toISOString().split("T")[0];
const fmt   = d => d ? new Date(d).toLocaleDateString("fr-TN",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
const daysLeft = dlc => dlc ? Math.ceil((new Date(dlc)-new Date())/86400000) : null;

const RETURN_REASONS = [
  { id:"moisissure_avant_dlc_pv", label:"Moisissure avant DLC — Point de Vente", short:"Moisissure PV",     color:"#c8622a", emoji:"🍄" },
  { id:"produit_abime_client",     label:"Produit abîmé chez le client",          short:"Abîmé client",     color:"#1d6fb8", emoji:"📦" },
  { id:"produit_abime_camion",     label:"Produit abîmé dans le camion",          short:"Abîmé camion",     color:"#7c3aed", emoji:"🚛" },
  { id:"moisissure_camion",        label:"Moisissure dans le camion",             short:"Moisissure camion", color:"#b91c1c", emoji:"⚠️" },
  { id:"dlc_atteint_camion",       label:"DLC atteint dans le camion",            short:"DLC camion",       color:"#b45309", emoji:"📅" },
  { id:"dlc_atteint_pv",           label:"DLC atteint — Point de Vente",          short:"DLC PV",           color:"#065f46", emoji:"🏪" },
];

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
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

/* ── WEB LAYOUT ── */
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

/* Mobile overrides */
@media(max-width:768px){
  .sidebar{display:none}
  .web-body{flex-direction:column}
  .content-body{padding:12px}
  .content-header{padding:12px 16px}
  .mobile-nav{display:flex}
  .content-title{font-size:16px}
}
@media(min-width:769px){
  .mobile-nav{display:none}
}

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

/* ── FORMS ── */
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

/* ── BUTTONS ── */
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

/* ── CARDS ── */
.card{background:var(--surf);border:1px solid var(--bord);border-radius:var(--r-md);box-shadow:var(--sh)}
.card-header{padding:14px 18px;border-bottom:1px solid var(--bord);display:flex;align-items:center;justify-content:space-between}
.card-header-title{font-size:14px;font-weight:700;color:var(--text)}
.card-body{padding:18px}
.card-footer{padding:12px 18px;border-top:1px solid var(--bord);background:var(--surf2);border-radius:0 0 var(--r-md) var(--r-md);display:flex;justify-content:flex-end;gap:8px}

/* ── TILES ── */
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px}
.tile{background:var(--surf);border:1px solid var(--bord);border-radius:var(--r-md);padding:18px;cursor:pointer;position:relative;overflow:hidden;box-shadow:var(--sh);transition:box-shadow .15s}
.tile:hover{box-shadow:var(--sh-md)}
.tile-stripe{position:absolute;top:0;left:0;right:0;height:4px}
.tile-icon{font-size:24px;margin-bottom:10px}
.tile-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}
.tile-val{font-size:32px;font-weight:700;font-family:var(--mono);margin:4px 0 2px;line-height:1}
.tile-sub{font-size:11px;color:var(--muted)}

/* ── STATUS ── */
.st{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:100px}
.st::before{content:'';width:6px;height:6px;border-radius:50%;flex-shrink:0}
.st-info{background:var(--acc-l);color:var(--acc)}.st-info::before{background:var(--acc)}
.st-ok{background:var(--success-l);color:var(--success)}.st-ok::before{background:var(--success)}
.st-err{background:var(--error-l);color:var(--error)}.st-err::before{background:var(--error)}
.st-warn{background:var(--warn-l);color:var(--warn)}.st-warn::before{background:var(--warn)}
.st-muted{background:var(--surf3);color:var(--muted)}.st-muted::before{background:var(--muted)}
.st-purple{background:var(--purple-l);color:var(--purple)}.st-purple::before{background:var(--purple)}

/* ── TABLE ── */
.tbl-wrap{border:1px solid var(--bord);border-radius:var(--r-md);overflow:hidden}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl thead{background:var(--shell)}
.tbl th{color:rgba(255,255,255,.9);padding:10px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.6px;font-weight:600;white-space:nowrap}
.tbl td{padding:11px 14px;border-bottom:1px solid var(--surf3);vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:var(--surf2);cursor:pointer}
.tbl .mono-cell{font-family:var(--mono);font-size:12px}
.tbl .actions{display:flex;gap:6px;justify-content:flex-end}
.tag{background:var(--surf3);border:1px solid var(--bord);border-radius:var(--r);padding:2px 7px;font-family:var(--mono);font-size:11px;color:var(--text2)}

/* ── FORM PANEL (slide-in sheet style) ── */
.panel-overlay{position:fixed;inset:0;background:rgba(53,74,94,.55);z-index:200;display:flex;align-items:stretch;justify-content:flex-end;backdrop-filter:blur(2px)}
.panel{background:var(--surf);width:100%;max-width:560px;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--sh-lg)}
.panel-header{background:var(--shell);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.panel-title{font-size:16px;font-weight:700;color:#fff}
.panel-sub{font-size:11px;color:rgba(255,255,255,.65);margin-top:2px}
.panel-close{background:rgba(255,255,255,.15);border:none;border-radius:var(--r);width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.panel-close svg{stroke:#fff;width:16px;height:16px}
.panel-body{flex:1;overflow-y:auto;padding:20px}
.panel-footer{padding:14px 20px;border-top:1px solid var(--bord);background:var(--surf2);display:flex;gap:10px;justify-content:flex-end;flex-shrink:0}

/* ── FORM SECTIONS ── */
.fs{border:1px solid var(--bord);border-radius:var(--r-md);margin-bottom:14px;overflow:hidden}
.fs-hdr{background:var(--surf2);border-bottom:1px solid var(--bord);padding:9px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text2);display:flex;align-items:center;gap:7px}
.fs-body{padding:16px 14px}

/* ── CAMERA ── */
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

/* ── AI LOADING ── */
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

/* ── CONFIRM DOC ── */
.doc-preview{background:#fff;border:1px solid var(--bord);border-radius:var(--r-md);overflow:hidden;margin-bottom:16px}
.doc-preview-band{height:5px}
.doc-preview-inner{padding:18px}
.doc-header-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--bord)}
.doc-meta-grid{background:var(--surf2);border:1px solid var(--bord);border-radius:var(--r);padding:10px 12px;margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.doc-meta-f{display:flex;flex-direction:column;gap:2px}
.doc-meta-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.7px;color:var(--muted);font-weight:600}
.doc-meta-val{font-size:13px;font-weight:600;color:var(--text)}

/* ── REASON GRID ── */
.rsn-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rsn-pill{border:1px solid var(--bord2);border-radius:var(--r);padding:10px 12px;cursor:pointer;font-size:12px;line-height:1.4;transition:all .12s;position:relative;background:var(--surf)}
.rsn-pill:hover{border-color:var(--acc);background:var(--acc-l)}
.rsn-pill.sel{border-color:var(--acc);background:var(--acc-l);color:var(--acc);font-weight:600}
.rsn-ai-tag{position:absolute;top:4px;right:4px;background:var(--purple);color:#fff;font-size:8px;font-weight:700;padding:1px 4px;border-radius:2px}

/* ── MISC ── */
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

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Ico = ({n,size=16,stroke="currentColor"}) => {
  const P={
    truck:"M1 3h15v13H1z M16 8h4l3 3v5h-7V8z",
    ret:"M1 4v6h6 M3.51 15a9 9 0 1 0 .49-3.45",
    home:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
    dash:"M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
    plus:"M12 5v14 M5 12h14",x:"M18 6L6 18 M6 6l12 12",chk:"M20 6L9 17l-5-5",
    cam:"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
    print:"M6 9V2h12v7 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z",
    trash:"M3 6h18 M19 6l-1 14H6L5 6 M10 11v6 M14 11v6 M9 6V4h6v2",
    edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
    settings:"M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    send:"M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z",
    box:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
    logout:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
    warn:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
    refresh:"M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  };
  const segs=(P[n]||"").split(" M ").map((s,i)=>i===0?s:"M "+s);
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{segs.map((d,i)=><path key={i} d={d}/>)}</svg>;
};

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toasts({toasts}){
  return <div className="toast-wrap">{toasts.map(t=><div key={t.id} className={`toast ${t.type==="err"?"toast-err":t.type==="ok"?"toast-ok":""}`}>{t.msg}</div>)}</div>;
}
function useToasts(){
  const [toasts,setToasts]=useState([]);
  const add=useCallback((msg,type="info")=>{
    const id=Date.now();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200);
  },[]);
  return[toasts,add];
}

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
async function uploadPhoto(base64,name){
  const b64=base64.includes(",")?base64.split(",")[1]:base64;
  const bin=atob(b64),arr=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
  const blob=new Blob([arr],{type:"image/jpeg"});
  const path=`${new Date().getFullYear()}/${name}`;
  const{error}=await sb.storage.from("product-photos").upload(path,blob,{contentType:"image/jpeg",upsert:false});
  if(error)throw error;
  const{data:{publicUrl}}=sb.storage.from("product-photos").getPublicUrl(path);
  return{path,url:publicUrl};
}

async function callAI(imageB64,prompt){
  const session=(await sb.auth.getSession()).data.session;
  const token=session?.access_token;
  const res=await fetch(`${SUPA_URL}/functions/v1/ai-analyze`,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
    body:JSON.stringify({image_b64:imageB64.includes(",")?imageB64.split(",")[1]:imageB64,prompt})
  });
  if(!res.ok)throw new Error("AI error "+res.status);
  const{result}=await res.json();
  return result;
}

function buildPrompt(products,isBR){
  const cat=products.map(p=>`${p.ref}|${p.barcode||p.code}|${p.name}`).join("; ");
  const rsn=RETURN_REASONS.map(r=>`${r.id}:${r.label}`).join("; ");
  return `Expert FMCG avec capacités OCR. Analyse cette photo de produit alimentaire BT Food Industry.
Catalogue: ${cat}
Extrais: nom du produit, code-barres EAN, DLC (Date Limite Consommation), DF (Date Fabrication), numéro de lot.${isBR?`\nIdentifie aussi la cause de retour parmi: ${rsn}`:""}
JSON UNIQUEMENT:
{"ref":"<ref catalogue>","code":"<EAN>","name":"<nom>","dlc":"<YYYY-MM-DD>","df":"<YYYY-MM-DD>","lot":"<lot>","product_conf":<0-100>,"dates_conf":<0-100>${isBR?',"reason":"<id>","cause_conf":<0-100>,"defect":"<défaut visible>"':""}}
Mettre null si non visible.`;
}


// ─── EXCEL EXPORT (SheetJS CDN) ──────────────────────────────────────────────
async function loadXLSX(){
  if(window.XLSX)return window.XLSX;
  return new Promise((res,rej)=>{
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload=()=>res(window.XLSX);s.onerror=rej;
    document.head.appendChild(s);
  });
}

async function exportToExcel(bls,brs,gmEmail){
  const XLSX=await loadXLSX();
  const wb=XLSX.utils.book_new();

  // Sheet 1: Bons de Livraison
  const blRows=[["N° BL","Date","Vendeur","Véhicule","Référence","Article","Code-barres","N° Lot","Date Fabrication","DLC","Jours restants","Quantité","Photo URL","Analysé IA","Statut"]];
  for(const d of bls){
    const lines=(d.delivery_lines||[]);
    for(const l of lines){
      const dv=l.expiry_date?Math.ceil((new Date(l.expiry_date)-new Date())/86400000):null;
      blRows.push([d.number,d.date,d.vendor_snapshot?.name||"",d.vendor_snapshot?.vehicle_plate||"",l.product_ref||"",l.product_name||"",l.barcode||"",l.lot_number||"",l.manufacture_date||"",l.expiry_date||"",dv!==null?dv:"",l.quantity||0,l.photo_url||"",l.ai_analyzed?"Oui":"Non",d.status||"validé"]);
    }
  }
  const wsBL=XLSX.utils.aoa_to_sheet(blRows);
  wsBL["!cols"]=[{wch:18},{wch:12},{wch:20},{wch:14},{wch:12},{wch:30},{wch:16},{wch:12},{wch:14},{wch:12},{wch:14},{wch:8},{wch:60},{wch:10},{wch:10}];
  XLSX.utils.book_append_sheet(wb,wsBL,"Bons de Livraison");

  // Sheet 2: Bons de Retour
  const brRows=[["N° BR","Date","Vendeur","Véhicule","Client","Référence","Article","Code-barres","N° Lot","Date Fabrication","DLC","Quantité","Cause de Retour","Défaut Détecté","Indice Confiance IA","Photo URL","Statut"]];
  for(const d of brs){
    const lines=(d.return_lines||[]);
    for(const l of lines){
      const rsn=RETURN_REASONS.find(r=>r.id===l.reason);
      brRows.push([d.number,d.date,d.vendor_snapshot?.name||"",d.vendor_snapshot?.vehicle_plate||"",d.client_name||"",l.product_ref||"",l.product_name||"",l.barcode||"",l.lot_number||"",l.manufacture_date||"",l.expiry_date||"",l.quantity||0,rsn?.label||l.reason||"",l.ai_explanation||"",l.ai_confidence!=null?l.ai_confidence+"%":"",l.photo_url||"",d.status||"validé"]);
    }
  }
  const wsBR=XLSX.utils.aoa_to_sheet(brRows);
  wsBR["!cols"]=[{wch:18},{wch:12},{wch:20},{wch:14},{wch:20},{wch:12},{wch:30},{wch:16},{wch:12},{wch:14},{wch:12},{wch:8},{wch:35},{wch:40},{wch:12},{wch:60},{wch:10}];
  XLSX.utils.book_append_sheet(wb,wsBR,"Bons de Retour");

  // Sheet 3: Summary
  const summaryRows=[
    ["RAPPORT MODULE SORTIE & RETOUR PF — BT FOOD INDUSTRY"],
    ["Généré le",new Date().toLocaleString("fr-TN")],
    ["Email destinataire",gmEmail],[""],
    ["BONS DE LIVRAISON"],
    ["Total BL",bls.length],
    ["Total unités chargées",bls.reduce((s,d)=>(d.delivery_lines||[]).reduce((a,l)=>a+(l.quantity||0),0)+s,0)],[""],
    ["BONS DE RETOUR"],
    ["Total BR",brs.length],
    ["Total unités retournées",brs.reduce((s,d)=>(d.return_lines||[]).reduce((a,l)=>a+(l.quantity||0),0)+s,0)],[""],
    ["MOTIFS DE RETOUR"],
    ...RETURN_REASONS.map(r=>{const cnt=brs.reduce((s,d)=>(d.return_lines||[]).filter(l=>l.reason===r.id).reduce((a,l)=>a+(l.quantity||0),0)+s,0);return[r.label,cnt];}),
  ];
  const wsSum=XLSX.utils.aoa_to_sheet(summaryRows);
  wsSum["!cols"]=[{wch:40},{wch:20}];
  XLSX.utils.book_append_sheet(wb,wsSum,"Résumé");

  // Download
  const date=new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb,`BTFI_Sortie_Retour_${date}.xlsx`);
  return true;
}

async function exportAndEmail(bls,brs,gmEmail,toast){
  try{
    toast("📊 Génération du fichier Excel…","info");
    await exportToExcel(bls,brs,gmEmail);
    // Open email client with instructions
    const subj=encodeURIComponent(`[BTFI] Rapport Excel — ${new Date().toLocaleDateString("fr-TN")}`);
    const body=encodeURIComponent(`Bonjour,\n\nVeuillez trouver en pièce jointe le rapport complet Module Sortie & Retour PF.\n\nDate: ${new Date().toLocaleDateString("fr-TN")}\nBL: ${bls.length} document(s)\nBR: ${brs.length} document(s)\n\nBT Food Industry · MF 1887237 G.A.M 000`);
    window.location.href=`mailto:${gmEmail}?subject=${subj}&body=${body}`;
    toast("✅ Excel téléchargé — joindre à l'email ouvert","ok");
  }catch(e){toast("Erreur export: "+e.message,"err");}
}


// ─── DOCUMENT QUICK ACCESS FAB ────────────────────────────────────────────────
// Always visible floating button to access recent documents
function DocQuickAccess({gmEmail,toast}){
  const[open,setOpen]=useState(false);
  const[recent,setRecent]=useState([]);
  const[viewDoc,setViewDoc]=useState(null);

  useEffect(()=>{
    if(!open)return;
    Promise.all([
      sb.from("delivery_orders").select("id,number,date,vendor_snapshot,status").neq("status","draft").order("created_at",{ascending:false}).limit(5),
      sb.from("return_orders").select("id,number,date,vendor_snapshot,client_name,status").neq("status","draft").order("created_at",{ascending:false}).limit(5),
    ]).then(([{data:bls},{data:brs}])=>{
      const all=[...(bls||[]).map(d=>({...d,type:"BL"})),...(brs||[]).map(d=>({...d,type:"BR"}))];
      all.sort((a,b)=>new Date(b.created_at||b.date)-new Date(a.created_at||a.date));
      setRecent(all.slice(0,8));
    });
  },[open]);

  const openDoc=async(d)=>{
    const isBL=d.type==="BL";
    const{data}=await sb.from(isBL?"delivery_orders":"return_orders")
      .select(`*, ${isBL?"delivery_lines(*)":"return_lines(*)"}`)
      .eq("id",d.id).single();
    setViewDoc({...data,type:d.type});
    setOpen(false);
  };

  return(
    <>
      <div className="doc-fab no-print">
        {open&&(
          <div className="doc-fab-menu">
            <div className="doc-fab-header">
              <span style={{color:"#fff",fontWeight:700,fontSize:13}}>📄 Documents récents</span>
              <button onClick={()=>setOpen(false)} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:4,color:"#fff",cursor:"pointer",padding:"2px 8px",fontSize:12}}>✕</button>
            </div>
            {!recent.length&&<div style={{padding:16,textAlign:"center",color:"var(--muted)",fontSize:13}}>Aucun document</div>}
            {recent.map(d=>(
              <div key={d.id} className="doc-fab-item" onClick={()=>openDoc(d)}>
                <span style={{fontSize:18}}>{d.type==="BL"?"🚛":"↩️"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.vendor_snapshot?.name||"—"}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>{d.number} · {fmt(d.date)}</div>
                </div>
                <span className={`st ${d.type==="BL"?"st-info":"st-err"}`} style={{fontSize:10}}>{d.type}</span>
              </div>
            ))}
          </div>
        )}
        <button className="doc-fab-btn" onClick={()=>setOpen(o=>!o)} title="Documents récents">
          {open?"✕":"📄"}
        </button>
      </div>

      {/* Full document viewer */}
      {viewDoc&&<FullDocViewer doc={viewDoc} gmEmail={gmEmail} toast={toast} onClose={()=>setViewDoc(null)}/>}
    </>
  );
}

// ─── FULL DOCUMENT VIEWER ─────────────────────────────────────────────────────
function FullDocViewer({doc,gmEmail,toast,onClose}){
  const isBL=doc.type==="BL";
  const lines=isBL?(doc.delivery_lines||[]):(doc.return_lines||[]);
  const totalQty=lines.reduce((s,l)=>s+(l.quantity||0),0);

  const sendEmail=()=>{
    const subj=encodeURIComponent(`[BTFI] ${doc.type} ${doc.number} — ${doc.vendor_snapshot?.name} — ${fmt(doc.date)}`);
    const lineText=lines.map((l,i)=>{const r=RETURN_REASONS.find(x=>x.id===l.reason);return`${i+1}. [${l.product_ref}] ${l.product_name}\n   Lot:${l.lot_number||"—"} | DLC:${fmt(l.expiry_date||l.dlc)} | Qté:${l.quantity}${r?" | "+r.label:""}${l.photo_url?"\n   Photo: "+l.photo_url:""}`;}).join("\n");
    const body=encodeURIComponent(`BT Food Industry — ${isBL?"BON DE LIVRAISON":"BON DE RETOUR"}\n${"═".repeat(44)}\nN°:${doc.number} | Date:${fmt(doc.date)}\nVendeur:${doc.vendor_snapshot?.name} | ${doc.vendor_snapshot?.vehicle_plate||""}\n${doc.client_name?`Client:${doc.client_name}\n`:""}\nARTICLES (${totalQty} u):\n${lineText}\n\nBTFI Module Sortie & Retour PF · MF 1887237 G.A.M 000`);
    window.location.href=`mailto:${gmEmail}?subject=${subj}&body=${body}`;
    toast("📧 Email ouvert","ok");
  };

  const print=()=>window.print();

  return(
    <div className="panel-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">{isBL?"Bon de Livraison":"Bon de Retour"}</div>
            <div className="panel-sub" style={{fontFamily:"var(--mono)"}}>{doc.number} · {fmt(doc.date)}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span className={`st ${isBL?"st-info":"st-err"}`}>{totalQty} u</span>
            <button className="panel-close" onClick={onClose}><Ico n="x" size={16} stroke="#fff"/></button>
          </div>
        </div>
        <div className="panel-body">
          {/* Document */}
          <div className="doc-preview">
            <div className="doc-preview-band" style={{background:isBL?"var(--acc)":"var(--error)"}}/>
            <div className="doc-preview-inner">
              <div className="doc-header-row">
                <div><div style={{fontWeight:800,fontSize:15,color:"var(--acc)"}}>BT FOOD INDUSTRY</div><div style={{fontSize:11,color:"var(--muted)"}}>16, Rue Annaba – Z.I. Ben Arous 2013 · Tél: 70 026 600</div></div>
                <div style={{textAlign:"right"}}><div style={{fontWeight:800,textTransform:"uppercase",color:isBL?"var(--acc)":"var(--error)"}}>{isBL?"BON DE LIVRAISON":"BON DE RETOUR"}</div><div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>{doc.number}</div><div style={{fontWeight:700,fontSize:12}}>{fmt(doc.date)}</div></div>
              </div>
              <div className="doc-meta-grid">
                <div className="doc-meta-f"><div className="doc-meta-lbl">Vendeur</div><div className="doc-meta-val">{doc.vendor_snapshot?.name||"—"}</div></div>
                <div className="doc-meta-f"><div className="doc-meta-lbl">Véhicule</div><div className="doc-meta-val">{doc.vendor_snapshot?.vehicle_plate||doc.vendor_snapshot?.vehicle||"—"}</div></div>
                <div className="doc-meta-f"><div className="doc-meta-lbl">Téléphone</div><div className="doc-meta-val">{doc.vendor_snapshot?.phone||"—"}</div></div>
                {!isBL&&doc.client_name&&<div className="doc-meta-f"><div className="doc-meta-lbl">Client</div><div className="doc-meta-val">{doc.client_name}</div></div>}
              </div>

              {/* Article table */}
              <table className="tbl" style={{fontSize:11,marginBottom:12}}>
                <thead><tr><th>Réf.</th><th>Article</th><th>Lot</th><th>DF</th><th>DLC</th><th>Qté</th>{!isBL&&<th>Motif</th>}</tr></thead>
                <tbody>{lines.map((l,i)=>{
                  const r=RETURN_REASONS.find(x=>x.id===l.reason);
                  const dv=daysLeft(l.expiry_date);
                  return<tr key={i}>
                    <td><span className="tag">{l.product_ref}</span></td>
                    <td>{l.product_name}</td>
                    <td className="mono-cell">{l.lot_number||"—"}</td>
                    <td>{fmt(l.manufacture_date)}</td>
                    <td className={dv===null?"":dv<0?"dlc-exp":dv<=3?"dlc-warn":""}>{fmt(l.expiry_date)}</td>
                    <td style={{fontWeight:700}}>{l.quantity}</td>
                    {!isBL&&<td style={{color:r?.color,fontWeight:600}}>{r?.emoji} {r?.short}</td>}
                  </tr>;
                })}</tbody>
              </table>

              {/* Photos cloud */}
              {lines.some(l=>l.photo_url)&&(
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:8}}>📸 Photos (stockées dans le cloud)</div>
                  <div className="photo-grid">
                    {lines.filter(l=>l.photo_url).map((l,i)=>(
                      <div key={i} className="photo-item">
                        <a href={l.photo_url} target="_blank" rel="noopener"><img src={l.photo_url} alt={l.product_name}/></a>
                        <div className="photo-item-overlay">{l.product_ref}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:10,color:"var(--muted)",marginTop:6}}>Cliquer sur une photo pour l'ouvrir · Les URLs sont incluses dans l'export Excel</div>
                </div>
              )}

              <div style={{background:"var(--surf2)",border:"1px solid var(--bord)",borderRadius:"var(--r)",padding:"8px 12px",display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600}}>
                <span className="muted">Total</span><span>{lines.length} réf. · {totalQty} unités</span>
              </div>
              <div style={{textAlign:"center",fontSize:9,color:"var(--muted)",marginTop:14,fontFamily:"var(--mono)"}}>BT Food Industry · MF 1887237 G.A.M 000 · Module Sortie & Retour PF</div>
            </div>
          </div>
        </div>
        <div className="panel-footer">
          <button className="btn btn-neutral btn-sm" onClick={onClose}>Fermer</button>
          <button className="btn btn-ghost btn-sm" onClick={print}><Ico n="print" size={14}/>Imprimer</button>
          <button className="btn btn-acc btn-sm" onClick={sendEmail}><Ico n="mail" size={14} stroke="#fff"/>Envoyer ({gmEmail})</button>
        </div>
      </div>
    </div>
  );
}

// ─── CAMERA ──────────────────────────────────────────────────────────────────
// photoType: "article" | "dates" | "defect" | "full"
function CameraPanel({isBR, photoType="full", stepLabel="", onCapture, onClose}){
  const videoRef=useRef(),canvasRef=useRef(),streamRef=useRef(null);
  const[ready,setReady]=useState(false),[manual,setManual]=useState(""),[camErr,setCamErr]=useState(false);
  useEffect(()=>{
    navigator.mediaDevices?.getUserMedia({video:{facingMode:"environment",width:{ideal:1920}}})
      .then(s=>{streamRef.current=s;if(videoRef.current)videoRef.current.srcObject=s;})
      .catch(()=>setCamErr(true));
    return()=>streamRef.current?.getTracks().forEach(t=>t.stop());
  },[]);
  const capture=()=>{
    const v=videoRef.current,c=canvasRef.current;
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    streamRef.current?.getTracks().forEach(t=>t.stop());
    onCapture(c.toDataURL("image/jpeg",.88));
  };

  const hints={
    article:"📦 Cadrer l'étiquette frontale ou le code-barres EAN",
    dates:"📅 Cadrer la zone avec DLC, Date Fabrication et N° Lot",
    defect:"🔍 Montrer clairement le défaut — moisissure, déchirure, etc.",
    full:isBR?"🏷️ + 📅 + 🔍 — Étiquette complète + défaut visible":"🏷️ + 📅 — Étiquette + dates du produit",
  };
  const labels={article:"Photo 1 — Article",dates:"Photo 2 — Dates & Lot",defect:"Photo 3 — Défaut",full:"Photo complète"};

  return(
    <div className="cam-panel">
      <div className="cam-bar">
        <button className="cam-btn" onClick={onClose}>✕ Fermer</button>
        <div>
          <div style={{color:"#fff",fontWeight:700,fontSize:14}}>{labels[photoType]||stepLabel}</div>
          <div style={{color:"rgba(255,255,255,.65)",fontSize:11}}>{hints[photoType]}</div>
        </div>
      </div>
      {camErr
        ?<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,background:"#111",color:"rgba(255,255,255,.7)"}}>
           <div style={{fontSize:56}}>⌨️</div>
           <div style={{fontWeight:700,fontSize:16}}>Caméra non disponible</div>
           <div style={{fontSize:13,textAlign:"center",padding:"0 32px",opacity:.8}}>Utiliser la saisie manuelle ci-dessous</div>
         </div>
        :<video ref={videoRef} className="cam-vid" autoPlay playsInline muted onCanPlay={()=>setReady(true)}/>
      }
      <canvas ref={canvasRef} className="cam-canvas"/>
      {!camErr&&<div className="cam-overlay">
        <div className="cam-frame">
          <div className="cam-shade"/>
          <div className="cam-c cam-c-tl"/><div className="cam-c cam-c-tr"/>
          <div className="cam-c cam-c-bl"/><div className="cam-c cam-c-br"/>
          <div className="cam-scan"/>
        </div>
        <div className="cam-hint">{hints[photoType]}</div>
      </div>}
      <div className="cam-manual">
        <input placeholder={photoType==="dates"?"DLC, DF, lot manuels…":"Référence ou code-barres…"} value={manual} onChange={e=>setManual(e.target.value)} onKeyDown={e=>e.key==="Enter"&&manual&&onCapture("manual:"+manual.trim())}/>
        <button onClick={()=>manual&&onCapture("manual:"+manual.trim())} style={{background:"var(--acc)",border:"none",borderRadius:"var(--r)",padding:"0 14px",color:"#fff",cursor:"pointer",fontWeight:600,fontSize:13}}>OK</button>
      </div>
      <div className="cam-bottom">
        {!camErr&&<button className="shutter" onClick={capture} disabled={!ready}><div className="shutter-i"/></button>}
      </div>
    </div>
  );
}

// ─── AI ANALYZE + REVIEW ──────────────────────────────────────────────────────
function AIAnalyzeStep({photoB64,isBR,products,photoType="full",extraPhotos={},onDone}){
  const[steps,setSteps]=useState([
    {label:"Identification produit",st:"active"},
    {label:"Lecture DLC · DF · N° Lot",st:"idle"},
    ...(isBR?[{label:"ML — Cause de retour",st:"idle"}]:[]),
    {label:"Génération du formulaire",st:"idle"},
  ]);
  useEffect(()=>{
    const run=async()=>{
      try{
        // Manual entry
        if(!photoB64||photoB64.startsWith("manual:")){
          const q=(photoB64||"").replace("manual:","").trim();
          const found=products.find(p=>p.ref?.toLowerCase()===q.toLowerCase()||p.barcode===q||p.code===q);
          onDone(found?{ref:found.ref,code:found.barcode||found.code,name:found.name,product_conf:95,dates_conf:0}:{ref:q,code:null,name:q,product_conf:30,dates_conf:0},null);
          return;
        }

        let merged={};

        if(photoType==="full"){
          // Single photo — analyze everything at once
          const prompt=buildPrompt(products,isBR,"full");
          merged=await callAI(photoB64,prompt)||{};
        } else {
          // Multi-photo: run analyses in parallel
          const tasks=[];
          if(extraPhotos.article&&!extraPhotos.article.startsWith("manual:"))
            tasks.push(callAI(extraPhotos.article,buildPrompt(products,false,"article")).catch(()=>null));
          else tasks.push(Promise.resolve(null));

          if(extraPhotos.dates&&!extraPhotos.dates.startsWith("manual:"))
            tasks.push(callAI(extraPhotos.dates,buildPrompt(products,false,"dates")).catch(()=>null));
          else tasks.push(Promise.resolve(null));

          if(isBR&&extraPhotos.defect&&!extraPhotos.defect.startsWith("manual:"))
            tasks.push(callAI(extraPhotos.defect,buildPrompt(products,true,"defect")).catch(()=>null));
          else tasks.push(Promise.resolve(null));

          const[prod,dates,defect]=await Promise.all(tasks);
          merged={...(prod||{}),...(dates||{}),...(defect||{})};
          if(defect?.reason)merged.reason=defect.reason;
          if(defect?.defect)merged.defect=defect.defect;
          if(defect?.cause_conf!=null)merged.cause_conf=defect.cause_conf;
          if(defect?.visual_clues)merged.visual_clues=defect.visual_clues;
          if(defect?.alternative_reason)merged.alternative_reason=defect.alternative_reason;
        }

        // Catalogue match
        const found=products.find(p=>p.ref===merged.ref||(p.barcode||p.code)===merged.code||p.name?.toLowerCase().includes((merged.name||"").toLowerCase()));
        if(found){merged.ref=found.ref;merged.code=found.barcode||found.code;merged.name=found.name;merged.productId=found.id;}
        onDone(merged,photoB64);
      }catch(e){console.error(e);onDone(null,photoB64);}
    };
    run();
    const t1=setTimeout(()=>setSteps(s=>s.map((x,i)=>({...x,st:i===0?"done":i===1?"active":"idle"}))),900);
    const t2=setTimeout(()=>setSteps(s=>s.map((x,i)=>({...x,st:i<=1?"done":i===2?"active":"idle"}))),1800);
    const t3=setTimeout(()=>setSteps(s=>s.map((x,i)=>({...x,st:i<s.length-1?"done":"active"}))),2600);
    return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};
  },[]);
  return(
    <div className="ai-loading">
      <div className="ai-orb"><span style={{fontSize:28}}>🤖</span></div>
      <div style={{fontWeight:700,fontSize:17,color:"var(--text)"}}>Analyse IA en cours…</div>
      <div className="card" style={{width:"100%",maxWidth:340}}>
        {steps.map((s,i)=>(
          <div key={i} className="ai-step-row">
            <div className={`ai-dot ${s.st}`}>{s.st==="done"&&<Ico n="chk" size={12} stroke="#fff"/>}</div>
            <span style={{fontSize:13,color:s.st==="done"?"var(--success)":s.st==="active"?"var(--acc)":"var(--muted)",fontWeight:s.st==="active"?600:400}}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArticleReviewForm({photoB64,aiData,isBR,products,onConfirm,onRetake}){
  const[form,setForm]=useState({ref:aiData?.ref||"",code:aiData?.code||"",name:aiData?.name||"",dlc:aiData?.dlc||"",df:aiData?.df||"",lot:aiData?.lot||"",qty:1,reason:aiData?.reason||""});
  const[prodSel,setProdSel]=useState(aiData?.productId||"");
  const d=daysLeft(form.dlc);
  const ai=k=>aiData&&aiData[k]!=null&&aiData[k]!=="";
  const ok=form.name&&form.dlc&&(!isBR||form.reason);
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* AI confidence */}
      {aiData&&<div className="ai-conf-strip"><span className="ai-chip">IA</span><span className="ai-conf-item">🏷️ Produit {aiData.product_conf||"?"}%</span><span className="ai-conf-item">📅 Dates {aiData.dates_conf||"?"}%</span>{isBR&&aiData.cause_conf!=null&&<span className="ai-conf-item">🔍 Cause {aiData.cause_conf}%</span>}</div>}
      <div style={{flex:1,overflowY:"auto",padding:20}}>
        {/* Photo */}
        <div className="row gap12 mt8" style={{marginBottom:16}}>
          {photoB64&&!photoB64.startsWith("manual:")
            ?<img src={photoB64} style={{width:80,height:80,borderRadius:"var(--r-md)",objectFit:"cover",border:"1px solid var(--bord)",flexShrink:0}} alt=""/>
            :<div style={{width:80,height:80,borderRadius:"var(--r-md)",background:"var(--surf2)",border:"1px solid var(--bord)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,flexShrink:0}}>🏷️</div>}
          <div>
            {aiData?<div style={{fontSize:12,color:"var(--purple)",fontWeight:600,marginBottom:8}}>✨ Formulaire pré-rempli par l'IA — vérifier les champs <span style={{background:"var(--purple-l)",border:"1px solid rgba(106,35,130,.2)",padding:"1px 5px",borderRadius:2,fontWeight:700}}>surlignés</span></div>:<div style={{fontSize:12,color:"var(--warn)",fontWeight:600,marginBottom:8}}>⚠️ Analyse impossible — saisir manuellement</div>}
            <button className="btn btn-ghost btn-sm" onClick={onRetake}><Ico n="cam" size={13}/>Re-photographier</button>
          </div>
        </div>

        {/* Produit */}
        <div className="fs">
          <div className="fs-hdr">🏷️ Identification Produit</div>
          <div className="fs-body">
            <div className="field">
              <div className="lbl">Catalogue produits</div>
              <select className="sel" value={prodSel} onChange={e=>{const p=products.find(x=>x.id===e.target.value);setProdSel(e.target.value);if(p)setForm(f=>({...f,ref:p.ref,code:p.barcode||p.code,name:p.name}));}}>
                <option value="">-- Corriger si nécessaire --</option>
                {products.map(p=><option key={p.id} value={p.id}>{p.ref} · {p.name}</option>)}
              </select>
            </div>
            <div className="field"><div className="lbl">Nom du produit *</div><input className={`inp${ai("name")?" ai":""}`} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nom du produit"/></div>
            <div className="grid2">
              <div className="field"><div className="lbl">Code-barres EAN</div><input className={`inp${ai("code")?" ai":""}`} value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} placeholder="3701234…"/></div>
              <div className="field"><div className="lbl">Référence</div><input className={`inp${ai("ref")?" ai":""}`} value={form.ref} onChange={e=>setForm(f=>({...f,ref:e.target.value}))} placeholder="TC21-01"/></div>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="fs">
          <div className="fs-hdr">📅 Dates &amp; Traçabilité</div>
          <div className="fs-body">
            <div className="grid2">
              <div className="field">
                <div className="lbl">DLC *</div>
                <input className={`inp${ai("dlc")?" ai":""}${d!==null&&d<0?" err":""}`} type="date" value={form.dlc} onChange={e=>setForm(f=>({...f,dlc:e.target.value}))}/>
                {form.dlc&&d!==null&&<div style={{fontSize:11,marginTop:3}} className={d<0?"dlc-exp":d<=3?"dlc-warn":"dlc-ok"}>{d<0?`⚠️ Expiré (${-d}j)`:d===0?"⚠️ Expire aujourd'hui":d<=3?`⚠️ ${d}j restants`:`✓ ${d} jours`}</div>}
              </div>
              <div className="field"><div className="lbl">Date Fabrication</div><input className={`inp${ai("df")?" ai":""}`} type="date" value={form.df} onChange={e=>setForm(f=>({...f,df:e.target.value}))}/></div>
            </div>
            <div className="grid2">
              <div className="field"><div className="lbl">N° Lot</div><input className={`inp${ai("lot")?" ai":""}`} value={form.lot} onChange={e=>setForm(f=>({...f,lot:e.target.value}))} placeholder="26005"/></div>
              <div className="field"><div className="lbl">Quantité</div><input className="inp" type="number" min="1" value={form.qty} onChange={e=>setForm(f=>({...f,qty:+e.target.value}))}/></div>
            </div>
          </div>
        </div>

        {/* Cause (BR) */}
        {isBR&&<div className="fs">
          <div className="fs-hdr">🔍 Cause de Retour *</div>
          <div className="fs-body">
            {aiData?.defect&&<div className="ml-result">
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontWeight:700,color:"var(--purple)",fontSize:13}}>🤖 Analyse ML — Défaut détecté</span>
                <span style={{fontSize:11,color:"var(--muted)"}}>{aiData.cause_conf}% confiance</span>
              </div>
              <div style={{fontSize:13,marginBottom:6}}>{aiData.defect}</div>
              {aiData.visual_clues&&<div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>👁️ Indices visuels : {aiData.visual_clues}</div>}
              <div className="ml-bar"><div className="ml-bar-fill" style={{width:(aiData.cause_conf||0)+"%"}}/></div>
              {aiData.alternative_reason&&<div style={{fontSize:11,color:"var(--muted)",marginTop:8}}>⚠️ Alternative possible : {RETURN_REASONS.find(r=>r.id===aiData.alternative_reason)?.label||aiData.alternative_reason}</div>}
            </div>}
            <div className="rsn-grid">
              {RETURN_REASONS.map(r=>(
                <div key={r.id} className={`rsn-pill${form.reason===r.id?" sel":""}`} style={form.reason===r.id?{borderColor:r.color,background:r.color+"18",color:r.color}:{}} onClick={()=>setForm(f=>({...f,reason:r.id}))}>
                  {r.emoji} {r.label}
                  {aiData?.reason===r.id&&<span className="rsn-ai-tag">IA</span>}
                </div>
              ))}
            </div>
          </div>
        </div>}
      </div>

      <div style={{padding:"14px 20px",borderTop:"1px solid var(--bord)",background:"var(--surf2)",display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button className="btn btn-neutral btn-sm" onClick={onRetake}>Reprendre photo</button>
        <button className="btn btn-acc btn-sm" onClick={()=>onConfirm({...form,ref:form.ref||form.code,photo:photoB64&&!photoB64.startsWith("manual:")?photoB64:null,aiAnalyzed:!!aiData})} disabled={!ok}>
          <Ico n="chk" size={14} stroke="#fff"/>Confirmer l'article
        </button>
      </div>
    </div>
  );
}

// ─── ARTICLE CAPTURE FLOW ────────────────────────────────────────────────────
function ArticleCapture({isBR,products,onDone,onClose}){
  const[stage,setStage]=useState("choose");     // choose|cam1|cam2|cam3|analyzing|review
  const[photos,setPhotos]=useState({article:null,dates:null,defect:null});
  const[aiData,setAiData]=useState(null);
  const[mode,setMode]=useState("steps");        // steps | single | manual

  // Single photo: analyze all
  const analyzeSingle=async(b64)=>{
    setStage("analyzing");
    setPhotos(p=>({...p,article:b64}));
    // AIAnalyzeStep handles the API call
  };

  const finishCapture=()=>{
    setStage("analyzing");
  };

  // CHOICE SCREEN
  if(stage==="choose")return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:"var(--shell)",padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
        <button style={{background:"rgba(255,255,255,.18)",border:"none",borderRadius:"var(--r)",padding:"7px 12px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}} onClick={onClose}>✕</button>
        <div style={{color:"#fff",fontWeight:700,fontSize:15}}>Ajouter un article</div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:16,padding:24}}>
        <div style={{background:"linear-gradient(135deg,var(--purple-l),#f0ecff)",border:"2px solid rgba(106,35,130,.2)",borderRadius:"var(--r-lg)",padding:18}}>
          <div style={{fontWeight:700,fontSize:15,color:"var(--purple)",marginBottom:6}}>✨ Mode Intelligent — 1 seule photo</div>
          <div style={{fontSize:13,color:"var(--muted)",marginBottom:14}}>L'IA extrait produit + dates{isBR?" + cause de retour":""} en une seule prise</div>
          <button className="btn btn-acc btn-w" style={{background:"var(--purple)",borderColor:"var(--purple)"}} onClick={()=>{setMode("single");setStage("cam1");}}>
            📸 1 Photo — tout identifier
          </button>
        </div>
        <div style={{textAlign:"center",color:"var(--muted)",fontSize:12,fontWeight:600}}>— OU —</div>
        <div className="card card-body" style={{padding:0}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid var(--surf3)",fontWeight:700,fontSize:14}}>📷 Mode précis — {isBR?"3":"2"} photos séparées</div>
          {[
            {icon:"🏷️",title:"Photo 1 — Article",sub:"Étiquette frontale ou code-barres EAN"},
            {icon:"📅",title:"Photo 2 — Dates & Lot",sub:"Zone DLC, DF et numéro de lot"},
            ...(isBR?[{icon:"🔍",title:"Photo 3 — Cause retour",sub:"Défaut visible — moisissure, dégât, etc."}]:[]),
          ].map((s,i)=><div key={i} style={{display:"flex",gap:12,padding:"12px 16px",borderBottom:"1px solid var(--surf3)"}}>
            <span style={{fontSize:24,flexShrink:0}}>{s.icon}</span>
            <div><div style={{fontWeight:600,fontSize:13}}>{s.title}</div><div style={{fontSize:12,color:"var(--muted)"}}>{s.sub}</div></div>
          </div>)}
          <div style={{padding:14}}>
            <button className="btn btn-ghost btn-w" onClick={()=>{setMode("steps");setStage("cam1");}}>Prendre {isBR?"3":"2"} photos séparées →</button>
          </div>
        </div>
        <button className="btn btn-neutral" onClick={()=>{setMode("manual");setStage("reviewing_manual");}}>
          ✏️ Saisir manuellement sans photo
        </button>
      </div>
    </div>
  );

  // CAMERA STEPS
  if(stage==="cam1"){
    const pType=mode==="single"?"full":"article";
    return<CameraPanel isBR={isBR} photoType={pType} onClose={onClose}
      onCapture={b64=>{
        if(b64.startsWith("manual:")){setPhotos(p=>({...p,article:b64}));setStage(mode==="single"||!isBR?"analyzing":"cam2");}
        else{setPhotos(p=>({...p,article:b64}));setStage(mode==="single"?"analyzing":"cam2");}
      }}/>;
  }
  if(stage==="cam2"){
    return<CameraPanel isBR={isBR} photoType="dates" onClose={onClose}
      onCapture={b64=>{setPhotos(p=>({...p,dates:b64}));setStage(isBR?"cam3":"analyzing");}}/>;
  }
  if(stage==="cam3"&&isBR){
    return<CameraPanel isBR={true} photoType="defect" onClose={onClose}
      onCapture={b64=>{setPhotos(p=>({...p,defect:b64}));setStage("analyzing");}}/>;
  }

  // ANALYZING
  if(stage==="analyzing"||stage==="reviewing_manual"){
    const mainPhoto=photos.article;
    const pType=mode==="single"?"full":(photos.defect?"defect":(photos.dates?"dates":"article"));
    return(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <AIAnalyzeStep
          photoB64={mainPhoto||"manual:"}
          isBR={isBR}
          products={products}
          photoType={mode==="single"?"full":pType}
          extraPhotos={photos}
          onDone={(r,p)=>{setAiData(r||{});if(p)setPhotos(prev=>({...prev,article:p}));setStage("review");}}
        />
      </div>
    );
  }

  // REVIEW
  if(stage==="review"){
    return<ArticleReviewForm
      photos={photos}
      aiData={aiData}
      isBR={isBR}
      products={products}
      onRetake={()=>{setStage("choose");setAiData(null);setPhotos({article:null,dates:null,defect:null});}}
      onConfirm={a=>{onDone({...a,photos});onClose();}}/>;
  }
  return null;
}

// ─── BL/BR FORM PANEL ────────────────────────────────────────────────────────
function DocFormPanel({type,vendors,products,onSave,onClose,toast}){
  const isBL=type==="BL";
  const[vendor,setVendor]=useState(null);
  const[date,setDate]=useState(today());
  const[clientName,setClientName]=useState("");
  const[clientPhone,setClientPhone]=useState("");
  const[lines,setLines]=useState([]);
  const[capturing,setCapturing]=useState(false);
  const[step,setStep]=useState("form"); // form|preview
  const[saving,setSaving]=useState(false);

  const docNumber=`${type}-${date.replace(/-/g,"").slice(2)}-${uid()}`;

  const save=async()=>{
    if(!vendor||!lines.length)return;
    setSaving(true);
    try{
      const{data:doc,error:docErr}=await sb.from(isBL?"delivery_orders":"return_orders").insert({
        number:docNumber,date,
        vendor_id:vendor.id&&vendor.id!="_autre"?vendor.id:null,
        vendor_snapshot:vendor,
        ...(isBL?{}:{client_name:clientName||null,client_phone:clientPhone||null}),
        status:"validated",
      }).select().single();
      if(docErr)throw docErr;
      for(const l of lines){
        let photoUrl=null;
        if(l.photo&&!l.photo.startsWith("manual:")){
          try{const{url}=await uploadPhoto(l.photo,`${type}_${doc.id}_${Date.now()}.jpg`);photoUrl=url;}catch{}
        }
        const lineData=isBL?{
          delivery_id:doc.id,barcode:l.code||"",product_ref:l.ref||l.code||"",product_name:l.name,
          lot_number:l.lot||null,manufacture_date:l.df||null,expiry_date:l.dlc,quantity:l.qty,
          photo_url:photoUrl,ai_analyzed:!!l.aiAnalyzed,
        }:{
          return_id:doc.id,barcode:l.code||"",product_ref:l.ref||l.code||"",product_name:l.name,
          lot_number:l.lot||null,manufacture_date:l.df||null,expiry_date:l.dlc||null,quantity:l.qty,
          reason:l.reason,ai_validated_by_operator:!!l.aiAnalyzed,
          ai_confidence:l.aiConfidence||null,ai_explanation:l.aiExplanation||null,
          photo_url:photoUrl,
        };
        await sb.from(isBL?"delivery_lines":"return_lines").insert(lineData);
      }
      onSave();
      toast(isBL?"✅ Bon de Livraison enregistré":"✅ Bon de Retour enregistré","ok");
      onClose();
    }catch(e){toast("Erreur : "+e.message,"err");}
    finally{setSaving(false);}
  };

  if(capturing)return(
    <div className="panel-overlay">
      <div className="panel">
        <ArticleCapture isBR={!isBL} products={products} onDone={a=>setLines(l=>[...l,{...a,id:uid()}])} onClose={()=>setCapturing(false)}/>
      </div>
    </div>
  );

  return(
    <div className="panel-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">{isBL?"Nouveau Bon de Livraison":"Nouveau Bon de Retour"}</div>
            <div className="panel-sub">{docNumber}</div>
          </div>
          <button className="panel-close" onClick={onClose}><Ico n="x" size={16} stroke="#fff"/></button>
        </div>

        {step==="form"&&<>
          <div className="panel-body">
            {/* Info */}
            <div className="fs">
              <div className="fs-hdr">📋 Informations générales</div>
              <div className="fs-body">
                <div className="grid2">
                  <div className="field"><div className="lbl">Date</div><input className="inp" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
                  <div className="field">
                    <div className="lbl">Vendeur / Chauffeur</div>
                    <select className="sel" value={vendor?.id||""} onChange={e=>{if(e.target.value==="_autre")setVendor({id:"_autre",name:"",phone:"",vehicle:""});else setVendor(vendors.find(x=>x.id===e.target.value)||null);}}>
                      <option value="" disabled>Choisir…</option>
                      {vendors.map(v=><option key={v.id} value={v.id}>{v.name} — {v.vehicle_plate}</option>)}
                      <option value="_autre">⚡ Autre vendeur…</option>
                    </select>
                  </div>
                </div>
                {vendor?.id==="_autre"&&<div className="grid3 mt8"><div className="field"><div className="lbl">Nom</div><input className="inp" value={vendor.name} onChange={e=>setVendor(v=>({...v,name:e.target.value}))}/></div><div className="field"><div className="lbl">Tél</div><input className="inp" value={vendor.phone} onChange={e=>setVendor(v=>({...v,phone:e.target.value}))}/></div><div className="field"><div className="lbl">Véhicule</div><input className="inp" value={vendor.vehicle} onChange={e=>setVendor(v=>({...v,vehicle:e.target.value}))}/></div></div>}
                {!isBL&&<div className="grid2 mt8"><div className="field"><div className="lbl">Client / Point de vente</div><input className="inp" value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Nom du client"/></div><div className="field"><div className="lbl">Téléphone</div><input className="inp" value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="9X XXX XXX"/></div></div>}
              </div>
            </div>

            {/* Articles */}
            <div className="fs">
              <div className="fs-hdr" style={{justifyContent:"space-between"}}>
                <span>{isBL?"📦 Articles chargés":"📦 Articles retournés"} ({lines.length})</span>
                <button className="btn btn-acc btn-sm" onClick={()=>setCapturing(true)}><Ico n="cam" size={13} stroke="#fff"/>📸 Photo + IA</button>
              </div>
              <div style={{padding:"0 0 8px"}}>
                {!lines.length&&<div className="empty" style={{padding:"24px 16px"}}><div style={{fontSize:32,marginBottom:8}}>📸</div><div className="fs12">Photographiez les articles</div></div>}
                {lines.map(l=>{const r=RETURN_REASONS.find(x=>x.id===l.reason);return(
                  <div key={l.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",borderBottom:"1px solid var(--surf3)"}}>
                    {l.photo?<img src={l.photo} className="photo-thumb" alt=""/>:<div className="photo-box">{r?.emoji||"🫓"}</div>}
                    <div style={{flex:1,minWidth:0}}>
                      <div className="row-sb"><span className="tag">{l.ref||l.code}</span><span className={`st ${isBL?"st-info":"st-err"}`}>{l.qty} u</span></div>
                      <div style={{fontWeight:600,fontSize:14,marginTop:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l.name}</div>
                      <div className="row gap8 fs12 muted mt8"><span>Lot:<span className="mono">{l.lot||"—"}</span></span><span>DLC:{fmt(l.dlc)}</span></div>
                      {r&&<div style={{fontSize:11,fontWeight:600,color:r.color,marginTop:4}}>{r.emoji} {r.label}</div>}
                      {l.aiAnalyzed&&<span style={{background:"var(--purple)",color:"#fff",fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:2,marginTop:3,display:"inline-block"}}>🤖 IA</span>}
                    </div>
                    <button className="btn-ico btn-sm" onClick={()=>setLines(ls=>ls.filter(x=>x.id!==l.id))}><Ico n="trash" size={14}/></button>
                  </div>
                );})}
              </div>
            </div>
          </div>
          <div className="panel-footer">
            <button className="btn btn-neutral btn-sm" onClick={onClose}>Annuler</button>
            <button className="btn btn-acc btn-sm" disabled={!vendor||!lines.length} onClick={()=>setStep("preview")}><Ico n="eye" size={14} stroke="#fff"/>Aperçu &amp; Validation</button>
          </div>
        </>}

        {step==="preview"&&<>
          <div className="panel-body">
            <div style={{background:"var(--warn-l)",border:"1px solid rgba(233,115,12,.25)",borderRadius:"var(--r)",padding:"10px 14px",marginBottom:14,fontSize:12,color:"var(--warn)",fontWeight:600}}>
              ✋ Vérifiez toutes les informations avant de valider
            </div>
            <div className="doc-preview">
              <div className="doc-preview-band" style={{background:isBL?"var(--acc)":"var(--error)"}}/>
              <div className="doc-preview-inner">
                <div className="doc-header-row">
                  <div><div style={{fontWeight:800,fontSize:15,color:"var(--acc)"}}>BT FOOD INDUSTRY</div><div style={{fontSize:11,color:"var(--muted)"}}>16, Rue Annaba – Z.I. Ben Arous 2013</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:13,textTransform:"uppercase",color:isBL?"var(--acc)":"var(--error)"}}>{isBL?"BON DE LIVRAISON":"BON DE RETOUR"}</div><div style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--muted)"}}>{docNumber}</div><div style={{fontSize:12,fontWeight:700}}>{fmt(date)}</div></div>
                </div>
                <div className="doc-meta-grid">
                  <div className="doc-meta-f"><div className="doc-meta-lbl">Vendeur</div><div className="doc-meta-val">{vendor?.name||"—"}</div></div>
                  <div className="doc-meta-f"><div className="doc-meta-lbl">Véhicule</div><div className="doc-meta-val">{vendor?.vehicle_plate||vendor?.vehicle||"—"}</div></div>
                  {!isBL&&clientName&&<div className="doc-meta-f"><div className="doc-meta-lbl">Client</div><div className="doc-meta-val">{clientName}</div></div>}
                </div>
                <table className="tbl" style={{fontSize:11}}>
                  <thead><tr><th>Réf.</th><th>Article</th><th>Lot</th><th>DF</th><th>DLC</th><th>Qté</th>{!isBL&&<th>Motif</th>}</tr></thead>
                  <tbody>{lines.map((l,i)=>{const r=RETURN_REASONS.find(x=>x.id===l.reason);const dv=daysLeft(l.dlc);return<tr key={i}><td><span className="tag">{l.ref||l.code}</span></td><td>{l.name}</td><td className="mono-cell">{l.lot||"—"}</td><td>{fmt(l.df)}</td><td className={dv===null?"":dv<0?"dlc-exp":dv<=3?"dlc-warn":""}>{fmt(l.dlc)}</td><td style={{fontWeight:700}}>{l.qty}</td>{!isBL&&<td style={{color:r?.color,fontWeight:600}}>{r?.emoji} {r?.short}</td>}</tr>;})}
                  </tbody>
                </table>
                <div style={{background:"var(--surf2)",border:"1px solid var(--bord)",borderRadius:"var(--r)",padding:"8px 12px",display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600}}>
                  <span className="muted">Total</span><span>{lines.length} réf. · {lines.reduce((s,l)=>s+l.qty,0)} unités</span>
                </div>
              </div>
            </div>
          </div>
          <div className="panel-footer">
            <button className="btn btn-neutral btn-sm" onClick={()=>setStep("form")}>← Modifier</button>
            <button className="btn btn-neg btn-sm" onClick={onClose}>Annuler</button>
            <button className="btn btn-success btn-sm" disabled={saving} onClick={save}>
              {saving?<span className="spin">⚙️</span>:<Ico n="chk" size={14} stroke="#fff"/>}{saving?"Enregistrement…":"Valider & Enregistrer"}
            </button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ─── HISTORY VIEW ─────────────────────────────────────────────────────────────
function HistoryView({type,vendors,gmEmail,toast}){
  const isBL=type==="BL";
  const[docs,setDocs]=useState([]);
  const[loading,setLoading]=useState(true);
  const[sel,setSel]=useState(null);

  const load=async()=>{
    setLoading(true);
    const{data,error}=await sb
      .from(isBL?"delivery_orders":"return_orders")
      .select(`*, ${isBL?"delivery_lines(*)":"return_lines(*)"}`)
      .neq("status","draft")
      .order("created_at",{ascending:false});
    if(!error)setDocs(data||[]);
    setLoading(false);
  };
  useEffect(()=>{load();},[type]);

  const sendEmail=(doc)=>{
    const lines=(isBL?doc.delivery_lines:doc.return_lines)||[];
    const qty=lines.reduce((s,l)=>s+(l.quantity||0),0);
    const subj=encodeURIComponent(`[BTFI] ${type} ${doc.number} — ${doc.vendor_snapshot?.name} — ${fmt(doc.date)}`);
    const lineText=lines.map((l,i)=>{const r=RETURN_REASONS.find(x=>x.id===l.reason);return`${i+1}. [${l.product_ref}] ${l.product_name}\n   Lot:${l.lot_number||"—"} | DLC:${fmt(l.expiry_date)} | Qté:${l.quantity}${r?" | "+r.label:""}${l.photo_url?"\n   Photo: "+l.photo_url:""}`;}).join("\n");
    const body=encodeURIComponent(`BT Food Industry — ${isBL?"BON DE LIVRAISON":"BON DE RETOUR"}\n${"═".repeat(44)}\nN°:${doc.number} | Date:${fmt(doc.date)}\nVendeur:${doc.vendor_snapshot?.name} | Véhicule:${doc.vendor_snapshot?.vehicle_plate||doc.vendor_snapshot?.vehicle}\n${doc.client_name?`Client:${doc.client_name}\n`:""}\nARTICLES (${qty} u):\n${lineText}\n\nBTFI Module Sortie & Retour PF · MF 1887237 G.A.M 000`);
    window.location.href=`mailto:${gmEmail}?subject=${subj}&body=${body}`;
    toast("📧 Email ouvert","ok");
  };
  const[fullViewDoc,setFullViewDoc]=useState(null);
  const openFull=async(d)=>{const isBLd=type==="BL";const{data}=await sb.from(isBLd?"delivery_orders":"return_orders").select(`*, ${isBLd?"delivery_lines(*)":"return_lines(*)"}`).eq("id",d.id).single();if(data)setFullViewDoc({...data,type});};

  const exportAll=async()=>{
    const[{data:bls},{data:brs}]=await Promise.all([
      sb.from("delivery_orders").select("*, delivery_lines(*)").neq("status","draft"),
      sb.from("return_orders").select("*, return_lines(*)").neq("status","draft"),
    ]);
    await exportAndEmail(bls||[],brs||[],gmEmail,toast);
  };

  return(
    <div>
      <div className="content-header">
        <div><div className="content-title">{isBL?"Bons de Livraison":"Bons de Retour"}</div><div className="content-sub">{docs.length} document(s) · Email prédéfini : <strong>{gmEmail}</strong></div></div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-neutral btn-sm" onClick={load}><Ico n="refresh" size={14}/>Rafraîchir</button>
          <button className="export-btn" onClick={exportAll}>📊 Export Excel + Email</button>
        </div>
      </div>
      <div className="content-body">
        {loading?<div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>Chargement…</div>:
        !docs.length?<div className="empty"><div style={{fontSize:40,marginBottom:10}}>{isBL?"🚛":"↩️"}</div><div>Aucun document</div></div>:
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>N° Document</th><th>Date</th><th>Vendeur</th><th>Véhicule</th>{!isBL&&<th>Client</th>}<th>Articles</th><th>Unités</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>{docs.map(d=>{
              const lines=(isBL?d.delivery_lines:d.return_lines)||[];
              const qty=lines.reduce((s,l)=>s+(l.quantity||0),0);
              return(
                <tr key={d.id} onClick={()=>setSel(d)}>
                  <td><span className="tag mono-cell">{d.number}</span></td>
                  <td>{fmt(d.date)}</td>
                  <td style={{fontWeight:600}}>{d.vendor_snapshot?.name}</td>
                  <td><span className="tag">{d.vendor_snapshot?.vehicle_plate||d.vendor_snapshot?.vehicle||"—"}</span></td>
                  {!isBL&&<td>{d.client_name||"—"}</td>}
                  <td>{lines.length}</td>
                  <td><span className={`st ${isBL?"st-info":"st-err"}`}>{qty} u</span></td>
                  <td><span className="st st-ok">✓ Validé</span></td>
                  <td onClick={e=>e.stopPropagation()}>
                    <div className="actions">
                      <button className="btn-ico" onClick={()=>openFull(d)} title="Ouvrir document"><Ico n="eye" size={14}/></button>
                      <button className="btn-ico" onClick={()=>sendEmail(d)} title="Envoyer email"><Ico n="mail" size={14}/></button>
                      <button className="btn-ico" onClick={()=>{openFull(d);setTimeout(()=>window.print(),400);}} title="Imprimer"><Ico n="print" size={14}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>}
      </div>

      {fullViewDoc&&<FullDocViewer doc={fullViewDoc} gmEmail={gmEmail} toast={toast} onClose={()=>setFullViewDoc(null)}/>}

      {/* Document detail panel */}
      {sel&&(
        <div className="panel-overlay" onClick={e=>e.target===e.currentTarget&&setSel(null)}>
          <div className="panel">
            <div className="panel-header">
              <div><div className="panel-title">{isBL?"Bon de Livraison":"Bon de Retour"}</div><div className="panel-sub" style={{fontFamily:"var(--mono)"}}>{sel.number} · {fmt(sel.date)}</div></div>
              <button className="panel-close" onClick={()=>setSel(null)}><Ico n="x" size={16} stroke="#fff"/></button>
            </div>
            <div className="panel-body">
              <div className="doc-preview">
                <div className="doc-preview-band" style={{background:isBL?"var(--acc)":"var(--error)"}}/>
                <div className="doc-preview-inner">
                  <div className="doc-header-row">
                    <div><div style={{fontWeight:800,fontSize:15,color:"var(--acc)"}}>BT FOOD INDUSTRY</div><div style={{fontSize:11,color:"var(--muted)"}}>16, Rue Annaba – Z.I. Ben Arous 2013</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontWeight:800,textTransform:"uppercase",color:isBL?"var(--acc)":"var(--error)"}}>{isBL?"BON DE LIVRAISON":"BON DE RETOUR"}</div><div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>{sel.number}</div><div style={{fontWeight:700,fontSize:12}}>{fmt(sel.date)}</div></div>
                  </div>
                  <div className="doc-meta-grid">
                    <div className="doc-meta-f"><div className="doc-meta-lbl">Vendeur</div><div className="doc-meta-val">{sel.vendor_snapshot?.name||"—"}</div></div>
                    <div className="doc-meta-f"><div className="doc-meta-lbl">Véhicule</div><div className="doc-meta-val">{sel.vendor_snapshot?.vehicle_plate||sel.vendor_snapshot?.vehicle||"—"}</div></div>
                    <div className="doc-meta-f"><div className="doc-meta-lbl">Téléphone</div><div className="doc-meta-val">{sel.vendor_snapshot?.phone||"—"}</div></div>
                    {!isBL&&sel.client_name&&<div className="doc-meta-f"><div className="doc-meta-lbl">Client</div><div className="doc-meta-val">{sel.client_name}</div></div>}
                  </div>
                  <table className="tbl" style={{fontSize:11}}>
                    <thead><tr><th>Réf.</th><th>Article</th><th>Lot</th><th>DF</th><th>DLC</th><th>Qté</th>{!isBL&&<th>Motif</th>}</tr></thead>
                    <tbody>{((isBL?sel.delivery_lines:sel.return_lines)||[]).map((l,i)=>{const r=RETURN_REASONS.find(x=>x.id===l.reason);const dv=daysLeft(l.expiry_date);return<tr key={i}><td><span className="tag">{l.product_ref}</span></td><td>{l.product_name}</td><td className="mono-cell">{l.lot_number||"—"}</td><td>{fmt(l.manufacture_date)}</td><td className={dv===null?"":dv<0?"dlc-exp":dv<=3?"dlc-warn":""}>{fmt(l.expiry_date)}</td><td style={{fontWeight:700}}>{l.quantity}</td>{!isBL&&<td style={{color:r?.color,fontWeight:600}}>{r?.emoji} {r?.short}</td>}</tr>;})}
                    </tbody>
                  </table>
                  <div style={{fontSize:9,color:"var(--muted)",textAlign:"center",marginTop:14,fontFamily:"var(--mono)"}}>BT Food Industry · MF 1887237 G.A.M 000 · Module Sortie &amp; Retour PF</div>
                </div>
              </div>
            </div>
            <div className="panel-footer">
              <button className="btn btn-neutral btn-sm" onClick={()=>setSel(null)}>Fermer</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>window.print()}><Ico n="print" size={14}/>Imprimer</button>
              <button className="btn btn-acc btn-sm" onClick={()=>sendEmail(sel)}><Ico n="mail" size={14} stroke="#fff"/>Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GM DASHBOARD ─────────────────────────────────────────────────────────────
function GMDashboard(){
  const[kpis,setKpis]=useState({bl:0,br:0,chg:0,ret:0,tx:0,ai:0});
  const[vperf,setVperf]=useState([]);
  const[reasons,setReasons]=useState([]);
  const[trend,setTrend]=useState([]);
  const[loading,setLoading]=useState(true);

  const load=async()=>{
    setLoading(true);
    try{
      const[{data:bls},{data:brs},{data:vp},{data:daily}]=await Promise.all([
        sb.from("delivery_orders").select("id,total_units,delivery_lines(quantity)").neq("status","draft"),
        sb.from("return_orders").select("id,total_units,return_lines(quantity,reason,ai_validated_by_operator)").neq("status","draft"),
        sb.from("v_vendor_performance").select("*").limit(10),
        sb.from("v_daily_kpis").select("*").order("date",{ascending:false}).limit(14),
      ]);
      const totalChg=(bls||[]).reduce((s,d)=>s+(d.delivery_lines||[]).reduce((a,l)=>a+(l.quantity||0),0),0);
      const totalRet=(brs||[]).reduce((s,d)=>s+(d.return_lines||[]).reduce((a,l)=>a+(l.quantity||0),0),0);
      const aiCnt=(brs||[]).reduce((s,d)=>s+(d.return_lines||[]).filter(l=>l.ai_validated_by_operator).length,0);
      const tx=totalChg>0?((totalRet/totalChg)*100).toFixed(1):0;
      setKpis({bl:(bls||[]).length,br:(brs||[]).length,chg:totalChg,ret:totalRet,tx,ai:aiCnt});
      setVperf(vp||[]);
      // Reasons from BR lines
      const rMap={};RETURN_REASONS.forEach(r=>rMap[r.id]=0);
      (brs||[]).forEach(d=>(d.return_lines||[]).forEach(l=>{if(rMap[l.reason]!==undefined)rMap[l.reason]++;}));
      setReasons(RETURN_REASONS.map(r=>({name:r.short,value:rMap[r.id],color:r.color,emoji:r.emoji})).filter(x=>x.value>0));
      // Trend
      setTrend(([...daily||[]]).reverse().map(d=>({day:d.date?.slice(5)||"",BL:d.total_bl||0,BR:d.total_br||0})));
    }catch(e){console.error(e);}
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const TT=({active,payload,label})=>active&&payload?.length?<div style={{background:"#fff",border:"1px solid var(--bord)",borderRadius:"var(--r-md)",padding:"8px 12px",fontSize:12}}><div style={{fontWeight:700,marginBottom:4}}>{label}</div>{payload.map(p=><div key={p.dataKey} style={{color:p.color}}>{p.name}:{p.value}</div>)}</div>:null;

  return(
    <div>
      <div className="content-header">
        <div><div className="content-title">Tableau de Bord Général</div><div className="content-sub">BT Food Industry · {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div></div>
        <button className="btn btn-neutral btn-sm" onClick={load}><Ico n="refresh" size={14}/>Rafraîchir</button>
      </div>
      <div className="content-body">
        {loading?<div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>Chargement des données…</div>:<>
          {/* KPI tiles */}
          <div className="tiles">
            {[{ico:"🚛",lbl:"Bons Livraison",val:kpis.bl,sub:kpis.chg+" u chargées",c:"var(--acc)"},{ico:"↩️",lbl:"Bons Retour",val:kpis.br,sub:kpis.ret+" u retournées",c:"var(--error)"},{ico:"📉",lbl:"Taux Retour",val:kpis.tx+"%",sub:"Objectif < 3%",c:+kpis.tx>5?"var(--error)":+kpis.tx>2?"var(--warn)":"var(--success)"},{ico:"🤖",lbl:"Analyses IA",val:kpis.ai,sub:"articles reconnus",c:"var(--purple)"}].map(k=>(
              <div key={k.lbl} className="tile">
                <div className="tile-stripe" style={{background:k.c}}/>
                <div className="tile-icon">{k.ico}</div>
                <div className="tile-lbl">{k.lbl}</div>
                <div className="tile-val" style={{color:k.c}}>{k.val}</div>
                <div className="tile-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
            {/* Trend */}
            <div className="card">
              <div className="card-header"><div className="card-header-title">Volume — 14 derniers jours</div></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={trend} margin={{top:5,right:10,bottom:0,left:-20}}>
                    <defs>
                      <linearGradient id="gBL" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--acc)" stopOpacity={.2}/><stop offset="95%" stopColor="var(--acc)" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gBR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--error)" stopOpacity={.2}/><stop offset="95%" stopColor="var(--error)" stopOpacity={0}/></linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<TT/>}/>
                    <Area type="monotone" dataKey="BL" name="Chargé" stroke="var(--acc)" fill="url(#gBL)" strokeWidth={2} dot={false}/>
                    <Area type="monotone" dataKey="BR" name="Retourné" stroke="var(--error)" fill="url(#gBR)" strokeWidth={2} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Reasons */}
            <div className="card">
              <div className="card-header"><div className="card-header-title">Motifs de retour</div></div>
              <div className="card-body">
                {!reasons.length?<div className="empty" style={{padding:"24px 0"}}>Aucun retour</div>:<>
                  <div style={{display:"flex",justifyContent:"center"}}>
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart><Pie data={reasons} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" strokeWidth={2} stroke="#fff">{reasons.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip formatter={(v,n)=>[v+" cas",n]}/></PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {reasons.map((r,i)=><div key={i} className="row gap8 fs12"><div style={{width:10,height:10,borderRadius:3,background:r.color,flexShrink:0}}/><span style={{flex:1}}>{r.emoji} {r.name}</span><span style={{fontWeight:700,fontFamily:"var(--mono)"}}>{r.value}</span></div>)}
                  </div>
                </>}
              </div>
            </div>
          </div>

          {/* Vendor performance */}
          <div className="card">
            <div className="card-header"><div className="card-header-title">Performance Vendeurs</div></div>
            {!vperf.length?<div className="empty">Aucune donnée</div>:
            <div className="tbl-wrap" style={{borderRadius:0,border:"none"}}>
              <table className="tbl">
                <thead><tr><th>Vendeur</th><th>Zone</th><th>BL</th><th>BR</th><th>Chargés</th><th>Retournés</th><th>Taux retour</th></tr></thead>
                <tbody>{vperf.map(v=>(
                  <tr key={v.id}>
                    <td style={{fontWeight:600}}>{v.vendor_name}</td>
                    <td>{v.zone||"—"}</td>
                    <td className="mono-cell">{v.total_bl}</td>
                    <td className="mono-cell">{v.total_br}</td>
                    <td className="mono-cell">{v.total_charged}</td>
                    <td className="mono-cell">{v.total_returned}</td>
                    <td><span className={`st ${+v.return_rate_pct>5?"st-err":+v.return_rate_pct>2?"st-warn":"st-ok"}`}>{v.return_rate_pct}%</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>}
          </div>
        </>}
      </div>
    </div>
  );
}

// ─── PRODUCT CATALOG ──────────────────────────────────────────────────────────
function CatalogView({toast}){
  const[products,setProducts]=useState([]);
  const[loading,setLoading]=useState(true);
  const[panel,setPanel]=useState(null); // null | {mode:'add'|'edit', data?}
  const[form,setForm]=useState({barcode:"",ref:"",name:"",weight:"",category:"",shelf_life_days:21});

  const load=async()=>{setLoading(true);const{data}=await sb.from("products").select("*").eq("is_active",true).order("ref");setProducts(data||[]);setLoading(false);};
  useEffect(()=>{load();},[]);

  const save=async()=>{
    if(!form.ref||!form.name){toast("Réf et Nom requis","err");return;}
    if(panel.mode==="edit"){await sb.from("products").update({barcode:form.barcode,ref:form.ref,name:form.name,weight:form.weight,category:form.category,shelf_life_days:form.shelf_life_days}).eq("id",panel.data.id);}
    else{await sb.from("products").insert({barcode:form.barcode,ref:form.ref,name:form.name,weight:form.weight,category:form.category,shelf_life_days:form.shelf_life_days});}
    toast(panel.mode==="edit"?"✅ Produit modifié":"✅ Produit ajouté","ok");
    setPanel(null);load();
  };
  const del=async(id)=>{if(!confirm("Supprimer ce produit du catalogue ?"))return;await sb.from("products").update({is_active:false}).eq("id",id);toast("Produit supprimé","ok");load();};

  return(
    <div>
      <div className="content-header">
        <div><div className="content-title">Catalogue Produits</div><div className="content-sub">{products.length} article(s) · Reconnaissance IA</div></div>
        <button className="btn btn-acc btn-sm" onClick={()=>{setForm({barcode:"",ref:"",name:"",weight:"",category:"",shelf_life_days:21});setPanel({mode:"add"});}}>
          <Ico n="plus" size={14} stroke="#fff"/>Ajouter un produit
        </button>
      </div>
      <div className="content-body">
        <div style={{background:"var(--purple-l)",border:"1px solid rgba(106,35,130,.2)",borderRadius:"var(--r-md)",padding:"10px 14px",marginBottom:16,fontSize:12,color:"var(--purple)",fontWeight:600}}>
          🤖 Ces produits alimentent la reconnaissance IA lors du scan des photos. Maintenir le catalogue à jour pour une meilleure précision.
        </div>
        {loading?<div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>Chargement…</div>:
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Référence</th><th>Code-barres EAN</th><th>Nom du produit</th><th>Format</th><th>Catégorie</th><th>DLC théorique</th><th>Actions</th></tr></thead>
            <tbody>{products.map(p=>(
              <tr key={p.id}>
                <td><span className="tag">{p.ref}</span></td>
                <td className="mono-cell">{p.barcode||"—"}</td>
                <td style={{fontWeight:600}}>{p.name}</td>
                <td>{p.weight||"—"}</td>
                <td>{p.category||"—"}</td>
                <td>{p.shelf_life_days?p.shelf_life_days+" j":"—"}</td>
                <td onClick={e=>e.stopPropagation()}>
                  <div className="actions">
                    <button className="btn-ico" onClick={()=>{setForm(p);setPanel({mode:"edit",data:p});}}><Ico n="edit" size={14}/></button>
                    <button className="btn-ico" onClick={()=>del(p.id)}><Ico n="trash" size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
      </div>

      {panel&&(
        <div className="panel-overlay" onClick={e=>e.target===e.currentTarget&&setPanel(null)}>
          <div className="panel">
            <div className="panel-header">
              <div><div className="panel-title">{panel.mode==="add"?"Nouveau Produit":"Modifier Produit"}</div><div className="panel-sub">Catalogue IA · Réservé Direction</div></div>
              <button className="panel-close" onClick={()=>setPanel(null)}><Ico n="x" size={16} stroke="#fff"/></button>
            </div>
            <div className="panel-body">
              <div className="grid2"><div className="field"><div className="lbl">Référence *</div><input className="inp" placeholder="TC21-01" value={form.ref} onChange={e=>setForm(f=>({...f,ref:e.target.value}))}/></div><div className="field"><div className="lbl">Code-barres EAN</div><input className="inp" placeholder="3701234560011" value={form.barcode} onChange={e=>setForm(f=>({...f,barcode:e.target.value}))}/></div></div>
              <div className="field"><div className="lbl">Nom du produit *</div><input className="inp" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div className="grid2"><div className="field"><div className="lbl">Format / Poids</div><input className="inp" placeholder="250g" value={form.weight||""} onChange={e=>setForm(f=>({...f,weight:e.target.value}))}/></div><div className="field"><div className="lbl">DLC théorique (jours)</div><input className="inp" type="number" value={form.shelf_life_days||21} onChange={e=>setForm(f=>({...f,shelf_life_days:+e.target.value}))}/></div></div>
              <div className="field"><div className="lbl">Catégorie</div><input className="inp" placeholder="Tortilla Classique" value={form.category||""} onChange={e=>setForm(f=>({...f,category:e.target.value}))}/></div>
            </div>
            <div className="panel-footer"><button className="btn btn-neutral btn-sm" onClick={()=>setPanel(null)}>Annuler</button><button className="btn btn-acc btn-sm" onClick={save}><Ico n="chk" size={14} stroke="#fff"/>Sauvegarder</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────
function SettingsView({user,toast}){
  const[vendors,setVendors]=useState([]);
  const[settings,setSettings]=useState({gm_email:"direction@btfood.tn",return_alert_pct:"3",dlc_alert_days:"3"});
  const[panel,setPanel]=useState(null);
  const[vForm,setVForm]=useState({code:"",name:"",phone:"",vehicle_plate:"",zone:""});
  const[loading,setLoading]=useState(true);

  const load=async()=>{
    setLoading(true);
    const[{data:v},{data:s}]=await Promise.all([sb.from("vendors").select("*").eq("is_active",true).order("name"),sb.from("app_settings").select("key,value")]);
    setVendors(v||[]);
    if(s)setSettings(prev=>({...prev,...Object.fromEntries(s.map(x=>[x.key,x.value]))}));
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const saveSetting=async(key,value)=>{await sb.from("app_settings").update({value,updated_at:new Date().toISOString()}).eq("key",key);toast("✅ Sauvegardé","ok");};
  const saveVendor=async()=>{
    if(!vForm.name||!vForm.vehicle_plate){toast("Nom et véhicule requis","err");return;}
    if(panel.mode==="edit")await sb.from("vendors").update({...vForm,updated_at:new Date().toISOString()}).eq("id",panel.data.id);
    else await sb.from("vendors").insert({...vForm,code:vForm.code||"V"+Date.now()});
    toast(panel.mode==="edit"?"✅ Vendeur modifié":"✅ Vendeur ajouté","ok");setPanel(null);load();
  };
  const delVendor=async(id)=>{if(!confirm("Désactiver ce vendeur ?"))return;await sb.from("vendors").update({is_active:false}).eq("id",id);toast("Vendeur désactivé","ok");load();};

  return(
    <div>
      <div className="content-header"><div className="content-title">Configuration</div><div className="content-sub">Paramètres système · Vendeurs</div></div>
      <div className="content-body">
        {loading?<div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>Chargement…</div>:<>
          {/* App settings */}
          <div className="card" style={{marginBottom:20}}>
            <div className="card-header"><div className="card-header-title">⚙️ Paramètres Direction</div></div>
            <div className="card-body">
              <div className="grid2">
                <div className="field"><div className="lbl">Email Direction (destinataire BL/BR)</div><input className="inp" type="email" value={settings.gm_email} onChange={e=>setSettings(s=>({...s,gm_email:e.target.value}))} onBlur={()=>saveSetting("gm_email",settings.gm_email)}/></div>
                <div className="field"><div className="lbl">Seuil alerte taux retour (%)</div><input className="inp" type="number" value={settings.return_alert_pct} onChange={e=>setSettings(s=>({...s,return_alert_pct:e.target.value}))} onBlur={()=>saveSetting("return_alert_pct",settings.return_alert_pct)}/></div>
                <div className="field"><div className="lbl">Alerte DLC (jours avant expiration)</div><input className="inp" type="number" value={settings.dlc_alert_days} onChange={e=>setSettings(s=>({...s,dlc_alert_days:e.target.value}))} onBlur={()=>saveSetting("dlc_alert_days",settings.dlc_alert_days)}/></div>
              </div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:8}}>💾 Les paramètres sont sauvegardés automatiquement à la saisie</div>
            </div>
          </div>

          {/* Vendors */}
          <div className="card">
            <div className="card-header"><div className="card-header-title">👤 Vendeurs / Chauffeurs</div><button className="btn btn-acc btn-sm" onClick={()=>{setVForm({code:"",name:"",phone:"",vehicle_plate:"",zone:""});setPanel({mode:"add"});}}><Ico n="plus" size={14} stroke="#fff"/>Ajouter</button></div>
            <div className="tbl-wrap" style={{borderRadius:0,border:"none"}}>
              <table className="tbl">
                <thead><tr><th>Code</th><th>Nom</th><th>Téléphone</th><th>Véhicule</th><th>Zone</th><th>Actions</th></tr></thead>
                <tbody>{vendors.map(v=>(
                  <tr key={v.id}>
                    <td><span className="tag">{v.code}</span></td>
                    <td style={{fontWeight:600}}>{v.name}</td>
                    <td className="mono-cell">{v.phone||"—"}</td>
                    <td><span className="tag">{v.vehicle_plate}</span></td>
                    <td>{v.zone||"—"}</td>
                    <td onClick={e=>e.stopPropagation()}>
                      <div className="actions">
                        <button className="btn-ico" onClick={()=>{setVForm(v);setPanel({mode:"edit",data:v});}}><Ico n="edit" size={14}/></button>
                        <button className="btn-ico" onClick={()=>delVendor(v.id)}><Ico n="trash" size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>}
      </div>

      {panel&&(
        <div className="panel-overlay" onClick={e=>e.target===e.currentTarget&&setPanel(null)}>
          <div className="panel" style={{maxWidth:480}}>
            <div className="panel-header"><div><div className="panel-title">{panel.mode==="add"?"Nouveau Vendeur":"Modifier Vendeur"}</div></div><button className="panel-close" onClick={()=>setPanel(null)}><Ico n="x" size={16} stroke="#fff"/></button></div>
            <div className="panel-body">
              <div className="field"><div className="lbl">Nom complet *</div><input className="inp" value={vForm.name} onChange={e=>setVForm(f=>({...f,name:e.target.value}))}/></div>
              <div className="grid2">
                <div className="field"><div className="lbl">Code interne</div><input className="inp" placeholder="V01" value={vForm.code||""} onChange={e=>setVForm(f=>({...f,code:e.target.value}))}/></div>
                <div className="field"><div className="lbl">Téléphone</div><input className="inp" placeholder="9X XXX XXX" value={vForm.phone||""} onChange={e=>setVForm(f=>({...f,phone:e.target.value}))}/></div>
              </div>
              <div className="grid2">
                <div className="field"><div className="lbl">N° Véhicule *</div><input className="inp" placeholder="TU-123-TN" value={vForm.vehicle_plate||""} onChange={e=>setVForm(f=>({...f,vehicle_plate:e.target.value}))}/></div>
                <div className="field"><div className="lbl">Zone</div><input className="inp" placeholder="Ben Arous…" value={vForm.zone||""} onChange={e=>setVForm(f=>({...f,zone:e.target.value}))}/></div>
              </div>
            </div>
            <div className="panel-footer"><button className="btn btn-neutral btn-sm" onClick={()=>setPanel(null)}>Annuler</button><button className="btn btn-acc btn-sm" onClick={saveVendor}><Ico n="chk" size={14} stroke="#fff"/>Sauvegarder</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ACCÈS RAPIDE (2 boutons sans mot de passe) ───────────────────────────────
const ROLES = [
  { id:"operator", label:"Opérateur",    desc:"Saisie des bons de livraison et retour", icon:"🚛", color:"var(--acc)"    },
  { id:"gm",       label:"Directeur GM", desc:"Dashboard, catalogue, rapports Excel",   icon:"📊", color:"var(--purple)" },
];

function LoginPage(){
  const[loading,setLoading]=useState(null);
  const[err,setErr]=useState("");

  const enter=async(role)=>{
    setLoading(role.id); setErr("");
    // Connexion anonyme — aucun mot de passe requis
    const{data,error}=await sb.auth.signInAnonymously();
    if(error){ setErr(error.message); setLoading(null); return; }
    // Enregistrer le rôle choisi dans user_profiles
    await sb.from("user_profiles").upsert({
      id: data.user.id,
      full_name: role.label,
      role: role.id==="gm"?"gm":"operator",
    });
    setLoading(null);
    // onAuthStateChange dans App détecte la session automatiquement
  };

  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column"}}>
      <div style={{background:"var(--shell)",height:48,display:"flex",alignItems:"center",padding:"0 20px",gap:12}}>
        <div style={{width:28,height:28,background:"var(--acc)",borderRadius:"var(--r)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M1 3h15v13H1z M16 8h4l3 3v5h-7V8z"/></svg></div>
        <div style={{color:"#fff",fontWeight:600,fontSize:14}}>Module Sortie &amp; Retour PF</div>
        <div style={{color:"rgba(255,255,255,.5)",fontSize:11,marginLeft:4}}>BT Food Industry</div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{width:"100%",maxWidth:420}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontSize:22,fontWeight:700,color:"var(--text)",marginBottom:6}}>Choisissez votre rôle</div>
            <div style={{fontSize:13,color:"var(--muted)"}}>Appuyez pour entrer — aucun mot de passe</div>
          </div>
          {err&&<div style={{background:"var(--error-l)",border:"1px solid rgba(187,0,0,.2)",borderRadius:"var(--r)",padding:"10px 14px",fontSize:13,color:"var(--error)",marginBottom:20,fontWeight:600,textAlign:"center"}}>⚠️ {err}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {ROLES.map(role=>(
              <button key={role.id} onClick={()=>enter(role)} disabled={!!loading}
                style={{background:"var(--surf)",border:`2px solid ${loading===role.id?role.color:"var(--bord)"}`,borderRadius:"var(--r-lg)",padding:"20px 24px",cursor:"pointer",display:"flex",alignItems:"center",gap:18,textAlign:"left",boxShadow:"var(--sh)",transition:"all .15s",opacity:loading&&loading!==role.id?.5:1}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=role.color;e.currentTarget.style.boxShadow="var(--sh-md)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=loading===role.id?role.color:"var(--bord)";e.currentTarget.style.boxShadow="var(--sh)";}}>
                <div style={{width:52,height:52,borderRadius:"var(--r-md)",background:`${role.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>
                  {loading===role.id?"⏳":role.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:3}}>{role.label}</div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>{role.desc}</div>
                </div>
                <div style={{color:role.color,fontSize:20,fontWeight:300}}>›</div>
              </button>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:28,fontSize:11,color:"var(--subtle)",fontFamily:"var(--mono)"}}>BT Food Industry · MF 1887237 G.A.M 000</div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App(){
  const[user,setUser]=useState(null);
  const[profile,setProfile]=useState(null);
  const[page,setPage]=useState("home");
  const[docPanel,setDocPanel]=useState(null);
  const[vendors,setVendors]=useState([]);
  const[products,setProducts]=useState([]);
  const[gmEmail,setGmEmail]=useState("direction@btfood.tn");
  const[toasts,addToast]=useToasts();
  const[loading,setLoading]=useState(true);

  // Auth check
  useEffect(()=>{
    sb.auth.getSession().then(({data:{session}})=>{
      if(session?.user){setUser(session.user);loadProfile(session.user.id);}
      else setLoading(false);
    });
    const{data:{subscription}}=sb.auth.onAuthStateChange((_ev,session)=>{
      if(session?.user){setUser(session.user);loadProfile(session.user.id);}
      else{setUser(null);setProfile(null);setLoading(false);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  const loadProfile=async(uid)=>{
    const{data:p}=await sb.from("user_profiles").select("*").eq("id",uid).single();
    setProfile(p);
    // Load vendors + products + settings
    const[{data:v},{data:pr},{data:s}]=await Promise.all([
      sb.from("vendors").select("*").eq("is_active",true).order("name"),
      sb.from("products").select("*").eq("is_active",true).order("ref"),
      sb.from("app_settings").select("key,value"),
    ]);
    setVendors(v||[]);setProducts(pr||[]);
    const emailSetting=s?.find(x=>x.key==="gm_email");
    if(emailSetting)setGmEmail(emailSetting.value);
    setLoading(false);
  };

  const logout=async()=>{await sb.auth.signOut();setUser(null);setProfile(null);setPage("home");};
  const reload=()=>{if(user)loadProfile(user.id);};

  if(loading)return<><style>{CSS}</style><div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)",fontSize:14,gap:10}}><span style={{fontSize:20}}>⚙️</span>Chargement…</div></>;
  if(!user)return<><style>{CSS}</style><LoginPage/></>;

  const isGM=profile?.role==="gm"||profile?.role==="admin";

  const navItems = isGM ? [
    {id:"home",   label:"Dashboard",      icon:"dash"},
    {id:"bl",     label:"Bons Livraison", icon:"truck"},
    {id:"br",     label:"Bons Retour",    icon:"ret"},
    {id:"catalog",label:"Catalogue",      icon:"box"},
    {id:"settings",label:"Configuration", icon:"settings"},
  ] : [
    {id:"home",   label:"Accueil",         icon:"home"},
    {id:"bl",     label:"Hist. BL",        icon:"truck"},
    {id:"br",     label:"Hist. BR",        icon:"ret"},
    {id:"settings",label:"Config",         icon:"settings"},
  ];

  const renderContent=()=>{
    if(page==="home"){
      if(isGM)return<GMDashboard/>;
      return(
        <div>
          <div className="content-header">
            <div><div className="content-title">Tableau de bord Opérateur</div><div className="content-sub">{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</div></div>
          </div>
          <div className="content-body">
            <div className="tiles" style={{gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))"}}>
              <div className="tile" onClick={()=>setDocPanel("BL")} style={{cursor:"pointer"}}>
                <div className="tile-stripe" style={{background:"var(--acc)"}}/>
                <div className="tile-icon">🚛</div>
                <div className="tile-lbl">Nouveau Bon de Livraison</div>
                <div className="tile-sub">Photographier + IA + Valider</div>
              </div>
              <div className="tile" onClick={()=>setDocPanel("BR")} style={{cursor:"pointer"}}>
                <div className="tile-stripe" style={{background:"var(--error)"}}/>
                <div className="tile-icon">↩️</div>
                <div className="tile-lbl">Nouveau Bon de Retour</div>
                <div className="tile-sub">Photo + IA cause + Valider</div>
              </div>
              <div className="tile" onClick={()=>setPage("bl")}>
                <div className="tile-stripe" style={{background:"var(--acc)"}}/>
                <div className="tile-icon">📋</div>
                <div className="tile-lbl">Historique BL</div>
                <div className="tile-sub">Voir, imprimer, envoyer</div>
              </div>
              <div className="tile" onClick={()=>setPage("br")}>
                <div className="tile-stripe" style={{background:"var(--error)"}}/>
                <div className="tile-icon">📁</div>
                <div className="tile-lbl">Historique BR</div>
                <div className="tile-sub">Voir, imprimer, envoyer</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if(page==="bl")return<HistoryView type="BL" vendors={vendors} gmEmail={gmEmail} toast={addToast}/>;
    if(page==="br")return<HistoryView type="BR" vendors={vendors} gmEmail={gmEmail} toast={addToast}/>;
    if(page==="catalog")return<CatalogView toast={addToast}/>;
    if(page==="settings")return<SettingsView user={user} toast={addToast}/>;
  };

  return(
    <>
      <style>{CSS}</style>
      <div className="web-app">
        {/* Shell top bar */}
        <div className="shell">
          <div className="shell-logo"><svg viewBox="0 0 24 24"><path d="M1 3h15v13H1z M16 8h4l3 3v5h-7V8z"/></svg></div>
          <div className="shell-title">Module Sortie &amp; Retour PF</div>
          <div className="shell-sep"/>
          <div className="shell-context">BT Food Industry · {isGM?"Direction GM":"Opérateur"}</div>
          <div className="shell-right">
            {!isGM&&<>
              <button className="shell-btn" onClick={()=>setDocPanel("BL")}>+ Nouveau BL</button>
              <button className="shell-btn" style={{background:"rgba(192,57,43,.4)",color:"#fff"}} onClick={()=>setDocPanel("BR")}>+ Nouveau BR</button>
            </>}
            <div className="shell-user">
              <div className="shell-avatar">{(user.email||"?").slice(0,2).toUpperCase()}</div>
              <span style={{display:"none"}}>{user.email}</span>
            </div>
            <button className="shell-btn" onClick={logout} title="Déconnexion"><Ico n="logout" size={15} stroke="rgba(255,255,255,.75)"/></button>
          </div>
        </div>

        {/* Body */}
        <div className="web-body">
          {/* Sidebar (desktop) */}
          <div className="sidebar">
            <div className="sidebar-section">
              <div className="sidebar-label">Navigation</div>
              {navItems.map(n=>(
                <div key={n.id} className={`sidebar-item ${page===n.id?"active":""}`} onClick={()=>setPage(n.id)}>
                  <Ico n={n.icon} size={16}/>{n.label}
                </div>
              ))}
            </div>
            {!isGM&&(
              <div className="sidebar-section" style={{borderTop:"1px solid var(--bord)"}}>
                <div className="sidebar-label">Actions rapides</div>
                <div className="sidebar-item" onClick={()=>setDocPanel("BL")} style={{color:"var(--acc)"}}>
                  <Ico n="plus" size={16}/>Nouveau BL
                </div>
                <div className="sidebar-item" onClick={()=>setDocPanel("BR")} style={{color:"var(--error)"}}>
                  <Ico n="plus" size={16}/>Nouveau BR
                </div>
              </div>
            )}
            <div className="sidebar-footer">
              <div style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)"}}>MF 1887237 G.A.M 000</div>
              <div style={{fontSize:10,color:"var(--subtle)"}}>Supabase · Claude Vision</div>
            </div>
          </div>

          {/* Main content */}
          <div className="content">{renderContent()}</div>
        </div>

        {/* Mobile bottom nav */}
        <div className="mobile-nav">
          <div className="mob-nav-tabs">
            {navItems.map(n=>(
              <div key={n.id} className={`mob-tab ${page===n.id?"on":""}`} onClick={()=>setPage(n.id)}>
                <Ico n={n.icon} size={20}/><span>{n.label}</span>
              </div>
            ))}
          </div>
          {!isGM&&(
            <div className="mob-actions">
              <button className="mob-act mob-act-bl" onClick={()=>setDocPanel("BL")}>+ Nouveau BL</button>
              <button className="mob-act mob-act-br" onClick={()=>setDocPanel("BR")}>+ Nouveau BR</button>
            </div>
          )}
        </div>
      </div>

      {/* Doc form panels */}
      {docPanel&&<DocFormPanel type={docPanel} vendors={vendors} products={products} onSave={reload} onClose={()=>setDocPanel(null)} toast={addToast}/>}

      <Toasts toasts={toasts}/>

      <style>{`@media print{.shell,.sidebar,.mobile-nav,.panel-overlay,.toast-wrap,.doc-fab{display:none!important}.content{overflow:visible!important}}
/* ── DOCUMENT QUICK ACCESS ── */
.doc-fab{position:fixed;bottom:20px;right:20px;z-index:150;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.doc-fab-btn{width:52px;height:52px;border-radius:50%;background:var(--shell);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:var(--sh-lg);font-size:20px;transition:transform .15s}
.doc-fab-btn:hover{transform:scale(1.08)}
.doc-fab-menu{background:var(--surf);border:1px solid var(--bord);border-radius:var(--r-lg);box-shadow:var(--sh-lg);min-width:280px;overflow:hidden}
.doc-fab-header{background:var(--shell);padding:10px 14px;display:flex;align-items:center;justify-content:space-between}
.doc-fab-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--surf3);cursor:pointer;transition:background .12s}
.doc-fab-item:last-child{border-bottom:none}
.doc-fab-item:hover{background:var(--surf2)}

/* ── PHOTO STEPS ── */
.photo-steps{display:flex;gap:0;margin-bottom:16px;border:1px solid var(--bord);border-radius:var(--r-md);overflow:hidden}
.photo-step{flex:1;padding:10px 12px;text-align:center;cursor:pointer;transition:all .15s;border-right:1px solid var(--bord);font-size:12px;font-weight:600}
.photo-step:last-child{border-right:none}
.photo-step.active{background:var(--acc);color:#fff}
.photo-step.done{background:var(--success-l);color:var(--success)}
.photo-step.idle{background:var(--surf2);color:var(--muted)}

/* ── ML CAUSE LEARNING ── */
.ml-result{border:2px solid var(--acc);border-radius:var(--r-md);padding:14px;background:linear-gradient(135deg,#f8fbff,#f0f7ff);margin-bottom:14px}
.ml-bar{height:6px;background:var(--surf3);border-radius:3px;overflow:hidden;margin-top:4px}
.ml-bar-fill{height:100%;border-radius:3px;background:var(--acc);transition:width .5s}
.confidence-high{color:var(--success)}.confidence-med{color:var(--warn)}.confidence-low{color:var(--error)}

/* ── EXCEL EXPORT ── */
.export-btn{background:var(--success);color:#fff;border:none;border-radius:var(--r);padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.export-btn:hover{opacity:.9}

/* ── PHOTO CLOUD ── */
.photo-cloud-link{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--acc);text-decoration:none;margin-top:4px}
.photo-cloud-link:hover{text-decoration:underline}
.photo-grid{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.photo-item{position:relative;border-radius:var(--r-md);overflow:hidden;border:1px solid var(--bord)}
.photo-item img{width:80px;height:80px;object-fit:cover;display:block}
.photo-item-overlay{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.55);padding:3px 4px;font-size:9px;color:#fff;text-align:center}

/* ── NOTIFICATION BADGE ── */
.notif-badge{position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--error);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid var(--shell)}
`}</style>
    </>
  );
}
