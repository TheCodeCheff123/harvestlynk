"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, setTokens } from "@/lib/api";

function VerifyHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hashParams.get("access_token") ?? searchParams.get("token");
    const refreshToken = hashParams.get("refresh_token") ?? undefined;
    if (!token) {
      queueMicrotask(() => {
        setStatus("error");
        setMessage("No verification token found. Please use the link from your email.");
      });
      return;
    }

    authApi.verifyEmail(token, refreshToken)
      .then(({ accessToken, refreshToken, user }) => {
        if (accessToken && refreshToken) setTokens(accessToken, refreshToken);
        setStatus("success");
        setTimeout(() => {
          router.replace(user.role === "farmer" ? "/dashboard/farmer" : "/dashboard/buyer");
        }, 1500);
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed. Please request a new link.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-loader-4-line animate-spin text-2xl text-[#0D631B]" />
          </div>
          <p className="text-gray-600 font-medium">Verifying your email…</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-checkbox-circle-fill text-3xl text-[#0D631B]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Email Verified!</h2>
          <p className="text-gray-400 text-sm">Redirecting you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <i className="ri-error-warning-line text-3xl text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        <a
          href="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-semibold hover:bg-[#0a4f15] transition-colors"
        >
          Back to Login
        </a>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyHandler />
    </Suspense>
  );
}
