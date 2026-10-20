import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSession, verifySession } from "@/lib/auth/session-token";
import { isAllowedListingUrl } from "@/lib/validation";

describe("password hashing", () => {
  it("verifies correct and rejects wrong passwords; salts differ", async () => {
    const h1 = await hashPassword("Passw0rd!x");
    const h2 = await hashPassword("Passw0rd!x");
    expect(h1).not.toBe(h2);
    expect(await verifyPassword("Passw0rd!x", h1)).toBe(true);
    expect(await verifyPassword("wrong", h1)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("session token", () => {
  const secret = "s".repeat(32);
  it("round-trips, rejects tamper, wrong secret and expiry", () => {
    const t = signSession({ uid: "u1", exp: 2_000_000_000 }, secret);
    expect(verifySession(t, secret, 1_900_000_000)?.uid).toBe("u1");
    expect(verifySession(t + "x", secret, 1_900_000_000)).toBeNull();
    expect(verifySession(t, "other".repeat(8), 1_900_000_000)).toBeNull();
    expect(verifySession(t, secret, 2_000_000_001)).toBeNull();
    expect(verifySession(undefined, secret)).toBeNull();
  });
});

describe("listing URL allow-list", () => {
  it("accepts https divar/sheypoor only", () => {
    expect(isAllowedListingUrl("https://divar.ir/v/x/AbC")).toBe(true);
    expect(isAllowedListingUrl("https://www.sheypoor.com/v/123")).toBe(true);
    expect(isAllowedListingUrl("http://divar.ir/v/x")).toBe(false);
    expect(isAllowedListingUrl("https://evil.com/divar.ir")).toBe(false);
    expect(isAllowedListingUrl("https://divar.ir.evil.com/x")).toBe(false);
    expect(isAllowedListingUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedListingUrl("https://user:pw@divar.ir/x")).toBe(false);
    expect(isAllowedListingUrl(null)).toBe(false);
    expect(isAllowedListingUrl("not a url")).toBe(false);
  });
});
