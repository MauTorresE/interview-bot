-- Retire the voxtral-diego voice persona.
--
-- voxtral-diego was a placeholder mapping to Voxtral's French-neutral default
-- voice (fr_marie_neutral). That caused the user-reported bug where the
-- interviewer's displayed name didn't match the actual voice (female French
-- voice came out despite the name "Diego"). The entry has been removed from
-- the code (src/lib/constants/campaign.ts and agent/entrevista_agent.py).
--
-- Any existing campaign rows with voice_id = 'voxtral-diego' are normalized
-- to NULL here so they fall back cleanly to the default 'voxtral-natalia'
-- voice (now displayed as "Mauricio") in both the frontend lookup and the
-- agent TTS selection.

UPDATE entrevista.campaigns
SET voice_id = NULL
WHERE voice_id = 'voxtral-diego';
