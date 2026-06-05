// useAuditLog — tracks all user actions with audit trail + persists to Supabase audit_log
import { useState } from "react";
import { fmtDT } from "../data/demoData";
import { sb } from "../supabaseClient";

export function useAuditLog(initialEntries = []) {
  const [entries, setEntries] = useState(initialEntries);

  const addAudit = (userName, role, action, docType, docNum, comment = "", isException = false) => {
    const entry = {
      id: `au${Date.now()}`,
      user: userName,
      role,
      action,
      docType,
      docNum,
      comment,
      isException,
      createdAt: new Date().toISOString(),
    };
    setEntries(prev => [entry, ...prev]);

    // Persist to Supabase in background (silent on error)
    sb.from("audit_log").insert({
      user_name:    userName,
      user_role:    role,
      action,
      doc_type:     docType,
      doc_number:   docNum,
      comment,
      is_exception: isException,
    }).then(({ error }) => {
      if (error) console.warn("audit_log insert:", error.message);
    });
  };

  return { entries, addAudit };
}
