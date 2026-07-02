"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion";
import { useAuth } from "@/context/AuthContext";
import {
  ordersApi,
  walletApi,
  usersApi,
  formatNaira,
  koboToNaira,
  type BuyerOrder,
  type Transaction,
} from "@/lib/api";

const TX_ICON: Record<string, string> = {
  credit: "ri-arrow-down-circle-line text-green-500",
  debit:  "ri-arrow-up-circle-line text-red-400",
};

function relativeDate(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

const ORDER_STATUS: Record<BuyerOrder["status"], { label: string; badge: string }> = {
  pending_payment:   { label: "Awaiting Payment",  badge: "bg-red-100 text-red-700" },
  payment_confirmed: { label: "Payment Confirmed", badge: "bg-blue-100 text-blue-700" },
  processing:        { label: "In Escrow",         badge: "bg-blue-100 text-blue-700" },
  ready_for_pickup:  { label: "Ready for Pickup",  badge: "bg-purple-100 text-purple-700" },
  completed:         { label: "Delivered",         badge: "bg-green-100 text-green-700" },
  cancelled:         { label: "Cancelled",         badge: "bg-gray-100 text-gray-500" },
  disputed:          { label: "Disputed",          badge: "bg-orange-100 text-orange-700" },
};

export default function BuyerProfile() {
  const { user, wallet } = useAuth();
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [o, t] = await Promise.all([
        ordersApi.getMyBuyerOrders(),
        walletApi.getTransactions(),
      ]);
      setOrders(o);
      setTransactions(t);
    } catch {
      // empty states will handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const displayName   = user?.name ?? "Buyer";
  const initials      = displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const email         = user?.email ?? "—";
  const phone         = user?.phoneNumber ?? "Not provided";
  const location      = [user?.location_state, "Nigeria"].filter(Boolean).join(", ");
  const memberSince   = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-NG", { month: "long", year: "numeric" })
    : "—";

  const completedOrders = orders.filter((o) => o.status === "completed");
  const activeOrders    = orders.filter((o) => ["processing", "pending_payment"].includes(o.status));
  const disputedOrders  = orders.filter((o) => o.status === "disputed");
  const totalSpent      = completedOrders.reduce((s, o) => s + o.total_amount, 0);
  const availableBalance = wallet?.available_balance ? formatNaira(wallet.available_balance) : "₦0.00";

  return (
    <motion.div className="space-y-5" variants={staggerContainer} initial="hidden" animate="show">

      {/* Profile card */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 260 }}
            className="relative flex-shrink-0"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-[#0D631B] flex items-center justify-center border-4 border-[#0D631B] overflow-hidden">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <span className="text-2xl font-bold text-white">{initials}</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white">
              <i className="ri-checkbox-circle-fill text-white text-xs" />
            </div>
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-[#0D631B] text-xs font-semibold">
                <i className="ri-checkbox-circle-line" /> Verified Buyer
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-1">{location} · Member since {memberSince}</p>
            <div className="flex gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <i className="ri-mail-line text-gray-400" /> {email}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="ri-phone-line text-gray-400" /> {phone}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-4" variants={staggerContainer}>
        {[
          {
            label: "Total Orders",
            value: loading ? "—" : orders.length,
            icon: "ri-shopping-bag-line",
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
            accent: "border-l-4 border-blue-400",
          },
          {
            label: "Total Spent",
            value: loading ? "—" : `₦${totalSpent.toLocaleString("en-NG")}`,
            icon: "ri-money-dollar-circle-line",
            iconBg: "bg-green-100",
            iconColor: "text-[#0D631B]",
            accent: "border-l-4 border-[#0D631B]",
          },
          {
            label: "Active Orders",
            value: loading ? "—" : activeOrders.length,
            icon: "ri-lock-line",
            iconBg: "bg-amber-100",
            iconColor: "text-amber-600",
            accent: "border-l-4 border-amber-400",
          },
          {
            label: "Disputes",
            value: loading ? "—" : disputedOrders.length,
            icon: "ri-alert-line",
            iconBg: "bg-red-100",
            iconColor: "text-red-500",
            accent: "border-l-4 border-red-400",
          },
        ].map((s) => (
          <motion.div
            key={s.label}
            variants={scaleIn}
            whileHover={{ scale: 1.02 }}
            className={`bg-white rounded-2xl p-4 border border-gray-100 ${s.accent}`}
          >
            <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center mb-3`}>
              <i className={`${s.icon} ${s.iconColor}`} />
            </div>
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Orders */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Recent Orders</h2>
            <Link href="/dashboard/buyer/orders" className="text-sm text-[#0D631B] font-medium hover:underline flex items-center gap-1">
              View All <i className="ri-arrow-right-s-line" />
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              <i className="ri-loader-4-line animate-spin mr-2" /> Loading...
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
              <i className="ri-inbox-line text-2xl mb-1" />
              No orders yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orders.slice(0, 5).map((o, i) => {
                const st = ORDER_STATUS[o.status];
                return (
                  <motion.div
                    key={o.order_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.06 }}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <i className="ri-box-3-line text-stone-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{o.listing.product_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{relativeDate(o.created_at)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#0D631B]">₦{o.total_amount.toLocaleString("en-NG")}</p>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${st.badge}`}>
                        {st.label}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Wallet & Transactions */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Wallet</h2>
            <Link href="/dashboard/buyer/wallet" className="text-sm text-[#0D631B] font-medium hover:underline flex items-center gap-1">
              Manage <i className="ri-arrow-right-s-line" />
            </Link>
          </div>

          {/* Balance pill */}
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-bank-line text-[#0D631B]" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Available Balance</p>
              <p className="text-lg font-bold text-gray-900">{availableBalance}</p>
            </div>
          </div>

          {/* Transactions */}
          {loading ? (
            <div className="flex items-center justify-center h-28 text-gray-400 text-sm">
              <i className="ri-loader-4-line animate-spin mr-2" /> Loading...
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 text-gray-400 text-sm">
              <i className="ri-exchange-line text-2xl mb-1" />
              No transactions yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {transactions.slice(0, 4).map((t, i) => {
                const isCredit = t.type === "credit";
                const amount = koboToNaira(parseInt(t.amount, 10));
                return (
                  <motion.div
                    key={t.transaction_id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.06 }}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <i className={`${TX_ICON[t.type]} text-xl flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {t.description ?? (isCredit ? "Wallet Top-Up" : "Payment")}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{relativeDate(t.created_at)}</p>
                    </div>
                    <p className={`text-sm font-bold flex-shrink-0 ${isCredit ? "text-green-600" : "text-red-500"}`}>
                      {isCredit ? "+" : "-"}₦{amount.toLocaleString("en-NG")}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Account Details */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Account Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[
            { label: "Full Name",       value: displayName,                        icon: "ri-user-line" },
            { label: "Email",           value: email,                              icon: "ri-mail-line" },
            { label: "Phone",           value: phone,                              icon: "ri-phone-line" },
            { label: "Location",        value: location,                           icon: "ri-map-pin-line" },
            { label: "Email Verified",  value: user?.emailVerified ? "Yes" : "No", icon: "ri-checkbox-circle-line" },
            { label: "Member Since",    value: memberSince,                        icon: "ri-calendar-line" },
          ].map((row) => (
            <div key={row.label} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
              <i className={`${row.icon} text-gray-400 mt-0.5 flex-shrink-0`} />
              <div className="min-w-0">
                <p className="text-xs text-gray-400">{row.label}</p>
                <p className="text-gray-900 font-medium truncate mt-0.5">{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Change Password */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <i className="ri-shield-keyhole-line text-[#0D631B]" /> Change Password
        </h2>
        <div className="space-y-3 max-w-sm">
          {[
            { label: "Current Password", value: currentPw, set: setCurrentPw },
            { label: "New Password",     value: newPw,     set: setNewPw },
            { label: "Confirm Password", value: confirmPw, set: setConfirmPw },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input
                type={showPw ? "text" : "password"}
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowPw((p) => !p)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <i className={showPw ? "ri-eye-off-line" : "ri-eye-line"} />
            {showPw ? "Hide" : "Show"} passwords
          </button>

          {pwError && (
            <p className="text-red-500 text-xs p-2.5 bg-red-50 rounded-xl">{pwError}</p>
          )}
          {pwSuccess && (
            <p className="text-green-600 text-xs p-2.5 bg-green-50 rounded-xl flex items-center gap-1">
              <i className="ri-checkbox-circle-line" /> Password changed successfully.
            </p>
          )}

          <button
            onClick={async () => {
              setPwError("");
              setPwSuccess(false);
              if (!currentPw || !newPw || !confirmPw) { setPwError("Please fill in all fields."); return; }
              if (newPw.length < 8) { setPwError("New password must be at least 8 characters."); return; }
              if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
              setPwLoading(true);
              try {
                await usersApi.changePassword(currentPw, newPw);
                setPwSuccess(true);
                setCurrentPw(""); setNewPw(""); setConfirmPw("");
              } catch (err) {
                setPwError(err instanceof Error ? err.message : "Failed to change password.");
              } finally {
                setPwLoading(false);
              }
            }}
            disabled={pwLoading}
            className="w-full py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {pwLoading
              ? <><i className="ri-loader-4-line animate-spin" /> Updating…</>
              : "Update Password"
            }
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
