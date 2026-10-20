import { createClient } from "@supabase/supabase-js";

async function test() {
  const sb = createClient(
    "https://mhjktkkzjgatyacmlnxx.supabase.co",
    "sb_publishable_kE4zv8k6RnbL2ogmjTKenw_PM7rre3r"
  );
  const r = await sb.auth.signInWithPassword({
    email: "admin@radar.ir",
    password: "danyal1074",
  });
  if (r.error) {
    console.error("Login error:", r.error);
    return;
  }

  // Next.js @supabase/ssr creates cookie base64 format
  const cookieName = "sb-mhjktkkzjgatyacmlnxx-auth-token";
  const sessionData = [r.data.session.access_token, r.data.session.refresh_token];
  const cookieVal = encodeURIComponent(
    "base64-" + Buffer.from(JSON.stringify(sessionData)).toString("base64")
  );

  const cookieHeader = `${cookieName}=${cookieVal}; ${cookieName}.0=${cookieVal}`;

  const calcRes = await fetch("http://localhost:3000/calculator", {
    headers: { Cookie: cookieHeader },
  });
  console.log("/calculator status:", calcRes.status);
  const calcText = await calcRes.text();
  console.log("Includes متصل به جدول قیمت‌های روز:", calcText.includes("متصل به جدول قیمت‌های روز"));
  console.log("Includes قیمت روز این مدل در بازار:", calcText.includes("قیمت روز این مدل در بازار"));

  const adminRes = await fetch("http://localhost:3000/admin/prices", {
    headers: { Cookie: cookieHeader },
  });
  console.log("/admin/prices status:", adminRes.status);
  const adminText = await adminRes.text();
  console.log("Includes bama.ir:", adminText.includes("bama.ir"));
  console.log("Includes car.ir:", adminText.includes("car.ir"));
  console.log("Includes کارشناسی عرف:", adminText.includes("کارشناسی عرف"));
}

test();
