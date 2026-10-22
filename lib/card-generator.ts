import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

function toPersianDigits(n: number | string): string {
  if (n === null || n === undefined) return '';
  return String(n)
    .replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export interface CardOptions {
  title: string;
  year?: number | null;
  mileageKm?: number | null;
  color?: string | null;
  sellerPriceToman: number;
  marketPriceToman?: number | null;
  profitToman?: number | null;
  discountPercent?: number | null;
  city: string;
  sourceName?: string;
  imageUrl?: string | null;
  isUrgent?: boolean;
}

export async function generateCarAdCard(opts: CardOptions): Promise<Buffer> {
  const fontBoldPath = path.resolve('lib/assets/fonts/Vazirmatn-Bold.ttf');
  const fontRegPath = path.resolve('lib/assets/fonts/Vazirmatn-Regular.ttf');
  const fontMedPath = path.resolve('lib/assets/fonts/Vazirmatn-Medium.ttf');

  const fontBold = fs.readFileSync(fontBoldPath);
  const fontReg = fs.readFileSync(fontRegPath);
  const fontMed = fs.readFileSync(fontMedPath);

  // Try fetching the image as base64 if provided
  let imageBase64: string | null = null;
  if (opts.imageUrl && opts.imageUrl.startsWith('http')) {
    try {
      const imgRes = await fetch(opts.imageUrl, { signal: AbortSignal.timeout(4000) });
      if (imgRes.ok) {
        const ab = await imgRes.arrayBuffer();
        const mime = imgRes.headers.get('content-type') || 'image/jpeg';
        imageBase64 = `data:${mime};base64,${Buffer.from(ab).toString('base64')}`;
      }
    } catch {
      // Fallback if image fails to download
    }
  }

  const effectiveMarketPrice = opts.marketPriceToman || (opts.profitToman ? opts.sellerPriceToman + opts.profitToman : null);
  const diffToman = effectiveMarketPrice && effectiveMarketPrice > opts.sellerPriceToman
    ? effectiveMarketPrice - opts.sellerPriceToman
    : opts.profitToman || 0;

  const titleText = `${opts.title} ${opts.year ? `| مدل ${toPersianDigits(opts.year)}` : ''}`.trim();
  const kmText = opts.mileageKm === 0
    ? 'صفر کیلومتر'
    : opts.mileageKm ? `${toPersianDigits(opts.mileageKm)} km` : 'مشخص نشده';
  const colorText = opts.color || 'مشخص نشده';
  const sourceTitle = `${opts.sourceName || 'دیوار'} ${opts.city || 'مشهد'}`;

  // Satori JSX-like structure
  const element = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '680px',
        backgroundColor: '#e6f3eb',
        padding: '24px',
        fontFamily: 'Vazirmatn',
        direction: 'rtl',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: '28px',
              padding: '22px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
            },
            children: [
              // 1. Car Image (or sleek gradient placeholder)
              imageBase64
                ? {
                    type: 'img',
                    props: {
                      src: imageBase64,
                      style: {
                        width: '100%',
                        height: '320px',
                        borderRadius: '20px',
                        objectFit: 'cover',
                      },
                    },
                  }
                : {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '240px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                        color: '#ffffff',
                      },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: { fontSize: '48px', marginBottom: '8px' },
                            children: '🚗',
                          },
                        },
                        {
                          type: 'div',
                          props: {
                            style: { fontSize: '24px', fontWeight: 700 },
                            children: 'رادار شکار خودرو',
                          },
                        },
                      ],
                    },
                  },

              // 2. Badges Row
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '18px',
                    marginBottom: '14px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          padding: '6px 18px',
                          borderRadius: '999px',
                          fontSize: '17px',
                          fontWeight: 700,
                        },
                        children: '⬇ زیر قیمت بازار',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: opts.isUrgent ? '#dc2626' : '#2563eb',
                          color: '#ffffff',
                          padding: '6px 18px',
                          borderRadius: '999px',
                          fontSize: '17px',
                          fontWeight: 700,
                        },
                        children: opts.isUrgent ? '⚡ فروش فوری' : '🎯 فرصت خرید',
                      },
                    },
                  ],
                },
              },

              // 3. Title Row
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '27px',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '14px',
                    textAlign: 'center',
                  },
                  children: `🚙 ${titleText}`,
                },
              },

              // 4. Divider
              {
                type: 'div',
                props: {
                  style: {
                    width: '100%',
                    height: '1px',
                    backgroundColor: '#e2e8f0',
                    marginBottom: '14px',
                  },
                },
              },

              // 5. Specs Grid (Color & Mileage)
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    padding: '6px 0',
                    marginBottom: '16px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', flexDirection: 'row', alignItems: 'center', fontSize: '18px' },
                        children: [
                          { type: 'span', props: { style: { color: '#64748b', marginLeft: '6px' }, children: '🎨 رنگ:' } },
                          { type: 'span', props: { style: { fontWeight: 700, color: '#1e293b' }, children: colorText } },
                        ],
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: { width: '1px', height: '24px', backgroundColor: '#cbd5e1' },
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', flexDirection: 'row', alignItems: 'center', fontSize: '18px' },
                        children: [
                          { type: 'span', props: { style: { color: '#64748b', marginLeft: '6px' }, children: '⏱ کارکرد:' } },
                          { type: 'span', props: { style: { fontWeight: 700, color: '#1e293b' }, children: kmText } },
                        ],
                      },
                    },
                  ],
                },
              },

              // 6. Pricing Card (Seller Price & Market Price)
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '18px',
                    padding: '16px 20px',
                    marginBottom: '14px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: effectiveMarketPrice ? '12px' : '0px',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: { fontSize: '19px', fontWeight: 700, color: '#334155' },
                              children: '🏷️ قیمت فروشنده',
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: { fontSize: '26px', fontWeight: 800, color: '#1d4ed8' },
                              children: `${toPersianDigits(opts.sellerPriceToman)} تومان`,
                            },
                          },
                        ],
                      },
                    },
                    effectiveMarketPrice
                      ? {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            },
                            children: [
                              {
                                type: 'div',
                                props: {
                                  style: { fontSize: '17px', color: '#64748b' },
                                  children: '📊 برآورد قیمت بازار',
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: { fontSize: '19px', fontWeight: 700, color: '#334155' },
                                  children: `${toPersianDigits(effectiveMarketPrice)} تومان`,
                                },
                              },
                            ],
                          },
                        }
                      : null,
                  ].filter(Boolean),
                },
              },

              // 7. Discount / Profit Green Box
              diffToman > 0
                ? {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '16px',
                        padding: '12px',
                        marginBottom: '14px',
                      },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: { fontSize: '22px', fontWeight: 800, color: '#15803d', marginBottom: '2px' },
                            children: `⬇ حدود ${toPersianDigits(diffToman)} تومان`,
                          },
                        },
                        {
                          type: 'div',
                          props: {
                            style: { fontSize: '15px', fontWeight: 600, color: '#16a34a' },
                            children: 'پایین‌تر از بازار',
                          },
                        },
                      ],
                    },
                  }
                : null,

              // 8. Footer Metadata Row
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '15px',
                    color: '#64748b',
                    padding: '0 4px',
                    marginBottom: '14px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        children: `منبع: ${sourceTitle} 🔗`,
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        children: 'لحظاتی پیش 🕒',
                      },
                    },
                  ],
                },
              },

              // 9. CTA Button
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #2563eb',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    borderRadius: '16px',
                    padding: '14px 20px',
                    fontSize: '19px',
                    fontWeight: 700,
                  },
                  children: '↗️ مشاهده آگهی اصلی',
                },
              },
            ].filter(Boolean),
          },
        },

        // 10. Watermark
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: '14px',
              fontSize: '14px',
              color: '#64748b',
            },
            children: 'radar.digiral.ir • شکار خودرو 🎯',
          },
        },
      ],
    },
  };

  const svg = await satori(element as any, {
    width: 680,
    fonts: [
      {
        name: 'Vazirmatn',
        data: fontBold,
        weight: 700,
        style: 'normal',
      },
      {
        name: 'Vazirmatn',
        data: fontMed,
        weight: 500,
        style: 'normal',
      },
      {
        name: 'Vazirmatn',
        data: fontReg,
        weight: 400,
        style: 'normal',
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 680 },
  });
  return resvg.render().asPng();
}
