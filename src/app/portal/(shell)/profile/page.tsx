"use client";
import { Suspense, useRef, useState, type ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  User, Mail, Phone, MapPin, Shield, Key, Eye, Edit3, Upload,
  Clock, Smartphone, Trash2, Plus, FileText, History, Monitor, Lock, Briefcase,
  AlertTriangle, RefreshCw, Globe, Camera,
} from "lucide-react";
import { DEMO_MEMBER } from "@/lib/mock-data";
import { KEYS } from "@/lib/keys";
import { usePersistedState, showToast } from "@/lib/storage";
import { useAuthStore } from "@/lib/store";
import { DEMO_CREDENTIALS } from "@/lib/auth";
import { cn, formatDate, formatDateTime, getInitials, todayISO, uid } from "@/lib/utils";
import Modal, {
  Button, ConfirmDialog, FormField, SelectInput, TextInput, ToggleSwitch,
} from "@/components/Modal";
import { Badge, EmptyState, PageHeader, Tabs } from "@/components/ui";
import { ChangePasswordModal } from "@/components/AppShell";

/* ==================================================================
 * Types + seed data
 * ================================================================== */

type TabId = "personal" | "kin" | "kyc" | "security" | "preferences";
const TAB_IDS: TabId[] = ["personal", "kin", "kyc", "security", "preferences"];

interface Profile {
  full_name: string;
  sv_number: string;
  gender: string;
  date_of_birth: string;
  national_id: string;
  email: string;
  phone: string;
  phone2: string;
  address: string;
  occupation: string;
  status: string;
  date_joined: string;
  /** data: URL of the uploaded avatar, or null for initials. */
  photo: string | null;
}

const PROFILE_SEED: Profile = {
  full_name: DEMO_MEMBER.full_name,
  sv_number: DEMO_MEMBER.sv_number,
  gender: DEMO_MEMBER.gender,
  date_of_birth: DEMO_MEMBER.date_of_birth,
  national_id: DEMO_MEMBER.national_id,
  email: DEMO_MEMBER.email,
  phone: DEMO_MEMBER.phone,
  phone2: DEMO_MEMBER.phone2,
  address: DEMO_MEMBER.address,
  occupation: "Accountant",
  status: DEMO_MEMBER.status,
  date_joined: DEMO_MEMBER.date_joined,
  photo: null,
};

interface Kin {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  priority: number;
}
const KIN_SEED: Kin[] = [
  { id: "kin-1", name: "Mary Mukasa", relationship: "Spouse", phone: "+256 700 111 222", priority: 1 },
  { id: "kin-2", name: "Peter Mukasa", relationship: "Brother", phone: "+256 780 333 444", priority: 2 },
];

interface Beneficiary {
  id: string;
  name: string;
  relationship: string;
  share: number;
}
const BENEFICIARY_SEED: Beneficiary[] = [
  { id: "ben-1", name: "Mary Mukasa", relationship: "Spouse", share: 50 },
  { id: "ben-2", name: "Sarah Mukasa", relationship: "Daughter", share: 25 },
  { id: "ben-3", name: "John Mukasa", relationship: "Son", share: 25 },
];

const RELATIONSHIPS = ["Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Other relative", "Friend"];

type DocStatus = "Verified" | "Pending review" | "Expired";
interface KycDoc {
  id: string;
  type: string;
  file_name: string;
  size_kb: number;
  status: DocStatus;
  uploaded: string;
  expires?: string;
}
const KYC_SEED: KycDoc[] = [
  { id: "doc-1", type: "National ID", file_name: "national-id-front-back.pdf", size_kb: 842, status: "Verified", uploaded: "2023-11-10", expires: "2033-05-21" },
  { id: "doc-2", type: "Passport photo", file_name: "passport-photo.jpg", size_kb: 214, status: "Verified", uploaded: "2023-11-10" },
  { id: "doc-3", type: "Proof of address", file_name: "umeme-bill-sep-2025.pdf", size_kb: 368, status: "Expired", uploaded: "2025-09-30", expires: "2026-09-30" },
];
const DOC_TYPES = ["National ID", "Passport photo", "Proof of address", "Signature specimen", "Payslip / proof of income", "Other"];
const MAX_DOC_BYTES = 5 * 1024 * 1024;
const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024;

interface Device {
  id: string;
  name: string;
  location: string;
  last_active: string;
  current?: boolean;
}
interface SecurityState {
  twoFactor: boolean;
  pinSet: boolean;
  pinUpdated: string | null;
  devices: Device[];
}
const SECURITY_SEED: SecurityState = {
  twoFactor: false,
  pinSet: true,
  pinUpdated: "2026-08-14",
  devices: [
    { id: "dev-1", name: "Chrome on Windows (this device)", location: "Kampala, UG", last_active: "2026-11-04T08:12:00", current: true },
    { id: "dev-2", name: "SilverVibe app · Samsung Galaxy A54", location: "Kampala, UG", last_active: "2026-11-03T19:40:00" },
    { id: "dev-3", name: "Safari on iPad", location: "Entebbe, UG", last_active: "2026-10-27T10:05:00" },
  ],
};

