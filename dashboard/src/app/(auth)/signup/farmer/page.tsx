"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function FarmerSignup() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleCreate() {
    setLoading(true);
    setTimeout(() => {
      router.push("/dashboard/farmer");
    }, 700);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: image blended with green */}
      <div className="hidden lg:flex w-1/2 relative bg-[#0D631B] items-end justify-start overflow-hidden">
        <img
          src="/signup.png"
          alt="Farmer"
          className="absolute inset-0 w-full h-full object-cover mix-blend-multiply"
        />
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-start lg:items-center justify-center p-5 sm:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-8 lg:py-0">
          <h2 className="text-2xl font-bold text-[#0D631B] mb-1">Create Farmer Account</h2>
          <p className="text-gray-400 text-sm mb-7">Step 1: Basic Farm Information</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Full Name</label>
              <div className="relative">
                <i className="ri-user-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter your full name"
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
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <i className={showPassword ? "ri-eye-off-line" : "ri-eye-line"} />
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" className="mt-0.5 rounded border-gray-300 accent-[#0D631B]" />
              <span className="text-xs text-gray-500 leading-relaxed">
                I agree to the{" "}
                <a href="#" className="text-[#0D631B] font-medium hover:underline">Terms of Service</a>
                {" "}and acknowledge the{" "}
                <a href="#" className="text-[#0D631B] font-medium hover:underline">AI Verification</a>
                {" "}protocol for farmer authentication.
              </span>
            </label>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0D631B] text-white font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-70"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              Create Farmer Account
              {!loading && <i className="ri-arrow-right-line" />}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-[#0D631B] font-semibold hover:underline">Log in as Farmer</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
