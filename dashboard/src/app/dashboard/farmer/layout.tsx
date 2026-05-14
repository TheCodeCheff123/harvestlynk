"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

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
        <main className="flex-1 overflow-y-auto bg-white p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
