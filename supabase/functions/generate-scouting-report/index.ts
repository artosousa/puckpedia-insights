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
  player: {
    first_name: string;
    last_name: string;
    position?: string | null;
    shoots?: string | null;
    jersey_number?: number | null;
    date_of_birth?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
  };
  team?: string | null;
  league?: string | null;
  viewings: Viewing[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as Payload;
    if (!body?.player || !Array.isArray(body.viewings)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const report = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-scouting-report error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
