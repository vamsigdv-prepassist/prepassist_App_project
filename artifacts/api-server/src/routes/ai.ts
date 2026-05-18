import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { extractText, getDocumentProxy } from "unpdf";

const router: IRouter = Router();

const MODEL = "gpt-5.4";

const CHUNK_SIZE = 1_500;
const CHUNK_OVERLAP = 200;
const MAX_DOC_CHARS = 60_000;

function clampDocText(text: string) {
  if (text.length <= MAX_DOC_CHARS) return text;
  const head = text.slice(0, Math.floor(MAX_DOC_CHARS * 0.7));
  const tail = text.slice(-Math.floor(MAX_DOC_CHARS * 0.3));
  return `${head}\n\n[…content trimmed for length…]\n\n${tail}`;
}

function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  let overlap = "";

  for (const para of paragraphs) {
    const candidate = overlap
      ? `${overlap}\n\n${current}\n\n${para}`
      : `${current}\n\n${para}`;

    if (candidate.length > CHUNK_SIZE && current.length > 0) {
      const chunk = (overlap ? `${overlap}\n\n${current}` : current).trim();
      if (chunk.length > 50) chunks.push(chunk);
      overlap = current.slice(-CHUNK_OVERLAP);
      current = para;
    } else {
      current = candidate.trim();
    }
  }

  if (current.trim().length > 50) {
    const chunk = (overlap ? `${overlap}\n\n${current}` : current).trim();
    chunks.push(chunk);
  }

  return chunks.length > 0 ? chunks : [text.slice(0, MAX_DOC_CHARS)];
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

    const chunks = chunkText(cleaned);

    res.json({
      pages: totalPages ?? 0,
      chunks,
      truncated: cleaned.length > MAX_DOC_CHARS,
      originalLength: cleaned.length,
      chunkCount: chunks.length,
    });
  } catch (err) {
    req.log?.error({ err }, "extract-pdf failed");
    res.status(500).json({ error: "extract_failed" });
  }
});

