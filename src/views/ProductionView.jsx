import { useState, useEffect } from "react";
import { Card, Btn, Bdg, Modal, Input, Select, Textarea, Toast } from "../components/ui.jsx";
import { ARTS, fmt, TODAY, genLot, parseDur, fmtDur } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

function Field({ label, children, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      {children}
    </div>
  );
}

function KpiItem({ label, value, good, warn }) {
  const numVal = parseFloat(value);
  const clr = numVal >= good ? "#059669" : numVal >= warn ? "#d97706" : "#dc2626";
  const bg  = numVal >= good ? "#ecfdf5" : numVal >= warn ? "#fef3c7" : "#fef2f2";
  return (
    <div className="rounded-xl border p-4 text-center" style={{ background: bg, borderColor: clr + "30" }}>
      <div className="text-xs font-bold uppercase tracking-wider mb-2 opacity-60">{label}</div>
      <div className="text-2xl font-black" style={{ color: clr }}>{value}</div>
    </div>
  );
}

export default function ProductionView({ user, lots, setLots, addAudit, arts: artsProp = [], onSaved }) {
  // Use Supabase arts if available, fallback to demo ARTS
  const arts = artsProp.length > 0 ? artsProp : ARTS;
  const initLines = () => arts.map(a => ({ artId: a.id, commande: "", produit: "", df: TODAY, dlc: "", lot: "" }));
  const [form, setForm] = useState({ date: TODAY, hDebut: "07:00", hFin: "15:00", farineKg: "", pertePSF: "", pertePF: "", commentaire: "", lines: initLines() });
  const [kpisVisible, setKpisVisible] = useState(false);
  const [toast, setToast]   = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [brands, setBrands] = useState([]);

  // Load brands from Supabase
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const { data } = await sb.from("brands").select("id, name");
        if (data) setBrands(data);
      } catch (e) {
        console.error("Error loading brands:", e);
      }
    };
    loadBrands();
  }, []);

  // Extract unique brands from articles and match with brand names
  const uniqueBrands = arts.length > 0 
    ? Array.from(new Map(
        arts
          .filter(a => a.brand_id || a.marque_id)
          .map(a => {
            const brandId = a.brand_id || a.marque_id;
            const brandObj = brands.find(b => b.id === brandId);
            return [brandId, { id: brandId, name: brandObj?.name || a.brand_name || a.marque || "Sans marque" }];
          })
      ).values())
      .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Filter articles by selected brand
  const filteredArticles = selectedBrandId
    ? arts.filter(a => (a.brand_id || a.marque_id) === selectedBrandId)
    : arts;

  const dur = parseDur(form.hDebut, form.hFin);
  const tp  = form.lines.reduce((s, l) => s + (parseInt(l.produit) || 0), 0);
  const tc  = form.lines.reduce((s, l) => s + (parseInt(l.commande) || 0), 0);
  const fa  = parseFloat(form.farineKg) || 0;
  const ps  = parseFloat(form.pertePSF) || 0;
  const pf  = parseFloat(form.pertePF)  || 0;
  const kpis = {
    tR:   tc > 0 ? +(tp / tc * 100).toFixed(1) : 0,
    prod: dur > 0 ? Math.round(tp / dur) : 0,
    tPM:  dur > 0 ? +(tp / dur / 10).toFixed(1) : 0,
    tPSF: fa > 0  ? +(ps / fa * 100).toFixed(2) : 0,
    tPF:  fa > 0  ? +(pf / fa * 100).toFixed(2) : 0,
  };

  // Reset lines when products load from Supabase (arts goes from empty → populated)
  useEffect(() => {
    if (!submitted && artsProp.length > 0) {
      setForm(f => ({ ...f, lines: artsProp.map(a => ({ artId: a.id, commande: "", produit: "", df: TODAY, dlc: "", lot: "" })) }));
    }
  }, [artsProp.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const upLine = (idx, k, v) => setForm(f => {
    const ls = [...f.lines];
    ls[idx] = { ...ls[idx], [k]: v, ...(k === "dlc" ? { lot: genLot(v) } : {}) };
    return { ...f, lines: ls };
  });

  const validate = async () => {
    const active = form.lines.filter(l => parseInt(l.produit) > 0 && l.dlc && l.lot);
    if (!active.length) { alert("Saisir au moins une ligne avec quantité, DLC et numéro de lot."); return; }
    const newLots = active.map(l => {
      const a   = arts.find(x => x.id === l.artId);
      const qty = parseInt(l.produit);
      const dl  = Math.ceil((new Date(l.dlc) - new Date()) / 86400000);
      return { id:`L${Date.now()}_${l.artId}`, artId:l.artId, lotNum:l.lot, code:`${a?.code}-${l.lot}-A`, df:l.df, dlc:l.dlc, initQty:qty, availQty:qty, status:"available", riskScore:dl<=3?"high":dl<=7?"medium":"low", qcStatus:"conforme", daysLeft:dl, prodDate:form.date };
    });
    setLots(ls => [...ls, ...newLots]);
    const roles = user?.roles || [];
    addAudit(user.nom, roles[0], "VALIDATE", "productions", `PROD-${form.date}`, `${active.length} lots créés · ${tp.toLocaleString()} pcs · Taux: ${kpis.tR}%`);
    setToast({ msg: `✅ Production validée — ${newLots.length} lot(s) créés dans le stock`, color: "#059669" });
    setSubmitted(true);
    setKpisVisible(true);
    // Persist to Supabase
    try {
      const isUUID = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const lotsToInsert = active.map(l => {
        const a   = arts.find(x => x.id === l.artId);
        const qty = parseInt(l.produit);
        const dl  = Math.ceil((new Date(l.dlc) - new Date()) / 86400000);
        return {
          lot_number:    l.lot,
          internal_code: `${a?.code}-${l.lot}-A`,
          product_id:    isUUID(l.artId) ? l.artId : null,
          prod_date:     form.date,
          expiry_date:   l.dlc,
          init_qty:      qty,
          avail_qty:     qty,
          status:        "available",
          risk_score:    dl <= 3 ? "high" : dl <= 7 ? "medium" : "low",
          operator_id:   user?.id || null,
        };
      });
      const { error } = await sb.from("production_lots").insert(lotsToInsert);
      if (error) {
        console.error("production_lots insert error:", error);
        setToast({ msg: `⚠ Sauvegardé localement — Erreur Supabase: ${error.message}`, color: "#dc2626" });
        return;
      }
      if (onSaved) onSaved();
    } catch (e) {
      console.error("production save:", e);
      setToast({ msg: `⚠ Erreur réseau lors de la sauvegarde`, color: "#dc2626" });
    }
  };

  const reset = () => {
    setForm({ date:TODAY, hDebut:"07:00", hFin:"15:00", farineKg:"", pertePSF:"", pertePF:"", commentaire:"", lines:initLines() });
    setKpisVisible(false);
    setSubmitted(false);
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Saisie Production Journalière</h1><p className="text-xs text-gray-400 mt-0.5">Opérateur / Chef d'Usine · Poste du {form.date}</p></div>
        {submitted && <Btn variant="secondary" onClick={reset}>+ Nouveau poste</Btn>}
      </div>

      {/* Section A — Temps */}
      <Card className="p-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">A — Identification &amp; Durée de production</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Field label="📊 Filtrer par marque">
            <select 
              value={selectedBrandId} 
              onChange={e => setSelectedBrandId(e.target.value)}
              disabled={submitted}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none min-h-[44px] cursor-pointer"
            >
              <option value="">-- Toutes les marques --</option>
              {uniqueBrands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} disabled={submitted}/>
          <Field label="⏱ Heure début">
            <input type="time" value={form.hDebut} onChange={e => setForm(f => ({ ...f, hDebut: e.target.value }))} disabled={submitted} className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-blue-700 focus:outline-none min-h-[44px]"/>
          </Field>
          <Field label="⏱ Heure fin">
            <input type="time" value={form.hFin} onChange={e => setForm(f => ({ ...f, hFin: e.target.value }))} disabled={submitted} className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-blue-700 focus:outline-none min-h-[44px]"/>
          </Field>
          <Field label="Durée calculée">
            <div className="border border-blue-200 bg-blue-50 rounded-xl px-3 py-2 font-mono font-bold text-blue-700 text-base text-center min-h-[44px] flex items-center justify-center">{fmtDur(dur)}</div>
          </Field>
        </div>
      </Card>

      {/* Section B — Quantités */}
      <Card className="p-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">B — Quantités produites</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 750 }}>
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 text-left text-gray-500 font-semibold">Article</th>
                <th className="pb-3 text-center text-blue-600 font-bold">Commandé</th>
                <th className="pb-3 text-center text-emerald-600 font-bold">Produit (pcs)</th>
                <th className="pb-3 text-center text-gray-500 font-semibold">Écart</th>
                <th className="pb-3 text-center text-gray-500 font-semibold">%</th>
                <th className="pb-3 text-left text-gray-500 font-semibold">DF</th>
                <th className="pb-3 text-left text-gray-500 font-semibold">DLC *</th>
                <th className="pb-3 text-left text-gray-500 font-semibold">Lot (auto)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {form.lines.map((line, idx) => {
                const a  = filteredArticles.find(x => x.id === line.artId);
                if (!a) return null;
                const c  = parseInt(line.commande) || 0;
                const p  = parseInt(line.produit)  || 0;
                const ec = c > 0 && p > 0 ? p - c : null;
                const pct= c > 0 && p > 0 ? +(p / c * 100).toFixed(1) : null;
                return (
                  <tr key={line.artId} className="hover:bg-gray-50/50">
                    <td className="py-3 pr-3"><div className="font-bold text-blue-700">{a?.code}</div><div className="text-gray-400 text-xs mt-0.5 max-w-[120px] truncate">{a?.name}</div></td>
                    <td className="py-3 px-2 text-center">
                      <input type="number" min="0" value={line.commande} onChange={e => upLine(idx, "commande", e.target.value)} disabled={submitted} placeholder="0" className="w-20 border border-blue-200 bg-blue-50 rounded-xl px-2 py-1.5 text-sm text-center font-bold text-blue-800 focus:outline-none min-h-[44px]"/>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input type="number" min="0" value={line.produit} onChange={e => upLine(idx, "produit", e.target.value)} disabled={submitted} placeholder="0" className="w-20 border border-emerald-200 bg-emerald-50 rounded-xl px-2 py-1.5 text-sm text-center font-bold text-emerald-800 focus:outline-none min-h-[44px]"/>
                    </td>
                    <td className="py-3 px-2 text-center">{ec !== null ? <span className={`font-bold ${ec >= 0 ? "text-emerald-600" : "text-red-500"}`}>{ec >= 0 ? "+" : ""}{ec}</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="py-3 px-2 text-center">{pct !== null ? <Bdg color={pct >= 100 ? "green" : pct >= 90 ? "amber" : "red"}>{pct}%</Bdg> : <span className="text-gray-300 text-xs">—</span>}</td>
                    <td className="py-3 px-2"><input type="date" value={line.df} onChange={e => upLine(idx, "df", e.target.value)} disabled={submitted} className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none min-h-[36px]" style={{ width: 115 }}/></td>
                    <td className="py-3 px-2"><input type="date" value={line.dlc} onChange={e => upLine(idx, "dlc", e.target.value)} disabled={submitted} className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none min-h-[36px]" style={{ width: 115 }}/></td>
                    <td className="py-3 px-2">
                      <div className={`border rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-center min-h-[36px] flex items-center justify-center ${line.lot ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-100 bg-gray-50 text-gray-300"}`} style={{ minWidth: 65 }}>{line.lot || "auto"}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="py-2.5 font-bold text-gray-700 px-3">TOTAL</td>
                <td className="py-2.5 text-center font-bold text-blue-700">{tc.toLocaleString()}</td>
                <td className="py-2.5 text-center font-bold text-emerald-700">{tp.toLocaleString()}</td>
                <td className="py-2.5 text-center">{tc > 0 && tp > 0 && <span className={`font-bold ${tp - tc >= 0 ? "text-emerald-600" : "text-red-500"}`}>{tp - tc >= 0 ? "+" : ""}{tp - tc}</span>}</td>
                <td className="py-2.5 text-center">{tc > 0 && tp > 0 && <Bdg color={tp / tc >= 1 ? "green" : tp / tc >= .9 ? "amber" : "red"}>{(tp / tc * 100).toFixed(1)}%</Bdg>}</td>
                <td colSpan={4}/>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Section C — Matières & Pertes */}
      <Card className="p-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">C — Matières premières &amp; Pertes</div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="🌾 Farine (kg) *">
            <div className="flex gap-2">
              <input type="number" min="0" step="0.1" value={form.farineKg} onChange={e => setForm(f => ({ ...f, farineKg: e.target.value }))} disabled={submitted} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none min-h-[44px]"/>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-2 rounded-lg flex items-center">kg</span>
            </div>
          </Field>
          <Field label="⚠ Perte PSF (kg)">
            <div className="flex gap-2">
              <input type="number" min="0" step="0.01" value={form.pertePSF} onChange={e => setForm(f => ({ ...f, pertePSF: e.target.value }))} disabled={submitted} className="flex-1 border border-amber-200 bg-amber-50 rounded-xl px-3 py-2 text-sm focus:outline-none min-h-[44px]"/>
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-2 rounded-lg flex items-center">kg</span>
            </div>
          </Field>
          <Field label="🔴 Perte PF (kg)">
            <div className="flex gap-2">
              <input type="number" min="0" step="0.01" value={form.pertePF} onChange={e => setForm(f => ({ ...f, pertePF: e.target.value }))} disabled={submitted} className="flex-1 border border-red-200 bg-red-50 rounded-xl px-3 py-2 text-sm focus:outline-none min-h-[44px]"/>
              <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-2 rounded-lg flex items-center">kg</span>
            </div>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Commentaire / Incidents">
            <textarea value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))} disabled={submitted} placeholder="Pannes machine, observations qualité, événements du poste..." className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[80px]"/>
          </Field>
        </div>
      </Card>

      {/* Actions */}
      {!submitted && (
        <div className="flex gap-3">
          <Btn variant="primary" onClick={() => setKpisVisible(v => !v)}>{kpisVisible ? "▲ Masquer KPIs" : "📊 Calculer KPIs"}</Btn>
          <Btn variant="success" onClick={validate}>✓ Valider la production</Btn>
          <Btn variant="secondary">💾 Brouillon</Btn>
        </div>
      )}

      {/* KPIs */}
      {kpisVisible && (
        <Card className="p-5 border-blue-100" style={{ background: "linear-gradient(135deg,#f0f9ff,#faf5ff)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">D — KPIs Usine · {form.date}</div>
              <div className="text-xs text-gray-500">Poste: {form.hDebut} → {form.hFin} · Durée: {fmtDur(dur)} · Total: {tp.toLocaleString()}/{tc.toLocaleString()} pcs</div>
            </div>
            {submitted && <Bdg color="green">✅ Production validée</Bdg>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiItem label="Taux réalisation" value={`${kpis.tR}%`} good={95} warn={85}/>
            <KpiItem label="Productivité pcs/h" value={`${kpis.prod}`} good={500} warn={400}/>
            <KpiItem label="Perf. machine %" value={`${kpis.tPM}%`} good={80} warn={60}/>
            <KpiItem label="Chute PSF %" value={`${kpis.tPSF}%`} good={0} warn={99}/>
            <KpiItem label="Chute PF %" value={`${kpis.tPF}%`} good={0} warn={99}/>
          </div>
          {submitted && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              {form.lines.filter(l => parseInt(l.produit) > 0 && l.dlc).length} lots PF créés automatiquement dans le stock. Prêts à être expédiés.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
