"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCart, type CartItem } from "@/context/CartContext";
import { ordersApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatNaira } from "@/lib/api";

// Group cart items by farmer
function groupByFarmer(items: CartItem[]) {
  const groups: Record<string, { farmer_name: string; farm_name: string | null; location_state: string; items: CartItem[] }> = {};
  for (const item of items) {
    if (!groups[item.farmer_id]) {
      groups[item.farmer_id] = {
        farmer_name: item.farmer_name,
        farm_name: item.farm_name,
        location_state: item.location_state,
        items: [],
      };
    }
    groups[item.farmer_id].items.push(item);
  }
  return Object.entries(groups);
}

export default function FarmerCartPage() {
  const router = useRouter();
  const { items, updateQty, removeItem, clearCart, totalPrice } = useCart();
  const { wallet } = useAuth();
  const [deliveryMethod, setDeliveryMethod] = useState<Record<string, "pickup" | "delivery">>({});
  const [deliveryAddress, setDeliveryAddress] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "checkout">("checkout");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrderIds, setPendingOrderIds] = useState<string[]>([]);

  const groups = groupByFarmer(items);
  // wallet balance is in kobo, totalPrice is in naira
  const hasSufficientBalance = wallet && parseInt(wallet.available_balance, 10) >= totalPrice * 100;

  function getMethod(farmerId: string): "pickup" | "delivery" {
    return deliveryMethod[farmerId] ?? "pickup";
  }

  async function handlePlaceOrders() {
    setError(null);
    setPendingOrderIds([]);

    for (const [farmerId] of groups) {
      if (getMethod(farmerId) === "delivery" && !deliveryAddress[farmerId]?.trim()) {
        setError("Please enter a delivery address for all shipments that require delivery.");
        return;
      }
    }

    if (paymentMethod === "wallet" && !hasSufficientBalance) {
      setError("Insufficient wallet balance. Please fund your wallet or use card/bank transfer.");
      return;
    }

    setPlacing(true);
    try {
      let firstCheckoutLink: string | null = null;
      const createdIds: string[] = [];

      for (const item of items) {
        const farmerId = item.farmer_id;
        const method = getMethod(farmerId);
        const createdOrder = await ordersApi.createOrder({
          listing_id: item.listing_id,
          quantity: item.quantity,
          delivery_method: method,
          delivery_address: method === "delivery" ? deliveryAddress[farmerId] ?? null : null,
          payment_method: paymentMethod,
        });
        createdIds.push(createdOrder.order_id);
        if (!firstCheckoutLink && createdOrder.checkout_link) {
          firstCheckoutLink = createdOrder.checkout_link;
        }
      }

      clearCart();

      if (paymentMethod === "wallet") {
        router.push("/dashboard/farmer/orders");
        return;
      }

      if (firstCheckoutLink) {
        window.location.href = firstCheckoutLink;
      } else {
        setPendingOrderIds(createdIds);
        setError(
          "Your orders were placed but the payment link could not be generated. You can retry payment from your orders page."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place orders. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0 && pendingOrderIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <i className="ri-shopping-cart-line text-3xl text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-400 text-sm mb-6">Browse the farmer marketplace and add produce to your cart.</p>
        <Link
          href="/dashboard/farmer/marketplace"
          className="px-6 py-3 rounded-xl bg-[#0D631B] text-white font-semibold hover:bg-[#0a4f15] transition-colors"
        >
          Browse Marketplace
        </Link>
      </div>
    );
  }

  if (pendingOrderIds.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <i className="ri-error-warning-line text-2xl text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Orders placed — payment link missing</h2>
        <p className="text-gray-500 text-sm">
          Your orders were successfully created but the payment checkout link could not be generated.
          Head to your orders page to retry payment or use a different method.
        </p>
        <div className="flex gap-3 w-full">
          <Link
            href="/dashboard/farmer/orders"
            className="flex-1 py-3 rounded-xl bg-[#0D631B] text-white font-semibold text-sm text-center hover:bg-[#0a4f15] transition-colors"
          >
            Go to My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Your Cart</h1>
          <p className="text-gray-500 mt-1">{items.length} item{items.length !== 1 ? "s" : ""} from {groups.length} farmer{groups.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 hover:underline flex items-center gap-1"
        >
          <i className="ri-delete-bin-line" /> Clear Cart
        </button>
      </div>

      {/* Side-by-side layout on large screens */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Left: Shipment groups */}
        <div className="flex-1 min-w-0 space-y-4">
          {groups.map(([farmerId, group]) => {
            const method = getMethod(farmerId);
            const groupTotal = group.items.reduce(
              (s, i) => s + i.price_per_unit * i.quantity,
              0,
            );
            const hasDelivery = group.items.some((i) =>
              i.delivery_options.includes("delivery"),
            );

            return (
              <motion.div
                key={farmerId}
                layout
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                {/* Farmer header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <i className="ri-store-2-line text-[#0D631B]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {group.farm_name ?? group.farmer_name}
                    </p>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <i className="ri-map-pin-line" /> {group.location_state}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {group.items.map((item) => (
                      <motion.div
                        key={item.listing_id}
                        layout
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-4 px-5 py-4"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <i className="ri-box-3-line text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{item.product_name}</p>
                          <p className="text-gray-400 text-xs">
                            ₦{item.price_per_unit.toLocaleString("en-NG")} / {item.unit}
                          </p>
                        </div>
                        {/* Qty control */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => updateQty(item.listing_id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                          >
                            <i className="ri-subtract-line text-xs" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.listing_id, item.quantity + 1)}
                            disabled={item.quantity >= item.max_quantity}
                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                          >
                            <i className="ri-add-line text-xs" />
                          </button>
                        </div>
                        <p className="text-gray-900 font-semibold text-sm w-24 text-right flex-shrink-0">
                          ₦{(item.price_per_unit * item.quantity).toLocaleString("en-NG")}
                        </p>
                        <button
                          onClick={() => removeItem(item.listing_id)}
                          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <i className="ri-close-line" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Delivery options */}
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-600 font-medium">Delivery method:</p>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name={`method-${farmerId}`}
                          value="pickup"
                          checked={method === "pickup"}
                          onChange={() =>
                            setDeliveryMethod((p) => ({ ...p, [farmerId]: "pickup" }))
                          }
                          className="accent-[#0D631B]"
                        />
                        Pickup
                      </label>
                      {hasDelivery && (
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name={`method-${farmerId}`}
                            value="delivery"
                            checked={method === "delivery"}
                            onChange={() =>
                              setDeliveryMethod((p) => ({ ...p, [farmerId]: "delivery" }))
                            }
                            className="accent-[#0D631B]"
                          />
                          Delivery
                        </label>
                      )}
                    </div>
                  </div>
                  {method === "delivery" && (
                    <input
                      type="text"
                      placeholder="Enter delivery address..."
                      value={deliveryAddress[farmerId] ?? ""}
                      onChange={(e) =>
                        setDeliveryAddress((p) => ({ ...p, [farmerId]: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#0D631B]"
                    />
                  )}
                  <div className="flex justify-end">
                    <p className="text-sm text-gray-500">
                      Subtotal:{" "}
                      <span className="font-bold text-gray-900">
                        ₦{groupTotal.toLocaleString("en-NG")}
                      </span>
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right: Order Summary — sticky on large screens */}
        <div className="w-full xl:w-80 xl:sticky xl:top-6 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="font-semibold text-gray-900">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({items.length} item{items.length !== 1 ? "s" : ""})</span>
                <span>₦{totalPrice.toLocaleString("en-NG")}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-xs">
                <span>Payment processing</span>
                <span>Held securely in escrow</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span>
                <span className="text-[#0D631B]">₦{totalPrice.toLocaleString("en-NG")}</span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Payment Method</h4>
              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  paymentMethod === "checkout"
                    ? "border-[#0D631B] bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="checkout"
                    checked={paymentMethod === "checkout"}
                    onChange={() => setPaymentMethod("checkout")}
                    className="accent-[#0D631B]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <i className="ri-bank-card-line text-gray-600" />
                      <span className="font-medium text-gray-900">Card / Bank Transfer</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Pay securely via Nomba checkout — card, bank transfer, or USSD</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  paymentMethod === "wallet"
                    ? "border-[#0D631B] bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                } ${!hasSufficientBalance ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="wallet"
                    checked={paymentMethod === "wallet"}
                    onChange={() => hasSufficientBalance && setPaymentMethod("wallet")}
                    disabled={!hasSufficientBalance}
                    className="accent-[#0D631B]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <i className="ri-wallet-3-line text-gray-600" />
                      <span className="font-medium text-gray-900">Wallet Balance</span>
                      {!hasSufficientBalance && (
                        <span className="text-xs text-red-500 font-medium">(Insufficient)</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Available: {wallet ? formatNaira(wallet.available_balance) : "₦0.00"}
                      {hasSufficientBalance && " — Sufficient for this order"}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-blue-700">
              <i className="ri-shield-check-line mt-0.5 flex-shrink-0" />
              <span>
                All payments are held in escrow and only released to the farmer after you confirm delivery. Your money is protected.
              </span>
            </div>

            {error && (
              <div className="text-red-700 text-sm bg-red-50 rounded-xl px-4 py-3 flex items-start gap-2">
                <i className="ri-error-warning-line mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePlaceOrders}
              disabled={placing}
              className="w-full py-3.5 rounded-xl bg-[#0D631B] text-white font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {placing ? (
                <><i className="ri-loader-4-line animate-spin" /> Placing Orders...</>
              ) : (
                <><i className="ri-secure-payment-line" /> Place Orders — ₦{totalPrice.toLocaleString("en-NG")}</>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