const LOGIN_HISTORY = [
  { at: "2026-11-04T08:12:00", device: "Chrome on Windows", location: "Kampala, UG", ip: "102.85.14.22", ok: true },
  { at: "2026-11-03T19:40:00", device: "SilverVibe app · Android", location: "Kampala, UG", ip: "41.210.143.7", ok: true },
  { at: "2026-11-01T07:55:00", device: "Chrome on Windows", location: "Kampala, UG", ip: "102.85.14.22", ok: true },
  { at: "2026-10-30T21:14:00", device: "Unknown browser", location: "Nairobi, KE", ip: "197.248.5.90", ok: false },
  { at: "2026-10-27T10:05:00", device: "Safari on iPad", location: "Entebbe, UG", ip: "196.43.180.12", ok: true },
  { at: "2026-10-18T13:22:00", device: "SilverVibe app · Android", location: "Mukono, UG", ip: "41.210.150.33", ok: true },
  { at: "2026-10-09T09:01:00", device: "Chrome on Windows", location: "Kampala, UG", ip: "102.85.14.22", ok: true },
];

type Channel = "sms" | "email" | "push";
type Category = "transactions" | "loan_reminders" | "announcements" | "statements";
interface Preferences {
  channels: Record<Category, Record<Channel, boolean>>;
  language: "en" | "lg" | "sw";
  eStatement: boolean;
}
const PREF_SEED: Preferences = {
  channels: {
    transactions: { sms: true, email: true, push: true },
    loan_reminders: { sms: true, email: true, push: true },
    announcements: { sms: false, email: true, push: true },
    statements: { sms: false, email: true, push: false },
  },
  language: "en",
  eStatement: true,
};
const CATEGORIES: { id: Category; label: string; desc: string }[] = [
  { id: "transactions", label: "Transactions", desc: "Deposits, withdrawals and transfers" },
  { id: "loan_reminders", label: "Loan reminders", desc: "Upcoming and overdue repayments" },
  { id: "announcements", label: "Announcements", desc: "AGM notices, new products, rate changes" },
  { id: "statements", label: "Statements", desc: "Monthly statement ready to download" },
];
const CHANNELS: { id: Channel; label: string }[] = [
  { id: "sms", label: "SMS" },
  { id: "email", label: "Email" },
  { id: "push", label: "Push" },
];

/* ==================================================================
 * Helpers
 * ================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Ugandan mobile in international form, e.g. +256 770 123 456 (spaces optional). */
