"use client";

import { useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  listingText: string;
  rentcastEstimate: number | null;
  monthlyHoaFee: number | null;
  mudRate: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePriceFromListing(text: string): number | null {
  const m = text.match(/List price:\s*\$?([\d,]+)/i);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

function parseRentFromListing(text: string): number | null {
  const m =
    text.match(/Estimated monthly rent:\s*\$?([\d,]+)/i) ||
    text.match(/Rent Zestimate:\s*\$?([\d,]+)/i);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

function calcMortgage(principal: number, annualRate: number, termYears: number): number {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricRow({
  label,
  value,
  highlight,
  last,
}: {
  label: string;
  value: string;
  highlight?: "green" | "red" | "amber";
  last?: boolean;
}) {
  const color =
    highlight === "green"
      ? "var(--score-green)"
      : highlight === "red"
      ? "var(--score-red)"
      : highlight === "amber"
      ? "var(--score-amber)"
      : "var(--text-primary)";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: last ? "none" : "1px solid var(--border-subtle)",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
      <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, color }}>
        {value}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FinancingCalculator({ listingText, rentcastEstimate, monthlyHoaFee, mudRate }: Props) {
  const detectedPrice = parsePriceFromListing(listingText);
  const listingRent = parseRentFromListing(listingText);
  const monthlyRent = rentcastEstimate ?? listingRent ?? null;

  const [open, setOpen] = useState(false);
  const [offerSimOpen, setOfferSimOpen] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);

  // Inputs
  const [price, setPrice] = useState(detectedPrice ?? 0);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(7.0);
  const [term, setTerm] = useState<15 | 30>(30);
  const [closingCostPct, setClosingCostPct] = useState(3);
  const [hoa, setHoa] = useState(monthlyHoaFee ?? 0);
  const [offerPrice, setOfferPrice] = useState(detectedPrice ?? 0);

  // Core metrics
  const calc = useMemo(() => {
    if (!price || price < 10_000) return null;
    const down = price * (downPct / 100);
    const loan = price - down;
    const closingCosts = price * (closingCostPct / 100);
    const totalCashIn = down + closingCosts;
    const monthlyPI = calcMortgage(loan, rate, term);
    const taxEst = (price * 0.0125) / 12;
    const insuranceEst = (price * 0.005) / 12;
    const totalMonthly = monthlyPI + taxEst + insuranceEst + hoa;
    const monthlyCF = monthlyRent !== null ? monthlyRent - totalMonthly : null;
    const annualCF = monthlyCF !== null ? monthlyCF * 12 : null;
    const cashOnCash =
      annualCF !== null && totalCashIn > 0 ? (annualCF / totalCashIn) * 100 : null;
    const annualMud = mudRate ? (mudRate * price) / 100 : 0;
    const noi = monthlyRent !== null ? monthlyRent * 12 * 0.55 : null;
    const capRate = noi !== null ? ((noi - annualMud) / price) * 100 : null;
    const onePct = monthlyRent !== null ? (monthlyRent / price) * 100 : null;
    return {
      down, loan, closingCosts, totalCashIn, monthlyPI,
      taxEst, insuranceEst, totalMonthly,
      monthlyCF, annualCF, cashOnCash, capRate, onePct,
    };
  }, [price, downPct, rate, term, closingCostPct, hoa, monthlyRent, mudRate]);

  // Offer simulator metrics
  const offerCalc = useMemo(() => {
    if (!offerPrice || offerPrice < 10_000 || !calc) return null;
    const down = offerPrice * (downPct / 100);
    const loan = offerPrice - down;
    const monthlyPI = calcMortgage(loan, rate, term);
    const taxEst = (offerPrice * 0.0125) / 12;
    const insuranceEst = (offerPrice * 0.005) / 12;
    const totalMonthly = monthlyPI + taxEst + insuranceEst + hoa;
    const monthlyCF = monthlyRent !== null ? monthlyRent - totalMonthly : null;
    const annualCF = monthlyCF !== null ? monthlyCF * 12 : null;
    const closingCosts = offerPrice * (closingCostPct / 100);
    const totalCashIn = down + closingCosts;
    const cashOnCash =
      annualCF !== null && totalCashIn > 0 ? (annualCF / totalCashIn) * 100 : null;
    const annualMud = mudRate ? (mudRate * offerPrice) / 100 : 0;
    const noi = monthlyRent !== null ? monthlyRent * 12 * 0.55 : null;
    const capRate = noi !== null ? ((noi - annualMud) / offerPrice) * 100 : null;
    const onePct = monthlyRent !== null ? (monthlyRent / offerPrice) * 100 : null;
    const discountDollar = detectedPrice ? detectedPrice - offerPrice : null;
    const discountPct =
      detectedPrice && detectedPrice > 0
        ? ((detectedPrice - offerPrice) / detectedPrice) * 100
        : null;
    return { monthlyCF, cashOnCash, capRate, onePct, discountDollar, discountPct };
  }, [offerPrice, downPct, rate, term, closingCostPct, hoa, monthlyRent, mudRate, calc, detectedPrice]);

  // Don't render if no price found in listing
  if (!detectedPrice) return null;

  const inputStyle: React.CSSProperties = {
    height: 30,
    padding: "0 8px",
    borderRadius: 6,
    fontSize: 12,
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    marginBottom: 4,
  };

  const scenarios = [
    { label: "Current", price, rate },
    { label: `+0.5% rate (${(rate + 0.5).toFixed(1)}%)`, price, rate: rate + 0.5 },
    { label: `-10% price (${usd.format(price * 0.9)})`, price: price * 0.9, rate },
  ];

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* ── Collapsible header ──────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Financing Calculator
          </span>
          {!open && calc?.monthlyCF !== undefined && calc.monthlyCF !== null && (
            <span
              className="font-mono"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: calc.monthlyCF >= 0 ? "var(--score-green)" : "var(--score-red)",
              }}
            >
              {calc.monthlyCF >= 0 ? "+" : ""}
              {usd.format(calc.monthlyCF)}/mo
            </span>
          )}
        </div>
        <svg
          width="12"
          height="12"
          fill="none"
          stroke="var(--text-muted)"
          viewBox="0 0 24 24"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      {open && (
        <div style={{ padding: "0 18px 18px" }}>

          {/* Inputs grid */}
          <div
            className="ps-grid-3col"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}
          >
            {/* Purchase price */}
            <div>
              <label style={labelStyle}>Purchase Price</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-muted)", pointerEvents: "none" }}>
                  $
                </span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, paddingLeft: 18 }}
                />
              </div>
            </div>

            {/* Down payment */}
            <div>
              <label style={labelStyle}>Down Payment %</label>
              <input
                type="number"
                value={downPct}
                min={0}
                max={100}
                onChange={(e) => setDownPct(parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>

            {/* Interest rate */}
            <div>
              <label style={labelStyle}>Interest Rate %</label>
              <input
                type="number"
                value={rate}
                step={0.1}
                min={0}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>

            {/* Loan term */}
            <div>
              <label style={labelStyle}>Loan Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(parseInt(e.target.value) as 15 | 30)}
                style={inputStyle}
              >
                <option value={30}>30 Year</option>
                <option value={15}>15 Year</option>
              </select>
            </div>

            {/* Closing costs */}
            <div>
              <label style={labelStyle}>Closing Costs %</label>
              <input
                type="number"
                value={closingCostPct}
                step={0.5}
                min={0}
                onChange={(e) => setClosingCostPct(parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>

            {/* HOA */}
            <div>
              <label style={labelStyle}>Monthly HOA</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-muted)", pointerEvents: "none" }}>
                  $
                </span>
                <input
                  type="number"
                  value={hoa}
                  min={0}
                  onChange={(e) => setHoa(parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, paddingLeft: 18 }}
                />
              </div>
            </div>
          </div>

          {/* Outputs */}
          {calc && (
            <div
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: "4px 14px",
                marginBottom: 12,
              }}
            >
              <MetricRow label="Monthly P&I" value={usd.format(calc.monthlyPI)} />
              <MetricRow
                label="Est. Property Tax + Insurance"
                value={`${usd.format(calc.taxEst)} + ${usd.format(calc.insuranceEst)}/mo`}
              />
              {hoa > 0 && <MetricRow label="HOA" value={`${usd.format(hoa)}/mo`} />}
              <MetricRow label="Total Monthly Payment" value={usd.format(calc.totalMonthly)} />
              <MetricRow label="Total Cash to Close" value={usd.format(calc.totalCashIn)} />
              {calc.monthlyCF !== null && (
                <MetricRow
                  label="Monthly Cash Flow"
                  value={`${calc.monthlyCF >= 0 ? "+" : ""}${usd.format(calc.monthlyCF)}/mo`}
                  highlight={calc.monthlyCF >= 0 ? "green" : "red"}
                />
              )}
              {calc.cashOnCash !== null && (
                <MetricRow
                  label="Annual Cash-on-Cash Return"
                  value={`${calc.cashOnCash.toFixed(2)}%`}
                  highlight={calc.cashOnCash >= 8 ? "green" : calc.cashOnCash >= 4 ? "amber" : "red"}
                />
              )}
              {calc.capRate !== null && (
                <MetricRow
                  label="Cap Rate (45% expense ratio)"
                  value={`${calc.capRate.toFixed(2)}%`}
                  highlight={calc.capRate >= 6 ? "green" : calc.capRate >= 4 ? "amber" : "red"}
                />
              )}
              {calc.onePct !== null && (
                <MetricRow
                  label="1% Rule"
                  value={`${calc.onePct.toFixed(3)}% — ${calc.onePct >= 1 ? "PASS ✓" : "FAIL ✗"}`}
                  highlight={calc.onePct >= 1 ? "green" : "red"}
                  last
                />
              )}
            </div>
          )}

          {/* Scenarios toggle */}
          {calc && (
            <>
              <button
                onClick={() => setShowScenarios((s) => !s)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--accent)",
                  background: "none",
                  border: "1px solid rgba(91,91,214,0.3)",
                  borderRadius: 5,
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginBottom: showScenarios ? 12 : 16,
                }}
              >
                {showScenarios ? "Hide" : "Show"} Scenarios
              </button>

              {showScenarios && (
                <div style={{ overflowX: "auto", marginBottom: 16 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 8,
                      minWidth: 440,
                    }}
                  >
                    {scenarios.map((s) => {
                      const sDown = s.price * (downPct / 100);
                      const sLoan = s.price - sDown;
                      const sPI = calcMortgage(sLoan, s.rate, term);
                      const sTax = (s.price * 0.0125) / 12;
                      const sIns = (s.price * 0.005) / 12;
                      const sTotal = sPI + sTax + sIns + hoa;
                      const sCF = monthlyRent !== null ? monthlyRent - sTotal : null;
                      const sClose = s.price * (closingCostPct / 100);
                      const sCashIn = sDown + sClose;
                      const sAnnualCF = sCF !== null ? sCF * 12 : null;
                      const sCoC =
                        sAnnualCF !== null && sCashIn > 0
                          ? (sAnnualCF / sCashIn) * 100
                          : null;
                      const isActive = Math.abs(s.rate - rate) < 0.001 && Math.abs(s.price - price) < 1;
                      return (
                        <div
                          key={s.label}
                          style={{
                            background: isActive
                              ? "rgba(91,91,214,0.06)"
                              : "var(--bg-elevated)",
                            border: `1px solid ${isActive ? "rgba(91,91,214,0.3)" : "var(--border-subtle)"}`,
                            borderRadius: 8,
                            padding: "12px 14px",
                          }}
                        >
                          <p
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              color: isActive ? "var(--accent)" : "var(--text-muted)",
                              marginBottom: 8,
                            }}
                          >
                            {s.label}
                          </p>
                          <p
                            className="font-mono"
                            style={{
                              fontSize: 18,
                              fontWeight: 600,
                              color:
                                sCF === null
                                  ? "var(--text-muted)"
                                  : sCF >= 0
                                  ? "var(--score-green)"
                                  : "var(--score-red)",
                              marginBottom: 4,
                            }}
                          >
                            {sCF !== null
                              ? `${sCF >= 0 ? "+" : ""}${usd.format(sCF)}/mo`
                              : "—"}
                          </p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            P&I: {usd.format(sPI)}/mo
                          </p>
                          {sCoC !== null && (
                            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              CoC: {sCoC.toFixed(1)}%
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Offer Price Simulator ──────────────────────────────────────── */}
          <div
            style={{
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 12,
            }}
          >
            <button
              onClick={() => setOfferSimOpen((o) => !o)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-secondary)",
                background: "none",
                border: "1px solid var(--border-subtle)",
                borderRadius: 5,
                padding: "4px 10px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {offerSimOpen ? "Hide" : "Simulate offer price"}
            </button>

            {offerSimOpen && (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    Offer Price
                  </label>
                  <div style={{ position: "relative", width: 160 }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 12,
                        color: "var(--text-muted)",
                        pointerEvents: "none",
                      }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(parseFloat(e.target.value) || 0)}
                      style={{ ...inputStyle, paddingLeft: 18 }}
                    />
                  </div>
                  {offerCalc?.discountDollar !== null &&
                    offerCalc?.discountDollar !== undefined &&
                    offerCalc.discountDollar !== 0 && (
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color:
                            offerCalc.discountDollar > 0
                              ? "var(--score-green)"
                              : "var(--score-red)",
                        }}
                      >
                        {offerCalc.discountDollar > 0
                          ? `−${usd.format(offerCalc.discountDollar)}`
                          : `+${usd.format(-offerCalc.discountDollar)}`}
                        {offerCalc.discountPct !== null &&
                          ` (${Math.abs(offerCalc.discountPct).toFixed(1)}% ${offerCalc.discountDollar > 0 ? "below" : "above"} list)`}
                      </span>
                    )}
                </div>

                {offerCalc && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 8,
                    }}
                  >
                    {[
                      {
                        label: "Cap Rate",
                        value:
                          offerCalc.capRate !== null
                            ? `${offerCalc.capRate.toFixed(2)}%`
                            : "—",
                        highlight:
                          offerCalc.capRate !== null
                            ? offerCalc.capRate >= 6
                              ? ("green" as const)
                              : offerCalc.capRate >= 4
                              ? ("amber" as const)
                              : ("red" as const)
                            : undefined,
                      },
                      {
                        label: "Monthly Cash Flow",
                        value:
                          offerCalc.monthlyCF !== null
                            ? `${offerCalc.monthlyCF >= 0 ? "+" : ""}${usd.format(offerCalc.monthlyCF)}/mo`
                            : "—",
                        highlight:
                          offerCalc.monthlyCF !== null
                            ? offerCalc.monthlyCF >= 0
                              ? ("green" as const)
                              : ("red" as const)
                            : undefined,
                      },
                      {
                        label: "Cash-on-Cash",
                        value:
                          offerCalc.cashOnCash !== null
                            ? `${offerCalc.cashOnCash.toFixed(2)}%`
                            : "—",
                        highlight:
                          offerCalc.cashOnCash !== null
                            ? offerCalc.cashOnCash >= 8
                              ? ("green" as const)
                              : offerCalc.cashOnCash >= 4
                              ? ("amber" as const)
                              : ("red" as const)
                            : undefined,
                      },
                      {
                        label: "1% Rule",
                        value:
                          offerCalc.onePct !== null
                            ? `${offerCalc.onePct.toFixed(3)}% — ${offerCalc.onePct >= 1 ? "PASS ✓" : "FAIL ✗"}`
                            : "—",
                        highlight:
                          offerCalc.onePct !== null
                            ? offerCalc.onePct >= 1
                              ? ("green" as const)
                              : ("red" as const)
                            : undefined,
                      },
                    ].map(({ label, value, highlight }) => (
                      <div
                        key={label}
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: 7,
                          padding: "10px 14px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "var(--text-muted)",
                            marginBottom: 4,
                          }}
                        >
                          {label}
                        </p>
                        <p
                          className="font-mono"
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color:
                              highlight === "green"
                                ? "var(--score-green)"
                                : highlight === "red"
                                ? "var(--score-red)"
                                : highlight === "amber"
                                ? "var(--score-amber)"
                                : "var(--text-primary)",
                          }}
                        >
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
