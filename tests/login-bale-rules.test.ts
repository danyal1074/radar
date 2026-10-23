import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { evaluateRule, ruleMatchesListing } from "@/lib/alerts/engine";
import { loginAuthEmails, usernameProfileOrFilter } from "@/lib/auth/login-identifier";
import {
  DANIAL_ADMIN_UUID,
  DEFAULT_ADMIN_BALE_CHATS,
  getUserIdByChatId,
  linkChatWithCode,
  registerDirectChat,
  setBotSubscriberStorageForTests,
} from "@/lib/bot-linker";
import { decodeRuleFlags, encodeRuleForLiveSchema } from "@/lib/db/rule-columns";
import type { Listing, WatchRule, WatchRuleInput } from "@/lib/types";

const OLD_GMAIL = "danyal.haghdady@gmail.com";

describe("login identifier resolution", () => {
  it("tries the phone account first and the older inbox only as a fallback", () => {
    const owner = ["09999212209@radar.digiral.ir", OLD_GMAIL];
    expect(loginAuthEmails("09999212209")).toEqual(owner);
    expect(loginAuthEmails("۰۹۹۹۹۲۱۲۲۰۹")).toEqual(owner);
    expect(loginAuthEmails("9999212209")).toEqual(owner);
    expect(loginAuthEmails("0999 921 2209")).toEqual(owner);
    expect(loginAuthEmails("09120000991")).toEqual(["09120000991@radar.digiral.ir"]);
  });

  it("keeps the usernames that used to reach the older account", () => {
    expect(loginAuthEmails("danyal")).toEqual([OLD_GMAIL]);
    expect(loginAuthEmails("danyal1074")).toEqual([OLD_GMAIL]);
    expect(loginAuthEmails("danyal.haghdady")).toEqual([OLD_GMAIL]);
    expect(loginAuthEmails("admin")).toEqual(["admin@radar.ir"]);
    expect(loginAuthEmails("danyal", [
      {
        id: "new-account",
        email: "09999212209@radar.digiral.ir",
        authEmail: "09999212209@radar.digiral.ir",
        fullName: "danyal",
      },
    ])).toEqual(["09999212209@radar.digiral.ir", OLD_GMAIL]);
  });

  it("quotes dotted usernames in the profile filter and keeps spaces as wildcards", () => {
    const dotted = usernameProfileOrFilter("danyal.haghdady");
    expect(dotted).toBe(
      'email.ilike."danyal.haghdady@%",full_name.ilike."%danyal.haghdady%",business_name.ilike."%danyal.haghdady%"',
    );
    expect(dotted).not.toContain("email.ilike.danyal.haghdady@%");
    expect(usernameProfileOrFilter("دانیال حقدادی")).toContain('full_name.ilike."%دانیال%حقدادی%"');
    expect(usernameProfileOrFilter("09120000991")).toBeNull();
  });

  it("signs an inbox address in with the auth email stored for that profile", () => {
    const emails = loginAuthEmails("owner@gmail.com", [
      {
        id: "new-account",
        email: "owner@gmail.com",
        authEmail: "09999212209@radar.digiral.ir",
      },
      {
        id: "old-account",
        email: OLD_GMAIL,
        authEmail: OLD_GMAIL,
      },
    ]);
    expect(emails[0]).toBe("09999212209@radar.digiral.ir");
    expect(emails).toContain("owner@gmail.com");
    expect(emails).not.toContain(OLD_GMAIL);
  });

  it("resolves a username from profile hints before any legacy alias", () => {
    expect(loginAuthEmails("showroom", [
      {
        id: "u1",
        email: "09120000000@radar.digiral.ir",
        authEmail: "09120000000@radar.digiral.ir",
        businessName: "showroom",
      },
    ])).toEqual(["09120000000@radar.digiral.ir"]);
  });
});

const listing = (o: Partial<Listing> = {}): Listing => ({
  id: "L1", source: "divar", source_post_id: "s1", source_url: null, title: "پراید۱۱۱",
  make: "پراید", model: "پراید 111 ساده", trim: null, year: 1399, mileage_km: 90_000, color: null,
  city: "مشهد", price_toman: 850_000_000, description: null, image_url: null, published_at: null,
  first_seen_at: "x", last_seen_at: "x", source_status: "active", is_sample: false, created_at: "x", updated_at: "x",
  ...o,
});

const rule = (o: Partial<WatchRule>): WatchRule => ({
  id: "R1", user_id: "U1", name: "سایپا", make: "سایپا", model: "پراید", year_min: null, year_max: null,
  price_min_toman: null, price_max_toman: 900_000_000, mileage_min_km: null, mileage_max_km: null,
  city: null, source: null, min_discount_percent: 0, min_discount_toman: null, is_active: true,
  created_at: "x", updated_at: "x", ...o,
});

