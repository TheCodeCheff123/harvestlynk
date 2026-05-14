"use client";
import { useState } from "react";

const orders = [
  { id: "#FC-8821", initials: "AO", color: "bg-amber-500", customer: "Adebayo Oluchi", produce: "White Garri (Bag)", qty: 50, total: "₦450,000", status: "Payment Secured", statusStyle: "bg-blue-100 text-blue-700" },
  { id: "#FC-8794", initials: "KM", color: "bg-green-500", customer: "Kemi Musa", produce: "Fresh Tomatoes", qty: "15 Baskets", total: "₦185,000", status: "Awaiting Confirmation", statusStyle: "bg-amber-100 text-amber-700" },
  { id: "#FC-8652", initials: "CS", color: "bg-purple-400", customer: "Chidi Samuel", produce: "Yam Tubers (Medium)", qty: 100, total: "₦1,200,000", status: "Funds Released", statusStyle: "bg-green-100 text-green-700" },
];

export default function Orders() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-500 mt-1">Track and manage your agricultural trades and logistics.</p>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "active", "completed"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize
                ${tab === t ? "bg-[#0D631B] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {t === "all" ? "All Orders" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Order ID or Produce..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm w-full focus:outline-none focus:border-[#0D631B]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 md:px-6 py-3 text-gray-500 font-medium">Order ID</th>
                <th className="text-left px-4 md:px-6 py-3 text-gray-500 font-medium">Customer</th>
                <th className="text-left px-4 md:px-6 py-3 text-gray-500 font-medium">Produce</th>
                <th className="text-left px-4 md:px-6 py-3 text-gray-500 font-medium">Qty</th>
                <th className="text-left px-4 md:px-6 py-3 text-gray-500 font-medium">Total (₦)</th>
                <th className="text-left px-4 md:px-6 py-3 text-gray-500 font-medium">Escrow Status</th>
                <th className="text-left px-4 md:px-6 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 md:px-6 py-4 font-medium text-[#0D631B]">{o.id}</td>
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${o.color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                        {o.initials}
                      </div>
                      <span className="text-gray-700">{o.customer}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-gray-600">{o.produce}</td>
                  <td className="px-4 md:px-6 py-4 text-gray-700">{o.qty}</td>
                  <td className="px-4 md:px-6 py-4 font-semibold text-gray-900">{o.total}</td>
                  <td className="px-4 md:px-6 py-4">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium w-fit ${o.statusStyle}`}>
                      <i className={o.status === "Payment Secured" ? "ri-lock-line" : o.status === "Awaiting Confirmation" ? "ri-time-line" : "ri-checkbox-circle-line"} />
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <button className="px-4 py-1.5 rounded-lg bg-[#0D631B] text-white text-xs font-medium hover:bg-[#0a4f15] transition-colors">
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 md:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
          <span className="text-gray-500">Showing 1 to 10 of 56 entries</span>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
              <i className="ri-arrow-left-s-line" />
            </button>
            {[1, 2, 3].map((p) => (
              <button key={p} className={`w-8 h-8 rounded-lg text-sm font-medium ${p === 1 ? "bg-[#0D631B] text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {p}
              </button>
            ))}
            <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
              <i className="ri-arrow-right-s-line" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
