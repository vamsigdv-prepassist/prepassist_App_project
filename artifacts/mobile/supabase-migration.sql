-- =============================================================================
-- PrepAssist: tracker_notes table
-- Run this in your Supabase project → SQL Editor → New Query
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tracker_notes (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL DEFAULT '',
    subject     TEXT NOT NULL,
    tags        TEXT[] DEFAULT '{}',
    is_starred  BOOLEAN DEFAULT FALSE,
    image_uri   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS tracker_notes_user_id_idx ON public.tracker_notes(user_id);
CREATE INDEX IF NOT EXISTS tracker_notes_subject_idx  ON public.tracker_notes(user_id, subject);

-- Row Level Security: each user sees only their own notes
ALTER TABLE public.tracker_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
    ON public.tracker_notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
    ON public.tracker_notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
    ON public.tracker_notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
    ON public.tracker_notes FOR DELETE
    USING (auth.uid() = user_id);

-- Auto-update updated_at on every change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tracker_notes_updated_at
    BEFORE UPDATE ON public.tracker_notes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
