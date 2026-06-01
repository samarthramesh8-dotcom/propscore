import { Property } from "./types";

/**
 * Sample properties shown to guest / demo users.
 * listing_text is formatted exactly as formatZillapiForClaude() produces,
 * so CashFlowChart can parse list price and rent from it.
 */
export const MOCK_PROPERTIES: Property[] = [
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
Description: Beautifully maintained 3/2 in Northwest Austin's coveted tech corridor. Open-plan kitchen with quartz counters, updated HVAC 2021, hardwood throughout. Walking distance to Domain retail. Award-winning Round Rock ISD schools.`,
    overall_score: 74,
    subscores: [
      {
        category: "Price & Value",
        score: 71,
        summary:
          "Listed at $385k vs Zestimate of $392k — a modest 1.8% discount. Price/sqft of $209 is competitive for 78759. Priced to sell quickly; limited negotiation room but fair entry point.",
      },
      {
        category: "Location",
        score: 82,
        summary:
          "GreatSchools rating 8/10. Close to Domain tech corridor, walkable amenities. NW Austin submarket has averaged 5.8% annual appreciation over 5 years. Low vacancy risk.",
      },
      {
        category: "Rental Yield",
        score: 68,
        summary:
          "Rent Zestimate $2,800/mo gives a 0.73% ratio — slightly below the 1% target but typical for Austin. Cap rate ~4.6% at 45% expense ratio. Rentcast comps confirm demand is strong.",
      },
      {
        category: "Condition",
        score: 77,
        summary:
          "Built 2004, well-maintained. HVAC replaced 2021. No deferred maintenance signals. Estimated $3,200/yr ongoing maintenance budget. Roof ~10 years remaining life.",
      },
      {
        category: "Market Trends",
        score: 72,
        summary:
          "12 DOM indicates active demand. NW Austin inventory remains constrained. Interest rate pressure moderating but employment base (tech, healthcare) provides durable rental demand.",
      },
    ],
    verdict:
      "Solid rental candidate in a high-demand Austin corridor. Cap rate of 4.6% sits below the 1% rule threshold but strong appreciation potential and minimal vacancy risk near the Domain tech hub compensate. Pursue at asking or negotiate modestly — this won't last.",
    bull_case:
      "The Domain tech corridor continues drawing high-income renters willing to pay premium rents. NW Austin appreciation has averaged 5.8% annually over 5 years. The 78759 zip code has a 2.1% vacancy rate — one of the lowest in Travis County — ensuring stable cash flow even in downturns.",
    bear_case:
      "Cap rate of 4.6% leaves thin margin for rate increases or unexpected repairs. Austin inventory is rising city-wide, which may compress rents in coming years. A $12–15k HVAC replacement in years 8–12 could temporarily turn cash flow negative.",
    rentcast_estimate: 2850,
    rentcast_comps: [
      {
        address: "4610 Convict Hill Rd, Austin, TX",
        rent: 2900,
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1920,
        distanceMi: 0.4,
      },
      {
        address: "5102 Balcones Dr, Austin, TX",
        rent: 2750,
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1780,
        distanceMi: 0.7,
      },
      {
        address: "4933 Westover Hills Blvd, Austin, TX",
        rent: 2995,
        bedrooms: 3,
        bathrooms: 2.5,
        squareFootage: 1998,
        distanceMi: 1.1,
      },
    ],
    mud_rate: null,
    created_at: "2026-05-28T14:22:00Z",
  },

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
MUD District: Yes — rate $1.12 per $100 assessed value
Description: Spacious 4/2.5 in Energy Corridor with 3-car garage. Large backyard, updated kitchen, good school ratings. Motivated seller after 67 days. Flood zone X (minimal risk). Buyer to verify MUD obligations.`,
    overall_score: 61,
    subscores: [
      {
        category: "Price & Value",
        score: 65,
        summary:
          "Listed at $289k, Zestimate $295k — 2% below market. Price/sqft of $131 is well below the Houston median of $156. Long 67-day DOM signals meaningful negotiation room; could likely close at $275–280k.",
      },
      {
        category: "Location",
        score: 55,
        summary:
          "Schools rated 6/10. Energy Corridor proximity adds rental demand but oil-sector volatility creates cyclical employment risk. FEMA Flood Zone X — low risk but buyer should verify independently.",
      },
      {
        category: "Rental Yield",
        score: 72,
        summary:
          "Rent estimate $2,100/mo gives 0.73% ratio. Cap rate 5.2% before MUD tax. After MUD ($3,237/yr) the effective cap rate drops to ~4.1% — still positive but materially compressed.",
      },
      {
        category: "Condition",
        score: 58,
        summary:
          "Built 1993. Roof is approximately 14 years old — budget $12k replacement within 3 years. Kitchen updated but original bathrooms. Estimated $4,800/yr maintenance given age and square footage.",
      },
      {
        category: "Market Trends",
        score: 55,
        summary:
          "Houston market soft in this price band. Energy sector tied to oil price volatility. 67 DOM reflects overpricing relative to condition. Inventory up 14% YoY in 77077 zip.",
      },
    ],
    verdict:
      "Decent yield on paper but MUD tax and near-term capex risk erode returns materially. A 5–8% price reduction to ~$270k would significantly improve the investment thesis. Flood insurance clarity and a pre-inspection are essential before proceeding.",
    bull_case:
      "Energy Corridor remains one of Houston's primary employment hubs. 4-bed family demand is stable and defensive — families don't leave mid-lease. Strong negotiation leverage at 67 DOM. If oil recovers to $90+, professional rental demand surges in this submarket.",
    bear_case:
      "MUD rate of $1.12/100 adds $3,237/yr in tax burden invisible in the listing price. Flood insurance adds $1,800–2,400/yr even in Zone X. Roof replacement within 3 years eats 1+ year of net cash flow. Combined, these costs turn a marginal deal clearly negative at current ask.",
    rentcast_estimate: 2125,
    rentcast_comps: [
      {
        address: "12500 Westheimer Rd, Houston, TX",
        rent: 2200,
        bedrooms: 4,
        bathrooms: 2.5,
        squareFootage: 2300,
        distanceMi: 0.5,
      },
      {
        address: "11840 Memorial Dr, Houston, TX",
        rent: 2050,
        bedrooms: 4,
        bathrooms: 2,
        squareFootage: 2100,
        distanceMi: 0.9,
      },
      {
        address: "12820 Briar Forest Dr, Houston, TX",
        rent: 2175,
        bedrooms: 4,
        bathrooms: 2.5,
        squareFootage: 2180,
        distanceMi: 1.4,
      },
    ],
    mud_rate: 1.12,
    created_at: "2026-05-22T09:15:00Z",
  },

  {
    id: "demo-3",
    user_id: "guest",
    address: "891 Maple Grove Ct, Dallas, TX 75248",
    listing_text: `List price: $520000 ($520k)
