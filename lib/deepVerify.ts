// Deep verification (Phase 3) — multi-source cross-check for high-stakes analyses.
//
// After the normal Sonnet scoring call, an opt-in claude-fable-5 pass re-pulls
// Rentcast, optionally web-searches recent comparable sales, and checks the
// listing's own valuation/price-history data for internal consistency. It does
// NOT re-score the property — it only reports where sources disagree, as
// structured confidence_flags stored alongside the analysis.

import Anthropic from "@anthropic-ai/sdk";
import { fetchRentcastEstimate, formatRentcastForClaude } from "@/lib/analysis";
import { ConfidenceFlag } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_VERIFY_ITERATIONS = 6;

const VERIFIER_SYSTEM = `You are a data-verification analyst for real estate investment analyses. You are given the full data sheet that an analysis was based on. Your ONLY job is to identify where independent data sources disagree materially — you do not re-score or second-guess the verdict.

CHECKS TO RUN
1. Monthly rent: Rentcast estimate vs Zillow Rent Zestimate. Use repull_rentcast to get a fresh Rentcast number rather than trusting the sheet. Flag when they differ by more than 15%.
2. Valuation: list price vs Zestimate vs tax assessed value. Flag when Zestimate and list price differ by more than 15%, or the pattern looks inconsistent (e.g. tax value wildly out of line with both).
3. Price history consistency: check the PRICE HISTORY section — repeated rapid cuts, a listing far above a recent sale, or entries that contradict the current list price. Flag material inconsistencies with the numbers involved.
4. If web search is available, you may run 1–3 searches for recent comparable sales near the address to sanity-check the list price. Skip this if searches come back empty or generic — do not manufacture a flag from weak evidence.

RULES
- Only flag disagreements you can quantify from actual numbers. No flags from vibes or missing data alone.
- discrepancy_pct = spread between the highest and lowest value as a percentage of the lowest, rounded to one decimal.
- An empty flags array is a valid and common result — do not invent uncertainty.

When done, return ONLY valid JSON — no markdown fences, no preamble:
{
  "confidence_flags": [
    {
      "field": "<short field name, e.g. monthly_rent | valuation | price_history>",
      "sources": [ { "name": "<source>", "value": <number> } ],
      "discrepancy_pct": <number>,
      "note": "<one sentence on what disagrees and why it matters>"
    }
  ]
}`;

function parseAddressParts(address: string): { street: string; city: string; state: string; zip?: string } | null {
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length < 3) return null;
  const stateZip = parts[parts.length - 1].split(/\s+/);
  const state = stateZip[0];
  const zip = stateZip[1];
  return { street: parts[0], city: parts[parts.length - 2], state, zip };
}

function parseVerifierJson(raw: string): ConfidenceFlag[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { parsed = JSON.parse(match[0]); } catch { return null; }
  }
  const flags = (parsed as { confidence_flags?: unknown })?.confidence_flags;
  if (!Array.isArray(flags)) return null;

  const valid: ConfidenceFlag[] = [];
  for (const f of flags) {
    if (!f || typeof f !== "object") continue;
    const flag = f as Record<string, unknown>;
    if (typeof flag.field !== "string" || typeof flag.discrepancy_pct !== "number") continue;
    if (!Array.isArray(flag.sources)) continue;
    const sources = (flag.sources as unknown[])
      .filter((s): s is { name: string; value: number } =>
        !!s && typeof s === "object" &&
        typeof (s as Record<string, unknown>).name === "string" &&
        typeof (s as Record<string, unknown>).value === "number")
      .map((s) => ({ name: s.name, value: s.value }));
    if (sources.length < 2) continue; // a disagreement needs at least two sources
    valid.push({
      field: flag.field,
      sources,
      discrepancy_pct: Math.round(flag.discrepancy_pct * 10) / 10,
      ...(typeof flag.note === "string" ? { note: flag.note.slice(0, 300) } : {}),
    });
  }
  return valid;
}

