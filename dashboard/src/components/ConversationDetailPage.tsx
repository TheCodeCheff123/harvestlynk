"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/context/AuthContext";
import { chatApi, formatNaira, type ChatMessage } from "@/lib/api";

// ─── Offer countdown component ────────────────────────────────────────────────

function OfferCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now());

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining(new Date(expiresAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, remaining]);

  if (remaining <= 0) {
    return <span className="text-red-500 font-semibold text-xs">Expired</span>;
  }

  const totalSecs = Math.floor(remaining / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hrs > 0) return <span className="text-amber-600 font-semibold text-xs">⏱ {hrs}h {mins}m remaining</span>;
  return <span className="text-red-500 font-semibold text-xs">⏱ {mins}m {secs}s remaining</span>;
}

// ─── Offer bubble ─────────────────────────────────────────────────────────────

interface OfferBubbleProps {
  msg: ChatMessage;
  isOwnMessage: boolean;
  onAccept: (msg: ChatMessage) => void;
}

function OfferBubble({ msg, isOwnMessage, onAccept }: OfferBubbleProps) {
  const expired = msg.offer_expires_at ? new Date(msg.offer_expires_at) < new Date() : true;
  const priceNaira = msg.offer_price_kobo ? msg.offer_price_kobo / 100 : 0;
  const total = priceNaira * (msg.offer_quantity ?? 1);

  return (
    <div className={`max-w-xs w-full rounded-2xl border-2 p-4 space-y-2 ${expired ? "border-gray-200 bg-gray-50" : "border-[#0D631B] bg-green-50"}`}>
      <div className="flex items-center gap-2">
        <i className="ri-price-tag-3-line text-[#0D631B]" />
        <span className="font-bold text-gray-900 text-sm">Private Offer</span>
      </div>
      <p className="text-gray-700 text-sm">
        {msg.offer_quantity} {msg.offer_unit} of {msg.content}
      </p>
      <p className="text-[#0D631B] font-bold text-base">
        ₦{priceNaira.toLocaleString("en-NG")} <span className="text-gray-400 font-normal text-xs">per {msg.offer_unit}</span>
      </p>
      <p className="text-gray-500 text-xs">
        Total: <span className="font-semibold text-gray-900">₦{total.toLocaleString("en-NG")}</span>
      </p>
      {msg.offer_expires_at && (
        <OfferCountdown expiresAt={msg.offer_expires_at} />
      )}
      {!isOwnMessage && !expired && (
        <button
          onClick={() => onAccept(msg)}
          className="w-full py-2 rounded-xl bg-[#0D631B] text-white text-sm font-semibold hover:bg-[#0a4f15] transition-colors mt-1"
        >
          Accept & Buy
        </button>
      )}
      {!isOwnMessage && expired && (
        <p className="text-xs text-red-400 font-medium">This offer has expired</p>
      )}
    </div>
  );
}

// ─── Accept & Buy modal ───────────────────────────────────────────────────────

interface AcceptModalProps {
  msg: ChatMessage;
  conversationId: string;
  walletBalance: number; // kobo
  onClose: () => void;
  onSuccess: (orderId: string, checkoutLink: string | null) => void;
}

