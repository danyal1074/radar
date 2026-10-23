"""آزمون ربات بلهٔ مدیر، بدون تماس واقعی با tapi.bale.ai."""

from __future__ import annotations

import asyncio
import importlib
import json
import logging
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ["BALE_BOT_TOKEN"] = "test-token"
os.environ["BALE_ADMIN_CHAT_ID"] = "424242"

import httpx

import config as config_module
import bale_listener

importlib.reload(config_module)
importlib.reload(bale_listener)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("bale_listener").setLevel(logging.WARNING)


def _assert_test_token(path: str) -> None:
    parts = [part for part in path.split("/") if part]
    if len(parts) < 2 or not parts[0].startswith("bot"):
        raise AssertionError("unexpected Bale path shape")
    token = parts[0][len("bot") :]
    if token != "test-token":
        raise AssertionError("Bale call did not use the configured test token")


class Api:
    def __init__(self) -> None:
        self.calls: list[httpx.Request] = []
        self.rules_status = 200
        self.rules_body: dict = {
            "ok": True,
            "registered": True,
            "hasAccess": True,
            "planExpired": False,
            "allowedCitiesCount": 1,
            "planName": "آزمایشی",
            "userCity": "تربت‌حیدریه",
            "rules": [],
        }
        self.link_status = 200
        self.link_body: dict = {"success": True, "message": "متصل شد"}
        self.opps_body: dict = {"ok": True, "opportunities": []}
        self.bale_status = 200
        self.network_down = False

    def handler(self, request: httpx.Request) -> httpx.Response:
        if self.network_down:
            raise httpx.ConnectError("down")
        self.calls.append(request)
        path = request.url.path
        if path.endswith("/sendMessage") or path.endswith("/answerCallbackQuery") or path.endswith("/getUpdates"):
            _assert_test_token(path)
            return httpx.Response(self.bale_status, json={"ok": self.bale_status == 200, "result": []})
        if path.endswith("/rules"):
            return httpx.Response(self.rules_status, json=self.rules_body)
        if path.endswith("/link"):
            return httpx.Response(self.link_status, json=self.link_body)
        if path.endswith("/opportunities"):
            return httpx.Response(200, json=self.opps_body)
        return httpx.Response(404, json={"ok": False})

    def client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(transport=httpx.MockTransport(self.handler))

    def payloads(self, suffix: str) -> list[dict]:
        found = []
        for req in self.calls:
            if req.url.path.endswith(suffix):
                found.append(json.loads(req.content.decode()))
        return found

    def paths(self) -> list[str]:
        return [req.url.path for req in self.calls]


def message(chat_id: str, text: str, first: str = "مدیر") -> dict:
    return {"chat": {"id": chat_id}, "from": {"id": chat_id, "first_name": first}, "text": text}


