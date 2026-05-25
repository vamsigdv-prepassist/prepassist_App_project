import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

function supabaseHeaders(userJwt?: string) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${userJwt ?? SUPABASE_ANON_KEY}`,
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

function extractBearer(req: { headers: { authorization?: string } }): string | undefined {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return undefined;
  return auth.slice(7);
}

// GET /api/tracker-notes  — list all notes for the logged-in user
router.get("/tracker-notes", async (req, res) => {
  const jwt = extractBearer(req);
  if (!jwt) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/tracker_notes`);
    url.searchParams.set("select", "*");
    url.searchParams.set("order", "created_at.desc");

    const response = await fetch(url.toString(), {
      headers: supabaseHeaders(jwt),
    });

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

// POST /api/tracker-notes  — create a note
router.post("/tracker-notes", async (req, res) => {
  const jwt = extractBearer(req);
  if (!jwt) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

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
        title,
        content,
        subject,
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

// PATCH /api/tracker-notes/:id  — update a note
router.patch("/tracker-notes/:id", async (req, res) => {
  const jwt = extractBearer(req);
  if (!jwt) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

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
  if (!jwt) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

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

export default router;