function isUgPhone(p: string) {
  return /^\+256\d{9}$/.test(p.replace(/\s+/g, ""));
}
/** Normalise "+256770123456" to "+256 770 123 456". */
function prettyPhone(p: string) {
  const d = p.replace(/\s+/g, "");
  return isUgPhone(d) ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 10)} ${d.slice(10)}` : p.trim();
}
function docTone(s: DocStatus) {
  return s === "Verified" ? "green" : s === "Expired" ? "red" : "amber";
}

/* ==================================================================
 * Page
 * ================================================================== */

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto h-64" />}>
      <ProfileInner />
    </Suspense>
  );
}

function ProfileInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // The URL is the source of truth for the active tab, so header links like
  // /portal/profile?tab=security work even while the page is already open.
  const raw = params.get("tab");
  const active: TabId = raw === "notifications" ? "preferences" : TAB_IDS.includes(raw as TabId) ? (raw as TabId) : "personal";
  const setActive = (t: TabId) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

  const [kin] = usePersistedState<Kin[]>("portal_kin", KIN_SEED);
  const [bens] = usePersistedState<Beneficiary[]>("portal_beneficiaries", BENEFICIARY_SEED);
  const [docs] = usePersistedState<KycDoc[]>("portal_kyc_docs", KYC_SEED);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader title="Profile" subtitle="Manage your personal information, documents and settings" />
      <ProfileHeader docs={docs} onKyc={() => setActive("kyc")} />
      <Tabs<TabId>
        tabs={[
          { id: "personal", label: "Personal Info" },
          { id: "kin", label: "Next of Kin", count: kin.length + bens.length },
          { id: "kyc", label: "KYC Documents", count: docs.length },
          { id: "security", label: "Security" },
          { id: "preferences", label: "Preferences" },
        ]}
        active={active}
        onChange={setActive}
      />
      {active === "personal" && <PersonalSection />}
      {active === "kin" && <KinSection />}
      {active === "kyc" && <KycSection />}
      {active === "security" && <SecuritySection />}
      {active === "preferences" && <PreferencesSection />}
    </div>
  );
}

/* ------------------------------------------------------------------
 * Header with avatar upload
 * ------------------------------------------------------------------ */

function ProfileHeader({ docs, onKyc }: { docs: KycDoc[]; onKyc: () => void }) {
  const [profile, setProfile] = usePersistedState<Profile>(KEYS.portalProfile, PROFILE_SEED);
  const fileRef = useRef<HTMLInputElement>(null);

  // KYC status follows the documents on file.
  const kyc = docs.some((d) => d.status === "Expired")
    ? { label: "KYC action needed", tone: "red" as const }
    : docs.some((d) => d.status === "Pending review")
      ? { label: "KYC pending review", tone: "amber" as const }
      : { label: "KYC verified", tone: "green" as const };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("Please choose an image file (JPG, PNG, WebP)", "error");
    if (file.size > MAX_AVATAR_BYTES) return showToast("Photo is too large. Maximum size is 1.5 MB", "error");
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((p) => ({ ...p, photo: String(reader.result) }));
      showToast("Profile photo updated");
    };
    reader.onerror = () => showToast("Could not read that file", "error");
    reader.readAsDataURL(file);
  };

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative shrink-0">
          {profile.photo ? (
            <div
              role="img"
              aria-label={`${profile.full_name} profile photo`}
              className="w-24 h-24 rounded-2xl bg-cover bg-center"
              style={{ backgroundImage: `url(${profile.photo})` }}
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#4A90D9] to-[#22c55e] flex items-center justify-center">
              <span className="text-3xl font-bold text-white">{getInitials(profile.full_name)}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Upload profile photo"
            title="Upload profile photo"
            className="absolute -bottom-1 -right-1 w-8 h-8 dm-surface rounded-lg shadow-md flex items-center justify-center hover:dm-surface-hover transition-colors border dm-border"
          >
            <Camera className="w-4 h-4 dm-text-secondary" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
        <div className="text-center sm:text-left flex-1 min-w-0">
          <h2 className="text-xl font-bold dm-text">{profile.full_name}</h2>
          <p className="text-[#4A90D9] font-medium">{profile.sv_number}</p>
          <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start items-center">
            <Badge status={profile.status} />
            <button type="button" onClick={onKyc} title="View KYC documents">
              <Badge status={kyc.label} tone={kyc.tone} />
            </button>
            <span className="px-2.5 py-0.5 bg-[#f1f5f9] dm-text-secondary rounded-full text-[11px] font-semibold">
              Member since {formatDate(profile.date_joined)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" /> {profile.photo ? "Change photo" : "Upload photo"}
          </Button>
          {profile.photo && (
            <Button
              variant="secondary"
              onClick={() => {
                setProfile((p) => ({ ...p, photo: null }));
                showToast("Profile photo removed", "info");
              }}
            >
              <Trash2 className="w-4 h-4" /> Remove photo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Personal info
 * ------------------------------------------------------------------ */

type ProfileForm = Pick<Profile, "full_name" | "email" | "phone" | "phone2" | "address" | "occupation">;
type ProfileErrors = Partial<Record<keyof ProfileForm, string>>;

function validateProfile(f: ProfileForm): ProfileErrors {
  const e: ProfileErrors = {};
  if (f.full_name.trim().length < 3) e.full_name = "Enter your full name.";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Enter a valid email address.";
  if (!isUgPhone(f.phone)) e.phone = "Use the format +256 7XX XXX XXX.";
  if (f.phone2.trim() && !isUgPhone(f.phone2)) e.phone2 = "Use the format +256 7XX XXX XXX, or leave blank.";
  if (f.address.trim().length < 8) e.address = "Enter your full physical address (at least 8 characters).";
  return e;
}

function PersonalSection() {
  const [profile, setProfile] = usePersistedState<Profile>(KEYS.portalProfile, PROFILE_SEED);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [errors, setErrors] = useState<ProfileErrors>({});

  const openEdit = () => {
    setErrors({});
    setForm({
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      phone2: profile.phone2,
      address: profile.address,
      occupation: profile.occupation,
    });
  };
  const set = (k: keyof ProfileForm) => (v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = () => {
    if (!form) return;
    const e = validateProfile(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    const next: ProfileForm = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: prettyPhone(form.phone),
      phone2: form.phone2.trim() ? prettyPhone(form.phone2) : "",
      address: form.address.trim(),
      occupation: form.occupation.trim(),
    };
    setProfile((p) => ({ ...p, ...next }));
    updateUser({ name: next.full_name, email: next.email }); // header + menus follow
    setForm(null);
    showToast("Personal information updated");
  };

  const fields = [
    { label: "Full Name", value: profile.full_name, icon: User },
    { label: "SV Number", value: profile.sv_number, icon: Shield, locked: true },
    { label: "Gender", value: profile.gender, icon: User, locked: true },
    { label: "Date of Birth", value: formatDate(profile.date_of_birth), icon: Clock, locked: true },
    { label: "National ID", value: profile.national_id, icon: Shield, locked: true },
    { label: "Date Joined", value: formatDate(profile.date_joined), icon: Clock, locked: true },
    { label: "Email", value: profile.email, icon: Mail },
    { label: "Phone 1", value: profile.phone, icon: Phone },
    { label: "Phone 2", value: profile.phone2 || "Not provided", icon: Phone },
    { label: "Occupation", value: profile.occupation || "Not provided", icon: Briefcase },
    { label: "Address", value: profile.address, icon: MapPin },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6 gap-3">
        <h3 className="font-semibold dm-text">Personal Information</h3>
        <button
          type="button"
          onClick={openEdit}
          className="flex items-center gap-2 px-3 py-2 bg-[#4A90D9]/10 text-[#4A90D9] rounded-lg text-sm font-medium hover:bg-[#4A90D9]/20 transition-colors"
        >
          <Edit3 className="w-4 h-4" /> Edit
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map((field) => (
          <div key={field.label} className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#f1f5f9] flex items-center justify-center flex-shrink-0 mt-0.5">
              <field.icon className="w-4 h-4 dm-text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs dm-text-secondary flex items-center gap-1">
                {field.label}
                {field.locked && <Lock className="w-3 h-3" aria-label="Read-only" />}
              </p>
              <p className="text-sm font-medium dm-text break-words">{field.value}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs dm-text-secondary mt-6 flex items-center gap-1.5">
        <Lock className="w-3 h-3" /> SV number, gender, date of birth, National ID and date joined can only be changed at the SACCO office.
      </p>

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title="Edit personal information"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save}>Save changes</Button>
          </>
        }
      >
        {form && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full name" required error={errors.full_name}>
              <TextInput value={form.full_name} onChange={set("full_name")} autoComplete="name" />
            </FormField>
            <FormField label="Email" required error={errors.email}>
              <TextInput type="email" value={form.email} onChange={set("email")} autoComplete="email" />
            </FormField>
            <FormField label="Phone 1" required error={errors.phone} hint="e.g. +256 770 123 456">
              <TextInput type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
            </FormField>
            <FormField label="Phone 2" error={errors.phone2} hint="Optional">
              <TextInput type="tel" value={form.phone2} onChange={set("phone2")} />
            </FormField>
            <FormField label="Occupation">
              <TextInput value={form.occupation} onChange={set("occupation")} />
            </FormField>
            <FormField label="SV number">
              <TextInput value={profile.sv_number} onChange={() => {}} disabled />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Physical address" required error={errors.address}>
                <TextInput value={form.address} onChange={set("address")} autoComplete="street-address" />
              </FormField>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Next of kin + beneficiaries
 * ------------------------------------------------------------------ */

type KinForm = { id: string | null; name: string; relationship: string; phone: string; priority: string };
type BenForm = { id: string | null; name: string; relationship: string; share: string };

function KinSection() {
  const [kin, setKin] = usePersistedState<Kin[]>("portal_kin", KIN_SEED);
  const [bens, setBens] = usePersistedState<Beneficiary[]>("portal_beneficiaries", BENEFICIARY_SEED);
  const [kinForm, setKinForm] = useState<KinForm | null>(null);
  const [benForm, setBenForm] = useState<BenForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toRemove, setToRemove] = useState<{ kind: "kin" | "ben"; id: string; name: string } | null>(null);

  const sortedKin = [...kin].sort((a, b) => a.priority - b.priority);
  const total = bens.reduce((s, b) => s + b.share, 0);

  const saveKin = () => {
    if (!kinForm) return;
    const e: Record<string, string> = {};
    if (kinForm.name.trim().length < 3) e.name = "Enter the full name.";
    if (!isUgPhone(kinForm.phone)) e.phone = "Use the format +256 7XX XXX XXX.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const rec: Kin = {
      id: kinForm.id ?? uid("kin"),
      name: kinForm.name.trim(),
      relationship: kinForm.relationship,
      phone: prettyPhone(kinForm.phone),
      priority: Number(kinForm.priority),
    };
    setKin((list) => (kinForm.id ? list.map((k) => (k.id === kinForm.id ? rec : k)) : [...list, rec]));
    showToast(kinForm.id ? "Next of kin updated" : "Next of kin added");
    setKinForm(null);
  };

  const benOthers = benForm ? bens.filter((b) => b.id !== benForm.id).reduce((s, b) => s + b.share, 0) : 0;
  const saveBen = () => {
    if (!benForm) return;
    const e: Record<string, string> = {};
    const share = Number(benForm.share);
    if (benForm.name.trim().length < 3) e.name = "Enter the full name.";
    if (!Number.isInteger(share) || share < 1 || share > 100) e.share = "Enter a whole percentage between 1 and 100.";
    else if (benOthers + share > 100) e.share = `Allocations would total ${benOthers + share}%. You can allocate at most ${100 - benOthers}%.`;
    setErrors(e);
    if (Object.keys(e).length) return;
    const rec: Beneficiary = { id: benForm.id ?? uid("ben"), name: benForm.name.trim(), relationship: benForm.relationship, share };
    setBens((list) => (benForm.id ? list.map((b) => (b.id === benForm.id ? rec : b)) : [...list, rec]));
    showToast(benForm.id ? "Beneficiary updated" : "Beneficiary added");
    setBenForm(null);
  };

  const confirmRemove = () => {
    if (!toRemove) return;
    if (toRemove.kind === "kin") setKin((l) => l.filter((k) => k.id !== toRemove.id));
    else setBens((l) => l.filter((b) => b.id !== toRemove.id));
    showToast(`${toRemove.name} removed`, "info");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Next of kin */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className="font-semibold dm-text">Next of Kin</h3>
          <Button
            variant="secondary"
            onClick={() => {
              setErrors({});
              setKinForm({ id: null, name: "", relationship: "Spouse", phone: "", priority: String(Math.min(kin.length + 1, 5)) });
            }}
          >
            <Plus className="w-4 h-4" /> Add next of kin
          </Button>
        </div>
        {sortedKin.length === 0 ? (
          <EmptyState icon={User} title="No next of kin on file" hint="Add at least one person we can contact in an emergency." />
        ) : (
          <div className="space-y-3">
            {sortedKin.map((k) => (
              <div key={k.id} className="p-4 bg-[#f1f5f9] rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium dm-text">{k.name}</p>
                  <p className="text-xs dm-text-secondary">{k.relationship} · <a href={`tel:${k.phone.replace(/\s+/g, "")}`} className="hover:underline">{k.phone}</a></p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={`Priority ${k.priority}`} tone="blue" />
                  <IconBtn label={`Edit ${k.name}`} onClick={() => { setErrors({}); setKinForm({ id: k.id, name: k.name, relationship: k.relationship, phone: k.phone, priority: String(k.priority) }); }}>
                    <Edit3 className="w-4 h-4" />
                  </IconBtn>
                  <IconBtn label={`Remove ${k.name}`} danger onClick={() => setToRemove({ kind: "kin", id: k.id, name: k.name })}>
                    <Trash2 className="w-4 h-4" />
                  </IconBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Beneficiaries */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h3 className="font-semibold dm-text">Beneficiaries</h3>
            <p className="text-xs dm-text-secondary">Who receives your savings and shares. Allocations must total 100%.</p>
          </div>
          <Button
            variant="secondary"
            disabled={total >= 100}
            title={total >= 100 ? "100% is already allocated — edit an existing beneficiary first" : undefined}
            onClick={() => {
              setErrors({});
              setBenForm({ id: null, name: "", relationship: "Son", share: String(Math.max(0, 100 - total)) });
            }}
          >
            <Plus className="w-4 h-4" /> Add beneficiary
          </Button>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="dm-text-secondary">Total allocated</span>
            <span className={cn("font-semibold", total === 100 ? "text-[#16a34a]" : "text-[#d97706]")}>{total}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", total === 100 ? "bg-[#22c55e]" : "bg-[#f59e0b]")} style={{ width: `${Math.min(total, 100)}%` }} />
          </div>
          {total !== 100 && (
            <p className="text-xs text-[#d97706] mt-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {100 - total}% is not allocated. Add a beneficiary or increase an existing share.
            </p>
          )}
        </div>

        {bens.length === 0 ? (
          <EmptyState icon={User} title="No beneficiaries yet" hint="Nominate who should receive your savings and shares." />
        ) : (
          <div className="space-y-3">
            {bens.map((b) => (
              <div key={b.id} className="p-4 bg-[#f1f5f9] rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium dm-text">{b.name}</p>
                  <p className="text-xs dm-text-secondary">{b.relationship}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#22c55e] w-12 text-right">{b.share}%</span>
                  <IconBtn label={`Edit ${b.name}`} onClick={() => { setErrors({}); setBenForm({ id: b.id, name: b.name, relationship: b.relationship, share: String(b.share) }); }}>
                    <Edit3 className="w-4 h-4" />
                  </IconBtn>
                  <IconBtn label={`Remove ${b.name}`} danger onClick={() => setToRemove({ kind: "ben", id: b.id, name: b.name })}>
                    <Trash2 className="w-4 h-4" />
                  </IconBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={kinForm !== null}
        onClose={() => setKinForm(null)}
        title={kinForm?.id ? "Edit next of kin" : "Add next of kin"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setKinForm(null)}>Cancel</Button>
            <Button onClick={saveKin}>Save</Button>
          </>
        }
      >
        {kinForm && (
          <div className="space-y-4">
            <FormField label="Full name" required error={errors.name}>
              <TextInput value={kinForm.name} onChange={(v) => setKinForm({ ...kinForm, name: v })} />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Relationship" required>
                <SelectInput value={kinForm.relationship} onChange={(v) => setKinForm({ ...kinForm, relationship: v })} options={RELATIONSHIPS.map((r) => ({ value: r, label: r }))} />
              </FormField>
              <FormField label="Priority" required hint="1 is contacted first">
                <SelectInput value={kinForm.priority} onChange={(v) => setKinForm({ ...kinForm, priority: v })} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))} />
              </FormField>
            </div>
            <FormField label="Phone" required error={errors.phone} hint="e.g. +256 700 111 222">
              <TextInput type="tel" value={kinForm.phone} onChange={(v) => setKinForm({ ...kinForm, phone: v })} />
            </FormField>
          </div>
        )}
      </Modal>

      <Modal
        open={benForm !== null}
        onClose={() => setBenForm(null)}
        title={benForm?.id ? "Edit beneficiary" : "Add beneficiary"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBenForm(null)}>Cancel</Button>
            <Button onClick={saveBen}>Save</Button>
          </>
        }
      >
        {benForm && (
          <div className="space-y-4">
            <FormField label="Full name" required error={errors.name}>
              <TextInput value={benForm.name} onChange={(v) => setBenForm({ ...benForm, name: v })} />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Relationship" required>
                <SelectInput value={benForm.relationship} onChange={(v) => setBenForm({ ...benForm, relationship: v })} options={RELATIONSHIPS.map((r) => ({ value: r, label: r }))} />
              </FormField>
              <FormField label="Allocation (%)" required error={errors.share} hint={`Other beneficiaries hold ${benOthers}% — up to ${100 - benOthers}% available`}>
                <TextInput type="number" min={1} max={100} value={benForm.share} onChange={(v) => setBenForm({ ...benForm, share: v })} />
              </FormField>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={toRemove !== null}
        onClose={() => setToRemove(null)}
        onConfirm={confirmRemove}
        title={toRemove?.kind === "kin" ? "Remove next of kin?" : "Remove beneficiary?"}
        message={`${toRemove?.name ?? ""} will be removed from your records.`}
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors dm-text-secondary hover:dm-surface",
        danger ? "hover:text-[#ef4444]" : "hover:text-[#4A90D9]"
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------
 * KYC documents
 * ------------------------------------------------------------------ */

type UploadForm = { replaceId: string | null; type: string; file: File | null };

function KycSection() {
  const [docs, setDocs] = usePersistedState<KycDoc[]>("portal_kyc_docs", KYC_SEED);
  const [upload, setUpload] = useState<UploadForm | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<KycDoc | null>(null);
  const expired = docs.filter((d) => d.status === "Expired");

  const openUpload = (replace?: KycDoc) => {
    setUploadError(null);
    setUpload({ replaceId: replace?.id ?? null, type: replace?.type ?? DOC_TYPES[0], file: null });
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!upload) return;
    if (file) {
      const okType = /\.(pdf|jpe?g|png)$/i.test(file.name);
      if (!okType) {
        setUploadError("Only PDF, JPG or PNG files are accepted.");
        e.target.value = "";
        return setUpload({ ...upload, file: null });
      }
      if (file.size > MAX_DOC_BYTES) {
        setUploadError("File is larger than 5 MB.");
        e.target.value = "";
        return setUpload({ ...upload, file: null });
      }
    }
    setUploadError(null);
    setUpload({ ...upload, file });
  };

  const submitUpload = () => {
    if (!upload) return;
    if (!upload.file) return setUploadError("Choose a file to upload.");
    const rec: KycDoc = {
      id: upload.replaceId ?? uid("doc"),
      type: upload.type,
      file_name: upload.file.name,
      size_kb: Math.max(1, Math.round(upload.file.size / 1024)),
      status: "Pending review",
      uploaded: todayISO(),
    };
    setDocs((list) => (upload.replaceId ? list.map((d) => (d.id === upload.replaceId ? rec : d)) : [...list, rec]));
    showToast(`${upload.type} uploaded — pending review by member services`);
    setUpload(null);
  };

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="font-semibold dm-text">KYC Documents</h3>
        <Button variant="secondary" onClick={() => openUpload()}>
          <Upload className="w-4 h-4" /> Upload New Document
        </Button>
      </div>

      {expired.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-[#ef4444]/10 text-[#dc2626] text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {expired.map((d) => d.type).join(", ")} expired. Please upload a current document so your KYC stays verified.
          </span>
        </div>
      )}

      {docs.length === 0 ? (
        <EmptyState icon={FileText} title="No documents on file" hint="Upload your National ID, passport photo and proof of address." />
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="p-4 bg-[#f1f5f9] rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-lg dm-surface flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 dm-text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium dm-text">{doc.type}</p>
                  <p className="text-xs dm-text-secondary truncate">
                    Uploaded {formatDate(doc.uploaded)}
                    {doc.expires && ` · ${doc.status === "Expired" ? "Expired" : "Expires"} ${formatDate(doc.expires)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={doc.status} tone={docTone(doc.status)} />
                <IconBtn label={`View ${doc.type}`} onClick={() => setViewing(doc)}>
                  <Eye className="w-4 h-4" />
                </IconBtn>
                {doc.status === "Expired" && (
                  <Button variant="accent" className="px-3 py-1.5 text-xs" onClick={() => openUpload(doc)}>
                    <RefreshCw className="w-3.5 h-3.5" /> Replace
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={upload !== null}
        onClose={() => setUpload(null)}
        title={upload?.replaceId ? `Replace ${upload.type}` : "Upload new document"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setUpload(null)}>Cancel</Button>
            <Button onClick={submitUpload}>Upload</Button>
          </>
        }
      >
        {upload && (
          <div className="space-y-4">
            <FormField label="Document type" required>
              <SelectInput
                value={upload.type}
                onChange={(v) => setUpload({ ...upload, type: v })}
                options={DOC_TYPES.map((t) => ({ value: t, label: t }))}
                disabled={upload.replaceId !== null}
              />
            </FormField>
            <FormField label="File" required hint="PDF, JPG or PNG, up to 5 MB" error={uploadError}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={onPick}
                className="block w-full text-sm dm-text-secondary file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-[#4A90D9]/10 file:text-[#4A90D9] file:font-medium file:cursor-pointer"
              />
            </FormField>
            {upload.file && (
              <p className="text-xs dm-text-secondary">
                Selected: <span className="font-medium dm-text">{upload.file.name}</span> ({Math.max(1, Math.round(upload.file.size / 1024))} KB)
              </p>
            )}
            <p className="text-xs dm-text-secondary">New documents are reviewed by member services within 2 business days.</p>
          </div>
        )}
      </Modal>

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.type ?? "Document"}
        footer={
          <>
            {viewing?.status === "Expired" && (
              <Button variant="accent" onClick={() => { const d = viewing; setViewing(null); openUpload(d); }}>
                <RefreshCw className="w-4 h-4" /> Replace
              </Button>
            )}
            <Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>
          </>
        }
      >
        {viewing && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="dm-text-secondary">Status</dt>
            <dd><Badge status={viewing.status} tone={docTone(viewing.status)} /></dd>
            <dt className="dm-text-secondary">File</dt>
            <dd className="dm-text break-all">{viewing.file_name}</dd>
            <dt className="dm-text-secondary">Size</dt>
            <dd className="dm-text">{viewing.size_kb.toLocaleString("en-US")} KB</dd>
            <dt className="dm-text-secondary">Uploaded</dt>
            <dd className="dm-text">{formatDate(viewing.uploaded)}</dd>
            <dt className="dm-text-secondary">Expiry</dt>
            <dd className="dm-text">{viewing.expires ? formatDate(viewing.expires) : "Does not expire"}</dd>
            <dt className="dm-text-secondary">Reference</dt>
            <dd className="dm-text font-mono text-xs">{viewing.id.toUpperCase()}</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Security
 * ------------------------------------------------------------------ */

function SecuritySection() {
  const [sec, setSec] = usePersistedState<SecurityState>("portal_security", SECURITY_SEED);
  const [pwOpen, setPwOpen] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState({ next: "", confirm: "" });
  const [pinError, setPinError] = useState<string | null>(null);

  const others = sec.devices.filter((d) => !d.current);

  const confirmOtp = () => {
    if (otp.trim() !== DEMO_CREDENTIALS.otp) return setOtpError(`Incorrect code. The demo code is ${DEMO_CREDENTIALS.otp}.`);
    const enable = !sec.twoFactor;
    setSec((s) => ({ ...s, twoFactor: enable }));
    setOtpOpen(false);
    showToast(enable ? "Two-factor authentication enabled" : "Two-factor authentication disabled", enable ? "success" : "info");
  };

  const savePin = () => {
    if (!/^\d{4}$/.test(pin.next)) return setPinError("PIN must be exactly 4 digits.");
    if (/^(\d)\1{3}$/.test(pin.next) || ["1234", "4321", "0123", "9876"].includes(pin.next)) return setPinError("Choose a less predictable PIN (avoid 1234, 0000 …).");
    if (pin.next !== pin.confirm) return setPinError("PINs don't match.");
    const wasSet = sec.pinSet;
    setSec((s) => ({ ...s, pinSet: true, pinUpdated: todayISO() }));
    setPinOpen(false);
    showToast(wasSet ? "Transaction PIN changed" : "Transaction PIN set");
  };

  const rows = [
    {
      icon: Key, label: "Password", desc: "Change the password you use to sign in",
      action: <Button variant="secondary" onClick={() => setPwOpen(true)}>Change password</Button>,
    },
    {
      icon: Smartphone, label: "Two-factor authentication",
      desc: sec.twoFactor ? "On — a 6-digit SMS code is required at sign-in" : "Off — add an SMS code at sign-in for extra security",
      badge: <Badge status={sec.twoFactor ? "Enabled" : "Disabled"} />,
      action: (
        <Button variant={sec.twoFactor ? "secondary" : "accent"} onClick={() => { setOtp(""); setOtpError(null); setOtpOpen(true); }}>
          {sec.twoFactor ? "Disable" : "Enable"}
        </Button>
      ),
    },
    {
      icon: Lock, label: "Transaction PIN",
      desc: sec.pinSet ? `4-digit PIN for withdrawals and transfers${sec.pinUpdated ? ` · last changed ${formatDate(sec.pinUpdated)}` : ""}` : "Set a 4-digit PIN to authorise withdrawals and transfers",
      action: (
        <Button variant="secondary" onClick={() => { setPin({ next: "", confirm: "" }); setPinError(null); setPinOpen(true); }}>
          {sec.pinSet ? "Change PIN" : "Set PIN"}
        </Button>
      ),
    },
    {
      icon: History, label: "Login history", desc: "Recent sign-ins to your account, including failed attempts",
      action: <Button variant="secondary" onClick={() => setHistoryOpen(true)}>View history</Button>,
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {rows.map((item) => (
        <div key={item.label} className="glass-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#f1f5f9] flex items-center justify-center shrink-0">
              <item.icon className="w-5 h-5 dm-text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium dm-text flex items-center gap-2">{item.label} {item.badge}</p>
              <p className="text-xs dm-text-secondary">{item.desc}</p>
            </div>
          </div>
          {item.action}
        </div>
      ))}

      {/* Active devices */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-medium dm-text">Active devices</p>
            <p className="text-xs dm-text-secondary">{sec.devices.length} device{sec.devices.length === 1 ? "" : "s"} signed in to your account</p>
          </div>
          <Button variant="secondary" disabled={others.length === 0} onClick={() => setSignOutOpen(true)}>
            Sign out other devices
          </Button>
        </div>
        <div className="space-y-2">
          {sec.devices.map((d) => (
            <div key={d.id} className="p-3 bg-[#f1f5f9] rounded-xl flex items-center gap-3">
              <Monitor className="w-4 h-4 dm-text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm dm-text truncate">{d.name}</p>
                <p className="text-xs dm-text-secondary">{d.location} · last active {formatDateTime(d.last_active)}</p>
              </div>
              {d.current && <Badge status="This device" tone="green" />}
            </div>
          ))}
        </div>
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />

      <Modal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        title={sec.twoFactor ? "Disable two-factor authentication" : "Enable two-factor authentication"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOtpOpen(false)}>Cancel</Button>
            <Button variant={sec.twoFactor ? "danger" : "primary"} onClick={confirmOtp}>{sec.twoFactor ? "Disable" : "Confirm & enable"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm dm-text-secondary">
            We sent a 6-digit code to your registered phone. Enter it below to confirm.
          </p>
          <FormField label="Verification code" required error={otpError} hint={`Demo code: ${DEMO_CREDENTIALS.otp}`}>
            <TextInput
              value={otp}
              onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              className="tracking-[0.4em] text-center font-mono"
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title={sec.pinSet ? "Change transaction PIN" : "Set transaction PIN"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPinOpen(false)}>Cancel</Button>
            <Button onClick={savePin}>Save PIN</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="New PIN" required hint="4 digits">
            <TextInput type="password" inputMode="numeric" autoComplete="off" value={pin.next} onChange={(v) => setPin({ ...pin, next: v.replace(/\D/g, "").slice(0, 4) })} className="tracking-[0.4em] text-center font-mono" />
          </FormField>
          <FormField label="Confirm PIN" required error={pinError}>
            <TextInput type="password" inputMode="numeric" autoComplete="off" value={pin.confirm} onChange={(v) => setPin({ ...pin, confirm: v.replace(/\D/g, "").slice(0, 4) })} className="tracking-[0.4em] text-center font-mono" />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Login history"
        size="lg"
        footer={<Button variant="secondary" onClick={() => setHistoryOpen(false)}>Close</Button>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs dm-text-secondary border-b dm-border">
                <th className="py-2 pr-4 font-medium">Date &amp; time</th>
                <th className="py-2 pr-4 font-medium">Device</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="py-2 pr-4 font-medium">IP address</th>
                <th className="py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {LOGIN_HISTORY.map((l) => (
                <tr key={l.at} className="border-b dm-border last:border-0">
                  <td className="py-2.5 pr-4 dm-text whitespace-nowrap">{formatDateTime(l.at)}</td>
                  <td className="py-2.5 pr-4 dm-text whitespace-nowrap">{l.device}</td>
                  <td className="py-2.5 pr-4 dm-text-secondary whitespace-nowrap">{l.location}</td>
                  <td className="py-2.5 pr-4 dm-text-secondary font-mono text-xs">{l.ip}</td>
                  <td className="py-2.5"><Badge status={l.ok ? "Success" : "Failed"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs dm-text-secondary mt-4 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" /> Don&apos;t recognise a sign-in? Change your password and contact support.
        </p>
      </Modal>

      <ConfirmDialog
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={() => {
          setSec((s) => ({ ...s, devices: s.devices.filter((d) => d.current) }));
          showToast(`Signed out of ${others.length} other device${others.length === 1 ? "" : "s"}`);
        }}
        title="Sign out other devices?"
        message="Every device except this one will be signed out and will need your password to sign in again."
        confirmLabel="Sign out"
        danger
      />
    </div>
  );
}

/* ------------------------------------------------------------------
 * Preferences
 * ------------------------------------------------------------------ */

function PreferencesSection() {
  const [saved, setSaved] = usePersistedState<Preferences>("portal_preferences", PREF_SEED);
  // Unsaved edits; null means "showing what is saved".
  const [draft, setDraft] = useState<Preferences | null>(null);
  const prefs = draft ?? saved;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);

  const toggle = (cat: Category, ch: Channel) =>
    setDraft({ ...prefs, channels: { ...prefs.channels, [cat]: { ...prefs.channels[cat], [ch]: !prefs.channels[cat][ch] } } });

  const save = () => {
    setSaved(prefs);
    setDraft(null);
    showToast("Preferences saved");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold dm-text mb-1">Notification channels</h3>
        <p className="text-xs dm-text-secondary mb-4">Choose how we contact you for each kind of update.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="text-xs dm-text-secondary border-b dm-border">
                <th className="text-left py-2 font-medium">Category</th>
                {CHANNELS.map((c) => <th key={c.id} className="py-2 font-medium w-20">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => (
                <tr key={cat.id} className="border-b dm-border last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-medium dm-text">{cat.label}</p>
                    <p className="text-xs dm-text-secondary">{cat.desc}</p>
                  </td>
                  {CHANNELS.map((ch) => (
                    <td key={ch.id} className="py-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${cat.label} by ${ch.label}`}
                        checked={prefs.channels[cat.id][ch.id]}
                        onChange={() => toggle(cat.id, ch.id)}
                        className="w-4 h-4 rounded border-[#C0C0C0] accent-[#4A90D9] cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold dm-text">Language &amp; statements</h3>
        <div className="max-w-xs">
          <FormField label="Language" hint="Used for SMS and email messages">
            <SelectInput
              value={prefs.language}
              onChange={(v) => setDraft({ ...prefs, language: v as Preferences["language"] })}
              options={[
                { value: "en", label: "English" },
                { value: "lg", label: "Luganda" },
                { value: "sw", label: "Swahili" },
              ]}
            />
          </FormField>
        </div>
        <ToggleSwitch
          checked={prefs.eStatement}
          onChange={(v) => setDraft({ ...prefs, eStatement: v })}
          label="Monthly e-statement"
          description="Email a PDF statement to your registered email address on the 1st of each month"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {dirty && <span className="text-xs text-[#d97706] mr-auto flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> You have unsaved changes</span>}
        <Button variant="secondary" disabled={!dirty} onClick={() => setDraft(null)}>Discard</Button>
        <Button disabled={!dirty} onClick={save}>Save preferences</Button>
      </div>
    </div>
  );
}