function AcceptModal({ msg, conversationId, walletBalance, onClose, onSuccess }: AcceptModalProps) {
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "checkout">("checkout");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceNaira = (msg.offer_price_kobo ?? 0) / 100;
  const total = priceNaira * (msg.offer_quantity ?? 1);
  const totalKobo = Math.round(total * 100);
  const hasSufficientBalance = walletBalance >= totalKobo;

  async function handleConfirm() {
    if (deliveryMethod === "delivery" && !deliveryAddress.trim()) {
      setError("Please enter a delivery address.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await chatApi.buyViaChat(conversationId, {
        message_id: msg.message_id,
        delivery_method: deliveryMethod,
        delivery_address: deliveryMethod === "delivery" ? deliveryAddress : undefined,
        payment_method: paymentMethod,
      });
      onSuccess(result.order_id, result.checkout_link);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to place order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg">Confirm Purchase</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        {/* Order summary */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>{msg.offer_quantity} {msg.offer_unit}</span>
            <span>₦{priceNaira.toLocaleString("en-NG")} / {msg.offer_unit}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
            <span>Total</span>
            <span className="text-[#0D631B]">₦{total.toLocaleString("en-NG")}</span>
          </div>
        </div>

        {/* Delivery method */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Delivery Method</p>
          <div className="flex gap-3">
            {(["pickup", "delivery"] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5 text-sm cursor-pointer capitalize">
                <input type="radio" value={m} checked={deliveryMethod === m} onChange={() => setDeliveryMethod(m)} className="accent-[#0D631B]" />
                {m}
              </label>
            ))}
          </div>
          {deliveryMethod === "delivery" && (
            <input
              type="text"
              placeholder="Enter delivery address…"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="mt-2 w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0D631B]"
            />
          )}
        </div>

        {/* Payment method */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Payment Method</p>
          <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === "checkout" ? "border-[#0D631B] bg-green-50" : "border-gray-200"}`}>
            <input type="radio" value="checkout" checked={paymentMethod === "checkout"} onChange={() => setPaymentMethod("checkout")} className="accent-[#0D631B]" />
            <div>
              <p className="text-sm font-medium">Card / Bank Transfer</p>
              <p className="text-xs text-gray-400">Pay via Nomba secure checkout</p>
            </div>
          </label>
          <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === "wallet" ? "border-[#0D631B] bg-green-50" : "border-gray-200"} ${!hasSufficientBalance ? "opacity-50 cursor-not-allowed" : ""}`}>
            <input type="radio" value="wallet" checked={paymentMethod === "wallet"} onChange={() => hasSufficientBalance && setPaymentMethod("wallet")} disabled={!hasSufficientBalance} className="accent-[#0D631B]" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Wallet</p>
                {!hasSufficientBalance && <span className="text-xs text-red-500">(Insufficient)</span>}
              </div>
              <p className="text-xs text-gray-400">{formatNaira(walletBalance)} available</p>
            </div>
          </label>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3 flex items-start gap-2">
            <i className="ri-error-warning-line mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleConfirm}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#0D631B] text-white font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading
            ? <><i className="ri-loader-4-line animate-spin" /> Processing…</>
            : <><i className="ri-secure-payment-line" /> Confirm — ₦{total.toLocaleString("en-NG")}</>
          }
        </motion.button>
      </motion.div>
    </div>
  );
}

// ─── Send Offer panel (farmer only) ──────────────────────────────────────────

interface SendOfferPanelProps {
  onSend: (data: {
    content: string;
    type: "offer";
    offer_price_kobo: number;
    offer_quantity: number;
    offer_unit: string;
    offer_expires_hours: number;
  }) => void;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { label: "1 hour", value: 1 },
  { label: "2 hours", value: 2 },
  { label: "6 hours", value: 6 },
  { label: "12 hours", value: 12 },
  { label: "24 hours", value: 24 },
  { label: "48 hours", value: 48 },
  { label: "72 hours", value: 72 },
];

