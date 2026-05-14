const transactions = [
  { date: "Oct 24, 2023", desc: "Order #AH-92831", sub: "Bags of Hybrid Maize", type: "Debit", amount: "₦450,000.00", status: "Held in Escrow", statusBg: "bg-blue-50", statusText: "text-blue-600", statusIcon: "ri-lock-line" },
  { date: "Oct 22, 2023", desc: "Wallet Credit", sub: "Bank Transfer (Wema Bank)", type: "Credit", amount: "₦1,000,000.00", status: "Completed", statusBg: "bg-green-100", statusText: "text-[#0D631B]", statusIcon: null },
  { date: "Oct 18, 2023", desc: "Order #AH-92744", sub: "2 Tons of Cassava Tubers", type: "Debit", amount: "₦320,000.00", status: "Completed", statusBg: "bg-green-100", statusText: "text-[#0D631B]", statusIcon: null },
];

export default function BuyerWallet() {
  return (
    <div className="space-y-6">
      {/* Balance card */}
      <div className="bg-white rounded-2xl p-5 md:p-8 border border-gray-100 relative overflow-hidden">
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-100">
          <i className="ri-shield-line text-[80px] md:text-[120px]" />
        </div>
        <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">Available Balance</p>
        <p className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
          ₦1,240,500.00 <span className="text-base md:text-lg font-medium text-gray-400">NGN</span>
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e8a000] text-white font-medium text-sm hover:bg-[#d09000] transition-colors">
            <i className="ri-bank-card-line" /> Credit Wallet
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#0D631B] text-[#0D631B] font-medium text-sm hover:bg-green-50 transition-colors">
            Withdraw Funds
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
          <button className="text-sm text-[#0D631B] font-medium hover:underline flex items-center gap-1">
            View All <i className="ri-arrow-right-line" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 md:px-6 py-3">Date</th>
                <th className="text-left px-4 md:px-6 py-3">Description</th>
                <th className="text-left px-4 md:px-6 py-3">Type</th>
                <th className="text-left px-4 md:px-6 py-3">Amount</th>
                <th className="text-left px-4 md:px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 md:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{t.date}</td>
                  <td className="px-4 md:px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{t.desc}</p>
                    <p className="text-xs text-gray-400">{t.sub}</p>
                  </td>
                  <td className={`px-4 md:px-6 py-4 text-sm font-semibold ${t.type === "Credit" ? "text-[#0D631B]" : "text-red-500"}`}>
                    {t.type}
                  </td>
                  <td className="px-4 md:px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{t.amount}</td>
                  <td className="px-4 md:px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${t.statusBg} ${t.statusText}`}>
                      {t.statusIcon && <i className={t.statusIcon} />}
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
