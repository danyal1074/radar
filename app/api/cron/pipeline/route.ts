import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runDefaultPipeline } from "@/lib/jobs/default";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = env.cronSecret;
  if (secret.length < 16) return false; // not configured => endpoint disabled
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Scheduler entry point (Vercel Cron / system cron): Authorization: Bearer $CRON_SECRET */
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const city = url.searchParams.get("city") || undefined;
  try {
    return NextResponse.json({ ok: true, result: await runDefaultPipeline(city) });
  } catch {
    return NextResponse.json({ ok: false, error: "pipeline_failed" }, { status: 500 });
  }
}
