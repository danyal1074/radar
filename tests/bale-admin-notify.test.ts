import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/bot-linker", () => ({
  getTargetChatsForUser: vi.fn(async () => ({
    baleChats: ["1001"],
    telegramChats: [],
    rubikaChats: [],
    eitaaChats: [],
  })),
}));

import { sendAdminNewUserAlert, sendLiveAlert } from "@/lib/notify";

type Call = { url: string; body: string };

function redact(url: string): string {
  return url
    .replace(/\/bot[^/?#]+\//g, "/bot<redacted>/")
    .replace(/eitaayar\.ir\/api\/[^/?#]+/g, "eitaayar.ir/api/<redacted>");
}

function installFetch(mode: "ok" | "unauthorized" | "photo-fails" | "down") {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const raw = String(url);
    const urlRedacted = redact(raw);
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push({ url: urlRedacted, body });

    if (urlRedacted.includes("<redacted>") === false && raw.includes("tapi.bale.ai")) {
      throw new Error("redaction failed");
    }
    if (mode === "down" && urlRedacted.includes("tapi.bale.ai")) {
      throw new TypeError("fetch failed");
    }
    if (mode === "unauthorized" && urlRedacted.includes("tapi.bale.ai")) {
      return new Response("no", { status: 401 });
    }
    if (mode === "photo-fails" && urlRedacted.includes("tapi.bale.ai") && urlRedacted.endsWith("/sendPhoto")) {
      return new Response("no", { status: 401 });
    }
    if (raw.startsWith("https://cdn.example/")) {
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

const alertUser = {
  fullName: "کاربر آزمایشی",
  businessName: "نمایشگاه آزمایش",
  phone: "09120000000",
  city: "مشهد",
  email: "tester@example.com",
  planName: "تست رایگان ۱۴ روزه",
};

describe("admin Bale notifications", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends a new-user alert to the manager Bale chat", async () => {
    const calls = installFetch("ok");
    const ok = await sendAdminNewUserAlert(alertUser);
    expect(ok).toBe(true);

    const bale = calls.filter((call) => call.url.includes("tapi.bale.ai"));
    expect(bale).toHaveLength(1);
    expect(bale[0].url).toBe("https://tapi.bale.ai/bot<redacted>/sendMessage");
    const body = JSON.parse(bale[0].body);
    expect(body.chat_id).toBe("772511114");
    expect(body.parse_mode).toBe("HTML");
    expect(body.text).toContain("کاربر آزمایشی");
    expect(body.text).toContain("نمایشگاه آزمایش");
    expect(body.text).toContain("مشهد");
    expect(body.text).toContain("09120000000");
    expect(bale[0].url).not.toMatch(/bot[^<]/);
  });

  it("reports a bad token without throwing", async () => {
    installFetch("unauthorized");
    const ok = await sendAdminNewUserAlert(alertUser);
    expect(ok).toBe(false);
    const logs = vi.mocked(console.error).mock.calls.map((args) => args.join(" ")).join("\n");
    expect(logs).toContain("HTTP 401");
    expect(logs).not.toContain("tapi.bale.ai");
    expect(logs).not.toMatch(/\/bot[^<\s]+/);
  });

  it("reports Bale being unreachable without throwing", async () => {
    installFetch("down");
    await expect(sendAdminNewUserAlert(alertUser)).resolves.toBe(false);
    const logs = vi.mocked(console.error).mock.calls.map((args) => args.join(" ")).join("\n");
    expect(logs).toContain("TypeError");
    expect(logs).not.toContain("tapi.bale.ai");
  });

  it("sends a listing alert with readable Persian prices and grouped mileage", async () => {
    const calls = installFetch("ok");
    await sendLiveAlert({
      userId: "user-1",
      title: "پژو ۲۰۶",
      source: "divar",
      priceToman: 580_000_000,
      estimatedToman: 700_000_000,
      discountPercent: 17,
      profitToman: 120_000_000,
      city: "مشهد",
      year: 1399,
      mileageKm: 120_000,
      url: "https://divar.ir/v/test",
    });

    const bale = calls.filter((call) => call.url.includes("tapi.bale.ai"));
    expect(bale).toHaveLength(1);
    expect(bale[0].url.endsWith("/sendMessage")).toBe(true);
    const body = JSON.parse(bale[0].body);
    expect(body.chat_id).toBe("1001");
    expect(body.text).toContain("۵۸۰ میلیون تومان");
    expect(body.text).toContain("۱۲۰ میلیون تومان");
    expect(body.text).toContain("۱۳۹۹");
    expect(body.text).not.toContain("۱٬۳۹۹");
    expect(body.text).toContain("کیلومتر");
    expect(body.text).not.toContain("120000");
    expect(body.text).not.toContain("580000000");
  });

  it("falls back from a rejected photo to a text message", async () => {
    const calls = installFetch("photo-fails");
    await sendLiveAlert({
      userId: "user-1",
      title: "پراید",
      source: "divar",
      priceToman: 250_000_000,
      city: "تربت حیدریه",
      imageUrl: "https://cdn.example/car.jpg",
      discountPercent: 0,
    });

    const bale = calls.filter((call) => call.url.includes("tapi.bale.ai"));
    expect(bale).toHaveLength(2);
    expect(bale[0].url.endsWith("/sendPhoto")).toBe(true);
    expect(bale[1].url.endsWith("/sendMessage")).toBe(true);
    expect(JSON.parse(bale[1].body).text).toContain("۲۵۰ میلیون تومان");
  });

  it("keeps going when Bale is down during a listing alert", async () => {
    installFetch("down");
    await expect(
      sendLiveAlert({
        userId: "user-1",
        title: "تیبا",
        source: "sheypoor",
        priceToman: 400_000_000,
        city: "مشهد",
        discountPercent: 0,
      }),
    ).resolves.toBeUndefined();
  });
});
