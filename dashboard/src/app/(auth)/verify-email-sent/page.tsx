"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";

function Content() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "rate_limited">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleResend() {
    if (!email || status === "sending" || status === "sent") return;
    setStatus("sending");
    setErrorMsg("");
    try {
      await authApi.resendVerification(email);
      setStatus("sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("rate") || msg.includes("429") || msg.toLowerCase().includes("too many")) {
        setStatus("rate_limited");
      } else {
        setErrorMsg(msg || "Could not resend. Please try again later.");
        setStatus("error");
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <i className="ri-mail-send-line text-4xl text-[#0D631B]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-500 text-sm mb-1">
          We sent a verification link to
        </p>
        {email && (
          <p className="text-[#0D631B] font-semibold text-sm mb-6">{email}</p>
        )}
        <p className="text-gray-400 text-sm mb-8">
          Click the link in the email to verify your account and log in.
          The link expires in 10 minutes. If you don&apos;t see it, check your spam folder.
        </p>

        <div className="space-y-3">
          {status === "sent" && (
            <p className="text-green-600 text-sm font-medium py-2">
              <i className="ri-checkbox-circle-line mr-1" /> A new link has been sent. Check your inbox.
            </p>
          )}

          {status === "rate_limited" && (
            <p className="text-amber-600 text-sm font-medium py-2 bg-amber-50 rounded-xl px-3">
              <i className="ri-time-line mr-1" /> You&apos;ve requested too many links. Please wait a few minutes before trying again.
            </p>
          )}

          {status === "error" && errorMsg && (
            <p className="text-red-500 text-sm font-medium py-2 bg-red-50 rounded-xl px-3">
              <i className="ri-error-warning-line mr-1" /> {errorMsg}
            </p>
          )}

          {status !== "sent" && (
            <button
              onClick={handleResend}
              disabled={!email || status === "sending" || status === "rate_limited"}
              className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {status === "sending" ? (
                <><i className="ri-loader-4-line animate-spin mr-1" /> Sending…</>
              ) : (
                "Resend verification email"
              )}
            </button>
          )}

          <Link
            href="/login"
            className="block w-full py-3 rounded-xl bg-[#0D631B] text-white text-sm font-semibold hover:bg-[#0a4f15] transition-colors text-center"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailSentPage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
