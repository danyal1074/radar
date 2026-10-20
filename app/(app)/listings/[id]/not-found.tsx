import { EmptyState, LinkButton } from "@/components/ui";

export default function NotFound() {
  return <EmptyState title="آگهی پیدا نشد" body="این آگهی وجود ندارد یا حذف شده است." action={<LinkButton href="/listings">بازگشت به آگهی‌ها</LinkButton>} />;
}
