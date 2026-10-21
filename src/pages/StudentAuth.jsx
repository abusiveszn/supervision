import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { appParams } from "@/lib/app-params";
import { verifyAdminCredentials } from "@/lib/auth-constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Loader2, Eye, EyeOff, GraduationCap, ArrowLeft,
} from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";

import { registerStudent, verifyUserCredentials } from "@/lib/user-registry";
import { UNIVERSITY_DEPARTMENTS } from "@/lib/departments";

/**
 * Combined Student Portal auth page with Login / Sign Up tabs,
 * matching the approved landing design.
 */
export default function StudentAuth({ initialMode = "login" }) {
  const { loginAsStudent, loginAsAdmin } = useAuth();
  const [mode, setMode] = useState(initialMode); // "login" | "signup"
  const [showOtp, setShowOtp] = useState(false);

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // signup-only
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [matricNo, setMatricNo] = useState("");
  const [department, setDepartment] = useState(UNIVERSITY_DEPARTMENTS[0].name);
  const [agree, setAgree] = useState(false);

  // password visibility
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  const [otpCode, setOtpCode] = useState("");

  const switchMode = (m) => {
    setMode(m);
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // 1. Check admin credentials
      const adminUser = verifyAdminCredentials(email, password);
      if (adminUser) {
        loginAsAdmin(email, password);
        window.location.href = "/admin/dashboard";
        return;
      }

      // 2. Check local registered student credentials
      const localStudent = verifyUserCredentials(email, password, "student");
      if (localStudent === false) {
        setError("Invalid email or password");
        return;
      }

      if (localStudent) {
        loginAsStudent(localStudent);
        window.location.href = "/student/dashboard";
        return;
      }

      // 3. Fallback to cloud Base44 auth if configured
      if (appParams.appId) {
        try {
          await base44.auth.loginViaEmailPassword(email, password);
          loginAsStudent({ email, full_name: email.split('@')[0] });
          window.location.href = "/student/dashboard";
          return;
        } catch {
          // Cloud login failed, proceed to error
        }
      }

      setError("Invalid email or password");
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!agree) {
      setError("Please accept the Terms to continue");
      return;
    }
    setLoading(true);
    const studentData = {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      matricNo,
      registration_number: matricNo,
      department,
      department_id: department,
    };
    try {
      // Save student in unified registry so it reflects across admin dashboard immediately
      const registered = registerStudent(studentData);
      loginAsStudent(registered);
      window.location.href = "/student/dashboard";
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    const studentData = {
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      matricNo,
      registration_number: matricNo,
      department,
      department_id: department,
    };
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      // store student profile data
      try {
        await base44.auth.updateMe({
          registration_number: matricNo,
          department_id: department,
          portal: 'student',
        });
      } catch { /* non-blocking */ }
      registerStudent(studentData);
      loginAsStudent(studentData);
      window.location.href = "/student/dashboard";
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    toast({
      title: "Direct Sign-in",
      description: "Please sign in with your email and password below.",
    });
  };

  // OTP step
  if (showOtp) {
    return (
      <Shell>
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2563EB] mb-4">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1F2937]">Verify your email</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">We sent a code to {email}</p>
          </div>
          {error && <ErrorBox msg={error} />}
          <div className="flex justify-center mb-6">
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
              <InputOTPGroup>
                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button className="w-full h-11 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Verify"}
          </Button>
          <p className="text-center text-sm text-[#9CA3AF] mt-4">
            Didn't receive the code?{" "}
            <button onClick={handleResend} className="text-[#2563EB] font-medium hover:underline">Resend</button>
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2563EB] mb-4">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1F2937]">Welcome Student</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">Login to your account or create a new one</p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#E5E7EB] rounded-xl mb-6">
          <button
            onClick={() => switchMode("login")}
            className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === "login" ? "bg-white text-[#1F2937] shadow-sm" : "text-[#9CA3AF] hover:text-[#1F2937]"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => switchMode("signup")}
            className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === "signup" ? "bg-white text-[#1F2937] shadow-sm" : "text-[#9CA3AF] hover:text-[#1F2937]"
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && <ErrorBox msg={error} />}

        {/* Google */}
        <Button variant="outline" className="w-full h-11 text-sm font-medium mb-5" onClick={handleGoogle}>
          <GoogleIcon className="w-5 h-5 mr-2" />
          Continue with Google
        </Button>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-[#9CA3AF]">or</span>
          </div>
        </div>

        {/* Login form */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#374151]">Email Address</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="student@university.edu"
                value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" required />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#374151]">Password</Label>
                <Link to="/forgot-password" className="text-xs text-[#2563EB] hover:underline">Forgot?</Link>
              </div>
              <PasswordInput id="password" placeholder="Enter your password" value={password}
                onChange={(e) => setPassword(e.target.value)} show={showPw} setShow={setShowPw} />
            </div>
            <Button type="submit" className="w-full h-11 font-medium bg-[#2563EB] hover:bg-blue-700" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging in...</> : "Login →"}
            </Button>
          </form>
        )}

        {/* Signup form */}
        {mode === "signup" && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-[#374151]">First Name</Label>
                <Input id="firstName" placeholder="John" value={firstName}
                  onChange={(e) => setFirstName(e.target.value)} className="h-11" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-[#374151]">Last Name</Label>
                <Input id="lastName" placeholder="Doe" value={lastName}
                  onChange={(e) => setLastName(e.target.value)} className="h-11" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#374151]">Email Address</Label>
              <Input id="email" type="email" placeholder="student@university.edu"
                value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="matric" className="text-[#374151]">Matric No</Label>
                <Input id="matric" placeholder="e.g. 18/52HA0" value={matricNo}
                  onChange={(e) => setMatricNo(e.target.value)} className="h-11" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dept" className="text-[#374151]">Department</Label>
                <select
                  id="dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  required
                >
                  {UNIVERSITY_DEPARTMENTS.map((d) => (
                    <option key={d.code} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[#374151]">Password</Label>
                <PasswordInput id="password" placeholder="Create a password" value={password}
                  onChange={(e) => setPassword(e.target.value)} show={showPw} setShow={setShowPw} autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-[#374151]">Confirm Password</Label>
                <PasswordInput id="confirm" placeholder="Confirm your password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} show={showCpw} setShow={setShowCpw} autoComplete="new-password" />
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-[#4B5563] cursor-pointer">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]" />
              <span>I agree to the <span className="text-[#2563EB] font-medium">Terms of Service</span> and <span className="text-[#2563EB] font-medium">Privacy Policy</span></span>
            </label>
            <Button type="submit" className="w-full h-11 font-medium bg-[#2563EB] hover:bg-blue-700" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</> : "Create Account →"}
            </Button>
          </form>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <div className="px-6 md:px-12 py-6 flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white">
          <GraduationCap className="w-5 h-5" />
        </div>
        <span className="text-lg font-bold tracking-tight text-[#1F2937]">SmartSupervise</span>
        <Link
          to="/"
          className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-[#4B5563] hover:text-[#2563EB] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-12">{children}</div>
    </div>
  );
}

function ErrorBox({ msg }) {
  return <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">{msg}</div>;
}

function PasswordInput({ id, placeholder, value, onChange, show, setShow, autoComplete }) {
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} placeholder={placeholder} value={value}
        onChange={onChange} className="h-11 pr-14" autoComplete={autoComplete} required />
      <button type="button" onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#2563EB] hover:underline">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}