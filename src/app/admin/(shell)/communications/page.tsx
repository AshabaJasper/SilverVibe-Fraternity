"use client";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell, BellRing, CalendarClock, CheckCheck, Clock, Copy, Download, Edit2, ExternalLink,
  FileText, Inbox, Mail, Megaphone, MessageSquare, Plus, Search, Send, Trash2, Users,
} from "lucide-react";
import Modal, { Button, ConfirmDialog, FormField, SelectInput, TextAreaInput, TextInput } from "@/components/Modal";
import { Badge, EmptyState, PageHeader, StatCard, Tabs } from "@/components/ui";
import { usePersistedState, showToast } from "@/lib/storage";
import { KEYS } from "@/lib/keys";
import { exportToCsv } from "@/lib/export";
import { ADMIN_KPI, ADMIN_MEMBERS_LIST, ADMIN_NOTIFICATIONS } from "@/lib/mock-data";
import { cn, formatDateTime, formatNumber, timeAgo, uid, useHydrated } from "@/lib/utils";

/* ============================================================
 * Types & seed data
 * ============================================================ */
type Channel = "SMS" | "Email" | "Push";
type Audience = "all" | "active" | "defaulters" | "member";
type AnnStatus = "draft" | "scheduled" | "sent";
type TabId = "announcements" | "compose" | "templates" | "history" | "notifications";

interface Announcement {
  id: string;
  title: string;
  message: string;
  channel: Channel;
  audience: Audience;
  member_sv: string | null;
  status: AnnStatus;
  created_at: string;
  scheduled_for: string | null;
  sent_at: string | null;
}

interface LogEntry {
  id: string;
  announcement_id: string | null;
  sent_at: string;
  channel: Channel;
  subject: string;
  audience_label: string;
  recipients: number;
  delivered: number;
  failed: number;
}

interface Template {
  id: string;
  name: string;
  channel: Channel;
  body: string;
}

const TAB_IDS: TabId[] = ["announcements", "compose", "templates", "history", "notifications"];
const CHANNELS: Channel[] = ["SMS", "Email", "Push"];
const SMS_SEGMENT = 160;
const SMS_MAX = SMS_SEGMENT * 3; // allow up to 3 concatenated segments
const PLACEHOLDERS = ["{name}", "{amount}", "{date}"];

/** Recipient group sizes. The member list on this page is a sample, so group sizes come from the society-wide KPIs. */
const AUDIENCE_COUNTS: Record<Exclude<Audience, "member">, number> = {
  all: ADMIN_KPI.total_members.value,
  active: ADMIN_KPI.total_members.active,
  // Members with a loan more than 30 days past due ≈ PAR-30 share of membership.
  defaulters: Math.round((ADMIN_KPI.total_members.value * ADMIN_KPI.par_30.value) / 100),
};

const AUDIENCE_OPTIONS = [
  { value: "all", label: `All members (${formatNumber(AUDIENCE_COUNTS.all)})` },
  { value: "active", label: `Active members (${formatNumber(AUDIENCE_COUNTS.active)})` },
  { value: "defaulters", label: `Defaulters — PAR > 30 days (${formatNumber(AUDIENCE_COUNTS.defaulters)})` },
  { value: "member", label: "Specific member…" },
];

const MEMBER_OPTIONS = ADMIN_MEMBERS_LIST.map((m) => ({ value: m.sv_number, label: `${m.name} (${m.sv_number})` }));

function recipientCount(audience: Audience): number {
  return audience === "member" ? 1 : AUDIENCE_COUNTS[audience];
}

function audienceLabel(audience: Audience, memberSv: string | null): string {
  if (audience === "member") {
    const m = ADMIN_MEMBERS_LIST.find((x) => x.sv_number === memberSv);
    return m ? `${m.name} (${m.sv_number})` : "Specific member";
  }
  return { all: "All members", active: "Active members", defaulters: "Defaulters" }[audience];
}

/** Simulated delivery outcome (deterministic, so the demo is repeatable). */
function deliveryStats(channel: Channel, recipients: number) {
  const failRate = { SMS: 0.02, Email: 0.035, Push: 0.06 }[channel];
  const failed = recipients <= 1 ? 0 : Math.round(recipients * failRate);
  return { delivered: recipients - failed, failed };
}

function smsSegments(text: string) {
  return Math.max(1, Math.ceil(text.length / SMS_SEGMENT));
}

