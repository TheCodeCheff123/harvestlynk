import Link from "next/link";

const stats = [
  { icon: "ri-money-dollar-circle-line", iconBg: "bg-green-100", iconColor: "text-[#0D631B]", badge: "+12% vs last month", badgeColor: "text-[#0D631B]", label: "TOTAL SPENT", value: "₦2,450,000" },
  { icon: "ri-lock-line", iconBg: "bg-amber-100", iconColor: "text-amber-600", badge: "4 Orders Pending", badgeColor: "text-gray-500", label: "ACTIVE ESCROW", value: "₦840,000" },
  { icon: "ri-bank-line", iconBg: "bg-blue-100", iconColor: "text-blue-600", badge: "Top Up", badgeColor: "text-blue-600", badgeLink: "/dashboard/buyer/wallet", label: "WALLET BALANCE", value: "₦1,120,500" },
];

const activity = [
  { icon: "ri-box-3-line", iconBg: "bg-stone-200", title: "Order #FC-8291: 50kg Premium Yams", sub: "Ordered from Farmer Ibrahim • 2 hours ago", badge: "In Escrow", badgeBg: "bg-amber-100", badgeText: "text-amber-700" },
  { icon: "ri-truck-line", iconBg: "bg-blue-100", title: "Status Update: Logistics Dispatched", sub: "Order #FC-7742 (Long Grain Rice) • Yesterday", badge: "In Transit", badgeBg: "bg-green-100", badgeText: "text-[#0D631B]" },
  { icon: "ri-wallet-3-line", iconBg: "bg-green-100", title: "Wallet Top-up Successful", sub: "Transaction ID: TXN-44201 • 3 days ago", amount: "+₦200,000" },
];

const recommended = [
  { name: "Organic Vine Tomatoes", price: "₦8,200", farm: "Jos • Plateau Greens", avail: "Available: 20kg Basket" },
  { name: "Organic Vine Tomatoes", price: "₦8,200", farm: "Jos • Plateau Greens", avail: "Available: 20kg Basket" },
  { name: "Organic Vine Tomatoes", price: "₦8,200", farm: "Jos • Plateau Greens", avail: "Available: 20kg Basket" },
  { name: "Organic Vine Tomatoes", price: "₦8,200", farm: "Jos • Plateau Greens", avail: "Available: 20kg Basket" },
];

export default function BuyerDashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-[#0D631B] rounded-2xl px-5 md:px-8 py-5 md:py-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full border-[40px] border-white" />
          <div className="absolute right-20 top-10 w-40 h-40 rounded-full border-[24px] border-white" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-white mb-1">Welcome back, Chidi!</h1>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-green-200 text-sm">
          <span className="flex items-center gap-1">
            <i className="ri-checkbox-circle-fill text-green-300" /> Verified Premium Buyer
          </span>
          <span className="text-green-300 hidden sm:inline">•</span>
          <span>Member since 2022</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                <i className={`${s.icon} text-xl ${s.iconColor}`} />
              </div>
              {s.badgeLink ? (
                <Link href={s.badgeLink} className={`text-xs font-semibold ${s.badgeColor} hover:underline`}>{s.badge}</Link>
              ) : (
                <span className={`text-xs font-semibold ${s.badgeColor}`}>{s.badge}</span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
          <Link href="/dashboard/buyer/orders" className="text-sm text-[#0D631B] font-medium hover:underline">View All</Link>
        </div>
        <div className="space-y-1">
          {activity.map((a, i) => (
            <div key={i} className="flex items-center gap-3 md:gap-4 py-3.5 border-b border-gray-50 last:border-0">
              <div className={`w-10 h-10 rounded-xl ${a.iconBg} flex items-center justify-center flex-shrink-0`}>
                <i className={`${a.icon} text-gray-600`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{a.sub}</p>
              </div>
              {a.badge && (
                <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold ${a.badgeBg} ${a.badgeText} flex-shrink-0`}>
                  {a.badge}
                </span>
              )}
              {a.amount && (
                <span className="text-sm font-semibold text-gray-700 flex-shrink-0">{a.amount}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Harvests */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Recommended Harvests</h2>
            <p className="text-sm text-gray-400">Seasonal picks from verified farmers near you.</p>
          </div>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors">
              <i className="ri-arrow-left-s-line text-gray-600" />
            </button>
            <button className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors">
              <i className="ri-arrow-right-s-line text-gray-600" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recommended.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
              <div className="relative h-36 bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#0D631B] text-white text-xs px-2 py-0.5 rounded-full">
                  <i className="ri-checkbox-circle-fill text-xs" /> VERIFIED
                </div>
                <i className="ri-leaf-line text-4xl text-red-400" />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                  <p className="text-[#0D631B] font-bold text-sm">{p.price}</p>
                </div>
                <p className="text-gray-400 text-xs flex items-center gap-1 mb-1">
                  <i className="ri-map-pin-line text-xs" /> {p.farm}
                </p>
                <p className="text-gray-400 text-xs mb-3">{p.avail}</p>
                <button className="w-full py-2 rounded-xl bg-[#0D631B] text-white text-xs font-medium hover:bg-[#0a4f15] transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
