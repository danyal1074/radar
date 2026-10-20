"use client";

import { useActionState } from "react";
import { importListingsAction } from "@/app/(admin)/admin/actions";
import { Alert, Button, Textarea } from "@/components/ui";

export function ImportForm() {
  const [state, action, pending] = useActionState(importListingsAction, null);
  return (
    <form action={action} className="space-y-3">
      <Textarea name="json" dir="ltr" className="min-h-40 font-mono text-xs" placeholder='[{"source":"manual","source_post_id":"1","title":"...","make":"پراید","model":"۱۳۱","year":1399,"price_toman":350000000}]' />
      {state?.message && <Alert tone={state.ok ? "good" : "bad"}>{state.message}</Alert>}
      <Button type="submit" disabled={pending}>{pending ? "در حال ورود…" : "ورود آگهی‌ها"}</Button>
    </form>
  );
}
