"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { fadeLeft, fadeRight, staggerContainer, fadeUp, scaleIn } from "@/lib/motion";

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
          <motion.div
            className="relative rounded-3xl overflow-hidden"
            variants={fadeLeft}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <Image
              src="/farmconnect.png"
              alt="HarvestLynk produce"
              width={600}
              height={480}
              className="w-full object-cover rounded-3xl"
            />
            {/* Escrow workflow overlay */}
            <motion.div
              className="absolute bottom-6 right-6 bg-white rounded-2xl p-4 shadow-xl max-w-[220px]"
              variants={scaleIn}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <i className="ri-shield-check-line text-[#1e5631]" />
                Escrow Workflow
              </p>
              <ol className="space-y-2">
                {escrowSteps.map((step, i) => (
                  <motion.li
                    key={step}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.15 }}
                    className="flex items-center gap-2 text-xs text-gray-600"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#1e5631] text-white flex items-center justify-center text-[10px] flex-shrink-0">
                      {i + 1}
                    </span>
                    {step}
                  </motion.li>
                ))}
              </ol>
            </motion.div>
          </motion.div>

          {/* Text */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.p variants={fadeRight} className="text-sm font-semibold text-[#1e5631] tracking-widest uppercase mb-3">
              The HarvestLynk Promise
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Zero Risk. Total Transparency.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 leading-relaxed mb-8">
              We understand the challenges of agricultural trade in Nigeria.
                That's why our system is built on trust, secured through Nomba
                Payment Gateway for absolute security.
            </motion.p>
            <ul className="space-y-4 mb-8">
              {promises.map((p, i) => (
                <motion.li
                  key={p}
                  variants={fadeUp}
                  custom={i}
                  className="flex items-start gap-3"
                >
                  <motion.i
                    className="ri-checkbox-circle-fill text-[#1e5631] text-xl flex-shrink-0 mt-0.5"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 400, delay: 0.2 + i * 0.1 }}
                  />
                  <span className="text-gray-600 text-sm leading-relaxed">{p}</span>
                </motion.li>
              ))}
            </ul>
            <motion.p variants={fadeUp} className="text-xs text-gray-400 flex items-center gap-2">
              <i className="ri-shield-line" />
              Official Escrow Partner: Protected by Nomba Payment Gateway
            </motion.p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
