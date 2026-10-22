"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireContext, signOut } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { followupSchema } from "@/lib/validation";

export type ActionState = { ok: boolean; message?: string; errors?: Record<string, string> } | null;

const refresh = () => {
  revalidatePath("/", "layout");
};

export async function logoutAction() {
  await signOut();
  redirect("/login");
}

export async function toggleSavedAction(formData: FormData) {
  const ctx = await requireContext({ access: true });
  const listingId = String(formData.get("listingId") ?? "");
  const save = formData.get("save") === "1";
  if (!listingId) return;

  if (save) {
    const limit = PLANS[ctx.access.plan].maxSavedListings;
    const current = await ctx.store.listSavedIds(ctx.user.id);
    if (!current.includes(listingId) && current.length >= limit) {
      redirect(`/settings/billing?limit=saved`);
    }
  }
  await ctx.store.setSaved(ctx.user.id, listingId, save);
  refresh();
}

/** One-click follow toggle used on cards: none <-> watching. */
export async function toggleFollowAction(formData: FormData) {
  const ctx = await requireContext({ access: true });
  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) return;
  const existing = (await ctx.store.listFollowups(ctx.user.id)).find((f) => f.listing_id === listingId);
  const following = existing && existing.status !== "none" && existing.status !== "dropped";
  await ctx.store.upsertFollowup(ctx.user.id, listingId, {
    status: following ? "none" : "watching",
    notes: existing?.notes ?? "",
    next_followup_at: existing?.next_followup_at ?? null,
  });
  refresh();
}

export async function saveFollowupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireContext({ access: true });
  const listingId = String(formData.get("listingId") ?? "");
  const parsed = followupSchema.safeParse({
    status: formData.get("status"),
    notes: formData.get("notes") ?? "",
    next_followup_at: formData.get("next_followup_at") ?? "",
  });
  if (!listingId || !parsed.success) return { ok: false, message: "اطلاعات واردشده معتبر نیست" };
  if (!(await ctx.store.getListing(listingId))) return { ok: false, message: "آگهی پیدا نشد" };
  await ctx.store.upsertFollowup(ctx.user.id, listingId, {
    status: parsed.data.status,
    notes: parsed.data.notes,
    next_followup_at: parsed.data.next_followup_at,
  });
  refresh();
  return { ok: true, message: "ذخیره شد" };
}

export async function markNotificationAction(formData: FormData) {
  const ctx = await requireContext({ access: true });
  const id = String(formData.get("id") ?? "");
  if (id) await ctx.store.markNotificationRead(ctx.user.id, id, formData.get("read") !== "0");
  refresh();
}

export async function markAllNotificationsAction() {
  const ctx = await requireContext({ access: true });
  await ctx.store.markAllNotificationsRead(ctx.user.id);
  refresh();
}

export async function deleteListingAction(formData: FormData) {
  await requireContext({ access: true });
  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) return;
  // Use service store so it can delete from shared listings
  const { getServiceStore } = await import("@/lib/db");
  const store = await getServiceStore();
  await store.deleteListing(listingId);
  refresh();
}

export async function deleteSampleListingsAction() {
  await requireContext({ admin: true });
  const { getServiceStore } = await import("@/lib/db");
  const store = await getServiceStore();
  await store.deleteSampleListings();
  refresh();
}

export async function syncLiveDivarAction(formData?: FormData) {
  await requireContext({ access: true });
  const requestedCity = formData ? String(formData.get("city") || "").trim() : "";
  const { runDefaultPipeline } = await import("@/lib/jobs/default");
  await runDefaultPipeline(requestedCity || undefined);
  refresh();
}
