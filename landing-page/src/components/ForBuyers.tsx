import Image from "next/image";

const benefits = [
  {
    icon: "ri-map-pin-2-line",
    text: "Transparent tracking from farm to warehouse, so you know exactly where your supply is at all times.",
  },
  {
    icon: "ri-checkbox-circle-line",
    text: "AI-verified produce quality ensures you receive exactly what you paid for, reducing waste and disputes.",
  },
  {
    icon: "ri-shield-check-line",
    text: "Complete peace of mind with escrow protection—your money is only released when you're satisfied.",
  },
];

export default function ForBuyers() {
  return (
    <section id="for-buyers" className="bg-white py-10 pb-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="border border-gray-100 rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image */}
            <div className="relative min-h-64 md:min-h-0">
              <Image
                src="/marketer.png"
                alt="Buyers at market"
                fill
                className="object-cover object-center"
              />
            </div>

            {/* Text */}
            <div className="p-10 md:p-14 flex flex-col justify-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
                Secure Sourcing for Buyers
              </h2>
              <ul className="space-y-5 mb-10">
                {benefits.map((b) => (
                  <li key={b.text} className="flex items-start gap-3">
                    <i className={`${b.icon} text-[#1e5631] text-lg mt-0.5 flex-shrink-0`} />
                    <p className="text-gray-500 text-sm leading-relaxed">{b.text}</p>
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className="inline-flex items-center justify-center w-fit px-6 py-3 rounded-full bg-[#1e5631] text-white font-medium hover:bg-[#174a28] transition-colors"
              >
                Browse Marketplace
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
