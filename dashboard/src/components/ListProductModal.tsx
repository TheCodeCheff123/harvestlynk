"use client";
import { useRef, useState } from "react";
import { marketplaceApi, type CreateListingData } from "@/lib/api";

const CATEGORIES = [
  "Grains & Cereals",
  "Tubers",
  "Vegetables",
  "Fruits",
  "Livestock",
  "Legumes",
  "Spices",
  "Other",
];

const UNITS = ["Bags", "kg", "Tonnes", "Crates", "Bunches", "Litres", "Pieces"];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function ListProductModal({ onClose, onCreated }: Props) {
  const photoRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Form state
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(UNITS[0]);
  const [locationState, setLocationState] = useState("");
  const [locationLga, setLocationLga] = useState("");
  const [description, setDescription] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [deliveryOptions, setDeliveryOptions] = useState<string[]>(["pickup"]);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function toggleDeliveryOption(option: string) {
    setDeliveryOptions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
    );
  }

  async function handleSubmit(status: "active" | "paused") {
    setFormError("");

    if (!productName.trim()) { setFormError("Produce name is required."); return; }
    if (!locationState.trim()) { setFormError("Location state is required."); return; }
    const qty = parseFloat(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) { setFormError("Enter a valid quantity."); return; }
    const price = parseInt(pricePerUnit, 10);
    if (!pricePerUnit || isNaN(price) || price <= 0) { setFormError("Enter a valid price per unit."); return; }
    if (deliveryOptions.length === 0) { setFormError("Select at least one delivery option."); return; }

    setLoading(true);
    try {
      let images: string[] = [];
      if (imageFile) {
        const url = await marketplaceApi.uploadImage(imageFile);
        images = [url];
      }

      const data: CreateListingData = {
        product_name: productName.trim(),
        category,
        quantity: qty,
        unit,
        price_per_unit: price,
        location_state: locationState.trim(),
        location_lga: locationLga.trim() || undefined,
        description: description.trim() || undefined,
        harvest_date: harvestDate || null,
        delivery_options: deliveryOptions,
        images,
        status,
      };

      await marketplaceApi.createListing(data);
      onCreated();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save listing. Try again.");
    } finally {
      setLoading(false);
    }
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
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-700 mb-1.5">Produce Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="e.g., Organic Cocoa"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Category <span className="text-red-400">*</span></label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] appearance-none"
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Price per Unit (₦) <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  placeholder="e.g., 15000"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  min={1}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Available Quantity <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  placeholder="e.g., 50"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min={0.01}
                  step="any"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Unit <span className="text-red-400">*</span></label>
                <div className="relative">
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] appearance-none"
                  >
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <p className="text-xs font-bold text-[#0D631B] tracking-widest uppercase mb-4">Location</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">State <span className="text-red-400">*</span></label>
                <div className="relative">
                  <i className="ri-map-pin-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g., Kano"
                    value={locationState}
                    onChange={(e) => setLocationState(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">LGA <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g., Ungogo"
                  value={locationLga}
                  onChange={(e) => setLocationLga(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <p className="text-xs font-bold text-[#0D631B] tracking-widest uppercase mb-4">Additional Details</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  placeholder="Describe quality, grade, storage conditions, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Harvest Date <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="date"
                    value={harvestDate}
                    onChange={(e) => setHarvestDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Delivery Options <span className="text-red-400">*</span></label>
                  <div className="flex gap-4 pt-2">
                    {[
                      { value: "pickup", label: "Pickup" },
                      { value: "delivery", label: "Delivery" },
                    ].map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={deliveryOptions.includes(value)}
                          onChange={() => toggleDeliveryOption(value)}
                          className="rounded border-gray-300 accent-[#0D631B]"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Verification Photo */}
          <div>
            <p className="text-xs font-bold text-[#0D631B] tracking-widest uppercase mb-4">AI Verification Preview</p>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            {preview ? (
              <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                <img src={preview} alt="Product preview" className="w-full h-full object-contain bg-gray-50" />
                <button
                  onClick={() => { setPreview(null); setImageFile(null); if (photoRef.current) photoRef.current.value = ""; }}
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
                  Our AI scan will analyze photos for quality, ripeness, and pests to provide a verification badge.
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {formError && (
          <div className="px-7 pb-2">
            <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{formError}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 sm:px-7 py-4 flex items-center justify-end gap-3 bg-gray-50">
          <button
            onClick={() => handleSubmit("paused")}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-60"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit("active")}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-60"
          >
            {loading ? <><i className="ri-loader-4-line animate-spin" /> Saving...</> : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
