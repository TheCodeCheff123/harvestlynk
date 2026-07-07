"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion";
import { useAuth } from "@/context/AuthContext";
import { walletApi, usersApi, formatNaira, nairaToKobo, Transaction } from "@/lib/api";

export default function Wallet() {
  const { wallet, refreshWallet } = useAuth();
  const searchParams = useSearchParams();
  const [amount, setAmount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [banks, setBanks] = useState<{ code: string; name: string }[]>([]);
  const [bankLoading, setBankLoading] = useState(true);
  const [bankError, setBankError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Top-up state
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Send to User state
  const [showSend, setShowSend] = useState(false);
  const [sendUsername, setSendUsername] = useState("");
  const [sendRecipientName, setSendRecipientName] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendNote, setSendNote] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");
  const [sendRecipientStatus, setSendRecipientStatus] = useState<"idle" | "checking" | "found" | "not_found">("idle");
  const sendDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSendUsernameChange(val: string) {
    setSendUsername(val);
    setSendRecipientName("");
    setSendRecipientStatus("idle");
    if (sendDebounce.current) clearTimeout(sendDebounce.current);
    const stripped = val.replace(/^@/, "").trim();
    if (!stripped) return;
    sendDebounce.current = setTimeout(async () => {
      setSendRecipientStatus("checking");
      try {
        const { available } = await usersApi.checkUsername(stripped);
        // "not available" = someone owns this username = user found
        if (!available) {
          setSendRecipientStatus("found");
          setSendRecipientName(stripped); // display handle; actual name comes with transfer response
        } else {
          setSendRecipientStatus("not_found");
          setSendRecipientName("");
        }
      } catch { setSendRecipientStatus("idle"); }
    }, 400);
  }

  async function handleSendTransfer() {
    const stripped = sendUsername.replace(/^@/, "").trim();
    if (!stripped) { setSendError("Enter a username."); return; }
    if (sendRecipientStatus !== "found") { setSendError("No user found with that username."); return; }
    const naira = parseFloat(sendAmount);
    if (!naira || naira < 100) { setSendError("Minimum transfer is ₦100."); return; }
    setSendLoading(true);
    setSendError("");
    setSendSuccess("");
    try {
      const res = await walletApi.internalTransfer({ to_username: stripped, amount: nairaToKobo(naira), note: sendNote.trim() || undefined });
      setSendSuccess(`₦${naira.toLocaleString("en-NG")} sent to @${res.recipient_username} (${res.recipient_name})`);
      setSendUsername(""); setSendAmount(""); setSendNote(""); setSendRecipientName(""); setSendRecipientStatus("idle");
      await refreshWallet();
      walletApi.getTransactions().then(setTransactions).catch(() => {});
      setTimeout(() => { setShowSend(false); setSendSuccess(""); }, 2500);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Transfer failed.");
    } finally {
      setSendLoading(false);
    }
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    refreshWallet();
    walletApi.getTransactions()
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setTxLoading(false));

    walletApi.getBanks()
      .then((res) => setBanks(res.banks))
      .catch((error) => {
        console.warn("Failed to load bank list", error);
        setBankError("Unable to load bank list. Using default options.");
      })
      .finally(() => setBankLoading(false));
  }, [refreshWallet]);

  // Auto-refresh when Nomba redirects back with ?topup=success.
  // Call refreshBalance() first so any missed webhook credit is applied
  // before we read the balance from DB.
  useEffect(() => {
    if (searchParams.get("topup") === "success") {
      setRefreshing(true);
      walletApi.refreshBalance()
        .catch(() => {})
        .then(() => refreshWallet())
        .then(() => walletApi.getTransactions().then(setTransactions).catch(() => {}))
        .then(() => showToast("Wallet credited successfully!"))
        .finally(() => setRefreshing(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await walletApi.refreshBalance().catch(() => {});
      await refreshWallet();
      walletApi.getTransactions().then(setTransactions).catch(() => {});
    } finally {
      setRefreshing(false);
    }
  }

  async function handleTopup() {
    const naira = parseFloat(topupAmount);
    if (!naira || naira < 100) { setTopupError("Minimum top-up is ₦100."); return; }
    setTopupLoading(true);
    setTopupError("");
    try {
      const { checkout_url } = await walletApi.createTopup(nairaToKobo(naira));
      window.open(checkout_url, "_blank", "noopener,noreferrer");
      setShowTopup(false);
      setTopupAmount("");
      showToast("Payment page opened — complete your payment in the new tab");
    } catch (e) {
      setTopupError(e instanceof Error ? e.message : "Failed to initiate payment");
    } finally {
      setTopupLoading(false);
    }
  }

  const availableKobo = wallet ? parseInt(wallet.available_balance, 10) : 0;
  const availableNaira = availableKobo / 100;

  async function handleVerifyBank() {
    if (!bankCode) { setVerifyError("Please select a bank."); return; }
    if (accountNumber.length !== 10) { setVerifyError("Account number must be 10 digits."); return; }
    setVerifying(true);
    setVerifyError("");
    setAccountName("");
    try {
      const res = await walletApi.verifyBank(bankCode, accountNumber);
      if (res.success) {
        setAccountName(res.data.account_name);
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
    const naira = parseFloat(amount);
    if (!naira || naira < 100) {
      setWithdrawError("Minimum withdrawal is ₦100.");
      return;
    }
    if (naira > availableNaira) {
      setWithdrawError(`Amount exceeds available balance of ${formatNaira(availableKobo)}.`);
      return;
    }
    if (!accountName) {
      setWithdrawError("Please verify your bank account first.");
      return;
    }
    const bankName = banks.find((b) => b.code === bankCode)?.name ?? bankCode;
    setWithdrawing(true);
    setWithdrawError("");
    setWithdrawSuccess("");
    try {
      const res = await walletApi.withdraw({
        amount: nairaToKobo(naira),
        bank_name: bankName,
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
      });
      if (res.success) {
        setWithdrawSuccess(`Withdrawal of ${formatNaira(nairaToKobo(naira))} initiated. Ref: ${res.transaction_id}`);
        setAmount("");
        await refreshWallet();
        // Refresh transactions
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

  const recentWithdrawals = transactions.filter((t) => t.type === "debit").slice(0, 5);

  const topupModal = (
    <AnimatePresence>
      {showTopup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !topupLoading && setShowTopup(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-1">Add Money to Wallet</h3>
            <p className="text-sm text-gray-500 mb-5">Pay by card or instant bank transfer — powered by Nomba.</p>

            <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₦)</label>
            <input
              type="number"
              min="100"
              placeholder="Enter amount e.g. 500"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0D631B] bg-gray-50 focus:bg-white transition-colors mb-1"
              autoFocus
            />
            <p className="text-xs text-gray-400 mb-4">Minimum ₦100</p>

            {topupError && (
              <p className="text-red-500 text-xs mb-3 px-3 py-2 bg-red-50 rounded-xl">{topupError}</p>
            )}

            <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-blue-700 mb-5">
              <i className="ri-information-line mt-0.5 flex-shrink-0" />
              <span>A secure Nomba payment page will open in a new tab. Pay by card or bank transfer. Your wallet is credited automatically on payment.</span>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowTopup(false)}
                disabled={topupLoading}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleTopup}
                disabled={topupLoading || !topupAmount}
                className="flex-1 py-3 rounded-xl bg-[#e8a000] text-white text-sm font-semibold hover:bg-[#d09000] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {topupLoading
                  ? <><i className="ri-loader-4-line animate-spin" /> Opening…</>
                  : <><i className="ri-external-link-line" /> Pay Now</>
                }
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
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

      {topupModal}

      <motion.div variants={fadeUp}>
        <p className="text-[#0D631B] text-sm flex items-center gap-1 mb-1">
          <i className="ri-lock-line" /> Escrow Protected Funds
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Withdrawal Dashboard</h1>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col */}
        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
          {/* Available balance */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-white rounded-2xl shadow-sm p-5 md:p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-xs font-semibold tracking-widest uppercase">Available for Withdrawal</p>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1 text-xs text-[#0D631B] font-medium hover:underline disabled:opacity-50"
              >
                <i className={`ri-refresh-line ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-3xl md:text-4xl font-bold text-[#0D631B]">
                {wallet ? formatNaira(wallet.available_balance) : "₦0.00"}
              </p>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                <i className="ri-checkbox-circle-line" /> Verified
              </span>
            </div>
            {wallet && parseInt(wallet.pending_balance, 10) > 0 && (
              <p className="text-amber-600 text-xs mt-2 flex items-center gap-1">
                <i className="ri-lock-line" /> {formatNaira(wallet.pending_balance)} held in escrow
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setShowTopup(true); setTopupAmount(""); setTopupError(""); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e8a000] text-white font-medium text-sm hover:bg-[#d09000] transition-colors"
              >
                <i className="ri-bank-card-line" /> Add Money
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setShowSend((v) => !v); setSendError(""); setSendSuccess(""); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                <i className="ri-send-plane-line" /> Send to User
              </motion.button>
            </div>
          </motion.div>

          {/* Send to User panel */}
          <AnimatePresence>
            {showSend && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-white rounded-2xl border border-blue-100 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><i className="ri-send-plane-line text-blue-600" /> Send to User</h3>
                  <button onClick={() => setShowSend(false)} className="text-gray-400 hover:text-gray-600"><i className="ri-close-line" /></button>
                </div>
                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Recipient @username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">@</span>
                    <input
                      value={sendUsername.replace(/^@/, "")}
                      onChange={(e) => handleSendUsernameChange(e.target.value)}
                      placeholder="username"
                      className="w-full pl-7 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500"
                    />
                    {sendRecipientStatus === "checking" && <i className="ri-loader-4-line animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />}
                    {sendRecipientStatus === "found" && <i className="ri-checkbox-circle-line absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-sm" />}
                    {sendRecipientStatus === "not_found" && <i className="ri-close-circle-line absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-sm" />}
                  </div>
                  {sendRecipientStatus === "found" && <p className="text-green-600 text-xs mt-0.5">User found</p>}
                  {sendRecipientStatus === "not_found" && <p className="text-red-500 text-xs mt-0.5">No user with that username</p>}
                </div>
                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Amount (₦)</label>
                  <input
                    type="number"
                    min="100"
                    placeholder="0.00"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Minimum ₦100</p>
                </div>
                {/* Note */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Payment for seeds"
                    value={sendNote}
                    onChange={(e) => setSendNote(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                {/* Confirm summary */}
                {sendRecipientStatus === "found" && parseFloat(sendAmount) >= 100 && (
                  <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700">
                    You&apos;re sending <span className="font-bold">₦{parseFloat(sendAmount).toLocaleString("en-NG")}</span> to @{sendUsername.replace(/^@/, "")}
                  </div>
                )}
                {sendError && <p className="text-red-500 text-xs p-2 bg-red-50 rounded-xl">{sendError}</p>}
                {sendSuccess && <p className="text-green-600 text-xs p-2 bg-green-50 rounded-xl flex items-center gap-1"><i className="ri-checkbox-circle-line" /> {sendSuccess}</p>}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSendTransfer}
                  disabled={sendLoading || sendRecipientStatus !== "found"}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendLoading ? <><i className="ri-loader-4-line animate-spin" /> Sending…</> : <><i className="ri-send-plane-fill" /> Confirm Transfer</>}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Request Payout */}
          <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Request Payout</h2>

            <p className="text-sm font-medium text-gray-700 mb-2">Bank</p>
            <select
              value={bankCode}
              onChange={(e) => { setBankCode(e.target.value); setAccountName(""); setVerifyError(""); }}
              disabled={bankLoading}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0D631B] mb-4 bg-white disabled:cursor-not-allowed disabled:bg-gray-50"
            >
              <option value="">{bankLoading ? "Loading banks..." : "Select a bank..."}</option>
              {banks.map((b, index) => (
                <option key={`${b.code}-${index}`} value={b.code}>{b.name}</option>
              ))}
            </select>

            <p className="text-sm font-medium text-gray-700 mb-2">Account Number</p>
            <div className="flex gap-2 mb-1 md:flex-col">
              <input
                type="text"
                maxLength={10}
                placeholder="10-digit NUBAN"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value.replace(/\D/g, ""));
                  setAccountName("");
                  setVerifyError("");
                }}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0D631B]"
              />
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleVerifyBank}
                disabled={bankLoading || verifying || accountNumber.length !== 10 || !bankCode}
                className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {bankLoading || verifying ? <i className="ri-loader-4-line animate-spin" /> : "Verify"}
              </motion.button>
            </div>
            {bankError && <p className="text-amber-600 text-xs mb-2">{bankError}</p>}
            {verifyError && <p className="text-red-500 text-xs mb-2">{verifyError}</p>}
            {accountName && (
              <p className="text-green-700 text-xs font-semibold mb-3 flex items-center gap-1">
                <i className="ri-checkbox-circle-line" /> {accountName}
              </p>
            )}

            <p className="text-sm font-medium text-gray-700 mt-4 mb-2">Withdrawal Amount (₦)</p>
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
              <span>Min: ₦100 | Available: {wallet ? formatNaira(wallet.available_balance) : "₦0.00"}</span>
              <button
                onClick={() => setAmount(availableNaira.toFixed(2))}
                className="text-[#0D631B] font-medium hover:underline"
              >
                Withdraw All
              </button>
            </div>

            {withdrawError && (
              <p className="text-red-500 text-xs mb-3 p-3 bg-red-50 rounded-xl">{withdrawError}</p>
            )}
            {withdrawSuccess && (
              <p className="text-green-700 text-xs mb-3 p-3 bg-green-50 rounded-xl flex items-start gap-1">
                <i className="ri-checkbox-circle-line mt-0.5" /> {withdrawSuccess}
              </p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleWithdraw}
              disabled={withdrawing || !accountName || !amount}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#e8a000] text-white font-semibold hover:bg-[#d09000] transition-colors disabled:opacity-50"
            >
              {withdrawing
                ? <><i className="ri-loader-4-line animate-spin" /> Processing...</>
                : <><i className="ri-secure-payment-line" /> Process Secure Withdrawal</>
              }
            </motion.button>
            <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
              <i className="ri-shield-check-line" /> Encrypted by Nomba Instant Payment Gateway
            </p>
          </div>
        </motion.div>

        {/* Right col */}
        <motion.div variants={scaleIn} className="space-y-4">
          {/* Settlement Policy */}
          <div className="bg-[#0D631B] rounded-2xl shadow-sm p-5 text-white">
            <p className="font-semibold flex items-center gap-2 mb-3">
              <i className="ri-information-line" /> Settlement Policy
            </p>
            <p className="text-green-200 text-xs leading-relaxed mb-4">
              HarvestLynk ensures secure escrow for all transactions. A flat 10% platform commission applies to maintain the trust ecosystem.
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
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Recent Withdrawals</h3>
            {txLoading ? (
              <div className="flex justify-center py-6">
                <i className="ri-loader-4-line animate-spin text-[#0D631B] text-xl" />
              </div>
            ) : recentWithdrawals.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-4">No withdrawals yet.</p>
            ) : (
              <div className="space-y-4">
                {recentWithdrawals.map((tx, i) => (
                  <motion.div
                    key={tx.transaction_id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="flex items-center gap-3"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tx.status === "completed" ? "bg-green-50 text-green-500" :
                      tx.status === "pending"   ? "bg-amber-50 text-amber-500" :
                                                  "bg-red-50 text-red-500"
                    }`}>
                      <i className={`text-sm ${
                        tx.status === "completed" ? "ri-checkbox-circle-line" :
                        tx.status === "pending"   ? "ri-time-line" :
                                                    "ri-close-circle-line"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {tx.description ?? "Withdrawal"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(tx.created_at).toLocaleDateString("en-NG", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{formatNaira(tx.amount)}</p>
                      <p className={`text-xs font-medium capitalize ${
                        tx.status === "completed" ? "text-green-600" :
                        tx.status === "pending"   ? "text-amber-600" : "text-red-500"
                      }`}>{tx.status}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Full Transaction History */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
          <button
            onClick={() => {
              setTxLoading(true);
              walletApi.getTransactions().then(setTransactions).catch(() => {}).finally(() => setTxLoading(false));
            }}
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
                    transition={{ delay: 0.2 + i * 0.04 }}
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
                        t.status === "pending"   ? "bg-amber-50 text-amber-600" :
                                                   "bg-red-50 text-red-500"
                      }`}>
                        {t.status === "pending" && <i className="ri-time-line" />}
                        {t.status === "completed" ? "Completed" : t.status === "pending" ? "Pending" : "Failed"}
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
