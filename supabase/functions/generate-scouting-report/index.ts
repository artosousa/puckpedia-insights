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

    const { player, team, league, level, viewings } = body;
    const playerLine = `${player.first_name} ${player.last_name}` +
      (player.position ? ` · ${player.position}` : "") +
      (player.shoots ? ` · Shoots ${player.shoots}` : "") +
      (player.jersey_number ? ` · #${player.jersey_number}` : "") +
      (player.height_cm ? ` · ${player.height_cm}cm` : "") +
      (player.weight_kg ? ` · ${player.weight_kg}kg` : "") +
      (player.date_of_birth ? ` · DOB ${player.date_of_birth}` : "");

    const orgLine = [team, league, level].filter(Boolean).join(" · ") || "Unaffiliated";

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

    // Pull AI video analyses for this player to ground the report in actual film evidence
    let mediaBlock = "(no AI video analyses available)";
    if (body.player_id) {
      const { data: media } = await admin
        .from("player_media")
        .select("kind, tags, ai_analysis, ai_analyzed_at, created_at, notes")
        .eq("player_id", body.player_id)
        .eq("user_id", user.id)
        .not("ai_analysis", "is", null)
        .order("ai_analyzed_at", { ascending: false })
        .limit(10);
      if (media && media.length) {
        mediaBlock = media.map((m, i) => {
          // Strip the <<RATINGS>>...<<END>> prefix if present, keep the prose
          const raw = (m.ai_analysis ?? "").replace(/^<<RATINGS>>.*?<<END>>\n?/s, "").trim();
          const tagLine = m.tags?.length ? ` [${m.tags.join(", ")}]` : "";
          const captionLine = m.notes ? `\n   Caption: ${m.notes}` : "";
          return `Clip ${i + 1} (${m.kind})${tagLine}${captionLine}\n${raw}`;
        }).join("\n\n---\n\n");
      }
    }

    const calibrationBlock = level
      ? `COMPETITION LEVEL: ${level}. All ratings, language, and projections MUST be calibrated to this level. A "7" here means above average AT THIS LEVEL, not NHL-relative. Don't suggest unrealistic pro-track projections for recreational/adult-league players.`
      : `COMPETITION LEVEL: not specified. Treat ratings as generic and note this caveat in the Summary.`;
    const playerBgBlock = player.player_context
      ? `PLAYER BACKGROUND: ${player.player_context}. Factor age, hockey age, and frequency of play into recommendations and tone.`
      : "";

    const systemPrompt = `You are a veteran hockey scout writing a full scouting report. Be specific, evidence-based, and reference BOTH the in-person viewing notes AND the AI film breakdowns. When film evidence and live ratings disagree, surface the tension. Avoid generic platitudes. Write in clean markdown. Keep total length under 700 words.

${calibrationBlock}
${playerBgBlock}

Use this exact structure:
## Summary
1–2 sentence overview of the player AT THEIR LEVEL, synthesizing live viewings + film.

## Skating
## Shot
## Hands
## Hockey IQ
## Compete & Physicality
For each tool: cite avg rating, the trend across viewings, what the live notes reveal, AND what the film breakdowns specifically observed. Quote brief film evidence where relevant. Frame everything relative to the player's level.

## Strengths
## Areas to Develop
Bullet list, 3–5 items each. Pull from BOTH viewing notes and film analysis. Recommendations should be appropriate for the player's level and background.

## Projection
Based on viewings + film + ratings + LEVEL. For recreational players, frame as "next-level rec/beer-league development" rather than pro-track.

## Recommendation
Watch list tier suggestion (Tier 1 / 2 / 3 / Pass) with a one-sentence rationale.`;

    const userPrompt = `PLAYER: ${playerLine}\nTEAM: ${orgLine}\nVIEWINGS LOGGED: ${viewings.length}\n\n=== VIEWING LOG ===\n${viewingLines}\n\n=== AI FILM BREAKDOWNS ===\n${mediaBlock}`;

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

    const playerIdForRow = body.player_id ?? "00000000-0000-0000-0000-000000000000";
    const nowIso = new Date().toISOString();

    // Clear previous latest report text for this player (audit rows stay as usage counters)
    await admin
      .from("ai_reports")
      .update({ report_text: null })
      .eq("user_id", user.id)
      .eq("player_id", playerIdForRow)
      .not("report_text", "is", null);

    // Insert the new "latest" row carrying the report text (also counts as 1 usage tick)
    await admin.from("ai_reports").insert({
      user_id: user.id,
      player_id: playerIdForRow,
      report_text: report,
      model: "google/gemini-2.5-flash",
      updated_at: nowIso,
    });

    return respond({
      ok: true,
      report,
      generated_at: nowIso,
      used: used + 1,
      limit: isFinite(limit) ? limit : null,
    });
  } catch (e) {
    console.error("generate-scouting-report error", e);
    return respond({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
  }
});
