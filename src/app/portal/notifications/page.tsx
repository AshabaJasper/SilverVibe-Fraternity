"use client";
import { NOTIFICATIONS_DATA } from "@/lib/mock-data";
import {
  Bell, ArrowDownRight, Clock, Megaphone, Settings, CheckCheck,
  CreditCard, AlertCircle,
} from "lucide-react";
import { useState } from "react";

const iconMap: Record<string, React.ElementType> = {
  transaction: ArrowDownRight,
  reminder: Clock,
  announcement: Megaphone,
  system: Settings,
  loan: CreditCard,
};
const colorMap: Record<string, string> = {
  transaction: "#22c55e",
  reminder: "#f59e0b",
  announcement: "#4A90D9",
  system: "#64748b",
  loan: "#a855f7",
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState(NOTIFICATIONS_DATA);

  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold dm-text">Notifications</h1>
          <p className="dm-text-secondary text-sm">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 px-3 py-2 text-sm text-[#4A90D9] hover:bg-[#4A90D9]/5 rounded-lg transition-colors">
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {["all", "transaction", "reminder", "announcement", "system"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === f
                ? "bg-[#1A1A1A] text-white"
                : "dm-surface border dm-border dm-text-secondary hover:dm-surface-hover"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((n) => {
          const Icon = iconMap[n.type] || Bell;
          const color = colorMap[n.type] || "#64748b";
          return (
            <div
              key={n.id}
              className={`glass-card rounded-xl p-4 flex items-start gap-3 transition-all hover:shadow-md cursor-pointer ${
                !n.read ? "border-l-4" : ""
              }`}
              style={{ borderLeftColor: !n.read ? color : "transparent" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${!n.read ? "dm-text" : "dm-text-secondary"}`}>{n.title}</p>
                  <span className="text-xs dm-text-secondary whitespace-nowrap">{n.date}</span>
                </div>
                <p className="text-xs dm-text-secondary mt-0.5">{n.message}</p>
              </div>
              {!n.read && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: color }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
