"use server";

import { revalidatePath } from "next/cache";
import { requireContext } from "@/lib/auth";
import { planPrice } from "@/lib/plans";
import { paymentRequestSchema } from "@/lib/validation";
import type { ActionState } from "@/app/actions";

const MAX_PENDING = 3;

/**
 * The dealer reports a card-to-card transfer. The amount is ALWAYS computed on
 * the server from the plan table (never taken from the form). An admin confirms
 * the payment manually, which activates / extends the subscription.
 */
export async function requestPaymentAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireContext();
  const parsed = paymentRequestSchema.safeParse({
    plan: fd.get("plan"),
    months: fd.get("months"),
    reference: fd.get("reference"),
    note: fd.get("note") ?? "",
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0] ?? "form")] = i.message;
    return { ok: false, errors, message: "اطلاعات واردشده معتبر نیست" };
  }

  const pending = await ctx.store.listPayments({ userId: ctx.user.id, status: "pending" });
  if (pending.length >= MAX_PENDING) {
    return { ok: false, message: "چند پرداخت در انتظار بررسی دارید. لطفاً تا تأیید آن‌ها صبر کنید." };
  }
  if (pending.some((p) => p.reference === parsed.data.reference)) {
    return { ok: false, errors: { reference: "این کد پیگیری قبلاً ثبت شده است" } };
  }

  await ctx.store.createPayment({
    user_id: ctx.user.id,
    plan: parsed.data.plan,
    months: parsed.data.months,
    amount_toman: planPrice(parsed.data.plan, parsed.data.months),
    method: "manual_card_transfer",
    reference: parsed.data.reference,
    note: parsed.data.note,
  });
  revalidatePath("/settings/billing");
  return { ok: true, message: "پرداخت ثبت شد و پس از تأیید مدیر، اشتراک شما فعال می‌شود." };
}
