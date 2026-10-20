# 🚗 رادار هوشمند شکار خودرو دیوار + برآورد (تلگرام و بله)

یک سامانه ماژولار و تمام‌خودکار پایتون برای **پایش بلادرنگ آگهی‌های خودرو در سایت دیوار**، مقایسه قیمت با **مرجع کارشناسی قیمت‌گذاری برآورد (baravard.com)** و مخابره فوری فرصت‌های شکار (حداقل ۱۵٪ الی ۲۰٪ زیر قیمت بازار) به **ربات تلگرام** و **پیام‌رسان بله**.

---

## 🏗 ساختار ماژول‌ها و معماری پروژه

```text
python_car_hunter/
├── config.py             # مدیریت تنظیمات و متغیرهای محیطی
├── divar_scraper.py      # اسکرپر پیشرفته دیوار (استخراج JSON-LD و متادیتا)
├── baravard_evaluator.py # ماژول استعلام و تخمین قیمت برآورد + کش ۲۴ ساعته + ماتریس بنچ‌مارک
├── analyzer.py           # مقایسه قیمت، محاسبه درصد سود و فیلتر شکار
├── notifier.py           # ارسال‌کننده همزمان به تلگرام و بله با قالب‌بندی شکیل
├── bot.py                # ربات تعاملی تلگرام (python-telegram-bot v20+) و تسک دوره‌ای
├── demo_runner.py        # اجرای آزمایشی سریع در ترمینال بدون نیاز به بات
├── requirements.txt      # پیش‌نیازهای پایتون
└── .env.example          # نمونه تنظیمات توکن‌ها و شناسه‌ها
```

---

## 🚀 راهنمای راه‌اندازی گام‌به‌گام

### ۱. دریافت توکن‌های ربات

#### الف) ساخت ربات تلگرام:
1. در تلگرام به ربات رسمی [@BotFather](https://t.me/BotFather) بروید.
2. دستور `/newbot` را ارسال کنید و نام و آیدی ربات را وارد کنید.
3. مقدار **HTTP API Token** را کپی کنید.
4. برای دریافت `Chat ID` حساب خودتان، به ربات [@userinfobot](https://t.me/userinfobot) در تلگرام پیام دهید و مقدار عددی Id را یادداشت کنید.

#### ب) ساخت ربات در پیام‌رسان بله (Bale):
1. در پیام‌رسان بله ربات `BotFather` را جستجو کنید (یا به آی‌دی `@botfather` بروید).
2. با دستور `/newbot` یک ربات جدید بسازید و توکن آن را یادداشت کنید.
3. جهت به دست آوردن شناسه گفتگو (Chat ID)، به ربات خود در بله پیام `/start` بدهید.

### ۲. نصب پیش‌نیازها

پیشنهاد می‌شود یک محیط مجازی (virtualenv) بسازید:

```bash
# ویندوز:
python -m venv venv
venv\Scripts\activate

# لینوکس / مک:
python3 -m venv venv
source venv/bin/activate

# نصب پکیج‌ها:
pip install -r requirements.txt
```

### ۳. تنظیم فایل متغیرهای محیطی (`.env`)

فایل `.env.example` را به `.env` تغییر نام داده و مقادیر خود را وارد کنید:

```env
DIVAR_CITY_SLUG=torbat-heydariyeh
MIN_DISCOUNT_PERCENT=0.15
MIN_VALID_PRICE_TOMAN=150000000

TELEGRAM_BOT_TOKEN=توکن_تلگرام_شما
TELEGRAM_ADMIN_CHAT_ID=شناسه_عددی_تلگرام_شما

BALE_BOT_TOKEN=توکن_بله_شما
BALE_ADMIN_CHAT_ID=شناسه_عددی_بله_شما

CHECK_INTERVAL_MINUTES=15
```

---

## 💻 نحوه اجرا

### اجرای تست سریع (Demo):
بدون نیاز به ساخت ربات، می‌توانید نحوه کارکرد موتور اسکرپر و تحلیل‌گر را مستقیماً در ترمینال مشاهده کنید:
```bash
python demo_runner.py
# یا جستجوی یک خودروی خاص:
python demo_runner.py پراید
```

### اجرای دائمی ربات:
```bash
python bot.py
```

### اجرای دائمی روی سرور لینوکس (Systemd Service):
یک فایل سرویس در مسیر `/etc/systemd/system/car-hunter.service` بسازید:
```ini
[Unit]
Description=Car Radar Hunter Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/python_car_hunter
ExecStart=/path/to/python_car_hunter/venv/bin/python bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```
سپس سرویس را فعال و استارت کنید:
```bash
systemctl daemon-reload
systemctl enable car-hunter
systemctl start car-hunter
```
