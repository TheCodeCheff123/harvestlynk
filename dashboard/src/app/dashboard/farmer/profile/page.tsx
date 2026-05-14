export default function Profile() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile card */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-200 to-green-400 flex items-center justify-center mb-4 relative">
              <i className="ri-user-line text-4xl text-white" />
              <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
                <i className="ri-verified-badge-fill text-white text-xs" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Alhaji Musa Ibrahim</h2>
            <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
              <i className="ri-map-pin-line text-xs" /> Kano State, Nigeria
            </p>
            <p className="text-gray-400 text-xs mt-0.5">Joined March 2015</p>

            <div className="w-full mt-5 space-y-2">
              {[
                { label: "Reputation Rating", value: "4.9 / 5.0", valueStyle: "text-amber-500 font-semibold flex items-center gap-1" },
                { label: "Successful Trades", value: "142", valueStyle: "text-[#0D631B] font-semibold" },
                { label: "Response Rate", value: "98%", valueStyle: "text-[#0D631B] font-semibold" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{s.label}</span>
                  <span className={s.valueStyle}>
                    {s.label === "Reputation Rating" && <i className="ri-star-fill text-amber-400 text-xs" />}
                    {s.value}
                  </span>
                </div>
              ))}
            </div>

            <button className="mt-5 w-full py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors">
              Send Message
            </button>
          </div>

          {/* Verification Credentials */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-4">Verification Credentials</p>
            <div className="space-y-4">
              {[
                { icon: "ri-fingerprint-line", iconBg: "bg-green-100", iconColor: "text-[#0D631B]", label: "Identity Verified", sub: "NIN & Biometrics confirmed" },
                { icon: "ri-plant-line", iconBg: "bg-amber-100", iconColor: "text-amber-600", label: "AI Crop Scan History", sub: "12 High-health reports (2023)" },
                { icon: "ri-building-2-line", iconBg: "bg-blue-100", iconColor: "text-blue-600", label: "Warehouse Certified", sub: "ISO 22000 Standard Storage" },
              ].map((c) => (
                <div key={c.label} className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <i className={`${c.icon} ${c.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.label}</p>
                    <p className="text-xs text-gray-400">{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: About + Listings + Ledger */}
        <div className="lg:col-span-2 space-y-5">
          {/* About the Farm */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">About the Farm</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Specializing in high-quality tubers and grains since 2015, Ibrahim Agro Enterprises has become a cornerstone of the Kano agricultural export community. We operate over 50 hectares of fertile land using integrated pest management and modern irrigation techniques to ensure consistent yield and premium nutritional value.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Grains Expert", "Export Ready", "Bulk Supply"].map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full border border-gray-200 text-gray-600 text-xs">{tag}</span>
              ))}
            </div>
          </div>

          {/* Active Marketplace Listings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Active Marketplace Listings</h3>
              <a href="/dashboard/farmer/farm" className="text-sm text-[#0D631B] font-medium hover:underline flex items-center gap-1">
                View All <i className="ri-arrow-right-s-line" />
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: "Premium White Yams", sub: "100kg Bags • Available: 24", price: "₦45,000 / bag", bg: "from-stone-100 to-stone-200", icon: "ri-plant-line text-stone-600" },
                { name: "Grade-A Yellow Maize", sub: "MT (Metric Ton) • Available: 5", price: "₦320,000 / MT", bg: "from-yellow-100 to-yellow-200", icon: "ri-seedling-line text-yellow-600" },
              ].map((item) => (
                <div key={item.name} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                  <div className={`relative h-36 bg-gradient-to-br ${item.bg} flex items-center justify-center`}>
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                      <i className="ri-lock-line text-xs" /> ESCROW
                    </div>
                    <i className={`${item.icon} text-4xl`} />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-gray-900 text-sm mb-0.5">{item.name}</p>
                    <p className="text-gray-400 text-xs mb-2">{item.sub}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[#0D631B] font-bold text-sm">{item.price}</p>
                      <button className="w-8 h-8 rounded-lg bg-[#0D631B] text-white flex items-center justify-center hover:bg-[#0a4f15] transition-colors">
                        <i className="ri-shopping-cart-line text-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction Ledger */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Transaction Ledger Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-100">
                    <th className="text-left px-4 md:px-6 py-3 font-semibold tracking-wide">REFERENCE</th>
                    <th className="text-left px-4 md:px-6 py-3 font-semibold tracking-wide">PRODUCT</th>
                    <th className="text-left px-4 md:px-6 py-3 font-semibold tracking-wide">AMOUNT</th>
                    <th className="text-left px-4 md:px-6 py-3 font-semibold tracking-wide">STATUS</th>
                    <th className="text-left px-4 md:px-6 py-3 font-semibold tracking-wide">RATING</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { ref: "FC-88219", product: "Cassava Tubers (500kg)", amount: "₦185,000", stars: 5 },
                    { ref: "FC-87902", product: "Sorghum (2 MT)", amount: "₦640,000", stars: 4 },
                    { ref: "FC-86114", product: "White Beans (800kg)", amount: "₦290,000", stars: 5 },
                  ].map((row) => (
                    <tr key={row.ref} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 text-gray-700 font-medium">{row.ref}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-600">{row.product}</td>
                      <td className="px-4 md:px-6 py-4 font-semibold text-gray-900">{row.amount}</td>
                      <td className="px-4 md:px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">RELEASED</span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <i key={s} className={`ri-star-${s <= row.stars ? "fill" : "line"} text-amber-400 text-sm`} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
