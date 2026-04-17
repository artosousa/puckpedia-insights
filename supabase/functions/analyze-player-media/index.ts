import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Format your response in EXACTLY three sections using these headings on their own lines:

Observations
- 3–6 short bullets describing what you see (strengths and neutral observations FOR THIS LEVEL).

Areas to Improve
- 3–5 short, actionable bullets identifying specific weaknesses or things the player should work on, based on what is visible AND appropriate for their level/background. If the media is too limited to assess a weakness, say "Limited visibility — cannot assess" as one of the bullets.

Recommended Resources
- For EACH "Areas to Improve" bullet above, provide one matching resource on its own line in this exact format:
  - <Area>: <Drill or technique name> — <one-sentence description>. Search: "<YouTube search query>"
- Pick drills appropriate for the player's level (e.g., a beer-league adult shouldn't be told to do pro-level edge work).
- Keep each resource line under 220 characters.

No preamble. Use only the three headings above. Bullets start with "- ".`;
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
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // User-scoped client to verify auth
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { media_id } = await req.json();
    if (!media_id || typeof media_id !== "string") {
      return new Response(JSON.stringify({ error: "media_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for storage download
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: media, error: mediaErr } = await admin
      .from("player_media")
      .select("*")
      .eq("id", media_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (mediaErr || !media) {
      return new Response(JSON.stringify({ error: "Media not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: fileBlob, error: dlErr } = await admin.storage
      .from("player-media")
      .download(media.storage_path);
    if (dlErr || !fileBlob) throw new Error("Could not download media file");

    const buf = new Uint8Array(await fileBlob.arrayBuffer());
    // base64 encode
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + CHUNK)) as any);
    }
    const b64 = btoa(binary);
    const mime = media.mime_type || (media.kind === "photo" ? "image/jpeg" : "video/mp4");
    const dataUrl = `data:${mime};base64,${b64}`;

    const userText = `Scouting context — tags: ${(media.tags ?? []).join(", ") || "none"}.${
      media.notes ? ` Notes: ${media.notes}` : ""
    } Analyze this ${media.kind}.`;

    const ratingTool = {
      type: "function",
      function: {
        name: "rate_player",
        description: "Rate the player on the six core scouting metrics on a 1-10 scale based ONLY on what is visible in the media. Use null for any metric not assessable from the clip.",
        parameters: {
          type: "object",
          properties: {
            skating: { type: ["integer", "null"], minimum: 1, maximum: 10 },
            shot: { type: ["integer", "null"], minimum: 1, maximum: 10 },
            hands: { type: ["integer", "null"], minimum: 1, maximum: 10 },
            iq: { type: ["integer", "null"], minimum: 1, maximum: 10 },
            compete: { type: ["integer", "null"], minimum: 1, maximum: 10 },
            physicality: { type: ["integer", "null"], minimum: 1, maximum: 10 },
            confidence: { type: "string", enum: ["low", "medium", "high"], description: "Overall confidence in these ratings given clip quality/length." },
          },
          required: ["skating", "shot", "hands", "iq", "compete", "physicality", "confidence"],
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
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached, try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      throw new Error("AI gateway error");
    }

    const aiJson = await aiResp.json();
    const analysisText = aiJson?.choices?.[0]?.message?.content ?? "";

    // Second call: structured ratings via tool calling
    let ratings: Record<string, unknown> | null = null;
    try {
      const ratingResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content:
                "You are a hockey scout. Rate the player on Skating, Shot, Hands, IQ, Compete, and Physicality on a 1-10 scale (10 = NHL-ready) based ONLY on what is visible in the media. Use null for any metric you cannot assess from this clip. Be honest and conservative — short clips rarely justify high confidence.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: `Context — tags: ${(media.tags ?? []).join(", ") || "none"}.${media.notes ? ` Notes: ${media.notes}` : ""} Your prior written analysis:\n\n${analysisText}` },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          tools: [ratingTool],
          tool_choice: { type: "function", function: { name: "rate_player" } },
        }),
      });

      if (ratingResp.ok) {
        const ratingJson = await ratingResp.json();
        const call = ratingJson?.choices?.[0]?.message?.tool_calls?.[0];
        if (call?.function?.arguments) {
          ratings = JSON.parse(call.function.arguments);
        }
      } else {
        console.error("rating call non-ok", ratingResp.status, await ratingResp.text());
      }
    } catch (e) {
      console.error("rating call failed", e);
    }

    // Persist as a single text blob: ratings JSON block + written analysis
    const combined = ratings
      ? `<<RATINGS>>${JSON.stringify(ratings)}<<END>>\n${analysisText}`
      : analysisText;

    await admin
      .from("player_media")
      .update({ ai_analysis: combined, ai_analyzed_at: new Date().toISOString() })
      .eq("id", media_id);

    return new Response(JSON.stringify({ analysis: combined, ratings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-player-media error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
