import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const MODEL = "gpt-5.4";

router.post("/ai/rag", async (req, res) => {
  try {
    const { documentTitle, documentNotes, history, question } = req.body ?? {};
    if (typeof question !== "string" || !question.trim()) {
      res.status(400).json({ error: "question is required" });
      return;
    }

    const system = [
      "You are PrepAssist Vault, an expert UPSC tutor that answers ONLY from the document the aspirant uploaded.",
      `Document title: ${documentTitle ?? "Untitled"}`,
      documentNotes ? `Aspirant's notes / context: ${documentNotes}` : "",
      "Answering rules:",
      "- Be precise, structured and exam-ready (Mains-style).",
      "- Use short headers and bullet points where useful.",
      "- If the document does not cover the question, say so and provide a brief general UPSC-level answer flagged as 'Outside the document'.",
      "- Reply in 120-220 words unless the aspirant asks for more.",
    ]
      .filter(Boolean)
      .join("\n");

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [{ role: "system", content: system }];

    if (Array.isArray(history)) {
      for (const m of history.slice(-10)) {
        if (
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
        ) {
          messages.push({ role: m.role, content: m.content });
        }
      }
    }

    messages.push({ role: "user", content: question });

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 1200,
      messages,
    });

    const answer = response.choices[0]?.message?.content?.trim() ?? "";
    res.json({ answer });
  } catch (err) {
    req.log?.error({ err }, "rag failed");
    res.status(500).json({ error: "rag_failed" });
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
