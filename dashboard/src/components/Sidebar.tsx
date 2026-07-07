"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useChatUnread } from "@/hooks/useChat";

const navItems = [
  { label: "Dashboard",       icon: "ri-layout-grid-line",      href: "/dashboard/farmer" },
  { label: "AI Crop Doctor",  icon: "ri-medicine-bottle-line",   href: "/dashboard/farmer/ai-crop-doctor" },
  { label: "My farm",         icon: "ri-leaf-line",              href: "/dashboard/farmer/farm" },
  { label: "Market Place",    icon: "ri-store-2-line",           href: "/dashboard/farmer/marketplace" },
  { label: "Messages",        icon: "ri-chat-3-line",            href: "/dashboard/farmer/messages" },
  { label: "Orders",          icon: "ri-list-ordered",           href: "/dashboard/farmer/orders" },
  { label: "Wallet Balance",  icon: "ri-wallet-3-line",          href: "/dashboard/farmer/wallet" },
  { label: "Profile",         icon: "ri-user-line",              href: "/dashboard/farmer/profile" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { unreadCount } = useChatUnread();

  async function handleLogout() {
    onClose();
    await logout();
    router.push("/login?role=farmer");
  }

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#E0D5B7] flex flex-col
        transition-transform duration-200 ease-in-out
        md:static md:inset-auto md:z-auto md:w-60 md:shrink-0 md:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Mobile header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 md:hidden border-b border-gray-100">
        <span className="font-bold text-gray-900 text-sm">Harvestlynk</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
          <i className="ri-close-line text-xl" />
        </button>
      </div>

      <nav className="pt-2 md:pt-4 px-3 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href) && (item.href !== "/dashboard/farmer" || pathname === item.href);
          const badge = item.label === "Messages" && unreadCount > 0 ? unreadCount : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-colors
                ${active
                  ? "bg-[#0D631B] text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
            >
              <i className={`${item.icon} text-lg`} />
              {item.label}
              {badge > 0 && (
                <span className={`ml-auto w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${active ? "bg-white text-[#0D631B]" : "bg-red-500 text-white"}`}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[#E0D5B7]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <i className="ri-logout-box-r-line text-lg" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
