import { Shell } from "@/components/shell";
import { requireContext } from "@/lib/auth";

// Signed-in pages that stay reachable when the subscription has ended (billing).
export default async function AccountLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireContext();
  const unread = ctx.access.hasAccess ? await ctx.store.unreadCount(ctx.user.id) : 0;
  return (
    <Shell ctx={ctx} unread={unread} locked={!ctx.access.hasAccess && ctx.profile.role !== "admin"}>
      {children}
    </Shell>
  );
}
