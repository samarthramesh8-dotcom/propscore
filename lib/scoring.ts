// Per-listing scoring — the single place the SYSTEM_PROMPT verdict call is made.
// Used by /api/analyze, the Deal Finder's score_property tool, and weekly alerts.
//
// Server-only: kept out of lib/analysis.ts because client components import
// that module, and the Anthropic client must not end up in the browser bundle.

import Anthropic from "@anthropic-ai/sdk";
import {
  ANALYSIS_SCHEMA,
  ListingAnalysis,
  SYSTEM_PROMPT,
  toListingAnalysis,
} from "@/lib/analysis";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// A full analysis is ~2,500–2,800 output tokens. The old 3,500 cap left too
// little headroom (longer listings got cut off mid-JSON) and alerts' 1,000 cap
// truncated every response.
const MAX_OUTPUT_TOKENS = 8000;

export async function scoreListing(listingText: string): Promise<ListingAnalysis> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0.2, // analytical precision over creativity
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: ANALYSIS_SCHEMA } },
    messages: [{ role: "user", content: listingText }],
  });

  if (message.stop_reason === "max_tokens") {
    console.error("scoreListing: hit max_tokens", message.usage);
    throw new Error("The analysis ran longer than expected and was cut off. Please try again.");
  }
  if (message.stop_reason === "refusal") {
    throw new Error("Claude declined to analyze this listing.");
  }

  const text = message.content.find((b) => b.type === "text")?.text ?? "";
  try {
    return toListingAnalysis(JSON.parse(text));
  } catch (err) {
    // Log enough to diagnose without dumping the whole analysis
    console.error("scoreListing: unparseable response", {
      stop_reason: message.stop_reason,
      output_tokens: message.usage.output_tokens,
      error: err instanceof Error ? err.message : String(err),
      head: text.slice(0, 200),
      tail: text.slice(-200),
    });
    throw new Error("Claude returned an unexpected response. Please try again.");
  }
}
