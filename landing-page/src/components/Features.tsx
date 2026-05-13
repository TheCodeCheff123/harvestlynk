const features = [
  {
    icon: "ri-shield-check-line",
    title: "Verified Farmers",
    description:
      "Every producer on FarmConnect undergoes a rigorous on-site verification process to ensure authenticity and quality.",
  },
  {
    icon: "ri-truck-line",
    title: "Tracked Logistics",
    description:
      "Real-time tracking for every bushel. From the farm gate in Kano to your doorstep in Lagos, stay informed at every turn.",
  },
  {
    icon: "ri-price-tag-3-line",
    title: "Fair Pricing",
    description:
      "Direct negotiation with producers means better margins for buyers and better income for hard-working Nigerian farmers.",
  },
];

export default function Features() {
  return (
    <section className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-[#e8f5e9] flex items-center justify-center mb-4">
                <i className={`${f.icon} text-[#1e5631] text-xl`} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
