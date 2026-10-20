import "server-only";
import path from "node:path";
import { env } from "../env";
import { MockPriceEstimationProvider } from "../estimation/mock";
import { runEstimation } from "../estimation/service";
import { sampleListings } from "../sources/mock";
import { DevStore } from "./dev-store";
import type { Store } from "./store";

export type DataMode = "supabase" | "dev";

export function dataMode(): DataMode {
  return env.hasSupabase ? "supabase" : "dev";
}

/** Throws a clear error if the app would run in an unsafe configuration. */
export function assertRunnable(): void {
  if (dataMode() === "dev" && env.isProduction && !env.allowDevStoreInProduction) {
    throw new Error(
      "Supabase تنظیم نشده است. در محیط تولید حالت توسعه (ذخیره‌ساز فایل) غیرفعال است. " +
        "متغیرهای NEXT_PUBLIC_SUPABASE_URL ، NEXT_PUBLIC_SUPABASE_ANON_KEY و SUPABASE_SERVICE_ROLE_KEY را تنظیم کنید.",
    );
  }
}

const g = globalThis as unknown as { __devStore?: DevStore; __devSeeded?: Promise<void> };

export function estimationConfig() {
  return {
    ttlHours: env.estimateTtlHours,
    failureRetryMinutes: env.estimateFailureRetryMinutes,
    maxPerRun: env.maxEstimatesPerRun,
    maxPerDay: env.maxEstimatesPerDay,
    costToman: env.estimateCostToman,
  };
}

/** The dev store, seeded once with clearly-labelled sample data. */
export async function getDevStore(): Promise<DevStore> {
  assertRunnable();
  if (!g.__devStore) g.__devStore = new DevStore(path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.devStorePath));
  const store = g.__devStore;
  if (!g.__devSeeded) {
    g.__devSeeded = (async () => {
      if (await store.isEmpty()) {
        const now = new Date();
        await store.upsertListings(sampleListings(now), { isSample: true, now });
        await runEstimation(store, new MockPriceEstimationProvider(), estimationConfig(), now);
      }
    })();
  }
  await g.__devSeeded;
  return store;
}

/** Store for the signed-in user's requests (RLS-enforced when on Supabase). */
export async function getUserStore(): Promise<Store> {
  assertRunnable();
  if (dataMode() === "supabase") {
    const { getSupabaseUserStore } = await import("./supabase-store");
    return getSupabaseUserStore();
  }
  return getDevStore();
}

/** Trusted server-side store for jobs and the admin panel (service role on Supabase). */
export async function getServiceStore(): Promise<Store> {
  assertRunnable();
  if (dataMode() === "supabase") {
    const { getSupabaseServiceStore } = await import("./supabase-store");
    return getSupabaseServiceStore();
  }
  return getDevStore();
}
