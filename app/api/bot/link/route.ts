import { NextResponse } from "next/server";
import { linkChatWithCode } from "@/lib/bot-linker";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, chatId, messenger, userName } = body;

    if (!code || !chatId || !messenger) {
      return NextResponse.json({ ok: false, message: "اطلاعات ناقص است" }, { status: 400 });
    }

    const res = await linkChatWithCode(code, String(chatId), messenger, userName);
    return NextResponse.json(res);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطای داخلی";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
