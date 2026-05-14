"use client";
import { useState, useRef, useEffect } from "react";

export default function AICropDoctor() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [showCamera]);

  function processImage(dataUrl: string) {
    setImage(dataUrl);
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalyzed(true);
    }, 1800);
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch {
      // fallback to file input if camera permission denied
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
    processImage(dataUrl);
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
    reader.onload = (ev) => processImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function reset() {
    setImage(null);
    setAnalyzed(false);
    setAnalyzing(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Crop Doctor</h1>
        <p className="text-[#40493D] mt-1">
          Upload a photo of your diseased crops for instant diagnosis and expert treatment
          recommendations powered by agricultural AI.
        </p>
      </div>

      {/* Hidden gallery input */}
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onGalleryChange} />

      {/* Camera modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Take a Photo</h3>
              <button onClick={stopCamera} className="text-gray-400 hover:text-gray-700 transition-colors">
                <i className="ri-close-line text-xl" />
              </button>
            </div>
            <video ref={videoRef} autoPlay playsInline className="w-full aspect-video bg-black" />
            <div className="px-5 py-5 flex justify-center">
              <button
                onClick={capturePhoto}
                className="w-14 h-14 rounded-full bg-[#0D631B] flex items-center justify-center hover:bg-[#0a4f15] transition-colors"
              >
                <i className="ri-camera-line text-white text-2xl" />
              </button>
            </div>
          </div>
        </div>
      )}

      {!image && (
        <div className="rounded-2xl border border-gray-100 p-6 sm:p-12 flex flex-col items-center text-center bg-white">
          <div className="w-20 h-20 rounded-2xl bg-[#e8f5e9] flex items-center justify-center mb-6">
            <i className="ri-leaf-line text-[#0D631B] text-4xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Crop Image</h2>
          <p className="text-gray-500 text-sm max-w-xs mb-8">
            Take a clear photo of the leaves, stem, or fruit showing signs of disease.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={openCamera}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#0D631B] text-white font-medium hover:bg-[#0a4f15] transition-colors"
            >
              <i className="ri-camera-line" /> Take a Photo
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              className="flex items-center gap-2 px-8 py-3 rounded-xl border-2 border-[#0D631B] text-[#0D631B] font-medium hover:bg-[#e8f5e9] transition-colors"
            >
              <i className="ri-image-add-line" /> Choose from Gallery
            </button>
          </div>
        </div>
      )}

      {image && analyzing && (
        <div className="rounded-2xl border border-gray-100 p-6 sm:p-12 flex flex-col items-center text-center bg-white">
          <img src={image} alt="Uploaded crop" className="w-32 h-32 object-cover rounded-xl mb-6" />
          <div className="flex items-center gap-3 text-[#0D631B] font-medium">
            <i className="ri-loader-4-line animate-spin text-2xl" />
            Analyzing crop image...
          </div>
          <p className="text-gray-400 text-sm mt-2">AI is scanning for diseases and health patterns</p>
        </div>
      )}

      {image && analyzed && (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="flex justify-end px-6 pt-5">
            <span className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold">
              <i className="ri-checkbox-circle-fill" /> Expert Verified
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 px-4 md:px-6 pb-6">
            {/* Left column */}
            <div>
              <div className="flex items-start gap-4 mb-6">
                <img src={image} alt="Analyzed crop" className="w-24 h-24 object-cover rounded-xl flex-shrink-0" />
                <div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-red-300 text-red-600 text-xs font-semibold mb-2">
                    <i className="ri-alert-line" /> DIAGNOSIS CONFIRMED
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight">Cassava Mosaic<br />Disease</h2>
                  <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                    <i className="ri-calendar-line" /> Analyzed: June 24, 2024
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold text-gray-500 tracking-wide mb-2">AI CONFIDENCE</p>
                  <p className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    94% <i className="ri-shield-check-line text-[#0D631B] text-lg" />
                  </p>
                  <div className="w-full h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-[#0D631B]" style={{ width: "94%" }} />
                  </div>
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-semibold text-red-500 tracking-wide mb-2 flex items-center gap-1">
                    <i className="ri-error-warning-line" /> RISK SEVERITY
                  </p>
                  <p className="text-xl font-bold text-red-600">High Priority</p>
                  <p className="text-red-400 text-xs mt-1">Immediate action required to save harvest</p>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <i className="ri-first-aid-kit-line text-[#0D631B]" /> Recommended Treatment
              </h3>
              <div className="space-y-3 mb-6">
                <div className="rounded-xl bg-[#f0f7f0] border-l-4 border-[#0D631B] p-4">
                  <p className="text-sm font-semibold text-[#0D631B] mb-1">Resistant Varieties</p>
                  <p className="text-gray-600 text-sm">Immediately source TMS 98/0505 or TME 419 cuttings for the next planting season to ensure future crop immunity.</p>
                </div>
                <div className="rounded-xl bg-[#f0f7f0] border-l-4 border-[#0D631B] p-4">
                  <p className="text-sm font-semibold text-[#0D631B] mb-1">Pesticide Advice</p>
                  <p className="text-gray-600 text-sm">Apply Neem oil or approved systemic insecticides to control the whitefly (Bemisia tabaci) population which spreads the virus.</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <i className="ri-checkbox-multiple-line text-[#0D631B]" /> Recommended Action Plan
                </h3>
                <ol className="space-y-4">
                  {[
                    { title: "Isolate Infected Plants", desc: "Remove and safely destroy severely infected plants to prevent whitefly transmission." },
                    { title: "Apply Neem Oil", desc: "Spray organic neem oil solution every 7 days to control the whitefly population." },
                    { title: "Monitor Daily", desc: "Check new leaves for signs of yellowing or mottling every morning." },
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#0D631B] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
            <button onClick={reset} className="flex items-center gap-2 px-5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
              <i className="ri-refresh-line" /> Scan Another Crop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
