"use client";
import { useState } from "react";
import { usePersistedState, showToast } from "@/lib/storage";
import Modal from "@/components/Modal";
import {
  Megaphone, Send, MessageSquare, Mail, Bell, Users, Clock,
  Plus, Search, Filter, CheckCircle, Eye, Trash2, Edit2, Save, X,
} from "lucide-react";

interface Announcement {
  id: number; title: string; content: string; audience: string;
  channel: string; sentDate: string | null; status: string; views: number;
}

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  { id: 1, title: "Annual General Meeting Notice", content: "All members are invited to the 2025 AGM scheduled for March 15, 2025 at Silver Springs Hotel, Kampala.", audience: "All Members", channel: "SMS + Email", sentDate: "2025-01-10", status: "sent", views: 298 },
  { id: 2, title: "New Loan Product Launch", content: "We are pleased to announce the launch of our new Agriculture Loan product with rates starting at 14% p.a.", audience: "Active Members", channel: "SMS", sentDate: "2025-01-08", status: "sent", views: 245 },
  { id: 3, title: "System Maintenance Window", content: "The online portal will undergo scheduled maintenance on January 20, 2025 from 10 PM to 6 AM.", audience: "All Members", channel: "Email + Push", sentDate: "2025-01-05", status: "sent", views: 189 },
  { id: 4, title: "Dividend Declaration FY2024", content: "The Board has approved a dividend rate of 12% for FY2024. Payments will be processed by February 28.", audience: "Shareholders", channel: "SMS + Email", sentDate: null, status: "draft", views: 0 },
  { id: 5, title: "Loan Repayment Reminder", content: "This is a friendly reminder that your loan installment is due within the next 5 days.", audience: "Loan Borrowers", channel: "SMS", sentDate: null, status: "scheduled", views: 0 },
];

const SMS_TEMPLATES = [
  { name: "Loan Reminder", template: "Dear {name}, your loan installment of {amount} is due on {date}. Please make payment to avoid penalties. Ref: {ref}" },
  { name: "Deposit Confirmation", template: "Dear {name}, your deposit of {amount} to {account} has been received. New balance: {balance}. Ref: {ref}" },
  { name: "Withdrawal Confirmation", template: "Dear {name}, withdrawal of {amount} from {account} processed. New balance: {balance}. Ref: {ref}" },
  { name: "Meeting Notice", template: "Dear Member, you are invited to {meeting_type} on {date} at {venue}. Time: {time}. RSVP: {phone}" },
];

const AUDIENCES = ["All Members", "Active Members", "Loan Borrowers", "Shareholders", "Dormant Members"];
const CHANNELS = ["SMS", "Email", "Push", "SMS + Email", "Email + Push", "SMS + Email + Push"];

const inputClass = "w-full px-4 py-2.5 border dm-border rounded-xl text-sm dm-surface focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 dm-text";

