"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { ordersApi, formatNaira, type BuyerOrder } from "@/lib/api";

const STATUS_CONFIG: Record<
  BuyerOrder["status"],
  { label: string; style: string; icon: string }
> = {
  pending_payment:   { label: "Awaiting Payment",   style: "bg-red-100 text-red-700",       icon: "ri-time-line" },
  payment_confirmed: { label: "Payment Confirmed",  style: "bg-blue-100 text-blue-700",     icon: "ri-secure-payment-line" },
  processing:        { label: "Secured in Escrow",  style: "bg-indigo-100 text-indigo-700", icon: "ri-lock-line" },
  ready_for_pickup:  { label: "Ready for Pickup",   style: "bg-purple-100 text-purple-700", icon: "ri-store-2-line" },
  completed:         { label: "Delivered",          style: "bg-green-100 text-green-700",   icon: "ri-checkbox-circle-line" },
  cancelled:         { label: "Cancelled",          style: "bg-gray-100 text-gray-500",     icon: "ri-close-circle-line" },
  disputed:          { label: "Disputed",           style: "bg-orange-100 text-orange-700", icon: "ri-alert-line" },
};

function relativeDate(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

type Tab = "all" | "active" | "completed";

type ModalAction = "cancel" | "refund" | "dispute";

interface ConfirmModal {
  orderId: string;
  action: ModalAction;
  title: string;
  description: string;
}

const MODAL_CFG: Record<ModalAction, { title: string; description: string; btnLabel: string; btnStyle: string }> = {
  cancel:  { title: "Cancel Order",        description: "This will cancel your order. If payment was made, a refund process will be initiated.",                              btnLabel: "Confirm Cancel",  btnStyle: "bg-red-500 hover:bg-red-600" },
  refund:  { title: "Request Refund",      description: "Submit a refund request for this order. The farmer will be notified and admin may review if there is a disagreement.", btnLabel: "Request Refund",  btnStyle: "bg-amber-500 hover:bg-amber-600" },
  dispute: { title: "Raise Dispute",       description: "Raising a dispute will freeze the escrow and escalate to admin review. Provide as much detail as possible.",          btnLabel: "Raise Dispute",   btnStyle: "bg-orange-500 hover:bg-orange-600" },
};

// "active" = all states where the order is in-flight for the buyer
function isActive(s: BuyerOrder["status"]) {
  return s === "pending_payment" || s === "payment_confirmed" || s === "processing" || s === "ready_for_pickup";
}

function BuyerOrdersInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [modal, setModal] = useState<ConfirmModal | null>(null);
  const [modalReason, setModalReason] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4500);
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersApi.getMyBuyerOrders();
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Handle Nomba payment callback: ?payment=success&ref=ZP-XXXX&orderId=...
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      const ref = searchParams.get("ref") ?? "";
      showToast(`Payment successful${ref ? ` for order #${ref}` : ""}! Please confirm delivery once you receive your item.`);
      // Refetch so the order status updates from pending_payment → payment_confirmed
      fetchOrders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePayNow(orderId: string, checkoutLink?: string | null) {
    if (checkoutLink) {
      // Redirect in same tab so the payment callback lands correctly
      window.location.href = checkoutLink;
      return;
    }
    // Dev-only: simulate payment when there is no real checkout link
    setPayingId(orderId);
    try {
      await ordersApi.simulatePayment(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.order_id === orderId ? { ...o, status: "payment_confirmed" } : o)),
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Payment failed.", false);
    } finally {
      setPayingId(null);
    }
  }

  async function handleConfirmDelivery(orderId: string) {
    setConfirmingId(orderId);
    try {
      await ordersApi.confirmDelivery(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.order_id === orderId ? { ...o, status: "completed" } : o)),
      );
      showToast("Delivery confirmed. Funds have been released to the farmer.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to confirm delivery.", false);
    } finally {
      setConfirmingId(null);
    }
  }

  function openModal(orderId: string, action: ModalAction) {
    setModalReason("");
    const cfg = MODAL_CFG[action];
    setModal({ orderId, action, title: cfg.title, description: cfg.description });
  }

  async function handleModalConfirm() {
    if (!modal) return;
    const { orderId, action } = modal;
    setActionId(orderId);
    setModal(null);
    try {
      if (action === "cancel") {
        await ordersApi.cancelOrder(orderId, modalReason || undefined);
        setOrders((prev) =>
          prev.map((o) => (o.order_id === orderId ? { ...o, status: "cancelled" } : o)),
        );
        showToast("Order cancelled.");
      } else if (action === "refund") {
        await ordersApi.requestRefund(orderId, modalReason || undefined);
        setOrders((prev) =>
          prev.map((o) => (o.order_id === orderId ? { ...o, status: "cancelled" as BuyerOrder["status"] } : o)),
        );
        showToast("Refund requested. You will be notified once processed.");
      } else {
        await ordersApi.disputeOrder(orderId, modalReason || undefined);
        setOrders((prev) =>
          prev.map((o) => (o.order_id === orderId ? { ...o, status: "disputed" } : o)),
        );
        showToast("Dispute raised. Escrow funds are frozen pending admin review.");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.", false);
    } finally {
      setActionId(null);
    }
  }

  const filtered = orders.filter((o) => {
    const matchTab =
      tab === "all"       ? true :
      tab === "active"    ? isActive(o.status) :
      o.status === "completed";
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.listing.product_name.toLowerCase().includes(q) ||
      o.farmer.name.toLowerCase().includes(q) ||
      o.order_id.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const counts = {
    all:       orders.length,
    active:    orders.filter((o) => isActive(o.status)).length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  // total_amount is in kobo from the backend
  const totalSpent = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + o.total_amount / 100, 0);

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
              toast.ok ? "bg-[#0D631B] text-white" : "bg-red-500 text-white"
            }`}
          >
            <i className={toast.ok ? "ri-checkbox-circle-line" : "ri-error-warning-line"} />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={fadeUp} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-1">Track and manage your produce purchases.</p>
        </div>
        <Link
          href="/dashboard/buyer/marketplace"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors flex-shrink-0"
        >
          <i className="ri-add-line" /> New Order
        </Link>
      </motion.div>

      {/* Summary */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: loading ? "—" : orders.length,          bg: "bg-white",    text: "text-gray-900" },
          { label: "Active",       value: loading ? "—" : counts.active,           bg: "bg-blue-50",  text: "text-blue-700" },
          { label: "Delivered",    value: loading ? "—" : counts.completed,        bg: "bg-green-50", text: "text-[#0D631B]" },
          { label: "Total Spent",  value: loading ? "—" : formatNaira(totalSpent * 100), bg: "bg-amber-50", text: "text-amber-700" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-gray-100`}>
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Filters + Search */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "completed"] as Tab[]).map((t) => (
            <motion.button
              key={t}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 capitalize
                ${tab === t ? "bg-[#0D631B] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
                {loading ? "—" : counts[t]}
              </span>
            </motion.button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm w-full focus:outline-none focus:border-[#0D631B]"
          />
        </div>
      </motion.div>

      {/* Orders list */}
      <motion.div variants={fadeUp} className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
            <i className="ri-loader-4-line animate-spin text-xl mr-2" /> Loading orders...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-gray-100 text-gray-400">
            <i className="ri-inbox-line text-3xl mb-2" />
            <p className="text-sm font-medium">
              {orders.length === 0 ? "No orders yet" : "No orders match your filter"}
            </p>
            {orders.length === 0 && (
              <Link
                href="/dashboard/buyer/marketplace"
                className="mt-3 text-[#0D631B] text-sm font-semibold hover:underline"
              >
                Browse Marketplace
              </Link>
            )}
          </div>
        ) : (
          filtered.map((o, i) => {
            const st = STATUS_CONFIG[o.status];
            const isBusy = confirmingId === o.order_id || payingId === o.order_id || actionId === o.order_id;

            // Buyer actions per state
            const canPay      = o.status === "pending_payment";
            const canConfirm  = o.status === "processing" || o.status === "ready_for_pickup";
            const canCancel   = o.status === "pending_payment";
            const canRefund   = o.status === "payment_confirmed" || o.status === "processing";
            const canDispute  = o.status === "processing" || o.status === "ready_for_pickup";

            return (
              <motion.div
                key={o.order_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <i className="ri-box-3-line text-stone-500 text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-900">{o.listing.product_name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {parseFloat(o.quantity)} {o.listing.unit} · from {o.farmer.farmName ?? o.farmer.name}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-[#0D631B]">
                          ₦{(o.total_amount / 100).toLocaleString("en-NG")}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">{relativeDate(o.created_at)}</p>
                      </div>
                    </div>

                    {/* Status + meta row */}
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.style}`}>
                        <i className={st.icon} /> {st.label}
                      </span>
                      <span className="text-gray-400 text-xs capitalize">
                        <i className="ri-truck-line mr-1" />{o.delivery_method}
                      </span>
                      <span className="text-gray-400 text-xs font-mono">
                        #{o.order_id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>

                    {/* Action buttons */}
                    {(canPay || canConfirm || canCancel || canRefund || canDispute) && (
                      <div className="flex items-center gap-2 flex-wrap mt-3">
                        {canPay && (
                          <motion.button
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                            onClick={() => handlePayNow(o.order_id, o.checkout_link)}
                            disabled={isBusy}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60"
                          >
                            {payingId === o.order_id
                              ? <><i className="ri-loader-4-line animate-spin" /> Processing...</>
                              : <><i className="ri-secure-payment-line" /> Pay Now</>
                            }
                          </motion.button>
                        )}
                        {canConfirm && (
                          <motion.button
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                            onClick={() => handleConfirmDelivery(o.order_id)}
                            disabled={isBusy}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0D631B] text-white text-xs font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-60"
                          >
                            {confirmingId === o.order_id
                              ? <><i className="ri-loader-4-line animate-spin" /> Confirming...</>
                              : <><i className="ri-checkbox-circle-line" /> Confirm Delivery</>
                            }
                          </motion.button>
                        )}
                        {canCancel && (
                          <motion.button
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                            onClick={() => openModal(o.order_id, "cancel")}
                            disabled={isBusy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-60"
                          >
                            <i className="ri-close-circle-line" /> Cancel
                          </motion.button>
                        )}
                        {canRefund && (
                          <motion.button
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                            onClick={() => openModal(o.order_id, "refund")}
                            disabled={isBusy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-600 text-xs font-semibold hover:bg-amber-50 transition-colors disabled:opacity-60"
                          >
                            <i className="ri-refund-2-line" /> Request Refund
                          </motion.button>
                        )}
                        {canDispute && (
                          <motion.button
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                            onClick={() => openModal(o.order_id, "dispute")}
                            disabled={isBusy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 text-orange-600 text-xs font-semibold hover:bg-orange-50 transition-colors disabled:opacity-60"
                          >
                            <i className="ri-alert-line" /> Dispute
                          </motion.button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Confirm modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={(e) => e.target === e.currentTarget && setModal(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <h3 className="font-bold text-gray-900 text-lg mb-1">{modal.title}</h3>
              <p className="text-gray-500 text-sm mb-4">{modal.description}</p>
              <textarea
                rows={3}
                placeholder="Reason (optional)..."
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0D631B] resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
                >
                  Go Back
                </button>
                <button
                  onClick={handleModalConfirm}
                  className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${MODAL_CFG[modal.action].btnStyle}`}
                >
                  {MODAL_CFG[modal.action].btnLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function BuyerOrders() {
  return (
    <Suspense>
      <BuyerOrdersInner />
    </Suspense>
  );
}
