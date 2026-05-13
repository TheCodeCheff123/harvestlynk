const steps = [
  {
    icon: "ri-sparkling-2-line",
    title: "AI-Powered Verification",
    description:
      "Our proprietary AI scan feature allows farmers to verify the quality and health of their goods before listing. This ensures only top-tier produce reaches the market, maintaining high standards for every transaction.",
  },
  {
    icon: "ri-safe-line",
    title: "Escrow Protection",
    description:
      "No more payment risks. Buyers' funds are held safely in our secure escrow system and are only released to the farmer once delivery and quality are confirmed by the buyer.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How Harvestlynk Works
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            A seamless, dual-sided marketplace designed to bring trust and
            efficiency to Nigerian agriculture.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {steps.map((s) => (
            <div key={s.title} className="bg-white rounded-2xl p-8 border border-gray-100">
              <div className="w-11 h-11 rounded-xl bg-[#e8f5e9] flex items-center justify-center mb-5">
                <i className={`${s.icon} text-[#1e5631] text-2xl`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
