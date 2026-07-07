"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/context/AuthContext";

export default function FarmerSignup() {
  const { signup, loginWithGoogle } = useAuth();
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

  async function handleGoogleSuccess(credentialResponse: CredentialResponse) {
    setFormError("");
    if (!credentialResponse.credential) {
      setFormError("Google sign-up failed. Please try again.");
      return;
    }
    if (!agreed) {
      setFormError("Please agree to the Terms of Service to continue.");
      return;
    }

    setLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential, "farmer");
      router.push("/onboard/farmer");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Google sign-up failed. Please try again.");
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

              <div className="w-full flex justify-center overflow-hidden">
                <div className="w-full max-w-full">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setFormError("Google sign-up failed. Please try again.")}
                    text="signup_with"
                    shape="pill"
                    theme="outline"
                    useOneTap={false}
                    width="400"
                  />
                </div>
              </div>
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
