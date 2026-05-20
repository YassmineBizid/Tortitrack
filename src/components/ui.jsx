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
};
const BTN_SIZES = {
  xs: "text-xs px-2 py-1 rounded-lg gap-1",
  sm: "text-xs px-3 py-1.5 rounded-xl gap-1.5",
  md: "text-sm px-4 py-2 rounded-xl gap-2",
  lg: "text-base px-5 py-2.5 rounded-xl gap-2",
};
export function Btn({ variant = "secondary", size = "sm", onClick, disabled, children, className = "" }) {
  return (
    <button
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
export function Toast({ message, onDone, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [message, onDone, duration]);

  if (!message) return null;
  return (
    <div
      className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl"
      style={{ animation: "fadeInRight .2s ease" }}
    >
      {message}
    </div>
  );
}
