"use client";
import { DEMO_MEMBER } from "@/lib/mock-data";
import {
  User, Mail, Phone, MapPin, Shield, Bell, Key, Eye,
  Edit3, Upload, CheckCircle2, AlertTriangle, Clock,
  ChevronRight, Smartphone, Fingerprint,
} from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("personal");
  const member = DEMO_MEMBER;

  const tabs = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "kin", label: "Next of Kin", icon: User },
    { id: "kyc", label: "KYC Documents", icon: Shield },
    { id: "security", label: "Security", icon: Key },
    { id: "notifications", label: "Preferences", icon: Bell },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Profile</h1>
        <p className="text-[#64748b] text-sm">Manage your personal information and settings</p>
      </div>

      {/* Profile Header */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#4A90D9] to-[#22c55e] flex items-center justify-center">
              <span className="text-3xl font-bold text-white">JM</span>
            </div>
            <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-[#f1f5f9] transition-colors border border-[#e2e8f0]">
              <Upload className="w-4 h-4 text-[#64748b]" />
            </button>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-xl font-bold text-[#1A1A1A]">{member.full_name}</h2>
            <p className="text-[#4A90D9] font-medium">{member.sv_number}</p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
              <span className="px-2.5 py-0.5 bg-[#22c55e]/10 text-[#22c55e] rounded-full text-xs font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {member.status}
              </span>
              <span className="px-2.5 py-0.5 bg-[#4A90D9]/10 text-[#4A90D9] rounded-full text-xs font-medium flex items-center gap-1">
                <Shield className="w-3 h-3" /> KYC {member.kyc_status}
              </span>
              <span className="px-2.5 py-0.5 bg-[#f1f5f9] text-[#64748b] rounded-full text-xs font-medium">
                Member since {member.date_joined}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto bg-white rounded-xl p-1 border border-[#e2e8f0]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-[#1A1A1A] text-white"
                : "text-[#64748b] hover:bg-[#f1f5f9]"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "personal" && (
        <div className="glass-card rounded-2xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-[#1A1A1A]">Personal Information</h3>
            <button className="flex items-center gap-2 px-3 py-2 bg-[#4A90D9]/10 text-[#4A90D9] rounded-lg text-sm font-medium hover:bg-[#4A90D9]/20 transition-colors">
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: "Full Name", value: member.full_name, icon: User },
              { label: "SV Number", value: member.sv_number, icon: Shield },
              { label: "Gender", value: member.gender, icon: User },
              { label: "Date of Birth", value: member.date_of_birth, icon: Clock },
              { label: "National ID", value: member.national_id, icon: Shield },
              { label: "Email", value: member.email, icon: Mail },
              { label: "Phone 1", value: member.phone, icon: Phone },
              { label: "Phone 2", value: member.phone2, icon: Phone },
              { label: "Address", value: member.address, icon: MapPin },
            ].map((field) => (
              <div key={field.label} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f1f5f9] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <field.icon className="w-4 h-4 text-[#64748b]" />
                </div>
                <div>
                  <p className="text-xs text-[#64748b]">{field.label}</p>
                  <p className="text-sm font-medium text-[#1A1A1A]">{field.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "kin" && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold text-[#1A1A1A] mb-4">Next of Kin</h3>
            <div className="space-y-3">
              {[
                { name: "Mary Mukasa", relationship: "Spouse", phone: "+256 700 111 222", priority: 1 },
                { name: "Peter Mukasa", relationship: "Brother", phone: "+256 780 333 444", priority: 2 },
              ].map((kin) => (
                <div key={kin.name} className="p-4 bg-[#f1f5f9] rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{kin.name}</p>
                    <p className="text-xs text-[#64748b]">{kin.relationship} · {kin.phone}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-[#4A90D9]/10 text-[#4A90D9] rounded-full text-xs">
                    Priority {kin.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold text-[#1A1A1A] mb-4">Beneficiaries</h3>
            <div className="space-y-3">
              {[
                { name: "Mary Mukasa", relationship: "Spouse", share: 50 },
                { name: "Sarah Mukasa", relationship: "Daughter", share: 25 },
                { name: "John Mukasa", relationship: "Son", share: 25 },
              ].map((ben) => (
                <div key={ben.name} className="p-4 bg-[#f1f5f9] rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{ben.name}</p>
                    <p className="text-xs text-[#64748b]">{ben.relationship}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#22c55e]">{ben.share}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "kyc" && (
        <div className="glass-card rounded-2xl p-6 animate-fade-in">
          <h3 className="font-semibold text-[#1A1A1A] mb-4">KYC Documents</h3>
          <div className="space-y-3">
            {[
              { name: "National ID (Front)", status: "Verified", date: "2023-03-10" },
              { name: "National ID (Back)", status: "Verified", date: "2023-03-10" },
              { name: "Passport Photo", status: "Verified", date: "2023-03-10" },
              { name: "Signature", status: "Verified", date: "2023-03-10" },
            ].map((doc) => (
              <div key={doc.name} className="p-4 bg-[#f1f5f9] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#e2e8f0] flex items-center justify-center">
                    <Eye className="w-5 h-5 text-[#64748b]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{doc.name}</p>
                    <p className="text-xs text-[#64748b]">Uploaded: {doc.date}</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 bg-[#22c55e]/10 text-[#22c55e] rounded-full text-xs font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {doc.status}
                </span>
              </div>
            ))}
          </div>
          <button className="mt-4 flex items-center gap-2 px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] hover:bg-[#f1f5f9] transition-colors">
            <Upload className="w-4 h-4" /> Upload New Document
          </button>
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-4 animate-fade-in">
          {[
            { label: "Change Password", desc: "Update your login password", icon: Key, action: "Update" },
            { label: "Two-Factor Authentication", desc: "Add extra security to your account", icon: Smartphone, action: "Enable" },
            { label: "Biometric Login", desc: "Use fingerprint or face recognition (mobile)", icon: Fingerprint, action: "Coming Soon" },
            { label: "Active Sessions", desc: "1 active session on this device", icon: Eye, action: "View" },
          ].map((item) => (
            <div key={item.label} className="glass-card rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f1f5f9] flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-[#64748b]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">{item.label}</p>
                  <p className="text-xs text-[#64748b]">{item.desc}</p>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-[#f1f5f9] text-[#1A1A1A] rounded-lg text-xs font-medium hover:bg-[#e2e8f0] transition-colors">
                {item.action}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="glass-card rounded-2xl p-6 animate-fade-in">
          <h3 className="font-semibold text-[#1A1A1A] mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            {[
              { label: "Transaction Alerts", email: true, sms: true, inapp: true },
              { label: "Loan Reminders", email: true, sms: true, inapp: true },
              { label: "Savings Reminders", email: true, sms: false, inapp: true },
              { label: "Announcements", email: true, sms: false, inapp: true },
              { label: "Monthly Statements", email: true, sms: false, inapp: false },
            ].map((pref) => (
              <div key={pref.label} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f1f5f9] transition-colors">
                <span className="text-sm font-medium text-[#1A1A1A]">{pref.label}</span>
                <div className="flex gap-3">
                  {[
                    { key: "email", label: "Email", on: pref.email },
                    { key: "sms", label: "SMS", on: pref.sms },
                    { key: "inapp", label: "In-App", on: pref.inapp },
                  ].map((ch) => (
                    <label key={ch.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" defaultChecked={ch.on} className="rounded border-[#C0C0C0] accent-[#4A90D9]" />
                      {ch.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
