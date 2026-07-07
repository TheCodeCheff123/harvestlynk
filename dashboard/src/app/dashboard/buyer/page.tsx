"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp, scaleIn, fadeIn } from "@/lib/motion";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
  marketplaceApi,
  ordersApi,
  formatNaira,
  type PublicListing,
  type BuyerOrder,
} from "@/lib/api";

const CATEGORY_STYLE: Record<string, { bg: string; icon: string }> = {
  "Grains & Cereals": { bg: "from-yellow-100 to-yellow-200", icon: "ri-plant-line text-yellow-600" },
  Tubers:             { bg: "from-amber-100 to-amber-200",  icon: "ri-leaf-line text-amber-600" },
  Vegetables:         { bg: "from-green-100 to-green-200",  icon: "ri-seedling-line text-green-600" },
  Fruits:             { bg: "from-orange-100 to-orange-200",icon: "ri-plant-line text-orange-500" },
  Livestock:          { bg: "from-stone-100 to-stone-200",  icon: "ri-seedling-line text-stone-600" },
  Other:              { bg: "from-gray-100 to-gray-200",    icon: "ri-box-3-line text-gray-500" },
};

const ORDER_STATUS: Record<BuyerOrder["status"], { label: string; icon: string; badge: string }> = {
  pending_payment:   { label: "Awaiting Payment",  icon: "ri-time-line",            badge: "bg-red-100 text-red-700" },
  payment_confirmed: { label: "Payment Confirmed", icon: "ri-secure-payment-line",  badge: "bg-blue-100 text-blue-700" },
  processing:        { label: "In Escrow",         icon: "ri-lock-line",            badge: "bg-blue-100 text-blue-700" },
  ready_for_pickup:  { label: "Ready for Pickup",  icon: "ri-store-2-line",         badge: "bg-purple-100 text-purple-700" },
  completed:         { label: "Delivered",         icon: "ri-checkbox-circle-line", badge: "bg-green-100 text-green-700" },
  cancelled:         { label: "Cancelled",         icon: "ri-close-circle-line",    badge: "bg-gray-100 text-gray-500" },
  disputed:          { label: "Disputed",          icon: "ri-alert-line",           badge: "bg-orange-100 text-orange-700" },
};

