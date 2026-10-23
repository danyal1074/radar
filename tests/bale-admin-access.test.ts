import { describe, expect, it } from "vitest";
import { DANIAL_ADMIN_UUID, DEFAULT_ADMIN_BALE_CHATS, getTargetChatsForUser, getUserIdByChatId } from "@/lib/bot-linker";

describe("manager Bale chat access", () => {
  it("treats the configured admin Bale chats as the manager account", async () => {
    expect(DEFAULT_ADMIN_BALE_CHATS.length).toBeGreaterThan(0);
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
