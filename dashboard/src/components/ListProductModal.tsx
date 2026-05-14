"use client";
import { useRef, useState } from "react";

interface Props {
  onClose: () => void;
}

export default function ListProductModal({ onClose }: Props) {
  const photoRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">List New Product</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <i className="ri-close-line text-2xl" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-4 sm:px-7 py-6 space-y-7 flex-1">
          {/* Product Details */}
          <div>
            <p className="text-xs font-bold text-[#0D631B] tracking-widest uppercase mb-4">Product Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Produce Name</label>
                <input type="text" placeholder="e.g., Organic Cocoa" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Category</label>
                <div className="relative">
                  <select className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] appearance-none">
                    <option>Grains & Cereals</option>
                    <option>Tubers</option>
                    <option>Vegetables</option>
                    <option>Fruits</option>
                    <option>Livestock</option>
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Price per Unit (₦)</label>
                <input type="number" placeholder="0.00" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Available Quantity</label>
                <input type="text" placeholder="e.g., 50 Bags" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors" />
              </div>
            </div>
          </div>

          {/* Logistics */}
          <div>
            <p className="text-xs font-bold text-[#0D631B] tracking-widest uppercase mb-4">Logistics</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Storage Location</label>
                <input type="text" placeholder="e.g., Warehouse A, Kano" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Delivery Lead Time</label>
                <input type="text" placeholder="e.g., 2-4 business days" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Delivery Fee (₦)</label>
                <input type="text" placeholder="e.g., 5,000" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors" />
              </div>
            </div>
          </div>

          {/* AI Verification */}
          <div>
            <p className="text-xs font-bold text-[#0D631B] tracking-widest uppercase mb-4">AI Verification Preview</p>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            {preview ? (
              <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200">
                <img src={preview} alt="Product preview" className="w-full h-52 object-cover" />
                <button
                  onClick={() => { setPreview(null); if (photoRef.current) photoRef.current.value = ""; }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <i className="ri-close-line text-sm" />
                </button>
                <button
                  onClick={() => photoRef.current?.click()}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 text-gray-700 text-xs font-medium hover:bg-white transition-colors shadow"
                >
                  <i className="ri-refresh-line" /> Change Photo
                </button>
              </div>
            ) : (
              <button
                onClick={() => photoRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center text-center hover:border-[#0D631B] hover:bg-[#f9fdf9] transition-colors group"
              >
                <i className="ri-cloud-upload-line text-4xl text-gray-400 group-hover:text-[#0D631B] mb-3 transition-colors" />
                <p className="font-semibold text-gray-800 mb-1">Upload Product Photos</p>
                <p className="text-gray-400 text-sm max-w-xs">
                  Our AI scan will instantly analyze photos for quality, ripeness, and pests to provide a verification badge.
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 sm:px-7 py-4 flex items-center justify-end gap-3 bg-gray-50">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors">
            Save as Draft
          </button>
          <button className="px-6 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-semibold hover:bg-[#0a4f15] transition-colors">
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
