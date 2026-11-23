// ============================================================
// Communications seed data — the single source for the admin Communications
// page and the guided-demo helpers in src/lib/demo.ts.
//
// The story runs Sep 2026 → Feb 2027. Sent history covers Sep–Nov 2026; the
// messages after 23 Nov are seeded as "scheduled" and flip to "sent" (with a
// History entry) once the demo clock passes their send time. Monthly
// "statements ready" emails that are not announcements are seeded straight into
// the log with future dates and revealed as their date arrives.
// ============================================================
import { TIMELINE_EVENTS as EV } from "@/lib/demo-clock";

export type Channel = "SMS" | "Email" | "Push";
export type Audience = "all" | "active" | "defaulters" | "member";
export type AnnStatus = "draft" | "scheduled" | "sent";

export interface Announcement {
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

export interface LogEntry {
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

export interface Template {
  id: string;
  name: string;
  channel: Channel;
  body: string;
}

/** Persisted keys (shared with src/lib/demo.ts). */
export const ANNOUNCEMENTS_KEY = "admin_announcements";
export const MESSAGE_LOG_KEY = "admin_message_log";
export const TEMPLATES_KEY = "admin_message_templates";

/** Deterministic History id for an announcement send, so automatic catch-up never logs twice. */
export const sendLogId = (announcementId: string) => `log-send-${announcementId}`;

export const SEED_ANNOUNCEMENTS: Announcement[] = [
  // ---- draft ----
  {
    id: "ann-agm-rsvp", title: "AGM RSVP — confirm attendance", channel: "Push", audience: "all", member_sv: null, status: "draft",
    message: `The AGM is on Sat 20 Feb 2027 at ${EV.agmVenue}. Tap to confirm attendance and download the ${EV.dividendFy} annual report.`,
    created_at: "2026-11-22T16:40:00", scheduled_for: null, sent_at: null,
  },
  // ---- scheduled (sent automatically when the demo clock reaches them) ----
  {
    id: "ann-arrears-dec", title: "Loan arrears reminder", channel: "SMS", audience: "defaulters", member_sv: null, status: "scheduled",
    message: "Dear {name}, your loan instalment of {amount} was due on {date}. Please pay via *165# or at any branch to avoid penalties. SilverVibe SACCO",
    created_at: "2026-11-23T08:50:00", scheduled_for: EV.arrearsReminder, sent_at: null,
  },
  {
    id: "ann-festive", title: "Festive season office hours", channel: "SMS", audience: "all", member_sv: null, status: "scheduled",
    message: "SilverVibe: Our offices close on 24 Dec and reopen Mon 4 Jan 2027. Mobile Money deposits (*165#) and the member portal stay open. Happy holidays!",
    created_at: "2026-11-20T11:10:00", scheduled_for: EV.festiveNotice, sent_at: null,
  },
  {
    id: "ann-fixed-live", title: "New fixed savings rate now live", channel: "SMS", audience: "active", member_sv: null, status: "scheduled",
    message: `SilverVibe: From today, 12-month fixed savings earn ${EV.newFixedRatePct}% p.a. Lock in at any branch or on the member portal.`,
    created_at: "2026-11-20T10:00:00", scheduled_for: "2027-01-02T08:00", sent_at: null,
  },
  {
    id: "ann-agm-notice", title: "Notice of Annual General Meeting", channel: "Email", audience: "all", member_sv: null, status: "scheduled",
    message: `Dear Member,\n\nNotice is hereby given that the SilverVibe Annual General Meeting will be held on Saturday 20 February 2027 at ${EV.agmVenue} from 9:00 AM.\n\nAgenda: ${EV.dividendFy} audited accounts, dividend declaration and board elections.\n\nKind regards,\nSilverVibe Board`,
    created_at: "2026-11-21T14:30:00", scheduled_for: EV.agmNotice, sent_at: null,
  },
  {
    id: "ann-agm-reminder", title: "AGM reminder — this Saturday", channel: "SMS", audience: "all", member_sv: null, status: "scheduled",
    message: `SilverVibe: Reminder — the AGM is this Saturday 20 Feb 2027 at ${EV.agmVenue}, 9:00 AM. Bring your member card.`,
    created_at: "2026-11-21T14:35:00", scheduled_for: EV.agmReminder, sent_at: null,
  },
  // ---- sent history ----
  {
    id: "ann-agm-save-date", title: "Save the date: AGM 20 Feb 2027", channel: "Email", audience: "all", member_sv: null, status: "sent",
    message: `Dear Member, please save the date: the Annual General Meeting will take place on Saturday 20 February 2027 at ${EV.agmVenue}. The ${EV.dividendFy} dividend will be declared at the meeting. A formal notice follows in January.`,
    created_at: "2026-11-21T08:30:00", scheduled_for: null, sent_at: "2026-11-21T10:00:00",
  },
  {
    id: "ann-fixed-rate", title: "New fixed savings rate from 1 January", channel: "SMS", audience: "active", member_sv: null, status: "sent",
    message: `SilverVibe: Fixed savings will earn ${EV.newFixedRatePct}% p.a. on the 12-month tenor from 1 Jan 2027. Visit any branch or the portal to lock in.`,
    created_at: "2026-11-20T08:30:00", scheduled_for: null, sent_at: "2026-11-20T11:00:00",
  },
  {
    id: "ann-momo", title: "Mobile Money deposits now available", channel: "Push", audience: "all", member_sv: null, status: "sent",
    message: "You can now deposit straight from your mobile money account. Dial *165# and follow the prompts to deposit into your SilverVibe account.",
    created_at: "2026-10-05T08:00:00", scheduled_for: null, sent_at: "2026-10-05T09:30:00",
  },
];

/**
 * Message History. Entries dated after today are hidden until their date
 * (pages filter with isRevealed). Sends of the scheduled announcements above
 * are NOT seeded here — they are logged when the announcement flips to sent.
 */
export const SEED_LOG: LogEntry[] = [
  // ---- future, revealed on the date ----
  { id: "log-stmt-2027-02", announcement_id: null, sent_at: "2027-02-01T07:00:00", channel: "Email", subject: "January 2027 statements ready", audience_label: "Active members", recipients: 791, delivered: 764, failed: 27 },
  { id: "log-stmt-2027-01", announcement_id: null, sent_at: "2027-01-01T07:00:00", channel: "Email", subject: "December 2026 statements ready", audience_label: "Active members", recipients: 790, delivered: 762, failed: 28 },
  { id: "log-stmt-2026-12", announcement_id: null, sent_at: "2026-12-01T07:00:00", channel: "Email", subject: "November 2026 statements ready", audience_label: "Active members", recipients: 789, delivered: 762, failed: 27 },
  // ---- history ----
  { id: "log-agm-save", announcement_id: "ann-agm-save-date", sent_at: "2026-11-21T10:00:00", channel: "Email", subject: "Save the date: AGM 20 Feb 2027", audience_label: "All members", recipients: 847, delivered: 817, failed: 30 },
  { id: "log-fixed", announcement_id: "ann-fixed-rate", sent_at: "2026-11-20T11:00:00", channel: "SMS", subject: "New fixed savings rate from 1 January", audience_label: "Active members", recipients: 789, delivered: 773, failed: 16 },
  { id: "log-stmt-2026-11", announcement_id: null, sent_at: "2026-11-01T07:00:00", channel: "Email", subject: "October 2026 statements ready", audience_label: "Active members", recipients: 789, delivered: 761, failed: 28 },
  { id: "log-momo", announcement_id: "ann-momo", sent_at: "2026-10-05T09:30:00", channel: "Push", subject: "Mobile Money deposits now available", audience_label: "All members", recipients: 847, delivered: 796, failed: 51 },
  { id: "log-stmt-2026-10", announcement_id: null, sent_at: "2026-10-01T07:00:00", channel: "Email", subject: "September 2026 statements ready", audience_label: "Active members", recipients: 786, delivered: 758, failed: 28 },
  { id: "log-arrears-sep", announcement_id: null, sent_at: "2026-09-15T09:00:00", channel: "SMS", subject: "Loan arrears reminder", audience_label: "Defaulters", recipients: 36, delivered: 35, failed: 1 },
  { id: "log-stmt-2026-09", announcement_id: null, sent_at: "2026-09-01T07:00:00", channel: "Email", subject: "August 2026 statements ready", audience_label: "Active members", recipients: 782, delivered: 755, failed: 27 },
];

export const SEED_TEMPLATES: Template[] = [
  { id: "tpl-loan", name: "Loan repayment reminder", channel: "SMS", body: "Dear {name}, your loan instalment of {amount} is due on {date}. Pay via *165# or at any branch. SilverVibe SACCO" },
  { id: "tpl-deposit", name: "Deposit confirmation", channel: "SMS", body: "Dear {name}, your deposit of {amount} was received on {date}. Thank you for saving with SilverVibe." },
  { id: "tpl-agm", name: "AGM invitation", channel: "Email", body: `Dear {name},\n\nYou are invited to the Annual General Meeting on Saturday 20 February 2027 at ${EV.agmVenue}, from 9:00 AM. The ${EV.dividendFy} dividend will be declared.\n\nKind regards,\nSilverVibe Board` },
  { id: "tpl-dividend", name: "Dividend credited", channel: "Push", body: `Hi {name}, your ${EV.dividendFy} dividend of {amount} was credited on {date}.` },
];
