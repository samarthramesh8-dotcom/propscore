import { Property } from "./types";

/**
 * Sample properties shown to guest / demo users.
 * Every sentence in every summary carries a hard number.
 * All metrics are internally consistent — cap rate, cash flow, and maintenance
 * are computed with the same 25% down / 7.0% fixed / 30-yr model used by the
 * live analyzer.
 *
 * Financing constants used throughout:
 *   rate factor (r): 0.07 / 12 = 0.005833
 *   (1+r)^360 ≈ 8.116
 *   payment factor: 0.006654 × loan
 */
export const MOCK_PROPERTIES: Property[] = [
  // ── 1. Scottsdale, AZ — appreciation-led BUY ────────────────────────────────
  {
    id: "demo-1",
    user_id: "guest",
    address: "9234 E Pinnacle Peak Rd, Scottsdale, AZ 85255",
    listing_text: `Source: https://www.zillow.com/homedetails/9234-E-Pinnacle-Peak-Rd-Scottsdale-AZ-85255

=== PROPERTY FACTS ===
Address: 9234 E Pinnacle Peak Rd, Scottsdale, AZ 85255
List price: $408,000 ($408k)
Bedrooms: 3
Bathrooms: 2
Living area: 1,762 sqft
Lot size: 6,534 sqft
Year built: 2019
Price per sqft: $232/sqft
Days on market: 18
Home type: Single Family
Status: For Sale
HOA (monthly): $125

=== VALUATION ===
Zestimate: $421,000
Rent Zestimate: $2,750/mo
Tax assessed value: $396,000
Zestimate vs list price: $13,000 (3.2%)

=== PRICE HISTORY ===
2025-09-15: $408,000 (Listed for sale)

=== SCHOOLS ===
Pinnacle High School (High, grades 9-12): 8/10; Desert Trails Elementary (Elementary, grades K-6): 8/10; Explorer Middle School (Middle, grades 7-8): 8/10

=== DESCRIPTION ===
Meticulously maintained 3/2 in the Pinnacle Peak corridor, one of Scottsdale's fastest-growing master-planned communities. Built 2019 — all systems under 7 years old. Open-concept floorplan with quartz island, 10-ft ceilings, 3-car tandem garage. 4.8 miles from Mayo Clinic's 3.3M sqft North Scottsdale campus (6,700+ employees). Scottsdale Unified School District 8/10 GreatSchools composite. Walking distance to Pinnacle Peak Trailhead.

=== RENTCAST RENT ESTIMATE ===
Estimated monthly rent: $2,800/mo
Confidence range: $2,680–$2,960/mo
Comparable rentals (active/recent listings):
  • 9118 E Palo Verde Dr, Scottsdale, AZ: $2,750/mo, 3bd/2ba, 1710sqft (0.4mi away)
  • 9405 N 92nd St, Scottsdale, AZ: $2,850/mo, 3bd/2ba, 1820sqft (0.7mi away)
  • 15620 N Hayden Rd, Scottsdale, AZ: $2,900/mo, 3bd/2.5ba, 1950sqft (1.1mi away)

=== PRE-COMPUTED INVESTMENT METRICS ===
(Use these exact numbers in your analysis — do not re-derive)

FINANCING (25% down · 7.0% fixed · 30-yr)
  Down payment:          $102,000
  Loan amount:           $306,000
  Monthly P&I:           $2,036/mo
  Annual debt service:   $24,432/yr

YIELD ANALYSIS  (rent basis: Rentcast = $2,800/mo)
  Gross yield:           8.24%  (annual rent ÷ purchase price)
  1% rule:               0.686%  — FAILS ✗ — need $4,080/mo to pass
  NOI (45% exp. ratio):  $18,480/yr
  Cap rate:              4.53%

CASH FLOW  (NOI − debt service)
  Monthly cash flow:     -$496 (NEGATIVE)
  Annual cash flow:      -$5,952 (NEGATIVE)
  Break-even monthly rent (P&I only, excl. expenses): $2,036/mo

MAINTENANCE
  Age-based budget:      ~$4,080/yr  (1.0% of value, 7-yr-old home)`,
    overall_score: 73,
    subscores: [
      {
        category: "Location & Neighborhood",
        score: 81,
        summary:
          "Scottsdale Unified School District earns a composite 8/10 on GreatSchools — 20th percentile in Arizona and a direct rent-premium driver; families in SUSD zones historically pay 14–18% above comparable out-of-district homes. Mayo Clinic's North Scottsdale campus, 4.8 miles away, employs 6,700+ workers and announced a $5B phased expansion through 2028 — the single most durable employment anchor in the North Phoenix submarket. The 85255 zip vacancy rate is 1.6% as of Q1 2026, tied for the tightest single-family rental market in the Phoenix metro. North Scottsdale posted 5.3% annual price appreciation from 2020–2025, ranking it in the top quartile of Sun Belt suburban markets. No FEMA flood zone designation; the lot is in Zone X (minimal hazard), with Arizona's desert climate eliminating the flood risk common in Texas or Florida comparables.",
      },
      {
        category: "Price & Value",
        score: 72,
        summary:
          "At $232/sqft, this listing is 6.5% below the 85255 zip median of $248/sqft — a genuine discount driven by the 1,762 sqft size rather than condition or location defects. The Zestimate of $421,000 is $13,000 above ask, meaning the buyer is acquiring at a 3.2% discount to Zillow's algorithmic estimate of fair market value. At just 18 DOM — exactly the current North Scottsdale market average — there is no negotiation leverage from stale inventory; this property is not distressed. No price cuts are on record, confirming the seller has not signaled desperation. Target offer: $405,000 (0.7% below ask) capturing a concession without insulting a seller in a 1.6%-vacancy market; walk away above $421,000 where the Zestimate premium disappears entirely.",
      },
      {
        category: "Rental Income Potential",
        score: 60,
        summary:
          "Rentcast estimates $2,800/mo based on 3 active comps at $2,750–$2,900 within 1.1 miles; the Zillow Rent Zestimate of $2,750/mo is consistent, confirming strong comp density. The 1% rule result: $2,800 ÷ $408,000 = 0.686% — fails; you would need $4,080/mo (46% above current market) to pass, making this a pure appreciation play, not a yield play. Pre-computed cap rate at 45% expense ratio: 4.53% — above the 4% floor, no automatic penalty. Monthly cash flow at 25% down / 7% / 30-yr: −$496/mo; this is just under the $500/mo threshold, meaning the property pencils as a near-breakeven appreciating asset rather than a value-destroying negative carry. HOA of $125/mo ($1,500/yr) adds a fixed cost not captured in the formula CF; effective out-of-pocket negative carry is $621/mo. The investment requires rent growth of 3%+/yr to reach cash-flow breakeven by Year 5.",
      },
      {
        category: "Condition & Maintenance",
        score: 82,
        summary:
          "Built 2019, the home is 7 years old — in the lowest maintenance cohort where roof, HVAC, plumbing, and appliances remain well within factory-design lifespans. Age-based maintenance budget: $4,080/yr (1.0% of value) — the minimum maintenance tier and a genuine advantage over comparable 1990s–2000s stock in the corridor. The HVAC system is original 2019 — expect another 12–15 years before replacement ($12,000–$16,000 when due). The roof is 7 years old — a 2019 concrete tile roof in Scottsdale carries a 30-year lifespan rating, meaning zero roof capex risk for 23+ years. The 3-car tandem garage commands an 8–12% rent premium over 2-car comparables in the 85255 zip and reduces tenant churn by providing above-median storage — a structural rental yield benefit at zero incremental cost.",
      },
      {
        category: "Market Trends",
        score: 74,
        summary:
          "18 DOM against a 19-day North Scottsdale average indicates this property is correctly priced in a balanced-to-tight market — not a buyer's market, but not a bidding war. The Phoenix-Scottsdale MSA added 94,000 net jobs in 2024, ranking it #4 among large U.S. metros for corporate relocation velocity (CBRE), with semiconductor fabs (TSMC's $65B investment), financial services (Charles Schwab), and healthcare all expanding. North Scottsdale single-family rentals have outperformed the broader Phoenix apartment market because new-construction multifamily supply is concentrated in Tempe and Mesa, not the 85255–85266 corridor. Vacancy at 1.6% in 85255 compares to 5.8% for Phoenix metro apartments — a 362-basis-point structural advantage for this property's tenant cohort. Rental rate growth has moderated to 2.1%/yr (2025) from the 2021 peak of 14%, but remains above the CPI and is expected to re-accelerate as Mayo's campus expansion absorbs area housing.",
      },
    ],
    verdict:
      "BUY — cap rate 4.53%, monthly carry −$496 on an asset priced $13,000 below Zestimate in the tightest single-family rental submarket in the Phoenix metro. This is an appreciation-led purchase with a durable income foundation: the 8/10 school district, 1.6% vacancy, and Mayo Clinic employment anchor underwrite the rent floor even in a cyclical downturn. Offer $405,000 (0.7% below ask); the Zestimate of $421,000 gives you $16,000 of statistical headroom — acceptable for a 7-year-old home in a 1.6%-vacancy zip. Year 1 cash flow: −$5,952 ($496/mo) before HOA, which adds −$1,500/yr for a total economic carry of −$7,452/yr. Five-year total return at 3% annual appreciation and 2% rent growth: estimated +$68,000 in equity gain plus approximately 20 months of HOA costs — a 38% total return on the $102,000 down payment.",
    bull_case:
      "If Mayo Clinic's $5B campus expansion accelerates hiring and the 85255 vacancy rate falls below 1.2%, rent growth in the corridor could return to 4–5%/yr by 2027. At 4% rent compounding on $2,800/mo, by Year 4 this property generates $3,269/mo — pushing monthly cash flow from −$496 to approximately −$263/mo, and break-even arrives in Year 6. At that point, with 3% annual appreciation on $408,000, total equity including the original down payment is approximately $195,000 — a 91% return on invested capital over 6 years. The 8/10 school district acts as a structural rent floor: SUSD-zone families pay premiums even in soft markets, compressing downside vacancy risk to under 3%.",
    bear_case:
      "If Arizona's extreme heat (2025: 54 days above 110°F in the Phoenix metro) drives home insurance premiums up 20%/yr and a second HVAC unit is required for the tandem garage addition in Year 2 ($14,000), the carrying cost rises from −$496/mo to approximately −$660/mo. If rent growth stagnates at 0% (flat for 3 years) and one 60-day vacancy occurs in Year 2 at $2,800/mo, the cumulative net loss through Year 3 is approximately −$30,000 including the HVAC event — fully erasing the initial $13,000 Zestimate discount and requiring the 3% appreciation assumption to carry the entire investment thesis.",
    rentcast_estimate: 2800,
    rentcast_comps: [
      { address: "9118 E Palo Verde Dr, Scottsdale, AZ",  rent: 2750, bedrooms: 3, bathrooms: 2,   squareFootage: 1710, distanceMi: 0.4 },
      { address: "9405 N 92nd St, Scottsdale, AZ",        rent: 2850, bedrooms: 3, bathrooms: 2,   squareFootage: 1820, distanceMi: 0.7 },
      { address: "15620 N Hayden Rd, Scottsdale, AZ",     rent: 2900, bedrooms: 3, bathrooms: 2.5, squareFootage: 1950, distanceMi: 1.1 },
    ],
    mud_rate: null,
    notes: null,
    created_at: "2026-05-22T10:45:00Z",
    updated_at: null,
    rich_data: null,
    zillow_url: null,
  },

  // ── 2. Brentwood, TN (Nashville metro) — honest PASS on bad math ─────────────
  {
    id: "demo-2",
    user_id: "guest",
    address: "7823 Brentwood Station Dr, Brentwood, TN 37027",
    listing_text: `Source: https://www.zillow.com/homedetails/7823-Brentwood-Station-Dr-Brentwood-TN-37027

=== PROPERTY FACTS ===
Address: 7823 Brentwood Station Dr, Brentwood, TN 37027
List price: $585,000 ($585k)
Bedrooms: 4
Bathrooms: 3
Living area: 2,840 sqft
Lot size: 9,583 sqft
Year built: 2021
Price per sqft: $206/sqft
Days on market: 44
Home type: Single Family
Status: For Sale
HOA (monthly): $310

=== VALUATION ===
Zestimate: $579,000
Rent Zestimate: $3,300/mo
Tax assessed value: $562,000
Zestimate vs list price: -$6,000 (-1.0%)

=== PRICE HISTORY ===
2026-04-08: $585,000 (Listed for sale)

=== SCHOOLS ===
Ravenwood High School (High, grades 9-12): 9/10; Sunset Elementary (Elementary, grades K-5): 9/10; Woodland Middle School (Middle, grades 6-8): 9/10

=== DESCRIPTION ===
New-construction style 4/3 in Williamson County's premier Brentwood Station master plan — one of the top-ranked school districts in Tennessee (9/10 composite). Quartz waterfall island, LVP flooring throughout, gas cooktop, tankless water heater. 6.2 miles from Amazon's Nashville fulfillment center and Oracle's 13-acre corporate campus. Community pool and fitness center via HOA ($310/mo). Smart home package included. Builder warranty expires 2026.

=== RENTCAST RENT ESTIMATE ===
Estimated monthly rent: $3,400/mo
Confidence range: $3,250–$3,580/mo
Comparable rentals (active/recent listings):
  • 7640 Champions Blvd, Brentwood, TN: $3,350/mo, 4bd/3ba, 2780sqft (0.6mi away)
  • 8102 Fieldstone Dr, Brentwood, TN: $3,450/mo, 4bd/3ba, 2920sqft (0.9mi away)
  • 7290 Powder Mill Rd, Brentwood, TN: $3,400/mo, 4bd/2.5ba, 2680sqft (1.3mi away)

=== PRE-COMPUTED INVESTMENT METRICS ===
(Use these exact numbers in your analysis — do not re-derive)

FINANCING (25% down · 7.0% fixed · 30-yr)
  Down payment:          $146,250
  Loan amount:           $438,750
  Monthly P&I:           $2,919/mo
  Annual debt service:   $35,028/yr

YIELD ANALYSIS  (rent basis: Rentcast = $3,400/mo)
  Gross yield:           6.97%  (annual rent ÷ purchase price)
  1% rule:               0.581%  — FAILS ✗ — need $5,850/mo to pass
  NOI (45% exp. ratio):  $22,440/yr
  Cap rate:              3.84%

CASH FLOW  (NOI − debt service)
  Monthly cash flow:     -$1,049 (NEGATIVE)
  Annual cash flow:      -$12,588 (NEGATIVE)
  Break-even monthly rent (P&I only, excl. expenses): $2,919/mo

MAINTENANCE
  Age-based budget:      ~$5,850/yr  (1.0% of value, 5-yr-old home)`,
    overall_score: 49,
    subscores: [
      {
        category: "Location & Neighborhood",
        score: 64,
        summary:
          "Williamson County earns a 9/10 composite GreatSchools rating — the highest-rated public school system in Tennessee and a powerful resale value anchor. The property is 6.2 miles from Amazon's Nashville fulfillment hub and Oracle's 13-acre Brentwood corporate campus (3,800 employees), providing genuine employment density. However, the 9/10 school district is already fully priced in at $206/sqft — the premium is in the ask, not in potential upside, meaning the buyer is paying for the location without receiving a discount for it. Greater Nashville vacancy sits at 4.9% for single-family rentals — up from 3.1% in 2022 as new master-planned supply (including 11 new Williamson County subdivisions delivered 2023–25) pressures occupancy. No FEMA flood zone; Williamson County had significant flooding in 2010 but 7823 Brentwood Station Dr is outside the 100-year floodplain per current FEMA mapping.",
      },
      {
        category: "Price & Value",
        score: 34,
        summary:
          "At $206/sqft, this listing is 9% above the Brentwood submarket median of $189/sqft for 4-bedroom homes — a premium that is not supported by the Zestimate: Zillow's $579,000 estimate is $6,000 below ask, signaling the market already considers this property overpriced at $585,000. The 44-day DOM is 57% above Nashville's metro average of 28 days, and this property has sat 44 days with no disclosed price cut — a combination that means the seller is either uninformed of their market position or unwilling to move. Williamson County $500k+ inventory is up 22% YoY as post-COVID migration-driven demand normalizes, shifting negotiating power firmly to buyers in this segment. Offer target: $545,000 (6.8% below ask); at that price the cap rate rises to 4.11% and the math becomes marginal rather than disqualifying. Walk away above $560,000; above that price, the cap rate drops back below 4.0% and no level of rent growth rescues the return profile.",
      },
      {
        category: "Rental Income Potential",
        score: 28,
        summary:
          "Rentcast confirms $3,400/mo from 3 active comps at $3,350–$3,450/mo within 1.3 miles. The 1% rule result: $3,400 ÷ $585,000 = 0.581% — fails by 42%; you would need $5,850/mo (72% above current market) to pass — an impossible rent in this submarket. Pre-computed cap rate: 3.84% — below the 4% floor, automatically capping this category per the scoring discipline. Monthly cash flow at 25% / 7% / 30yr: −$1,049/mo before HOA. Including the HOA of $310/mo — a fixed, non-negotiable, non-reducible cost — total monthly out-of-pocket is −$1,359/mo, or −$16,308/yr. The break-even monthly rent required to cover debt service alone (before expenses or HOA) is $2,919/mo — and the market delivers $3,400/mo, which sounds like a surplus until the 45% expense ratio and HOA are applied.",
      },
      {
        category: "Condition & Maintenance",
        score: 82,
        summary:
          "Built 2021, this home is 5 years old — the lowest possible maintenance risk profile with all major systems (HVAC, roof, plumbing, appliances) well inside their design lifespans. Age-based maintenance budget: $5,850/yr (1.0% of $585,000), the minimum tier. The tankless water heater is an upgrade over traditional tank units and carries a 15-year expected lifespan, eliminating a common early-stage maintenance event. LVP flooring throughout is damage-resistant and tenant-proof, reducing unit-turn costs to painting and cleaning rather than flooring replacement. The HOA-managed pool and fitness center shift exterior common-area maintenance to the HOA, reducing owner capex exposure — a meaningful benefit for a landlord who would otherwise budget $8,000–$12,000 for pool maintenance over 10 years.",
      },
      {
        category: "Market Trends",
        score: 48,
        summary:
          "44 DOM in a submarket with a 28-day average is a market-rejection signal: the Williamson County $500k+ segment has normalized from the 2021–2022 bidding-war era and now prices firmly reflect fundamentals. Greater Nashville delivered 14,200 new multifamily units in 2023–2024, compressing both apartment rents and single-family rent growth; the metro-wide rent growth rate decelerated from 12% in 2022 to 1.4% in 2025. Amazon and Oracle anchor demand, but their employees increasingly choose the 11 new Williamson County subdivisions that offer lower HOA, lower price points, or newer inventory. The $500k+ buyer pool has contracted 28% since 2022 as 7% rates eliminate move-up buyers, extending DOM across the luxury segment by an average of 19 days. Long-term fundamentals remain positive — Nashville population grew 2.1% in 2024 — but at current pricing they do not rescue the investment case.",
      },
    ],
    verdict:
      "PASS at $585,000 — cap rate 3.84%, monthly cash flow −$1,049 before HOA (−$1,359 total), annual cash loss −$16,308. This is a beautiful home in a 9/10 school district with genuine location quality — and a completely broken investment at current pricing. The math is disqualifying on every metric: cap rate below 4%, cash flow below −$500/mo triggering the scoring cap, and a Zestimate that says the market prices this property at $579,000, not $585,000. Offer $545,000 if you want the asset for appreciation — at that price the cap rate rises to 4.11%, cash flow improves to approximately −$800/mo, and the 9/10 school district provides a resale floor. Do not pursue above $560,000 under any scenario. Year 1 cash flow at current ask: −$12,588 (formula) plus −$3,720 HOA = −$16,308 total. Five-year total return at $545k entry with 3% appreciation and 1.5% rent growth: approximately +$44,000 equity — marginal risk-adjusted return for the carry.",
    bull_case:
      "If Amazon and Oracle expand their Brentwood campuses and Nashville rent growth returns to 4%/yr by 2027 — achievable if the 2023–24 multifamily supply wave is absorbed — at a $545,000 entry price with 4% rent compounding, by Year 5 this property generates $4,136/mo in rent. At that point the pre-HOA cash flow improves to approximately −$393/mo and yield-on-cost reaches 5.1%; total equity including 3% annual appreciation on $545k is approximately $131,000 above entry — a 90% return on the $136,250 down payment over 5 years. The 9/10 school district rating provides a structural rent floor that insulates occupancy even if the Nashville luxury market softens: Williamson County school-premium tenants have historically sustained <4% vacancy through two prior downturns.",
    bear_case:
      "If Nashville's 2023–24 multifamily supply continues suppressing rent growth to 0–1%/yr and the HOA raises fees from $310/mo to $380/mo (a common pattern in new master-plan communities by Year 3), at the current $585k ask the cumulative net loss through Year 3 is approximately −$53,000 in cash carry plus one 60-day vacancy period ($6,800). Including the $146,250 down payment tied up at −$53,000 cumulative loss through Year 3, the effective annualized return on capital is −12.1%. The HOA, at $310/mo ($3,720/yr) and rising, is non-negotiable and non-reducible regardless of vacancy — ensuring costs remain elevated even in a down market.",
    rentcast_estimate: 3400,
    rentcast_comps: [
      { address: "7640 Champions Blvd, Brentwood, TN",  rent: 3350, bedrooms: 4, bathrooms: 3,   squareFootage: 2780, distanceMi: 0.6 },
      { address: "8102 Fieldstone Dr, Brentwood, TN",   rent: 3450, bedrooms: 4, bathrooms: 3,   squareFootage: 2920, distanceMi: 0.9 },
      { address: "7290 Powder Mill Rd, Brentwood, TN",  rent: 3400, bedrooms: 4, bathrooms: 2.5, squareFootage: 2680, distanceMi: 1.3 },
    ],
    mud_rate: null,
    notes: null,
    created_at: "2026-05-14T16:30:00Z",
    updated_at: null,
    rich_data: null,
    zillow_url: null,
  },

  // ── 3. San Antonio, TX — MUD district, military/healthcare value play ────────
  {
    id: "demo-3",
    user_id: "guest",
    address: "3814 Castano Dr, San Antonio, TX 78228",
    listing_text: `Source: https://www.zillow.com/homedetails/3814-Castano-Dr-San-Antonio-TX-78228

=== PROPERTY FACTS ===
Address: 3814 Castano Dr, San Antonio, TX 78228
List price: $285,000 ($285k)
Bedrooms: 4
Bathrooms: 2.5
Living area: 2,080 sqft
Lot size: 8,276 sqft
Year built: 1998
Price per sqft: $137/sqft
Days on market: 31
Home type: Single Family
Status: For Sale
HOA (monthly): not listed

=== VALUATION ===
Zestimate: $291,000
Rent Zestimate: $2,150/mo
Tax assessed value: $272,000
Zestimate vs list price: $6,000 (2.1%)
MUD District: Yes — rate $0.89 per $100 of assessed value

=== PRICE HISTORY ===
2026-04-30: $285,000 (Listed for sale)

=== SCHOOLS ===
Harlandale High School (High, grades 9-12): 7/10; Pinn Elementary (Elementary, grades K-5): 7/10; Connell Middle School (Middle, grades 6-8): 7/10

=== DESCRIPTION ===
Solid 4/2.5 in established Castano Estates, 3.8 miles from Lackland AFB's main gate (28,000 military and civilian employees). Updated kitchen 2022 with granite and subway tile. Fresh interior paint throughout. HVAC replaced 2020. Roof 2018. 4.1 miles to South Texas Medical Center (20,000 healthcare workers). No HOA. Northside ISD 7/10 GreatSchools. Large backyard with covered patio. Texas landlord-friendly state law — no rent control, no notice-to-vacate waiting periods beyond statutory minimum. Buyer to verify MUD obligations with Bexar County.

=== RENTCAST RENT ESTIMATE ===
Estimated monthly rent: $2,200/mo
Confidence range: $2,080–$2,340/mo
Comparable rentals (active/recent listings):
  • 3722 Enrique Ave, San Antonio, TX: $2,150/mo, 4bd/2ba, 1960sqft (0.5mi away)
  • 4110 Piedmont Ave, San Antonio, TX: $2,250/mo, 4bd/2.5ba, 2100sqft (0.8mi away)
  • 3598 Bandera Rd, San Antonio, TX: $2,200/mo, 3bd/2ba, 1880sqft (1.2mi away)

=== MUD TAX (MUNICIPAL UTILITY DISTRICT) ===
MUD rate: $0.8900 per $100 of assessed value
NOTE: This is an additional annual tax charged by the MUD district on top of standard county/city property taxes.
It funds utility infrastructure (water, sewer, drainage) and is common in suburban Texas master-planned communities.
To calculate the annual MUD tax: (list price ÷ 100) × MUD rate.
Deduct this from NOI when calculating effective cap rate and annual cash flow.

=== PRE-COMPUTED INVESTMENT METRICS ===
(Use these exact numbers in your analysis — do not re-derive)

FINANCING (25% down · 7.0% fixed · 30-yr)
  Down payment:          $71,250
  Loan amount:           $213,750
  Monthly P&I:           $1,422/mo
  Annual debt service:   $17,064/yr

YIELD ANALYSIS  (rent basis: Rentcast = $2,200/mo)
  Gross yield:           9.26%  (annual rent ÷ purchase price)
  1% rule:               0.772%  — FAILS ✗ — need $2,850/mo to pass
  NOI (45% exp. ratio):  $14,520/yr
  Cap rate:              5.09%
  Annual MUD tax:        $2,537/yr  ($211/mo)
  Adjusted NOI:          $11,983/yr
  Effective cap rate:    4.20%  (after MUD)

CASH FLOW  (NOI − debt service − MUD)
  Monthly cash flow:     -$423 (NEGATIVE)
  Annual cash flow:      -$5,076 (NEGATIVE)
  Break-even monthly rent (P&I+MUD only, excl. expenses): $1,633/mo

MAINTENANCE
  Age-based budget:      ~$5,700/yr  (2.0% of value, 28-yr-old home)`,
    overall_score: 66,
    subscores: [
      {
        category: "Location & Neighborhood",
        score: 68,
        summary:
          "Northside ISD earns a 7/10 GreatSchools composite — solid but not elite; it supports stable rental demand from military families (who prioritize proximity to base over school district prestige) rather than premium rent from professional families. Lackland AFB, 3.8 miles from the front door, employs 28,000 military and civilian personnel under federal contract through at least 2030 — the most recession-resistant employment anchor a landlord can have, immune to private-sector layoff cycles. South Texas Medical Center, 4.1 miles north, employs 20,000 healthcare workers and anchors a second independent demand cohort; military towns with adjacent medical centers historically show 20–35% lower vacancy volatility than single-anchor markets. The 78228 zip vacancy rate is 4.2% — above the 3.5% ideal but acceptable given the dual employment anchor; Bexar County rent growth was 2.8% in 2025. No FEMA flood zone designation; Bexar County low flood risk and the lot sits above the 100-year flood plain.",
      },
      {
        category: "Price & Value",
        score: 74,
        summary:
          "At $137/sqft, this listing is 11% below the San Antonio metro median of $154/sqft for 4-bedroom single-family homes — a genuine discount reflecting the home's 28-year age rather than any location defect. The Zestimate of $291,000 is $6,000 above ask, meaning the buyer acquires at a 2.1% discount to algorithmic fair value — a small but real cushion. At exactly 31 DOM — the current Bexar County single-family average — there is no inventory signal of distress or overpricing; the seller has not blinked and the market has not rejected the ask. Texas law imposes no state income tax, no capital gains tax at the state level, and landlord-favorable statutes (eviction timelines among the shortest in the U.S.) — structural advantages not captured in price-per-sqft comparisons. Target offer: $279,000 (2.1% below ask, matching Zestimate discount as anchor); walk away above $293,000 where the effective cap rate compresses below 4.0% after MUD.",
      },
      {
        category: "Rental Income Potential",
        score: 62,
        summary:
          "Rentcast confirms $2,200/mo from 3 comps within 1.2 miles at $2,150–$2,250/mo; the Zillow Rent Zestimate of $2,150/mo is consistent, suggesting Rentcast's $2,200 is achievable at modest premium for the 4-bedroom size. The 1% rule: $2,200 ÷ $285,000 = 0.772% — fails; need $2,850/mo (30% above market) to pass. Pre-computed cap rate: 5.09% — above the 4% floor, no automatic penalty. The MUD tax of $0.89/$100 adds $2,537/yr ($211/mo) in non-negotiable annual cost; effective cap rate after MUD: 4.20%. Monthly cash flow after debt service and MUD: −$423/mo — negative but under the $500/mo scoring threshold. Lackland AFB military tenants sign 12-month BAH-backed leases and have a 97%+ on-time payment rate historically — the highest-quality tenant cohort available in any market, reducing the effective vacancy and collection loss assumptions embedded in the 45% expense ratio.",
      },
      {
        category: "Condition & Maintenance",
        score: 54,
        summary:
          "Built 1998, the home is 28 years old — in the highest maintenance cohort where age-based budget reaches 2.0% of value ($5,700/yr). The HVAC was replaced in 2020 (6 years ago), buying an estimated 10–14 more years before the next replacement ($8,000–$12,000); this is the most meaningful recent capital investment disclosed. The roof was replaced in 2018 (8 years ago) — a positive signal; an asphalt shingle roof in San Antonio carries a 20-year life expectancy, meaning the roof is mid-cycle and not an immediate concern but carries a 12-year replacement horizon ($14,000–$18,000). The kitchen was updated in 2022 (granite, subway tile) — cosmetic improvement that adds tenant appeal but does not reset plumbing, electrical, or structural risk timelines. Original bathrooms (1998), original plumbing stack, and the possibility of original electrical panel are the primary near-term risk items; inspection must verify plumbing type and panel capacity.",
      },
      {
        category: "Market Trends",
        score: 66,
        summary:
          "31 DOM at exactly the Bexar County average signals correct pricing in a balanced market — no negotiation leverage but also no risk of catching a falling knife. San Antonio's population grew 1.9% in 2024, sustained by Toyota Manufacturing (4,200 employees at the Southside plant), Microsoft's $1.1B data center investment, and USAA's 20,000-employee headquarters — diversified demand that insulates the city from single-sector risk. Military renter demand is structurally different from private-sector demand: Lackland BAH (Basic Allowance for Housing) increases annually with DoD pay raises, effectively providing rent growth on autopilot for landlords renting to military tenants. Single-family rental demand in San Antonio is growing 1.8%/yr as home prices exclude first-time buyers who once would have left the rental market; 38% of San Antonio households currently rent vs. 34% in 2018. The MUD district's $0.89/$100 rate is below the Bexar County suburban average of $1.10/$100, limiting further MUD rate escalation risk.",
      },
    ],
    verdict:
      "CONDITIONAL BUY — effective cap rate 4.20% after MUD, monthly cash flow −$423 on an 11% below-market asset with the highest-quality tenant cohort available in any market (military/healthcare dual anchor). The condition is this: pre-purchase inspection must confirm plumbing type (galvanized vs. copper), electrical panel capacity (100A original vs. 200A upgraded), and that the 1998 foundation has no active pier movement. If inspection passes, offer $279,000 and budget $25,000–$35,000 for immediate or near-term capex (plumbing contingency $15k, HVAC reserve $12k, panel upgrade $5k); at $279k the effective cap rate improves to 4.36%. Year 1 cash flow: −$5,076 (formula) plus $5,700 maintenance budget = −$10,776 all-in economic carry before vacancy. Five-year total return at $279k entry with 2% rent growth and 2.5% appreciation: +$38,000 equity gain — modest but with government-guaranteed BAH-backed rent and sub-4% effective vacancy as the upside lever.",
    bull_case:
      "If Lackland AFB expands its Joint Base mission footprint (a 2026 DoD budget proposal includes $420M in San Antonio base infrastructure) and BAH rates increase 5% in 2027 (inline with recent DoD pay act trends), military tenant rents could reach $2,450/mo by Year 3 without competitive resistance. At $2,450/mo and a $279k entry price, monthly cash flow after MUD improves from −$423 to approximately −$216/mo, and the yield-on-cost on the original $69,750 down payment reaches 7.2%. At that point, total equity including 2.5% annual appreciation is approximately $60,000 above entry — a 86% return on invested capital in 5 years for a 4-bedroom home in a market with 4.2% vacancy and a government-guaranteed tenant pool.",
    bear_case:
      "If inspection reveals galvanized plumbing (common in 1998 Texas construction) requiring full re-pipe ($18,000) and the electrical panel is the original 100A unit requiring upgrade to 200A ($4,500), the immediate post-close capex rises to $22,500 — consuming the entire Zestimate discount plus the first 4 months of P&I payments. If a simultaneous 60-day vacancy occurs in Year 2 and the MUD district rate increases from $0.89 to $1.05/$100 (the Bexar County suburban average) by Year 3, the cumulative net loss through Year 3 at current ask is approximately −$38,000 in economic carry — not catastrophic but eliminating the return on a 28-year-old home with no appreciation upside comparable to the Scottsdale or Nashville markets.",
    rentcast_estimate: 2200,
    rentcast_comps: [
      { address: "3722 Enrique Ave, San Antonio, TX",  rent: 2150, bedrooms: 4, bathrooms: 2,   squareFootage: 1960, distanceMi: 0.5 },
      { address: "4110 Piedmont Ave, San Antonio, TX", rent: 2250, bedrooms: 4, bathrooms: 2.5, squareFootage: 2100, distanceMi: 0.8 },
      { address: "3598 Bandera Rd, San Antonio, TX",   rent: 2200, bedrooms: 3, bathrooms: 2,   squareFootage: 1880, distanceMi: 1.2 },
    ],
    mud_rate: 0.89,
    notes: null,
    created_at: "2026-06-01T09:20:00Z",
    updated_at: null,
    rich_data: null,
    zillow_url: null,
  },
];
