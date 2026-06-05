// useNotifications — global notification system
import { useState } from "react";

export function useNotifications() {
  const [notifications, setNotifications] = useState([
    { id:"n1", type:"alert", sev:"critical", title:"TC2505-260509 DLC imminente", read:false, createdAt:"2026-05-09T07:00:00" },
    { id:"n2", type:"qc",    sev:"high",     title:"Lot TC3010-260512 en attente décision QC", read:false, createdAt:"2026-05-09T08:00:00" },
    { id:"n3", type:"achat", sev:"medium",   title:"CMP-2026-0002 bloquée depuis 4j", read:false, createdAt:"2026-05-09T09:00:00" },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id) => setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifications(ns => ns.map(n => ({ ...n, read: true })));

  const addNotification = (type, sev, title) =>
    setNotifications(ns => [{
      id: `n${Date.now()}`,
      type, sev, title,
      read: false,
      createdAt: new Date().toISOString(),
    }, ...ns]);

  return { notifications, unreadCount, markRead, markAllRead, addNotification };
}