function relativeDate(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export default function BuyerDashboard() {
  const { user, wallet } = useAuth();
  const { addItem, totalItems } = useCart();
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [l, o] = await Promise.all([
        marketplaceApi.getAllListings(),
        ordersApi.getMyBuyerOrders(),
      ]);
      setListings(l.slice(0, 4));
      setOrders(o);
    } catch {
      // empty states will handle
    } finally {
      setLoadingData(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  function handleAddToCart(listing: PublicListing) {
    addItem(listing, 1);
    setAdded((prev) => ({ ...prev, [listing.listing_id]: true }));
    setTimeout(() => setAdded((prev) => ({ ...prev, [listing.listing_id]: false })), 1500);
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const joinYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : null;

  const availableBalance = wallet?.available_balance ? formatNaira(wallet.available_balance) : "₦0.00";

  const activeOrders = orders.filter((o) => ["processing", "pending_payment"].includes(o.status));
  const totalSpent = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + o.total_amount, 0);

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {/* Welcome banner */}
      <motion.div
        variants={fadeUp}
        className="bg-[#0D631B] rounded-2xl px-5 md:px-8 py-5 md:py-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full border-[40px] border-white" />
          <div className="absolute right-20 top-10 w-40 h-40 rounded-full border-[24px] border-white" />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
              Welcome back, {firstName}!
            </h1>
            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-green-200 text-sm">
              <span className="flex items-center gap-1">
                <i className="ri-checkbox-circle-fill text-green-300" /> Verified Buyer
              </span>
              {joinYear && (
                <>
                  <span className="text-green-300 hidden sm:inline">•</span>
                  <span>Member since {joinYear}</span>
                </>
              )}
            </div>
          </div>
          {totalItems > 0 && (
            <Link
              href="/dashboard/buyer/checkout"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors flex-shrink-0"
            >
              <i className="ri-shopping-cart-line" /> {totalItems} in cart
            </Link>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" variants={staggerContainer}>
        {[
          {
            icon: "ri-money-dollar-circle-line", iconBg: "bg-green-100", iconColor: "text-[#0D631B]",
            label: "TOTAL SPENT",
            value: loadingData ? "—" : `₦${totalSpent.toLocaleString("en-NG")}`,
            badge: loadingData ? "" : `${orders.filter(o=>o.status==="completed").length} completed orders`,
            badgeColor: "text-gray-500",
          },
          {
            icon: "ri-lock-line", iconBg: "bg-amber-100", iconColor: "text-amber-600",
            label: "ACTIVE ESCROW",
            value: loadingData ? "—" : `${activeOrders.length} Order${activeOrders.length !== 1 ? "s" : ""}`,
            badge: loadingData ? "" : activeOrders.length > 0 ? "In progress" : "None active",
            badgeColor: "text-gray-500",
          },
          {
            icon: "ri-bank-line", iconBg: "bg-blue-100", iconColor: "text-blue-600",
            label: "WALLET BALANCE",
            value: availableBalance,
            badge: "Top Up",
            badgeColor: "text-blue-600",
            badgeLink: "/dashboard/buyer/wallet",
          },
        ].map((s) => (
          <motion.div
            key={s.label}
            variants={scaleIn}
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-2xl p-5 border border-gray-100"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                <i className={`${s.icon} text-xl ${s.iconColor}`} />
              </div>
              {"badgeLink" in s && s.badgeLink ? (
                <Link href={s.badgeLink} className={`text-xs font-semibold ${s.badgeColor} hover:underline`}>
                  {s.badge}
                </Link>
              ) : (
                <span className={`text-xs font-semibold ${s.badgeColor}`}>{s.badge}</span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={fadeIn} className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
          <Link href="/dashboard/buyer/orders" className="text-sm text-[#0D631B] font-medium hover:underline">
            View All
          </Link>
        </div>
        {loadingData ? (
          <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
            <i className="ri-loader-4-line animate-spin mr-2" /> Loading...
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-gray-400 text-sm">
            <i className="ri-inbox-line text-xl mb-1" />
            No orders yet — start shopping in the marketplace.
          </div>
        ) : (
          <div className="space-y-1">
            {orders.slice(0, 4).map((o, i) => {
              const st = ORDER_STATUS[o.status];
              return (
                <motion.div
                  key={o.order_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.07 }}
                  className="flex items-center gap-3 md:gap-4 py-3.5 border-b border-gray-50 last:border-0"
                >
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <i className="ri-box-3-line text-stone-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {o.listing.product_name} ({parseFloat(o.quantity)} {o.listing.unit})
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {o.farmer.farmName ?? o.farmer.name} · {relativeDate(o.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${st.badge}`}>
                      <i className={st.icon} /> {st.label}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      ₦{o.total_amount.toLocaleString("en-NG")}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Recommended from marketplace */}
      <motion.div variants={fadeUp}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Available Harvests</h2>
            <p className="text-sm text-gray-400">Fresh produce from verified Nigerian farms.</p>
          </div>
          <Link
            href="/dashboard/buyer/marketplace"
            className="text-sm text-[#0D631B] font-medium hover:underline flex items-center gap-1"
          >
            Browse All <i className="ri-arrow-right-s-line" />
          </Link>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            <i className="ri-loader-4-line animate-spin mr-2" /> Loading...
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">
            <i className="ri-store-line text-2xl mb-1" />
            No listings available yet. Check back soon.
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={staggerContainer}
          >
            {listings.map((p) => {
              const style = CATEGORY_STYLE[p.category] ?? CATEGORY_STYLE["Other"];
              const isAdded = added[p.listing_id];
              const farmerLocation = p.farmer.location_state ?? p.location_state;
              return (
                <motion.div
                  key={p.listing_id}
                  variants={scaleIn}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100"
                >
                  <div className={`relative h-36 overflow-hidden ${!p.images?.length ? `bg-gradient-to-br ${style.bg}` : ""} flex items-center justify-center`}>
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-[#0D631B] text-white text-xs px-2 py-0.5 rounded-full">
                      <i className="ri-checkbox-circle-fill text-xs" /> ACTIVE
                    </div>
                    {p.images?.length ? (
                      <img src={p.images[0]} alt={p.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <i className={`${style.icon} text-4xl`} />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{p.product_name}</p>
                      <p className="text-[#0D631B] font-bold text-sm">
                        ₦{(p.price_per_unit / 100).toLocaleString("en-NG")}
                      </p>
                    </div>
                    <p className="text-gray-400 text-xs flex items-center gap-1 mb-3">
                      <i className="ri-map-pin-line text-xs" /> {farmerLocation}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAddToCart(p)}
                      className={`w-full py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1
                        ${isAdded ? "bg-green-100 text-green-700" : "bg-[#0D631B] text-white hover:bg-[#0a4f15]"}`}
                    >
                      {isAdded ? <><i className="ri-check-line" /> Added!</> : "Add to Cart"}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
