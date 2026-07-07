"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion";
import { marketplaceApi, type PublicListing } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

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

function defaultStyle(category: string) {
  return CATEGORY_STYLE[category] ?? CATEGORY_STYLE["Other"];
}

export default function FarmerMarketplace() {
  const { user } = useAuth();
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
      // Exclude own listings so a farmer doesn't buy from themselves
      setListings(user ? data.filter((l) => l.farmer_id !== user.id) : data);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, debouncedSearch, user]);

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Farmer Marketplace</h1>
          <p className="text-gray-500 mt-1">
            Buy inputs and produce from other Nigerian farmers. Escrow-protected transactions.
          </p>
        </div>
        {totalItems > 0 && (
          <Link
            href="/dashboard/farmer/checkout"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors flex-shrink-0"
          >
            <i className="ri-shopping-cart-line" />
            Cart ({totalItems})
          </Link>
        )}
      </motion.div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-3 text-sm text-amber-800">
        <i className="ri-information-line mt-0.5 flex-shrink-0 text-amber-500" />
        <span>
          As a farmer, you can purchase inputs, seeds, and produce from fellow farmers on the platform.
          Orders and escrow are handled through the buyer checkout flow.
        </span>
      </div>

      {/* Search + filter */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search produce, farms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#0D631B] transition-colors"
          />
        </div>
      </motion.div>

      {/* Category tabs */}
      <motion.div variants={fadeUp} className="overflow-x-auto">
        <div className="flex gap-2 pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeCategory === cat
                  ? "bg-[#0D631B] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#0D631B] hover:text-[#0D631B]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Listings */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <i className="ri-loader-4-line animate-spin text-2xl mr-2" /> Loading marketplace...
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <i className="ri-store-2-line text-3xl mb-2" />
          <p className="text-sm font-medium">No listings found</p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="mt-2 text-[#0D631B] text-xs font-medium hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          variants={staggerContainer}
        >
          {listings.map((listing) => {
            const style = defaultStyle(listing.category);
            const alreadyAdded = added[listing.listing_id];
            const isInCart = inCart(listing.listing_id);
            const qty = parseFloat(listing.quantity);

            return (
              <motion.div
                key={listing.listing_id}
                variants={scaleIn}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100"
              >
                <div
                  className={`relative h-40 overflow-hidden ${
                    !listing.images?.length ? `bg-gradient-to-br ${style.bg}` : ""
                  } flex items-center justify-center`}
                >
                  {listing.images?.length ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.images[0]}
                      alt={listing.product_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <i className={`${style.icon} text-4xl`} />
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 text-xs font-medium text-gray-700">
                    {listing.category}
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 text-sm mb-0.5 truncate">{listing.product_name}</p>
                  <p className="text-[#0D631B] font-bold text-base mb-1">
                    ₦{(listing.price_per_unit / 100).toLocaleString("en-NG")}{" "}
                    <span className="text-gray-400 text-xs font-normal">/ {listing.unit}</span>
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <i className="ri-map-pin-line" /> {listing.location_state}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="ri-inbox-archive-line" /> {qty} {listing.unit}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 truncate flex items-center gap-1">
                    <i className="ri-store-2-line" />
                    {listing.farmer.farmName ?? listing.farmer.name}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => !isInCart && handleAddToCart(listing)}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      alreadyAdded
                        ? "bg-green-100 text-[#0D631B]"
                        : isInCart
                        ? "bg-gray-100 text-gray-500 cursor-default"
                        : "bg-[#0D631B] text-white hover:bg-[#0a4f15]"
                    }`}
                  >
                    {alreadyAdded ? (
                      <span className="flex items-center justify-center gap-1">
                        <i className="ri-check-line" /> Added!
                      </span>
                    ) : isInCart ? (
                      "In Cart"
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        <i className="ri-shopping-cart-line" /> Add to Cart
                      </span>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
