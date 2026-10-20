"use client";

import { useActionState } from "react";
import { saveFollowupAction, type ActionState } from "@/app/actions";
import { FOLLOWUP_LABEL } from "@/lib/labels";
import type { Followup, FollowupStatus } from "@/lib/types";
import { Alert, Button, Field, Select, Textarea, Input } from "./ui";

export function FollowupForm({ listingId, followup }: { listingId: string; followup: Followup | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveFollowupAction, null);
  const next = followup?.next_followup_at ? followup.next_followup_at.slice(0, 10) : "";
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="listingId" value={listingId} />
      {state?.message && <Alert tone={state.ok ? "good" : "bad"}>{state.message}</Alert>}
      <Field label="وضعیت پیگیری">
        <Select name="status" defaultValue={followup?.status ?? "none"}>
          {(Object.keys(FOLLOWUP_LABEL) as FollowupStatus[]).map((s) => (
            <option key={s} value={s}>
              {FOLLOWUP_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="یادداشت خصوصی" hint="فقط خودتان این یادداشت را می‌بینید.">
        <Textarea name="notes" defaultValue={followup?.notes ?? ""} maxLength={2000} />
      </Field>
      <Field label="پیگیری بعدی (تاریخ میلادی)">
        <Input name="next_followup_at" type="date" defaultValue={next} dir="ltr" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "در حال ذخیره…" : "ذخیره پیگیری"}
      </Button>
    </form>
  );
}
