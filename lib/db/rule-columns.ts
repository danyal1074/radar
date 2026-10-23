import type { WatchRule, WatchRuleInput } from "../types";

/**
 * Columns that exist on public.watch_rules in the live database (0001_init.sql).
 * damage_filter, urgent_only, and paint_free_only are NOT in that schema.
 * Those flags are kept in the rule name so reads still work before the optional
 * migration in supabase/migrations/0002_optional_rule_and_chat_columns.sql.
 */
const LIVE_WATCH_RULE_COLUMNS = [
  "name",
  "make",
  "model",
  "year_min",
  "year_max",
  "price_min_toman",
  "price_max_toman",
  "mileage_min_km",
  "mileage_max_km",
  "city",
  "source",
  "min_discount_percent",
  "min_discount_toman",
  "is_active",
] as const;

const TAG_URGENT = "[فوری]";
const TAG_PAINT = "[بی‌رنگ]";
const TAG_CLEAN = "[سالم]";
const TAG_DAMAGED = "[تصادفی]";

function stripFlagTags(name: string): string {
  return name
    .replaceAll(TAG_URGENT, "")
    .replaceAll(TAG_PAINT, "")
    .replaceAll(TAG_CLEAN, "")
    .replaceAll(TAG_DAMAGED, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function encodeRuleForLiveSchema(input: WatchRuleInput): Record<string, unknown> {
  const { urgent_only, paint_free_only, damage_filter, name, ...rest } = input;
  let finalName = stripFlagTags(name ?? "");
  if (urgent_only) finalName = `${finalName} ${TAG_URGENT}`.trim();
  if (paint_free_only) finalName = `${finalName} ${TAG_PAINT}`.trim();
  if (damage_filter === "clean_only") finalName = `${finalName} ${TAG_CLEAN}`.trim();
  if (damage_filter === "damaged_only") finalName = `${finalName} ${TAG_DAMAGED}`.trim();

  const source: Record<string, unknown> = { ...rest, name: finalName || name };
  if (source.min_discount_percent == null && source.min_discount_toman == null) {
    source.min_discount_percent = 0;
  }

  const row: Record<string, unknown> = {};
  for (const key of LIVE_WATCH_RULE_COLUMNS) {
    if (key in source) row[key] = source[key];
  }
  return row;
}

export type RuleRow = Partial<WatchRule> & { name?: string | null };

export function decodeRuleFlags<T extends RuleRow>(row: T): T & Pick<WatchRule, "urgent_only" | "paint_free_only" | "damage_filter"> {
  const name = row.name ?? "";
  const taggedDamage = name.includes(TAG_DAMAGED) ? "damaged_only" : name.includes(TAG_CLEAN) ? "clean_only" : null;
  const columnDamage = row.damage_filter === "clean_only" || row.damage_filter === "damaged_only" ? row.damage_filter : null;
  return {
    ...row,
    urgent_only: row.urgent_only === true || name.includes(TAG_URGENT),
    paint_free_only: row.paint_free_only === true || name.includes(TAG_PAINT),
    damage_filter: columnDamage ?? taggedDamage ?? row.damage_filter ?? "all",
  };
}