const SEED_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-agm", title: "AGM 2026 — notice of meeting", channel: "Email", audience: "all", member_sv: null, status: "sent",
    message: "Dear Member, you are invited to the SilverVibe Annual General Meeting on 12 December 2026 at Silver Springs Hotel, Kampala, from 9:00 AM. Agenda: FY 2025 financial statements, dividend declaration and board elections.",
    created_at: "2026-10-20T09:00:00", scheduled_for: null, sent_at: "2026-10-20T10:15:00",
  },
  {
    id: "ann-fixed", title: "New fixed savings rate", channel: "SMS", audience: "active", member_sv: null, status: "sent",
    message: "SilverVibe: Fixed savings now earn 13% p.a. on 12-month tenor from 1 Dec 2026. Visit any branch or the portal to lock in.",
    created_at: "2026-10-08T08:30:00", scheduled_for: null, sent_at: "2026-10-08T11:00:00",
  },
  {
    id: "ann-reminder", title: "Loan arrears reminder", channel: "SMS", audience: "defaulters", member_sv: null, status: "scheduled",
    message: "Dear {name}, your loan instalment of {amount} was due on {date}. Please pay via *165# or at any branch to avoid penalties.",
    created_at: "2026-11-03T15:20:00", scheduled_for: "2026-11-10T09:00", sent_at: null,
  },
  {
    id: "ann-agm-push", title: "AGM reminder — RSVP", channel: "Push", audience: "all", member_sv: null, status: "draft",
    message: "The AGM is on 12 Dec 2026 at Silver Springs Hotel. Tap to RSVP and download the FY 2025 report.",
    created_at: "2026-11-02T16:40:00", scheduled_for: null, sent_at: null,
  },
];

const SEED_LOG: LogEntry[] = [
  { id: "log-1", announcement_id: null, sent_at: "2026-11-01T07:00:00", channel: "Email", subject: "October 2026 statements ready", audience_label: "Active members", recipients: 789, delivered: 761, failed: 28 },
  { id: "log-2", announcement_id: "ann-agm", sent_at: "2026-10-20T10:15:00", channel: "Email", subject: "AGM 2026 — notice of meeting", audience_label: "All members", recipients: 847, delivered: 817, failed: 30 },
  { id: "log-3", announcement_id: "ann-fixed", sent_at: "2026-10-08T11:00:00", channel: "SMS", subject: "New fixed savings rate", audience_label: "Active members", recipients: 789, delivered: 773, failed: 16 },
  { id: "log-4", announcement_id: null, sent_at: "2026-10-02T09:30:00", channel: "Push", subject: "Mobile money deposits now available", audience_label: "All members", recipients: 847, delivered: 796, failed: 51 },
];

const SEED_TEMPLATES: Template[] = [
  { id: "tpl-loan", name: "Loan repayment reminder", channel: "SMS", body: "Dear {name}, your loan instalment of {amount} is due on {date}. Pay via *165# or at any branch. SilverVibe SACCO" },
  { id: "tpl-deposit", name: "Deposit confirmation", channel: "SMS", body: "Dear {name}, your deposit of {amount} was received on {date}. Thank you for saving with SilverVibe." },
  { id: "tpl-agm", name: "AGM invitation", channel: "Email", body: "Dear {name},\n\nYou are invited to the Annual General Meeting on 12 December 2026 at Silver Springs Hotel, Kampala.\n\nKind regards,\nSilverVibe Board" },
  { id: "tpl-dividend", name: "Dividend credited", channel: "Push", body: "Hi {name}, your FY 2025 dividend of {amount} was credited on {date}." },
];

/** Persisted list that falls back to seed data if an older build stored a different shape. */
function hasField<T>(arr: unknown, field: keyof T): arr is T[] {
  return Array.isArray(arr) && arr.every((x) => x && typeof x === "object" && field in x);
}
function useSafeList<T>(key: string, seed: T[], field: keyof T) {
  const [raw, setRaw] = usePersistedState<T[]>(key, seed);
  const list = hasField<T>(raw, field) ? raw : seed;
  const update = useCallback(
    (fn: (prev: T[]) => T[]) => setRaw((prev) => fn(hasField<T>(prev, field) ? prev : seed)),
    [setRaw, seed, field]
  );
  return [list, update] as const;
}

/* ============================================================
 * Message form — shared by the Compose tab and the Edit modal.
 * Declared at module level so inputs keep focus while typing.
 * ============================================================ */
interface MessageDraft {
  title: string;
  message: string;
  channel: Channel;
  audience: Audience;
  member_sv: string;
}

