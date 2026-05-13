import Image from "next/image";

const benefits = [
  {
    icon: "ri-global-line",
    text: "Reach a wider audience across the nation, bypassing traditional middlemen to maximize your profits.",
  },
  {
    icon: "ri-secure-payment-line",
    text: "Guaranteed payments through our secure escrow, ensuring you get paid for every successful delivery.",
  },
  {
    icon: "ri-map-pin-line",
    text: "Access AI diagnostic tools that help you monitor crop health and ensure your produce is market-ready.",
  },
];

export default function ForFarmers() {
  return (
    <section id="for-farmers" className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="bg-[#1e5631] rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Text */}
            <div className="p-10 md:p-14 flex flex-col justify-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                Empowering Farmers
              </h2>
              <ul className="space-y-5 mb-10">
                {benefits.map((b) => (
                  <li key={b.text} className="flex items-start gap-3">
                    <i className={`${b.icon} text-[#e8a000] text-lg mt-0.5 flex-shrink-0`} />
                    <p className="text-green-100 text-sm leading-relaxed">{b.text}</p>
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className="inline-flex items-center justify-center w-fit px-6 py-3 rounded-full bg-[#e8a000] text-white font-medium hover:bg-[#d09000] transition-colors"
              >
                Start Selling
              </a>
            </div>

            {/* Image */}
            <div className="relative min-h-64 md:min-h-0">
              <Image
                src="/farmers.png"
                alt="Farmers at work"
                fill
                className="object-cover object-center"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