Zestimate: $508000 ($508k)
Rent Zestimate: $3200/mo
Beds: 4 | Baths: 3 | Sqft: 2,650
Year built: 2018 | Lot: 0.21 ac | HOA: $285/mo
Days on market: 89
Price/sqft: $196
Description: Stunning 4/3 in Plano ISD's premier school zone. Built 2018 with smart home integration, quartz waterfall island, 3-car garage. Resort pool, HOA maintains exterior. Like-new condition. Motivated seller.`,
    overall_score: 48,
    subscores: [
      {
        category: "Price & Value",
        score: 42,
        summary:
          "Listed at $520k, Zestimate $508k — priced 2.4% above market after 89 days. Price/sqft $196 is elevated for this submarket. The 89-day DOM says the market has rejected current pricing.",
      },
      {
        category: "Location",
        score: 72,
        summary:
          "GreatSchools 9/10 — among the best in DFW. Prestige suburban location with strong long-term appreciation potential. Excellent for owner-occupants but buyers pay a significant school-district premium.",
      },
      {
        category: "Rental Yield",
        score: 38,
        summary:
          "Rent of $3,200/mo on $520k purchase is 0.62% — well below the 1% rule. Cap rate of 3.8% before HOA ($3,420/yr) drops to ~3.1% after. Cash-flow negative from day one by ~$890/mo.",
      },
      {
        category: "Condition",
        score: 81,
        summary:
          "Built 2018, like-new condition. Minimal capex risk for 8–10 years. Smart home features. HOA covers exterior maintenance, reducing ongoing expense. No deferred maintenance.",
      },
      {
        category: "Market Trends",
        score: 28,
        summary:
          "North Dallas luxury segment showing price softening. Inventory up 18% YoY. 89 DOM is a strong market signal. Buyer leverage is high — this should transact 8–12% below current ask.",
      },
    ],
    verdict:
      "Excellent home, poor investment at this price. The top school district commands a premium that rental yields cannot support. This is a primary residence purchase masquerading as an investment property. Pass unless you can acquire 12–15% below current ask (~$450k), where the numbers begin to work.",
    bull_case:
      "Top-rated school district (9/10) creates a persistent demand floor — families pay above-market rents to stay in the zone. 2018 construction means zero capex risk for nearly a decade. If Dallas tech migration accelerates, luxury rental demand could close the yield gap within 3–4 years.",
    bear_case:
      "At $520k, this property cash-flows negative by approximately $890/mo from day one. The $285/mo HOA alone erases meaningful appreciation upside. 89 DOM with a Zestimate below ask confirms it is overpriced. Rising North Dallas inventory will likely push this further before it finds a buyer.",
    rentcast_estimate: 3150,
    rentcast_comps: [
      {
        address: "905 Creekview Ln, Dallas, TX",
        rent: 3300,
        bedrooms: 4,
        bathrooms: 3,
        squareFootage: 2700,
        distanceMi: 0.3,
      },
      {
        address: "720 Timberline Dr, Dallas, TX",
        rent: 3100,
        bedrooms: 4,
        bathrooms: 2.5,
        squareFootage: 2580,
        distanceMi: 0.6,
      },
      {
        address: "1102 Hillcrest Rd, Dallas, TX",
        rent: 3250,
        bedrooms: 4,
        bathrooms: 3,
        squareFootage: 2720,
        distanceMi: 1.0,
      },
    ],
    mud_rate: null,
    created_at: "2026-05-15T16:45:00Z",
  },
];
