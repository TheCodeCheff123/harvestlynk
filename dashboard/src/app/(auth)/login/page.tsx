"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";

function RoleDetector({ onRole }: { onRole: (r: "buyer" | "farmer") => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const r = searchParams.get("role");
    if (r === "farmer" || r === "buyer") onRole(r);
  }, [searchParams, onRole]);
  return null;
}

export default function Login() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();

  const [role, setRole] = useState<"buyer" | "farmer">("buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [googleBtnWidth, setGoogleBtnWidth] = useState(400);

  useEffect(() => {
    function measure() {
      if (googleBtnRef.current) {
        setGoogleBtnWidth(googleBtnRef.current.offsetWidth);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  async function handleSignIn() {
    setFormError("");
    if (!email || !password) {
      setFormError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      const dest = user.role === "farmer" ? "/dashboard/farmer" : "/dashboard/buyer";
      router.push(dest);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid email or password.";
      // Unverified account — auto-resend the link and redirect to the
      // verify-email-sent screen so the user knows exactly what to do.
      if (msg.toLowerCase().includes("verify your email") || msg.toLowerCase().includes("email not confirmed")) {
        // Best-effort resend — ignore 429 / any error
        authApi.resendVerification(email).catch(() => {});
        router.push(`/verify-email-sent?email=${encodeURIComponent(email)}`);
        return;
      }
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse: CredentialResponse) {
    setFormError("");
    if (!credentialResponse.credential) {
      setFormError("Google sign-in failed. Please try again.");
      return;
    }

    setLoading(true);
    try {
      const user = await loginWithGoogle(credentialResponse.credential);
      // For Google sign-in, check if the user is a farmer with no bank account set
      // (first-time Google farmer login) — send them to onboarding
      const dest = user.role === "farmer" && !user.bank_account_number
        ? "/onboard/farmer"
        : user.role === "farmer" ? "/dashboard/farmer" : "/dashboard/buyer";
      router.push(dest);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <Suspense>
        <RoleDetector onRole={setRole} />
      </Suspense>

      <div className="hidden lg:flex w-1/2 relative bg-[#0D631B] items-end justify-start overflow-hidden">
        <img
          src="/signup.png"
          alt="Farm"
          className="absolute inset-0 w-full h-full object-cover mix-blend-multiply"
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center p-5 sm:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-8 lg:py-0">
          <h1 className="text-2xl font-bold text-[#0D631B] mb-1">HarvestLynk</h1>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome Back</h2>
          <p className="text-gray-400 text-sm mb-7">
            Securely access your marketplace as a {role === "buyer" ? "Buyer" : "Farmer"}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Email Address</label>
              <div className="relative">
                <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-800">Password</label>
                <Link href="/forgot-password" className="text-sm text-[#0D631B] font-medium hover:underline">Forgot Password?</Link>
              </div>
              <div className="relative">
                <i className="ri-lock-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
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

            {formError && (
              <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{formError}</p>
            )}

            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0D631B] text-white font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-70"
            >
              {loading
                ? <><i className="ri-loader-4-line animate-spin" /> Signing in...</>
                : <>Sign In as {role === "buyer" ? "Buyer" : "Farmer"} <i className="ri-arrow-right-line" /></>
              }
            </button>

            <div className="relative flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium tracking-wide">OR CONTINUE WITH</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div ref={googleBtnRef} className="w-full flex justify-center overflow-hidden">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setFormError("Google sign-in failed. Please try again.")}
                text="signin_with"
                shape="pill"
                theme="outline"
                useOneTap={false}
                width={String(googleBtnWidth)}
              />
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            {"Don't have an account? "}
            <Link
              href={role === "farmer" ? "/signup/farmer" : "/signup/buyer"}
              className="text-[#e8a000] font-semibold hover:underline"
            >
              Create an Account
            </Link>
          </p>

          <div className="border-t border-gray-100 mt-6 pt-5 text-center">
            <button
              onClick={() => router.replace(`/login?role=${role === "buyer" ? "farmer" : "buyer"}`)}
              className="text-sm text-[#0D631B] font-semibold hover:underline"
            >
              Switch to {role === "buyer" ? "Farmer" : "Buyer"} Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
