"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/context/AuthContext";

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isChatDetail = /\/messages\/[^/]+/.test(pathname);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?role=farmer");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <i className="ri-loader-4-line animate-spin text-3xl text-[#0D631B]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen">
      <Topbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
      <div className="flex flex-1 overflow-hidden relative">
        {menuOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className={`flex-1 bg-white ${isChatDetail ? "overflow-hidden p-0" : "overflow-y-auto p-4 md:p-8"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
