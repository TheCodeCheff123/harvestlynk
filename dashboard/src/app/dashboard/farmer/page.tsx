"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp, scaleIn, fadeIn } from "@/lib/motion";
import { useAuth } from "@/context/AuthContext";
import {
  marketplaceApi,
  ordersApi,
  formatNaira,
  koboToNaira,
  type Listing,
  type FarmerOrder,
} from "@/lib/api";

const CATEGORY_STYLE: Record<string, { bg: string; icon: string }> = {
  "Grains & Cereals": { bg: "from-yellow-100 to-yellow-200", icon: "ri-plant-line text-yellow-600" },
  Tubers:             { bg: "from-amber-100 to-amber-200",  icon: "ri-leaf-line text-amber-600" },
  Vegetables:         { bg: "from-green-100 to-green-200",  icon: "ri-seedling-line text-green-600" },
  Fruits:             { bg: "from-orange-100 to-orange-200",icon: "ri-plant-line text-orange-500" },
  Livestock:          { bg: "from-stone-100 to-stone-200",  icon: "ri-seedling-line text-stone-600" },
  Legumes:            { bg: "from-lime-100 to-lime-200",    icon: "ri-leaf-line text-lime-600" },
  Spices:             { bg: "from-red-100 to-red-200",      icon: "ri-leaf-line text-red-500" },
  Other:              { bg: "from-gray-100 to-gray-200",    icon: "ri-box-3-line text-gray-500" },
};

const ORDER_STATUS: Record<
  FarmerOrder["status"],
  { label: string; dot: string }
> = {
  pending_payment:   { label: "Awaiting Payment",   dot: "bg-red-400" },
  payment_confirmed: { label: "Payment Confirmed",  dot: "bg-blue-400" },
  processing:        { label: "Secured in Escrow",  dot: "bg-amber-400" },
  ready_for_pickup:  { label: "Ready for Pickup",   dot: "bg-purple-400" },
  completed:         { label: "Funds Released",     dot: "bg-green-500" },
  cancelled:         { label: "Cancelled",          dot: "bg-gray-400" },
  disputed:          { label: "Disputed",           dot: "bg-orange-500" },
};

