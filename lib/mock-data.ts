import { Property } from "./types";

/**
 * Sample properties shown to guest / demo users.
 * Summaries are written to the new analysis standard:
 * every sentence carries a hard number, cap rate / cash flow are explicit,
 * and verdicts open with a clear BUY / CONDITIONAL BUY / PASS declaration.
 */
export const MOCK_PROPERTIES: Property[] = [
  // ── 1. Austin, TX — solid rental candidate ───────────────────────────────
  {
    id: "demo-1",
    user_id: "guest",
    address: "4821 Silverbrook Ln, Austin, TX 78759",
    listing_text: `List price: $385000 ($385k)
Zestimate: $392000 ($392k)
Rent Zestimate: $2800/mo
Beds: 3 | Baths: 2 | Sqft: 1,842
Year built: 2004 | Lot: 0.18 ac
Days on market: 12
Price/sqft: $209
HOA (monthly): not listed
Description: Beautifully maintained 3/2 in Northwest Austin's coveted tech corridor. Open-plan kitchen with quartz counters, updated HVAC 2021, hardwood throughout. Walking distance to Domain retail. Award-winning Round Rock ISD schools (8/10 GreatSchools).`,
    overall_score: 74,
    subscores: [
      {
        category: "Location & Neighborhood",
        score: 82,
        summary:
          "Round Rock ISD earns an 8/10 GreatSchools rating, one of the top school districts in Travis County and a reliable rent premium driver. The property sits 1.4 miles from the Domain, Austin's second downtown and home to 40,000+ tech-sector jobs (Amazon, Indeed, Apple nearby), which directly compresses vacancy. Northwest Austin's 78759 zip has maintained a 2.1% vacancy rate over the past 8 quarters — among the tightest in the metro. The submarket averaged 5.8% annual price appreciation from 2019–2024, outpacing the Austin metro average of 4.9%. No identified FEMA flood zone risk; the lot is outside the 100-year floodplain.",
      },
      {
        category: "Price & Value",
        score: 71,
        summary:
          "At $209/sqft, the listing sits 7.2% above the 78759 zip median of $195/sqft, which is a legitimate premium given the updated condition and school-district quality — but it is still a premium. The Zestimate of $392k is $7,000 above ask, confirming the list price is fair but not a discount. Just 12 DOM signals the market broadly agrees, leaving very limited negotiation leverage — expect to pay near ask or lose the deal. No price cuts are on record, removing a key buyer-leverage signal. A reasonable offer target is $382,000–$385,000; walk away above $395,000 where appreciation assumptions must carry too much weight.",
      },
      {
        category: "Rental Income Potential",
        score: 68,
        summary:
          "Rentcast confirms $2,850/mo with 3 active comps within 1.1 miles ranging $2,750–$2,995; the Zillow Zestimate of $2,800/mo is consistent. The 1% rule result: $2,850 ÷ $385,000 = 0.74% — fails the 1% threshold; you would need $3,850/mo (35% above current market) to pass. Pre-computed cap rate at 45% expense ratio: 4.86%. Monthly cash flow at 25% down / 7% / 30yr: approximately −$47/mo — essentially breakeven in Year 1 before vacancy or capital repairs. No HOA drag. The investment thesis is appreciation-led, not cash-flow-led; the property breaks even at 3% annual rent growth by Year 3.",
      },
      {
        category: "Condition & Maintenance",
        score: 77,
        summary:
          "Built 2004, the home is 22 years old — firmly in the 'mid-age' maintenance window where systems begin cycling out. The HVAC was replaced in 2021, buying an estimated 12–15 more years on that capital expense. Age-based maintenance budget: approximately $5,775/yr (1.5% of $385k), which factors into the cap rate. The listing description credits quartz counters and hardwood floors — cosmetic improvements that add tenant appeal but do not reset any structural timelines. Roof is the primary near-term risk: a 2004 roof is 22 years old and approaching the 25-year replacement window; budget $12,000–$15,000 within 3–5 years.",
      },
      {
        category: "Market Trends",
        score: 72,
        summary:
          "12 DOM in a normalized Austin market (2024 median DOM: 28 days) indicates this property is priced appropriately for current demand — not a screaming deal, but not stale. Austin's metro population grew 2.3% in 2023, ranking it among the top-10 fastest-growing large metros in the U.S., sustained by tech relocation and UT Austin's graduate pipeline. The Northwest Austin submarket specifically benefits from the Domain tech corridor acting as a demand anchor that insulates it from broader Austin softening. Rental supply risk is moderate: Austin saw 15,000+ new multifamily units delivered in 2023, which has compressed rent growth to approximately 1–2% YoY after 18% growth in 2021–22. Single-family rentals like this one compete in a different demand cohort from apartments and have held firmer.",
      },
    ],
    verdict:
      "CONDITIONAL BUY — cap rate 4.86%, monthly cash flow −$47 at current pricing. This is a quality asset in a quality location that requires an appreciation thesis to work: buy it for the school district, the Domain employment anchor, and the 5.8%/yr historical appreciation — not for Day 1 cash flow. Offer $382,000 (0.8% below ask); walk away above $395,000 where the cap rate compresses below 4.6% and the appreciation assumption must carry too much weight. Year 1 cash flow: approximately −$564/yr (essentially breakeven). Five-year total return at 3% appreciation + 3% rent growth: estimated +$92,000 in equity plus cumulative positive cash flow beginning Year 3.",
    bull_case:
      "If the Domain corridor continues its tech-sector expansion and rent growth returns to 3–4%/yr by 2026, by Year 4 this property generates approximately +$280/mo in cash flow on the original 25%-down investment. At that point the yield-on-cost reaches 5.8% and total equity including 3% annual appreciation is approximately $75,000 above the purchase price. The 8/10 school district acts as a structural rent floor — families in the Round Rock ISD zone historically pay a 12–18% rent premium over comparable homes outside the district, compressing vacancy below 3%.",
    bear_case:
      "If Austin's multifamily oversupply continues to suppress single-family rent growth and rents stay flat for 2 years, a roof replacement ($13,000) in Year 2 and one 60-day vacancy in Year 3 produces a cumulative net loss of approximately $28,000 through Year 3 — wiping out the appreciation gain on the down payment. At a 7% financing rate, rents would need to grow 2.8%/yr just to break even; below that the property loses money every year until rates decline or the loan is substantially paid down.",
    rentcast_estimate: 2850,
    rentcast_comps: [
      { address: "4610 Convict Hill Rd, Austin, TX", rent: 2900, bedrooms: 3, bathrooms: 2, squareFootage: 1920, distanceMi: 0.4 },
      { address: "5102 Balcones Dr, Austin, TX",      rent: 2750, bedrooms: 3, bathrooms: 2, squareFootage: 1780, distanceMi: 0.7 },
      { address: "4933 Westover Hills Blvd, Austin, TX", rent: 2995, bedrooms: 3, bathrooms: 2.5, squareFootage: 1998, distanceMi: 1.1 },
    ],
    mud_rate: null,
    created_at: "2026-05-28T14:22:00Z",
  },

  // ── 2. Houston, TX — MUD district, cash-flow positive but risky ───────────
  {
    id: "demo-2",
    user_id: "guest",
    address: "12340 Trails End Rd, Houston, TX 77077",
    listing_text: `List price: $289000 ($289k)
Zestimate: $295000 ($295k)
Rent Zestimate: $2100/mo
Beds: 4 | Baths: 2.5 | Sqft: 2,210
Year built: 1993 | Lot: 0.24 ac
Days on market: 67
Price/sqft: $131
HOA (monthly): not listed
MUD District: Yes — rate $1.12 per $100 assessed value
Description: Spacious 4/2.5 in Energy Corridor. 3-car garage, updated kitchen 2019, good schools. Motivated seller at 67 days. FEMA Flood Zone X. Buyer to verify MUD obligations.`,
    overall_score: 61,
    subscores: [
      {
        category: "Location & Neighborhood",
        score: 55,
        summary:
          "Schools are rated 6/10 on GreatSchools — below average for the Houston metro and an insufficient pull factor to command premium rents over comparable homes in better districts. The Energy Corridor, 2.3 miles away, employs approximately 80,000 workers in oil, gas, and engineering — strong demand anchor, but one that introduces sector-concentration risk tied to oil price cycles. Harris County flood risk is a legitimate systemic concern; the listing claims FEMA Flood Zone X (minimal risk), but the 77077 zip has experienced three 100-year flood events in the past decade, and buyer must independently verify with the county CLOMR records. The Houston-Sugar Land-Woodlands MSA grew 1.8% in population in 2023, a positive signal, but the Energy Corridor submarket saw 4.2% rent decline in 2023 following the oil-sector slowdown.",
      },
      {
        category: "Price & Value",
        score: 65,
        summary:
          "At $131/sqft, the listing is 16% below the Houston metro median of $156/sqft for similar homes, indicating genuine value or a problem property — 67 DOM suggests the market is pricing in the latter. The Zestimate of $295k is $6,000 above ask, confirming the list price represents a small discount to algorithmic value. The 67-day DOM is a strong negotiation signal: sellers are motivated and inventory in 77077 is up 14% YoY. Price cut history is not listed but should be requested — 67 DOM with no cut recorded may indicate seller stubbornness, not pristine condition. A realistic offer is $270,000–$275,000 (5–6% below ask); walk away above $285,000.",
      },
      {
        category: "Rental Income Potential",
        score: 58,
        summary:
          "Rentcast confirms $2,125/mo with 3 comps at $2,050–$2,200; the Zillow Zestimate of $2,100/mo is consistent. The 1% rule: $2,125 ÷ $289,000 = 0.735% — fails; need $2,890/mo (36% above market) to pass. Pre-computed cap rate before MUD: 4.82%. The MUD rate of $1.12/$100 on the $289k purchase price adds $3,237/yr ($270/mo) as an additional fixed cost. Adjusted NOI after MUD: approximately $12,699/yr; effective cap rate: 4.39%. Monthly cash flow after debt service and MUD: approximately +$52/mo — technically positive but with essentially zero margin for vacancy or repairs. Break-even monthly rent inclusive of P&I and MUD (excluding operating expenses): $2,047/mo.",
      },
      {
        category: "Condition & Maintenance",
        score: 52,
        summary:
          "Built 1993, the home is 33 years old — in the high-maintenance cohort. Age-based budget: approximately $8,670/yr (3% of $289k), which is not reflected in the thin cash flow model. The kitchen was updated in 2019, a legitimate credit, but original bathrooms and a 1993 roof are serious near-term risks: the roof is now 33 years old (standard lifespan is 20–25 years) — assume a $13,000–$16,000 replacement is imminent and required. The 3-car garage is an appealing amenity but does not offset structural risk. No mention of HVAC age — original 1993 units would be 33 years old and well past replacement threshold; ask the seller for HVAC age before proceeding.",
      },
      {
        category: "Market Trends",
        score: 55,
        summary:
          "67 DOM in a market where the zip average is 31 days is a textbook buyer's signal — this property is either overpriced, has a condition issue, or both. Houston 77077 inventory is up 14% YoY, shifting negotiating power firmly to buyers. Energy Corridor employment is an oil-price proxy: at $80+/barrel the rental demand is strong; below $65/barrel (2015, 2020) white-collar vacancy in the corridor jumped 18%, directly suppressing rents. The broader Houston metro remains a volume market with persistent new housing supply, which caps appreciation potential. Rental oversupply risk is moderate — 9,400 new multifamily units delivered in the Energy Corridor submarket in 2023–24.",
      },
    ],
    verdict:
      "PASS at current ask — effective cap rate 4.39% after MUD, monthly cash flow +$52 with zero margin. The MUD tax adds $3,237/yr in fixed annual cost that most online Zestimate tools do not reflect; the real cap rate is 39 basis points lower than the headline figure. If the seller accepts $272,000 (6% below ask), the effective cap rate improves to 4.67% and monthly cash flow reaches +$115/mo — marginally acceptable given the capex risk. Year 1 cash flow at ask: approximately +$624/yr before vacancy and repairs, which a single roof replacement in Year 1 would eliminate entirely. Five-year return at $272k entry, 2% rent growth, 2% appreciation: estimated +$28,000 total — poor risk-adjusted return for a 33-year-old property.",
    bull_case:
      "If oil stabilizes above $85/barrel and Energy Corridor demand tightens, rents could grow 3–4%/yr over 5 years. At $272k entry price with 4% rent growth, by Year 4 this property generates +$340/mo in cash flow. At that point the yield-on-cost reaches 6.1% and total equity including 2% annual appreciation is approximately $48,000 above entry — a respectable return for a 4-bedroom family home in a major employment corridor. The 3-car garage commands a 7–10% rent premium over 2-car comparables, providing structural outperformance in the comp set.",
    bear_case:
      "If oil drops below $65/barrel (as in 2015 and 2020), Energy Corridor vacancy rises and rents decline 5–10%. A simultaneous roof replacement ($15,000) and HVAC replacement ($8,000) in Years 1–2 — both likely given the home's age — plus one 90-day vacancy period produces a cumulative net loss of approximately $46,000 through Year 3 at the current ask price. The MUD tax, which runs in perpetuity and cannot be negotiated, ensures costs stay elevated even if rents compress. This deal has a narrow margin of safety.",
    rentcast_estimate: 2125,
    rentcast_comps: [
      { address: "12500 Westheimer Rd, Houston, TX",    rent: 2200, bedrooms: 4, bathrooms: 2.5, squareFootage: 2300, distanceMi: 0.5 },
      { address: "11840 Memorial Dr, Houston, TX",       rent: 2050, bedrooms: 4, bathrooms: 2,   squareFootage: 2100, distanceMi: 0.9 },
      { address: "12820 Briar Forest Dr, Houston, TX",   rent: 2175, bedrooms: 4, bathrooms: 2.5, squareFootage: 2180, distanceMi: 1.4 },
    ],
    mud_rate: 1.12,
    created_at: "2026-05-22T09:15:00Z",
  },

  // ── 3. Dallas, TX — luxury overpriced, strong pass ────────────────────────
  {
    id: "demo-3",
    user_id: "guest",
    address: "891 Maple Grove Ct, Dallas, TX 75248",
    listing_text: `List price: $520000 ($520k)
Zestimate: $508000 ($508k)
Rent Zestimate: $3200/mo
Beds: 4 | Baths: 3 | Sqft: 2,650
Year built: 2018 | Lot: 0.21 ac
HOA (monthly): $285
Days on market: 89
Price/sqft: $196
Description: Stunning 4/3 in top-rated Plano ISD. Built 2018, smart home, quartz waterfall island, 3-car garage. Resort pool via HOA. Like-new. Motivated seller.`,
    overall_score: 43,
    subscores: [
      {
        category: "Location & Neighborhood",
        score: 72,
        summary:
          "Plano ISD earns a 9/10 GreatSchools rating — elite by Texas standards and a consistent driver of both resale value and above-market rents from families who prize school access. The property is 4.2 miles from Legacy West, Plano's tech and financial services hub (Toyota North America, JPMorgan, Liberty Mutual), providing a genuine employment anchor. North Dallas 75248 posted 3.9% annual appreciation from 2020–2024, slightly below the DFW average of 4.4%, suggesting the premium school-district effect is already largely priced in. Vacancy rates in 75248 have held at 3.4%, tighter than the Dallas metro average of 4.8%, confirming the school district creates durable rental demand. No flood zone risk identified.",
      },
      {
        category: "Price & Value",
        score: 38,
        summary:
          "At $196/sqft, this listing is priced 2.4% above its own Zestimate of $508k — the market has already spoken at 89 DOM and the Zestimate delta of −$12,000 confirms it. The 89-day DOM in a submarket where average DOM is 34 days is a damning signal: this property has been rejected by the market at current pricing for nearly three months. Price cut history was not disclosed — in 89 DOM with no listed cut, the seller is either uninformed or unwilling to move, both red flags. Inventory in North Dallas luxury ($500k+) is up 18% YoY, further shifting leverage to buyers. Target offer: $460,000 (11.5% below ask) where the math begins to work; walk away above $480,000.",
      },
      {
        category: "Rental Income Potential",
        score: 28,
        summary:
          "Rentcast confirms $3,150/mo (3 comps at $3,100–$3,300); the Zillow Zestimate of $3,200/mo is consistent. The 1% rule: $3,150 ÷ $520,000 = 0.606% — fails badly; you would need $5,200/mo (65% above current market) to pass — an impossible ask. Pre-computed cap rate at 45% expense ratio: 3.97%. HOA is $285/mo ($3,420/yr) — an additional fixed cost that is not captured in the cap rate; deducting HOA reduces effective cap rate to 3.31%. Monthly cash flow after debt service and HOA: approximately −$891/mo. Annual negative cash flow: −$10,692. This property is cash-flow negative by nearly $900/mo from day one and requires 100% appreciation-based return to justify the investment.",
      },
      {
        category: "Condition & Maintenance",
        score: 81,
        summary:
          "Built 2018, the home is 8 years old — in the low-maintenance window where all major systems (HVAC, roof, plumbing) are well within expected lifespans. Age-based maintenance budget: approximately $5,200/yr (1% of $520k), the lowest maintenance tier. Smart home integration, quartz counters, and 3-car garage add tenant appeal and justify a rent premium over comparable stock but do not materially improve the investment thesis at this price. No deferred maintenance signals in the description. The HOA pool amenity reduces landscape and exterior maintenance costs borne by the owner — a small but real offset. This is genuinely one of the best condition profiles you will encounter in this price band.",
      },
      {
        category: "Market Trends",
        score: 28,
        summary:
          "89 DOM is the loudest market signal in this analysis: North Dallas luxury inventory is up 18% YoY and DOM has expanded from 31 to 58 days metro-wide in the $500k+ segment, meaning this 89-day DOM is nearly 3x the current average — the market has definitively rejected this pricing. DFW population grew 1.9% in 2023 and corporate relocation (Tesla Gigafactory, Goldman Sachs, GXO Logistics) maintains positive long-term demand; these factors support the luxury rental market but at lower entry prices. Rental oversupply risk is moderate in North Dallas — 6,800 new high-end units were delivered in 2023–24, providing an alternative to single-family luxury rental. Rising interest rates have compressed the buyer pool for $500k+ homes by approximately 22% since 2022, extending DOM across the luxury segment.",
      },
    ],
    verdict:
      "STRONG PASS at $520,000 — monthly cash flow −$891, effective cap rate 3.31% after HOA. This is an exceptional home and a poor investment at current pricing: negative $10,692/yr cash flow requires 100% appreciation to generate any return, and the market's 89-day rejection says appreciation at this price is not coming. Offer $460,000 if you want the asset — at that price, cap rate improves to 4.48%, cash flow becomes approximately −$450/mo (still negative but manageable with appreciation), and you acquire a 9/10 school-district asset below Zestimate. At $460k, do not pursue above $480k. Year 1 cash flow at current ask: −$10,692. Five-year return at $460k entry with 3% appreciation and 2% rent growth: approximately +$41,000 — marginal for the risk.",
    bull_case:
      "If DFW corporate migration accelerates and luxury single-family rents grow 5%/yr over 5 years, by Year 5 this property generates approximately +$180/mo in cash flow at a $460k entry price. At that point, yield-on-cost reaches 5.6% and total equity including 3% annual appreciation is approximately $105,000 above the $460k entry — a compelling long-term return for a 9/10 school-district asset with essentially zero capex risk for the next decade. The Plano ISD premium is structural and durable, insulating this property from broader Dallas softening.",
    bear_case:
      "If North Dallas luxury inventory continues expanding at 18%/yr and rents stagnate or decline 3%, at the current $520k ask this property produces a cumulative net loss of approximately $67,000 through Year 3 (−$891/mo cash flow × 36 months plus one vacancy period). Even a modest $8,000 repair event in Year 1 pushes Year 1 total loss above $21,000. The HOA at $285/mo ($3,420/yr) is non-negotiable, non-reducible, and continues regardless of vacancy — creating a fixed cost floor that cannot be managed away in a down market.",
    rentcast_estimate: 3150,
    rentcast_comps: [
      { address: "905 Creekview Ln, Dallas, TX",  rent: 3300, bedrooms: 4, bathrooms: 3,   squareFootage: 2700, distanceMi: 0.3 },
      { address: "720 Timberline Dr, Dallas, TX",  rent: 3100, bedrooms: 4, bathrooms: 2.5, squareFootage: 2580, distanceMi: 0.6 },
      { address: "1102 Hillcrest Rd, Dallas, TX",  rent: 3250, bedrooms: 4, bathrooms: 3,   squareFootage: 2720, distanceMi: 1.0 },
    ],
    mud_rate: null,
    created_at: "2026-05-15T16:45:00Z",
  },
];
