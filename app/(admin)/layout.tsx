import { Shell } from "@/components/shell";
import { requireContext } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireContext({ admin: true });
  return (
    <Shell ctx={ctx} unread={await ctx.store.unreadCount(ctx.user.id)}>
      {children}
    </Shell>
  );
}
