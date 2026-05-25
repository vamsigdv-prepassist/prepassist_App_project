import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

function supabaseHeaders(userJwt?: string) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${userJwt ?? SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function supabaseServiceHeaders() {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

export interface TrackerNoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  subject: string;
  tags: string[];
  is_starred: boolean;
  image_uri?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteUpdateRow {
  id: string;
  note_id: string;
  user_id: string;
  title: string;
  content: string;
  source?: string | null;
  status: "pending" | "merged" | "ignored";
  created_at: string;
}

function extractBearer(req: { headers: { authorization?: string } }): string | undefined {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return undefined;
  return auth.slice(7);
}

// ── tracker_notes CRUD ────────────────────────────────────────────────────

// GET /api/tracker-notes
router.get("/tracker-notes", async (req, res) => {
  const jwt = extractBearer(req);
  if (!jwt) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/tracker_notes`);
    url.searchParams.set("select", "*");
    url.searchParams.set("order", "created_at.desc");

    const response = await fetch(url.toString(), { headers: supabaseHeaders(jwt) });
    if (!response.ok) {
      const text = await response.text();
      req.log.error({ status: response.status, body: text }, "Supabase tracker-notes fetch failed");
      res.status(502).json({ error: "Failed to fetch notes" });
      return;
    }
    const notes = (await response.json()) as TrackerNoteRow[];
    res.json({ notes });
  } catch (err) {
    req.log.error({ err }, "tracker-notes GET error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tracker-notes
router.post("/tracker-notes", async (req, res) => {
  const jwt = extractBearer(req);
  if (!jwt) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { title, content, subject, tags, is_starred, image_uri } = req.body as Partial<TrackerNoteRow>;
  if (!title || !content || !subject) {
    res.status(400).json({ error: "title, content, subject are required" });
    return;
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/tracker_notes`);
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: supabaseHeaders(jwt),
      body: JSON.stringify({
        title, content, subject,
        tags: tags ?? [],
        is_starred: is_starred ?? false,
        image_uri: image_uri ?? null,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      req.log.error({ status: response.status, body: text }, "Supabase tracker-notes insert failed");
      res.status(502).json({ error: "Failed to create note" });
      return;
    }
    const rows = (await response.json()) as TrackerNoteRow[];
    res.status(201).json({ note: rows[0] });
  } catch (err) {
    req.log.error({ err }, "tracker-notes POST error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tracker-notes/:id
router.patch("/tracker-notes/:id", async (req, res) => {
  const jwt = extractBearer(req);
  if (!jwt) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;
  const patch = req.body as Partial<TrackerNoteRow>;

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/tracker_notes`);
    url.searchParams.set("id", `eq.${id}`);
    const response = await fetch(url.toString(), {
      method: "PATCH",
      headers: supabaseHeaders(jwt),
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) {
      const text = await response.text();
      req.log.error({ status: response.status, body: text }, "Supabase tracker-notes patch failed");
      res.status(502).json({ error: "Failed to update note" });
      return;
    }
    const rows = (await response.json()) as TrackerNoteRow[];
    res.json({ note: rows[0] ?? null });
  } catch (err) {
    req.log.error({ err }, "tracker-notes PATCH error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/tracker-notes/:id
router.delete("/tracker-notes/:id", async (req, res) => {
  const jwt = extractBearer(req);
  if (!jwt) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/tracker_notes`);
    url.searchParams.set("id", `eq.${id}`);
    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: { ...supabaseHeaders(jwt), Prefer: "return=minimal" },
    });
    if (!response.ok) {
      const text = await response.text();
      req.log.error({ status: response.status, body: text }, "Supabase tracker-notes delete failed");
      res.status(502).json({ error: "Failed to delete note" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "tracker-notes DELETE error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── note_updates routes ───────────────────────────────────────────────────

// GET /api/tracker-notes/updates  — all pending updates for the logged-in user
router.get("/tracker-notes/updates", async (req, res) => {
  const jwt = extractBearer(req);
  if (!jwt) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/note_updates`);
    url.searchParams.set("select", "*");
    url.searchParams.set("status", "eq.pending");
    url.searchParams.set("order", "created_at.desc");

    const response = await fetch(url.toString(), { headers: supabaseHeaders(jwt) });
    if (!response.ok) {
      const text = await response.text();
      req.log.error({ status: response.status, body: text }, "Supabase note-updates fetch failed");
      res.status(502).json({ error: "Failed to fetch updates" });
      return;
    }
    const updates = (await response.json()) as NoteUpdateRow[];
    res.json({ updates });
  } catch (err) {
    req.log.error({ err }, "note-updates GET error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tracker-notes/updates/:updateId  — mark merged or ignored
router.patch("/tracker-notes/updates/:updateId", async (req, res) => {
  const jwt = extractBearer(req);
  if (!jwt) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { updateId } = req.params;
  const { status } = req.body as { status: string };
  if (!["merged", "ignored"].includes(status)) {
    res.status(400).json({ error: "status must be 'merged' or 'ignored'" });
    return;
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/note_updates`);
    url.searchParams.set("id", `eq.${updateId}`);

    const response = await fetch(url.toString(), {
      method: "PATCH",
      headers: { ...supabaseHeaders(jwt), Prefer: "return=minimal" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const text = await response.text();
      req.log.error({ status: response.status, body: text }, "Supabase note-updates patch failed");
      res.status(502).json({ error: "Failed to update" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "note-updates PATCH error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tracker-notes/:noteId/updates
// Admin-only endpoint: push a new RAG-sourced update for a specific note.
// Requires X-Admin-Key header matching ADMIN_SECRET env var.
// Requires SUPABASE_SERVICE_KEY env var (service role key to bypass RLS).
router.post("/tracker-notes/:noteId/updates", async (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (!ADMIN_SECRET || adminKey !== ADMIN_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!SUPABASE_SERVICE_KEY) {
    res.status(503).json({ error: "Service not configured — set SUPABASE_SERVICE_KEY env var" });
    return;
  }

  const { noteId } = req.params;
  const { title, content, source } = req.body as {
    title?: string;
    content: string;
    source?: string;
  };
  if (!content?.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  try {
    // Look up user_id for this note using service role key
    const noteUrl = new URL(`${SUPABASE_URL}/rest/v1/tracker_notes`);
    noteUrl.searchParams.set("id", `eq.${noteId}`);
    noteUrl.searchParams.set("select", "user_id");

    const noteRes = await fetch(noteUrl.toString(), { headers: supabaseServiceHeaders() });
    if (!noteRes.ok) {
      res.status(502).json({ error: "Failed to look up note" });
      return;
    }
    const noteRows = (await noteRes.json()) as { user_id: string }[];
    if (!noteRows[0]) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    // Insert the update (service role bypasses RLS)
    const insertUrl = new URL(`${SUPABASE_URL}/rest/v1/note_updates`);
    const insertRes = await fetch(insertUrl.toString(), {
      method: "POST",
      headers: supabaseServiceHeaders(),
      body: JSON.stringify({
        note_id: noteId,
        user_id: noteRows[0].user_id,
        title: title?.trim() || "New Update",
        content: content.trim(),
        source: source?.trim() || null,
      }),
    });
    if (!insertRes.ok) {
      const text = await insertRes.text();
      req.log.error({ status: insertRes.status, body: text }, "note-updates insert failed");
      res.status(502).json({ error: "Failed to create update" });
      return;
    }
    const rows = (await insertRes.json()) as NoteUpdateRow[];
    res.status(201).json({ update: rows[0] });
  } catch (err) {
    req.log.error({ err }, "note-updates POST error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
