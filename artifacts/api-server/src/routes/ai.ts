import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { extractText, getDocumentProxy } from "unpdf";

const router: IRouter = Router();

const MODEL = "gpt-5.4";

const MAX_DOC_CHARS = 60_000;

function clampDocText(text: string) {
  if (text.length <= MAX_DOC_CHARS) return text;
  const head = text.slice(0, Math.floor(MAX_DOC_CHARS * 0.7));
  const tail = text.slice(-Math.floor(MAX_DOC_CHARS * 0.3));
  return `${head}\n\n[…content trimmed for length…]\n\n${tail}`;
}

router.post("/ai/extract-pdf", async (req, res) => {
  try {
    const { pdfBase64 } = req.body ?? {};
    if (typeof pdfBase64 !== "string" || !pdfBase64) {
      res.status(400).json({ error: "pdfBase64 is required" });
      return;
    }
    const buf = Buffer.from(pdfBase64, "base64");
    const bytes = new Uint8Array(buf);
    const doc = await getDocumentProxy(bytes);
    const { totalPages, text } = await extractText(doc, { mergePages: true });
    const cleaned = (Array.isArray(text) ? text.join("\n\n") : text)
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    res.json({
      pages: totalPages ?? 0,
      text: clampDocText(cleaned),
      truncated: cleaned.length > MAX_DOC_CHARS,
      originalLength: cleaned.length,
    });
  } catch (err) {
    req.log?.error({ err }, "extract-pdf failed");
    res.status(500).json({ error: "extract_failed" });
  }
});

function buildRagMessages(body: {
  documentTitle?: string;
  documentNotes?: string;
  documentText?: string;
  history?: unknown;
  question: string;
}) {
  const hasDocText =
    typeof body.documentText === "string" && body.documentText.trim().length > 0;

  const system = [
    "You are PrepAssist Vault, an expert UPSC tutor that answers GROUNDED IN the source document below.",
    `Document title: ${body.documentTitle ?? "Untitled"}`,
    body.documentNotes ? `Aspirant's notes / context: ${body.documentNotes}` : "",
    hasDocText
      ? `--- BEGIN DOCUMENT ---\n${clampDocText(body.documentText!.trim())}\n--- END DOCUMENT ---`
      : "(No document text available — fall back to general UPSC knowledge but flag answers as 'Outside the document'.)",
    "Answering rules:",
    "- Quote or paraphrase the document where possible. Cite section/topic headings if present.",
    "- Be precise, structured and exam-ready (Mains-style).",
    "- Use short headers and bullet points where useful.",
    "- If the document does NOT cover the question, say so explicitly and provide a brief general UPSC-level answer flagged as 'Outside the document'.",
    "- Reply in 120-260 words unless the aspirant asks for more.",
  ]
    .filter(Boolean)
    .join("\n");

  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: system }];

  if (Array.isArray(body.history)) {
    for (const m of body.history.slice(-10) as {
      role?: string;
      content?: string;
    }[]) {
      if (
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
      ) {
        messages.push({ role: m.role, content: m.content });
      }
    }
  }

  messages.push({ role: "user", content: body.question });
  return messages;
}

router.post("/ai/rag", async (req, res) => {
  try {
    const { documentTitle, documentNotes, documentText, history, question } =
      req.body ?? {};
    if (typeof question !== "string" || !question.trim()) {
      res.status(400).json({ error: "question is required" });
      return;
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 1200,
      messages: buildRagMessages({
        documentTitle,
        documentNotes,
        documentText,
        history,
        question,
      }),
    });

    const answer = response.choices[0]?.message?.content?.trim() ?? "";
    res.json({ answer });
  } catch (err) {
    req.log?.error({ err }, "rag failed");
    res.status(500).json({ error: "rag_failed" });
  }
});

router.post("/ai/rag/stream", async (req, res) => {
  try {
    const { documentTitle, documentNotes, documentText, history, question } =
      req.body ?? {};
    if (typeof question !== "string" || !question.trim()) {
      res.status(400).json({ error: "question is required" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const stream = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 1200,
      messages: buildRagMessages({
        documentTitle,
        documentNotes,
        documentText,
        history,
        question,
      }),
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log?.error({ err }, "rag stream failed");
    try {
      res.write(`data: ${JSON.stringify({ error: "rag_failed" })}\n\n`);
      res.end();
    } catch {}
  }
});

router.post("/ai/evaluate", async (req, res) => {
  try {
    const { paper, question, imageBase64, mimeType } = req.body ?? {};
    if (!imageBase64 || typeof imageBase64 !== "string") {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }
    const mt = typeof mimeType === "string" && mimeType ? mimeType : "image/jpeg";

    const system = [
      "You are a senior UPSC Mains examiner. Grade the aspirant's handwritten answer captured in the photo.",
      "Return STRICT JSON ONLY (no prose, no markdown fences) matching this TypeScript type:",
      "{",
      "  totalScore: number, // out of 50",
      "  band: 'Below Average' | 'Average' | 'Good' | 'Very Good' | 'Excellent',",
      "  rubric: { name: 'Structure'|'Content'|'Relevance'|'Presentation'|'Value Addition', score: number /* /10 */, maxScore: 10, comment: string }[],",
      "  strengths: string[], // 2-4 bullets",
      "  improvements: string[], // 3-5 bullets, actionable",
      "  rankerInsight: string, // 1-2 sentences a topper would add",
      "  modelIntro: string, // a 2-3 sentence improved opening paragraph",
      "}",
      "Be honest, specific, and tie comments to the visible answer.",
    ].join("\n");

    const userText = [
      `Paper: ${paper ?? "GS"}`,
      question ? `Question: ${question}` : "Infer the question from the script.",
      "Grade the attached handwritten response.",
    ].join("\n");

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            {
              type: "image_url",
              image_url: { url: `data:${mt};base64,${imageBase64}` },
            },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    res.json({ evaluation: parsed });
  } catch (err) {
    req.log?.error({ err }, "evaluate failed");
    res.status(500).json({ error: "evaluate_failed" });
  }
});

router.post("/ai/quiz", async (req, res) => {
  try {
    const { topic, count } = req.body ?? {};
    const n = Math.max(1, Math.min(20, Number(count) || 5));
    const t = typeof topic === "string" && topic.trim() ? topic.trim() : "Indian Polity";

    const system = [
      "You generate UPSC Prelims-grade MCQs.",
      "Return STRICT JSON ONLY (no markdown fences) matching:",
      "{ questions: { id: string, question: string, options: string[] /* exactly 4 */, correctIndex: number /* 0-3 */, explanation: string, topic: string }[] }",
      "Rules: factually accurate, single best answer, plausible distractors, neutral framing, India-focused where relevant.",
    ].join("\n");

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Topic: ${t}\nGenerate exactly ${n} MCQs. Vary subtopics. Use ids q1..q${n}.`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: { questions?: unknown[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    res.json({ questions: Array.isArray(parsed.questions) ? parsed.questions : [] });
  } catch (err) {
    req.log?.error({ err }, "quiz failed");
    res.status(500).json({ error: "quiz_failed" });
  }
});

export default router;
