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
