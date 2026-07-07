"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { walletApi, usersApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// ─── Step bar ────────────────────────────────────────────────────────────────

const STEP_LABELS = ["Bank Account", "Identity Verification", "Farm Verification", "Complete"];

function StepBar({ step }: { step: number }) {
  return (
    <div className="bg-gray-50 border-b border-gray-100 px-4 py-5">
      <div className="overflow-x-auto">
        <div className="flex items-center min-w-fit mx-auto max-w-2xl">
          {STEP_LABELS.map((label, i) => {
            const idx = i + 1;
            const done = step > idx;
            const active = step === idx;
            return (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors
                    ${done ? "bg-[#0D631B] border-[#0D631B] text-white"
                      : active ? "bg-white border-[#0D631B] text-[#0D631B]"
                      : "bg-white border-gray-300 text-gray-400"}`}>
                    {done ? <i className="ri-check-line" /> : idx}
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap
                    ${active ? "text-[#0D631B]" : done ? "text-gray-700" : "text-gray-400"}`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`w-12 sm:w-20 h-px mx-2 mb-5 flex-shrink-0 ${done ? "bg-[#0D631B]" : "bg-gray-300"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Bank Account ────────────────────────────────────────────────────

function StepBankAccount({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const [banks, setBanks] = useState<{ code: string; name: string }[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    walletApi.getBanks()
      .then((res) => setBanks(res.banks))
      .catch(() => {})
      .finally(() => setBanksLoading(false));
  }, []);

  async function handleVerify() {
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

  async function handleSaveAndContinue() {
    if (!accountName) { setSaveError("Please verify your bank account first."); return; }
    const bankName = banks.find((b) => b.code === bankCode)?.name ?? bankCode;
    setSaving(true);
    setSaveError("");
    try {
      await usersApi.updateUser({
        bankName,
        bankAccountNumber: accountNumber,
        bankAccountName: accountName,
      });
      onContinue();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save bank details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Link Your Bank Account</h2>
        <p className="text-gray-500 text-sm mt-2 leading-relaxed">
          Link your bank account so we can process your withdrawals instantly when buyers confirm delivery.
          You can skip this for now and add it from your wallet settings later.
        </p>
      </div>

      <div className="border border-gray-200 rounded-2xl p-6 space-y-5">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
          <i className="ri-bank-line text-blue-600 text-2xl" />
        </div>

        {/* Bank */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Bank</label>
          <select
            value={bankCode}
            onChange={(e) => { setBankCode(e.target.value); setAccountName(""); setVerifyError(""); }}
            disabled={banksLoading}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0D631B] bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
          >
            <option value="">{banksLoading ? "Loading banks…" : "Select your bank…"}</option>
            {banks.map((b, i) => (
              <option key={`${b.code}-${i}`} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Account number */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
          <div className="flex gap-2">
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
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0D631B] bg-gray-50"
            />
            <button
              onClick={handleVerify}
              disabled={banksLoading || verifying || accountNumber.length !== 10 || !bankCode}
              className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {banksLoading || verifying ? <i className="ri-loader-4-line animate-spin" /> : "Verify"}
            </button>
          </div>
          {verifyError && <p className="text-red-500 text-xs mt-1">{verifyError}</p>}
        </div>

        {/* Verified name */}
        {accountName && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-3 bg-green-50 rounded-xl border border-green-100"
          >
            <i className="ri-checkbox-circle-line text-[#0D631B]" />
            <div>
              <p className="text-xs text-gray-500">Account Holder</p>
              <p className="text-sm font-bold text-gray-900">{accountName}</p>
            </div>
          </motion.div>
        )}

        {saveError && <p className="text-red-500 text-xs p-2.5 bg-red-50 rounded-xl">{saveError}</p>}
      </div>

      <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-blue-700">
        <i className="ri-shield-check-line mt-0.5 flex-shrink-0" />
        <span>Your bank details are encrypted and only used for secure payouts. You can always update them in your wallet settings.</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Skip for now
        </button>
        <button
          onClick={handleSaveAndContinue}
          disabled={saving || !accountName}
          className="px-8 py-3 rounded-xl bg-[#0D631B] text-white font-semibold text-sm hover:bg-[#0a4f15] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <><i className="ri-loader-4-line animate-spin" /> Saving…</> : <>Save & Continue <i className="ri-arrow-right-line" /></>}
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Identity Verification ──────────────────────────────────────────

function StepIdentity({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const [file, setFile] = useState<{ name: string; preview: string } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setError("");
    if (f.size > 5 * 1024 * 1024) {
      setError("File exceeds 5MB limit. Please choose a smaller image.");
      return;
    }
    if (!f.type.startsWith("image/")) {
      setError("Only image files are accepted.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setFile({ name: f.name, preview: e.target?.result as string });
    reader.readAsDataURL(f);
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Verify Your Identity</h2>
        <p className="text-gray-500 text-sm mt-2 leading-relaxed">
          To protect our marketplace and ensure secure escrow payments, we need to verify your official credentials.
          Verified farmers get 3x more visibility and instant trust badges.
        </p>
      </div>

      {/* NIN upload card */}
      <div className="border border-gray-200 rounded-2xl p-6">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
          <i className="ri-id-card-line text-[#0D631B] text-2xl" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Upload NIN</h3>
        <p className="text-gray-500 text-sm mb-5">
          Take a photo of your National Identity Number card or slip. Recommended for faster processing.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {file ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            <img src={file.preview} alt="NIN preview" className="w-full max-h-48 object-contain rounded-xl border border-gray-200 bg-gray-50" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-1.5">
                <i className="ri-image-line text-[#0D631B]" /> {file.name}
              </span>
              <button onClick={() => setFile(null)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                <i className="ri-delete-bin-line" /> Remove
              </button>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="text-[#0D631B] font-semibold text-sm flex items-center gap-1 hover:underline"
          >
            Start Upload <i className="ri-arrow-right-line" />
          </button>
        )}

        {error && (
          <p className="mt-3 text-red-500 text-xs flex items-center gap-1">
            <i className="ri-error-warning-line" /> {error}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Farm Verification ───────────────────────────────────────────────

const CROPS = [
  { id: "maize", label: "Maize", icon: "ri-seedling-line" },
  { id: "cassava", label: "Cassava", icon: "ri-plant-line" },
  { id: "rice", label: "Rice", icon: "ri-leaf-line" },
  { id: "yam", label: "Yam", icon: "ri-plant-line" },
  { id: "tomato", label: "Tomatoes", icon: "ri-leaf-line" },
  { id: "cocoa", label: "Cocoa", icon: "ri-seedling-line" },
];

interface DocFile { name: string; size: string; }

function StepFarm({ onContinue, onBack }: { onContinue: () => void; onBack: () => void }) {
  const [selectedCrops, setSelectedCrops] = useState<string[]>(["maize"]);
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [docError, setDocError] = useState("");
  const [pinned, setPinned] = useState(false);
  const docRef = useRef<HTMLInputElement>(null);

  function toggleCrop(id: string) {
    setSelectedCrops((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }

  function handleDocs(files: FileList | null) {
    if (!files) return;
    setDocError("");
    const newDocs: DocFile[] = [];
    Array.from(files).forEach((f) => {
      if (f.size > 10 * 1024 * 1024) { setDocError(`"${f.name}" exceeds 10MB limit.`); return; }
      const allowed = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowed.includes(f.type)) { setDocError(`"${f.name}" is not a PDF, JPG, or PNG.`); return; }
      if (docs.find((d) => d.name === f.name)) return;
      const kb = f.size / 1024;
      newDocs.push({ name: f.name, size: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB` });
    });
    setDocs((prev) => [...prev, ...newDocs]);
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-6">
      {/* Farm Location */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-2">Farm Location &amp; Boundary</h3>
        <div
          onClick={() => setPinned(true)}
          className="relative h-44 rounded-2xl overflow-hidden cursor-pointer border border-gray-200 bg-gradient-to-br from-green-200 to-green-400 flex items-center justify-center"
        >
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-30 pointer-events-none">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className={`border border-green-600 ${i % 3 === 0 ? "bg-green-500" : i % 2 === 0 ? "bg-green-400" : "bg-green-300"}`} />
            ))}
          </div>
          <div className="relative z-10 flex flex-col items-center gap-1 text-white">
            <i className={`ri-map-pin-2-fill text-3xl drop-shadow ${pinned ? "text-red-400" : "text-white"}`} />
            <span className="text-sm font-semibold drop-shadow">{pinned ? "Location Pinned ✓" : "Tap to Pin Location"}</span>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-green-50 text-xs text-gray-600">
          <i className="ri-refresh-line text-[#0D631B] mt-0.5 flex-shrink-0" />
          <p>Our system uses <span className="text-[#0D631B] font-semibold">AI Satellite Imagery Analysis</span> to verify your farm&apos;s presence and productivity history.</p>
        </div>
      </div>

      {/* Farm size + production type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Farm Size</label>
          <div className="flex min-w-0">
            <input
              type="number"
              placeholder="0.00"
              className="min-w-0 flex-1 px-3 py-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B]"
            />
            <span className="px-3 py-3 rounded-r-xl border border-gray-200 bg-gray-100 text-sm text-gray-500 whitespace-nowrap flex-shrink-0">Hectares</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Primary Production Type</label>
          <div className="relative">
            <select className="w-full appearance-none px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] pr-10">
              <option>Crop Farming</option>
              <option>Livestock</option>
              <option>Aquaculture</option>
              <option>Mixed Farming</option>
            </select>
            <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Crop selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Main Crops / Livestock</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {CROPS.map((c) => {
            const active = selectedCrops.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCrop(c.id)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 transition-colors text-xs font-semibold
                  ${active ? "border-[#0D631B] bg-green-50 text-[#0D631B]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
              >
                <i className={`${c.icon} text-lg`} />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ownership Documents */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-0.5">Ownership Documents</label>
        <p className="text-xs text-gray-400 mb-3">Upload your C of O or Local Government Ownership Letter</p>

        <input
          ref={docRef}
          type="file"
          accept=".pdf,image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(e) => handleDocs(e.target.files)}
        />

        <div
          onClick={() => docRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleDocs(e.dataTransfer.files); }}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center text-center cursor-pointer hover:border-[#0D631B] hover:bg-green-50/30 transition-colors"
        >
          <i className="ri-upload-cloud-2-line text-[#0D631B] text-3xl mb-2" />
          <p className="text-sm font-semibold text-gray-800">Drop files here or click to upload</p>
          <p className="text-xs text-gray-400 mt-1">PDF, JPG, or PNG (Max 10MB)</p>
        </div>

        {docError && (
          <p className="mt-2 text-red-500 text-xs flex items-center gap-1">
            <i className="ri-error-warning-line" /> {docError}
          </p>
        )}

        {docs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex flex-wrap gap-2"
          >
            {docs.map((d) => (
              <div key={d.name} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-green-50 border border-green-200 text-xs">
                <i className="ri-file-line text-[#0D631B]" />
                <span className="font-medium text-gray-800 max-w-[120px] truncate">{d.name}</span>
                <span className="text-gray-400">{d.size}</span>
                <button
                  onClick={() => setDocs((prev) => prev.filter((f) => f.name !== d.name))}
                  className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                >
                  <i className="ri-close-line text-sm" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Step 4: Complete ────────────────────────────────────────────────────────

function StepComplete({ skipped, onDashboard, onListProduct }: { skipped: boolean; onDashboard: () => void; onListProduct: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10"
    >
      <div className="relative mb-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${skipped ? "bg-amber-500" : "bg-[#0D631B]"}`}>
            <i className={`text-white text-3xl ${skipped ? "ri-time-line" : "ri-check-line"}`} />
          </div>
        </motion.div>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 260 }}
          className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md"
        >
          <i className="ri-tractor-line text-white text-lg" />
        </motion.div>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-2xl md:text-3xl font-bold text-gray-900 mb-3"
      >
        {skipped ? "Setup Skipped" : "You're All Set!"}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-gray-500 text-sm max-w-sm leading-relaxed mb-4"
      >
        {skipped
          ? "Your account is marked as unverified. You can complete verification anytime from your profile or notifications page to unlock full access."
          : "Your farm profile is now being reviewed by our AI verification team. Most verifications are completed within 24 hours."}
      </motion.p>

      {skipped && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8 flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold"
        >
          <i className="ri-error-warning-line" /> Account status: <span className="font-bold">Unverified</span>
        </motion.div>
      )}

      {!skipped && <div className="mb-8" />}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onDashboard}
          className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#0D631B] text-white font-semibold hover:bg-[#0a4f15] transition-colors"
        >
          Go to Dashboard <i className="ri-arrow-right-line" />
        </motion.button>
        {!skipped && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onListProduct}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors"
          >
            List Your First Product
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function FarmerOnboard() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [skipped, setSkipped] = useState(false);

  function handleSkip() {
    if (typeof window !== "undefined") {
      localStorage.setItem("hl_farmer_verified", "false");
    }
    setSkipped(true);
    setStep(4);
  }

  function handleContinue() {
    if (step < 4) setStep((s) => s + 1);
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  async function handleDashboard() {
    if (!skipped && typeof window !== "undefined") {
      localStorage.setItem("hl_farmer_verified", "true");
    }
    await refreshUser().catch(() => {});
    router.push("/dashboard/farmer");
  }

  function handleListProduct() {
    if (!skipped && typeof window !== "undefined") {
      localStorage.setItem("hl_farmer_verified", "true");
    }
    router.push("/dashboard/farmer/farm?list=true");
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <StepBar step={step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col"
        >
          {step === 1 && <StepBankAccount onContinue={handleContinue} onSkip={() => { setStep(2); }} />}
          {step === 2 && <StepIdentity onContinue={handleContinue} onSkip={handleSkip} />}
          {step === 3 && <StepFarm onContinue={handleContinue} onBack={handleBack} />}
          {step === 4 && <StepComplete skipped={skipped} onDashboard={handleDashboard} onListProduct={handleListProduct} />}
        </motion.div>
      </AnimatePresence>

      {/* Bottom bar */}
      {step < 4 && step !== 1 && (
        <div className="border-t border-gray-100 bg-white px-6 py-4 flex items-center justify-between gap-4">
          {step === 2 ? (
            <button onClick={handleSkip} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Skip for now, I&apos;ll do this later
            </button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleBack}
              className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Back
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleContinue}
            className={`px-8 py-3 rounded-xl text-white font-semibold text-sm transition-colors
              ${step === 3 ? "bg-amber-500 hover:bg-amber-600" : "bg-[#0D631B] hover:bg-[#0a4f15]"}`}
          >
            {step === 2 ? "Continue to Verification" : "Continue to Review"}
          </motion.button>
        </div>
      )}
    </div>
  );
}