export default function FarmerDashboard() {
  const router = useRouter();
  const { user, wallet } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<FarmerOrder[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [unverified, setUnverified] = useState(false);

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem("hl_farmer_verified");
    if (stored === "false") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnverified(true);
    } else if (stored === null) {
      // First visit — if farmer has no bank account linked, mark as needing onboarding
      if (!user.bank_account_number) {
        localStorage.setItem("hl_farmer_verified", "false");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUnverified(true);
      } else {
        localStorage.setItem("hl_farmer_verified", "true");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [l, o] = await Promise.all([
        marketplaceApi.getMyListings(),
        ordersApi.getMyFarmerOrders(),
      ]);
      setListings(l);
      setOrders(o);
    } catch {
      // silently fail — empty states will show
    } finally {
      setLoadingData(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  const activeListings = listings.filter((l) => l.status === "active");
  const processingOrders = orders.filter((o) => o.status === "processing");
  const firstName = user?.name?.split(" ")[0] ?? "Farmer";

  const availableBalance = wallet?.available_balance
    ? formatNaira(wallet.available_balance)
    : "₦0.00";
  const pendingBalance = wallet?.pending_balance
    ? `₦${koboToNaira(wallet.pending_balance).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`
    : "₦0.00";

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {/* Unverified banner */}
      {unverified && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-shield-line text-amber-600 text-lg" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">⚠️ Account verification pending</p>
              <p className="text-xs text-amber-600 mt-0.5">Complete identity &amp; farm verification to unlock full marketplace access and faster payouts.</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/onboard/farmer")}
            className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            Complete Verification
          </motion.button>
        </motion.div>
      )}

      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Welcome Back, {firstName}
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s your farm overview for today.</p>
      </motion.div>

      {/* Financial Overview */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl p-4 md:p-6 border border-[#BFCABA]">
        <div className="flex items-start sm:items-center justify-between mb-5 gap-3 flex-col sm:flex-row">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Financial Overview</h2>
            <p className="text-sm text-[#0D631B] flex items-center gap-1 mt-1">
              <i className="ri-shield-check-line" /> Escrow Protection Active
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/dashboard/farmer/wallet")}
            className="px-4 py-2 rounded-lg bg-[#835400] text-white text-sm font-medium hover:bg-[#d09000] transition-colors self-start sm:self-auto"
          >
            Withdraw Funds
          </motion.button>
        </div>
        <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4" variants={staggerContainer}>
          <motion.div variants={scaleIn} whileHover={{ scale: 1.02 }} className="bg-[#0D631B] rounded-xl p-5">
            <p className="text-green-200 text-xs mb-2">Available Balance</p>
            <p className="text-white text-2xl font-bold">{availableBalance}</p>
          </motion.div>
          <motion.div variants={scaleIn} whileHover={{ scale: 1.02 }} className="bg-gray-50 rounded-xl p-5">
            <p className="text-gray-500 text-xs mb-1">Pending (Escrow)</p>
            <div className="flex items-center gap-2 mt-1">
              <i className="ri-lock-line text-gray-400" />
              <p className="text-gray-900 text-2xl font-bold">{pendingBalance}</p>
            </div>
          </motion.div>
          <motion.div variants={scaleIn} whileHover={{ scale: 1.02 }} className="bg-gray-50 rounded-xl p-5">
            <p className="text-gray-500 text-xs mb-1">Awaiting Confirmation</p>
            <p className="text-gray-900 text-2xl font-bold mb-2">
              {loadingData ? "—" : processingOrders.length}
            </p>
            {!loadingData && processingOrders.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#FCAB28] text-[#694300] font-medium">
                Not confirmed
              </span>
            )}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* My Produce Listings */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Produce Listings</h2>
          <a href="/dashboard/farmer/farm" className="text-sm text-[#0D631B] font-medium hover:underline">
            View All
          </a>
        </div>
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" variants={staggerContainer}>
          {loadingData ? (
            <div className="sm:col-span-2 lg:col-span-2 flex items-center justify-center h-32 text-gray-400 text-sm">
              <i className="ri-loader-4-line animate-spin mr-2" /> Loading listings...
            </div>
          ) : activeListings.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-2 flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
              <i className="ri-box-3-line text-2xl mb-1" />
              <p className="text-sm">No active listings</p>
              <a href="/dashboard/farmer/farm" className="text-[#0D631B] text-xs font-semibold mt-1 hover:underline">
                + Create your first listing
              </a>
            </div>
          ) : (
            activeListings.slice(0, 2).map((item) => {
              const style = CATEGORY_STYLE[item.category] ?? CATEGORY_STYLE["Other"];
              return (
                <motion.div
                  key={item.listing_id}
                  variants={scaleIn}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="bg-white rounded-2xl overflow-hidden border border-[#BFCABA]"
                >
                  <div className="relative h-44">
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-[#0D631B] text-white text-xs px-2 py-0.5 rounded-full">
                      <i className="ri-checkbox-circle-fill text-xs" /> ACTIVE
                    </div>
                    {item.images?.length ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.images[0]} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${style.bg} flex items-center justify-center`}>
                        <i className={`${style.icon} text-4xl`} />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 text-sm">{item.product_name}</p>
                      <p className="text-[#0D631B] text-sm font-semibold">
                        ₦{(item.price_per_unit / 100).toLocaleString("en-NG")}/{item.unit}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <i className="ri-inbox-archive-line" /> {parseFloat(item.quantity)} {item.unit} remaining
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}

          {/* Logistics promo card — always shown */}
          <motion.div
            variants={scaleIn}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="rounded-2xl overflow-hidden relative bg-[#1a3a5c] min-h-[220px] sm:col-span-2 lg:col-span-1"
          >
            <img src="/truck.jpg" alt="truck" className="absolute inset-0 w-full h-full object-cover mix-blend-multiply" />
            <div className="absolute inset-0 flex flex-col justify-end p-5">
              <i className="ri-truck-line text-3xl text-blue-200 mb-3" />
              <p className="text-white font-bold text-lg leading-snug">Need Logistics?</p>
              <p className="text-blue-200 text-sm mt-1">Book a truck for your next harvest delivery.</p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Recent Order Activity */}
      <motion.div variants={fadeIn} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Order Activity</h2>
          <a href="/dashboard/farmer/orders" className="text-sm text-[#0D631B] font-medium hover:underline">
            View All
          </a>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
            <i className="ri-loader-4-line animate-spin mr-2" /> Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-gray-400 text-sm">
            <i className="ri-inbox-line text-xl mb-1" />
            No orders yet — your first sale will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-gray-400 text-xs">
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Order ID</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Buyer</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Produce</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Escrow Status</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.slice(0, 5).map((o, i) => {
                  const st = ORDER_STATUS[o.status];
                  return (
                    <motion.tr
                      key={o.order_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.07 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 md:px-6 py-4 font-medium text-[#0D631B] text-xs">
                        #{o.order_id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-700">{o.buyer.name}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-600">
                        {o.listing.product_name} ({parseFloat(o.quantity)} {o.listing.unit})
                      </td>
                      <td className="px-4 md:px-6 py-4 font-semibold text-gray-900">
                        ₦{(o.total_amount / 100).toLocaleString("en-NG")}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className="flex items-center gap-2 text-gray-600 text-xs">
                          <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <a
                          href="/dashboard/farmer/orders"
                          className="text-[#0D631B] font-medium hover:underline text-xs"
                        >
                          Details
                        </a>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
