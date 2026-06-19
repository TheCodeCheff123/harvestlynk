"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function FarmerSignup() {
  const { signup } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleCreate() {
    setFormError("");
    if (!firstName || !lastName || !email || !farmName || !location || !phoneNumber || !password) {
      setFormError("Please fill in all fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (!agreed) {
      setFormError("Please agree to the Terms of Service to continue.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await signup({ role: "farmer", firstName, lastName, email, farmName, location, phoneNumber, password });
      router.push(`/verify-email-sent?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>

      <div className="min-h-screen flex">
        <div className="hidden lg:flex w-1/2 relative bg-[#0D631B] items-end justify-start overflow-hidden">
          <img
            src="/signup.png"
            alt="Farmer"
            className="absolute inset-0 w-full h-full object-cover mix-blend-multiply"
          />
        </div>

        <div className="flex-1 flex items-start lg:items-center justify-center p-5 sm:p-8 bg-white overflow-y-auto">
          <div className="w-full max-w-md py-8 lg:py-0">
            <h2 className="text-2xl font-bold text-[#0D631B] mb-1">Create Farmer Account</h2>
            <p className="text-gray-400 text-sm mb-7">Step 1: Basic Farm Information</p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">First Name</label>
                  <div className="relative">
                    <i className="ri-user-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">Last Name</label>
                  <div className="relative">
                    <i className="ri-user-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

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
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Farm Name</label>
                <div className="relative">
                  <i className="ri-store-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g. Green Harvest Ventures"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">Location (State/LGA)</label>
                  <div className="relative">
                    <i className="ri-map-pin-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Kano, Ungogo"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <i className="ri-phone-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="+234 000..."
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Password</label>
                <div className="relative">
                  <i className="ri-lock-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
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

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 accent-[#0D631B]"
                />
                <span className="text-xs text-gray-500 leading-relaxed">
                  I agree to the{" "}
                  <a href="#" className="text-[#0D631B] font-medium hover:underline">Terms of Service</a>
                  {" "}and acknowledge the{" "}
                  <a href="#" className="text-[#0D631B] font-medium hover:underline">AI Verification</a>
                  {" "}protocol for farmer authentication.
                </span>
              </label>

              {formError && (
                <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{formError}</p>
              )}

              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0D631B] text-white font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-70"
              >
                {loading
                  ? <><i className="ri-loader-4-line animate-spin" /> Creating Account...</>
                  : <>Create Farmer Account <i className="ri-arrow-right-line" /></>
                }
              </button>

              <div className="relative flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium tracking-wide">OR</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={() => alert("Google sign-up is not yet configured.")}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign up with Google
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-5">
              Already have an account?{" "}
              <Link href="/login?role=farmer" className="text-[#0D631B] font-semibold hover:underline">Log in as Farmer</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
