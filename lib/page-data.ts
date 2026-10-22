import "server-only";
import type { AppContext } from "./auth";
import { normalizeCityNameFa } from "./cities";
import { PLANS } from "./plans";
import { buildListingViews } from "./views";

export async function loadViews(ctx: AppContext) {
  const plan = PLANS[ctx.access.plan];
  const userCity = normalizeCityNameFa(ctx.profile.city) || "مشهد";
  const limitToCity = ctx.profile.role !== "admin" && plan.allowedCitiesCount === 1 ? userCity : undefined;

  return buildListingViews(ctx.store, {
    userId: ctx.user.id,
    withScore: plan.opportunityScore,
    cityRestriction: limitToCity,
  });
}
