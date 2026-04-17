import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Viewing {
  game_date: string;
  opponent?: string | null;
  location?: string | null;
  rating_skating?: number | null;
  rating_shot?: number | null;
  rating_hands?: number | null;
  rating_iq?: number | null;
  rating_compete?: number | null;
  rating_physicality?: number | null;
  rating_overall?: number | null;
  projection?: string | null;
  notes?: string | null;
}

interface Payload {
  player_id?: string;
  player: {
    first_name: string;
    last_name: string;
    position?: string | null;
    shoots?: string | null;
    jersey_number?: number | null;
    date_of_birth?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    player_context?: string | null;
  };
  team?: string | null;
  league?: string | null;
  level?: string | null;
  viewings: Viewing[];
}

// Mirror of src/lib/tiers.ts (kept in sync for server-side enforcement)
const TIER_LIMITS: Record<string, number> = {
  peewee: 0,
  junior: 0,
  minor: 10,
  pro: Number.POSITIVE_INFINITY,
};

function respond(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return respond({ ok: false, error: "LOVABLE_API_KEY not configured" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return respond({ ok: false, error: "Unauthorized" });
    }
    const user = userData.user;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const rawBody = await req.json();
    const env = ((rawBody?.environment as string) || "sandbox") as "sandbox" | "live";

    const { data: sub } = await admin
      .from("subscriptions")
      .select("product_id,status,current_period_end")
      .eq("user_id", user.id)
      .eq("environment", env)
      .maybeSingle();

    const isActive = !!sub && (sub.status === "active" || sub.status === "trialing") &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
    const tierId = isActive && sub?.product_id ? sub.product_id : "peewee";
    const limit = TIER_LIMITS[tierId] ?? 0;

    if (limit <= 0) {
      return respond({
        ok: false,
        error: "AI scouting reports require the Minor or Pro plan.",
        code: "tier_required",
      });
    }

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { count } = await admin
      .from("ai_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", monthStart);

    const used = count ?? 0;
    if (isFinite(limit) && used >= limit) {
      return respond({
        ok: false,
        error: `Monthly AI report limit reached (${used}/${limit}). Upgrade for more.`,
        code: "limit_reached",
        used, limit,
      });
    }

    const body = rawBody as Payload;
    if (!body?.player || !Array.isArray(body.viewings)) {
      return respond({ ok: false, error: "Invalid payload" });
    }

    const { player, team, league, viewings } = body;
    const playerLine = `${player.first_name} ${player.last_name}` +
      (player.position ? ` · ${player.position}` : "") +
      (player.shoots ? ` · Shoots ${player.shoots}` : "") +
      (player.jersey_number ? ` · #${player.jersey_number}` : "") +
      (player.height_cm ? ` · ${player.height_cm}cm` : "") +
      (player.weight_kg ? ` · ${player.weight_kg}kg` : "") +
      (player.date_of_birth ? ` · DOB ${player.date_of_birth}` : "");

    const orgLine = [team, league].filter(Boolean).join(" · ") || "Unaffiliated";

    const viewingLines = viewings.length
      ? viewings.map((v, i) => {
          const ratings = [
            ["SKT", v.rating_skating], ["SHT", v.rating_shot], ["HND", v.rating_hands],
            ["IQ", v.rating_iq], ["CMP", v.rating_compete], ["PHY", v.rating_physicality],
            ["OVR", v.rating_overall],
          ].filter(([, n]) => n != null).map(([k, n]) => `${k} ${n}`).join(" / ");
          return `${i + 1}. ${v.game_date}${v.opponent ? ` vs ${v.opponent}` : ""}${v.location ? ` @ ${v.location}` : ""}\n   Ratings: ${ratings || "n/a"}\n   Projection: ${v.projection ?? "—"}\n   Notes: ${v.notes ?? "—"}`;
        }).join("\n\n")
      : "(no viewings logged)";

    const systemPrompt = `You are a veteran amateur/junior hockey scout writing a full scouting report. Be specific, evidence-based, and reference the actual viewing notes and rating trends. Avoid generic platitudes. Write in clean markdown. Keep total length under 600 words.

Use this exact structure:
## Summary
1–2 sentence overview of the player.

## Skating
## Shot
## Hands
## Hockey IQ
## Compete & Physicality
For each tool: cite avg rating, the trend across viewings, and what the notes reveal.

## Strengths
## Areas to Develop
Bullet list, 3–5 items each.

## Projection
Based on the projection field consensus + ratings.

## Recommendation
Watch list tier suggestion (Tier 1 / 2 / 3 / Pass) with a one-sentence rationale.`;

    const userPrompt = `PLAYER: ${playerLine}\nTEAM: ${orgLine}\nVIEWINGS LOGGED: ${viewings.length}\n\n=== VIEWING LOG ===\n${viewingLines}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text().catch(() => "");
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) {
        return respond({ ok: false, error: "AI rate limit reached. Please wait a moment and try again.", code: "rate_limit" });
      }
      if (aiResp.status === 402) {
        return respond({ ok: false, error: "AI credits exhausted. Add credits in Settings → Workspace → Usage.", code: "no_credits" });
      }
      return respond({ ok: false, error: `AI gateway error (${aiResp.status}): ${t.slice(0, 200) || "no body"}` });
    }

    const data = await aiResp.json();
    const report = data?.choices?.[0]?.message?.content ?? "";
    if (!report) {
      return respond({ ok: false, error: "AI returned an empty report. Try again." });
    }

    if (body.player_id) {
      await admin.from("ai_reports").insert({ user_id: user.id, player_id: body.player_id });
    } else {
      await admin.from("ai_reports").insert({ user_id: user.id, player_id: "00000000-0000-0000-0000-000000000000" });
    }

    return respond({
      ok: true,
      report,
      used: used + 1,
      limit: isFinite(limit) ? limit : null,
    });
  } catch (e) {
    console.error("generate-scouting-report error", e);
    return respond({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
  }
});