class BaleAdminBotTest(unittest.TestCase):
    def setUp(self) -> None:
        bale_listener.USER_SESSIONS.clear()
        os.environ["BALE_BOT_TOKEN"] = "test-token"
        os.environ["BALE_ADMIN_CHAT_ID"] = "424242"
        importlib.reload(config_module)

    def test_config_loads_bale_settings(self) -> None:
        self.assertEqual(config_module.config.BALE_BOT_TOKEN, "test-token")
        self.assertEqual(config_module.config.BALE_ADMIN_CHAT_ID, "424242")
        self.assertEqual(bale_listener.current_bale_token(), "test-token")

    def test_prices_use_persian_words(self) -> None:
        self.assertEqual(bale_listener.format_toman_persian(580_000_000), "۵۸۰ میلیون تومان")
        self.assertEqual(
            bale_listener.format_toman_persian(1_450_000_000),
            "۱ میلیارد و ۴۵۰ میلیون تومان",
        )
        self.assertEqual(bale_listener.format_toman_persian(2_000_000_000), "۲ میلیارد تومان")
        self.assertEqual(
            bale_listener.format_toman_persian(450_500_000),
            "۴۵۰ میلیون و ۵۰۰ هزار تومان",
        )
        self.assertEqual(bale_listener.format_toman_persian(0), "۰ تومان")
        self.assertEqual(bale_listener.format_toman_persian(None), "—")
        self.assertNotIn("000", bale_listener.format_toman_persian(580_000_000))

    def test_link_token_ignores_years_inside_sentences(self) -> None:
        self.assertEqual(bale_listener.extract_link_token("123456"), "123456")
        self.assertEqual(bale_listener.extract_link_token("کد ۱۲۳۴۵۶"), "123456")
        self.assertEqual(bale_listener.extract_link_token("09120000000"), "09120000000")
        self.assertEqual(bale_listener.extract_link_token("RADAR-99"), "RADAR-99")
        self.assertEqual(bale_listener.extract_link_token("user@example.com"), "user@example.com")
        self.assertIsNone(bale_listener.extract_link_token("پژو مدل ۱۴۰۲ حدود ۵۸۰"))
        self.assertIsNone(bale_listener.extract_link_token("/rules"))

    def test_retry_backoff(self) -> None:
        self.assertEqual(bale_listener.retry_delay_seconds(None), 0.5)
        self.assertEqual(bale_listener.retry_delay_seconds("http"), 2.0)
        self.assertEqual(bale_listener.retry_delay_seconds("network"), 2.0)
        self.assertEqual(bale_listener.retry_delay_seconds("unauthorized"), 30.0)

    def test_empty_token_does_not_poll_or_send(self) -> None:
        os.environ["BALE_BOT_TOKEN"] = ""
        importlib.reload(config_module)

        async def run() -> None:
            api = Api()
            async with api.client() as client:
                updates, offset, err = await bale_listener.fetch_bale_updates(client, "", 4)
                self.assertEqual((updates, offset, err), ([], 4, "unconfigured"))
                sent = await bale_listener.send_bale_reply(client, "1", "نباید برود")
                self.assertFalse(sent)
            self.assertEqual(api.calls, [])
            await bale_listener.run_bale_polling()

        try:
            asyncio.run(run())
        finally:
            os.environ["BALE_BOT_TOKEN"] = "test-token"
            importlib.reload(config_module)

    def test_bad_token_and_api_down_keep_offset(self) -> None:
        async def run() -> None:
            async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _r: httpx.Response(401, json={"ok": False}))) as client:
                updates, offset, err = await bale_listener.fetch_bale_updates(client, "test-token", 9)
                self.assertEqual(updates, [])
                self.assertEqual(offset, 9)
                self.assertEqual(err, "unauthorized")

            async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _r: httpx.Response(500, text="down"))) as client:
                _updates, offset, err = await bale_listener.fetch_bale_updates(client, "test-token", 9)
                self.assertEqual(offset, 9)
                self.assertEqual(err, "http")

            def boom(_request: httpx.Request) -> httpx.Response:
                raise httpx.ConnectError("down")

            async with httpx.AsyncClient(transport=httpx.MockTransport(boom)) as client:
                _updates, offset, err = await bale_listener.fetch_bale_updates(client, "test-token", 9)
                self.assertEqual(offset, 9)
                self.assertEqual(err, "network")
                sent = await bale_listener.send_bale_reply(client, "1", "سلام")
                self.assertFalse(sent)

            async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _r: httpx.Response(200, content=b"not-json"))) as client:
                _updates, offset, err = await bale_listener.fetch_bale_updates(client, "test-token", 3)
                self.assertEqual(err, "bad_payload")
                self.assertEqual(offset, 3)

        asyncio.run(run())

    def test_receive_update_advances_offset_and_dispatches_admin_command(self) -> None:
        admin = bale_listener.ADMIN_BALE_CHATS[0]

        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.host == "tapi.bale.ai":
                _assert_test_token(request.url.path)
            if request.url.path.endswith("/getUpdates"):
                return httpx.Response(
                    200,
                    json={
                        "ok": True,
                        "result": [
                            {"update_id": 11, "message": message(admin, "/plan")},
                            {"update_id": 12, "message": message(admin, "سلام")},
                        ],
                    },
                )
            if request.url.path.endswith("/sendMessage"):
                return httpx.Response(200, json={"ok": True})
            if "/rules" in request.url.path:
                return httpx.Response(500, json={"ok": False})
            return httpx.Response(404)

        sent: list[str] = []

        def recording(request: httpx.Request) -> httpx.Response:
            response = handler(request)
            if request.url.path.endswith("/sendMessage"):
                sent.append(json.loads(request.content.decode())["text"])
            return response

        async def run_recorded() -> None:
            async with httpx.AsyncClient(transport=httpx.MockTransport(recording)) as client:
                updates, offset, err = await bale_listener.fetch_bale_updates(client, "test-token", 0)
                self.assertIsNone(err)
                self.assertEqual(offset, 12)
                for update in updates:
                    await bale_listener.dispatch_bale_update(client, update)

        asyncio.run(run_recorded())
        self.assertTrue(any("مدیر کل سامانه" in text for text in sent))
        self.assertTrue(any("برای شروع از دکمه‌های منوی زیر" in text for text in sent))

    def test_admin_menu_rules_and_failed_rules_api(self) -> None:
        admin = bale_listener.ADMIN_BALE_CHATS[0]

        async def run() -> None:
            api = Api()
            api.rules_body["rules"] = [{"id": "r1", "name": "پراید مشهد", "price_max_toman": 400_000_000, "min_discount_percent": 5, "city": "مشهد"}]
            api.rules_body["allowedCitiesCount"] = 2
            async with api.client() as client:
                await bale_listener.handle_bale_message(client, message(admin, "📋 فیلترهای فعال من"))
            texts = [item["text"] for item in api.payloads("/sendMessage")]
            self.assertTrue(any("پراید مشهد" in text for text in texts))

            api2 = Api()
            api2.rules_status = 503
            async with api2.client() as client:
                await bale_listener.handle_bale_message(client, message(admin, "/rules"))
            texts = [item["text"] for item in api2.payloads("/sendMessage")]
            self.assertTrue(texts)
            self.assertTrue(all("خطا در دریافت لیست فیلترها" in text for text in texts))
            self.assertFalse(any("هیچ فیلتری" in text for text in texts))

        asyncio.run(run())

    def test_admin_wizard_survives_site_outage_and_callback(self) -> None:
        admin = bale_listener.ADMIN_BALE_CHATS[0]

        async def run() -> None:
            api = Api()
            api.rules_status = 500
            async with api.client() as client:
                await bale_listener.handle_bale_message(client, message(admin, "➕ تعریف فیلتر خودرو (شکار جدید)"))
                texts = [item["text"] for item in api.payloads("/sendMessage")]
                self.assertTrue(any("۲ شهر" in text for text in texts))
                await bale_listener.handle_bale_callback(
                    client,
                    {
                        "id": "cb-city",
                        "data": "city:مشهد",
                        "from": {"id": admin, "first_name": "مدیر"},
                        "message": {"chat": {"id": admin}},
                    },
                )
            self.assertTrue(any(path.endswith("/answerCallbackQuery") for path in api.paths()))
            texts = [item["text"] for item in api.payloads("/sendMessage")]
            self.assertTrue(any("مشهد" in text and "خودرو" in text for text in texts))

            api.calls.clear()
            async with api.client() as client:
                bale_listener.USER_SESSIONS[admin] = {"step": "budget", "fa_name": "پراید"}
                await bale_listener.handle_bale_callback(
                    client,
                    {
                        "id": "cb-bad",
                        "data": "budget:abc",
                        "from": {"id": admin, "first_name": "مدیر"},
                        "message": {"chat": {"id": admin}},
                    },
                )
            texts = [item["text"] for item in api.payloads("/sendMessage")]
            self.assertTrue(any("بودجه نامعتبر" in text for text in texts))

        asyncio.run(run())

    def test_guest_server_down_is_not_treated_as_unregistered(self) -> None:
        async def run() -> None:
            api = Api()
            api.rules_status = 500
            async with api.client() as client:
                await bale_listener.handle_bale_message(client, message("555000111", "/start", "مهمان"))
            texts = [item["text"] for item in api.payloads("/sendMessage")]
            self.assertTrue(any("خطا در ارتباط با سرور" in text for text in texts))
            self.assertFalse(any("کد ۶ رقمی" in text for text in texts))

            api = Api()
            api.rules_body = {"ok": True, "registered": False, "hasAccess": False}
            async with api.client() as client:
                await bale_listener.handle_bale_message(client, message("555000111", "/start", "مهمان"))
            texts = [item["text"] for item in api.payloads("/sendMessage")]
            self.assertTrue(any("کد ۶ رقمی" in text for text in texts))

        asyncio.run(run())

    def test_link_code_and_plain_sentence(self) -> None:
        admin = bale_listener.ADMIN_BALE_CHATS[0]

        async def run() -> None:
            api = Api()
            async with api.client() as client:
                await bale_listener.handle_bale_message(client, message(admin, "کد ۱۲۳۴۵۶"))
            self.assertTrue(any(path.endswith("/link") for path in api.paths()))
            link_body = json.loads(next(req.content.decode() for req in api.calls if req.url.path.endswith("/link")))
            self.assertEqual(link_body["code"], "123456")
            self.assertEqual(link_body["messenger"], "bale")
            texts = [item["text"] for item in api.payloads("/sendMessage")]
            self.assertTrue(any("متصل شد" in text for text in texts))

            api = Api()
            async with api.client() as client:
                await bale_listener.handle_bale_message(client, message(admin, "پژو مدل ۱۴۰۲"))
            self.assertFalse(any(path.endswith("/link") for path in api.paths()))
            texts = [item["text"] for item in api.payloads("/sendMessage")]
            self.assertTrue(any("دکمه‌های منوی زیر" in text for text in texts))

            api = Api()

            def down_on_link(request: httpx.Request) -> httpx.Response:
                if request.url.path.endswith("/link"):
                    raise httpx.ConnectError("down")
                return api.handler(request)

            async with httpx.AsyncClient(transport=httpx.MockTransport(down_on_link)) as client:
                await bale_listener.handle_bale_message(client, message("555000111", "123456", "مهمان"))
            texts = [item["text"] for item in api.payloads("/sendMessage")]
            self.assertTrue(any("خطا در ارتباط با سرور" in text for text in texts))

        asyncio.run(run())

    def test_admin_opportunity_card_uses_readable_price_when_rules_api_is_down(self) -> None:
        admin = bale_listener.ADMIN_BALE_CHATS[0]

        async def run() -> None:
            api = Api()
            api.rules_status = 502
            api.opps_body = {
                "ok": True,
                "opportunities": [
                    {
                        "title": "پژو ۲۰۶",
                        "priceToman": 580_000_000,
                        "estimatedToman": 700_000_000,
                        "profitToman": 120_000_000,
                        "discountPercent": 17,
                        "source": "divar",
                        "city": "مشهد",
                        "url": "https://divar.ir/v/test",
                    }
                ],
            }
            async with api.client() as client:
                await bale_listener.handle_bale_message(client, message(admin, "🎯 آخرین فرصت‌های شکار"))
            texts = [item["text"] for item in api.payloads("/sendMessage")]
            joined = "\n".join(texts)
            self.assertIn("۵۸۰ میلیون تومان", joined)
            self.assertIn("۷۰۰ میلیون تومان", joined)
            self.assertNotIn("580000000", joined)
            self.assertNotIn("۰۰۰", joined)
            markups = [item.get("reply_markup") or {} for item in api.payloads("/sendMessage")]
            buttons = json.dumps(markups, ensure_ascii=False)
            self.assertIn("opp:mashhad", buttons)

        asyncio.run(run())

    def test_send_message_reports_http_failure(self) -> None:
        async def run() -> None:
            api = Api()
            api.bale_status = 401
            async with api.client() as client:
                ok = await bale_listener.send_bale_reply(client, "1", "سلام")
            self.assertFalse(ok)
            payload = api.payloads("/sendMessage")[0]
            self.assertEqual(payload["chat_id"], "1")
            self.assertEqual(payload["parse_mode"], "HTML")
            self.assertEqual(payload["text"], "سلام")

            api = Api()
            async with api.client() as client:
                ok = await bale_listener.send_bale_reply(client, "1", "<b>سلام</b>")
            self.assertTrue(ok)

        asyncio.run(run())


if __name__ == "__main__":
    unittest.main()
