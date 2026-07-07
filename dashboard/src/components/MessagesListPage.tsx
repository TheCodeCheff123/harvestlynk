"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { chatApi, type Conversation } from "@/lib/api";
import { staggerContainer, fadeUp } from "@/lib/motion";

interface Props {
  role: "buyer" | "farmer";
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function MessagesListPage({ role }: Props) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chatApi.getConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const basePath = `/dashboard/${role}/messages`;

  return (
    <motion.div className="space-y-6 max-w-2xl mx-auto" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500 mt-1 text-sm">Your conversations with {role === "buyer" ? "farmers" : "buyers"}.</p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16">
          <i className="ri-loader-4-line animate-spin text-[#0D631B] text-2xl" />
        </div>
      ) : conversations.length === 0 ? (
        <motion.div variants={fadeUp} className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <i className="ri-chat-3-line text-3xl text-gray-400" />
          </div>
          <h2 className="font-semibold text-gray-900 mb-2">No conversations yet</h2>
          <p className="text-gray-400 text-sm mb-6">
            {role === "buyer"
              ? "Browse the marketplace and start chatting with a farmer."
              : "You'll see messages here when buyers contact you."}
          </p>
          {role === "buyer" && (
            <Link
              href="/dashboard/buyer/marketplace"
              className="px-6 py-3 rounded-xl bg-[#0D631B] text-white font-semibold text-sm hover:bg-[#0a4f15] transition-colors"
            >
              Browse Marketplace
            </Link>
          )}
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {conversations.map((conv) => (
            <button
              key={conv.conversation_id}
              onClick={() => router.push(`${basePath}/${conv.conversation_id}`)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-[#0D631B] font-bold text-sm">
                {conv.listing_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={conv.listing_image} alt={conv.listing_name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  initials(conv.other_party_name)
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className={`text-sm font-semibold truncate ${conv.unread_count > 0 ? "text-gray-900" : "text-gray-700"}`}>
                    {conv.other_party_name}
                  </p>
                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                    {relativeTime(conv.last_message_at)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mb-0.5">{conv.listing_name}</p>
                <p className={`text-xs truncate ${conv.unread_count > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                  {conv.last_message_preview ?? "No messages yet"}
                </p>
              </div>
              {/* Unread badge */}
              {conv.unread_count > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                  {conv.unread_count > 9 ? "9+" : conv.unread_count}
                </span>
              )}
            </button>
          ))}
        </motion.div>
      )}

      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
        <i className="ri-time-line" />
        Messages are automatically deleted after 3 days.
      </p>
    </motion.div>
  );
}
