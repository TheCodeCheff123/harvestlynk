"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion";

interface PredictionResult {
  filename: string;
  prediction: string;
  treatment: string;
  confidence: number;
  status: string;
}

export default function AICropDoctor() {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [showCamera]);

  async function analyzeImage(file: File, dataUrl: string) {
    setImage(dataUrl);
    setImageFile(file);
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/predict`, {
        method: "POST",
        headers: { accept: "application/json" },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server responded ${res.status}: ${text}`);
      }

      const data: PredictionResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch {
      galleryRef.current?.click();
    }
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    stopCamera();
    // Convert data URL to File for API
    fetch(dataUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        analyzeImage(file, dataUrl);
      });
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  }

  function onGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => analyzeImage(file, ev.target?.result as string);
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  function reset() {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setError(null);
    setAnalyzing(false);
  }

  // Parse "Apple Apple_scab" → "Apple Scab" style display
  function formatPrediction(raw: string) {
    return raw
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const confidencePct = result ? Math.round(result.confidence * 100) : 0;
  const severityLabel = confidencePct >= 80 ? "High Priority" : confidencePct >= 50 ? "Medium Priority" : "Low Priority";
  const severityColor = confidencePct >= 80 ? "text-red-600" : confidencePct >= 50 ? "text-amber-600" : "text-green-600";
  const severityBg = confidencePct >= 80 ? "border-red-100 bg-red-50" : confidencePct >= 50 ? "border-amber-100 bg-amber-50" : "border-green-100 bg-green-50";

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-bold text-gray-900">AI Crop Doctor</h1>
        <p className="text-[#40493D] mt-1">
          Upload a photo of your crops for instant AI diagnosis and expert treatment recommendations.
        </p>
      </motion.div>

      {/* Hidden gallery input */}
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onGalleryChange} />

      {/* Camera modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-2xl overflow-hidden w-full max-w-lg"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Take a Photo</h3>
                <button onClick={stopCamera} className="text-gray-400 hover:text-gray-700 transition-colors">
                  <i className="ri-close-line text-xl" />
                </button>
              </div>
              <video ref={videoRef} autoPlay playsInline className="w-full aspect-video bg-black" />
              <div className="px-5 py-5 flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={capturePhoto}
                  className="w-14 h-14 rounded-full bg-[#0D631B] flex items-center justify-center hover:bg-[#0a4f15] transition-colors"
                >
                  <i className="ri-camera-line text-white text-2xl" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* Upload prompt */}
        {!image && (
          <motion.div
            key="upload"
            variants={scaleIn}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="rounded-2xl border border-gray-100 p-6 sm:p-12 flex flex-col items-center text-center bg-white"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 260 }}
              className="w-20 h-20 rounded-2xl bg-[#e8f5e9] flex items-center justify-center mb-6"
            >
              <i className="ri-leaf-line text-[#0D631B] text-4xl" />
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Crop Image</h2>
            <p className="text-gray-500 text-sm max-w-xs mb-8">
              Take a clear photo of the leaves, stem, or fruit showing signs of disease.
            </p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={openCamera}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#0D631B] text-white font-medium hover:bg-[#0a4f15] transition-colors"
              >
                <i className="ri-camera-line" /> Take a Photo
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => galleryRef.current?.click()}
                className="flex items-center gap-2 px-8 py-3 rounded-xl border-2 border-[#0D631B] text-[#0D631B] font-medium hover:bg-[#e8f5e9] transition-colors"
              >
                <i className="ri-image-add-line" /> Choose from Gallery
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Analyzing */}
        {image && analyzing && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="rounded-2xl border border-gray-100 p-6 sm:p-12 flex flex-col items-center text-center bg-white"
          >
            <img src={image} alt="Uploaded crop" className="w-32 h-32 object-cover rounded-xl mb-6" />
            <div className="flex items-center gap-3 text-[#0D631B] font-medium">
              <i className="ri-loader-4-line animate-spin text-2xl" />
              Analyzing crop image...
            </div>
            <p className="text-gray-400 text-sm mt-2">AI is scanning for diseases and health patterns</p>
          </motion.div>
        )}

        {/* Error state */}
        {image && !analyzing && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-red-100 bg-red-50 p-6 flex flex-col items-center text-center"
          >
            <i className="ri-error-warning-line text-red-500 text-4xl mb-3" />
            <h3 className="text-base font-bold text-red-700 mb-1">Analysis Failed</h3>
            <p className="text-red-500 text-sm mb-5 max-w-sm">{error}</p>
            <div className="flex gap-3 flex-wrap justify-center">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => imageFile && analyzeImage(imageFile, image)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors"
              >
                <i className="ri-refresh-line" /> Retry
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={reset}
                className="flex items-center gap-2 px-5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                <i className="ri-arrow-left-line" /> Try Another Image
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Result */}
        {image && !analyzing && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-gray-100 bg-white overflow-hidden"
          >
            <div className="flex justify-end px-6 pt-5">
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 260 }}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold"
              >
                <i className="ri-checkbox-circle-fill" /> AI Verified
              </motion.span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 px-4 md:px-6 pb-6">
              {/* Left */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-start gap-4 mb-6">
                  <img src={image} alt="Analyzed crop" className="w-24 h-24 object-cover rounded-xl flex-shrink-0" />
                  <div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-red-300 text-red-600 text-xs font-semibold mb-2">
                      <i className="ri-alert-line" /> DIAGNOSIS CONFIRMED
                    </span>
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                      {formatPrediction(result.prediction)}
                    </h2>
                    <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                      <i className="ri-file-line" /> {result.filename}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 }}
                    className="rounded-xl border border-gray-100 p-4"
                  >
                    <p className="text-xs font-semibold text-gray-500 tracking-wide mb-2">AI CONFIDENCE</p>
                    <p className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                      {confidencePct}% <i className="ri-shield-check-line text-[#0D631B] text-lg" />
                    </p>
                    <div className="w-full h-2 rounded-full bg-gray-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${confidencePct}%` }}
                        transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                        className="h-2 rounded-full bg-[#0D631B]"
                      />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 }}
                    className={`rounded-xl border p-4 ${severityBg}`}
                  >
                    <p className={`text-xs font-semibold tracking-wide mb-2 flex items-center gap-1 ${severityColor}`}>
                      <i className="ri-error-warning-line" /> RISK SEVERITY
                    </p>
                    <p className={`text-lg font-bold ${severityColor}`}>{severityLabel}</p>
                    <p className={`text-xs mt-1 ${severityColor} opacity-80`}>
                      {confidencePct >= 80 ? "Immediate action required" : confidencePct >= 50 ? "Monitor closely" : "Low risk detected"}
                    </p>
                  </motion.div>
                </div>
              </motion.div>

              {/* Right */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <i className="ri-first-aid-kit-line text-[#0D631B]" /> Recommended Treatment
                </h3>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl bg-[#f0f7f0] border-l-4 border-[#0D631B] p-4 mb-6"
                >
                  <p className="text-sm font-semibold text-[#0D631B] mb-1">Treatment Plan</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{result.treatment}</p>
                </motion.div>

                <div className="border-t border-gray-100 pt-5">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <i className="ri-checkbox-multiple-line text-[#0D631B]" /> General Action Plan
                  </h3>
                  <ol className="space-y-4">
                    {[
                      { title: "Isolate Affected Plants", desc: "Separate visibly infected plants immediately to stop spread." },
                      { title: "Apply Treatment", desc: result.treatment },
                      { title: "Monitor Daily", desc: "Check new growth every morning for recurring symptoms." },
                    ].map((step, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <span className="w-6 h-6 rounded-full bg-[#0D631B] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{step.desc}</p>
                        </div>
                      </motion.li>
                    ))}
                  </ol>
                </div>
              </motion.div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={reset}
                className="flex items-center gap-2 px-5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                <i className="ri-refresh-line" /> Scan Another Crop
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
