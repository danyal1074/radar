import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "../env";

/** Request-scoped client acting AS THE SIGNED-IN USER (RLS applies). */
export async function createUserClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try {
          for (const { name, value, options } of items) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookie refresh is handled in proxy.ts.
        }
      },
    },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
    },
  });
}

/** Service-role client: bypasses RLS. Server-only; never import into client code. */
export function createServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
    },
  });
}
