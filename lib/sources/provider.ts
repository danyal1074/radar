import type { ListingImportItem } from "../validation";

/**
 * Listing sources. Each marketplace is an independent provider so access can be
 * enabled per source only when a legitimate route exists (official API,
 * commercial licence or partner access).
 *
 * STATUS (honest): no Divar / Sheypoor provider is implemented. Until an
 * authorised data route exists the app is fed by the Mock provider and by
 * manual / JSON import in the admin panel.
 */
export interface FetchResult {
  items: ListingImportItem[];
  /** true => every item is demo data */
  isSample: boolean;
}

export interface ListingSourceProvider {
  readonly id: string;
  readonly displayName: string;
  fetchLatest(): Promise<FetchResult>;
}
