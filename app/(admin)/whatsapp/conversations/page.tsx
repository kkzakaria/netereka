import Link from "next/link";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { getConversations } from "@/actions/admin/whatsapp";
import { ConversationsList } from "@/components/admin/whatsapp/conversations-list";

const PAGE_SIZE = 20;

export default async function WhatsAppConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { items: conversations, total } = await getConversations({
    search: params.search,
    status: params.status,
    page,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <AdminPageHeader>
        <AdminHeader title="Conversations WhatsApp" />
      </AdminPageHeader>

      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {total} conversation(s)
        </p>

        <ConversationsList
          conversations={conversations}
          currentSearch={params.search}
          currentStatus={params.status}
        />

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page}/{totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={{
                      pathname: "/whatsapp/conversations",
                      query: { ...params, page: String(page - 1) },
                    }}
                  >
                    Précédent
                  </Link>
                </Button>
              )}
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={{
                      pathname: "/whatsapp/conversations",
                      query: { ...params, page: String(page + 1) },
                    }}
                  >
                    Suivant
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
