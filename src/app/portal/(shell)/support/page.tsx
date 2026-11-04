"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  HelpCircle, MessageSquare, Phone, Mail, ChevronDown, ChevronUp, BookOpen,
  Video, Send, MapPin, MessageCircle, Search, Paperclip, Ticket, ExternalLink,
  PlayCircle, ArrowRight,
} from "lucide-react";
import { usePersistedState, showToast } from "@/lib/storage";
import { cn, formatDateTime, todayISO } from "@/lib/utils";
import Modal, { Button, FormField, SelectInput, TextAreaInput, TextInput } from "@/components/Modal";
import { Badge, EmptyState, PageHeader } from "@/components/ui";

/* ==================================================================
 * Data
 * ================================================================== */

const FAQS = [
  { q: "How do I make a deposit?", a: "On your Dashboard click 'Quick Deposit', choose the savings account and amount, and pay with Mobile Money. You can also deposit by bank transfer to the SilverVibe account or with cash at our office on Kampala Road. Deposits are posted within 24 hours." },
  { q: "What is the minimum monthly contribution?", a: "Regular Savings requires at least UGX 200,000 per month. Flexi/Wallet Savings has no minimum." },
  { q: "How do I apply for a loan?", a: "Go to Loans and click 'Apply for Loan' (or use 'Apply for Loan' in the Dashboard quick actions). Choose a product, enter the amount and term, and submit. You'll see the application status on the Loans page and receive a notification when it is reviewed." },
  { q: "How do I download my statement?", a: "Go to Savings and click 'Download Statement'. A PDF with your recent transactions and balances is downloaded straight away." },
  { q: "How do I update my contact information?", a: "Go to Profile > Personal Info and click 'Edit'. Changes to your name, email, phone numbers, occupation and address are saved immediately. SV number, National ID, date of birth and date joined can only be changed at the SACCO office." },
  { q: "My proof of address has expired. What do I do?", a: "Go to Profile > KYC Documents and click 'Replace' next to the expired document, or use 'Upload New Document'. The new file shows as 'Pending review' until member services verify it." },
  { q: "How do I turn on two-factor authentication?", a: "Go to Profile > Security and click 'Enable' next to Two-factor authentication, then enter the 6-digit code sent to your phone. You can also change your password and transaction PIN there." },
  { q: "How do I choose which alerts I receive?", a: "Go to Profile > Preferences, tick SMS, Email or Push for each category, and click 'Save preferences'." },
  { q: "When are dividends paid?", a: "Dividends are declared at the Annual General Meeting — this year on 12 December 2026 at Silver Springs Hotel — and paid within 30 days of declaration." },
  { q: "What happens if I miss a loan payment?", a: "Late penalties apply after the grace period. You'll receive reminders 5 days before the due date and 1, 7, 30, 60 and 90 days after it if the installment is still unpaid." },
];

const CATEGORIES = ["Account", "Loans", "Savings", "Shares", "Technical", "Other"];

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
interface Reply {
  from: "member" | "sacco";
  author: string;
  text: string;
  at: string;
}
interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: TicketStatus;
  created_at: string;
  attachment?: string;
  replies?: Reply[];
}

const TICKET_SEED: SupportTicket[] = [
  {
    id: "TCK-1041",
    category: "Savings",
    subject: "Deposit not reflecting on Flexi account",
    message: "I sent UGX 150,000 by Mobile Money on 3 October but it isn't showing on my Flexi/Wallet account yet.",
    status: "resolved",
    created_at: "2026-10-04T09:20:00",
    replies: [
      { from: "sacco", author: "Member Services · Agnes", text: "Hello James, thank you for reaching out. The Mobile Money settlement arrived late from the network. Your UGX 150,000 has now been posted to SV-0042-FLEX with value date 3 October. Sorry for the delay.", at: "2026-10-04T14:05:00" },
    ],
  },
  {
    id: "TCK-1052",
    category: "Loans",
    subject: "Request for loan top-up options",
    message: "I would like to know if I can top up my current Short-Term Loan, and what the new installment would be.",
    status: "in_progress",
    created_at: "2026-10-28T11:42:00",
    replies: [
      { from: "sacco", author: "Credit Officer · Daniel", text: "Hi James, your Short-Term Loan (SV-LN-2026-0042) has a good repayment record, so it qualifies for a top-up review. I'm preparing a revised schedule and will share it with you by Friday. You can also start an application from Loans > Apply for Loan.", at: "2026-10-29T10:15:00" },
    ],
  },
];