function SendOfferPanel({ onSend, onClose }: SendOfferPanelProps) {
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("Bags");
  const [expiryHours, setExpiryHours] = useState(24);
  const [error, setError] = useState("");

  const totalNaira = parseFloat(price) * parseFloat(qty) || 0;

  function handleSend() {
    if (!product.trim()) { setError("Enter a product description."); return; }
    const p = parseFloat(price);
    const q = parseFloat(qty);
    if (!p || p <= 0) { setError("Enter a valid price."); return; }
    if (!q || q <= 0) { setError("Enter a valid quantity."); return; }
    setError("");
    onSend({
      content: product.trim(),
      type: "offer",
      offer_price_kobo: Math.round(p * 100),
      offer_quantity: q,
      offer_unit: unit,
      offer_expires_hours: expiryHours,
    });
    onClose();
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="border-t border-gray-100 bg-gray-50 px-4 py-4 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <i className="ri-price-tag-3-line text-[#0D631B]" /> Send Price Offer
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <i className="ri-close-line" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Product description</label>
          <input type="text" placeholder="e.g. Premium Yellow Maize" value={product} onChange={(e) => setProduct(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0D631B]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Price per unit (₦)</label>
          <input type="number" placeholder="0.00" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0D631B]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Quantity</label>
          <input type="number" placeholder="0" min="0" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0D631B]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0D631B] bg-white">
            {["Bags", "kg", "Tonnes", "Crates", "Bunches", "Litres", "Pieces"].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Expires in</label>
          <select value={expiryHours} onChange={(e) => setExpiryHours(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0D631B] bg-white">
            {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      {totalNaira > 0 && (
        <p className="text-sm text-gray-600 mt-2">
          Total: <span className="font-bold text-[#0D631B]">₦{totalNaira.toLocaleString("en-NG")}</span>
        </p>
      )}
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      <button
        onClick={handleSend}
        className="mt-3 w-full py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-semibold hover:bg-[#0a4f15] transition-colors"
      >
        Send Offer
      </button>
    </motion.div>
  );
}

// ─── Main conversation detail page ───────────────────────────────────────────

interface Props {
  conversationId: string;
  role: "buyer" | "farmer";
}

export default function ConversationDetailPage({ conversationId, role }: Props) {
  const router = useRouter();
  const { user, wallet } = useAuth();
  const { conversation, messages, loading, sending, error, sendMessage } = useChat(conversationId);
  const [input, setInput] = useState("");
  const [showOfferPanel, setShowOfferPanel] = useState(false);
  const [acceptTarget, setAcceptTarget] = useState<ChatMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSendText() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    void sendMessage({ content: text, type: "text" });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }

  function handleAcceptSuccess(orderId: string, checkoutLink: string | null) {
    setAcceptTarget(null);
    if (checkoutLink) {
      window.location.href = checkoutLink;
    } else {
      router.push(`/dashboard/${role}/orders`);
    }
  }

  const backHref = `/dashboard/${role}/messages`;
  const walletBalance = wallet ? parseInt(wallet.available_balance, 10) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <Link href={backHref} className="text-gray-500 hover:text-gray-800 transition-colors">
          <i className="ri-arrow-left-line text-xl" />
        </Link>
        {conversation?.listing_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={conversation.listing_image} alt={conversation.listing_name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <i className="ri-store-2-line text-[#0D631B]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{conversation?.other_party_name ?? "…"}</p>
          <p className="text-xs text-gray-400 truncate">{conversation?.listing_name ?? "Loading…"}</p>
        </div>
      </div>

      {/* Retention banner — non-dismissible */}
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100 text-amber-700 text-xs flex-shrink-0">
        <i className="ri-time-line flex-shrink-0" />
        <span>Messages in this chat are automatically deleted after 3 days.</span>
      </div>

      {/* Scrollable messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <i className="ri-loader-4-line animate-spin text-[#0D631B] text-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <i className="ri-chat-3-line text-4xl text-gray-200 mb-2" />
            <p className="text-gray-400 text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            return (
              <div key={msg.message_id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                {msg.type === "offer" ? (
                  <OfferBubble
                    msg={msg}
                    isOwnMessage={isOwn}
                    onAccept={(m) => setAcceptTarget(m)}
                  />
                ) : (
                  <div className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm ${
                    isOwn
                      ? "bg-[#0D631B] text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isOwn ? "text-green-200" : "text-gray-400"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Offer panel (farmer only) */}
      <AnimatePresence>
        {showOfferPanel && role === "farmer" && (
          <SendOfferPanel
            onSend={(data) => void sendMessage(data)}
            onClose={() => setShowOfferPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Fixed input bar */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
        {role === "farmer" && (
          <button
            onClick={() => setShowOfferPanel((v) => !v)}
            className="flex-shrink-0 w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#0D631B] hover:border-[#0D631B] transition-colors"
            title="Send offer"
          >
            <i className="ri-price-tag-3-line" />
          </button>
        )}
        <textarea
          rows={1}
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0D631B] max-h-28 overflow-y-auto"
          style={{ minHeight: "2.5rem" }}
        />
        <button
          onClick={handleSendText}
          disabled={!input.trim() || sending}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#0D631B] flex items-center justify-center text-white hover:bg-[#0a4f15] transition-colors disabled:opacity-50"
        >
          {sending
            ? <i className="ri-loader-4-line animate-spin text-sm" />
            : <i className="ri-send-plane-fill text-sm" />
          }
        </button>
      </div>

      {/* Accept & Buy modal */}
      <AnimatePresence>
        {acceptTarget && (
          <AcceptModal
            msg={acceptTarget}
            conversationId={conversationId}
            walletBalance={walletBalance}
            onClose={() => setAcceptTarget(null)}
            onSuccess={handleAcceptSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
