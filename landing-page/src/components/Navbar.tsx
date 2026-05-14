"use client";
import { useState } from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

const navLinks = [
  { label: "Home", href: "#" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "For Farmers", href: "#for-farmers" },
  { label: "For Buyers", href: "#for-buyers" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 bg-white border-b border-gray-100">
        <span className="text-xl font-bold text-gray-900">Harvestlynk</span>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          {navLinks.map((l) => (
            <li key={l.label}>
              <a href={l.href} className="hover:text-gray-900 transition-colors">{l.label}</a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 md:gap-3">
          <a
            href={`${APP_URL}/login?role=farmer`}
            className="hidden sm:inline-flex items-center px-5 py-2 rounded-full bg-[#1e5631] text-white text-sm font-medium hover:bg-[#174a28] transition-colors"
          >
            I am a farmer
          </a>
          <a
            href={`${APP_URL}/login?role=buyer`}
            className="hidden sm:inline-flex items-center px-5 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            I am a buyer
          </a>
          <button className="hidden sm:block text-gray-500 hover:text-gray-800 transition-colors" aria-label="Language">
            <i className="ri-global-line text-xl" />
          </button>
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl" />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />

          {/* Drawer */}
          <div className="absolute top-0 right-0 h-full w-72 bg-white shadow-xl flex flex-col z-10">
            <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
              <span className="text-lg font-bold text-gray-900">Harvestlynk</span>
              <button onClick={() => setMenuOpen(false)} className="text-gray-500 hover:text-gray-800 transition-colors">
                <i className="ri-close-line text-2xl" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors font-medium text-sm"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="px-4 py-5 border-t border-gray-100 space-y-3">
              <a
                href={`${APP_URL}/login?role=farmer`}
                className="flex items-center justify-center w-full px-5 py-3 rounded-full bg-[#1e5631] text-white text-sm font-medium hover:bg-[#174a28] transition-colors"
              >
                I am a farmer
              </a>
              <a
                href={`${APP_URL}/login?role=buyer`}
                className="flex items-center justify-center w-full px-5 py-3 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                I am a buyer
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
