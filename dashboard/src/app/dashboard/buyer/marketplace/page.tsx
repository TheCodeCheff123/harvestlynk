"use client";
import { useState } from "react";

const categories = ["All Produce", "Grains", "Tubers", "Vegetables", "Fruits", "Livestock"];

const products = [
  { name: "Premium Yam Tubers",    price: "₦12,500", farm: "Benue State • Danladi Farms",   avail: "Available: 45 Large Tubers", escrow: true,  color: "from-stone-200 to-stone-300",   icon: "ri-plant-line text-stone-500" },
  { name: "Hybrid Yellow Maize",   price: "₦45,000", farm: "Kaduna • Northern Grains Ltd",  avail: "Available: 50kg per Bag",    escrow: false, color: "from-yellow-100 to-yellow-200", icon: "ri-seedling-line text-yellow-600" },
  { name: "Fresh Export Ginger",   price: "₦22,000", farm: "Kaduna • Root Export Hub",      avail: "Available: 15kg Crate",      escrow: false, color: "from-amber-100 to-amber-200",   icon: "ri-plant-line text-amber-600" },
  { name: "Organic Vine Tomatoes", price: "₦8,200",  farm: "Jos • Plateau Greens",          avail: "Available: 20kg Basket",     escrow: false, color: "from-red-100 to-red-200",       icon: "ri-leaf-line text-red-500" },
  { name: "Organic Vine Tomatoes", price: "₦8,200",  farm: "Jos • Plateau Greens",          avail: "Available: 20kg Basket",     escrow: false, color: "from-red-100 to-red-200",       icon: "ri-leaf-line text-red-500" },
  { name: "Organic Vine Tomatoes", price: "₦8,200",  farm: "Jos • Plateau Greens",          avail: "Available: 20kg Basket",     escrow: false, color: "from-red-100 to-red-200",       icon: "ri-leaf-line text-red-500" },
  { name: "Organic Vine Tomatoes", price: "₦8,200",  farm: "Jos • Plateau Greens",          avail: "Available: 20kg Basket",     escrow: false, color: "from-red-100 to-red-200",       icon: "ri-leaf-line text-red-500" },
  { name: "Organic Vine Tomatoes", price: "₦8,200",  farm: "Jos • Plateau Greens",          avail: "Available: 20kg Basket",     escrow: false, color: "from-red-100 to-red-200",       icon: "ri-leaf-line text-red-500" },
];

export default function BuyerMarketplace() {
  const [active, setActive] = useState("All Produce");
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Agricultural Marketplace</h1>
        <p className="text-gray-500 mt-1">
          Direct from Nigerian farms to your doorstep. Secure escrow-protected transactions for every harvest.
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search for grains, tubers, or specific farmers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#0D631B]"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <i className="ri-equalizer-line" /> Advanced Filters <i className="ri-arrow-down-s-line" />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${active === c ? "bg-[#0D631B] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {products.map((p, i) => (
          <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
            <div className={`relative h-44 bg-gradient-to-br ${p.color} flex items-center justify-center`}>
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#0D631B] text-white text-xs px-2 py-0.5 rounded-full">
                <i className="ri-checkbox-circle-fill text-xs" /> VERIFIED
              </div>
              {p.escrow && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  <i className="ri-lock-line text-xs" /> ESCROW PROTECTED
                </div>
              )}
              <i className={`${p.icon} text-5xl`} />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                <p className="text-[#0D631B] font-bold text-sm">{p.price}</p>
              </div>
              <p className="text-gray-400 text-xs flex items-center gap-1 mb-1">
                <i className="ri-map-pin-line text-xs" /> {p.farm}
              </p>
              <p className="text-gray-400 text-xs mb-3">{p.avail}</p>
              <button className="w-full py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors">
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