const GUIDE = [
  { title: "Make a deposit", href: "/portal?action=deposit", cta: "Open Quick Deposit", steps: ["Open your Dashboard.", "Click 'Quick Deposit' in Quick Actions.", "Pick the savings account and enter the amount.", "Confirm the Mobile Money prompt on your phone."] },
  { title: "Apply for a loan", href: "/portal/loans?action=apply", cta: "Apply for a loan", steps: ["Go to Loans.", "Click 'Apply for Loan'.", "Choose a product, amount and repayment term.", "Review the estimated installment and submit."] },
  { title: "Download a statement", href: "/portal/savings", cta: "Go to Savings", steps: ["Go to Savings.", "Click 'Download Statement'.", "Open the PDF from your downloads folder."] },
  { title: "Update your profile", href: "/portal/profile?tab=personal", cta: "Open my profile", steps: ["Go to Profile > Personal Info.", "Click 'Edit'.", "Update your email, phone or address and click 'Save changes'."] },
];

const TUTORIALS = [
  { title: "Getting started with the member portal", duration: "4:12" },
  { title: "Making a deposit with Mobile Money", duration: "2:45" },
  { title: "Applying for a loan step by step", duration: "5:30" },
  { title: "Reading your loan repayment schedule", duration: "3:18" },
  { title: "Downloading your savings statement", duration: "1:56" },
  { title: "Securing your account with two-factor authentication", duration: "2:20" },
];
const YOUTUBE_URL = "https://www.youtube.com/results?search_query=SACCO+member+portal+tutorial";

/* ==================================================================
 * Helpers
 * ================================================================== */

function nowLocalISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${todayISO()}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}
function nextTicketId(list: SupportTicket[]) {
  const max = list.reduce((m, t) => Math.max(m, Number(t.id.replace(/\D/g, "")) || 0), 1000);
  return `TCK-${String(max + 1).padStart(4, "0")}`;
}

type FormState = { category: string; subject: string; message: string; attachment: string };
const EMPTY_FORM: FormState = { category: "Account", subject: "", message: "", attachment: "" };
const MIN_MSG = 10;
const MAX_MSG = 1000;

/* ==================================================================
 * Page
 * ================================================================== */

