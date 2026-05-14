"use client";
import { useState } from "react";

export default function Wallet() {
  const [amount, setAmount] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[#0D631B] text-sm flex items-center gap-1 mb-1">
          <i className="ri-lock-line" /> Escrow Protected Funds
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Withdrawal Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-4">
          {/* Available balance */}
          <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6 border border-gray-100">
            <p className="text-gray-400 text-xs font-semibold tracking-widest uppercase mb-2">Available for Withdrawal</p>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-3xl md:text-4xl font-bold text-[#0D631B]">₦127,500.00</p>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                <i className="ri-checkbox-circle-line" /> Verified
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-2">Next scheduled settlement: Tomorrow, 10:00 AM</p>
          </div>

          {/* Request Payout */}
          <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Request Payout</h2>

            <p className="text-sm font-medium text-gray-700 mb-3">Select Bank Account</p>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex-1 border-2 border-[#0D631B] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">GT Banks</p>
                  <p className="text-gray-400 text-xs">**** 4432 (M. Daniel)</p>
                </div>
                <i className="ri-checkbox-circle-fill text-[#0D631B] text-xl" />
              </div>
              <button className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-gray-300 transition-colors min-h-[72px]">
                <i className="ri-add-circle-line text-xl" />
                <span className="text-xs">Add New Bank</span>
              </button>
            </div>

            <p className="text-sm font-medium text-gray-700 mb-2">Withdrawal Amount (₦)</p>
            <div className="relative mb-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₦</span>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-[#0D631B] text-sm"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-5">
              <span>Min: ₦1,000 | Max: ₦127,500</span>
              <button className="text-[#0D631B] font-medium hover:underline">Withdraw All</button>
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#e8a000] text-white font-semibold hover:bg-[#d09000] transition-colors">
              <i className="ri-secure-payment-line" /> Process Secure Withdrawal
            </button>
            <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
              <i className="ri-shield-check-line" /> Encrypted by NIBSS Instant Payment Gateway
            </p>
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Settlement Policy */}
          <div className="bg-[#0D631B] rounded-2xl shadow-sm p-5 text-white">
            <p className="font-semibold flex items-center gap-2 mb-3">
              <i className="ri-information-line" /> Settlement Policy
            </p>
            <p className="text-green-200 text-xs leading-relaxed mb-4">
              FarmConnect ensures secure escrow for all transactions. A flat 10% platform commission applies to maintain the trust ecosystem.
            </p>
            <div className="space-y-2 text-sm border-t border-green-700 pt-4">
              <div className="flex justify-between">
                <span className="text-green-200 text-xs">Sample Order Amount</span>
                <span className="font-medium text-xs">₦10,000.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-200 text-xs">Platform Fee (10%)</span>
                <span className="font-medium text-xs">- ₦1,000.00</span>
              </div>
              <div className="flex justify-between border-t border-green-700 pt-2">
                <span className="font-semibold text-sm">Your Settlement</span>
                <span className="font-bold text-sm">₦9,000.00</span>
              </div>
            </div>
            <p className="text-green-300 text-xs mt-3">* Logistics and insurance covered separately by the buyer.</p>
          </div>

          {/* Recent Withdrawals */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">Recent Withdrawals</h3>
              <button className="text-[#0D631B] text-xs font-medium hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {[
                { icon: "ri-checkbox-circle-line", iconStyle: "text-green-500 bg-green-50", label: "Successful Payout", date: "May 12, 2024", amount: "₦45,000.00", status: "Completed", statusStyle: "text-green-600" },
                { icon: "ri-time-line", iconStyle: "text-amber-500 bg-amber-50", label: "Pending Approval", date: "May 20, 2024", amount: "₦12,200.00", status: "Processing", statusStyle: "text-amber-600" },
                { icon: "ri-checkbox-circle-line", iconStyle: "text-green-500 bg-green-50", label: "Successful Payout", date: "Apr 28, 2024", amount: "₦89,400.00", status: "Completed", statusStyle: "text-green-600" },
              ].map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${w.iconStyle} flex items-center justify-center flex-shrink-0`}>
                    <i className={`${w.icon} text-sm`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{w.label}</p>
                    <p className="text-xs text-gray-400">{w.date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{w.amount}</p>
                    <p className={`text-xs font-medium ${w.statusStyle}`}>{w.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