function buildRagMessages(body: {
  documentTitle?: string;
  documentNotes?: string;
  retrievedChunks?: string[];
  documentText?: string;
  history?: unknown;
  question: string;
}) {
  const hasChunks =
    Array.isArray(body.retrievedChunks) && body.retrievedChunks.length > 0;
  const hasDocText =
    !hasChunks &&
    typeof body.documentText === "string" &&
    body.documentText.trim().length > 0;

  let contextBlock: string;
  if (hasChunks) {
    const chunkText = body.retrievedChunks!
      .map((c, i) => `[Passage ${i + 1}]\n${c}`)
      .join("\n\n");
    contextBlock = `--- RETRIEVED PASSAGES (most relevant to the question) ---\n${chunkText}\n--- END PASSAGES ---`;
  } else if (hasDocText) {
    contextBlock = `--- DOCUMENT TEXT ---\n${clampDocText(body.documentText!.trim())}\n--- END DOCUMENT ---`;
  } else {
    contextBlock =
      "(No document text available — answer from general UPSC knowledge and flag as 'Outside the document'.)";
  }

  const system = [
    "You are PrepAssist Vault, an expert UPSC tutor.",
    `Document: ${body.documentTitle ?? "Untitled"}`,
    body.documentNotes ? `Context: ${body.documentNotes}` : "",
    contextBlock,
    "Rules:",
    "- Base your answer PRIMARILY on the passages/document above. Quote or paraphrase where possible.",
    "- If the document does NOT cover the question, say so explicitly and provide a brief general UPSC-level answer flagged as 'Outside the document'.",
    "- Be precise, structured, and exam-ready (Mains-style). Use short headers and bullets where useful.",
    "- Reply in 120–260 words unless the aspirant asks for more.",
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
    const {
      documentTitle,
      documentNotes,
      retrievedChunks,
      documentText,
      history,
      question,
    } = req.body ?? {};
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
        retrievedChunks,
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
    const {
      documentTitle,
      documentNotes,
      retrievedChunks,
      documentText,
      history,
      question,
    } = req.body ?? {};
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
        retrievedChunks,
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
    const { paper, question, imageBase64, mimeType, answerText } =
      req.body ?? {};
    const hasImage =
      typeof imageBase64 === "string" && imageBase64.length > 0;
    const hasText =
      typeof answerText === "string" && answerText.trim().length > 0;

    if (!hasImage && !hasText) {
      res
        .status(400)
        .json({ error: "Either imageBase64 or answerText is required" });
      return;
    }

    const system = [
      hasImage
        ? "You are a senior UPSC Mains examiner. Grade the aspirant's handwritten answer captured in the photo."
        : "You are a senior UPSC Mains examiner. Grade the aspirant's typed answer provided below.",
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
      "Be honest, specific, and tie comments to the actual answer content.",
    ].join("\n");

    const userText = [
      `Paper: ${paper ?? "GS"}`,
      question
        ? `Question: ${question}`
        : "Infer the question from the answer.",
      hasText ? `Answer:\n${(answerText as string).trim()}` : "Grade the attached handwritten response.",
    ].join("\n");

    const userContent: Parameters<
      typeof openai.chat.completions.create
    >[0]["messages"][0]["content"] = hasImage
      ? [
          { type: "text" as const, text: userText },
          {
            type: "image_url" as const,
            image_url: {
              url: `data:${typeof mimeType === "string" && mimeType ? mimeType : "image/jpeg"};base64,${imageBase64}`,
            },
          },
        ]
      : userText;

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
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
    const { topic, count, documentTitle, documentPassages } = req.body ?? {};
    const n = Math.max(1, Math.min(20, Number(count) || 5));
    const hasDoc =
      Array.isArray(documentPassages) &&
      documentPassages.length > 0 &&
      typeof documentTitle === "string" &&
      documentTitle.trim();

    const t = hasDoc
      ? (documentTitle as string).trim()
      : typeof topic === "string" && topic.trim()
        ? topic.trim()
        : "Indian Polity";

    const systemParts = [
      "You are a senior UPSC Prelims question-setter. Generate exam-grade MCQs.",
      "Return STRICT JSON ONLY (no markdown fences) matching:",
      "{ questions: { id: string, question: string, options: string[] /* exactly 4 */, correctIndex: number /* 0-3 */, explanation: string, topic: string }[] }",
      "Rules: factually accurate, single best answer, plausible distractors, neutral framing, India-focused where relevant.",
    ];

    if (hasDoc) {
      const passages = (documentPassages as string[])
        .map((p, i) => `[Passage ${i + 1}]\n${p}`)
        .join("\n\n");
      systemParts.push(
        "\nThe questions MUST be grounded in the following passages from the aspirant's uploaded document. Do not invent facts outside these passages.",
        `--- DOCUMENT: ${t} ---`,
        passages,
        "--- END DOCUMENT ---",
        "Vary the questions across different passages and subtopics for broad coverage.",
      );
    }

    const userPrompt = hasDoc
      ? `Generate exactly ${n} UPSC Prelims MCQs from the passages above. Assign topic labels that reflect the passage subtopic. Use ids q1..q${n}.`
      : `Topic: ${t}\nGenerate exactly ${n} MCQs. Vary subtopics. Use ids q1..q${n}.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemParts.join("\n") },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: { questions?: unknown[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    res.json({
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    });
  } catch (err) {
    req.log?.error({ err }, "quiz failed");
    res.status(500).json({ error: "quiz_failed" });
  }
});

// Chunk text into ~5000-char paragraph-bounded segments for parallel MCQ extraction
function chunkTextForQuiz(text: string): string[] {
  // Split by character count, breaking at newline boundaries.
  // UPSC PDFs rarely use double-newlines between questions, so paragraph-based
  // splitting collapses the whole document into one giant chunk.
  const IDEAL = 8_000;
  const OVERLAP = 600; // overlap so questions at chunk boundaries aren't missed

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + IDEAL;

    if (end >= text.length) {
      const chunk = text.slice(start).trim();
      if (chunk.length > 30) chunks.push(chunk);
      break;
    }

    // Prefer to break at the last newline within the window
    let breakAt = end;
    const nlPos = text.lastIndexOf("\n", end);
    if (nlPos > start + IDEAL * 0.4) breakAt = nlPos;

    const chunk = text.slice(start, breakAt).trim();
    if (chunk.length > 30) chunks.push(chunk);

    // Step forward with overlap so boundary questions aren't cut off
    start = breakAt - OVERLAP;
    if (start < 0) start = 0;
  }

  return chunks.length > 0 ? chunks : [text.slice(0, 50_000)];
}

type RawMcq = {
  question?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  topic?: string;
};

async function extractMcqsFromChunk(
  chunkText: string,
  chunkIdx: number,
  openaiClient: typeof openai,
  log: { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void },
): Promise<RawMcq[]> {
  const system = [
    "You are a senior UPSC Prelims question analyst.",
    "Your ONLY job: extract every MCQ you can find in the given text segment.",
    "Return STRICT JSON ONLY — no markdown, no prose — matching exactly:",
    '{ "questions": [ { "question": "...", "options": ["A text","B text","C text","D text"], "correctIndex": 0, "explanation": "...", "topic": "..." } ] }',
    "",
    "Extraction rules:",
    "1. Scan for numbered/lettered MCQs (e.g. '1.', 'Q1.', '1)') with 4 options (A/B/C/D or (a)/(b)/(c)/(d) or 1/2/3/4).",
    "2. Extract the FULL question text faithfully, including any statements (keep newlines as \\n).",
    "3. options[] MUST have exactly 4 strings — the plain text of each option (no letter prefix).",
    "4. correctIndex is 0-based: 0=first option, 1=second, 2=third, 3=fourth.",
    "5. Determine correctIndex from an answer key in the text; if none, reason from UPSC syllabus.",
    "6. explanation: one clear sentence explaining why the correct answer is right.",
    "7. topic: specific UPSC subtopic (e.g. 'Polity — Fundamental Rights').",
    "8. For bilingual PDFs, extract English text only. Skip duplicate Hindi versions.",
    "9. If NO MCQs exist in this segment, return { \"questions\": [] } — do NOT hallucinate questions.",
  ].join("\n");

  try {
    const response = await openaiClient.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 16_000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Extract every MCQ from this text segment:\n\n${chunkText}`,
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
    const qs = Array.isArray(parsed.questions) ? (parsed.questions as RawMcq[]) : [];
    log.info({ chunk: chunkIdx, found: qs.length }, "extract-quiz: chunk done");
    return qs;
  } catch (err) {
    log.error({ err, chunk: chunkIdx }, "extract-quiz: chunk failed");
    return [];
  }
}

