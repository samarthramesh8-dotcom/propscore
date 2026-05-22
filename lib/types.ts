export interface Subscore {
  category: string;
  score: number;
  summary: string;
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
  created_at: string;
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
