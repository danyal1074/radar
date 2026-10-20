import type { Metadata } from "next";
import { CarCalculator } from "@/components/car-calculator";
import { PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { getDailyCarPrices } from "@/lib/daily-prices/service";

export const metadata: Metadata = { title: "ماشین‌حساب هوشمند سود و کارشناسی" };
export const dynamic = "force-dynamic";

export default async function CalculatorPage() {
  await requireContext({ access: true });
  const dailyPrices = await getDailyCarPrices();

  return (
    <div className="space-y-6">
      <PageHeader
        title="ماشین‌حساب هوشمند سود و کارشناسی خودرو"
        description="ابزار اختصاصی نمایشگاه‌داران برای محاسبه افت رنگ و شاسی، قیمت منصفانه روز در تربت‌حیدریه و درصد سود خالص هر معامله بر مبنای آخرین نرخ‌های روز بازار"
      />
      <CarCalculator dailyPrices={dailyPrices} />
    </div>
  );
}
