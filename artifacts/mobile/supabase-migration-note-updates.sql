-- =============================================================================
-- PrepAssist: note_updates table
-- Run this in your Supabase project → SQL Editor → New Query
-- Requires tracker_notes table to already exist (run supabase-migration.sql first)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.note_updates (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id     UUID NOT NULL REFERENCES public.tracker_notes(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT 'New Update',
    content     TEXT NOT NULL,
    source      TEXT,
    status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'merged', 'ignored')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS note_updates_note_id_idx ON public.note_updates(note_id);
CREATE INDEX IF NOT EXISTS note_updates_user_status_idx ON public.note_updates(user_id, status);

-- Row Level Security
ALTER TABLE public.note_updates ENABLE ROW LEVEL SECURITY;

-- Users can read their own updates
CREATE POLICY "Users can view their own note updates"
    ON public.note_updates FOR SELECT
    USING (auth.uid() = user_id);

-- Users can mark updates as merged or ignored
CREATE POLICY "Users can update their own note updates"
    ON public.note_updates FOR UPDATE
    USING (auth.uid() = user_id);

-- Admin (service role key) bypasses RLS for inserts — no INSERT policy needed
-- The API server's /tracker-notes/:noteId/updates endpoint uses SUPABASE_SERVICE_KEY
