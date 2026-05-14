const recentOrders = [
  { thumb: "ri-basket-line", name: "Premium Yam Tubers (50kg)", ref: "Order #FC-88291 • June 12, 2024", amount: "₦75,000", status: "IN TRANSIT", statusBg: "bg-blue-50", statusText: "text-blue-600" },
  { thumb: "ri-leaf-line",   name: "Organic Veggie Basket (Large)", ref: "Order #FC-88104 • June 05, 2024", amount: "₦12,500", status: "DELIVERED", statusBg: "bg-green-100", statusText: "text-[#0D631B]" },
  { thumb: "ri-store-line",  name: "Stone-Free Local Rice (25kg)", ref: "Order #FC-87992 • May 28, 2024", amount: "₦32,000", status: "DELIVERED", statusBg: "bg-green-100", statusText: "text-[#0D631B]" },
];

const stats = [
  { label: "Total Orders", value: "42", note: "+3 this month", accent: "border-l-4 border-[#0D631B]" },
  { label: "Escrow Success", value: "100%", note: "", icon: "ri-shield-check-line", accent: "border-l-4 border-blue-400" },
  { label: "Active Disputes", value: "0", note: "Perfect Record", accent: "border-l-4 border-red-400" },
];

export default function BuyerProfile() {
  return (
    <div className="space-y-5">
      {/* Profile card */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-200 to-green-400 flex items-center justify-center border-4 border-[#0D631B]">
              <i className="ri-user-3-line text-3xl text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white">
              <i className="ri-checkbox-circle-fill text-white text-xs" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">Chidi Okechukwu</h2>
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-[#0D631B] text-xs font-semibold">
                <i className="ri-checkbox-circle-line" /> Verified Buyer
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-1">Lagos, Nigeria • Member since October 2022</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {["Tubers", "Organic", "Bulk Purchases"].map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full border border-gray-200 text-gray-600 text-xs">{tag}</span>
              ))}
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors flex-shrink-0 self-start">
            <i className="ri-pencil-line" /> Edit Profile
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`bg-white rounded-2xl p-5 border border-gray-100 ${s.accent}`}>
            <p className="text-sm text-gray-500 mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              {s.value}
              {s.icon && <i className={`${s.icon} text-blue-400 text-2xl`} />}
            </p>
            {s.note && <p className="text-xs text-gray-400 mt-1">{s.note}</p>}
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
          <button className="text-sm text-[#0D631B] font-medium hover:underline flex items-center gap-1">
            View All <i className="ri-arrow-right-line" />
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {recentOrders.map((o, i) => (
            <div key={i} className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 hover:bg-gray-50/50 transition-colors">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                <i className={`${o.thumb} text-stone-500 text-lg md:text-xl`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{o.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{o.ref}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-[#0D631B]">{o.amount}</p>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${o.statusBg} ${o.statusText}`}>
                  {o.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
