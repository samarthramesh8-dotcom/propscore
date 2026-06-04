export async function sendAlertEmail({
  to,
  searchName,
  location,
  results,
}: {
  to: string;
  searchName: string;
  location: string;
  results: Array<{
    property_id: string;
    address: string;
    overall_score: number;
    list_price: number;
    cap_rate: string;
    monthly_cash_flow: number;
    verdict: string;
  }>;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://propscore.vercel.app";

  const rows = results
    .map(
      (r) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #1E1E2E;font-size:13px;color:#F0F0FF;">
          ${r.address}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #1E1E2E;font-size:13px;
          color:${r.overall_score >= 75 ? "#00D26A" : r.overall_score >= 50 ? "#F5A623" : "#E8384F"};
          font-weight:700;text-align:center;">
          ${r.overall_score}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #1E1E2E;font-size:13px;
          color:#F0F0FF;text-align:right;">
          $${r.list_price.toLocaleString()}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #1E1E2E;font-size:13px;
          color:#F0F0FF;text-align:right;">
          ${r.cap_rate}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #1E1E2E;font-size:13px;
          color:${r.monthly_cash_flow >= 0 ? "#00D26A" : "#E8384F"};text-align:right;">
          ${r.monthly_cash_flow >= 0 ? "+" : ""}$${Math.abs(r.monthly_cash_flow).toLocaleString()}/mo
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #1E1E2E;">
          <a href="${appUrl}/property/${r.property_id}"
             style="color:#5B5BD6;font-size:12px;text-decoration:none;font-weight:600;">
            View →
          </a>
        </td>
      </tr>`
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="background:#0A0A0F;color:#F0F0FF;font-family:system-ui,sans-serif;
      margin:0;padding:0;">
      <div style="max-width:640px;margin:0 auto;padding:40px 24px;">
        <div style="margin-bottom:32px;">
          <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div style="width:28px;height:28px;border-radius:6px;background:#5B5BD6;
              display:flex;align-items:center;justify-content:center;">
              🏠
            </div>
            <span style="font-size:16px;font-weight:700;color:#F0F0FF;">PropScore</span>
          </div>
          <h1 style="font-size:22px;font-weight:800;color:#F0F0FF;margin:0 0 8px;
            letter-spacing:-0.025em;">
            ${results.length} new deal${results.length === 1 ? "" : "s"} in ${location}
          </h1>
          <p style="font-size:14px;color:#7A7A9A;margin:0;">
            Your saved search "${searchName}" found ${results.length}
            propert${results.length === 1 ? "y" : "ies"} scoring above your threshold.
          </p>
        </div>

        <table style="width:100%;border-collapse:collapse;
          background:#111118;border:1px solid #1E1E2E;border-radius:10px;
          overflow:hidden;margin-bottom:32px;">
          <thead>
            <tr style="border-bottom:1px solid #252535;">
              <th style="padding:10px 12px;font-size:10px;font-weight:600;
                letter-spacing:0.12em;text-transform:uppercase;color:#3D3D5C;
                text-align:left;">Address</th>
              <th style="padding:10px 12px;font-size:10px;font-weight:600;
                letter-spacing:0.12em;text-transform:uppercase;color:#3D3D5C;
                text-align:center;">Score</th>
              <th style="padding:10px 12px;font-size:10px;font-weight:600;
                letter-spacing:0.12em;text-transform:uppercase;color:#3D3D5C;
                text-align:right;">Price</th>
              <th style="padding:10px 12px;font-size:10px;font-weight:600;
                letter-spacing:0.12em;text-transform:uppercase;color:#3D3D5C;
                text-align:right;">Cap Rate</th>
              <th style="padding:10px 12px;font-size:10px;font-weight:600;
                letter-spacing:0.12em;text-transform:uppercase;color:#3D3D5C;
                text-align:right;">Cash Flow</th>
              <th style="padding:10px 12px;font-size:10px;font-weight:600;
                letter-spacing:0.12em;text-transform:uppercase;color:#3D3D5C;">
              </th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div style="text-align:center;margin-bottom:32px;">
          <a href="${appUrl}/find"
             style="display:inline-block;padding:12px 28px;background:#5B5BD6;
             color:#fff;font-size:14px;font-weight:700;text-decoration:none;
             border-radius:8px;letter-spacing:-0.01em;">
            View all results →
          </a>
        </div>

        <p style="font-size:11px;color:#3D3D5C;text-align:center;margin:0;">
          PropScore ·
          <a href="${appUrl}/alerts" style="color:#3D3D5C;">Manage alerts</a> ·
          <a href="${appUrl}/alerts" style="color:#3D3D5C;">Unsubscribe</a>
        </p>
      </div>
    </body>
    </html>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "PropScore <alerts@yourdomain.com>",
      to,
      subject: `${results.length} new deal${results.length === 1 ? "" : "s"} found in ${location} — PropScore`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }

  return res.json();
}
