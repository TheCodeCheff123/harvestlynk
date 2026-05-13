"use client";
import { useState } from "react";

const resources = ["Farmers Guide", "Contact Support", "Market Trends"];
const legal = ["Terms of Service", "Privacy Policy", "Escrow Policy"];

export default function Footer() {
  const [email, setEmail] = useState("");

  return (
    <footer className="bg-[#1a1a1a] text-white py-16">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <p className="text-xl font-bold mb-3">Harvestlynk</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Empowering the Nigerian agricultural ecosystem through secure
              technology and direct marketplace access.
            </p>
          </div>

          {/* Resources */}
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-4">Resources</p>
            <ul className="space-y-2">
              {resources.map((r) => (
                <li key={r}>
                  <a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">
                    {r}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-4">Legal</p>
            <ul className="space-y-2">
              {legal.map((l) => (
                <li key={l}>
                  <a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#e8a000]"
              />
              <button className="px-4 py-2 rounded-lg bg-[#1e5631] text-white text-sm font-medium hover:bg-[#174a28] transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 text-center text-gray-500 text-xs">
          © 2025 FarmConnect. Secure Farms Protected System.
        </div>
      </div>
    </footer>
  );
}
