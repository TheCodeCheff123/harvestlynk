const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
      <span className="text-xl font-bold text-gray-900">Harvestlynk</span>

      <ul className="hidden md:flex items-center gap-8 text-sm text-gray-600">
        <li><a href="#" className="hover:text-gray-900 transition-colors">Home</a></li>
        <li><a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a></li>
        <li><a href="#for-farmers" className="hover:text-gray-900 transition-colors">For Farmers</a></li>
        <li><a href="#for-buyers" className="hover:text-gray-900 transition-colors">For Buyers</a></li>
        <li><a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a></li>
      </ul>

      <div className="flex items-center gap-3">
        <a
          href={`${APP_URL}/login?role=farmer`}
          className="hidden sm:inline-flex items-center px-5 py-2 rounded-full bg-[#1e5631] text-white text-sm font-medium hover:bg-[#174a28] transition-colors"
        >
          I am a farmer
        </a>
        <a
          href={`${APP_URL}/login?role=buyer`}
          className="hidden sm:inline-flex items-center px-5 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          I am a buyer
        </a>
        <button className="text-gray-500 hover:text-gray-800 transition-colors" aria-label="Language">
          <i className="ri-global-line text-xl" />
        </button>
      </div>
    </nav>
  );
}