const EMPTY_DRAFT: MessageDraft = { title: "", message: "", channel: "SMS", audience: "all", member_sv: ADMIN_MEMBERS_LIST[0].sv_number };

function ChannelPicker({ value, onChange }: { value: Channel; onChange: (c: Channel) => void }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Channel">
      {CHANNELS.map((c) => {
        const Icon = c === "SMS" ? MessageSquare : c === "Email" ? Mail : Bell;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            onClick={() => onChange(c)}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border",
              value === c ? "bg-[#4A90D9] border-[#4A90D9] text-white" : "dm-border dm-text-secondary hover:dm-surface-hover"
            )}
          >
            <Icon className="w-3.5 h-3.5" /> {c}
          </button>
        );
      })}
    </div>
  );
}

function MessageFields({ draft, onChange }: { draft: MessageDraft; onChange: (d: MessageDraft) => void }) {
  const set = <K extends keyof MessageDraft>(k: K, v: MessageDraft[K]) => onChange({ ...draft, [k]: v });
  const isSms = draft.channel === "SMS";
  const segments = smsSegments(draft.message);
  const recipients = recipientCount(draft.audience);

  return (
    <div className="space-y-4">
      <FormField label="Channel">
        <ChannelPicker value={draft.channel} onChange={(c) => set("channel", c)} />
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Recipients" hint={`${formatNumber(recipients)} recipient${recipients === 1 ? "" : "s"}`}>
          <SelectInput value={draft.audience} onChange={(v) => set("audience", v as Audience)} options={AUDIENCE_OPTIONS} />
        </FormField>
        {draft.audience === "member" && (
          <FormField label="Member" required>
            <SelectInput value={draft.member_sv} onChange={(v) => set("member_sv", v)} options={MEMBER_OPTIONS} />
          </FormField>
        )}
      </div>
      <FormField label={draft.channel === "Email" ? "Email subject" : "Title (internal reference)"} required>
        <TextInput
          value={draft.title}
          onChange={(v) => set("title", v)}
          placeholder={draft.channel === "Email" ? "e.g. AGM 2026 — notice of meeting" : "e.g. November arrears reminder"}
          maxLength={120}
        />
      </FormField>
      <FormField
        label="Message"
        required
        hint={`Placeholders ${PLACEHOLDERS.join(" ")} are personalised for each recipient.`}
      >
        <TextAreaInput
          value={draft.message}
          onChange={(v) => set("message", v)}
          rows={isSms ? 4 : 7}
          maxLength={isSms ? SMS_MAX : 4000}
          placeholder={isSms ? "Type your SMS…" : "Type your message…"}
        />
        {isSms && (
          <div className="flex flex-wrap justify-between gap-2 text-[11px] mt-1">
            <span className={cn(draft.message.length > SMS_SEGMENT ? "text-[#d97706]" : "dm-text-secondary")}>
              {draft.message.length}/{SMS_SEGMENT * segments} characters · {segments} SMS segment{segments === 1 ? "" : "s"}
              {segments > 1 && " (billed per segment)"}
            </span>
            <span className="dm-text-secondary">
              ≈ {formatNumber(segments * recipients)} SMS credits · max {SMS_MAX} chars
            </span>
          </div>
        )}
      </FormField>
    </div>
  );
}

function draftError(d: MessageDraft): string | null {
  if (!d.title.trim()) return "Add a title or subject.";
  if (!d.message.trim()) return "Write a message.";
  if (d.audience === "member" && !d.member_sv) return "Choose a member.";
  return null;
}

/* ============================================================
 * Page
 * ============================================================ */
export default function AdminCommunicationsPage() {
  return (
    <Suspense>
      <CommunicationsInner />
    </Suspense>
  );
}

function CommunicationsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const tabParam = params.get("tab") as TabId | null;
  const tab: TabId = tabParam && TAB_IDS.includes(tabParam) ? tabParam : "announcements";
  const setTab = (t: TabId) => router.replace(`/admin/communications?tab=${t}`, { scroll: false });

  const [announcements, setAnnouncements] = useSafeList<Announcement>("admin_announcements", SEED_ANNOUNCEMENTS, "audience");
  const [log, setLog] = useSafeList<LogEntry>("admin_message_log", SEED_LOG, "delivered");
  const [templates, setTemplates] = useSafeList<Template>("admin_message_templates", SEED_TEMPLATES, "body");
  const [notifs, setNotifs] = usePersistedState(KEYS.adminNotifications, ADMIN_NOTIFICATIONS);

  // Announcements tab
  const [annFilter, setAnnFilter] = useState<"all" | AnnStatus>("all");
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [editDraft, setEditDraft] = useState<MessageDraft>(EMPTY_DRAFT);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Announcement | null>(null);

  // Compose tab
  const [draft, setDraft] = useState<MessageDraft>(EMPTY_DRAFT);
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduleAt, setScheduleAt] = useState("");
  const [composeErr, setComposeErr] = useState<string | null>(null);

  // Templates tab
  const [tplOpen, setTplOpen] = useState(false);
  const [tplDraft, setTplDraft] = useState<Template>({ id: "", name: "", channel: "SMS", body: "" });
  const [tplErr, setTplErr] = useState<string | null>(null);
  const [tplDelete, setTplDelete] = useState<Template | null>(null);

  // History tab
  const [histQuery, setHistQuery] = useState("");
  const [histChannel, setHistChannel] = useState<"all" | Channel>("all");

  /* ---------- computed summary ---------- */
  const stats = useMemo(() => {
    const mtd = log.filter((l) => l.sent_at.startsWith("2026-11"));
    const recipients = log.reduce((a, l) => a + l.recipients, 0);
    const delivered = log.reduce((a, l) => a + l.delivered, 0);
    return {
      mtdMessages: mtd.reduce((a, l) => a + l.recipients, 0),
      mtdCampaigns: mtd.length,
      deliveryRate: recipients ? (delivered / recipients) * 100 : 0,
      scheduled: announcements.filter((a) => a.status === "scheduled").length,
      drafts: announcements.filter((a) => a.status === "draft").length,
      unread: notifs.filter((n) => !n.read).length,
    };
  }, [log, announcements, notifs]);

  /* ---------- actions ---------- */
  const logSend = (a: Pick<Announcement, "id" | "title" | "channel" | "audience" | "member_sv">, sentAt: string) => {
    const recipients = recipientCount(a.audience);
    const entry: LogEntry = {
      id: uid("log"), announcement_id: a.id, sent_at: sentAt, channel: a.channel, subject: a.title,
      audience_label: audienceLabel(a.audience, a.member_sv), recipients, ...deliveryStats(a.channel, recipients),
    };
    setLog((prev) => [entry, ...prev]);
    return entry;
  };

  const sendAnnouncement = (a: Announcement) => {
    const now = new Date().toISOString();
    setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: "sent", sent_at: now, scheduled_for: null } : x)));
    const e = logSend(a, now);
    showToast(`"${a.title}" sent to ${formatNumber(e.recipients)} recipient${e.recipients === 1 ? "" : "s"} via ${a.channel}`);
  };

  const duplicate = (a: Announcement) => {
    const copy: Announcement = {
      ...a, id: uid("ann"), title: `${a.title} (copy)`, status: "draft",
      created_at: new Date().toISOString(), scheduled_for: null, sent_at: null,
    };
    setAnnouncements((prev) => [copy, ...prev]);
    setAnnFilter("all");
    showToast("Duplicated as a draft");
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setEditDraft({ title: a.title, message: a.message, channel: a.channel, audience: a.audience, member_sv: a.member_sv ?? EMPTY_DRAFT.member_sv });
    setEditErr(null);
  };

  const saveEdit = () => {
    if (!editing) return;
    const err = draftError(editDraft);
    if (err) return setEditErr(err);
    setAnnouncements((prev) =>
      prev.map((x) =>
        x.id === editing.id
          ? { ...x, ...editDraft, title: editDraft.title.trim(), member_sv: editDraft.audience === "member" ? editDraft.member_sv : null }
          : x
      )
    );
    showToast(`"${editDraft.title.trim()}" updated`);
    setEditing(null);
  };

  const resetCompose = () => {
    setDraft(EMPTY_DRAFT);
    setSendMode("now");
    setScheduleAt("");
    setComposeErr(null);
  };

  const buildAnnouncement = (status: AnnStatus, extra: Partial<Announcement> = {}): Announcement => ({
    id: uid("ann"), title: draft.title.trim(), message: draft.message, channel: draft.channel, audience: draft.audience,
    member_sv: draft.audience === "member" ? draft.member_sv : null, status,
    created_at: new Date().toISOString(), scheduled_for: null, sent_at: null, ...extra,
  });

  const submitCompose = () => {
    const err = draftError(draft);
    if (err) return setComposeErr(err);
    if (sendMode === "schedule") {
      if (!scheduleAt) return setComposeErr("Pick a date and time to schedule the message.");
      if (new Date(scheduleAt).getTime() <= Date.now()) return setComposeErr("The scheduled time must be in the future.");
      setAnnouncements((prev) => [buildAnnouncement("scheduled", { scheduled_for: scheduleAt }), ...prev]);
      showToast(`Scheduled for ${formatDateTime(scheduleAt)}`);
    } else {
      const now = new Date().toISOString();
      const a = buildAnnouncement("sent", { sent_at: now });
      setAnnouncements((prev) => [a, ...prev]);
      const e = logSend(a, now);
      showToast(`Sent to ${formatNumber(e.recipients)} recipient${e.recipients === 1 ? "" : "s"} via ${a.channel}`);
    }
    resetCompose();
    setTab("announcements");
  };

  const saveComposeDraft = () => {
    if (!draft.title.trim() && !draft.message.trim()) return setComposeErr("Nothing to save yet.");
    setAnnouncements((prev) => [buildAnnouncement("draft", { title: draft.title.trim() || "Untitled draft" }), ...prev]);
    showToast("Saved as draft");
    resetCompose();
    setTab("announcements");
  };

  const applyTemplate = (t: Template) => {
    setDraft({ ...EMPTY_DRAFT, title: t.name, message: t.body.slice(0, t.channel === "SMS" ? SMS_MAX : 4000), channel: t.channel });
    setComposeErr(null);
    setTab("compose");
    showToast(`Template "${t.name}" loaded into compose`, "info");
  };

  const openTemplate = (t?: Template) => {
    setTplDraft(t ? { ...t } : { id: "", name: "", channel: "SMS", body: "" });
    setTplErr(null);
    setTplOpen(true);
  };

  const saveTemplate = () => {
    if (!tplDraft.name.trim()) return setTplErr("Give the template a name.");
    if (!tplDraft.body.trim()) return setTplErr("Template text is required.");
    if (tplDraft.channel === "SMS" && tplDraft.body.length > SMS_MAX) return setTplErr(`SMS templates are limited to ${SMS_MAX} characters.`);
    const clean = { ...tplDraft, name: tplDraft.name.trim() };
    if (clean.id) {
      setTemplates((prev) => prev.map((t) => (t.id === clean.id ? clean : t)));
      showToast(`Template "${clean.name}" updated`);
    } else {
      setTemplates((prev) => [...prev, { ...clean, id: uid("tpl") }]);
      showToast(`Template "${clean.name}" created`);
    }
    setTplOpen(false);
  };

  const markRead = (id: string) => setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast("All notifications marked as read");
  };

  /* ---------- filtered lists ---------- */
  const shownAnnouncements = annFilter === "all" ? announcements : announcements.filter((a) => a.status === annFilter);
  const shownLog = log.filter((l) => {
    if (histChannel !== "all" && l.channel !== histChannel) return false;
    const q = histQuery.trim().toLowerCase();
    return !q || l.subject.toLowerCase().includes(q) || l.audience_label.toLowerCase().includes(q);
  });
  const sortedNotifs = [...notifs].sort((a, b) => b.time.localeCompare(a.time));

  const tabs = [
    { id: "announcements" as const, label: "Announcements", count: announcements.length },
    { id: "compose" as const, label: "Compose" },
    { id: "templates" as const, label: "Templates", count: templates.length },
    { id: "history" as const, label: "History", count: log.length },
    { id: "notifications" as const, label: "Notifications", count: stats.unread },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Communications"
        subtitle="Send announcements by SMS, email and push; manage templates and admin notifications"
        actions={
          <Button onClick={() => { resetCompose(); setTab("compose"); }}>
            <Plus className="w-4 h-4" /> New Message
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Messages sent (Nov 2026)" value={formatNumber(stats.mtdMessages)} sub={`${stats.mtdCampaigns} campaign${stats.mtdCampaigns === 1 ? "" : "s"}`} icon={Send} />
        <StatCard label="Delivery rate (all time)" value={`${stats.deliveryRate.toFixed(1)}%`} sub={`${log.length} campaigns logged`} icon={CheckCheck} color="#22c55e" />
        <StatCard label="Scheduled" value={stats.scheduled} sub={`${stats.drafts} draft${stats.drafts === 1 ? "" : "s"}`} icon={CalendarClock} color="#f59e0b" />
        <StatCard label="Unread notifications" value={stats.unread} sub={`${notifs.length} total`} icon={BellRing} color="#a855f7" />
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {/* ================= Announcements ================= */}
      {tab === "announcements" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "draft", "scheduled", "sent"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setAnnFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-colors",
                  annFilter === f ? "bg-[#4A90D9] border-[#4A90D9] text-white" : "dm-border dm-text-secondary hover:dm-surface-hover"
                )}
              >
                {f} ({f === "all" ? announcements.length : announcements.filter((a) => a.status === f).length})
              </button>
            ))}
          </div>

          {shownAnnouncements.length === 0 ? (
            <div className="glass-card rounded-xl">
              <EmptyState
                icon={Megaphone}
                title="No announcements here"
                hint="Compose a message or change the filter."
                action={<Button variant="secondary" onClick={() => setTab("compose")}>Compose message</Button>}
              />
            </div>
          ) : (
            shownAnnouncements.map((a) => {
              const recipients = recipientCount(a.audience);
              return (
                <div key={a.id} className="glass-card rounded-xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-semibold dm-text">{a.title}</h3>
                        <Badge status={a.status} />
                      </div>
                      <p className="text-xs dm-text-secondary mb-3 whitespace-pre-line">{a.message}</p>
                      <div className="flex flex-wrap gap-3 text-xs dm-text-secondary">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {audienceLabel(a.audience, a.member_sv)} · {formatNumber(recipients)}</span>
                        <span className="flex items-center gap-1"><Send className="w-3 h-3" /> {a.channel}</span>
                        {a.status === "sent" && a.sent_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Sent {formatDateTime(a.sent_at)}</span>}
                        {a.status === "scheduled" && a.scheduled_for && <span className="flex items-center gap-1 text-[#d97706]"><CalendarClock className="w-3 h-3" /> Scheduled {formatDateTime(a.scheduled_for)}</span>}
                        {a.status === "draft" && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Draft saved {formatDateTime(a.created_at)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {a.status !== "sent" && (
                        <Button variant="accent" className="px-3 py-1.5 text-xs rounded-lg" onClick={() => sendAnnouncement(a)}>
                          <Send className="w-3 h-3" /> {a.status === "scheduled" ? "Send now" : "Send"}
                        </Button>
                      )}
                      {a.status !== "sent" && (
                        <button type="button" onClick={() => openEdit(a)} aria-label={`Edit ${a.title}`} title="Edit" className="p-2 rounded-lg border dm-border hover:dm-surface-hover">
                          <Edit2 className="w-3.5 h-3.5 dm-text-secondary" />
                        </button>
                      )}
                      <button type="button" onClick={() => duplicate(a)} aria-label={`Duplicate ${a.title}`} title="Duplicate as draft" className="p-2 rounded-lg border dm-border hover:dm-surface-hover">
                        <Copy className="w-3.5 h-3.5 dm-text-secondary" />
                      </button>
                      <button type="button" onClick={() => setToDelete(a)} aria-label={`Delete ${a.title}`} title="Delete" className="p-2 rounded-lg border dm-border hover:bg-[#ef4444]/10">
                        <Trash2 className="w-3.5 h-3.5 text-[#ef4444]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= Compose ================= */}
      {tab === "compose" && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-semibold dm-text mb-5">Compose Message</h3>
          <MessageFields draft={draft} onChange={(d) => { setDraft(d); setComposeErr(null); }} />

          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium dm-text">Delivery</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm dm-text cursor-pointer">
                <input type="radio" name="send-mode" checked={sendMode === "now"} onChange={() => setSendMode("now")} className="accent-[#4A90D9]" />
                Send now
              </label>
              <label className="flex items-center gap-2 text-sm dm-text cursor-pointer">
                <input type="radio" name="send-mode" checked={sendMode === "schedule"} onChange={() => setSendMode("schedule")} className="accent-[#4A90D9]" />
                Schedule for later
              </label>
            </div>
            {sendMode === "schedule" && (
              <div className="max-w-xs">
                <FormField label="Send at" required hint="Local time (EAT). Must be in the future.">
                  <TextInput type="datetime-local" value={scheduleAt} onChange={(v) => { setScheduleAt(v); setComposeErr(null); }} />
                </FormField>
              </div>
            )}
          </div>

          {composeErr && <p className="text-xs text-[#ef4444] mt-4" role="alert">{composeErr}</p>}

          <div className="flex flex-wrap gap-2 pt-5">
            <Button onClick={submitCompose}>
              {sendMode === "schedule" ? <><CalendarClock className="w-4 h-4" /> Schedule Message</> : <><Send className="w-4 h-4" /> Send Message</>}
            </Button>
            <Button variant="secondary" onClick={saveComposeDraft}>Save as Draft</Button>
            <Button variant="secondary" onClick={() => setTab("templates")}><FileText className="w-4 h-4" /> Use a template</Button>
            <Button variant="secondary" onClick={resetCompose}>Clear</Button>
          </div>
        </div>
      )}

      {/* ================= Templates ================= */}
      {tab === "templates" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openTemplate()}><Plus className="w-4 h-4" /> New Template</Button>
          </div>
          {templates.length === 0 ? (
            <div className="glass-card rounded-xl">
              <EmptyState icon={FileText} title="No templates yet" hint="Create a reusable message with {name}, {amount} and {date} placeholders." action={<Button variant="secondary" onClick={() => openTemplate()}>New template</Button>} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((t) => (
                <div key={t.id} className="glass-card rounded-xl p-5 flex flex-col">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold dm-text text-sm">{t.name}</h3>
                    <Badge status={t.channel} tone={t.channel === "SMS" ? "green" : t.channel === "Email" ? "blue" : "purple"} />
                  </div>
                  <p className="text-xs dm-text-secondary dm-surface-hover rounded-lg p-3 font-mono whitespace-pre-line flex-1">{t.body}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button variant="accent" className="px-3 py-1.5 text-xs rounded-lg" onClick={() => applyTemplate(t)}>Use Template</Button>
                    <Button variant="secondary" className="px-3 py-1.5 text-xs rounded-lg" onClick={() => openTemplate(t)}><Edit2 className="w-3 h-3" /> Edit</Button>
                    <Button variant="secondary" className="px-3 py-1.5 text-xs rounded-lg text-[#ef4444]" onClick={() => setTplDelete(t)}><Trash2 className="w-3 h-3" /> Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= History ================= */}
      {tab === "history" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b dm-border">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 dm-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                <TextInput value={histQuery} onChange={setHistQuery} placeholder="Search subject or audience…" className="pl-9" aria-label="Search history" />
              </div>
              <div className="sm:w-40">
                <SelectInput
                  value={histChannel}
                  onChange={(v) => setHistChannel(v as "all" | Channel)}
                  options={[{ value: "all", label: "All channels" }, ...CHANNELS.map((c) => ({ value: c, label: c }))]}
                />
              </div>
            </div>
            <Button
              variant="secondary"
              disabled={shownLog.length === 0}
              onClick={() => {
                exportToCsv("message-history", shownLog.map((l) => ({ ...l, sent_at: formatDateTime(l.sent_at) })), [
                  { key: "sent_at", label: "Sent" }, { key: "channel", label: "Channel" }, { key: "subject", label: "Subject" },
                  { key: "audience_label", label: "Audience" }, { key: "recipients", label: "Recipients" },
                  { key: "delivered", label: "Delivered" }, { key: "failed", label: "Failed" },
                ]);
                showToast("Message history exported");
              }}
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
          {shownLog.length === 0 ? (
            <EmptyState icon={Inbox} title="No messages match" hint="Try another search or channel." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="dm-surface-hover border-b dm-border">
                    {["Sent", "Channel", "Subject", "Audience", "Recipients", "Delivered", "Failed", "Rate"].map((h, i) => (
                      <th key={h} className={cn("px-4 py-3 text-xs font-semibold dm-text-secondary", i >= 4 ? "text-right" : "text-left")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shownLog.map((l) => (
                    <tr key={l.id} className="border-b dm-border last:border-0 hover:dm-surface-hover">
                      <td className="px-4 py-3 text-xs dm-text-secondary whitespace-nowrap">{formatDateTime(l.sent_at)}</td>
                      <td className="px-4 py-3 text-xs font-medium dm-text">{l.channel}</td>
                      <td className="px-4 py-3 text-xs dm-text">{l.subject}</td>
                      <td className="px-4 py-3 text-xs dm-text-secondary">{l.audience_label}</td>
                      <td className="px-4 py-3 text-right text-xs dm-text">{formatNumber(l.recipients)}</td>
                      <td className="px-4 py-3 text-right text-xs text-[#16a34a]">{formatNumber(l.delivered)}</td>
                      <td className="px-4 py-3 text-right text-xs text-[#ef4444]">{formatNumber(l.failed)}</td>
                      <td className="px-4 py-3 text-right text-xs dm-text">{((l.delivered / Math.max(1, l.recipients)) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= Notifications ================= */}
      {tab === "notifications" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-3 border-b dm-border">
            <p className="text-sm dm-text-secondary">{stats.unread} unread of {notifs.length}</p>
            <Button variant="secondary" disabled={stats.unread === 0} onClick={markAllRead}>
              <CheckCheck className="w-4 h-4" /> Mark all read
            </Button>
          </div>
          {sortedNotifs.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" />
          ) : (
            <ul>
              {sortedNotifs.map((n) => (
                <li key={n.id} className={cn("px-4 py-3 border-b dm-border last:border-0 flex items-start gap-3", !n.read && "bg-[#4A90D9]/5")}>
                  <span className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", n.read ? "bg-transparent" : "bg-[#4A90D9]")} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm dm-text", !n.read && "font-semibold")}>{n.title}</p>
                    <p className="text-xs dm-text-secondary">{n.desc}</p>
                    <p className="text-[11px] dm-text-secondary mt-0.5">{hydrated ? timeAgo(n.time) : formatDateTime(n.time)}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {!n.read && (
                      <Button variant="secondary" className="px-3 py-1.5 text-xs rounded-lg" onClick={() => { markRead(n.id); showToast("Marked as read"); }}>
                        Mark read
                      </Button>
                    )}
                    <Button variant="accent" className="px-3 py-1.5 text-xs rounded-lg" onClick={() => { markRead(n.id); router.push(n.href); }}>
                      <ExternalLink className="w-3 h-3" /> Open
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ================= Modals ================= */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.status === "scheduled" ? "scheduled message" : "draft"}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="accent" onClick={saveEdit}>Save Changes</Button>
          </>
        }
      >
        <MessageFields draft={editDraft} onChange={(d) => { setEditDraft(d); setEditErr(null); }} />
        {editErr && <p className="text-xs text-[#ef4444] mt-3" role="alert">{editErr}</p>}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          setAnnouncements((prev) => prev.filter((a) => a.id !== toDelete.id));
          showToast(`"${toDelete.title}" deleted`, "info");
        }}
        title="Delete announcement"
        message={<>Delete <b>{toDelete?.title}</b>? {toDelete?.status === "sent" ? "The delivery record stays in History." : "This cannot be undone."}</>}
        confirmLabel="Delete"
        danger
      />

      <Modal
        open={tplOpen}
        onClose={() => setTplOpen(false)}
        title={tplDraft.id ? "Edit template" : "New template"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTplOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={saveTemplate}>{tplDraft.id ? "Save Template" : "Create Template"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Template name" required>
            <TextInput value={tplDraft.name} onChange={(v) => { setTplDraft({ ...tplDraft, name: v }); setTplErr(null); }} placeholder="e.g. Loan repayment reminder" maxLength={60} />
          </FormField>
          <FormField label="Channel">
            <ChannelPicker value={tplDraft.channel} onChange={(c) => setTplDraft({ ...tplDraft, channel: c })} />
          </FormField>
          <FormField
            label="Message"
            required
            hint={tplDraft.channel === "SMS" ? `${tplDraft.body.length}/${SMS_SEGMENT * smsSegments(tplDraft.body)} characters · ${smsSegments(tplDraft.body)} segment(s)` : undefined}
          >
            <TextAreaInput
              value={tplDraft.body}
              onChange={(v) => { setTplDraft({ ...tplDraft, body: v }); setTplErr(null); }}
              rows={6}
              maxLength={tplDraft.channel === "SMS" ? SMS_MAX : 4000}
            />
          </FormField>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs dm-text-secondary">Insert placeholder:</span>
            {PLACEHOLDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTplDraft({ ...tplDraft, body: `${tplDraft.body}${tplDraft.body && !tplDraft.body.endsWith(" ") ? " " : ""}${p}` })}
                className="px-2 py-1 rounded-md border dm-border text-xs font-mono dm-text hover:dm-surface-hover"
              >
                {p}
              </button>
            ))}
          </div>
          {tplErr && <p className="text-xs text-[#ef4444]" role="alert">{tplErr}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!tplDelete}
        onClose={() => setTplDelete(null)}
        onConfirm={() => {
          if (!tplDelete) return;
          setTemplates((prev) => prev.filter((t) => t.id !== tplDelete.id));
          showToast(`Template "${tplDelete.name}" deleted`, "info");
        }}
        title="Delete template"
        message={<>Delete the template <b>{tplDelete?.name}</b>?</>}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
