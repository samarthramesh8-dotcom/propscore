// ─── Shared types ─────────────────────────────────────────────────────────────

export interface RentcastComp {
  address: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  distanceMi: number;
}

export interface RentcastResult {
  estimate: number;
  rentRangeLow: number;
  rentRangeHigh: number;
  comparables: RentcastComp[];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

// Walk a nested object and find a value by any of the given key names
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dig(obj: any, ...keys: string[]): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    if (key in obj && obj[key] !== null && obj[key] !== undefined) return obj[key];
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === "object") {
      const found = dig(val, ...keys);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function fmt(v: unknown, prefix = "", suffix = ""): string {
  if (v === undefined || v === null || v === "") return "not listed";
  return `${prefix}${v}${suffix}`;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

// Turn Zillapi's deeply-nested JSON into a flat, labelled property sheet for Claude.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatZillapiForClaude(json: any, url: string): string {
  // Zillapi may wrap in { data: { ... } } or return fields at root
  const d = json?.data ?? json;

  const price = dig(d, "price", "listPrice", "listing_price") as number | undefined;
  const sqft = dig(d, "livingArea", "sqft", "squareFootage", "living_area", "finished_sq_ft") as number | undefined;
  const lotSqft = dig(d, "lotSize", "lot_size", "lotAreaValue") as number | undefined;
  const beds = dig(d, "bedrooms", "beds", "bedroom_count") as number | undefined;
  const baths = dig(d, "bathrooms", "baths", "bathroom_count") as number | undefined;
  const yearBuilt = dig(d, "yearBuilt", "year_built") as number | undefined;
  const dom = dig(d, "daysOnZillow", "days_on_market", "daysOnMarket", "dom") as number | undefined;
  const zestimate = dig(d, "zestimate") as number | undefined;
  const rentZestimate = dig(d, "rentZestimate", "rent_zestimate") as number | undefined;
  const taxValue = dig(d, "taxAssessedValue", "tax_assessed_value", "taxValue") as number | undefined;
  const hoa = dig(d, "monthlyHoaFee", "hoa_fee", "hoaFee") as number | undefined;
  const homeType = dig(d, "homeType", "home_type", "propertyType") as string | undefined;
  const homeStatus = dig(d, "homeStatus", "home_status", "listingStatus") as string | undefined;
  const description = dig(d, "description") as string | undefined;
  const pricePerSqft = price && sqft ? Math.round(price / sqft) : undefined;

  // Address
  const streetAddress = dig(d, "streetAddress", "street_address", "address") as string | undefined;
  const city = dig(d, "city") as string | undefined;
  const state = dig(d, "state") as string | undefined;
  const zip = dig(d, "zipcode", "zip", "postal_code") as string | undefined;
  const fullAddress = [streetAddress, city, state, zip].filter(Boolean).join(", ") || "See URL";

  // Price history — look for cuts
  const priceHistory = dig(d, "priceHistory", "price_history") as Array<{date?: string; price?: number; event?: string; priceChangeRate?: number}> | undefined;
  const priceHistoryStr = priceHistory?.slice(0, 8)
    .map(h => `${h.date ?? "?"}: $${h.price?.toLocaleString() ?? "?"} (${h.event ?? "?"})`)
    .join(" → ") ?? "not listed";

  // Schools
  const schools = dig(d, "schools", "nearbySchools") as Array<{name?: string; rating?: number; type?: string; grades?: string}> | undefined;
  const schoolsStr = schools?.slice(0, 5)
    .map(s => `${s.name ?? "?"} (${s.type ?? "?"}, grades ${s.grades ?? "?"}): ${s.rating ?? "?"}/10`)
    .join("; ") ?? "not listed";

  const lines = [
    `Source: ${url}`,
    ``,
    `=== PROPERTY FACTS ===`,
    `Address: ${fullAddress}`,
    `List price: ${fmt(price, "$", price ? ` ($${(price / 1000).toFixed(0)}k)` : "")}`,
    `Bedrooms: ${fmt(beds)}`,
    `Bathrooms: ${fmt(baths)}`,
    `Living area: ${fmt(sqft, "", " sqft")}`,
    `Lot size: ${fmt(lotSqft, "", " sqft")}`,
    `Year built: ${fmt(yearBuilt)}`,
    `Price per sqft: ${fmt(pricePerSqft, "$", "/sqft")}`,
    `Days on market: ${fmt(dom)}`,
    `Home type: ${fmt(homeType)}`,
    `Status: ${fmt(homeStatus)}`,
    `HOA (monthly): ${fmt(hoa, "$")}`,
    ``,
    `=== VALUATION ===`,
    `Zestimate: ${fmt(zestimate, "$")}`,
    `Rent Zestimate: ${fmt(rentZestimate, "$", "/mo")}`,
    `Tax assessed value: ${fmt(taxValue, "$")}`,
    `Zestimate vs list price: ${zestimate && price ? `$${(zestimate - price).toLocaleString()} (${((zestimate - price) / price * 100).toFixed(1)}%)` : "not listed"}`,
    ``,
    `=== PRICE HISTORY ===`,
    priceHistoryStr,
    ``,
    `=== SCHOOLS ===`,
    schoolsStr,
    ``,
    `=== DESCRIPTION ===`,
    description?.slice(0, 1500) ?? "not listed",
  ];

  return lines.join("\n");
}

export function formatRentcastForClaude(rc: RentcastResult): string {
  const lines = [
    ``,
    `=== RENTCAST RENT ESTIMATE ===`,
    `Estimated monthly rent: $${rc.estimate.toLocaleString()}/mo`,
    `Confidence range: $${rc.rentRangeLow.toLocaleString()}–$${rc.rentRangeHigh.toLocaleString()}/mo`,
  ];
  if (rc.comparables.length > 0) {
    lines.push(`Comparable rentals (active/recent listings):`);
    rc.comparables.forEach((c) => {
      lines.push(
        `  • ${c.address}: $${c.rent.toLocaleString()}/mo, ` +
        `${c.bedrooms}bd/${c.bathrooms}ba, ${c.squareFootage}sqft (${c.distanceMi}mi away)`
      );
    });
  }
  return lines.join("\n");
}

export function formatMudForClaude(mudRate: number): string {
  return [
    ``,
    `=== MUD TAX (MUNICIPAL UTILITY DISTRICT) ===`,
    `MUD rate: $${mudRate.toFixed(4)} per $100 of assessed value`,
    `NOTE: This is an additional annual tax charged by the MUD district on top of standard county/city property taxes.`,
    `It funds utility infrastructure (water, sewer, drainage) and is common in suburban Texas master-planned communities.`,
    `To calculate the annual MUD tax: (list price ÷ 100) × MUD rate.`,
    `Deduct this from NOI when calculating effective cap rate and annual cash flow.`,
  ].join("\n");
}

// ─── Financial pre-computation ───────────────────────────────────────────────
// Parse price + best available rent from already-formatted listing text and
// append a section of pre-computed metrics so Claude has verified numbers.
// This guarantees arithmetic accuracy regardless of Claude's own computation.

export function appendFinancials(text: string, mudRate: number | null): string {
  const priceM    = text.match(/List price:\s*\$?([\d,]+)/i);
  const rentcastM = text.match(/Estimated monthly rent:\s*\$?([\d,]+)/i);
  const zestM     = text.match(/Rent Zestimate:\s*\$?([\d,]+)/i);

  const price = priceM ? parseInt(priceM[1].replace(/,/g, ""), 10) : null;
  if (!price || price < 10_000) return text; // can't compute without a price

  const rent = rentcastM
    ? parseInt(rentcastM[1].replace(/,/g, ""), 10)
    : zestM
    ? parseInt(zestM[1].replace(/,/g, ""), 10)
    : Math.round(price * 0.0075);
  const rentSource = rentcastM ? "Rentcast" : zestM ? "Zillow Zestimate" : "0.75% estimate (no rent data)";

  // Mortgage: 25% down, 7% fixed, 30-yr
  const loan      = price * 0.75;
  const r         = 0.07 / 12;
  const n         = 360;
  const monthlyPI = loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  // Yield & cap rate
  const annualRent  = rent * 12;
  const grossYield  = (annualRent / price * 100).toFixed(2);
  const noi         = annualRent * 0.55;
  const capRate     = (noi / price * 100).toFixed(2);
  const onePct      = (rent / price * 100).toFixed(3);
  const passFail    = rent / price >= 0.01
    ? "PASSES ✓"
    : `FAILS ✗ — need $${Math.round(price * 0.01).toLocaleString()}/mo to pass`;

  // MUD / HOA adjustments
  const annualMud    = mudRate ? Math.round((mudRate * price) / 100) : 0;
  const effectiveNoi = noi - annualMud;
  const effCapRate   = (effectiveNoi / price * 100).toFixed(2);

  // Cash flow (NOI − debt service − MUD)
  const monthlyCF    = Math.round(noi / 12 - monthlyPI - annualMud / 12);
  const annualCF     = monthlyCF * 12;

  // Annual maintenance budget (1.5% new, 2.5% mid-age, 3.5% old — approx)
  const yearBuiltM   = text.match(/Year built:\s*(\d{4})/i);
  const age          = yearBuiltM ? (new Date().getFullYear() - parseInt(yearBuiltM[1], 10)) : null;
  const maintPct     = !age ? 2.0 : age < 10 ? 1.0 : age < 25 ? 1.5 : age < 40 ? 2.0 : 3.0;
  const annualMaint  = Math.round(price * maintPct / 100);

  const lines = [
    ``,
    `=== PRE-COMPUTED INVESTMENT METRICS ===`,
    `(Use these exact numbers in your analysis — do not re-derive)`,
    ``,
    `FINANCING (25% down · 7.0% fixed · 30-yr)`,
    `  Down payment:          $${Math.round(price * 0.25).toLocaleString()}`,
    `  Loan amount:           $${Math.round(loan).toLocaleString()}`,
    `  Monthly P&I:           $${Math.round(monthlyPI).toLocaleString()}/mo`,
    `  Annual debt service:   $${Math.round(monthlyPI * 12).toLocaleString()}/yr`,
    ``,
    `YIELD ANALYSIS  (rent basis: ${rentSource} = $${rent.toLocaleString()}/mo)`,
    `  Gross yield:           ${grossYield}%  (annual rent ÷ purchase price)`,
    `  1% rule:               ${onePct}%  — ${passFail}`,
    `  NOI (45% exp. ratio):  $${Math.round(noi).toLocaleString()}/yr`,
    `  Cap rate:              ${capRate}%`,
    ...(mudRate ? [
      `  Annual MUD tax:        $${annualMud.toLocaleString()}/yr  ($${Math.round(annualMud / 12)}/mo)`,
      `  Adjusted NOI:          $${Math.round(effectiveNoi).toLocaleString()}/yr`,
      `  Effective cap rate:    ${effCapRate}%  (after MUD)`,
    ] : []),
    ``,
    `CASH FLOW  (NOI − debt service${mudRate ? " − MUD" : ""})`,
    `  Monthly cash flow:     ${monthlyCF >= 0 ? "+" : ""}$${Math.abs(monthlyCF).toLocaleString()}${monthlyCF < 0 ? " (NEGATIVE)" : ""}`,
    `  Annual cash flow:      ${annualCF >= 0 ? "+" : ""}$${Math.abs(annualCF).toLocaleString()}${annualCF < 0 ? " (NEGATIVE)" : ""}`,
    `  Break-even monthly rent (P&I${mudRate ? "+MUD" : ""} only, excl. expenses): $${Math.round(monthlyPI + annualMud / 12).toLocaleString()}/mo`,
    ``,
    `MAINTENANCE`,
    `  Age-based budget:      ~$${annualMaint.toLocaleString()}/yr  (${maintPct}% of value${age ? `, ${age}-yr-old home` : ""})`,
  ];

  return text + "\n" + lines.join("\n");
}
