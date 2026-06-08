import type { ReactNode } from "react";
import { ZillowRichData } from "@/lib/analysis";

interface PropertyFactsProps {
  richData: ZillowRichData;
  listingText: string;
  mudRate: number | null;
}

function parseNum(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m) return null;
  return parseInt(m[1].replace(/,/g, ""), 10);
}

function parseStr(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function fmtDollar(v: number | null): string | null {
  if (v == null) return null;
  return "$" + v.toLocaleString();
}

interface FactItem {
  label: string;
  value: ReactNode | null;
}

function Section({
  title,
  items,
  isFirst,
}: {
  title: string;
  items: FactItem[];
  isFirst?: boolean;
}) {
  const nonNull = items.filter(({ value }) => value !== null && value !== undefined);
  if (nonNull.length === 0) return null;

  return (
    <>
      <div style={{ marginTop: isFirst ? 0 : 20, marginBottom: 4 }}>
        <span
          style={{
            fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--text-muted)",
          }}
        >
          {title}
        </span>
      </div>
      {nonNull.map(({ label, value }) => (
        <div
          key={label}
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
            padding: "8px 0", borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <span
            style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--text-muted)",
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: 12, color: "var(--text-primary)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            {value}
          </span>
        </div>
      ))}
    </>
  );
}

export default function PropertyFacts({ richData, listingText, mudRate }: PropertyFactsProps) {
  const beds      = parseNum(listingText, /Bedrooms?:\s*(\d+)/i);
  const baths     = parseNum(listingText, /Bathrooms?:\s*([\d.]+)/i);
  const sqft      = parseNum(listingText, /Living area:\s*([\d,]+)/i);
  const homeType  = parseStr(listingText, /Home type:\s*(.+)/i);
  const yearBuilt = parseNum(listingText, /Year built:\s*(\d{4})/i);
  const listPrice = parseNum(listingText, /List price:\s*\$?([\d,]+)/i);

  const lotSize = richData.lotSize;
  const lotDisplay = lotSize
    ? lotSize > 43560
      ? `${(lotSize / 43560).toFixed(2)} acres`
      : `${lotSize.toLocaleString()} sqft`
    : null;

  // Zestimate vs list delta
  let zestVsList: ReactNode = null;
  if (richData.zestimate && listPrice) {
    const delta = richData.zestimate - listPrice;
    const pct = ((delta / listPrice) * 100).toFixed(1);
    zestVsList = (
      <span style={{ color: delta >= 0 ? "var(--score-green)" : "var(--score-red)" }}>
        {delta >= 0 ? "+" : ""}${Math.abs(delta).toLocaleString()} ({delta >= 0 ? "+" : ""}{pct}%)
      </span>
    );
  }

  // Helpers to look up facts by label
  const factVal = (label: string): string | null =>
    richData.facts.find(f => f.label === label)?.value ?? null;

  return (
    <div
      style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
        borderRadius: 10, padding: "16px 18px",
      }}
    >
      <Section
        title="Listing Details"
        isFirst
        items={[
          { label: "List Price",        value: fmtDollar(listPrice) },
          { label: "Zestimate",         value: fmtDollar(richData.zestimate) },
          { label: "Rent Zestimate",    value: richData.rentZestimate ? `$${richData.rentZestimate.toLocaleString()}/mo` : null },
          { label: "Price / sqft",      value: richData.pricePerSqft ? `$${richData.pricePerSqft}/sqft` : null },
          { label: "Zestimate vs List", value: zestVsList },
          { label: "Days on Zillow",    value: richData.daysOnZillow != null ? String(richData.daysOnZillow) : null },
          { label: "Page Views",        value: richData.pageViewCount != null ? richData.pageViewCount.toLocaleString() : null },
          { label: "Saves",             value: richData.favoriteCount != null ? richData.favoriteCount.toLocaleString() : null },
          { label: "HOA Fee",           value: richData.monthlyHoaFee ? `$${richData.monthlyHoaFee.toLocaleString()}/mo` : null },
          { label: "MLS ID",            value: richData.mlsId },
        ]}
      />

      <Section
        title="Property Details"
        items={[
          { label: "Bedrooms",       value: beds != null ? String(beds) : null },
          { label: "Bathrooms",      value: baths != null ? String(baths) : null },
          { label: "Living Area",    value: sqft != null ? `${sqft.toLocaleString()} sqft` : null },
          { label: "Lot Size",       value: lotDisplay },
          { label: "Year Built",     value: yearBuilt != null ? String(yearBuilt) : null },
          { label: "Home Type",      value: homeType },
          { label: "Parking Spaces", value: richData.parkingSpaces != null ? String(richData.parkingSpaces) : null },
          { label: "Basement",       value: richData.basement },
        ]}
      />

      <Section
        title="Interior"
        items={[
          { label: "Heating",            value: richData.heating },
          { label: "Cooling",            value: richData.cooling },
          { label: "Appliances",         value: richData.appliances },
          { label: "Flooring",           value: richData.flooring },
          { label: "Laundry",            value: factVal("Laundry") },
          { label: "Interior Features",  value: factVal("Interior features") },
        ]}
      />

      <Section
        title="Exterior"
        items={[
          { label: "Exterior",      value: richData.exteriorFeatures },
          { label: "Roof",          value: richData.roof },
          { label: "Lot Features",  value: factVal("Lot features") },
          { label: "Community",     value: factVal("Community") },
          { label: "HOA Includes",  value: factVal("HOA includes") },
        ]}
      />

      <Section
        title="Financial"
        items={[
          { label: "Tax Assessed Value", value: fmtDollar(richData.taxAssessedValue) },
          {
            label: "MUD Rate",
            value: mudRate != null
              ? (
                <span style={{ color: "var(--score-amber)" }}>
                  ${mudRate.toFixed(2)} per $100 assessed
                </span>
              )
              : null,
          },
        ]}
      />
    </div>
  );
}
