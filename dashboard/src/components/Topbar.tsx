"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useNotifications } from "@/hooks/useNotifications";
import { formatNaira } from "@/lib/api";

interface Props {
  onMenuToggle: () => void;
}

export default function Topbar({ onMenuToggle }: Props) {
  const pathname = usePathname();
  const isBuyer = pathname.startsWith("/dashboard/buyer");
  const [unverified, setUnverified] = useState(false);
  const { user, wallet } = useAuth();

  useEffect(() => {
    if (!isBuyer) {
      setUnverified(localStorage.getItem("hl_farmer_verified") === "false");
    }
  }, [isBuyer, pathname]);

  const notificationsHref = isBuyer
    ? "/dashboard/buyer/notifications"
    : "/dashboard/farmer/notifications";

  const { totalItems } = useCart();
  const { unreadCount } = useNotifications();
  const displayName = user?.name?.split(" ")[0] ?? (isBuyer ? "Buyer" : "Farmer");
  const initial = displayName.charAt(0).toUpperCase();
  const walletDisplay = wallet ? formatNaira(wallet.available_balance) : "₦0.00";

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white border-b border-[#E0D5B7] shrink-0 gap-4">
      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onMenuToggle}
          className="md:hidden text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Toggle menu"
        >
          <i className="ri-menu-line text-xl" />
        </button>
        <span className="text-lg font-bold text-gray-900">Harvestlynk</span>
      </div>

      {/* Center: search bar (buyer only) */}
      {isBuyer && (
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search harvests, farmers..."
              className="w-full pl-9 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white transition-colors"
            />
          </div>
        </div>
      )}

      {/* Right: icons + profile */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Cart icon — buyer only */}
        {isBuyer && (
          <Link
            href="/dashboard/buyer/checkout"
            className="relative text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Cart"
          >
            <i className="ri-shopping-bag-3-line text-xl" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0D631B] text-white text-[9px] font-bold flex items-center justify-center">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </Link>
        )}

        {/* Bell */}
        <Link href={notificationsHref} className="relative text-gray-500 hover:text-gray-800 transition-colors">
          <i className="ri-notification-3-line text-xl" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Wallet balance (buyer only) */}
        {isBuyer ? (
          <Link
            href="/dashboard/buyer/wallet"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-[#0D631B] transition-colors"
          >
            <i className="ri-bank-card-line text-base text-gray-400" />
            {walletDisplay}
          </Link>
        ) : (
          <button className="hidden sm:block text-gray-500 hover:text-gray-800">
            <i className="ri-wallet-3-line text-xl" />
          </button>
        )}

        {/* Profile pill */}
        <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 md:pl-3 md:pr-4 rounded-full bg-[#CBFFC2]">
          <div className="w-7 h-7 rounded-full border border-[#0D631B] bg-[#0D631B] flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
            {user?.image ? (
              <Image
                src={user.image}
                alt={displayName}
                width={28}
                height={28}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <span className="text-sm font-medium text-[#0D631B] hidden sm:block">
            {displayName}
          </span>
        </div>
      </div>
    </header>
  );
}
