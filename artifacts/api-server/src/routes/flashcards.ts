import { Router, type IRouter } from "express";

const router: IRouter = Router();

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "prepassist-v2";
const API_KEY = process.env.FIREBASE_API_KEY ?? "";

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  timestampValue?: string;
  mapValue?: { fields: Record<string, FirestoreValue> };
}

interface FirestoreDocument {
  name: string;
  fields: Record<string, FirestoreValue>;
  createTime: string;
  updateTime: string;
}

function extractString(v: FirestoreValue): string {
  return v.stringValue ?? v.integerValue ?? "";
}

function parseDoc(doc: FirestoreDocument) {
  const id = doc.name.split("/").pop() ?? "";
  const f = doc.fields;
  return {
    id,
    topic: extractString(f.topic ?? {}),
    frontText: extractString(f.frontText ?? {}),
    backText: extractString(f.backText ?? {}),
    language: extractString(f.language ?? {}) as "English" | "Hindi",
    createdAt: f.createdAt?.timestampValue ?? "",
  };
}

router.get("/flashcards", async (req, res) => {
  const language = (req.query.language as string) || "English";
  const limitCount = Math.min(Number(req.query.limit) || 10, 30);

  try {
    const url =
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;

    const body = {
      structuredQuery: {
        from: [{ collectionId: "flashcards" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "language" },
            op: "EQUAL",
            value: { stringValue: language },
          },
        },
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
        limit: limitCount,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      req.log.error({ status: response.status, body: text }, "Firestore query failed");
      res.status(502).json({ error: "Failed to fetch flashcards" });
      return;
    }

    const results = (await response.json()) as Array<{ document?: FirestoreDocument }>;
    const cards = results
      .filter((r) => r.document)
      .map((r) => parseDoc(r.document!));

    res.json({ cards });
  } catch (err) {
    req.log.error({ err }, "flashcards route error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
