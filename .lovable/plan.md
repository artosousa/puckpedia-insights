

## What's wrong

**1. AI Scouting Report disappears**
The generated report is held in local React state (`useState` in `PlayerProfile.tsx`). The moment you navigate away or refresh, it's gone. The DB tracks that a report was generated (`ai_reports` table) but never stores the report text itself.

**2. "Keep AI Scouting Report saved..." appearing during video analysis**
That's almost certainly the toast/error text bubbling up — but the underlying failure is what edge function logs show:
```
Memory limit exceeded
CPU Time exceeded
WORKER_RESOURCE_LIMIT
```
Cause: `analyze-player-media` downloads the full video file, base64-encodes the entire buffer in memory (≈1.4× size bloat), then sends it inside a JSON body — twice (once for analysis, once for ratings). Any video more than a few MB blows the 256 MB Edge Function worker.

## The fix

### A. Persist AI Scouting Reports
- Add a `report_text` column (and `model`, regenerate-able) to `ai_reports` table, keyed by `(user_id, player_id)` with the latest row winning.
- Save the report text in `generate-scouting-report` after generation.
- On `PlayerProfile` mount, fetch the latest stored report for that player and hydrate `report` state. It then survives refresh/nav and stays until the next regenerate replaces it.
- Add an `updated_at` and small "Generated <date>" line under the report header.

### B. Make video analysis actually work
Switch the strategy: stop sending raw video bytes through the worker.

1. **Photos** — keep current base64 path (small, works fine).
2. **Videos** — instead of downloading + base64ing, generate a **short-lived signed URL** from the storage bucket and pass `image_url: { url: signedUrl }` directly to Gemini. Gemini fetches it itself. Worker memory stays flat regardless of file size.
   - If Gemini rejects video URLs in this format, fall back to: extract a single representative frame on the **client** (canvas snapshot at the playhead / first keyframe) before upload-for-analyze, and send only that JPEG. This is fast, tiny, and aligns with the cropped keyframe the user already set.
3. Add a hard guard: if `media.size_bytes > 25 MB` and the URL path fails, return a clear error ("Video too large for AI — trim it shorter or analyze a still frame") instead of OOMing.
4. Collapse the **two AI calls into one** — request the written analysis AND the structured ratings in a single call using tool-calling with `tool_choice: "auto"` so the model returns both. Halves cost and memory pressure.

### C. Toast clarity
Replace the generic catch-all toast with the actual server error message so users see "Video too large…" or "AI rate-limited…" instead of an unrelated string.

## Files touched
- `supabase/migrations/<new>.sql` — add `report_text text`, `model text`, `updated_at timestamptz` to `ai_reports`; add an INSERT/UPDATE RLS policy scoped to own user_id (currently the table has no insert policy for clients, but the edge function uses service role so that's fine — only need SELECT, which already exists).
- `supabase/functions/generate-scouting-report/index.ts` — upsert latest report into `ai_reports` (one row per player, replace on regenerate) instead of just inserting a counter row.
- `supabase/functions/analyze-player-media/index.ts` — signed-URL path for videos, single combined AI call, size guard, better error messages.
- `src/pages/PlayerProfile.tsx` — load saved report on mount; show generated-at timestamp; surface real error in toast.
- `src/components/PlayerMediaPanel.tsx` (or wherever "Analyze with AI" is triggered) — better error surfacing; for very large videos, suggest the keyframe-snapshot path.

## Open question
Monthly limit accounting: today every regenerate inserts a new `ai_reports` row, counting against the monthly cap. If we move to one-row-per-player (replace on regenerate), the count behavior changes. I'll keep counting **regenerations** (insert a separate counter or bump a counter column) so users can't bypass the cap by repeatedly regenerating the same player. Default plan: keep the existing rows as the usage counter, and store the latest `report_text` in the most recent row only — older rows stay as audit trail with `report_text = null`.

