import React from "react";
import { Link } from "react-router-dom";
import {
  Check, Brain, MessagesSquare, CalendarClock, FileText,
  FolderTree, ShieldCheck, BarChart3,
} from "lucide-react";
import DashboardPreview from "@/components/DashboardPreview";

const features = [
  {
    icon: Brain,
    color: "#2563EB",
    title: "AI-Powered Feedback",
    desc: "Automatic analysis of grammar, structure, citations, and academic quality on every document submission.",
  },
  {
    icon: MessagesSquare,
    color: "#10B981",
    title: "Real-Time Collaboration",
    desc: "Built-in messaging between students and supervisors, with instant notifications on every key action.",
  },
  {
    icon: FileText,
    color: "#2563EB",
    title: "Document Lifecycle",
    desc: "Submit proposals and chapters with versioning, then approve, reject, or request revisions in one click.",
  },
  {
    icon: FolderTree,
    color: "#F59E0B",
    title: "Project Tracking",
    desc: "Track completion percentages, milestones, and status across every undergraduate project from start to finish.",
  },
  {
    icon: CalendarClock,
    color: "#10B981",
    title: "Meeting Scheduling",
    desc: "Book and manage supervision meetings with automated reminders and shared notes.",
  },
  {
    icon: ShieldCheck,
    color: "#2563EB",
    title: "Role-Based Access",
    desc: "Dedicated portals for Students, Supervisors, and Administrators - each with the right tools and visibility.",
  },
];

const steps = [
  { num: "01", title: "Register & Get a Role", desc: "Students and supervisors join the platform and are assigned a role-based portal with tailored navigation." },
  { num: "02", title: "Submit Your Project", desc: "Students propose topics, upload documents, and track progress - supervisors review and respond in real time." },
  { num: "03", title: "Receive AI Feedback", desc: "Every submission is analyzed for quality, structure, and citations, giving students actionable guidance instantly." },
  { num: "04", title: "Monitor & Report", desc: "Administrators oversee allocation, completion, and system-wide analytics from a single dashboard." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {/* Nav */}
      <header className="w-full px-6 md:px-12 py-6 flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight text-[#1F2937]">
          SmartSupervise
        </span>
        <nav className="hidden sm:flex items-center gap-8 text-sm font-medium text-[#4B5563]">
          <a href="#features" className="hover:text-[#2563EB] transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-[#2563EB] transition-colors">How It Works</a>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-16 grid md:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="flex flex-col gap-7">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-[#1F2937]">
              Smarter Project{" "}
              <span className="text-[#2563EB]">Supervision</span>{" "}
              for Universities
            </h1>
            <p className="text-base md:text-lg text-[#4B5563] font-medium leading-relaxed max-w-xl">
              Streamline undergraduate project management with AI-powered feedback,
              real-time collaboration, and intelligent progress tracking - all in one platform.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-semibold px-6 py-3 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
              >
                Student Portal →
              </Link>
              <Link
                to="/supervisor-auth"
                className="inline-flex items-center gap-2 bg-white text-[#1F2937] font-semibold px-6 py-3 rounded-lg border border-[#D1D5DB] hover:bg-gray-50 transition-colors"
              >
                Supervisor Portal
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[#374151]">
                <Check className="h-5 w-5 text-[#10B981]" />
                Real-time Collaboration
              </span>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[#374151]">
                <Check className="h-5 w-5 text-[#2563EB]" />
                AI Feedback Engine
              </span>
            </div>
          </div>

          {/* Right */}
          <div className="flex justify-center md:justify-end">
            <DashboardPreview />
          </div>
        </div>
      </main>

      {/* Features */}
      <section id="features" className="bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1F2937]">
              Everything you need to{" "}
              <span className="text-[#2563EB]">supervise smarter</span>
            </h2>
            <p className="mt-4 text-[#4B5563] font-medium">
              A unified platform that replaces spreadsheets, email threads, and manual
              reviews with a single, intelligent workflow.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-[#F9FAFB] p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${color}1A` }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <h3 className="font-semibold text-[#1F2937] mb-2">{title}</h3>
                <p className="text-sm text-[#4B5563] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-[#F9FAFB] border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1F2937]">
              How It Works
            </h2>
            <p className="mt-4 text-[#4B5563] font-medium">
              From registration to final report - four simple steps power the entire
              supervision lifecycle.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="relative">
                <span className="text-5xl font-bold text-[#2563EB]/15 block mb-2">{num}</span>
                <h3 className="font-semibold text-[#1F2937] mb-2">{title}</h3>
                <p className="text-sm text-[#4B5563] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="bg-[#1F2937]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "3", label: "Role-Based Portals" },
            { value: "100%", label: "Cloud-Based" },
            { value: "AI", label: "Feedback Engine" },
            { value: "24/7", label: "Real-Time Access" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-3xl md:text-4xl font-bold text-white">{value}</div>
              <div className="text-sm text-slate-400 font-medium mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F9FAFB] border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1F2937]">
            Ready to transform your{" "}
            <span className="text-[#2563EB]">project supervision</span>?
          </h2>
          <p className="mt-4 text-[#4B5563] font-medium max-w-xl mx-auto">
            Join SmartSupervise today and give your faculty a smarter, faster, and more
            transparent way to manage undergraduate final-year projects.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-semibold px-6 py-3 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
            >
              Get Started →
            </Link>
            <Link
              to="/supervisor-auth"
              className="inline-flex items-center gap-2 bg-white text-[#1F2937] font-semibold px-6 py-3 rounded-lg border border-[#D1D5DB] hover:bg-gray-50 transition-colors"
            >
              Supervisor Portal
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}