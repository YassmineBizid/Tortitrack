import { useState, useEffect } from "react";

/* ── Card ─────────────────────────────────────────────────────────────── */
export function Card({ className = "", style, children }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`} style={style}>
      {children}
    </div>
  );
}

/* ── Btn ──────────────────────────────────────────────────────────────── */
const BTN_VARIANTS = {
  primary:   "bg-blue-600 hover:bg-blue-700 text-white border-transparent",
  success:   "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent",
  warning:   "bg-amber-500 hover:bg-amber-600 text-white border-transparent",
  danger:    "bg-red-600 hover:bg-red-700 text-white border-transparent",
  secondary: "bg-white hover:bg-gray-50 text-gray-700 border-gray-200",
  ghost:     "bg-transparent hover:bg-gray-100 text-gray-600 border-transparent",
  purple:    "bg-purple-600 hover:bg-purple-700 text-white border-transparent",
};
const BTN_SIZES = {
  xs: "text-xs px-2 py-1 rounded-lg gap-1",
  sm: "text-xs px-3 py-1.5 rounded-xl gap-1.5",
  md: "text-sm px-4 py-2 rounded-xl gap-2",
  lg: "text-base px-5 py-2.5 rounded-xl gap-2",
};
export function Btn({ variant = "secondary", size = "sm", type = "button", onClick, disabled, children, className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BTN_VARIANTS[variant] || BTN_VARIANTS.secondary} ${BTN_SIZES[size] || BTN_SIZES.sm} ${className}`}
    >
      {children}
    </button>
  );
}

/* ── Bdg (Badge) ──────────────────────────────────────────────────────── */
const BDG_COLORS = {
  green:  "bg-emerald-100 text-emerald-800 border-emerald-200",
  red:    "bg-red-100 text-red-800 border-red-200",
  amber:  "bg-amber-100 text-amber-800 border-amber-200",
  blue:   "bg-blue-100 text-blue-800 border-blue-200",
  gray:   "bg-gray-100 text-gray-700 border-gray-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
};
export function Bdg({ color = "gray", children }) {
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${BDG_COLORS[color] || BDG_COLORS.gray}`}>
      {children}
    </span>
  );
}

/* ── Field ────────────────────────────────────────────────────────────── */
export function Field({ label, children }) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>}
      {children}
    </div>
  );
}

/* ── TextInput ────────────────────────────────────────────────────────── */
export function TextInput({ label, type = "text", value, onChange, placeholder, className = "" }) {
  return (
    <Field label={label}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
      />
    </Field>
  );
}

/* ── SelectInput ──────────────────────────────────────────────────────── */
export function SelectInput({ label, value, onChange, className = "", children }) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={onChange}
        className={`border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
      >
        {children}
      </select>
    </Field>
  );
}

/* ── Modal ────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, maxWidth = "max-w-2xl", children }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="font-bold text-gray-900">{title}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

/* ── Toast ────────────────────────────────────────────────────────────── */
export function Toast({ message, onDone, duration = 3000, color }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [message, onDone, duration]);

  if (!message) return null;
  return (
    <div
      className="fixed top-4 right-4 z-50 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl"
      style={{ background: color || "#111827", animation: "fadeInRight .2s ease" }}
    >
      {message}
    </div>
  );
}

/* ── Input (alias TextInput) ──────────────────────────────────────────── */
export function Input({ label, type = "text", value, onChange, placeholder, className = "" }) {
  return (
    <Field label={label}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[40px] ${className}`}
      />
    </Field>
  );
}

/* ── Select (alias SelectInput) ───────────────────────────────────────── */
export function Select({ label, value, onChange, className = "", children }) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={onChange}
        className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[40px] ${className}`}
      >
        {children}
      </select>
    </Field>
  );
}

/* ── Textarea ─────────────────────────────────────────────────────────── */
export function Textarea({ label, value, onChange, placeholder, rows = 3, className = "" }) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none ${className}`}
      />
    </Field>
  );
}

/* ── StatusBadge ──────────────────────────────────────────────────────── */
export function StatusBadge({ label, color = "#6b7280", bg = "#f3f4f6" }) {
  return (
    <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border" style={{ color, background: bg, borderColor: color + "40" }}>
      {label}
    </span>
  );
}

/* ── ProgressBar ──────────────────────────────────────────────────────── */
const PROGRESS_COLORS = {
  green:  "#10b981",
  red:    "#ef4444",
  amber:  "#f59e0b",
  blue:   "#3b82f6",
  purple: "#7c3aed",
};
export function ProgressBar({ value = 0, max = 100, color = "blue", height = 8 }) {
  const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  const fill = PROGRESS_COLORS[color] || color;
  return (
    <div style={{ height, background: "#e5e7eb", borderRadius: 99, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: fill, borderRadius: 99, transition: "width .3s" }} />
    </div>
  );
}

/* ── BlockModal ───────────────────────────────────────────────────────── */
export function BlockModal({ open, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.5)" }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">{children}</div>
    </div>
  );
}

/* ── exportCSV ────────────────────────────────────────────────────────── */
export function exportCSV(data, columns, filename = "export") {
  const header = columns.map((c) => `"${c.label}"`).join(";");
  const rows = data.map((row) => columns.map((c) => `"${row[c.key] ?? ""}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + header + "\n" + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ── ExportBar ────────────────────────────────────────────────────────── */
export function ExportBar({ onCSV, onExcel, onPrint }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {onCSV    && <button onClick={onCSV}   className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-semibold">⬇ CSV</button>}
      {onExcel  && <button onClick={onExcel} className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-semibold">⬇ Excel</button>}
      {onPrint  && <button onClick={onPrint} className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-semibold">🖨 Imprimer</button>}
    </div>
  );
}

/* ── ExportFullMenu ───────────────────────────────────────────────────── */
export function ExportFullMenu({ type, data }) {
  const [open, setOpen] = useState(false);
  const exportCSVData = () => {
    const rows = (data || []).map(r => Object.values(r).join(";")).join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${type || "export"}.csv`; a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-semibold flex items-center gap-1">
        ⬇ Export ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-gray-100 min-w-[160px] py-1">
          <button onClick={exportCSVData} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 font-semibold">⬇ CSV</button>
          <button onClick={() => { window.print(); setOpen(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 font-semibold">🖨 Imprimer</button>
        </div>
      )}
    </div>
  );
}

/* ── MobileFAB ────────────────────────────────────────────────────────── */
export function MobileFAB({ actions = [] }) {
  const [open, setOpen] = useState(false);
  if (!actions.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-40 md:hidden flex flex-col-reverse gap-3 items-end">
      {open && actions.map((a, i) => (
        <button key={i} onClick={() => { a.onClick(); setOpen(false); }}
          className="flex items-center gap-2 bg-white shadow-xl border border-gray-100 rounded-full px-4 py-2 text-sm font-semibold text-gray-700">
          <span>{a.icon}</span><span>{a.label}</span>
        </button>
      ))}
      <button onClick={() => setOpen(v => !v)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center text-2xl transition-all"
        style={{ transform: open ? "rotate(45deg)" : "none" }}>
        +
      </button>
    </div>
  );
}
