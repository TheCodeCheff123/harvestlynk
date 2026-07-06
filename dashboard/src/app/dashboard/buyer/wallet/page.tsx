"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion";
import { useAuth } from "@/context/AuthContext";
import { walletApi, formatNaira, nairaToKobo, type Transaction, virtualAccountsApi, type VirtualAccount } from "@/lib/api";

const DEFAULT_BANKS = [
  { code: "058", name: "Guaranty Trust Bank (GTB)" },
  { code: "044", name: "Access Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "057", name: "Zenith Bank" },
  { code: "033", name: "United Bank for Africa (UBA)" },
  { code: "035", name: "Wema Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "070", name: "Fidelity Bank" },
];

export default function BuyerWallet() {
  const { wallet, refreshWallet } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [vaLoading, setVaLoading] = useState(true);
  const [showVaModal, setShowVaModal] = useState(false);
  const [creatingVa, setCreatingVa] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  // toast: { msg, ok }
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Withdrawal state
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBankCode, setWithdrawBankCode] = useState("");
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState("");
  const [withdrawAccountName, setWithdrawAccountName] = useState("");
  const [banks, setBanks] = useState(DEFAULT_BANKS);
  const [banksLoading, setBanksLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  const loadTransactions = useCallback(() => {
    walletApi.getTransactions()
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setTxLoading(false));
  }, []);

  const loadVirtualAccount = useCallback(async () => {
    setVaLoading(true);
    try {
      const response = await virtualAccountsApi.getMyVirtualAccount();
      setVirtualAccount(response.virtualAccount);
    } catch {
      setVirtualAccount(null);
    } finally {
      setVaLoading(false);
    }
  }, []);

  // Initial load — run once on mount
  useEffect(() => {
    refreshWallet();
    loadTransactions();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadVirtualAccount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefreshBalance() {
    setRefreshingBalance(true);
    try {
      // Call the backend refresh endpoint first — it queries Nomba for any
      // missed VA credits and credits them before we read the balance back.
      await walletApi.refreshBalance().catch(() => {
        // If the user has no VA yet, the endpoint returns 404 — that's fine,
        // just fall through to the regular balance read.
      });
      await refreshWallet();
      loadTransactions();
      showToast("Balance refreshed");
    } finally {
      setRefreshingBalance(false);
    }
  }

  async function handleCreateVirtualAccount() {
    setCreatingVa(true);
    try {
      const response = await virtualAccountsApi.createVirtualAccount();
      setVirtualAccount(response.virtualAccount);
      setShowVaModal(false);
      showToast("Virtual account created successfully");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to create virtual account", false);
    } finally {
      setCreatingVa(false);
    }
  }

  async function handleSuspend() {
    if (!virtualAccount) return;
    setSuspending(true);
    try {
      await virtualAccountsApi.suspendVirtualAccount();
      setVirtualAccount((prev) => prev ? { ...prev, status: "suspended" } : prev);
      showToast("Virtual account suspended");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to suspend account", false);
    } finally {
      setSuspending(false);
    }
  }

  function openWithdraw() {
    setWithdrawAmount("");
    setWithdrawBankCode("");
    setWithdrawAccountNumber("");
    setWithdrawAccountName("");
    setVerifyError("");
    setWithdrawError("");
    setShowWithdraw(true);
    // Lazily load full bank list once
    if (banks.length <= DEFAULT_BANKS.length) {
      setBanksLoading(true);
      walletApi.getBanks()
        .then((res) => setBanks(res.banks))
        .catch(() => {}) // keep DEFAULT_BANKS on failure
        .finally(() => setBanksLoading(false));
    }
  }

  async function handleVerifyBank() {
    if (!withdrawBankCode) { setVerifyError("Please select a bank."); return; }
    if (withdrawAccountNumber.length !== 10) { setVerifyError("Account number must be 10 digits."); return; }
    setVerifying(true);
    setVerifyError("");
    setWithdrawAccountName("");
    try {
      const res = await walletApi.verifyBank(withdrawBankCode, withdrawAccountNumber);
      if (res.success) {
        setWithdrawAccountName(res.data.account_name);
      } else {
        setVerifyError(res.message ?? "Verification failed.");
      }
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleWithdraw() {
    const availableKobo = wallet ? parseInt(wallet.available_balance, 10) : 0;
    const availableNaira = availableKobo / 100;
    const naira = parseFloat(withdrawAmount);
    if (!naira || naira < 100) { setWithdrawError("Minimum withdrawal is ₦100."); return; }
    if (naira > availableNaira) {
      setWithdrawError(`Amount exceeds available balance of ${formatNaira(availableKobo)}.`);
      return;
    }
    if (!withdrawAccountName) { setWithdrawError("Please verify your bank account first."); return; }
    const bankName = banks.find((b) => b.code === withdrawBankCode)?.name ?? withdrawBankCode;
    setWithdrawing(true);
    setWithdrawError("");
    try {
      const res = await walletApi.withdraw({
        amount: nairaToKobo(naira),
        bank_name: bankName,
        bank_code: withdrawBankCode,
        account_number: withdrawAccountNumber,
        account_name: withdrawAccountName,
      });
      if (res.success) {
        showToast(`Withdrawal of ${formatNaira(nairaToKobo(naira))} initiated`);
        setShowWithdraw(false);
        await refreshWallet();
        walletApi.getTransactions().then(setTransactions).catch(() => {});
      } else {
        setWithdrawError("Withdrawal failed. Please try again.");
      }
    } catch (e) {
      setWithdrawError(e instanceof Error ? e.message : "Withdrawal failed.");
    } finally {
      setWithdrawing(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${label} copied`);
    }).catch(() => {
      showToast("Copy failed", false);
    });
  }

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
              toast.ok ? "bg-[#0D631B] text-white" : "bg-red-500 text-white"
            }`}
          >
            <i className={toast.ok ? "ri-checkbox-circle-line" : "ri-error-warning-line"} />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balance card */}
      <motion.div
        variants={scaleIn}
        whileHover={{ scale: 1.01 }}
        className="bg-white rounded-2xl p-5 md:p-8 border border-gray-100 relative overflow-hidden"
      >
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-100">
          <i className="ri-shield-line text-[80px] md:text-[120px]" />
        </div>
        <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">Available Balance</p>
        <p className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
          {wallet ? formatNaira(wallet.available_balance) : "₦0.00"}{" "}
          <span className="text-base md:text-lg font-medium text-gray-400">NGN</span>
        </p>
        {wallet && parseInt(wallet.pending_balance, 10) > 0 && (
          <p className="text-amber-600 text-xs mb-1 flex items-center gap-1">
            <i className="ri-lock-line" /> {formatNaira(wallet.pending_balance)} held in escrow
          </p>
        )}
        <div className="flex flex-wrap gap-3 mt-5">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowVaModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e8a000] text-white font-medium text-sm hover:bg-[#d09000] transition-colors"
          >
            <i className="ri-bank-card-line" /> Credit Wallet
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={openWithdraw}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-800 text-white font-medium text-sm hover:bg-gray-700 transition-colors"
          >
            <i className="ri-send-plane-line" /> Withdraw Funds
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRefreshBalance}
            disabled={refreshingBalance}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <i className={`ri-refresh-line ${refreshingBalance ? "animate-spin" : ""}`} />
            {refreshingBalance ? "Refreshing..." : "Refresh"}
          </motion.button>
        </div>
      </motion.div>

      {/* Withdraw Funds Panel */}
      <AnimatePresence>
        {showWithdraw && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            variants={fadeUp}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Withdraw Funds</h2>
                <p className="text-xs text-gray-400 mt-0.5">Transfer your available balance to your bank account</p>
              </div>
              <button onClick={() => setShowWithdraw(false)} className="text-gray-400 hover:text-gray-600 text-xl">
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₦)</label>
                <input
                  type="number"
                  min="100"
                  placeholder="Enter amount in Naira"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-800 bg-gray-50 focus:bg-white transition-colors"
                />
                {wallet && (
                  <p className="text-xs text-gray-400 mt-1">
                    Available: <span className="font-semibold text-gray-700">{formatNaira(wallet.available_balance)}</span>
                  </p>
                )}
              </div>

              {/* Bank */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bank</label>
                <select
                  value={withdrawBankCode}
                  onChange={(e) => { setWithdrawBankCode(e.target.value); setWithdrawAccountName(""); setVerifyError(""); }}
                  disabled={banksLoading}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-800 bg-white disabled:bg-gray-50"
                >
                  <option value="">{banksLoading ? "Loading banks…" : "Select a bank…"}</option>
                  {banks.map((b, i) => (
                    <option key={`${b.code}-${i}`} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="10-digit NUBAN"
                    value={withdrawAccountNumber}
                    onChange={(e) => {
                      setWithdrawAccountNumber(e.target.value.replace(/\D/g, ""));
                      setWithdrawAccountName("");
                      setVerifyError("");
                    }}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-800 bg-gray-50 focus:bg-white transition-colors"
                  />
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleVerifyBank}
                    disabled={verifying || withdrawAccountNumber.length !== 10 || !withdrawBankCode}
                    className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {verifying ? <i className="ri-loader-4-line animate-spin" /> : "Verify"}
                  </motion.button>
                </div>
                {verifyError && <p className="text-red-500 text-xs mt-1">{verifyError}</p>}
              </div>

              {/* Verified account name */}
              {withdrawAccountName && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-3 bg-green-50 rounded-xl border border-green-100"
                >
                  <i className="ri-checkbox-circle-line text-[#0D631B]" />
                  <div>
                    <p className="text-xs text-gray-500">Account Name</p>
                    <p className="text-sm font-bold text-gray-900">{withdrawAccountName}</p>
                  </div>
                </motion.div>
              )}

              {/* Info note */}
              <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-blue-700 border border-blue-100">
                <i className="ri-information-line mt-0.5 flex-shrink-0" />
                <span>Funds will be transferred to your bank account. Processing may take a few minutes. Minimum withdrawal is ₦100.</span>
              </div>

              {withdrawError && (
                <p className="text-red-500 text-xs p-2.5 bg-red-50 rounded-xl">{withdrawError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowWithdraw(false)}
                  disabled={withdrawing}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleWithdraw}
                  disabled={withdrawing || !withdrawAccountName}
                  className="flex-1 py-3 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {withdrawing
                    ? <><i className="ri-loader-4-line animate-spin" /> Processing…</>
                    : <><i className="ri-send-plane-line" /> Withdraw</>
                  }
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Virtual Account Section */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Virtual Account</h2>
          {virtualAccount && (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold capitalize ${
              virtualAccount.status === "active"    ? "bg-green-100 text-[#0D631B]" :
              virtualAccount.status === "suspended" ? "bg-amber-50 text-amber-600" :
                                                      "bg-red-50 text-red-500"
            }`}>
              <i className={
                virtualAccount.status === "active"    ? "ri-checkbox-circle-line" :
                virtualAccount.status === "suspended" ? "ri-pause-circle-line" :
                                                        "ri-close-circle-line"
              } />
              {virtualAccount.status}
            </span>
          )}
        </div>

        {vaLoading ? (
          <div className="flex justify-center py-12">
            <i className="ri-loader-4-line animate-spin text-[#0D631B] text-2xl" />
          </div>
        ) : !virtualAccount ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <i className="ri-bank-line text-3xl mb-2" />
            <p className="text-sm mb-1">No virtual account created yet.</p>
            <p className="text-xs text-gray-400 mb-4">Create one to fund your wallet via bank transfer.</p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowVaModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D631B] text-white font-medium text-sm hover:bg-green-700 transition-colors"
            >
              <i className="ri-add-line" /> Create Virtual Account
            </motion.button>
          </div>
        ) : (
          <div className="p-4 md:p-6 space-y-4">
            {/* Account details card */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank Name</span>
                <span className="text-sm font-bold text-gray-900">{virtualAccount.bank_name}</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Number</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900 tracking-wider">
                    {virtualAccount.bank_account_number}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => copyToClipboard(virtualAccount.bank_account_number, "Account number")}
                    className="text-gray-400 hover:text-[#0D631B] transition-colors"
                    title="Copy account number"
                  >
                    <i className="ri-file-copy-line" />
                  </motion.button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Name</span>
                <span className="text-sm font-medium text-gray-900">{virtualAccount.bank_account_name}</span>
              </div>
            </div>

            {virtualAccount.status === "suspended" && (
              <div className="bg-amber-50 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-amber-700 border border-amber-100">
                <i className="ri-pause-circle-line mt-0.5 flex-shrink-0" />
                <span>This virtual account is suspended. Transfers to this account will not be credited. Contact support to reactivate.</span>
              </div>
            )}

            {virtualAccount.status === "active" && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-start gap-3">
                  <i className="ri-information-line text-blue-600 text-xl mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">How to fund your wallet</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Transfer any amount to the account number above from any Nigerian bank. Funds are credited automatically within minutes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => copyToClipboard(virtualAccount.bank_account_number, "Account number")}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                <i className="ri-file-copy-line" /> Copy Account Number
              </motion.button>
              {virtualAccount.status === "active" && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSuspend}
                  disabled={suspending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors disabled:opacity-60"
                >
                  {suspending
                    ? <><i className="ri-loader-4-line animate-spin" /> Suspending...</>
                    : <><i className="ri-pause-circle-line" /> Suspend Account</>
                  }
                </motion.button>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Virtual Account Creation Modal */}
      <AnimatePresence>
        {showVaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !creatingVa && setShowVaModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Create Virtual Account</h3>
              <p className="text-sm text-gray-600 mb-6">
                A dedicated bank account number will be generated for you. Transfer any amount to it and your wallet will be credited automatically.
              </p>
              <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-blue-700 mb-6">
                <i className="ri-information-line mt-0.5 flex-shrink-0" />
                <span>Each user gets one permanent virtual account. This cannot be undone.</span>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowVaModal(false)}
                  disabled={creatingVa}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreateVirtualAccount}
                  disabled={creatingVa}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#0D631B] text-white font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingVa
                    ? <><i className="ri-loader-4-line animate-spin" /> Creating...</>
                    : "Create Account"
                  }
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction History */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
          <button
            onClick={loadTransactions}
            className="text-xs text-gray-400 hover:text-[#0D631B] flex items-center gap-1 transition-colors"
          >
            <i className="ri-refresh-line" /> Refresh
          </button>
        </div>

        {txLoading ? (
          <div className="flex justify-center py-12">
            <i className="ri-loader-4-line animate-spin text-[#0D631B] text-2xl" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <i className="ri-file-list-3-line text-3xl mb-2" />
            <p className="text-sm">No transactions yet.</p>
          </div>
        ) : (
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
                  <motion.tr
                    key={t.transaction_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.06 }}
                    className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 md:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString("en-NG", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {t.description ?? (t.reference_type
                          ? `${t.reference_type.replace(/_/g, " ")} #${t.reference_id?.slice(0, 8)}`
                          : "Transaction")}
                      </p>
                    </td>
                    <td className={`px-4 md:px-6 py-4 text-sm font-semibold ${
                      t.type === "credit" ? "text-[#0D631B]" : "text-red-500"
                    }`}>
                      {t.type === "credit" ? "Credit" : "Debit"}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {t.type === "debit" ? "−" : "+"}{formatNaira(t.amount)}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                        t.status === "completed" ? "bg-green-100 text-[#0D631B]" :
                        t.status === "pending"   ? "bg-blue-50 text-blue-600" :
                                                   "bg-red-50 text-red-500"
                      }`}>
                        {t.status === "pending" && <i className="ri-lock-line" />}
                        {t.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
