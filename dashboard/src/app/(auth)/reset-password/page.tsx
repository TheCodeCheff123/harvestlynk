"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hashParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.hash.replace(/^#/, ""))
    : new URLSearchParams();
  const token = hashParams.get("access_token") ?? searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!token) { setError("Invalid or missing reset token. Please use the link from your email."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(password)) { setError("Password must contain at least one uppercase letter."); return; }
    if (!/[0-9]/.test(password)) { setError("Password must contain at least one number."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-3xl text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-gray-400 text-sm mb-6">
            This reset link is invalid or has already been used.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-semibold hover:bg-[#0a4f15] transition-colors"
          >
            Request a New Link
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-checkbox-circle-fill text-3xl text-[#0D631B]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Password Updated</h2>
          <p className="text-gray-400 text-sm">Redirecting you to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 relative bg-[#0D631B] items-end justify-start overflow-hidden">
        <img
          src="/signup.png"
          alt="Farm"
          className="absolute inset-0 w-full h-full object-cover mix-blend-multiply"
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-5 sm:p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
              <i className="ri-shield-keyhole-line text-2xl text-[#0D631B]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Set a New Password</h1>
            <p className="text-gray-400 text-sm">
              Choose a strong password with at least 8 characters, one uppercase letter, and one number.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">New Password</label>
              <div className="relative">
                <i className="ri-lock-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <i className={showPassword ? "ri-eye-off-line" : "ri-eye-line"} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Confirm Password</label>
              <div className="relative">
                <i className="ri-lock-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0D631B] text-white font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-70"
            >
              {loading
                ? <><i className="ri-loader-4-line animate-spin" /> Updating…</>
                : <>Update Password <i className="ri-arrow-right-line" /></>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
