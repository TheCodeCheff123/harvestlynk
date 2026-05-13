import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="/background.png"
          alt="Farm background"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-20">
        <div className="max-w-xl">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e8a000] text-white text-sm font-medium mb-6">
            <i className="ri-shield-check-line" />
            Nigeria's Most Secure Farm Network
          </span>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Direct From Farm To<br />Your Warehouse
          </h1>

          <p className="text-gray-200 text-base md:text-lg leading-relaxed mb-10 max-w-md">
            Eliminate middlemen and secure your agricultural supply chain with
            our iron-clad escrow system. Transparent pricing, verified farmers,
            and guaranteed quality.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 mb-10">
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
            >
              I am a Buyer <i className="ri-shopping-cart-line" />
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#e8a000] text-white font-medium hover:bg-[#d09000] transition-colors"
            >
              I am a Farmer <i className="ri-plant-line" />
            </a>
          </div>

          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm">
            <i className="ri-checkbox-circle-fill text-[#e8a000]" />
            Pay only when satisfied
          </div>
        </div>

        {/* Floating cards */}
        <div className="absolute top-40 right-6 md:right-16 max-w-xs">
          <div className="bg-white rounded-xl p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1e5631] flex items-center justify-center flex-shrink-0">
                <i className="ri-lock-line text-white text-lg" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Secure Escrow Payment</p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                  Funds are held safely in escrow and only released to the farmer
                  after you confirm delivery and quality. Your investment is 100%
                  protected.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-24 right-6 md:right-16">
          <div className="bg-white rounded-xl px-4 py-3 shadow-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1e5631] flex items-center justify-center flex-shrink-0">
              <i className="ri-shield-check-fill text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Protection by</p>
              <p className="text-gray-900 text-sm font-semibold">Squad Payment</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
