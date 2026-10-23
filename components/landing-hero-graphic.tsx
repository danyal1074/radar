"use client";

import Image from "next/image";

export function LandingHeroGraphic() {
  return (
    <div className="relative mx-auto w-full max-w-lg py-4">
      <div className="float-card">
        <Image
          src="/hero-radar-car.png"
          alt="نمونه آگهی روی رادار: پژو ۲۰۶ تیپ ۲، ۴۸۰ میلیون تومان"
          width={640}
          height={420}
          priority
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}
