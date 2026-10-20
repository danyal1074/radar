import { Shell } from "@/components/shell";
import { requireContext } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireContext({ access: true });
  const unread = await ctx.store.unreadCount(ctx.user.id);
  return (
    <Shell ctx={ctx} unread={unread}>
      {children}
    </Shell>
  );
}
