export default function FarmerDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome Back, Daniel</h1>
        <p className="text-gray-500 mt-1">Access your dashboard</p>
      </div>

      {/* Financial Overview */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-[#BFCABA]">
        <div className="flex items-start sm:items-center justify-between mb-5 gap-3 flex-col sm:flex-row">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Financial Overview</h2>
            <p className="text-sm text-[#0D631B] flex items-center gap-1 mt-1">
              <i className="ri-shield-check-line" /> Escrow Protection Active
            </p>
          </div>
          <button className="px-4 py-2 rounded-lg bg-[#835400] text-white text-sm font-medium hover:bg-[#d09000] transition-colors self-start sm:self-auto">
            Withdraw Funds
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0D631B] rounded-xl p-5 hover:bg-[#0D631B]/90">
            <p className="text-green-200 text-xs mb-2">Available Balance</p>
            <p className="text-white text-2xl font-bold">₦127,500</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-gray-500 text-xs mb-1">Pending (Escrow)</p>
            <div className="flex items-center gap-2 mt-1">
              <i className="ri-lock-line text-gray-400" />
              <p className="text-gray-900 text-2xl font-bold">₦45,000</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-gray-500 text-xs mb-1">Awaiting Confirmation</p>
            <p className="text-gray-900 text-2xl font-bold mb-2">3</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#FCAB28] text-[#694300] font-medium">
              Not completed
            </span>
          </div>
        </div>
      </div>

      {/* My Produce Listings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Produce Listings</h2>
          <a href="/dashboard/farmer/farm" className="text-sm text-[#0D631B] font-medium hover:underline">
            View All
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl overflow-hidden border border-[#BFCABA]">
            <div className="relative h-44">
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-[#0D631B] text-white text-xs px-2 py-0.5 rounded-full">
                <i className="ri-checkbox-circle-fill text-xs" /> VERIFIED
              </div>
              <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                <i className="ri-leaf-line text-4xl text-amber-600" />
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900 text-sm">Premium Cassava Tubers</p>
                <p className="text-[#0D631B] text-sm font-semibold">₦12,500/Bag</p>
              </div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Paid – awaiting delivery</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">In Transit</span>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <i className="ri-inbox-archive-line" /> 45 Bags remaining
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl overflow-hidden border border-[#BFCABA]">
            <div className="relative h-44">
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-[#0D631B] text-white text-xs px-2 py-0.5 rounded-full">
                <i className="ri-checkbox-circle-fill text-xs" /> VERIFIED
              </div>
              <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                <i className="ri-plant-line text-4xl text-orange-600" />
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900 text-sm">Organic Jumbo Carrots</p>
                <p className="text-[#0D631B] text-sm font-semibold">₦8,000/Crate</p>
              </div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Processing Order</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Escrow Held</span>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <i className="ri-inbox-archive-line" /> 12 Crates remaining
              </p>
            </div>
          </div>

          {/* Logistics card */}
          <div className="rounded-2xl overflow-hidden relative bg-[#1a3a5c] min-h-[220px] sm:col-span-2 lg:col-span-1">
            <img src="/truck.jpg" alt="truck" className="absolute inset-0 w-full h-full object-cover mix-blend-multiply" />
            <div className="absolute inset-0 flex flex-col justify-end p-5">
              <i className="ri-truck-line text-3xl text-blue-200 mb-3" />
              <p className="text-white font-bold text-lg leading-snug">Need Logistics?</p>
              <p className="text-blue-200 text-sm mt-1">Book a truck for your next harvest delivery.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Order Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Order Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-gray-400 text-xs">
                <th className="text-left px-4 md:px-6 py-3 font-medium">Order ID</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium">Customer</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium">Produce</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium">Amount</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium">Escrow Status</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { id: "#FC-8821", customer: "Chike Obi Ent.", produce: "Yam Tubers (20)", amount: "₦42,000", status: "Secured in Escrow", dot: "bg-amber-400" },
                { id: "#FC-8819", customer: "Lagos Fresh Market", produce: "Hybrid Maize (10 Bags)", amount: "₦15,500", status: "Released to Wallet", dot: "bg-green-500" },
                { id: "#FC-8790", customer: "Mama Africa Foods", produce: "Red Pepper (5 Crates)", amount: "₦12,000", status: "Awaiting Payment", dot: "bg-red-500" },
              ].map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 md:px-6 py-4 font-medium text-[#0D631B]">{row.id}</td>
                  <td className="px-4 md:px-6 py-4 text-gray-700">{row.customer}</td>
                  <td className="px-4 md:px-6 py-4 text-gray-600">{row.produce}</td>
                  <td className="px-4 md:px-6 py-4 font-semibold text-gray-900">{row.amount}</td>
                  <td className="px-4 md:px-6 py-4">
                    <span className="flex items-center gap-2 text-gray-600">
                      <span className={`w-2 h-2 rounded-full ${row.dot}`} />
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <button className="text-[#0D631B] font-medium hover:underline">Details</button>
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