describe("brand alias matching", () => {
  it("matches a Saipa/Pride rule against listings stored as make Pride", () => {
    expect(ruleMatchesListing(rule({}), listing())).toBe(true);
    expect(ruleMatchesListing(rule({}), listing({ price_toman: 900_000_000 }))).toBe(true);
    expect(ruleMatchesListing(rule({}), listing({ price_toman: 900_000_001 }))).toBe(false);
  });

  it("matches the saved Bale rules named پراید تا 900 میلیون", () => {
    const saved = rule({
      name: "پراید تا 900 میلیون (همه آگهی‌ها)",
      make: "سایپا",
      model: "پراید",
      price_max_toman: 900_000_000,
      min_discount_percent: 0,
      city: null,
    });
    const pride = listing({
      make: "پراید",
      model: "پراید 111 ساده",
      title: "پراید۱۱۱",
      price_toman: 850_000_000,
      city: "مشهد",
    });
    expect(ruleMatchesListing(saved, pride)).toBe(true);
    expect(evaluateRule(saved, pride, null).hit).toBe(true);
    const cityRule = rule({ ...saved, city: "تربت‌حیدریه" });
    expect(ruleMatchesListing(cityRule, listing({ city: "تربت حیدریه", price_toman: 850_000_000 }))).toBe(true);
    expect(ruleMatchesListing(cityRule, pride)).toBe(false);
  });

  it("does not let a Pride model match a Tiba, and does not let Saipa match Peugeot", () => {
    expect(ruleMatchesListing(rule({}), listing({ make: "تیبا", model: "تیبا ۲", title: "تیبا ۲" }))).toBe(false);
    expect(ruleMatchesListing(rule({ model: null }), listing({ make: "پژو", model: "206", title: "پژو ۲۰۶" }))).toBe(false);
  });

  it("matches Iran Khodro / 206 against a Peugeot listing", () => {
    const hit = rule({ make: "ایران خودرو", model: "206" });
    expect(ruleMatchesListing(hit, listing({ make: "پژو", model: "206 تیپ ۲", title: "پژو ۲۰۶" }))).toBe(true);
    expect(ruleMatchesListing(hit, listing({ make: "پراید", model: "پراید", title: "پراید" }))).toBe(false);
  });
});

describe("live watch_rules payload", () => {
  const input: WatchRuleInput = {
    name: "پراید مشهد",
    make: "سایپا",
    model: "پراید",
    year_min: null,
    year_max: null,
    price_min_toman: null,
    price_max_toman: 900_000_000,
    mileage_min_km: null,
    mileage_max_km: null,
    city: "مشهد",
    source: null,
    min_discount_percent: 0,
    min_discount_toman: null,
    is_active: true,
    urgent_only: true,
    paint_free_only: false,
    damage_filter: "clean_only",
  };

  it("omits columns the live schema does not have and keeps the flags in the name", () => {
    const row = encodeRuleForLiveSchema(input);
    expect(row).not.toHaveProperty("damage_filter");
    expect(row).not.toHaveProperty("urgent_only");
    expect(row).not.toHaveProperty("paint_free_only");
    expect(row.name).toContain("[فوری]");
    expect(row.name).toContain("[سالم]");
    expect(row.name).not.toContain("[تصادفی]");
    const decoded = decodeRuleFlags({ name: String(row.name) });
    expect(decoded.urgent_only).toBe(true);
    expect(decoded.paint_free_only).toBe(false);
    expect(decoded.damage_filter).toBe("clean_only");
  });
});

describe("chat link ownership", () => {
  let dir = "";

  afterEach(async () => {
    setBotSubscriberStorageForTests(null);
    if (dir) await rm(dir, { recursive: true, force: true });
    dir = "";
  });

  async function useFile(data: unknown) {
    dir = await mkdtemp(path.join(tmpdir(), "radar-bots-"));
    const file = path.join(dir, "bot_subscribers.json");
    await writeFile(file, JSON.stringify(data));
    setBotSubscriberStorageForTests(file);
    return file;
  }

  it("uses the newer account when the owner's Bale chat is on two rows", async () => {
    const oldId = "d5272512-cced-4a71-84db-c3f0100e8a15";
    const newId = "e8da9d5d-6f5a-44eb-99c2-377179fc0572";
    await useFile({
      codes: {},
      subscribers: {
        [oldId]: { userId: oldId, baleChatId: "555001", linkedAt: "2026-10-20T09:30:00.000Z" },
        [newId]: { userId: newId, baleChatId: "555001", linkedAt: "2026-10-23T19:25:56.000Z" },
      },
    });
    expect(await getUserIdByChatId("555001", "bale")).toBe(newId);
  });

  it("prefers the newest link when two accounts share a chat id", async () => {
    await useFile({
      codes: {},
      subscribers: {
        "user-old": { userId: "user-old", baleChatId: "555001", linkedAt: "2026-10-20T00:00:00.000Z" },
        "user-new": { userId: "user-new", baleChatId: "555001", linkedAt: "2026-10-23T19:25:56.000Z" },
      },
    });
    expect(await getUserIdByChatId("555001", "bale")).toBe("user-new");
  });

  it("removes the chat id from every other account when linking", async () => {
    const file = await useFile({
      codes: { "654321": "user-new" },
      subscribers: {
        "user-old": { userId: "user-old", baleChatId: "555001", linkedAt: "2026-10-20T00:00:00.000Z", userName: "old" },
      },
    });
    const linked = await linkChatWithCode("654321", "555001", "bale", "new");
    expect(linked.success).toBe(true);
    expect(linked.userId).toBe("user-new");
    expect(await getUserIdByChatId("555001", "bale")).toBe("user-new");
    const saved = JSON.parse(await readFile(file, "utf8"));
    expect(saved.subscribers["user-old"].baleChatId).toBeUndefined();
    expect(saved.subscribers["user-new"].baleChatId).toBe("555001");
  });

  it("does not treat the typo admin chat id as the manager", async () => {
    await useFile({ codes: {}, subscribers: {} });
    expect(DEFAULT_ADMIN_BALE_CHATS).not.toContain("2079437548");
    expect(await getUserIdByChatId("2079437548", "bale")).toBeNull();
    expect(await getUserIdByChatId("772511114", "bale")).toBe(DANIAL_ADMIN_UUID);
    await registerDirectChat("user-new", "772511114", "bale", "new");
    expect(await getUserIdByChatId("772511114", "bale")).toBe("user-new");
  });
});
