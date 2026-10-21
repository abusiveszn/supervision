import React from "react";
import { Users, FileText, CheckCircle2, ClipboardList } from "lucide-react";

/**
 * A static, perspective-tilted dashboard mockup shown on the landing page.
 */
export default function DashboardPreview() {
  return (
    <div
      className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-5 md:p-6"
      style={{ transform: "perspective(1200px) rotateY(-8deg) rotateX(3deg)" }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[#1F2937]">Academic Overview</h3>
        <p className="text-xs text-slate-400">Supervision dashboard</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard icon={<Users className="h-4 w-4 text-[#2563EB]" />} value="24" label="Students" />
        <StatCard icon={<FileText className="h-4 w-4 text-[#10B981]" />} value="12" label="Documents" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-[#2563EB]" />} value="10" label="Approved" />
        <StatCard icon={<ClipboardList className="h-4 w-4 text-[#F59E0B]" />} value="07" label="Pending" />
      </div>

      {/* Progress blocks */}
      <div className="space-y-3">
        <ProgressBlock title="Project Completion" percent={72} color="bg-[#2563EB]" />
        <ProgressBlock title="Reviews Finalized" percent={55} color="bg-[#10B981]" />
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between mb-1">
        {icon}
      </div>
      <div className="text-2xl font-bold text-[#1F2937] leading-none">{value}</div>
      <div className="text-[11px] text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function ProgressBlock({ title, percent, color }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[#374151]">{title}</span>
        <span className="text-xs font-semibold text-slate-500">{percent}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}