router.post("/ai/extract-quiz", async (req, res) => {
  try {
    const { pdfBase64, maxQuestions } = req.body ?? {};
    const cap = Math.max(10, Math.min(200, Number(maxQuestions) || 100));

    if (typeof pdfBase64 !== "string" || !pdfBase64) {
      res.status(400).json({ error: "pdfBase64 is required" });
      return;
    }

    // ── 1. Extract full text from PDF ──────────────────────────────────────
    const buf = Buffer.from(pdfBase64, "base64");
    const bytes = new Uint8Array(buf);
    const doc = await getDocumentProxy(bytes);
    const { totalPages, text } = await extractText(doc, { mergePages: true });
    const cleaned = (Array.isArray(text) ? text.join("\n\n") : text)
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (cleaned.length < 50) {
      res.status(400).json({
        error:
          "PDF appears to be empty or image-only (no extractable text). Please use a text-based PDF.",
      });
      return;
    }

    req.log?.info(
      { pages: totalPages, chars: cleaned.length },
      "extract-quiz: PDF parsed",
    );

    // ── 2. Chunk text into ~5 000-char paragraph-bounded segments ──────────
    const chunks = chunkTextForQuiz(cleaned);
    req.log?.info({ chunks: chunks.length }, "extract-quiz: chunked");

    // ── 3. Process all chunks in parallel batches of 3 ────────────────────
    const log = {
      info: (...a: unknown[]) => req.log?.info(...(a as [object, string])),
      error: (...a: unknown[]) => req.log?.error(...(a as [object, string])),
    };

    const BATCH_SIZE = 3;
    const allRaw: RawMcq[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((chunk, j) =>
          extractMcqsFromChunk(chunk, i + j, openai, log),
        ),
      );
      allRaw.push(...batchResults.flat());

      // Brief cooldown between batches to avoid rate-limit drops
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise((r) => setTimeout(r, 1_200));
      }
    }

    // ── 4. Validate, deduplicate and cap ──────────────────────────────────
    const seen = new Set<string>();
    const questions = allRaw
      .filter(
        (q) =>
          typeof q.question === "string" &&
          q.question.trim().length > 10 &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correctIndex === "number",
      )
      .filter((q) => {
        // Deduplicate by first 60 chars of question text
        const key = q
          .question!.slice(0, 60)
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((q, i) => ({
        id: `q${i + 1}`,
        question: q.question!.trim(),
        options: (q.options as string[]).map((o) => String(o).trim()),
        correctIndex: Math.max(0, Math.min(3, q.correctIndex!)),
        explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
        topic: typeof q.topic === "string" ? q.topic.trim() : "General",
      }))
      .slice(0, cap);

    req.log?.info(
      { total: allRaw.length, deduped: questions.length, cap },
      "extract-quiz: complete",
    );

    res.json({ questions, meta: { pages: totalPages, chunks: chunks.length } });
  } catch (err) {
    req.log?.error({ err }, "extract-quiz failed");
    res.status(500).json({ error: "extract_quiz_failed" });
  }
});

export default router;