export default function AdminCommunicationsPage() {
  const [activeTab, setActiveTab] = useState<"announcements" | "compose" | "templates" | "history">("announcements");
  const [composeType, setComposeType] = useState<"sms" | "email" | "push">("sms");
  const [announcements, setAnnouncements] = usePersistedState<Announcement[]>("admin_announcements", DEFAULT_ANNOUNCEMENTS);

  /* modal states */
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const EMPTY = { title: "", content: "", audience: AUDIENCES[0], channel: CHANNELS[0] };
  const [editForm, setEditForm] = useState(EMPTY);

  const openEdit = (a: Announcement) => {
    setSelected(a);
    setEditForm({ title: a.title, content: a.content, audience: a.audience, channel: a.channel });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!selected || !editForm.title) return;
    setAnnouncements((prev) => prev.map((a) => a.id === selected.id
      ? { ...a, title: editForm.title, content: editForm.content, audience: editForm.audience, channel: editForm.channel }
      : a));
    showToast(`"${editForm.title}" updated`);
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (!selected) return;
    setAnnouncements((prev) => prev.filter((a) => a.id !== selected.id));
    showToast(`Announcement deleted`);
    setDeleteOpen(false);
    setSelected(null);
  };

  const handleSend = (a: Announcement) => {
    setAnnouncements((prev) => prev.map((x) => x.id === a.id
      ? { ...x, status: "sent", sentDate: new Date().toISOString().slice(0, 10) }
      : x));
    showToast(`"${a.title}" sent to ${a.audience}`);
  };

  /* compose handler */
  const [composeForm, setComposeForm] = useState({ recipients: "All Members (342)", subject: "", message: "" });
  const handleComposeSend = () => {
    if (!composeForm.message) return;
    const newA: Announcement = {
      id: Date.now(), title: composeForm.subject || `${composeType.toUpperCase()} to ${composeForm.recipients}`,
      content: composeForm.message, audience: composeForm.recipients.replace(/\s*\(.*\)/, ""),
      channel: composeType.toUpperCase(), sentDate: new Date().toISOString().slice(0, 10), status: "sent", views: 0,
    };
    setAnnouncements((prev) => [newA, ...prev]);
    showToast("Message sent successfully");
    setComposeForm({ recipients: "All Members (342)", subject: "", message: "" });
    setActiveTab("announcements");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold dm-text">Communications</h1>
          <p className="dm-text-secondary text-sm">Send announcements, SMS, emails, and push notifications</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors"
          onClick={() => setActiveTab("compose")}>
          <Plus className="w-4 h-4" /> New Message
        </button>
      </div>

      <div className="flex gap-1 dm-surface-hover rounded-xl p-1 overflow-x-auto">
        {(["announcements", "compose", "templates", "history"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-medium transition-colors capitalize whitespace-nowrap ${
              activeTab === t ? "dm-surface dm-text shadow-sm" : "dm-text-secondary hover:dm-text"
            }`}>{t}</button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dm-surface rounded-xl p-5 border dm-border">
          <Send className="w-5 h-5 text-[#4A90D9] mb-2" />
          <p className="text-xs dm-text-secondary">Messages Sent (MTD)</p>
          <p className="text-xl font-bold dm-text">1,247</p>
        </div>
        <div className="dm-surface rounded-xl p-5 border dm-border">
          <MessageSquare className="w-5 h-5 text-[#22c55e] mb-2" />
          <p className="text-xs dm-text-secondary">SMS Credits</p>
          <p className="text-xl font-bold text-[#22c55e]">8,450</p>
        </div>
        <div className="dm-surface rounded-xl p-5 border dm-border">
          <Eye className="w-5 h-5 text-[#a855f7] mb-2" />
          <p className="text-xs dm-text-secondary">Avg Open Rate</p>
          <p className="text-xl font-bold dm-text">78.5%</p>
        </div>
        <div className="dm-surface rounded-xl p-5 border dm-border">
          <Clock className="w-5 h-5 text-[#f59e0b] mb-2" />
          <p className="text-xs dm-text-secondary">Scheduled</p>
          <p className="text-xl font-bold text-[#f59e0b]">3</p>
        </div>
      </div>

      {activeTab === "announcements" && (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="dm-surface rounded-xl p-5 border dm-border hover:shadow-sm transition-all">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold dm-text">{a.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                      a.status === "sent" ? "bg-[#22c55e]/10 text-[#22c55e]" :
                      a.status === "draft" ? "bg-[#64748b]/10 dm-text-secondary" :
                      "bg-[#f59e0b]/10 text-[#f59e0b]"
                    }`}>{a.status}</span>
                  </div>
                  <p className="text-xs dm-text-secondary mb-3">{a.content}</p>
                  <div className="flex flex-wrap gap-3 text-xs dm-text-secondary">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {a.audience}</span>
                    <span className="flex items-center gap-1"><Send className="w-3 h-3" /> {a.channel}</span>
                    {a.sentDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {a.sentDate}</span>}
                    {a.views > 0 && <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {a.views} views</span>}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {a.status === "draft" && (
                    <button onClick={() => handleSend(a)}
                      className="px-3 py-1.5 bg-[#4A90D9] text-white rounded-lg text-xs font-medium hover:bg-[#3a7bc8] transition-colors flex items-center gap-1">
                      <Send className="w-3 h-3" /> Send
                    </button>
                  )}
                  <button onClick={() => openEdit(a)}
                    className="p-1.5 rounded-lg border dm-border hover:dm-surface-hover">
                    <Edit2 className="w-3.5 h-3.5 dm-text-secondary" />
                  </button>
                  <button onClick={() => { setSelected(a); setDeleteOpen(true); }}
                    className="p-1.5 rounded-lg border dm-border hover:bg-[#ef4444]/5">
                    <Trash2 className="w-3.5 h-3.5 text-[#ef4444]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "compose" && (
        <div className="dm-surface rounded-xl p-6 border dm-border">
          <h3 className="font-semibold dm-text mb-5">Compose Message</h3>
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["sms", "email", "push"] as const).map((c) => (
                <button key={c} onClick={() => setComposeType(c)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                    composeType === c ? "bg-[#1A1A1A] text-white" : "dm-surface-hover dm-text-secondary hover:dm-text"
                  }`}>
                  {c === "sms" ? <MessageSquare className="w-3 h-3 inline mr-1" /> :
                   c === "email" ? <Mail className="w-3 h-3 inline mr-1" /> :
                   <Bell className="w-3 h-3 inline mr-1" />}
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-medium dm-text mb-1.5 block">Recipients</label>
              <select className="w-full px-4 py-2.5 border dm-border rounded-xl text-sm dm-surface focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20"
                value={composeForm.recipients} onChange={(e) => setComposeForm({ ...composeForm, recipients: e.target.value })}>
                <option>All Members (342)</option>
                <option>Active Members (310)</option>
                <option>Loan Borrowers (189)</option>
                <option>Shareholders (342)</option>
                <option>Dormant Members (28)</option>
              </select>
            </div>
            {composeType === "email" && (
              <div>
                <label className="text-xs font-medium dm-text mb-1.5 block">Subject</label>
                <input type="text" placeholder="Enter email subject..." value={composeForm.subject}
                  onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                  className="w-full px-4 py-2.5 border dm-border rounded-xl text-sm dm-surface focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium dm-text mb-1.5 block">Message</label>
              <textarea rows={composeType === "sms" ? 3 : 6} placeholder={composeType === "sms" ? "Type your SMS (max 160 chars)..." : "Type your message..."}
                value={composeForm.message} onChange={(e) => setComposeForm({ ...composeForm, message: e.target.value })}
                className="w-full px-4 py-2.5 border dm-border rounded-xl text-sm dm-surface focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 resize-none" />
              {composeType === "sms" && <p className="text-[10px] text-[#C0C0C0] mt-1">{composeForm.message.length}/160 characters</p>}
            </div>
            <div>
              <label className="text-xs font-medium dm-text mb-1.5 block">Schedule</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-xs dm-text-secondary">
                  <input type="radio" name="schedule" defaultChecked className="accent-[#1A1A1A]" /> Send immediately
                </label>
                <label className="flex items-center gap-2 text-xs dm-text-secondary">
                  <input type="radio" name="schedule" className="accent-[#1A1A1A]" /> Schedule for later
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleComposeSend} disabled={!composeForm.message}
                className="px-6 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                <Send className="w-4 h-4" /> Send Message
              </button>
              <button onClick={() => {
                if (!composeForm.message) return;
                const newA: Announcement = {
                  id: Date.now(), title: composeForm.subject || `${composeType.toUpperCase()} Draft`,
                  content: composeForm.message, audience: composeForm.recipients.replace(/\s*\(.*\)/, ""),
                  channel: composeType.toUpperCase(), sentDate: null, status: "draft", views: 0,
                };
                setAnnouncements((prev) => [newA, ...prev]);
                showToast("Saved as draft");
                setComposeForm({ recipients: "All Members (342)", subject: "", message: "" });
                setActiveTab("announcements");
              }}
                className="px-6 py-2.5 border dm-border dm-text-secondary rounded-xl text-sm font-medium hover:dm-surface-hover transition-colors">
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SMS_TEMPLATES.map((t) => (
            <div key={t.name} className="dm-surface rounded-xl p-5 border dm-border">
              <h3 className="font-semibold dm-text mb-2 text-sm">{t.name}</h3>
              <p className="text-xs dm-text-secondary bg-[#f8f9fa] rounded-lg p-3 font-mono">{t.template}</p>
              <div className="flex gap-2 mt-3">
                <button className="px-3 py-1.5 bg-[#4A90D9] text-white rounded-lg text-xs font-medium hover:bg-[#3a7bc8] transition-colors">
                  Use Template
                </button>
                <button className="px-3 py-1.5 border dm-border rounded-lg text-xs font-medium dm-text-secondary hover:dm-surface-hover transition-colors">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "history" && (
        <div className="dm-surface rounded-xl border dm-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8f9fa] border-b dm-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Subject</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold dm-text-secondary">Recipients</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold dm-text-secondary">Delivered</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold dm-text-secondary">Failed</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold dm-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { date: "2025-01-15", type: "SMS", subject: "Loan Payment Reminder", recipients: 189, delivered: 185, failed: 4, status: "completed" },
                  { date: "2025-01-14", type: "Email", subject: "Monthly Statement - December", recipients: 342, delivered: 338, failed: 4, status: "completed" },
                  { date: "2025-01-10", type: "SMS+Email", subject: "AGM Notice", recipients: 342, delivered: 298, failed: 44, status: "completed" },
                  { date: "2025-01-08", type: "SMS", subject: "New Loan Product Launch", recipients: 310, delivered: 245, failed: 65, status: "completed" },
                  { date: "2025-01-05", type: "Push", subject: "System Maintenance", recipients: 256, delivered: 189, failed: 67, status: "completed" },
                ].map((h, i) => (
                  <tr key={i} className="border-b dm-border hover:bg-[#f8f9fa]">
                    <td className="px-4 py-3 text-xs dm-text-secondary">{h.date}</td>
                    <td className="px-4 py-3 text-xs font-medium dm-text">{h.type}</td>
                    <td className="px-4 py-3 text-xs dm-text">{h.subject}</td>
                    <td className="px-4 py-3 text-right text-xs dm-text">{h.recipients}</td>
                    <td className="px-4 py-3 text-right text-xs text-[#22c55e]">{h.delivered}</td>
                    <td className="px-4 py-3 text-right text-xs text-[#ef4444]">{h.failed}</td>
                    <td className="px-4 py-3">
                      <span className="bg-[#22c55e]/10 text-[#22c55e] px-2 py-0.5 rounded-full text-[10px] font-semibold">{h.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======== EDIT ANNOUNCEMENT MODAL ======== */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit — ${selected?.title || ""}`} size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditOpen(false)}
              className="px-4 py-2.5 border dm-border rounded-xl text-sm font-medium dm-text-secondary hover:dm-surface-hover transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={!editForm.title}
              className="px-5 py-2.5 bg-[#4A90D9] text-white rounded-xl text-sm font-medium hover:bg-[#3a7bc8] transition-colors disabled:opacity-40 flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium dm-text-secondary mb-1.5">Title</label>
            <input className={inputClass} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium dm-text-secondary mb-1.5">Content</label>
            <textarea className={`${inputClass} resize-none`} rows={4} value={editForm.content} onChange={(e) => setEditForm({ ...editForm, content: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium dm-text-secondary mb-1.5">Audience</label>
              <select className={inputClass} value={editForm.audience} onChange={(e) => setEditForm({ ...editForm, audience: e.target.value })}>
                {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium dm-text-secondary mb-1.5">Channel</label>
              <select className={inputClass} value={editForm.channel} onChange={(e) => setEditForm({ ...editForm, channel: e.target.value })}>
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* ======== DELETE CONFIRM MODAL ======== */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Announcement" size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteOpen(false)}
              className="px-4 py-2.5 border dm-border rounded-xl text-sm font-medium dm-text-secondary hover:dm-surface-hover transition-colors">Cancel</button>
            <button onClick={handleDelete}
              className="px-5 py-2.5 bg-[#ef4444] text-white rounded-xl text-sm font-medium hover:bg-[#dc2626] transition-colors flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        }>
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-[#ef4444]/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-6 h-6 text-[#ef4444]" />
          </div>
          <p className="text-sm dm-text font-medium mb-1">Are you sure?</p>
          <p className="text-xs dm-text-secondary">This will permanently delete &quot;{selected?.title}&quot;.</p>
        </div>
      </Modal>
    </div>
  );
}
