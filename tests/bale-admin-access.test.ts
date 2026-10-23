import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DANIAL_ADMIN_UUID, DEFAULT_ADMIN_BALE_CHATS, getTargetChatsForUser, getUserIdByChatId, setBotSubscriberStorageForTests } from "@/lib/bot-linker";

describe("manager Bale chat access", () => {
  let dir = "";

  afterEach(async () => {
    setBotSubscriberStorageForTests(null);
    if (dir) await rm(dir, { recursive: true, force: true });
    dir = "";
  });

  it("treats unlinked configured admin Bale chats as the manager account", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "radar-admin-"));
    setBotSubscriberStorageForTests(path.join(dir, "empty.json"));
    expect(DEFAULT_ADMIN_BALE_CHATS.length).toBeGreaterThan(0);
    expect(DEFAULT_ADMIN_BALE_CHATS).not.toContain("2079437548");
    for (const chatId of DEFAULT_ADMIN_BALE_CHATS) {
      expect(await getUserIdByChatId(chatId, "bale")).toBe(DANIAL_ADMIN_UUID);
    }
    expect(await getUserIdByChatId("not-a-real-bale-chat", "bale")).not.toBe(DANIAL_ADMIN_UUID);
  });

  it("includes every admin Bale chat when alerting the manager", async () => {
    const targets = await getTargetChatsForUser("admin");
    for (const chatId of DEFAULT_ADMIN_BALE_CHATS) {
      expect(targets.baleChats).toContain(chatId);
    }
    const stranger = await getTargetChatsForUser("not-the-manager");
    for (const chatId of DEFAULT_ADMIN_BALE_CHATS) {
      expect(stranger.baleChats).not.toContain(chatId);
    }
  });
});
