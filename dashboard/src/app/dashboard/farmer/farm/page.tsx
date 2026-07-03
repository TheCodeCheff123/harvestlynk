"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion";
import ListProductModal from "@/components/ListProductModal";
import { marketplaceApi, type Listing } from "@/lib/api";

// Map category to tailwind gradient + icon for the card visuals
const CATEGORY_STYLE: Record<string, { bg: string; icon: string }> = {
  "Grains & Cereals": { bg: "from-yellow-100 to-yellow-200", icon: "ri-plant-line text-yellow-600" },
  Tubers: { bg: "from-amber-100 to-amber-200", icon: "ri-leaf-line text-amber-600" },
  Vegetables: { bg: "from-green-100 to-green-200", icon: "ri-seedling-line text-green-600" },
  Fruits: { bg: "from-orange-100 to-orange-200", icon: "ri-plant-line text-orange-500" },
  Livestock: { bg: "from-stone-100 to-stone-200", icon: "ri-seedling-line text-stone-600" },
  Legumes: { bg: "from-lime-100 to-lime-200", icon: "ri-leaf-line text-lime-600" },
  Spices: { bg: "from-red-100 to-red-200", icon: "ri-leaf-line text-red-500" },
  Other: { bg: "from-gray-100 to-gray-200", icon: "ri-box-3-line text-gray-500" },
};

function defaultStyle(category: string) {
  return CATEGORY_STYLE[category] ?? CATEGORY_STYLE["Other"];
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return "Today";
  if (d === 1) return "1d ago";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function MyFarmInner() {
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const data = await marketplaceApi.getMyListings();
      setListings(data);
    } catch {
      // silently fail — empty state will show
    } finally {
      setLoadingListings(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (searchParams.get("list") === "true") setShowModal(true);
  }, [searchParams]);

  const activeListings = listings.filter((l) => l.status === "active");
  const draftListings = listings.filter((l) => l.status === "paused");
  const totalValue = activeListings.reduce((sum, l) => sum + l.total_price, 0);

  async function handleDelete(id: string) {
    try {
      await marketplaceApi.deleteListing(id);
      setListings((prev) => prev.filter((l) => l.listing_id !== id));
    } catch {
      // ignore
    }
  }

  async function handlePublish(id: string) {
    setActionError("");
    setActionLoadingId(id);
    try {
      await marketplaceApi.updateListing(id, { status: "active" });
      await fetchListings();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to publish listing.");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {showModal && (
        <ListProductModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchListings(); }}
        />
      )}

      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Farm</h1>
          <p className="text-[#40493D] mt-1">Manage your agricultural inventory and listings.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors self-start sm:self-auto"
        >
          <i className="ri-add-line" /> List New Product
        </motion.button>
      </motion.div>

      {/* Stats */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" variants={staggerContainer}>
        {[
          {
            icon: "ri-box-3-line", iconBg: "bg-green-100", iconColor: "text-[#0D631B]",
            label: "Total Active Listings",
            value: loadingListings ? "—" : `${activeListings.length} Item${activeListings.length !== 1 ? "s" : ""}`,
          },
          {
            icon: "ri-currency-line", iconBg: "bg-amber-100", iconColor: "text-amber-600",
            label: "Total Value of Inventory",
            value: loadingListings ? "—" : `₦${totalValue.toLocaleString("en-NG")}`,
          },
          {
            icon: "ri-draft-line", iconBg: "bg-gray-100", iconColor: "text-gray-500",
            label: "Saved as Draft",
            value: loadingListings ? "—" : `${draftListings.length} Draft${draftListings.length !== 1 ? "s" : ""}`,
          },
        ].map((s) => (
          <motion.div
            key={s.label}
            variants={scaleIn}
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl p-5 md:p-8 border border-gray-100 flex items-center gap-4 bg-white"
          >
            <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
              <i className={`${s.icon} ${s.iconColor} text-xl`} />
            </div>
            <div>
              <p className="text-gray-500 text-xs">{s.label}</p>
              <p className="text-gray-900 font-bold text-xl mt-0.5">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Active Listings */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Listings</h2>
        </div>

        {loadingListings ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <i className="ri-loader-4-line animate-spin text-2xl mr-2" /> Loading listings...
          </div>
        ) : activeListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
            <i className="ri-box-3-line text-3xl mb-2" />
            <p className="text-sm font-medium">No active listings yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 text-[#0D631B] text-sm font-semibold hover:underline"
            >
              + Create your first listing
            </button>
          </div>
        ) : (
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" variants={staggerContainer}>
            {activeListings.map((item) => {
              const style = defaultStyle(item.category);
              return (
                <motion.div
                  key={item.listing_id}
                  variants={scaleIn}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100"
                >
                  <div className={`relative h-40 overflow-hidden ${!item.images?.length ? `bg-gradient-to-br ${style.bg}` : ""} flex items-center justify-center`}>
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-[#0D631B] text-white text-xs px-2 py-0.5 rounded-full">
                      <i className="ri-checkbox-circle-fill text-xs" /> ACTIVE
                    </div>
                    {item.images?.length ? (
                      <img src={item.images[0]} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <i className={`${style.icon} text-4xl`} />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-gray-900 text-sm mb-0.5">{item.product_name}</p>
                    <p className="text-[#0D631B] text-xs font-medium mb-1">
                      ₦{item.price_per_unit.toLocaleString("en-NG")} / {item.unit}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <i className="ri-inbox-archive-line" />
                        {parseFloat(item.quantity)} {item.unit} Left
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-calendar-line" />
                        {relativeDate(item.created_at)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(item.listing_id)}
                      className="w-full py-2 rounded-lg text-xs font-medium transition-colors border border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>

      {/* Drafts */}
      {draftListings.length > 0 && (
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Drafts</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
              {draftListings.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-gray-400 text-xs">
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Product</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Category</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Price / Unit</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Created</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {draftListings.map((row) => {
                  const style = defaultStyle(row.category);
                  return (
                    <tr key={row.listing_id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ${!row.images?.length ? `bg-gradient-to-br ${style.bg}` : ""} flex items-center justify-center`}>
                            {row.images?.length ? (
                              <img src={row.images[0]} alt={row.product_name} className="w-full h-full object-cover" />
                            ) : (
                              <i className={`${style.icon} text-sm`} />
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{row.product_name}</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-500">{row.category}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-700">
                        ₦{row.price_per_unit.toLocaleString("en-NG")} / {row.unit}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-500">{relativeDate(row.created_at)}</td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handlePublish(row.listing_id)}
                            disabled={actionLoadingId === row.listing_id}
                            className="text-[#0D631B] font-medium text-sm hover:underline disabled:opacity-60"
                          >
                            {actionLoadingId === row.listing_id ? "Publishing..." : "Publish"}
                          </button>
                          <button
                            onClick={() => handleDelete(row.listing_id)}
                            className="text-red-500 font-medium text-sm hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {actionError && (
            <div className="px-4 md:px-6 py-4 border-t border-gray-100 bg-red-50 text-red-600 text-sm">
              {actionError}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function MyFarm() {
  return (
    <Suspense>
      <MyFarmInner />
    </Suspense>
  );
}
