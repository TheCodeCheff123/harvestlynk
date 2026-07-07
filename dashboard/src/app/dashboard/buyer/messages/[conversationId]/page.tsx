"use client";
import { use } from "react";
import ConversationDetailPage from "@/components/ConversationDetailPage";

export default function BuyerConversation({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params);
  return <ConversationDetailPage conversationId={conversationId} role="buyer" />;
}
