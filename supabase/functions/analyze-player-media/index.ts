import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VIDEO_MAX_BYTES_FOR_INLINE = 25 * 1024 * 1024; // 25 MB hard guard for fallback path

function buildSystemPrompt(level: string | null, playerContext: string | null) {
  const levelLine = level
    ? `COMPETITION LEVEL: ${level}. Calibrate everything (ratings, language, expectations) to peers AT THIS LEVEL. A "7" means above average for this level — NOT NHL-relative. Do not project to higher levels unless explicitly asked.`
    : `COMPETITION LEVEL: not specified. Note in your analysis that calibration is generic and ratings should be interpreted loosely.`;
  const ctxLine = playerContext
    ? `PLAYER BACKGROUND: ${playerContext}. Factor this in (age, hockey age, frequency of play) when assessing strengths/weaknesses and recommending drills appropriate for this player.`
    : "";
  return `You are an expert hockey scout and skills coach analyzing visual media of a player.

${levelLine}
${ctxLine}

Look at the photo or video frames and provide a concise scouting analysis focused on:
- Skating mechanics (stride, edges, balance, posture)
- Stick & puck handling (hand position, blade angle, body posture)
- Body positioning, balance, and physical engagement
- Any tactical observations visible (positioning, awareness, angle of attack)

Be specific about what you actually see. If the image quality or angle limits what you can assess, say so.

You MUST respond by calling the analyze_clip function with BOTH a written analysis AND structured ratings.

The written analysis must use EXACTLY these three sections, headings on their own lines:

Observations
- 3–6 short bullets describing what you see (strengths and neutral observations FOR THIS LEVEL).

Areas to Improve
- 3–5 short, actionable bullets identifying specific weaknesses or things the player should work on, based on what is visible AND appropriate for their level/background. If the media is too limited to assess a weakness, say "Limited visibility — cannot assess" as one of the bullets.

Recommended Resources
- For EACH "Areas to Improve" bullet above, provide one matching resource on its own line in this exact format:
  - <Area>: <Drill or technique name> — <one-sentence description>. Search: "<YouTube search query>"
- Pick drills appropriate for the player's level.
- Keep each resource line under 220 characters.

Bullets start with "- ". No preamble. Use only the three headings above.`;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Invalid auth" }, 401);
    }
    const userId = userData.user.id;

    const { media_id } = await req.json();
    if (!media_id || typeof media_id !== "string") {
      return jsonResponse({ error: "media_id required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: media, error: mediaErr } = await admin
      .from("player_media")
      .select("*")
      .eq("id", media_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (mediaErr || !media) {
      return jsonResponse({ error: "Media not found" }, 404);
    }

    // Fetch player + league context
    let level: string | null = null;
    let playerContext: string | null = null;
    try {
      const { data: pl } = await admin
        .from("players")
        .select("player_context, team_id")
        .eq("id", media.player_id)
        .maybeSingle();
      playerContext = pl?.player_context ?? null;
      if (pl?.team_id) {
        const { data: tm } = await admin
          .from("teams")
          .select("league_id")
          .eq("id", pl.team_id)
          .maybeSingle();
        if (tm?.league_id) {
          const { data: lg } = await admin
            .from("leagues")
            .select("level")
            .eq("id", tm.league_id)
            .maybeSingle();
          level = lg?.level ?? null;
        }
      }
    } catch (e) {
      console.error("context fetch failed", e);
    }

    const SYSTEM_PROMPT = buildSystemPrompt(level, playerContext);
    const isVideo = media.kind === "video";
    const mime = media.mime_type || (isVideo ? "video/mp4" : "image/jpeg");

    // Build the image_url payload:
    // - Photos: small enough → base64 inline (works reliably)
    // - Videos: use a signed URL so Gemini fetches it directly (keeps worker memory flat)
    let imageUrlValue: string;
    if (isVideo) {
      const { data: signed, error: signErr } = await admin.storage
        .from("player-media")
        .createSignedUrl(media.storage_path, 60 * 10); // 10 min
      if (signErr || !signed?.signedUrl) {
        return jsonResponse({ error: "Could not create signed URL for video" }, 500);
      }
      // Size guard: if very large and provider can't fetch, this still keeps worker safe
      if (media.size_bytes && media.size_bytes > 100 * 1024 * 1024) {
        return jsonResponse({
          error: "Video too large for AI — trim it shorter or analyze a still frame.",
        }, 413);
      }
      imageUrlValue = signed.signedUrl;
    } else {
      // Photo: inline base64
      if (media.size_bytes && media.size_bytes > VIDEO_MAX_BYTES_FOR_INLINE) {
        return jsonResponse({
          error: "Photo too large for AI — please use an image under 25 MB.",
        }, 413);
      }
      const { data: fileBlob, error: dlErr } = await admin.storage
        .from("player-media")
        .download(media.storage_path);
      if (dlErr || !fileBlob) throw new Error("Could not download media file");
      const buf = new Uint8Array(await fileBlob.arrayBuffer());
      let binary = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < buf.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + CHUNK)) as any);
      }
      imageUrlValue = `data:${mime};base64,${btoa(binary)}`;
    }

    const contextHeader = [
      level ? `Level: ${level}` : null,
      playerContext ? `Player background: ${playerContext}` : null,
    ].filter(Boolean).join(" | ");

    const userText = `${contextHeader ? contextHeader + "\n" : ""}Tags: ${(media.tags ?? []).join(", ") || "none"}.${
      media.notes ? ` Notes: ${media.notes}` : ""
    } Analyze this ${media.kind}. Return BOTH the written analysis and structured ratings via the analyze_clip tool.`;

    const analyzeTool = {
      type: "function",
      function: {
        name: "analyze_clip",
        description:
          "Return the written scouting analysis (with the 3 required sections) AND structured 1-10 ratings on the 6 core metrics. Use null for any metric not assessable from this clip.",
        parameters: {
          type: "object",
          properties: {
            analysis: {
              type: "string",
              description:
                "The full written analysis using exactly the three sections: Observations, Areas to Improve, Recommended Resources. Bullets start with '- '.",
            },
            ratings: {
              type: "object",
              properties: {
                skating: { type: ["integer", "null"], minimum: 1, maximum: 10 },
                shot: { type: ["integer", "null"], minimum: 1, maximum: 10 },
                hands: { type: ["integer", "null"], minimum: 1, maximum: 10 },
                iq: { type: ["integer", "null"], minimum: 1, maximum: 10 },
                compete: { type: ["integer", "null"], minimum: 1, maximum: 10 },
                physicality: { type: ["integer", "null"], minimum: 1, maximum: 10 },
                confidence: { type: "string", enum: ["low", "medium", "high"] },
              },
              required: ["skating", "shot", "hands", "iq", "compete", "physicality", "confidence"],
              additionalProperties: false,
            },
          },
          required: ["analysis", "ratings"],
          additionalProperties: false,
        },
      },
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageUrlValue } },
            ],
          },
        ],
        tools: [analyzeTool],
        tool_choice: { type: "function", function: { name: "analyze_clip" } },
      }),
    });

    if (aiResp.status === 429) {
      return jsonResponse({ error: "AI rate limit reached. Please wait a moment and try again." }, 429);
    }
    if (aiResp.status === 402) {
      return jsonResponse({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }, 402);
    }
    if (!aiResp.ok) {
      const t = await aiResp.text().catch(() => "");
      console.error("AI gateway error", aiResp.status, t);
      return jsonResponse({
        error: `AI analysis failed (${aiResp.status})${t ? `: ${t.slice(0, 180)}` : ""}`,
      }, 500);
    }

    const aiJson = await aiResp.json();
    const call = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let analysisText = "";
    let ratings: Record<string, unknown> | null = null;

    if (call?.function?.arguments) {
      try {
        const parsed = JSON.parse(call.function.arguments);
        analysisText = typeof parsed.analysis === "string" ? parsed.analysis : "";
        ratings = parsed.ratings ?? null;
      } catch (e) {
        console.error("Failed to parse tool call arguments", e);
      }
    }

    // Fallback: if model returned plain content
    if (!analysisText) {
      analysisText = aiJson?.choices?.[0]?.message?.content ?? "";
    }

    if (!analysisText) {
      return jsonResponse({ error: "AI returned an empty analysis. Try again." }, 500);
    }

    const combined = ratings
      ? `<<RATINGS>>${JSON.stringify(ratings)}<<END>>\n${analysisText}`
      : analysisText;

    await admin
      .from("player_media")
      .update({ ai_analysis: combined, ai_analyzed_at: new Date().toISOString() })
      .eq("id", media_id);

    return jsonResponse({ analysis: combined, ratings });
  } catch (e) {
    console.error("analyze-player-media error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
