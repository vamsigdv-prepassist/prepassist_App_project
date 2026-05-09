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

router.post("/ai/extract-quiz", async (req, res) => {
  try {
    const { pdfBase64, count } = req.body ?? {};
    const n = Math.max(5, Math.min(50, Number(count) || 15));

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

    if (cleaned.length < 50) {
      res.status(400).json({
        error:
          "PDF appears to be empty or image-only (no extractable text). Please use a text-based PDF.",
      });
      return;
    }

    req.log?.info({ pages: totalPages, chars: cleaned.length }, "extract-quiz: PDF parsed");

    // Cap at 40k chars to keep prompt manageable
    const docText = cleaned.length > 40_000 ? cleaned.slice(0, 40_000) : cleaned;

    const system = [
      "You are a senior UPSC Prelims expert and exam analyst.",
      "Your task: extract or generate MCQs from the provided PDF text.",
      "Return STRICT JSON ONLY — no markdown fences, no prose — matching exactly:",
      '{ "questions": [ { "id": "q1", "question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "...", "topic": "..." } ] }',
      "",
      "Extraction rules:",
      "1. FIRST scan the text for existing MCQs (numbered questions with A/B/C/D options). Extract them faithfully.",
      "2. Determine the correct answer: if an answer key is present use it; otherwise reason it out from UPSC syllabus knowledge.",
      "3. If the PDF has fewer than the requested count of MCQs, supplement with freshly generated UPSC Prelims MCQs on the topics covered in the document.",
      "4. ALWAYS produce exactly 4 options per question (options array length = 4).",
      "5. correctIndex is 0-based (0=first option, 1=second, etc.).",
      "6. Each explanation must clearly state WHY the correct answer is right and why the others are wrong.",
      "7. Set topic to the specific UPSC subject/subtopic (e.g. 'Polity — Fundamental Rights', 'History — Quit India Movement').",
      "8. For bilingual PDFs, extract the English version only.",
    ].join("\n");

    const userPrompt = `Extract or generate exactly ${n} UPSC Prelims MCQs from the document below. Use ids q1..q${n}.\n\n--- DOCUMENT TEXT (${totalPages} pages) ---\n${docText}\n--- END ---`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 8000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
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

    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    req.log?.info({ extracted: questions.length }, "extract-quiz: done");

    res.json({ questions });
  } catch (err) {
    req.log?.error({ err }, "extract-quiz failed");
    res.status(500).json({ error: "extract_quiz_failed" });
  }
});

export default router;
