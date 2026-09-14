import type { Context, Config } from "@netlify/functions";

// Browsers call this from the GitHub Pages site, so cross-origin access is
// allowed for the MedPilot domain only.
const ALLOWED_ORIGINS = ["https://medpilot.org.uk", "https://www.medpilot.org.uk"];

export default async (req: Request, context: Context) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
  const reply = (status: number, body: object) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply(405, { ok: false, error: "Method not allowed" });
  if (!ALLOWED_ORIGINS.includes(origin)) return reply(403, { ok: false, error: "Forbidden" });

  let data: { email?: string; name?: string; website?: string };
  try {
    data = await req.json();
  } catch {
    return reply(400, { ok: false, error: "Invalid request" });
  }

  // Honeypot field: real visitors never fill it in, bots usually do.
  if (data.website) return reply(200, { ok: true });

  const email = String(data.email ?? "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return reply(400, { ok: false, error: "Please enter a valid email address." });
  }
  const name = String(data.name ?? "").trim().slice(0, 100);

  const apiKey = Netlify.env.get("BREVO_API_KEY");
  const listId = Number(Netlify.env.get("BREVO_LIST_ID"));
  if (!apiKey || !listId) {
    console.error("BREVO_API_KEY or BREVO_LIST_ID is not set");
    return reply(500, { ok: false, error: "Subscriptions are temporarily unavailable." });
  }

  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      email,
      listIds: [listId],
      updateEnabled: true,
      ...(name ? { attributes: { FIRSTNAME: name } } : {}),
    }),
  });

  if (!res.ok) {
    console.error("Brevo error", res.status, await res.text());
    return reply(502, { ok: false, error: "Something went wrong. Please try again later." });
  }
  return reply(200, { ok: true });
};

export const config: Config = {
  path: "/subscribe",
};
