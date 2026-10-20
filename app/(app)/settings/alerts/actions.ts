"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { evaluateAndNotify } from "@/lib/alerts/run";
import { requireContext } from "@/lib/auth";
import { getServiceStore } from "@/lib/db";
import { parseLooseNumber } from "@/lib/money";
import { PLANS } from "@/lib/plans";
import { watchRuleSchema } from "@/lib/validation";
import type { ActionState } from "@/app/actions";

const NUM_FIELDS = ["year_min", "year_max", "price_min_toman", "price_max_toman", "mileage_min_km", "mileage_max_km", "min_discount_toman"] as const;

function readForm(fd: FormData) {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) raw[k] = typeof v === "string" ? v : "";
  for (const k of NUM_FIELDS) {
    const s = String(raw[k] ?? "");
    let val = s.trim() === "" ? null : parseLooseNumber(s) ?? NaN;
    // If entered in millions (e.g. 500 instead of 500,000,000)
    if (typeof val === "number" && !isNaN(val) && val > 0 && val <= 50_000 && (k.includes("price") || k.includes("toman"))) {
      val = val * 1_000_000;
    }
    raw[k] = val;
  }
  const pct = String(raw.min_discount_percent ?? "").trim();
  raw.min_discount_percent = pct === "" ? null : parseLooseNumber(pct) ?? NaN;
  raw.urgent_only = fd.get("urgent_only") === "on";
  raw.paint_free_only = fd.get("paint_free_only") === "on";
  raw.is_active = fd.get("is_active") === "on";
  return raw;
}

function errorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "form");
    out[k] = i.message.includes("expected number") || i.message.includes("Invalid input") ? "مقدار عددی معتبر وارد کنید" : i.message;
  }
  return out;
}

async function reevaluate(userId: string) {
  // Run alerts right away so a new rule surfaces existing matches without waiting for the next job.
  await evaluateAndNotify(await getServiceStore(), new Date(), { userId });
}

export async function saveRuleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireContext({ access: true });
  const parsed = watchRuleSchema.safeParse(readForm(fd));
  if (!parsed.success) return { ok: false, errors: errorsOf(parsed.error.issues) };

  const id = String(fd.get("id") ?? "");
  const plan = PLANS[ctx.access.plan];
  const rules = await ctx.store.listRules(ctx.user.id);
  const activeOthers = rules.filter((r) => r.is_active && r.id !== id).length;
  if (parsed.data.is_active && activeOthers >= plan.maxActiveRules) {
    return { ok: false, message: `سقف قوانین فعال پلن «${plan.name}» پر شده است. یک قانون را غیرفعال کنید یا پلن را ارتقا دهید.` };
  }

  if (id) {
    const updated = await ctx.store.updateRule(ctx.user.id, id, parsed.data);
    if (!updated) return { ok: false, message: "قانون پیدا نشد" };
  } else {
    await ctx.store.createRule(ctx.user.id, parsed.data);
  }
  await reevaluate(ctx.user.id);
  revalidatePath("/", "layout");
  redirect("/settings/alerts?saved=1");
}

export async function toggleRuleAction(fd: FormData) {
  const ctx = await requireContext({ access: true });
  const id = String(fd.get("id") ?? "");
  const active = fd.get("active") === "1";
  if (active) {
    const plan = PLANS[ctx.access.plan];
    const rules = await ctx.store.listRules(ctx.user.id);
    if (rules.filter((r) => r.is_active && r.id !== id).length >= plan.maxActiveRules) redirect("/settings/billing?limit=rules");
  }
  await ctx.store.setRuleActive(ctx.user.id, id, active);
  if (active) await reevaluate(ctx.user.id);
  revalidatePath("/", "layout");
}

export async function deleteRuleAction(fd: FormData) {
  const ctx = await requireContext({ access: true });
  await ctx.store.deleteRule(ctx.user.id, String(fd.get("id") ?? ""));
  revalidatePath("/", "layout");
}
