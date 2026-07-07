"use client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { useNotifications } from "@/hooks/useNotifications";
import { type NotificationItem } from "@/lib/api";

type Tab = "All" | "Orders" | "Payments" | "System";
const TABS: Tab[] = ["All", "Orders", "Payments", "System"];

const TAB_TYPE: Record<Tab, NotificationItem["type"] | undefined> = {
  All: undefined,
  Orders: "order",
  Payments: "payment",
  System: "system",
};

const TYPE_STYLE: Record<NotificationItem["type"], { iconBg: string; iconColor: string; icon: string }> = {
  order:   { iconBg: "bg-[#0D631B]",   iconColor: "text-white",      icon: "ri-shopping-bag-3-line" },
  payment: { iconBg: "bg-amber-100",   iconColor: "text-amber-600",  icon: "ri-bank-card-line" },
  system:  { iconBg: "bg-blue-100",    iconColor: "text-blue-600",   icon: "ri-shield-check-line" },
};

function relativeDate(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const, delay: i * 0.07 },
  }),
};

import { useState, useEffect, useMemo } from "react";

export default function FarmerNotifications() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [unverified, setUnverified] = useState(false);
  const { notifications, loading, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnverified(localStorage.getItem("hl_farmer_verified") === "false");
    // Re-check on focus so the banner hides after the user completes onboarding
    function onFocus() {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnverified(localStorage.getItem("hl_farmer_verified") === "false");
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const filtered = notifications.filter((n) => {
    const tabType = TAB_TYPE[activeTab];
    return tabType === undefined || n.type === tabType;
  });

  // eslint-disable-next-line react-hooks/purity
  const cutoff = useMemo(() => Date.now() - 3 * 24 * 60 * 60 * 1000, []); // 3 days ago
  const recent = filtered.filter((n) => new Date(n.created_at).getTime() > cutoff);
  const earlier = filtered.filter((n) => new Date(n.created_at).getTime() <= cutoff);

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Stay updated on your farm&apos;s activities and transactions.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={markAllRead}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors self-start sm:self-auto whitespace-nowrap"
        >
          <i className="ri-check-double-line" /> Mark all as read
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="overflow-x-auto">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit min-w-full sm:min-w-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Verification banner */}
      {unverified && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-shield-line text-amber-600 text-lg" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">Account verification pending</p>
              <p className="text-xs text-amber-600 mt-0.5">Complete identity &amp; farm verification to unlock full marketplace access.</p>
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          <i className="ri-loader-4-line animate-spin text-2xl mr-2" /> Loading notifications...
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <i className="ri-notification-off-line text-3xl mb-2" />
          <p className="text-sm font-medium">No notifications yet</p>
        </div>
      )}

      {/* Notification list */}
      {!loading && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {recent.map((n, i) => {
              const style = TYPE_STYLE[n.type];
              return (
                <motion.div
                  key={n.notification_id}
                  custom={i} variants={cardVariants} initial="hidden" animate="show"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                  className={`bg-white rounded-2xl border p-5 cursor-pointer transition-colors ${n.is_read ? "border-gray-100" : "border-[#0D631B]/20 bg-green-50/30"}`}
                  onClick={() => !n.is_read && markRead(n.notification_id)}
                >
                  <div className="flex gap-4">
                    <div className={`w-11 h-11 rounded-full ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <i className={`${style.icon} ${style.iconColor} text-lg`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#0D631B] flex-shrink-0" />}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                          {relativeDate(n.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {earlier.length > 0 && (
            <>
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Earlier</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              {earlier.map((n, i) => {
                const style = TYPE_STYLE[n.type];
                return (
                  <motion.div
                    key={n.notification_id}
                    custom={i} variants={cardVariants} initial="hidden" animate="show"
                    className="bg-white rounded-2xl border border-gray-100 p-5"
                  >
                    <div className="flex gap-4">
                      <div className={`w-11 h-11 rounded-full ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <i className={`${style.icon} ${style.iconColor} text-lg`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                            {relativeDate(n.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
