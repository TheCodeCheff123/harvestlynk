"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion";
import { useAuth } from "@/context/AuthContext";
import {
  marketplaceApi,
  walletApi,
  usersApi,
  formatNaira,
  type Listing,
  type Transaction,
} from "@/lib/api";

const CATEGORY_STYLE: Record<string, { bg: string; icon: string }> = {
  "Grains & Cereals": { bg: "from-yellow-100 to-yellow-200", icon: "ri-plant-line text-yellow-600" },
  Tubers:             { bg: "from-amber-100 to-amber-200",  icon: "ri-leaf-line text-amber-600" },
  Vegetables:         { bg: "from-green-100 to-green-200",  icon: "ri-seedling-line text-green-600" },
  Fruits:             { bg: "from-orange-100 to-orange-200",icon: "ri-plant-line text-orange-500" },
  Livestock:          { bg: "from-stone-100 to-stone-200",  icon: "ri-seedling-line text-stone-600" },
  Other:              { bg: "from-gray-100 to-gray-200",    icon: "ri-box-3-line text-gray-500" },
};

function relativeDate(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "Today";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default function Profile() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [unverified, setUnverified] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [livenessFile, setLivenessFile] = useState<File | null>(null);
  const [livenessPreview, setLivenessPreview] = useState<string | null>(null);
  const [livenessLoading, setLivenessLoading] = useState(false);
  const [livenessMessage, setLivenessMessage] = useState("");
  const [livenessError, setLivenessError] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    setUnverified(localStorage.getItem("hl_farmer_verified") === "false");
  }, []);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [l, t] = await Promise.all([
        marketplaceApi.getMyListings(),
        walletApi.getTransactions(),
      ]);
      setListings(l);
      setTransactions(t);
    } catch {
      // silently fail
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const displayName = user?.name ?? "Farmer";
  const farmName = user?.farmName ?? null;
  const locationDisplay =
    [user?.location_village, user?.location_lga, user?.location_state]
      .filter(Boolean)
      .join(", ") || user?.location || "Nigeria";
  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-NG", { month: "long", year: "numeric" })
    : "—";

  const activeListings = listings.filter((l) => l.status === "active");
  const completedTxs = transactions.filter((t) => t.status === "completed" && t.type === "credit");

  async function handleLivenessSubmit() {
    if (!livenessFile) {
      setLivenessError("Please choose a selfie image first.");
      return;
    }

    setLivenessError("");
    setLivenessMessage("");
    setLivenessLoading(true);
    try {
      const result = await usersApi.livenessCheck(livenessFile);
      setLivenessMessage(result.message);
      setLivenessFile(null);
      setLivenessPreview(null);
      await refreshUser();
    } catch (err) {
      setLivenessError(err instanceof Error ? err.message : "Liveness verification failed.");
    } finally {
      setLivenessLoading(false);
    }
  }

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Profile card */}
        <motion.div variants={scaleIn} className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 260 }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-green-200 to-green-400 flex items-center justify-center mb-4 relative overflow-hidden"
            >
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <i className="ri-user-line text-4xl text-white" />
              )}
              {user?.liveness_verified && (
                <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
                  <i className="ri-verified-badge-fill text-white text-xs" />
                </div>
              )}
            </motion.div>

            <h2 className="text-lg font-bold text-gray-900">{displayName}</h2>
            {farmName && (
              <p className="text-[#0D631B] text-xs font-medium mt-0.5">{farmName}</p>
            )}
            <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
              <i className="ri-map-pin-line text-xs" /> {locationDisplay}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">Joined {joinDate}</p>

            {unverified && (
              <button
                onClick={() => router.push("/onboard/farmer")}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
              >
                <i className="ri-error-warning-line" /> Account Not Verified
              </button>
            )}

            <div className="w-full mt-5 space-y-2">
              {[
                {
                  label: "Trust Score",
                  value: user?.trust_score != null ? `${user.trust_score} / 100` : "Not available",
                  valueStyle: "text-[#0D631B] font-semibold",
                },
                {
                  label: "Completed Sales",
                  value: loadingData ? "—" : `${completedTxs.length}`,
                  valueStyle: "text-[#0D631B] font-semibold",
                },
                {
                  label: "Phone",
                  value: user?.phoneNumber ?? "Not set",
                  valueStyle: "text-gray-700 text-xs",
                },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-500">{s.label}</span>
                  <span className={s.valueStyle}>{s.value}</span>
                </motion.div>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/dashboard/farmer/wallet")}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors"
            >
              View Wallet
            </motion.button>
          </div>

          {/* Verification Credentials */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-4">Account Details</p>
            <div className="space-y-4">
              {[
                {
                  icon: "ri-fingerprint-line",
                  iconBg: user?.liveness_verified ? "bg-green-100" : "bg-gray-100",
                  iconColor: user?.liveness_verified ? "text-[#0D631B]" : "text-gray-400",
                  label: "Identity Verification",
                  sub: user?.liveness_verified ? "Liveness check passed" : "Not yet verified",
                },
                {
                  icon: "ri-bank-card-line",
                  iconBg: user?.bank_name ? "bg-blue-100" : "bg-gray-100",
                  iconColor: user?.bank_name ? "text-blue-600" : "text-gray-400",
                  label: "Bank Account",
                  sub: user?.bank_name
                    ? `${user.bank_name} — ${user.bank_account_number?.slice(-4).padStart(user.bank_account_number.length, "*")}`
                    : "Not linked",
                },
                {
                  icon: "ri-mail-check-line",
                  iconBg: user?.emailVerified ? "bg-green-100" : "bg-amber-100",
                  iconColor: user?.emailVerified ? "text-[#0D631B]" : "text-amber-600",
                  label: "Email",
                  sub: user?.emailVerified ? "Verified" : "Awaiting verification",
                },
              ].map((c, i) => (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.09 }}
                  className="flex items-start gap-3"
                >
                  <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <i className={`${c.icon} ${c.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.label}</p>
                    <p className="text-xs text-gray-400">{c.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {!user?.liveness_verified && (
              <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Complete Liveness Verification</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Upload a clear selfie to unlock publishing active listings and complete farmer verification.
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="liveness-selfie-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setLivenessError("");
                    setLivenessMessage("");
                    setLivenessFile(file);
                    if (!file) {
                      setLivenessPreview(null);
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => setLivenessPreview(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
                {livenessPreview ? (
                  <div className="space-y-3">
                    <img src={livenessPreview} alt="Liveness selfie preview" className="w-full h-48 object-cover rounded-xl border border-gray-200" />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleLivenessSubmit}
                        disabled={livenessLoading}
                        className="flex-1 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-70"
                      >
                        {livenessLoading ? "Verifying..." : "Submit Selfie"}
                      </button>
                      <label htmlFor="liveness-selfie-input" className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium cursor-pointer hover:bg-gray-50">
                        Change
                      </label>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="liveness-selfie-input" className="block w-full rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center cursor-pointer hover:border-[#0D631B] hover:bg-green-50/30 transition-colors">
                    <i className="ri-camera-line text-2xl text-[#0D631B]" />
                    <p className="mt-2 text-sm font-medium text-gray-800">Upload selfie for liveness check</p>
                    <p className="text-xs text-gray-400 mt-1">Use a clear front-facing photo in good lighting.</p>
                  </label>
                )}
                {livenessMessage && (
                  <p className="text-green-600 text-xs p-2.5 bg-green-50 rounded-xl">{livenessMessage}</p>
                )}
                {livenessError && (
                  <p className="text-red-500 text-xs p-2.5 bg-red-50 rounded-xl">{livenessError}</p>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Right: Farm info + listings + transactions */}
        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-5">
          {/* About the Farm */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {farmName ?? "My Farm"}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {[
                { icon: "ri-map-pin-line",  label: "Location", value: locationDisplay },
                { icon: "ri-calendar-line", label: "Member Since", value: joinDate },
                { icon: "ri-box-3-line",    label: "Active Listings", value: loadingData ? "—" : `${activeListings.length}` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                    <i className={item.icon} /> {item.label}
                  </div>
                  <p className="text-gray-900 text-sm font-medium">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-sm">
              {user?.preferred_language
                ? `Preferred language: ${user.preferred_language}`
                : "Complete your profile to add a farm description and improve buyer trust."}
            </p>
          </div>

          {/* Active Listings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Active Listings</h3>
              <a href="/dashboard/farmer/farm" className="text-sm text-[#0D631B] font-medium hover:underline flex items-center gap-1">
                View All <i className="ri-arrow-right-s-line" />
              </a>
            </div>

            {loadingData ? (
              <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
                <i className="ri-loader-4-line animate-spin mr-2" /> Loading...
              </div>
            ) : activeListings.length === 0 ? (
              <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">
                <i className="ri-box-3-line text-xl mb-1" />
                No active listings yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeListings.slice(0, 4).map((item, i) => {
                  const style = CATEGORY_STYLE[item.category] ?? CATEGORY_STYLE["Other"];
                  return (
                    <motion.div
                      key={item.listing_id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      className="bg-white rounded-2xl overflow-hidden border border-gray-100"
                    >
                      <div className={`relative h-36 bg-gradient-to-br ${style.bg} flex items-center justify-center`}>
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#0D631B] text-white text-xs px-2 py-0.5 rounded-full">
                          <i className="ri-checkbox-circle-fill text-xs" /> ACTIVE
                        </div>
                        <i className={`${style.icon} text-4xl`} />
                      </div>
                      <div className="p-4">
                        <p className="font-semibold text-gray-900 text-sm mb-0.5">{item.product_name}</p>
                        <p className="text-gray-400 text-xs mb-2">
                          {parseFloat(item.quantity)} {item.unit} available · {item.location_state}
                        </p>
                        <p className="text-[#0D631B] font-bold text-sm">
                          ₦{item.price_per_unit.toLocaleString("en-NG")} / {item.unit}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
              <a href="/dashboard/farmer/wallet" className="text-sm text-[#0D631B] font-medium hover:underline">
                View All
              </a>
            </div>

            {loadingData ? (
              <div className="h-20 flex items-center justify-center text-gray-400 text-sm">
                <i className="ri-loader-4-line animate-spin mr-2" /> Loading...
              </div>
            ) : transactions.length === 0 ? (
              <div className="h-20 flex items-center justify-center text-gray-400 text-sm">
                No transactions yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[420px]">
                  <thead>
                    <tr className="text-gray-400 text-xs border-b border-gray-100">
                      <th className="text-left px-4 md:px-6 py-3 font-medium">Type</th>
                      <th className="text-left px-4 md:px-6 py-3 font-medium">Description</th>
                      <th className="text-left px-4 md:px-6 py-3 font-medium">Amount</th>
                      <th className="text-left px-4 md:px-6 py-3 font-medium">Date</th>
                      <th className="text-left px-4 md:px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.slice(0, 5).map((tx, i) => (
                      <motion.tr
                        key={tx.transaction_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.07 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 md:px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            tx.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                          }`}>
                            {tx.type === "credit" ? "Credit" : "Debit"}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3 text-gray-600 text-xs">
                          {tx.description ?? "—"}
                        </td>
                        <td className="px-4 md:px-6 py-3 font-semibold text-gray-900">
                          {tx.type === "debit" ? "-" : "+"}{formatNaira(tx.amount)}
                        </td>
                        <td className="px-4 md:px-6 py-3 text-gray-400 text-xs">
                          {relativeDate(tx.created_at)}
                        </td>
                        <td className="px-4 md:px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            tx.status === "completed" ? "bg-green-100 text-green-700" :
                            tx.status === "pending"   ? "bg-amber-100 text-amber-700" :
                                                        "bg-red-100 text-red-600"
                          }`}>
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Change Password */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i className="ri-shield-keyhole-line text-[#0D631B]" /> Change Password
            </h3>
            <div className="space-y-3">
              {[
                { label: "Current Password", value: currentPw, set: setCurrentPw },
                { label: "New Password",     value: newPw,     set: setNewPw },
                { label: "Confirm Password", value: confirmPw, set: setConfirmPw },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <i className={showPw ? "ri-eye-off-line" : "ri-eye-line"} />
                {showPw ? "Hide" : "Show"} passwords
              </button>

              {pwError && (
                <p className="text-red-500 text-xs p-2.5 bg-red-50 rounded-xl">{pwError}</p>
              )}
              {pwSuccess && (
                <p className="text-green-600 text-xs p-2.5 bg-green-50 rounded-xl flex items-center gap-1">
                  <i className="ri-checkbox-circle-line" /> Password changed successfully.
                </p>
              )}

              <button
                onClick={async () => {
                  setPwError("");
                  setPwSuccess(false);
                  if (!currentPw || !newPw || !confirmPw) { setPwError("Please fill in all fields."); return; }
                  if (newPw.length < 8) { setPwError("New password must be at least 8 characters."); return; }
                  if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
                  setPwLoading(true);
                  try {
                    await usersApi.changePassword(currentPw, newPw);
                    setPwSuccess(true);
                    setCurrentPw(""); setNewPw(""); setConfirmPw("");
                  } catch (err) {
                    setPwError(err instanceof Error ? err.message : "Failed to change password.");
                  } finally {
                    setPwLoading(false);
                  }
                }}
                disabled={pwLoading}
                className="w-full py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {pwLoading
                  ? <><i className="ri-loader-4-line animate-spin" /> Updating…</>
                  : "Update Password"
                }
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
