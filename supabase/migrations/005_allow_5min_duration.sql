-- Allow 5-minute duration target for testing/short calls
ALTER TABLE entrevista.campaigns DROP CONSTRAINT IF EXISTS campaigns_duration_target_minutes_check;
ALTER TABLE entrevista.campaigns ADD CONSTRAINT campaigns_duration_target_minutes_check CHECK (duration_target_minutes IN (5, 10, 15, 30));
