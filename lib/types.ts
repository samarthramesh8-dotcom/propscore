import type { ZillowRichData, PropertyPhoto, PriceHistoryEntry, SchoolInfo } from "@/lib/analysis";

export type { ZillowRichData, PropertyPhoto, PriceHistoryEntry, SchoolInfo };

export interface Subscore {
  category: string;
  score: number;
  summary: string;
}

export interface RentcastComp {
  address: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  distanceMi: number;
}

export type PropertyStatus = "watching" | "offer_submitted" | "passed" | "acquired";

export const OUTCOME_TYPES = [
  "still_watching",
  "pursued",
  "passed",
  "offer_made",
  "offer_accepted",
  "offer_rejected",
  "closed",
] as const;

export type OutcomeType = (typeof OUTCOME_TYPES)[number];

export interface PropertyOutcome {
  id: string;
  property_id: string;
  user_id: string;
  outcome_type: OutcomeType;
  actual_sale_price: number | null;
  actual_rent_achieved: number | null;
  days_to_close: number | null;
  outcome_notes: string | null;
  recorded_at: string;
  created_at: string;
}

export type VerdictTier = "STRONG BUY" | "BUY" | "CONDITIONAL BUY" | "PASS" | "STRONG PASS";

export interface VerdictTierStats {
  tier: VerdictTier;
  tracked: number;   // outcomes recorded for properties in this tier
  resolved: number;  // reached a terminal outcome (closed / offer_accepted / offer_rejected / passed)
  wins: number;      // closed or offer_accepted
  winRate: number | null; // wins / resolved, null when resolved === 0
}

export interface OutcomeStats {
  totalTracked: number;
  byVerdictTier: VerdictTierStats[];
  // Pearson correlation between overall_score and whether the user pursued the
  // deal (1 = pursued/offer/closed, 0 = passed/offer_rejected). null when fewer
  // than 3 decided outcomes or zero variance.
  scoreOutcomeCorrelation: number | null;
}

export interface Property {
  id: string;
  user_id: string;
  address: string;
  listing_text: string;
  overall_score: number;
  subscores: Subscore[];
  verdict: string;
  bull_case: string;
  bear_case: string;
  rentcast_estimate: number | null;
  rentcast_comps: RentcastComp[] | null;
  mud_rate: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  rich_data: ZillowRichData | null;
  zillow_url: string | null;
  status?: PropertyStatus;
}

export interface AnalyzeResponse {
  property_id: string;
  address: string;
  overall_score: number;
  subscores: Subscore[];
  verdict: string;
  bull_case: string;
  bear_case: string;
}

export interface SharedAnalysis {
  id: string;
  token: string;
  property_id: string;
  created_at: string;
}

export interface SavedSearch {
  id:          string;
  user_id:     string;
  name:        string;
  location:    string;
  status:      string;
  price_max:   number | null;
  beds_min:    number | null;
  baths_min:   number | null;
  min_score:   number;
  created_at:  string;
  last_run_at: string | null;
  is_active:   boolean;
}

export interface AlertResult {
  id:              string;
  saved_search_id: string;
  property_id:     string;
  sent_at:         string;
}