export interface DeepVerifyResult {
  flags: ConfidenceFlag[] | null; // null = verification did not complete
  note: string | null;            // human-readable note for the response payload
}

export async function runDeepVerify(opts: {
  listingText: string;
  address: string;
}): Promise<DeepVerifyResult> {
  const addressParts = parseAddressParts(opts.address);

  const tools: Anthropic.Beta.BetaToolUnion[] = [
    {
      name: "repull_rentcast",
      description:
        "Fetch a fresh Rentcast rent estimate (with comparables) for the property address, " +
        "independent of the value already on the data sheet.",
      input_schema: { type: "object", properties: {}, required: [] },
    },
    // Server-side web search for recent comparable sales; capped to bound cost
    { type: "web_search_20260209", name: "web_search", max_uses: 3 },
  ];

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content:
        `Verify the data behind this analysis for ${opts.address}.\n\n` +
        `=== DATA SHEET THE ANALYSIS USED ===\n${opts.listingText}`,
    },
  ];

  try {
    for (let iter = 0; iter < MAX_VERIFY_ITERATIONS; iter++) {
      // claude-fable-5 is a Covered Model: 30-day data retention required, no
      // zero-data-retention option. Keep this in mind for any data-handling
      // claims made to users about deep-verified analyses.
      const stream = anthropic.beta.messages.stream({
        model: "claude-fable-5",
        max_tokens: 8000,
        // Opt-in refusal fallback: a spurious safety decline re-runs the
        // request on Opus 4.8 inside the same call instead of failing verification.
        betas: ["server-side-fallback-2026-06-01"],
        fallbacks: [{ model: "claude-opus-4-8" }],
        system: VERIFIER_SYSTEM,
        tools,
        messages,
      });
      const response = await stream.finalMessage();

      if (response.stop_reason === "refusal") {
        return { flags: null, note: "Deep verification was declined by a safety check." };
      }

      // Server-side web search paused mid-loop — re-send to resume
      if (response.stop_reason === "pause_turn") {
        messages.push({
          role: "assistant",
          content: response.content as unknown as Anthropic.Beta.BetaContentBlockParam[],
        });
        continue;
      }

      const toolUses = response.content.filter(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
      );

      if (toolUses.length === 0) {
        const text = response.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        const flags = parseVerifierJson(text);
        if (flags === null) {
          return { flags: null, note: "Deep verification returned an unreadable result." };
        }
        return {
          flags,
          note: flags.length > 0
            ? `Sources disagree on ${flags.length} ${flags.length === 1 ? "field" : "fields"} (${flags.map((f) => f.field).join(", ")}) — this verdict carries unresolved data disagreement.`
            : null,
        };
      }

      messages.push({
        role: "assistant",
        content: response.content as unknown as Anthropic.Beta.BetaContentBlockParam[],
      });

      const results = await Promise.all(toolUses.map(async (tu) => {
        let text: string;
        let isError = false;
        if (tu.name === "repull_rentcast") {
          if (!addressParts) {
            text = "Could not parse the address into street/city/state — Rentcast re-pull unavailable.";
            isError = true;
          } else {
            const rc = await fetchRentcastEstimate(
              addressParts.street, addressParts.city, addressParts.state, addressParts.zip,
            ).catch(() => null);
            text = rc && rc.estimate
              ? formatRentcastForClaude(rc).trim()
              : "No Rentcast estimate available for this address.";
          }
        } else {
          text = `Unknown tool: ${tu.name}`;
          isError = true;
        }
        return { type: "tool_result" as const, tool_use_id: tu.id, content: text, is_error: isError };
      }));

      messages.push({ role: "user", content: results });
    }

    return { flags: null, note: "Deep verification did not finish within its step budget." };
  } catch (err) {
    console.error("deepVerify error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return { flags: null, note: `Deep verification failed: ${msg}` };
  }
}
