export const uid   = () => Math.random().toString(36).slice(2,8).toUpperCase();
export const today = () => new Date().toISOString().split("T")[0];
export const fmt   = d => d ? new Date(d).toLocaleDateString("fr-TN",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
export const daysLeft = dlc => dlc ? Math.ceil((new Date(dlc)-new Date())/86400000) : null;
