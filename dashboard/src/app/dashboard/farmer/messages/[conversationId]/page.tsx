"use client";
import { use } from "react";
import ConversationDetailPage from "@/components/ConversationDetailPage";

export default function FarmerConversation({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params);
  return <ConversationDetailPage conversationId={conversationId} role="farmer" />;
}
