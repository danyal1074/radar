"use server";

import { revalidatePath } from "next/cache";
import { adminStore, requireContext } from "@/lib/auth";
import { runDefaultPipeline } from "@/lib/jobs/default";
import type { PlanId } from "@/lib/types";
import { listingImportSchema } from "@/lib/validation";
import type { ActionState } from "@/app/actions";

async function guard() {
  await requireContext({ admin: true });
  return adminStore();
}
const refresh = () => revalidatePath("/admin");

export async function reviewPaymentAction(fd: FormData) {
  const store = await guard();
  const id = String(fd.get("id") ?? "");
  const decision = fd.get("decision") === "confirm" ? "confirmed" : "rejected";
  if (id) await store.reviewPayment(id, decision);
  refresh();
}

export async function grantAccessAction(fd: FormData) {
  const store = await guard();
  const userId = String(fd.get("userId") ?? "");
  const days = Math.min(365, Math.max(1, Number(fd.get("days")) || 0));
  if (!userId || !days) return;
  const subs = await store.getSubscriptionsByUser([userId]);
  const sub = subs.get(userId);
  const base = sub?.status === "trialing" && sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date() ? new Date(sub.trial_ends_at) : new Date();
  const end = new Date(base.getTime() + days * 86_400_000).toISOString();
  await store.setSubscription(userId, { plan: sub?.plan ?? "trial", status: "trialing", trial_ends_at: end });
  refresh();
}

export async function cancelSubscriptionAction(fd: FormData) {
  const store = await guard();
  const userId = String(fd.get("userId") ?? "");
  const sub = (await store.getSubscriptionsByUser([userId])).get(userId);
  if (userId) await store.setSubscription(userId, { plan: sub?.plan ?? "trial", status: "canceled" });
  refresh();
}

export async function changePlanAction(fd: FormData) {
  const store = await guard();
  const userId = String(fd.get("userId") ?? "");
  const plan = String(fd.get("plan") ?? "");
  if (!userId || !["trial", "basic", "pro", "business"].includes(plan)) return;
  const sub = (await store.getSubscriptionsByUser([userId])).get(userId);
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 86_400_000).toISOString();
  await store.setSubscription(userId, {
    plan: plan as PlanId,
    status: "active",
    current_period_end: sub?.current_period_end && new Date(sub.current_period_end) > now ? sub.current_period_end : end,
  });
  refresh();
}

export async function runPipelineAction(): Promise<void> {
  await guard();
  await runDefaultPipeline();
  refresh();
}

export async function importListingsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const store = await guard();
  let json: unknown;
  try {
    json = JSON.parse(String(fd.get("json") ?? ""));
  } catch {
    return { ok: false, message: "JSON معتبر نیست" };
  }
  const parsed = listingImportSchema.safeParse(json);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, message: `ساختار فایل نامعتبر است: ${i.path.join(".")} — ${i.message}` };
  }
  // Only https links on the allowed marketplace hosts are kept; anything else becomes "no link".
  const { safeListingUrl } = await import("@/lib/validation");
  const items = parsed.data.map((it) => ({ ...it, source_url: safeListingUrl(it.source_url ?? null), image_url: it.image_url ?? null }));
  const r = await store.upsertListings(items, { isSample: false, now: new Date() });
  refresh();
  return { ok: true, message: `${r.inserted} آگهی جدید، ${r.updated} به‌روزرسانی، ${r.unchanged} بدون تغییر` };
}

export async function updateCarPriceAction(fd: FormData): Promise<void> {
  await guard();
  const id = String(fd.get("id") ?? "");
  const priceToman = Number(fd.get("priceToman"));
  if (id && !isNaN(priceToman) && priceToman > 0) {
    const { updateCarPrice } = await import("@/lib/daily-prices/service");
    await updateCarPrice(id, priceToman);
  }
  revalidatePath("/admin/prices");
  revalidatePath("/admin");
}

export async function refreshCarPricesAction(): Promise<void> {
  await guard();
  const { refreshCarPricesFromMarket } = await import("@/lib/daily-prices/service");
  await refreshCarPricesFromMarket();
  revalidatePath("/admin/prices");
  revalidatePath("/admin");
}


