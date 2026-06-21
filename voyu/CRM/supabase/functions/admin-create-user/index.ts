// Voyu CRM — Edge Function: admin-create-user
// Creates a new user (email + password) from inside the CRM. Invite-only:
// only a logged-in user whose profile role is "admin" can call this.
//
// Deploy:
//   supabase functions deploy admin-create-user --project-ref sinyinnovnhfmtritdyb
// Secrets needed: none extra — SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
// are injected automatically by Supabase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Who is calling? Verify their JWT and that they are an admin.
  const authHeader = req.headers.get("Authorization") ?? "";
  const caller = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: uErr } = await caller.auth.getUser();
  if (uErr || !user) return json({ error: "Não autenticado." }, 401);

  const { data: prof } = await caller
    .from("profiles").select("role").eq("id", user.id).single();
  if (!prof || prof.role !== "admin")
    return json({ error: "Apenas administradores podem criar usuários." }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido." }, 400); }
  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  const full_name = (body.full_name ?? "").trim();
  const role = body.role ?? "viewer";
  const allowed = ["admin", "agente", "financeiro", "viewer", "pending"];
  if (!email || password.length < 6) return json({ error: "E-mail e senha (mín. 6) obrigatórios." }, 400);
  if (!allowed.includes(role)) return json({ error: "Papel inválido." }, 400);

  // Service-role client: create the user with the password already confirmed.
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name },
  });
  if (cErr || !created.user) return json({ error: cErr?.message ?? "Falha ao criar usuário." }, 400);

  // Set the profile role + name (a DB trigger likely created the profile row already).
  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: created.user.id, email, full_name, role }, { onConflict: "id" });
  if (pErr) return json({ error: "Usuário criado, mas falhou ao definir papel: " + pErr.message }, 200);

  return json({ ok: true, id: created.user.id, email, role });
});
