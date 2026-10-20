import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { isJunkOrUnrealisticListing } from '../lib/junk-filter.ts';

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function purgeJunk() {
  console.log('🔄 استخراج آگهی‌های ثبت شده در Supabase...');
  const { data: listings, error } = await sb.from('listings').select('*');
  if (error) {
    console.error('خطا در دریافت لیست آگهی‌ها:', error);
    return;
  }

  const junkIds = [];
  const junkDetails = [];

  for (const item of listings) {
    const res = isJunkOrUnrealisticListing(item);
    if (res.isJunk) {
      junkIds.push(item.id);
      junkDetails.push({
        id: item.id,
        title: item.title,
        price: item.price_toman,
        source: item.source,
        reason: res.reason,
      });
    }
  }

  console.log(`\n🔍 تعداد کل آگهی‌ها: ${listings.length}`);
  console.log(`🚨 تعداد آگهی‌های شناسایی شده به عنوان اسپم/حواله/قیمت غیرواقعی: ${junkIds.length}\n`);

  if (junkIds.length === 0) {
    console.log('✅ هیچ آگهی نامعتبری در پایگاه داده وجود ندارد.');
    return;
  }

  for (const j of junkDetails) {
    console.log(`❌ در حال حذف: [${j.source}] "${j.title}" - ${Number(j.price).toLocaleString()} تومان | علت: ${j.reason}`);
  }

  // ۱. حذف وابستگی‌ها در جدول‌های تاریخچه قیمت، تخمین قیمت، نشان‌شده‌ها و پیگیری‌ها
  console.log('\n🧹 پاکسازی وابستگی‌ها...');
  const delHistory = await sb.from('listing_price_history').delete().in('listing_id', junkIds);
  if (delHistory.error) console.warn('هشدار در حذف تاریخچه قیمت:', delHistory.error.message);

  const delEstimates = await sb.from('price_estimates').delete().in('listing_id', junkIds);
  if (delEstimates.error) console.warn('هشدار در حذف تخمین‌ها:', delEstimates.error.message);

  const delSaved = await sb.from('saved_listings').delete().in('listing_id', junkIds);
  if (delSaved.error) console.warn('هشدار در حذف آگهی‌های نشان‌شده:', delSaved.error.message);

  const delFollowups = await sb.from('followups').delete().in('listing_id', junkIds);
  if (delFollowups.error) console.warn('هشدار در حذف پیگیری‌ها:', delFollowups.error.message);

  // ۲. حذف خود آگهی‌ها
  const delListings = await sb.from('listings').delete().in('id', junkIds);
  if (delListings.error) {
    console.error('❌ خطا در حذف آگهی‌ها از جدول listings:', delListings.error);
    return;
  }

  console.log(`\n🎉 با موفقیت ${junkIds.length} آگهی نامعتبر، حواله و غیرواقعی برای همیشه از پایگاه داده حذف شدند!`);

  // ۳. بررسی نهایی آگهی‌های باقی‌مانده
  const { data: remaining } = await sb.from('listings').select('title, price_toman, source, make');
  console.log(`\n📊 تعداد آگهی‌های تمیز و واقعی باقی‌مانده در پایگاه داده: ${remaining ? remaining.length : 0}`);
  if (remaining) {
    remaining.forEach((r, idx) => {
      console.log(`  ${idx + 1}. [${r.source}] ${r.title} - ${Number(r.price_toman).toLocaleString()} تومان (${r.make})`);
    });
  }
}

purgeJunk();