export default function SupportPage() {
  const [tickets, setTickets] = usePersistedState<SupportTicket[]>("portal_support_tickets", TICKET_SEED);
  const [openFaq, setOpenFaq] = useState<string | null>(FAQS[0].q);
  const [faqQuery, setFaqQuery] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [fileKey, setFileKey] = useState(0); // remounts the file input to clear it
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [videosOpen, setVideosOpen] = useState(false);

  const viewing = tickets.find((t) => t.id === viewingId) ?? null;
  const sortedTickets = [...tickets].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const q = faqQuery.trim().toLowerCase();
  const faqs = q ? FAQS.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(q)) : FAQS;

  const onAttach = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.size > 5 * 1024 * 1024) {
      setErrors((x) => ({ ...x, attachment: "Attachment must be 5 MB or smaller." }));
      setForm((x) => ({ ...x, attachment: "" }));
      setFileKey((k) => k + 1);
      return;
    }
    setErrors((x) => ({ ...x, attachment: undefined }));
    setForm((x) => ({ ...x, attachment: f?.name ?? "" }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (form.subject.trim().length < 4) errs.subject = "Enter a short subject (at least 4 characters).";
    if (form.message.trim().length < MIN_MSG) errs.message = `Describe your issue in at least ${MIN_MSG} characters.`;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const ticket: SupportTicket = {
      id: nextTicketId(tickets),
      category: form.category,
      subject: form.subject.trim(),
      message: form.message.trim(),
      status: "open",
      created_at: nowLocalISO(),
      ...(form.attachment ? { attachment: form.attachment } : {}),
    };
    setTickets((list) => [ticket, ...list]);
    setForm(EMPTY_FORM);
    setFileKey((k) => k + 1);
    showToast(`Message sent — ticket ${ticket.id} created`);
  };

  const closeTicket = (id: string) => {
    setTickets((list) => list.map((t) => (t.id === id ? { ...t, status: "closed" } : t)));
    showToast(`Ticket ${id} closed`, "info");
  };

  const contacts = [
    { label: "Call Us", value: "+256 700 123 456", href: "tel:+256700123456", icon: Phone, color: "#22c55e" },
    { label: "Email Us", value: "support@silvervibe.coop", href: "mailto:support@silvervibe.coop", icon: Mail, color: "#4A90D9" },
    { label: "WhatsApp", value: "Chat with member services", href: "https://wa.me/256700123456", icon: MessageCircle, color: "#16a34a", external: true },
    { label: "Visit Us", value: "Plot 14, Kampala Road · Mon–Fri 8:00–17:00, Sat 9:00–13:00", href: "https://www.google.com/maps/search/?api=1&query=Plot+14+Kampala+Road+Kampala", icon: MapPin, color: "#f59e0b", external: true },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Help & Support" subtitle="Get answers and reach out to us" />

      {/* Contact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {contacts.map((c) => (
          <a
            key={c.label}
            href={c.href}
            {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="glass-card rounded-2xl p-5 text-center animate-fade-in hover:shadow-md transition-all block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90D9]/40"
          >
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${c.color}15` }}>
              <c.icon className="w-6 h-6" style={{ color: c.color }} />
            </div>
            <p className="text-sm font-medium dm-text">{c.label}</p>
            <p className="text-xs dm-text-secondary mt-1">{c.value}</p>
          </a>
        ))}
      </div>

      {/* FAQ */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="font-semibold dm-text flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#4A90D9]" /> Frequently Asked Questions
          </h3>
          <div className="relative sm:w-64">
            <Search className="w-4 h-4 dm-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <TextInput value={faqQuery} onChange={setFaqQuery} placeholder="Search FAQs" aria-label="Search FAQs" className="pl-9" />
          </div>
        </div>
        {faqs.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching questions"
            hint="Try another word, or send us a message below."
            action={<Button variant="secondary" onClick={() => setFaqQuery("")}>Clear search</Button>}
          />
        ) : (
          <div className="space-y-2">
            {faqs.map((faq) => {
              const isOpen = openFaq === faq.q;
              return (
                <div key={faq.q} className="border dm-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(openFaq === faq.q ? null : faq.q)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[#f1f5f9] transition-colors"
                  >
                    <span className="text-sm font-medium dm-text">{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 dm-text-secondary shrink-0" /> : <ChevronDown className="w-4 h-4 dm-text-secondary shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4">
                      <p className="text-sm dm-text-secondary leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact form */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-3">
        <h3 className="font-semibold dm-text mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#4A90D9]" /> Send a Message
        </h3>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Category" required>
              <SelectInput value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Subject" required error={errors.subject}>
                <TextInput value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="What do you need help with?" maxLength={120} />
              </FormField>
            </div>
          </div>
          <FormField
            label="Message"
            required
            error={errors.message}
            hint={`${form.message.trim().length}/${MAX_MSG} characters (minimum ${MIN_MSG})`}
          >
            <TextAreaInput rows={4} value={form.message} onChange={(v) => setForm({ ...form, message: v })} placeholder="Describe your issue or question..." maxLength={MAX_MSG} />
          </FormField>
          <FormField label="Attachment" hint={form.attachment ? `Attached: ${form.attachment}` : "Optional — screenshot or document, up to 5 MB"} error={errors.attachment}>
            <label className="inline-flex items-center gap-2 px-3 py-2 border dm-border rounded-xl text-sm dm-text-secondary hover:dm-surface-hover cursor-pointer transition-colors">
              <Paperclip className="w-4 h-4" /> {form.attachment ? "Change file" : "Attach a file"}
              <input key={fileKey} type="file" className="sr-only" accept="image/*,.pdf" onChange={onAttach} />
            </label>
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" variant="accent">
              <Send className="w-4 h-4" /> Send Message
            </Button>
          </div>
        </form>
      </div>

      {/* My tickets */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in">
        <h3 className="font-semibold dm-text mb-4 flex items-center gap-2">
          <Ticket className="w-4 h-4 text-[#4A90D9]" /> My tickets
          <span className="text-xs font-normal dm-text-secondary">({tickets.length})</span>
        </h3>
        {sortedTickets.length === 0 ? (
          <EmptyState icon={Ticket} title="No support tickets" hint="Messages you send appear here so you can follow up." />
        ) : (
          <div className="space-y-2">
            {sortedTickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setViewingId(t.id)}
                className="w-full text-left p-4 rounded-xl border dm-border hover:bg-[#f1f5f9] transition-colors flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium dm-text truncate">{t.subject}</p>
                  <p className="text-xs dm-text-secondary">
                    {t.id} · {t.category} · {formatDateTime(t.created_at)}
                  </p>
                </div>
                <Badge status={t.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resources */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ResourceCard icon={BookOpen} color="#a855f7" title="User Guide" desc="Step-by-step guides for common tasks" onClick={() => setGuideOpen(true)} />
        <ResourceCard icon={Video} color="#ef4444" title="Video Tutorials" desc="Watch how-to videos for common tasks" onClick={() => setVideosOpen(true)} />
      </div>

      {/* Ticket thread */}
      <Modal
        open={viewing !== null}
        onClose={() => setViewingId(null)}
        title={viewing ? `${viewing.id} · ${viewing.subject}` : "Ticket"}
        size="lg"
        footer={
          <>
            {viewing && viewing.status !== "closed" && (
              <Button variant="danger" onClick={() => closeTicket(viewing.id)}>Close ticket</Button>
            )}
            <Button variant="secondary" onClick={() => setViewingId(null)}>Done</Button>
          </>
        }
      >
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs dm-text-secondary">
              <Badge status={viewing.status} />
              <span>{viewing.category}</span>
              <span>· opened {formatDateTime(viewing.created_at)}</span>
            </div>
            <ThreadBubble from="member" author="You" at={viewing.created_at} text={viewing.message} attachment={viewing.attachment} />
            {(viewing.replies ?? []).map((r, i) => (
              <ThreadBubble key={i} from={r.from} author={r.author} at={r.at} text={r.text} />
            ))}
            {(viewing.replies ?? []).length === 0 && viewing.status !== "closed" && (
              <p className="text-xs dm-text-secondary text-center py-2">
                We&apos;ve received your message. A member services officer usually replies within 1 business day.
              </p>
            )}
            {viewing.status === "closed" && (
              <p className="text-xs dm-text-secondary text-center py-2">This ticket is closed. Send a new message if you need more help.</p>
            )}
          </div>
        )}
      </Modal>

      {/* User guide */}
      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="User Guide" size="lg" footer={<Button variant="secondary" onClick={() => setGuideOpen(false)}>Close</Button>}>
        <div className="space-y-5">
          {GUIDE.map((g, gi) => (
            <div key={g.title} className="rounded-xl border dm-border p-4">
              <p className="text-sm font-semibold dm-text mb-2">{gi + 1}. {g.title}</p>
              <ol className="list-decimal list-inside space-y-1 text-sm dm-text-secondary">
                {g.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <Link href={g.href} onClick={() => setGuideOpen(false)} className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-[#4A90D9] hover:underline">
                {g.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </Modal>

      {/* Video tutorials */}
      <Modal
        open={videosOpen}
        onClose={() => setVideosOpen(false)}
        title="Video Tutorials"
        footer={
          <>
            <Button variant="secondary" onClick={() => setVideosOpen(false)}>Close</Button>
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#ef4444] text-white hover:bg-[#dc2626] transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Watch on YouTube
            </a>
          </>
        }
      >
        <ul className="divide-y dm-border">
          {TUTORIALS.map((t) => (
            <li key={t.title} className="py-3 flex items-center gap-3">
              <PlayCircle className="w-5 h-5 text-[#ef4444] shrink-0" />
              <span className="text-sm dm-text flex-1">{t.title}</span>
              <span className="text-xs dm-text-secondary font-mono">{t.duration}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}

function ResourceCard({ icon: Icon, color, title, desc, onClick }: { icon: React.ElementType; color: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all text-left w-full">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1a` }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium dm-text">{title}</p>
        <p className="text-xs dm-text-secondary">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 dm-text-secondary" />
    </button>
  );
}

function ThreadBubble({ from, author, at, text, attachment }: { from: "member" | "sacco"; author: string; at: string; text: string; attachment?: string }) {
  const mine = from === "member";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] rounded-2xl px-4 py-3", mine ? "bg-[#4A90D9]/10" : "bg-[#f1f5f9]")}>
        <p className="text-xs font-semibold dm-text mb-1">{author}</p>
        <p className="text-sm dm-text whitespace-pre-wrap">{text}</p>
        {attachment && (
          <p className="text-xs dm-text-secondary mt-2 flex items-center gap-1"><Paperclip className="w-3 h-3" /> {attachment}</p>
        )}
        <p className="text-[11px] dm-text-secondary mt-1.5">{formatDateTime(at)}</p>
      </div>
    </div>
  );
}
