"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion";
import { marketplaceApi, chatApi, type PublicListing } from "@/lib/api";
import { useCart } from "@/context/CartContext";

const CATEGORIES = [
  "All Produce",
  "Grains & Cereals",
  "Tubers",
  "Vegetables",
  "Fruits",
  "Livestock",
  "Legumes",
  "Spices",
];

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

/** Small "Chat with Farmer" button that creates or opens a conversation. */
function ChatButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [chatting, setChatting] = useState(false);

  async function handleChat() {
    setChatting(true);
    try {
      const conv = await chatApi.createConversation(listingId);
      router.push(`/dashboard/buyer/messages/${conv.conversation_id}`);
    } catch {
      setChatting(false);
    }
  }

  return (
    <button
      onClick={handleChat}
      disabled={chatting}
      className="mt-2 w-full py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:border-[#0D631B] hover:text-[#0D631B] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
    >
      {chatting
        ? <><i className="ri-loader-4-line animate-spin text-xs" /> Opening…</>
        : <><i className="ri-chat-3-line text-sm" /> Chat with Farmer</>
      }
    </button>
  );
}

export default function BuyerMarketplace() {
  const { addItem, items, totalItems } = useCart();
  const [activeCategory, setActiveCategory] = useState("All Produce");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const category = activeCategory === "All Produce" ? undefined : activeCategory;
      const data = await marketplaceApi.getAllListings({
        category,
        search: debouncedSearch || undefined,
      });
      setListings(data);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, debouncedSearch]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchListings(); }, [fetchListings]);

  function handleAddToCart(listing: PublicListing) {
    addItem(listing, 1);
    setAdded((prev) => ({ ...prev, [listing.listing_id]: true }));
    setTimeout(
      () => setAdded((prev) => ({ ...prev, [listing.listing_id]: false })),
      1500,
    );
  }

  const inCart = (id: string) => items.some((i) => i.listing_id === id);

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Agricultural Marketplace</h1>
          <p className="text-gray-500 mt-1">
            Direct from Nigerian farms. Escrow-protected transactions on every harvest.
          </p>
        </div>
        {totalItems > 0 && (
          <Link
            href="/dashboard/buyer/checkout"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors flex-shrink-0"
          >
            <i className="ri-shopping-cart-line" />
            Cart ({totalItems})
          </Link>
        )}
      </motion.div>

      {/* Search + filter */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search for grains, tubers, or specific farmers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#0D631B]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <i className="ri-close-line" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Category tabs */}
      <motion.div variants={fadeUp} className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <motion.button
            key={c}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveCategory(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${activeCategory === c ? "bg-[#0D631B] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {c}
          </motion.button>
        ))}
      </motion.div>

      {/* Results count */}
      {!loading && (
        <motion.p variants={fadeUp} className="text-sm text-gray-400">
          {listings.length === 0
            ? "No listings found"
            : `${listings.length} listing${listings.length !== 1 ? "s" : ""} available`}
        </motion.p>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          <i className="ri-loader-4-line animate-spin text-2xl mr-2" /> Loading listings...
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <i className="ri-store-line text-3xl mb-2" />
          <p className="text-sm font-medium">No products available in this category yet.</p>
          <p className="text-xs mt-1">Check back soon as farmers list their harvests.</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          variants={staggerContainer}
        >
          {listings.map((p) => {
            const style = CATEGORY_STYLE[p.category] ?? CATEGORY_STYLE["Other"];
            const isAdded = added[p.listing_id];
            const alreadyInCart = inCart(p.listing_id);
            const farmerLocation = [p.farmer.location_state, p.farmer.location_lga]
              .filter(Boolean)
              .join(", ") || p.location_state;

            return (
              <motion.div
                key={p.listing_id}
                variants={scaleIn}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100"
              >
                <div className={`relative h-44 overflow-hidden ${!p.images?.length ? `bg-gradient-to-br ${style.bg}` : ""} flex items-center justify-center`}>
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-[#0D631B] text-white text-xs px-2 py-0.5 rounded-full">
                    <i className="ri-checkbox-circle-fill text-xs" /> ACTIVE
                  </div>
                  {p.images?.length ? (
                    <img src={p.images[0]} alt={p.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <i className={`${style.icon} text-5xl`} />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1 gap-1">
                    <p className="font-semibold text-gray-900 text-sm leading-snug">{p.product_name}</p>
                    <p className="text-[#0D631B] font-bold text-sm whitespace-nowrap">
                      ₦{(p.price_per_unit / 100).toLocaleString("en-NG")}
                    </p>
                  </div>
                  <p className="text-gray-400 text-xs flex items-center gap-1 mb-0.5">
                    <i className="ri-store-2-line text-xs" />
                    {p.farmer.farmName ?? p.farmer.name}
                  </p>
                  <p className="text-gray-400 text-xs flex items-center gap-1 mb-1">
                    <i className="ri-map-pin-line text-xs" /> {farmerLocation}
                  </p>
                  <p className="text-gray-400 text-xs mb-3">
                    Available: {parseFloat(p.quantity)} {p.unit}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAddToCart(p)}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5
                      ${isAdded
                        ? "bg-green-100 text-green-700"
                        : alreadyInCart
                        ? "bg-gray-100 text-gray-600 border border-gray-200"
                        : "bg-[#0D631B] text-white hover:bg-[#0a4f15]"
                      }`}
                  >
                    {isAdded ? (
                      <><i className="ri-check-line" /> Added!</>
                    ) : alreadyInCart ? (
                      <><i className="ri-shopping-cart-line" /> In Cart</>
                    ) : (
                      <><i className="ri-add-line" /> Add to Cart</>
                    )}
                  </motion.button>
                  <ChatButton listingId={p.listing_id} />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
