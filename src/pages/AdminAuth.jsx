import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { ADMIN_ACCOUNTS, PRIMARY_ADMIN, verifyAdminCredentials } from "@/lib/auth-constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Loader2, Eye, EyeOff, ArrowLeft, KeyRound, Sparkles, CheckCircle2,
} from "lucide-react";

/**
 * Dedicated Administrator Portal for SmartSupervise.
 * Allows university administrators to log in and manage supervision,
 * faculty, students, topic approvals, allocations, and reporting.
 */
export default function AdminAuth() {
  const { loginAsAdmin } = useAuth();

  const [email, setEmail] = useState(PRIMARY_ADMIN.email);

  const [password, setPassword] = useState(PRIMARY_ADMIN.password);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("primary");

  const fillPreset = (account, presetKey) => {
    setEmail(account.email);
    setPassword(account.password);
    setSelectedPreset(presetKey);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Check preconfigured admin credentials first
      const adminUser = verifyAdminCredentials(email, password);
      if (adminUser) {
        loginAsAdmin(email, password);
        window.location.href = "/admin/dashboard";
        return;
      }

      // If Base44 backend is connected, attempt platform login
      if (appParams.appId) {
        await base44.auth.loginViaEmailPassword(email, password);
        window.location.href = "/admin/dashboard";
        return;
      }

      setError("Invalid administrator email or password. Please use the configured admin credentials.");
    } catch (err) {
      setError(err.message || "Invalid administrator credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="px-6 md:px-12 py-5 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900">SmartSupervise</span>
            <span className="ml-2.5 px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
              Admin Portal
            </span>
          </div>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {/* Portal Badge & Heading */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-emerald-400 mb-4 shadow-md ring-4 ring-emerald-50">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Administrator Sign In</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Access the administrative supervision management portal
            </p>
          </div>

          {/* Quick Preset Selector */}
          <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Configured Admin Credentials
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => fillPreset(ADMIN_ACCOUNTS[0], "primary")}
                className={`px-3.5 py-2.5 text-left rounded-lg text-xs font-medium transition-all flex items-center justify-between border ${
                  selectedPreset === "primary"
                    ? "bg-white border-emerald-500 text-slate-900 shadow-xs ring-1 ring-emerald-500"
                    : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-900">
                    Administrator Account
                  </span>
                  <span className="text-slate-500 text-[11px] font-mono">{ADMIN_ACCOUNTS[0].email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Autofill</span>
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200/80">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-slate-700 text-sm font-medium">
                Admin Email Address
              </Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedPreset("");
                }}
                className="h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="admin@smartsupervise.edu"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-password" className="text-slate-700 text-sm font-medium">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setSelectedPreset("");
                  }}
                  className="h-11 pr-14 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 font-mono text-sm"
                  placeholder="Enter administrator password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-sm mt-2 transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-emerald-400" />
                  Authenticating...
                </>
              ) : (
                "Log in to Admin Dashboard →"
              )}
            </Button>
          </form>

          {/* Alternate Portals */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-2 text-center text-xs text-slate-500">
            <p>
              Looking for a different portal?{" "}
              <Link to="/supervisor-auth" className="text-emerald-600 hover:underline font-medium">
                Supervisor Portal
              </Link>
              {" · "}
              <Link to="/login" className="text-emerald-600 hover:underline font-medium">
                Student Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
