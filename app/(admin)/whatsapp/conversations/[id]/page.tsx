import { getConversationMessages } from "@/actions/admin/whatsapp";
import { ConversationDetail } from "@/components/admin/whatsapp/conversation-detail";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getConversationMessages(id);
  if (!data || !data.session) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/whatsapp/conversations"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Retour aux conversations
      </Link>
      <ConversationDetail session={data.session} messages={data.messages} />
    </div>
  );
}
