import "server-only";
import type { AppContext } from "./auth";
import { PLANS } from "./plans";
import { buildListingViews } from "./views";

export async function loadViews(ctx: AppContext) {
  return buildListingViews(ctx.store, {
    userId: ctx.user.id,
    withScore: PLANS[ctx.access.plan].opportunityScore,
  });
}
