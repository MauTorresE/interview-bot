-- Wave 1.7: Store the agent's closing summary and reason on each interview.
--
-- Tier 0 introduces a modal closing flow where the agent produces a
-- personalized summary that the user sees (both audibly via TTS and visually
-- in the finalize modal). Persisting that summary lets us:
--   1. Show it again if the user revisits the invite link (Wave 2.4 "already
--      completed" state uses this to render an <AlreadyCompletedCard> with
--      the original summary)
--   2. Give researchers visibility into how each interview wrapped up
--      without having to scan the full transcript
--   3. Track closing_reason so we can diagnose wrap-up failures in
--      production ('natural' happy path vs 'time_up' enforcement vs
--      'user_requested' early close vs 'fallback' frontend timer vs
--      'watchdog' 130% safety net)
--
-- Both columns are nullable — interviews that completed before this
-- migration won't have values, and some failure paths (crashed agent,
-- network death) legitimately have no summary to store.

ALTER TABLE entrevista.interviews
  ADD COLUMN IF NOT EXISTS closing_summary TEXT;

ALTER TABLE entrevista.interviews
  ADD COLUMN IF NOT EXISTS closing_reason TEXT
    CHECK (closing_reason IS NULL OR closing_reason IN (
      'natural',        -- Agent called end_interview without time pressure
      'time_up',        -- 90% enforcement fired _force_llm_closing("time_limit_90pct")
      'user_requested', -- User clicked "Finalizar entrevista" early (Wave 2.1)
      'fallback',       -- Frontend client-side timer or REST fallback took over
      'watchdog'        -- 130% backend safety net fired
    ));

-- No index needed — these columns are read by interview_id which is already
-- the primary key. They're inspection fields, not query filters.
