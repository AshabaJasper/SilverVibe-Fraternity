"use client";
import {
  HelpCircle, MessageSquare, Phone, Mail, ChevronDown, ChevronUp,
  ExternalLink, BookOpen, Video, Send,
} from "lucide-react";
import { useState } from "react";

const faqs = [
  { q: "How do I make a deposit?", a: "You can make deposits through Mobile Money (dial *165#), Bank Transfer to our SilverVibe account, or visit our office with cash. All deposits are processed within 24 hours." },
  { q: "What is the minimum monthly contribution?", a: "Regular Savings requires a minimum of UGX 200,000 per month. Flexi/Wallet Savings has no minimum." },
  { q: "How do I apply for a loan?", a: "Go to the Loans section and click 'Apply for Loan'. Select your preferred product, enter the amount, choose guarantors, and submit. You'll receive updates via SMS and email." },
  { q: "When are dividends paid?", a: "Dividends are declared at the Annual General Meeting (usually March) and paid within 30 days of declaration." },
  { q: "How do I update my contact information?", a: "Go to Profile > Personal Info > Edit. Phone, email, and address changes are processed immediately. Name or ID changes require admin approval." },
  { q: "What happens if I miss a loan payment?", a: "Late penalties apply after the grace period. You'll receive reminders at 5 days before, 1 day after, 7 days, 30 days, 60 days, and 90 days overdue." },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Help & Support</h1>
        <p className="text-[#64748b] text-sm">Get answers and reach out to us</p>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Call Us", value: "+256 770 000 000", icon: Phone, color: "#22c55e" },
          { label: "Email Us", value: "support@silvervibe.coop", icon: Mail, color: "#4A90D9" },
          { label: "Visit Us", value: "Plot 14, Kampala Road", icon: ExternalLink, color: "#f59e0b" },
        ].map((c) => (
          <div key={c.label} className="glass-card rounded-2xl p-5 text-center animate-fade-in hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${c.color}15` }}>
              <c.icon className="w-6 h-6" style={{ color: c.color }} />
            </div>
            <p className="text-sm font-medium text-[#1A1A1A]">{c.label}</p>
            <p className="text-xs text-[#64748b] mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-2">
        <h3 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#4A90D9]" /> Frequently Asked Questions
        </h3>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-[#e2e8f0] rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-[#f1f5f9] transition-colors"
              >
                <span className="text-sm font-medium text-[#1A1A1A]">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-[#64748b]" /> : <ChevronDown className="w-4 h-4 text-[#64748b]" />}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-[#64748b] leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Form */}
      <div className="glass-card rounded-2xl p-6 animate-fade-in stagger-3">
        <h3 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#4A90D9]" /> Send a Message
        </h3>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setMessage(""); }}>
          <div>
            <label className="text-sm text-[#64748b] mb-1 block">Subject</label>
            <input type="text" placeholder="What do you need help with?"
              className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4A90D9] transition-colors" />
          </div>
          <div>
            <label className="text-sm text-[#64748b] mb-1 block">Message</label>
            <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or question..."
              className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4A90D9] transition-colors resize-none" />
          </div>
          <button type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-[#4A90D9] text-white rounded-xl text-sm font-medium hover:bg-[#3a7bc8] transition-colors">
            <Send className="w-4 h-4" /> Send Message
          </button>
        </form>
      </div>

      {/* Resources */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-[#a855f7]/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-[#a855f7]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">User Guide</p>
            <p className="text-xs text-[#64748b]">Step-by-step guides for all features</p>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-[#ef4444]/10 flex items-center justify-center">
            <Video className="w-6 h-6 text-[#ef4444]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">Video Tutorials</p>
            <p className="text-xs text-[#64748b]">Watch how-to videos for common tasks</p>
          </div>
        </div>
      </div>
    </div>
  );
}
