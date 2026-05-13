import Image from "next/image";

const promises = [
  "Inspected batches for quality assurance before final payment release.",
  "Automatic refund processing if products don't meet agreed specifications.",
  "24/7 dispute resolution and arbitration support from our local experts.",
];

const escrowSteps = [
  "Buyer pays into Escrow",
  "Farmer ships the produce",
  "Funds released on approval",
];

export default function TrustSection() {
  return (
    <section className="bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* FarmConnect card */}
          <div className="relative rounded-3xl overflow-hidden">
            <Image
              src="/farmconnect.png"
              alt="FarmConnect produce"
              width={600}
              height={480}
              className="w-full object-cover rounded-3xl"
            />
            {/* Escrow workflow overlay */}
            <div className="absolute bottom-6 right-6 bg-white rounded-2xl p-4 shadow-xl max-w-[220px]">
              <p className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <i className="ri-shield-check-line text-[#1e5631]" />
                Escrow Workflow
              </p>
              <ol className="space-y-2">
                {escrowSteps.map((step, i) => (
                  <li key={step} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-4 h-4 rounded-full bg-[#1e5631] text-white flex items-center justify-center text-[10px] flex-shrink-0">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Text */}
          <div>
            <p className="text-sm font-semibold text-[#1e5631] tracking-widest uppercase mb-3">
              The FarmConnect Promise
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Zero Risk. Total Transparency.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              We understand the challenges of agricultural trade in Nigeria.
              That's why our system is built on trust, verified through Squad
              (by HabarPay) for absolute security.
            </p>
            <ul className="space-y-4 mb-8">
              {promises.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <i className="ri-checkbox-circle-fill text-[#1e5631] text-xl flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 flex items-center gap-2">
              <i className="ri-shield-line" />
              Official Escrow Partner: Protected by Squad Payment
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
