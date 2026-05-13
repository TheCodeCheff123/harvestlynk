import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import ForFarmers from "@/components/ForFarmers";
import ForBuyers from "@/components/ForBuyers";
import TrustSection from "@/components/TrustSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <ForFarmers />
        <ForBuyers />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}
