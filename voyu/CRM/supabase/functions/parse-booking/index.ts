// Voyu CRM — Edge Function: parse-booking
// Reads a booking/confirmation screenshot with Claude (vision) and returns
// structured booking fields. Called from the "Importar de screenshot (IA)" button.
//
// Deploy:
//   supabase functions deploy parse-booking --project-ref sinyinnovnhfmtritdyb
// Secret needed:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref sinyinnovnhfmtritdyb
//
// Model: claude-opus-4-8 (most capable). To cut cost, change MODEL to
// "claude-haiku-4-5" — cheaper and still vision-capable, slightly less accurate.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";

const MODEL = "claude-opus-4-8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    client: { type: "string", description: "Lead passenger / client full name" },
    passengers: { type: "array", items: { type: "string" }, description: "All passenger names" },
    route: { type: "string", description: "e.g. GRU-LIS-GRU or São Paulo → Lisbon" },
    service: { type: "string", enum: ["Air", "Hotel", "Rental", "Seat", "Seguro", "Transfer", "Outro"] },
    travel: { type: "string", description: "Departure/check-in date as DD/MM/AAAA" },
    return: { type: "string", description: "Return/check-out date as DD/MM/AAAA, empty if none" },
    pax: { type: "string", description: "Number of passengers as a string" },
    gross: { type: "number", description: "Total price paid by the client, 0 if unknown" },
    net: { type: "number", description: "Net/supplier cost if shown, else 0" },
    supplier: { type: "string", description: "Airline / hotel / supplier name" },
    pnr: { type: "string", description: "PNR / booking reference / confirmation code" },
    notes: { type: "string", description: "Anything else useful (fare class, baggage, times)" },
  },
  required: ["client", "passengers", "route", "service", "travel", "return", "pax", "gross", "net", "supplier", "pnr", "notes"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!KEY) return json({ error: "ANTHROPIC_API_KEY não configurada na função." }, 500);

  // Require a logged-in user with a write role.
  const authHeader = req.headers.get("Authorization") ?? "";
  const caller = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: "Não autenticado." }, 401);
  const { data: prof } = await caller.from("profiles").select("role").eq("id", user.id).single();
  if (!prof || !["admin", "agente", "financeiro"].includes(prof.role))
    return json({ error: "Sem permissão." }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido." }, 400); }
  const image = body.image;
  const media_type = body.media_type || "image/png";
  if (!image) return json({ error: "Imagem ausente." }, 400);

  const client = new Anthropic({ apiKey: KEY });
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type, data: image } },
          { type: "text", text: "This is a screenshot of a travel booking/confirmation (flight, hotel, car, etc.), often in Portuguese or English. Extract the booking details into the required JSON. Use DD/MM/AAAA for dates. If a value is not visible, use an empty string (or 0 for numbers). Do not invent prices — leave gross/net as 0 if not clearly shown." },
        ],
      }],
    } as any);
    const text = (msg.content.find((b: any) => b.type === "text") as any)?.text ?? "{}";
    return json(JSON.parse(text));
  } catch (e) {
    return json({ error: (e as Error).message ?? String(e) }, 502);
  }
});
