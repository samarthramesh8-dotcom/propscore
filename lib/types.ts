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
