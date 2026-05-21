import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

function supabaseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

export interface CurrentAffair {
  id: string;
  title: string;
  source: string;
  content: string;
  tags: string[];
  publish_date: string;
  created_at: string;
}

router.get("/current-affairs", async (req, res) => {
  const date = req.query.date as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date query param required (YYYY-MM-DD)" });
    return;
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/current_affairs`);
    url.searchParams.set("publish_date", `eq.${date}`);
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("select", "*");

    const response = await fetch(url.toString(), { headers: supabaseHeaders() });

    if (!response.ok) {
      const text = await response.text();
      req.log.error({ status: response.status, body: text }, "Supabase query failed");
      res.status(502).json({ error: "Failed to fetch current affairs" });
      return;
    }

    const articles = (await response.json()) as CurrentAffair[];
    res.json({ articles, date });
  } catch (err) {
    req.log.error({ err }, "current-affairs route error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/current-affairs/dates", async (req, res) => {
  const days = Math.min(Number(req.query.days) || 60, 120);

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0];

    const url = new URL(`${SUPABASE_URL}/rest/v1/current_affairs`);
    url.searchParams.set("select", "publish_date");
    url.searchParams.set("publish_date", `gte.${sinceStr}`);
    url.searchParams.set("order", "publish_date.desc");
    url.searchParams.set("limit", "500");

    const response = await fetch(url.toString(), { headers: supabaseHeaders() });

    if (!response.ok) {
      res.status(502).json({ error: "Failed to fetch dates" });
      return;
    }

    const rows = (await response.json()) as { publish_date: string }[];
    const dates = [...new Set(rows.map((r) => r.publish_date))].sort(
      (a, b) => b.localeCompare(a),
    );

    res.json({ dates });
  } catch (err) {
    req.log.error({ err }, "current-affairs/dates error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
