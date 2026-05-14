"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  onMenuToggle: () => void;
}

export default function Topbar({ onMenuToggle }: Props) {
  const pathname = usePathname();
  const notificationsHref = pathname.startsWith("/dashboard/buyer")
    ? "/dashboard/buyer/notifications"
    : "/dashboard/farmer/notifications";

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-white border-b border-[#E0D5B7] shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Toggle menu"
        >
          <i className="ri-menu-line text-xl" />
        </button>
        <span className="text-lg font-bold text-gray-900">Harvestlynk</span>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <Link href={notificationsHref} className="relative text-gray-500 hover:text-gray-800">
          <i className="ri-notification-3-line text-xl" />
        </Link>
        <button className="hidden sm:block text-gray-500 hover:text-gray-800">
          <i className="ri-wallet-3-line text-xl" />
        </button>
        <div className="flex items-center gap-2 pl-3 pr-5 py-2 md:pl-4 md:pr-9 md:py-2.5 rounded-full bg-[#CBFFC2]">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-[#0D631B] bg-[#0D631B] flex items-center justify-center text-white text-xs font-bold">
            D
          </div>
          <span className="text-sm font-medium text-[#0D631B] hidden sm:block">Daniel</span>
        </div>
      </div>
    </header>
  );
}
